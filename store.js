export const PEOPLE = ['Prudvee', 'Priyadarshini'];
export const uid = () => crypto.randomUUID();
const KEY = 'pp-desktop-v1';
export const defaults = () => ({version:1,person:'Prudvee',prepDeadlineVersion:1,examDate:'2027-02-01',calm:false,motion:true,session:null,
  notes:[{id:'note-1',owner:'Prudvee',title:'One problem.\nNo hints first.',body:'Explain the why, not just the code.',color:'yellow',x:365,y:294,width:236,height:185,rotation:-3,items:[]},{id:'note-2',owner:'Priyadarshini',title:'Before we log off',body:'',color:'peach',x:734,y:292,width:262,height:184,rotation:3,items:[{text:'Revise joins',done:false},{text:'Share one solution',done:false},{text:'Pick tomorrow’s task',done:false}]}],
  tasks:[{id:'task-1',owner:'Prudvee',title:'Two sliding-window problems',category:'DSA',minutes:45,url:'https://leetcode.com/problemset/',done:false},{id:'task-2',owner:'Prudvee',title:'Revise DBMS joins',category:'Core CS',minutes:30,url:'',done:false},{id:'task-3',owner:'Prudvee',title:'Apply to 2 roles',category:'Career',minutes:20,url:'',done:false},{id:'task-4',owner:'Priyadarshini',title:'Revise DBMS joins',category:'Core CS',minutes:30,url:'',done:false}],
  pins:[{id:'pin-1',title:'Binary search, visualized',kind:'video',owner:'Prudvee',url:'https://www.youtube.com/results?search_query=binary+search+visualized',sample:true},{id:'pin-2',title:'Project inspiration',kind:'image',owner:'Priyadarshini',url:'',data:'',sample:true},{id:'pin-3',title:'DBMS revision notes',kind:'link',owner:'Priyadarshini',url:'',body:'Links, files & ideas.\nKeep them here for later.',sample:true}],
  messages:[{id:'message-1',owner:'Priyadarshini',text:'Let’s compare solutions at 8.',time:'',sample:true}],
  shortcuts:[{id:'s1',title:'Code',url:'https://leetcode.com/',symbol:'</>',color:'#eef1e6'},{id:'s2',title:'GitHub',url:'https://github.com/',symbol:'⑂',color:'#dde7d3'},{id:'s3',title:'Notes',url:'https://keep.google.com/',symbol:'▤',color:'#f9e7a0'},{id:'s4',title:'Mail',url:'https://mail.google.com/',symbol:'✉',color:'#f4ceb7'}]});
export function safeUrl(value) { try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
const str = (v,max=2000) => typeof v==='string' && v.length<=max;
const num = (v,min,max) => Number.isFinite(v)&&v>=min&&v<=max;
const person = v => PEOPLE.includes(v);
export function validate(s) {
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
function load(){try{const raw=localStorage.getItem(KEY);const saved=raw?validate(JSON.parse(raw)):defaults();if(saved.prepDeadlineVersion!==1){saved.examDate='2027-02-01';saved.prepDeadlineVersion=1;if(saved._cloud){saved._cloud.queue=saved._cloud.queue.filter(op=>op.kind!=='settings');saved._cloud.queue.push({kind:'settings',id:'shared',content:{examDate:saved.examDate},deleted:false,operation:uid()});}}return saved;}catch{startupError='Saved data could not be loaded. Your previous backup has not been overwritten.';return defaults();}}
export let state=load();
export const getStartupError=()=>startupError;
export function saveState(next){validate(next);localStorage.setItem(KEY,JSON.stringify(next));state=next;window.dispatchEvent(new CustomEvent('pp:change'));}
export function update(mutator){const next=structuredClone(state);mutator(next);validate(next);queueCloudChanges(state,next);saveState(next);scheduleCloudSync();}
export function replace(next){validate(next);const candidate=structuredClone(next);delete candidate._cloud;if(state._cloud)candidate._cloud=structuredClone(state._cloud);queueCloudChanges(state,candidate);saveState(candidate);scheduleCloudSync();}
window.addEventListener('storage',e=>{if(e.key!==KEY||!e.newValue)return;try{state=validate(JSON.parse(e.newValue));window.dispatchEvent(new CustomEvent('pp:change'));}catch{}});
