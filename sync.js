// Entity-level sync: unrelated edits never replace the whole remote desktop.
// The outbox lives in the same localStorage transaction as the edited content.
const sharedKinds=['notes','tasks','pins','messages','shortcuts'];
let cloudClient, syncBusy=false, syncTimer, cloudChannel, cloudStatus='Saved on this browser';
let syncDebounce;
function scheduleCloudSync(){clearTimeout(syncDebounce);if(state._cloud)syncDebounce=setTimeout(syncCloud,700);}
const cloudRows=s=>Object.fromEntries([...sharedKinds.flatMap(kind=>s[kind].map(content=>[kind+'/'+content.id,{kind,id:content.id,content}])),['settings/shared',{kind:'settings',id:'shared',content:{examDate:s.examDate}}]]);
function queueCloudChanges(before,after){
  if(!after._cloud)return;
  const old=cloudRows(before), next=cloudRows(after);
  for(const key of new Set([...Object.keys(old),...Object.keys(next)])){
    if(JSON.stringify(old[key])===JSON.stringify(next[key]))continue;
    const row=next[key]||{...old[key],content:{}};
    after._cloud.queue=after._cloud.queue.filter(op=>op.kind+'/'+op.id!==key);
    after._cloud.queue.push({...row,deleted:!next[key],operation:uid()});
  }
}
function setCloudStatus(message){cloudStatus=message;const label=$('.board-toolbar > span');if(label){label.textContent=message;label.title=message;}const detail=$('.cloud-status');if(detail)detail.textContent=message;}
function cloudError(error){return error?.message||'Could not reach Supabase. Your edits are saved locally.';}
async function getCloudClient(){
  if(!window.supabase)throw Error('Supabase client could not load. Refresh the page.');
  cloudClient ||= window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  let {data,error}=await cloudClient.auth.getSession();if(error)throw error;
  if(!data.session){const signed=await cloudClient.auth.signInAnonymously();if(signed.error)throw signed.error;}
  return cloudClient;
}
async function cloudRpc(name,args){const client=await getCloudClient();const result=await client.rpc(name,args);if(result.error)throw result.error;return result.data;}
function cloudBackup(){const copy=structuredClone(state);delete copy._cloud;return copy;}
function cloudSaveBackup(){localStorage.setItem('pp-before-cloud',JSON.stringify(cloudBackup()));}
function blobData(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read the shared file.'));reader.readAsDataURL(blob);});}
async function uploadCloudPin(op,room){
  const content=structuredClone(op.content);
  if(op.kind!=='pins'||op.deleted||!content.data)return content;
  // Reuse an existing immutable file when only its caption changes.
  if(!content.filePath){
    const prefix=content.data.slice(0,content.data.indexOf(','));
    const mime=prefix.slice(5,prefix.indexOf(';'));
    const bytes=Uint8Array.from(atob(content.data.split(',')[1]),c=>c.charCodeAt(0));
    content.filePath=room+'/'+op.operation;
    const {error}=await cloudClient.storage.from('pp-files').upload(content.filePath,new Blob([bytes],{type:mime}),{contentType:mime,upsert:false});
    if(error&&String(error.statusCode)!=='409')throw error;
  }
  content.data='';return content;
}
async function syncCloud(){
  if(syncBusy||!state._cloud)return;
  syncBusy=true;const room=state._cloud.room;
  try{
    await getCloudClient();setCloudStatus('Syncing…');
    // A snapshot prevents an active typing/dragging session from starving pulls.
    for(const op of structuredClone(state._cloud.queue)){
      const content=await uploadCloudPin(op,room);
      const {error}=await cloudClient.rpc('pp_apply_item',{room,operation_id:op.operation,item_kind:op.kind,item_id:op.id,item_content:content,is_deleted:op.deleted});
      if(error)throw error;
      const next=structuredClone(state);
      next._cloud.queue=next._cloud.queue.filter(item=>item.operation!==op.operation);
      if(content.filePath){const pin=next.pins.find(p=>p.id===op.id);if(pin)pin.filePath=content.filePath;}
      saveState(next);
    }
    let rows=[];
    for(let start=0;;start+=1000){
      const result=await cloudClient.from('pp_items').select('*').eq('workspace_id',room).order('kind').order('id').range(start,start+999);
      if(result.error)throw result.error;rows.push(...result.data);if(result.data.length<1000)break;
    }
    const downloads=new Map();
    for(const row of rows){
      if(row.deleted||row.kind!=='pins'||!row.content.filePath)continue;
      const existing=state.pins.find(p=>p.id===row.id&&p.filePath===row.content.filePath&&p.data);
      if(existing){downloads.set(row.id,existing.data);continue;}
      const {data,error}=await cloudClient.storage.from('pp-files').download(row.content.filePath);
      if(error)throw error;downloads.set(row.id,await blobData(data));
    }
    const next=structuredClone(state), merged=new Map(rows.map(row=>[row.kind+'/'+row.id,row]));
    // Edits made while a request was running always remain visible and queued.
    for(const op of next._cloud.queue)merged.set(op.kind+'/'+op.id,op);
    for(const kind of sharedKinds)next[kind]=[...merged.values()].filter(r=>r.kind===kind&&!r.deleted).map(r=>{
      const content=structuredClone(r.content);
      if(kind==='pins'&&downloads.has(r.id)&&!content.data)content.data=downloads.get(r.id);
      return content;
    });
    next.messages.sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    const settings=merged.get('settings/shared');if(settings&&!settings.deleted)next.examDate=settings.content.examDate;
    saveState(next);setCloudStatus(next._cloud.queue.length?'Edits waiting to sync':'Shared · up to date');
  }catch(error){setCloudStatus('Offline / setup needed · edits saved');console.warn('p & p sync:',cloudError(error));}
  finally{syncBusy=false;}
}
async function startCloud(){
  if(!state._cloud)return;
  clearInterval(syncTimer);syncTimer=setInterval(syncCloud,15000);
  await syncCloud();
  if(cloudClient&&!cloudChannel){cloudChannel=cloudClient.channel('pp-'+state._cloud.room).on('postgres_changes',{event:'*',schema:'public',table:'pp_items',filter:'workspace_id=eq.'+state._cloud.room},()=>syncCloud()).subscribe();}
}
function cloudSettings(){
  const content=el('div',{},el('p',{class:'help'},state._cloud?'Your two browsers share this workspace. Local appearance and the running study timer stay on each laptop.':'Run supabase-setup.sql in Supabase first, and enable anonymous sign-ins. Then create the workspace on one laptop; join it from the other.'));
  const feedback=el('p',{class:'help',role:'status'});
  const run=fn=>async e=>{const b=e.currentTarget;b.disabled=true;feedback.textContent='Connecting…';try{await fn();}catch(error){feedback.textContent=cloudError(error);}finally{b.disabled=false;}};
  if(!state._cloud){
    const person=el('select',{},...PEOPLE.map(name=>el('option',{value:name},name)));person.value=state.person;
    const code=input('',{placeholder:'Paste the private pairing code',maxlength:64,autocomplete:'off'});
    content.append(field('Your name (workspace creator)',person),button('Create our shared workspace',run(async()=>{
      cloudSaveBackup();const room=await cloudRpc('pp_create_workspace',{person_name:person.value});
      // Recovering the same session must not reseed an existing cloud workspace.
      const existing=await cloudClient.from('pp_items').select('id').eq('workspace_id',room).limit(1);if(existing.error)throw existing.error;
      const next=structuredClone(state);next.person=person.value;next._cloud={room,queue:existing.data.length?[]:Object.values(cloudRows(state)).map(row=>({...row,deleted:false,operation:uid()}))};saveState(next);
      await startCloud();cloudSettings();
    }),'primary'),field('Or join your friend’s workspace',code),button('Join with code',run(async()=>{
      cloudSaveBackup();const room=await cloudRpc('pp_join_workspace',{pairing_code:code.value.trim()});
      const member=await cloudClient.from('pp_members').select('person').eq('workspace_id',room).eq('user_id',(await cloudClient.auth.getUser()).data.user.id).single();if(member.error)throw member.error;
      const next=structuredClone(state);next.person=member.data.person;next._cloud={room,queue:[]};saveState(next);await startCloud();cloudSettings();
    })),el('p',{class:'help'},'Joining loads the shared desktop. A copy of this browser’s previous workspace is saved locally before pairing.'));
  }else{
    content.append(el('p',{class:'cloud-status'},cloudStatus),button('Sync now',run(async()=>{await syncCloud();feedback.textContent=cloudStatus;})),button('Make a pairing code for my friend',run(async()=>{
      const code=await cloudRpc('pp_make_invite');const box=el('textarea',{readonly:true,rows:3,'aria-label':'Private pairing code'},code);feedback.replaceChildren('Send this code privately to your friend. It works once and expires in 24 hours.',box);box.select();
    })));
  }
  content.append(button('Download pre-pairing backup',()=>{const data=localStorage.getItem('pp-before-cloud');if(data)download('p-and-p-before-cloud.json',data);else toast('No pre-pairing backup yet.');}),feedback,el('p',{class:'help'},'Keep using this browser and address. Clearing browser data loses its anonymous identity; reconnecting then needs a workspace administrator.'));
  modal('Shared storage',content);
}
window.addEventListener('online',()=>syncCloud());
window.addEventListener('pp:change',()=>{setCloudStatus(state._cloud?(state._cloud.queue.length?'Edits waiting to sync':cloudStatus):'Saved on this browser');});
