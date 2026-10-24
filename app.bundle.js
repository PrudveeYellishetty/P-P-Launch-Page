(()=>{
"use strict";

// supabase-config.js
// Public browser configuration. Never place secret/service-role keys here.
const SUPABASE_URL = 'https://fabxnzlzfznthcuilxdj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_TfQH7fFqGDBFu-2ifapHXg_gjQsbv1e';


// store.js
const PEOPLE = ['Prudvee', 'Priyadarshini'];
const uid = () => crypto.randomUUID();
const KEY = 'pp-desktop-v1';
const defaults = () => ({version:1,person:'Prudvee',examDate:'',calm:false,motion:true,session:null,
  notes:[{id:'note-1',owner:'Prudvee',title:'One problem.\nNo hints first.',body:'Explain the why, not just the code.',color:'yellow',x:365,y:294,width:236,height:185,rotation:-3,items:[]},{id:'note-2',owner:'Priyadarshini',title:'Before we log off',body:'',color:'peach',x:734,y:292,width:262,height:184,rotation:3,items:[{text:'Revise joins',done:false},{text:'Share one solution',done:false},{text:'Pick tomorrow’s task',done:false}]}],
  tasks:[{id:'task-1',owner:'Prudvee',title:'Two sliding-window problems',category:'DSA',minutes:45,url:'https://leetcode.com/problemset/',done:false},{id:'task-2',owner:'Prudvee',title:'Revise DBMS joins',category:'Core CS',minutes:30,url:'',done:false},{id:'task-3',owner:'Prudvee',title:'Apply to 2 roles',category:'Career',minutes:20,url:'',done:false},{id:'task-4',owner:'Priyadarshini',title:'Revise DBMS joins',category:'Core CS',minutes:30,url:'',done:false}],
  pins:[{id:'pin-1',title:'Binary search, visualized',kind:'video',owner:'Prudvee',url:'https://www.youtube.com/results?search_query=binary+search+visualized',sample:true},{id:'pin-2',title:'Project inspiration',kind:'image',owner:'Priyadarshini',url:'',data:'',sample:true},{id:'pin-3',title:'DBMS revision notes',kind:'link',owner:'Priyadarshini',url:'',body:'Links, files & ideas.\nKeep them here for later.',sample:true}],
  messages:[{id:'message-1',owner:'Priyadarshini',text:'Let’s compare solutions at 8.',time:'',sample:true}],
  shortcuts:[{id:'s1',title:'Code',url:'https://leetcode.com/',symbol:'</>',color:'#eef1e6'},{id:'s2',title:'GitHub',url:'https://github.com/',symbol:'⑂',color:'#dde7d3'},{id:'s3',title:'Notes',url:'https://keep.google.com/',symbol:'▤',color:'#f9e7a0'},{id:'s4',title:'Mail',url:'https://mail.google.com/',symbol:'✉',color:'#f4ceb7'}]});
function safeUrl(value) { try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
const str = (v,max=2000) => typeof v==='string' && v.length<=max;
const num = (v,min,max) => Number.isFinite(v)&&v>=min&&v<=max;
const person = v => PEOPLE.includes(v);
function validate(s) {
  if(!s||s.version!==1||!person(s.person)||typeof s.calm!=='boolean'||typeof s.motion!=='boolean')throw Error('This is not a p & p backup.');
  if(!str(s.examDate,10)||(s.examDate&&!/^\d{4}-\d{2}-\d{2}$/.test(s.examDate)))throw Error('Invalid exam date.');
  for(const key of ['notes','tasks','pins','messages','shortcuts']){if(!Array.isArray(s[key])||s[key].length>1000)throw Error('Invalid '+key);if(new Set(s[key].map(x=>x.id)).size!==s[key].length)throw Error('Duplicate item IDs.');for(const x of s[key])if(!x||!str(x.id,100))throw Error('Invalid item.');}
  for(const n of s.notes)if(!person(n.owner)||!str(n.title,200)||!str(n.body,4000)||!['yellow','peach','sage'].includes(n.color)||!num(n.x,0,1440)||!num(n.y,0,960)||!num(n.width,180,600)||!num(n.height,140,600)||!num(n.rotation,-10,10)||!Array.isArray(n.items)||n.items.length>50||n.items.some(i=>!str(i.text,300)||typeof i.done!=='boolean'))throw Error('Invalid note.');
  for(const n of s.notes)if(n.placement&&(!num(n.placement.x,-100,100)||!num(n.placement.y,-100,100)))throw Error('Invalid note position.');
  for(const t of s.tasks)if(!person(t.owner)||!str(t.title,200)||!str(t.category,40)||!num(t.minutes,1,300)||typeof t.done!=='boolean'||!str(t.url,2000)||(t.url&&!safeUrl(t.url)))throw Error('Invalid task.');
  for(const p of s.pins)if(!person(p.owner)||!str(p.title,200)||!['video','image','link','file'].includes(p.kind)||!str(p.url||'',2000)||(p.url&&!safeUrl(p.url))||!str(p.body||'',4000)||!str(p.data||'',1500000)||(p.data&&!/^data:(image\/(png|jpeg|webp|gif)|application\/pdf|text\/plain);base64,[A-Za-z0-9+/=\s]+$/.test(p.data)))throw Error('Invalid resource.');
  for(const m of s.messages)if(!person(m.owner)||!str(m.text,2000)||!str(m.time,40))throw Error('Invalid message.');
  for(const a of s.shortcuts)if(!str(a.title,30)||!safeUrl(a.url)||!str(a.symbol,8)||!/^#[0-9a-fA-F]{6}$/.test(a.color))throw Error('Invalid shortcut.');
  if(s.session!==null&&(!s.session||!str(s.session.taskId,100)||!num(s.session.endAt,0,1e14)))throw Error('Invalid study session.');
  return s;
}
let startupError='';
function load(){try{const raw=localStorage.getItem(KEY);return raw?validate(JSON.parse(raw)):defaults();}catch{startupError='Saved data could not be loaded. Your previous backup has not been overwritten.';return defaults();}}
let state=load();
const getStartupError=()=>startupError;
function saveState(next){validate(next);localStorage.setItem(KEY,JSON.stringify(next));state=next;window.dispatchEvent(new CustomEvent('pp:change'));}
function update(mutator){const next=structuredClone(state);mutator(next);validate(next);queueCloudChanges(state,next);saveState(next);scheduleCloudSync();}
function replace(next){validate(next);const candidate=structuredClone(next);delete candidate._cloud;if(state._cloud)candidate._cloud=structuredClone(state._cloud);queueCloudChanges(state,candidate);saveState(candidate);scheduleCloudSync();}
window.addEventListener('storage',e=>{if(e.key!==KEY||!e.newValue)return;try{state=validate(JSON.parse(e.newValue));window.dispatchEvent(new CustomEvent('pp:change'));}catch{}});


// ui.js
const $=s=>document.querySelector(s);
function el(tag,attrs={},...children){const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='class')n.className=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2).toLowerCase(),v);else if(k==='checked')n.checked=v;else if(k==='value')n.value=v;else if(v!==false&&v!==null&&v!==undefined)n.setAttribute(k,v===true?'':String(v));}for(const c of children.flat())if(c!=null)n.append(typeof c==='string'?document.createTextNode(c):c);return n;}
let timer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}
function commit(fn){try{fn();return true;}catch(e){toast(e.name==='QuotaExceededError'?'Storage is full. Export a backup, then remove an upload before retrying.':e.message||'Could not save. Check browser storage permissions.');return false;}}
function modal(title,content){$('#modal-title').textContent=title;$('#modal-body').replaceChildren(content);if(!$('#modal').open)$('#modal').showModal();}
const close=()=>$('#modal').close();
function button(text,fn,cls=''){return el('button',{type:'button',class:cls,onclick:fn},text);}
function field(label,input){return el('label',{class:'field'},label,input);}
function input(value='',attrs={}){return el('input',{value,...attrs});}
function download(name,data,type='application/json'){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob);const a=el('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function confirmAction(title,description,action){modal(title,el('div',{},el('p',{class:'help'},description),el('div',{class:'form-actions'},button('Cancel',close),button('Delete',()=>{if(commit(action))close();},'danger'))));}
$('#close-modal').onclick=close;
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});


