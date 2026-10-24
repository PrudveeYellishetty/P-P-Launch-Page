// Entity-level sync: unrelated edits never replace the whole remote desktop.
// The outbox lives in the same localStorage transaction as the edited content.
const sharedKinds=['notes','tasks','pins','messages','shortcuts'];
let cloudClient, syncBusy=false, syncTimer, cloudChannel, cloudStatus='Saved on this browser';
let syncDebounce, signedInPerson='', signedInUser='', accountError='', authEpoch=0, authReady=false, connectingAccount=false;
const GOOGLE_REDIRECT='https://p-p-launch-page.yprudveekumar946.workers.dev/';
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
  if(!cloudClient){
    cloudClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
    cloudClient.auth.onAuthStateChange((event,session)=>{
      // Supabase callbacks must return before calling other auth/database methods.
      if(event==='SIGNED_OUT')setTimeout(clearSignedInWorkspace,0);
      else if(authReady&&['SIGNED_IN','USER_UPDATED'].includes(event)&&session?.user.id!==signedInUser)setTimeout(connectGoogleAccount,0);
    });
  }
  return cloudClient;
}
function messageAuthor(){return signedInPerson||state.person;}
function renderAccount(){document.body.classList.toggle('workspace-locked',Boolean(state._cloud&&!signedInUser));const b=$('#account');if(b){b.textContent=signedInPerson||'Continue with Google';b.title=signedInPerson?'Manage your Google account':'Sign in to your shared workspace';}renderMessage();}
function clearSignedInWorkspace(){
  authEpoch++;signedInPerson='';signedInUser='';clearInterval(syncTimer);clearTimeout(syncDebounce);
  if(cloudChannel){cloudClient.removeChannel(cloudChannel);cloudChannel=null;}
  if(state._cloud){localStorage.removeItem('pp-before-cloud');saveState(defaults());}
  setCloudStatus('Sign in to share');renderAccount();
}
async function googleSignIn(){
  if(location.protocol==='file:')throw Error('Open the deployed website to sign in with Google.');
  cloudSaveBackup();
  const client=await getCloudClient();
  const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:GOOGLE_REDIRECT,queryParams:{prompt:'select_account'}}});
  if(error)throw error;
}
async function connectGoogleAccount(){
  if(connectingAccount)return;
  connectingAccount=true;
  try{
    const client=await getCloudClient();const session=await client.auth.getSession();if(session.error)throw session.error;
    authReady=true;
    const user=session.data.session?.user;
    if(signedInUser&&user?.id!==signedInUser){
      authEpoch++;signedInUser='';signedInPerson='';clearInterval(syncTimer);
      if(cloudChannel){client.removeChannel(cloudChannel);cloudChannel=null;}
      renderAccount();
    }
    if(!user||user.is_anonymous){setCloudStatus('Sign in with Google to share');renderAccount();return;}
    if(user.id===signedInUser){await startCloud();return;}
    const {data:member,error}=await client.rpc('pp_google_connect');if(error)throw error;
    const sameWorkspace=state._cloud?.room===member.room;
    const sameAccount=!state._cloud?.accountId||state._cloud.accountId===user.id;
    cloudSaveBackup();
    const existing=await client.from('pp_items').select('kind').eq('workspace_id',member.room).neq('kind','settings').limit(1);if(existing.error)throw existing.error;
    // A returning account loads shared data. Only the first connection seeds local content.
    const next=structuredClone(sameWorkspace&&!sameAccount?defaults():state);
    const queue=sameWorkspace&&sameAccount?next._cloud.queue:existing.data.length?[]:Object.values(cloudRows(next)).map(row=>({...row,deleted:false,operation:uid()}));
    next.person=member.person;next._cloud={room:member.room,accountId:user.id,queue};
    signedInPerson=member.person;signedInUser=user.id;accountError='';authEpoch++;
    saveState(next);renderAccount();await startCloud();
  }catch(error){accountError=cloudError(error);setCloudStatus('Sign-in / setup needs attention');renderAccount();}
  finally{connectingAccount=false;}
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
  if(syncBusy||!state._cloud||!signedInUser||state._cloud.accountId!==signedInUser)return;
  syncBusy=true;const room=state._cloud.room, epoch=authEpoch;
  const checkAccount=()=>{if(epoch!==authEpoch)throw Error('Account changed. Sync stopped.');};
  try{
    await getCloudClient();setCloudStatus('Syncing…');
    // A snapshot prevents an active typing/dragging session from starving pulls.
    for(const op of structuredClone(state._cloud.queue)){
      const content=await uploadCloudPin(op,room);
      const {error}=await cloudClient.rpc('pp_apply_item',{room,operation_id:op.operation,item_kind:op.kind,item_id:op.id,item_content:content,is_deleted:op.deleted});
      if(error)throw error;checkAccount();
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
    checkAccount();const next=structuredClone(state), merged=new Map(rows.map(row=>[row.kind+'/'+row.id,row]));
    // Edits made while a request was running always remain visible and queued.
    for(const op of next._cloud.queue)merged.set(op.kind+'/'+op.id,op);
    for(const kind of sharedKinds)next[kind]=[...merged.values()].filter(r=>r.kind===kind&&!r.deleted).map(r=>{
      const content=structuredClone(r.content);
      if(kind==='pins'&&downloads.has(r.id)&&!content.data)content.data=downloads.get(r.id);
      return content;
    });
    next.messages.sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    const settings=merged.get('settings/shared');if(settings&&!settings.deleted)next.examDate=settings.content.examDate||'2027-02-01';
    saveState(next);setCloudStatus(next._cloud.queue.length?'Edits waiting to sync':'Shared · up to date');
  }catch(error){setCloudStatus('Offline / setup needed · edits saved');console.warn('p & p sync:',cloudError(error));}
  finally{syncBusy=false;}
}
async function startCloud(){
  if(!state._cloud||!signedInUser)return;
  clearInterval(syncTimer);syncTimer=setInterval(syncCloud,15000);
  await syncCloud();
  if(cloudClient&&!cloudChannel){cloudChannel=cloudClient.channel('pp-'+state._cloud.room).on('postgres_changes',{event:'*',schema:'public',table:'pp_items',filter:'workspace_id=eq.'+state._cloud.room},()=>syncCloud()).subscribe();}
}
function cloudSettings(){
  const content=el('div',{},el('p',{class:'help'},signedInPerson?'One workspace, on every browser. Sign in with the same Google account to return to your notes, tasks and messages.':'A private workspace for Prudvee and Priyadarshini. Use your invited Google account to open it from any browser.'));
  const feedback=el('p',{class:'help',role:'status'},accountError);
  const run=fn=>async e=>{const b=e.currentTarget;b.disabled=true;feedback.textContent='Connecting…';try{await fn();}catch(error){feedback.textContent=cloudError(error);}finally{b.disabled=false;}};
  if(signedInPerson){
    content.append(el('p',{},'Signed in as '+signedInPerson),el('p',{class:'cloud-status'},cloudStatus),button('Sync now',run(async()=>{await syncCloud();feedback.textContent=cloudStatus;})),button('Sign out',run(async()=>{
      await syncCloud();
      if(state._cloud?.queue.length)throw Error('Some edits are still waiting to sync. Reconnect and sync before signing out, or export a backup.');
      const {error}=await cloudClient.auth.signOut({scope:'local'});if(error)throw error;clearSignedInWorkspace();close();toast('Signed out on this browser.');
    })));
  }else{
    content.append(button('Continue with Google',run(googleSignIn),'primary'),button('Retry connection',run(async()=>{await connectGoogleAccount();cloudSettings();})));
  }
  content.append(button('Download pre-sign-in backup',()=>{const data=localStorage.getItem('pp-before-cloud');if(data)download('p-and-p-before-sign-in.json',data);else toast('No pre-sign-in backup yet.');}),feedback);
  modal('Your shared workspace',content);
}
window.addEventListener('online',()=>signedInUser?syncCloud():connectGoogleAccount());
window.addEventListener('pp:change',()=>{setCloudStatus(signedInUser?(state._cloud?.queue.length?'Edits waiting to sync':cloudStatus):'Sign in to share');});