// notes.js
function editNote(note=null){const title=input(note?.title||'',{required:true,maxlength:200,placeholder:'Something worth remembering'});const body=el('textarea',{maxlength:4000,placeholder:'Write a note, or add checklist items below…'},note?.body||'');const checklist=el('textarea',{placeholder:'One checklist item per line',maxlength:4000},note?.items.map(x=>x.text).join('\n')||'');const color=el('select',{},...['yellow','peach','sage'].map(c=>el('option',{value:c},c[0].toUpperCase()+c.slice(1))));color.value=note?.color||'yellow';const form=el('form',{},field('Title',title),field('Note',body),field('Checklist (optional)',checklist),field('Paper color',color));
  form.append(el('div',{class:'form-actions'},...(note?[button('Delete',()=>confirmAction('Delete this note?','This removes the note from this browser.',()=>update(s=>s.notes=s.notes.filter(n=>n.id!==note.id))),'danger')]:[]),button('Cancel',close),el('button',{class:'primary',type:'submit'},'Save note')));
  form.onsubmit=e=>{e.preventDefault();if(!title.value.trim())return title.focus();const lines=checklist.value.split('\n').map(x=>x.trim()).filter(Boolean);if(lines.length>50){checklist.setCustomValidity('Use at most 50 checklist items.');checklist.reportValidity();return;}const value={title:title.value.trim(),body:body.value,color:color.value,items:lines.map(text=>({text,done:note?.items.find(x=>x.text===text)?.done||false}))};if(commit(()=>update(s=>{if(note)Object.assign(s.notes.find(n=>n.id===note.id),value);else s.notes.push({id:uid(),owner:s.person,x:430+(s.notes.length%4)*35,y:290+(s.notes.length%3)*20,width:246,height:185,rotation:s.notes.length%2?3:-3,...value});})))close();};
  modal(note?'Edit sticky note':'A new sticky note',form);}
function noteLayout(n,index){
  const root=$('#desktop').getBoundingClientRect(), area=$('#notes').getBoundingClientRect();
  const left=area.left-root.left,top=area.top-root.top;
  const width=Math.min(n.width,Math.max(200,area.width-20));
  const spaceX=Math.max(1,area.width-width-20),spaceY=Math.max(1,area.height-210);
  const tablet=innerWidth>700&&innerWidth<=1100;
  const x=n.placement?left+n.placement.x*spaceX:left+10+(tablet?0:(n.x-354)/Math.max(1,694-n.width))*spaceX;
  const y=n.placement?top+n.placement.y*spaceY:top+16+(tablet?index*215:Math.max(0,n.y-285));
  return {x:Math.max(12,Math.min(root.width-width-12,x)),y:Math.max(110,Math.min(root.height-210,y)),width,left,top,spaceX,spaceY};
}
function savePosition(n,card,x,y){const layout=noteLayout(n,state.notes.findIndex(a=>a.id===n.id));return commit(()=>update(s=>{s.notes.find(a=>a.id===n.id).placement={x:(x-layout.left)/layout.spaceX,y:(y-layout.top)/layout.spaceY};}));}
function positionAllowed(x,y,w,h){const origin=$('#desktop').getBoundingClientRect();return !['.identity','.desktop-controls','.search-area','.countdown','.tasks','.noticeboard','.toolbox','.communication'].some(selector=>{const r=$(selector).getBoundingClientRect();const left=r.left-origin.left,top=r.top-origin.top;return x<left+r.width+8&&x+w>left-8&&y<top+r.height+8&&y+h>top-8;});}
function attachDrag(card,handle,n){let drag;
 handle.addEventListener('pointerdown',e=>{if(e.target.closest('button')||innerWidth<=700||e.button!==0)return;e.preventDefault();drag={sx:e.clientX,sy:e.clientY,x:card.offsetLeft,y:card.offsetTop,lastX:card.offsetLeft,lastY:card.offsetTop};handle.setPointerCapture(e.pointerId);card.classList.add('dragging');});
 handle.addEventListener('pointermove',e=>{if(!drag)return;const root=$('#desktop');const x=Math.max(12,Math.min(root.clientWidth-card.offsetWidth-12,drag.x+e.clientX-drag.sx));const y=Math.max(110,Math.min(root.clientHeight-card.offsetHeight-12,drag.y+e.clientY-drag.sy));card.style.left=x+'px';card.style.top=y+'px';drag.lastX=x;drag.lastY=y;});
 const finish=e=>{if(!drag)return;const d=drag;drag=null;card.classList.remove('dragging');if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);if(e.type==='pointercancel'||!positionAllowed(d.lastX,d.lastY,card.offsetWidth,card.offsetHeight)||!savePosition(n,card,d.lastX,d.lastY)){card.style.left=d.x+'px';card.style.top=d.y+'px';}};handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
 handle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||innerWidth<=700)return;e.preventDefault();const x=card.offsetLeft+(e.key==='ArrowLeft'?-10:e.key==='ArrowRight'?10:0),y=card.offsetTop+(e.key==='ArrowUp'?-10:e.key==='ArrowDown'?10:0);if(x>=12&&y>=110&&x+card.offsetWidth<$('#desktop').clientWidth-12&&positionAllowed(x,y,card.offsetWidth,card.offsetHeight)){savePosition(n,card,x,y);Array.from(document.querySelectorAll('.note')).find(c=>c.dataset.id===n.id)?.querySelector('.note-header').focus();}});
}
function attachResize(card,grip,n){let start;grip.onpointerdown=e=>{e.preventDefault();start={x:e.clientX,y:e.clientY,w:card.offsetWidth,h:card.offsetHeight};grip.setPointerCapture(e.pointerId);};grip.onpointermove=e=>{if(!start)return;card.style.width=Math.min(500,$('#desktop').clientWidth-card.offsetLeft-12,Math.max(200,start.w+e.clientX-start.x))+'px';card.style.minHeight=Math.min(400,Math.max(160,start.h+e.clientY-start.y))+'px';};grip.onpointerup=()=>{if(!start)return;start=null;commit(()=>update(s=>{const a=s.notes.find(a=>a.id===n.id);a.width=card.offsetWidth;a.height=card.offsetHeight;}));};grip.onpointercancel=()=>{start=null;renderNotes();};}
function renderNotes(){const nodes=state.notes.map((n,index)=>{const layout=noteLayout(n,index);const card=el('article',{class:`note ${n.color}-note`,'data-id':n.id});Object.assign(card.style,{left:layout.x+'px',top:layout.y+'px',width:layout.width+'px',minHeight:n.height+'px'});card.style.setProperty('--rotation',n.rotation+'deg');const header=el('div',{class:'note-header',tabindex:0,'aria-label':`Move ${n.owner}'s note. Use arrow keys or drag.`},n.owner.toUpperCase(),button('···',()=>editNote(n)));header.lastChild.setAttribute('aria-label','Edit note '+n.title);const title=el('div',{class:'note-title',ondblclick:()=>editNote(n)},n.title);card.append(header,title);if(n.body)card.append(el('p',{class:'note-description'},n.body));if(n.items.length)card.append(el('div',{class:'note-checklist'},...n.items.map((item,i)=>el('label',{},el('input',{type:'checkbox',checked:item.done,onchange:e=>commit(()=>update(s=>s.notes.find(a=>a.id===n.id).items[i].done=e.target.checked))}),el('span',{},item.text)))));const grip=button('',()=>{},'note-resize');grip.setAttribute('aria-label','Resize note');grip.setAttribute('tabindex','-1');card.append(grip);attachDrag(card,header,n);attachResize(card,grip,n);return card;});$('#notes').replaceChildren(...nodes);}


// tasks.js
let showCompleted=false;let timerHandle;
function editTask(task=null){const title=input(task?.title||'',{required:true,maxlength:200});const category=input(task?.category||'DSA',{required:true,maxlength:40});const minutes=input(task?.minutes||25,{type:'number',min:1,max:300,required:true});const url=input(task?.url||'',{type:'url',placeholder:'https://… (optional)'});const form=el('form',{},field('What will you finish?',title),field('Topic',category),field('Minutes',minutes),field('Start link (optional)',url),el('div',{class:'form-actions'},...(task?[button('Delete task',()=>{if(commit(()=>update(s=>{s.tasks=s.tasks.filter(x=>x.id!==task.id);if(s.session?.taskId===task.id)s.session=null;})))close();},'danger')]:[]),button('Cancel',close),el('button',{type:'submit',class:'primary'},'Save task')));form.onsubmit=e=>{e.preventDefault();if(!title.value.trim())return title.focus();if(url.value&&!safeUrl(url.value))return toast('Use an https:// or http:// link.');if(commit(()=>update(s=>{const value={title:title.value.trim(),category:category.value.trim(),minutes:Number(minutes.value),url:url.value.trim()};if(task)Object.assign(s.tasks.find(t=>t.id===task.id),value);else s.tasks.push({id:uid(),owner:s.person,done:false,...value});})))close();};modal(task?'Edit task':'Your next task',form);}
function session(task){if(state.session&&state.session.taskId!==task.id){modal('A session is already running',el('div',{},el('p',{class:'help'},'Finish or stop your current session before starting another.'),button('Open current session',()=>{const old=state.tasks.find(t=>t.id===state.session.taskId);if(old)session(old);})));return;}
 if(!state.session&&!commit(()=>update(s=>s.session={taskId:task.id,endAt:Date.now()+task.minutes*60000})))return;
 const readout=el('div',{class:'timer','aria-live':'off'});const message=el('p',{class:'help'},'One task. A little progress.');const content=el('div',{},message,readout,el('div',{class:'modal-buttons'},...(task.url?[el('a',{href:task.url,target:'_blank',rel:'noopener noreferrer',class:'primary',style:'padding:10px 16px;border-radius:12px'},'Open study link ↗')]:[]),button('Mark complete',()=>{if(commit(()=>update(s=>{s.tasks.find(t=>t.id===task.id).done=true;s.session=null;}))){clearInterval(timerHandle);close();toast('One step closer. Task complete.');}},'primary'),button('Stop session',()=>{if(commit(()=>update(s=>s.session=null))){clearInterval(timerHandle);close();}})));
 modal(task.title,content);clearInterval(timerHandle);const tick=()=>{if(!state.session||state.session.taskId!==task.id){clearInterval(timerHandle);return;}const seconds=Math.max(0,Math.ceil((state.session.endAt-Date.now())/1000));readout.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');if(!seconds){message.textContent='Time is up. Mark the task complete, or keep working.';clearInterval(timerHandle);}};tick();timerHandle=setInterval(tick,1000);}
function renderTasks(){document.querySelectorAll('[data-person]').forEach(b=>{b.classList.toggle('active',b.dataset.person===state.person);b.setAttribute('aria-pressed',String(b.dataset.person===state.person));});const all=state.tasks.filter(t=>t.owner===state.person&&t.done===showCompleted);$('#task-history').setAttribute('aria-label',showCompleted?'Show active tasks':'Show completed tasks');const list=all.map((t,i)=>{if(!showCompleted&&i===0){const current=el('article',{class:'current-task'},el('p',{class:'task-meta'},'01  /  '+t.category+' · '+t.minutes+' min'),el('p',{class:'task-title'},t.title),button(state.session?.taskId===t.id?'Resume session ↗':'Start session ↗',()=>session(t),'primary'),button('···',()=>editTask(t),'task-menu'));current.lastChild.setAttribute('aria-label','Edit '+t.title);return current;}
 const box=el('input',{type:'checkbox',checked:t.done,'aria-label':t.done?'Restore '+t.title:'Complete '+t.title,onchange:e=>commit(()=>update(s=>{s.tasks.find(x=>x.id===t.id).done=e.target.checked;if(s.session?.taskId===t.id)s.session=null;}))});const row=el('article',{class:'task-row '+(t.done?'completed':'')},box,el('div',{},el('p',{class:'task-title'},t.title),el('p',{class:'task-meta'},t.category+' · '+t.minutes+' min')),button('···',()=>editTask(t),'task-menu'));row.lastChild.setAttribute('aria-label','Edit '+t.title);return row;});$('#task-list').replaceChildren(...(list.length?list:[el('p',{class:'empty'},showCompleted?'No completed tasks yet.':'You’re all caught up. Add one meaningful next step.')]));}
$('#people').onclick=e=>{const p=e.target.closest('[data-person]');if(p)commit(()=>update(s=>s.person=p.dataset.person));};
$('#task-history').onclick=()=>{showCompleted=!showCompleted;renderTasks();toast(showCompleted?'Showing completed tasks. Click ··· to return.':'Showing active tasks.');};


// resources.js
let filter='all';
function openPin(pin){if(pin.url){window.open(pin.url,'_blank','noopener,noreferrer');return;}if(pin.kind==='image'){modal(pin.title,el('img',{class:'image-preview',src:pin.sample?'assets/inspiration.svg':pin.data,alt:pin.title}));return;}if(pin.data){const [prefix,encoded]=pin.data.split(',');const mime=prefix.slice(5,prefix.indexOf(';'));const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:mime}));const a=el('a',{href:url,download:pin.filename||pin.title});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}modal(pin.title,el('p',{class:'help'},pin.body||'This sample card shows where your saved files and links will appear. Use “Pin anything” to add your own.'));}
function addPin(){const title=input('',{required:true,maxlength:200,placeholder:'Give it a name'});const url=input('',{type:'url',placeholder:'https://…'});const kind=el('select',{},el('option',{value:'link'},'Link / written note'),el('option',{value:'video'},'Video'),el('option',{value:'image'},'Image'),el('option',{value:'file'},'File'));const file=input('',{type:'file',accept:'image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain'});const caption=el('textarea',{maxlength:4000,placeholder:'Why are you saving this?'});const form=el('form',{},field('Title',title),field('Type',kind),field('Link (optional)',url),field('Or upload an image, PDF or text file',file),el('p',{class:'help'},'Up to 1 MB per file. Shared storage uploads files privately when connected.'),field('Caption / note',caption),el('div',{class:'form-actions'},button('Cancel',close),el('button',{type:'submit',class:'primary'},'Pin it')));
 form.onsubmit=async e=>{e.preventDefault();if(!title.value.trim())return title.focus();if(url.value&&!safeUrl(url.value))return toast('Use an https:// or http:// link.');const upload=file.files[0];if(!url.value&&!upload&&!caption.value.trim())return toast('Add a link, a file, or a written note.');if(kind.value==='video'&&!url.value)return toast('Add a video link.');if(kind.value==='image'&&!upload&&!url.value)return toast('Add an image file or link.');let data='',filename='',resolved=kind.value;
 if(upload){if(upload.size>1000000)return toast('Choose a file smaller than 1 MB.');if(!['image/png','image/jpeg','image/webp','image/gif','application/pdf','text/plain'].includes(upload.type))return toast('Use PNG, JPEG, WebP, GIF, PDF or a text file.');try{data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(upload);});}catch{return toast('The file could not be read. Please try again.');}filename=upload.name;resolved=upload.type.startsWith('image/')?'image':'file';}
 if(commit(()=>update(s=>s.pins.unshift({id:uid(),title:title.value.trim(),kind:resolved,url:url.value.trim(),data,filename,body:caption.value,owner:s.person,sample:false})))){close();toast('Pinned for later.');}};modal('Save something for us',form);}
function renderPins(){const items=state.pins.filter(p=>filter==='all'||(filter==='link'?['link','file'].includes(p.kind):p.kind===filter));$('#pins').replaceChildren(...items.map(p=>{const open=button('',()=>openPin(p),'pin-link');open.setAttribute('aria-label','Open '+p.title);if(p.kind==='video')open.append(el('div',{class:'pin-cover video-cover'},el('span',{},'▶'),p.sample?'lo   mid   hi':'Watch video ↗'));else if(p.kind==='image'){const img=el('img',{class:'pin-cover',src:p.sample?'assets/inspiration.svg':p.data||p.url,alt:p.title,loading:'lazy',referrerpolicy:'no-referrer'});img.onerror=()=>{img.replaceWith(el('div',{class:'pin-cover video-cover'},'Image unavailable'));};open.append(img);}else open.append(el('img',{src:'assets/document.svg',width:25,height:25,alt:''}));open.append(el('p',{class:'pin-title'},p.title));if(p.sample&&p.id==='pin-3')open.append(el('p',{class:'pin-caption'},p.body));else open.append(el('p',{class:'pin-meta'},`${p.kind[0].toUpperCase()+p.kind.slice(1)} · ${p.owner}`));const del=button('×',()=>confirmAction('Remove this pin?','Remove this resource from your workspace? This also syncs to your friend when connected.',()=>update(s=>s.pins=s.pins.filter(x=>x.id!==p.id))),'pin-delete');del.setAttribute('aria-label','Remove '+p.title);return el('article',{class:'pin '+p.kind+'-pin'},open,del);}));if(!items.length)$('#pins').append(el('p',{class:'empty'},'A little space for something useful. Pin a resource to keep it here.'));}
$('#filters').onclick=e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderPins();};


// sync.js
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


// app.js
function resize(){renderNotes();}
window.addEventListener('resize',resize);
function renderCountdown(){const date=state.examDate;if(!date){$('#days').textContent='106';$('#edit-date').textContent='Sample countdown · Edit date ↗';return;}const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const days=Math.ceil((Date.parse(date+'T00:00:00+05:30')-Date.parse(today+'T00:00:00+05:30'))/86400000);$('#days').textContent=Math.max(0,days);$('#edit-date').textContent=(days<0?'Target passed · ':days===0?'Today · ':'')+new Date(date+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})+' · Edit ↗';}
function editDate(){const date=input(state.examDate,{type:'date',required:true});const form=el('form',{},el('p',{class:'help'},'Choose your target date. The countdown uses India time. The design’s 106 days is a sample, not an official exam date.'),field('GATE target date',date),el('button',{type:'submit',class:'primary'},'Save date'));form.onsubmit=e=>{e.preventDefault();if(commit(()=>update(s=>s.examDate=date.value)))close();};modal('Your GATE countdown',form);}
function renderDock(){const colors=['#eef1e6','#dde7d3','#f9e7a0','#f4ceb7'];$('#dock').replaceChildren(...state.shortcuts.map((a,i)=>{const icon=el('span',{class:'app-icon',style:'background:'+a.color},a.symbol);const link=el('a',{href:a.url,target:'_blank',rel:'noopener noreferrer'},icon,el('span',{},a.title));const del=button('×',()=>confirmAction('Remove shortcut?','Remove '+a.title+' from your toolbox?',()=>update(s=>s.shortcuts=s.shortcuts.filter(x=>x.id!==a.id))),'remove-shortcut');del.setAttribute('aria-label','Remove shortcut '+a.title);return el('div',{class:'shortcut'},link,del);}));}
function addShortcut(){const title=input('',{required:true,maxlength:30});const url=input('',{type:'url',required:true,placeholder:'https://…'});const symbol=input('↗',{required:true,maxlength:8});const form=el('form',{},field('App name',title),field('URL',url),field('Symbol or initials',symbol),el('button',{class:'primary',type:'submit'},'Add shortcut'));form.onsubmit=e=>{e.preventDefault();if(!title.value.trim())return title.focus();if(!safeUrl(url.value))return toast('Use an https:// or http:// link.');if(commit(()=>update(s=>s.shortcuts.push({id:uid(),title:title.value.trim(),url:safeUrl(url.value),symbol:symbol.value,color:'#dde7d3'}))))close();};modal('Your toolbox',form);}
const timeLabel=m=>m.sample?'11:02':new Date(m.time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
function renderMessage(){const m=state.messages.at(-1);$('#latest-message').replaceChildren(...(m?[el('small',{},m.owner+' · '+timeLabel(m)),el('p',{},m.text)]:[el('small',{},'A space for both of you'),el('p',{},'Leave the first message.')]));$('#message-input').setAttribute('aria-label','Message as '+state.person);}
function history(){modal('Between us',el('div',{},el('p',{class:'help'},'Message history. Export a copy whenever you want to keep a file.'),el('div',{class:'modal-buttons'},button('Export messages',()=>download('p-and-p-messages.json',JSON.stringify({version:1,messages:state.messages},null,2))),button('Import messages',importMessages)),...state.messages.slice().reverse().map(m=>el('article',{class:'message-item'},el('small',{},m.owner+' · '+timeLabel(m)+(m.sample?' · sample':'')),el('p',{},m.text)))));}
function chooseJson(onRead){const picker=input('',{type:'file',accept:'.json,application/json'});picker.onchange=async()=>{const f=picker.files[0];if(!f)return;if(f.size>20000000)return toast('This file is too large. Use a backup under 20 MB.');try{await onRead(JSON.parse(await f.text()));}catch(e){toast(e.message||'That file could not be imported.');}};picker.click();}
function importMessages(){chooseJson(data=>{if(data.version!==1||!Array.isArray(data.messages))throw Error('Choose an exported messages file.');const candidate=structuredClone(state);candidate.messages=data.messages;validate(candidate);const existing=new Set(state.messages.map(m=>m.id));const added=data.messages.filter(m=>!existing.has(m.id));if(commit(()=>update(s=>s.messages.push(...added)))){history();toast(added.length+' messages imported.');}});}
function customize(){const calm=el('input',{type:'checkbox',checked:state.calm,onchange:e=>commit(()=>update(s=>s.calm=e.target.checked))});const motion=el('input',{type:'checkbox',checked:state.motion,onchange:e=>commit(()=>update(s=>s.motion=e.target.checked))});const content=el('div',{},el('p',{class:'help'},'Choose shared storage to pair your laptops. Appearance preferences stay on this browser.'),el('label',{style:'display:flex;gap:10px;margin:20px 0'},calm,'Softer background'),el('label',{style:'display:flex;gap:10px;margin:20px 0'},motion,'Gentle animations'),el('div',{class:'modal-buttons'},button('Shared storage',cloudSettings),button('Export everything',()=>download('p-and-p-backup.json',JSON.stringify(cloudBackup(),null,2))),button('Import backup',()=>chooseJson(data=>{validate(data);modal('Replace this workspace?',el('div',{},el('p',{class:'help'},'Importing replaces your current notes, tasks, pins, messages and shortcuts. Export your current workspace first if you want to keep it.'),el('div',{class:'form-actions'},button('Cancel',close),button('Import and replace',()=>{if(commit(()=>replace(data))){close();toast('Workspace imported.');}},'primary'))));})),button('Messages file',history)),el('p',{class:'help',style:'margin-top:20px'},'Set this page’s URL as your browser startup page. Keep using the same address: browser storage belongs to that address. Export a backup before changing browsers or clearing browsing data.'));modal('Make it yours',content);}
$('#message-form').onsubmit=e=>{e.preventDefault();const text=$('#message-input').value.trim();if(!text)return;if(commit(()=>update(s=>s.messages.push({id:uid(),owner:s.person,text,time:new Date().toISOString(),sample:false})))){$('#message-input').value='';toast(state._cloud?'Message saved · syncing shortly.':'Message saved on this browser.');}};
$('#search-form').onsubmit=e=>{e.preventDefault();const q=$('#search-input').value.trim();if(!q)return;const direct=safeUrl(q)||(/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(q)?safeUrl('https://'+q):'');location.assign(direct||'https://www.google.com/search?q='+encodeURIComponent(q));};
$('#add-note').onclick=()=>editNote();$('#add-task').onclick=()=>editTask();$('#add-pin').onclick=addPin;$('#edit-date').onclick=editDate;$('#add-shortcut').onclick=addShortcut;$('#customize').onclick=customize;$('#message-history').onclick=history;$('#latest-message').onclick=history;
function render(){document.body.classList.toggle('calm',state.calm);document.body.classList.toggle('no-motion',!state.motion);renderCountdown();renderNotes();renderTasks();renderPins();renderDock();renderMessage();}
window.addEventListener('pp:change',render);render();resize();setInterval(renderCountdown,60000);if(getStartupError())toast(getStartupError());

startCloud();

})();
