export const $=s=>document.querySelector(s);
export function el(tag,attrs={},...children){const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='class')n.className=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2).toLowerCase(),v);else if(k==='checked')n.checked=v;else if(k==='value')n.value=v;else if(v!==false&&v!==null&&v!==undefined)n.setAttribute(k,v===true?'':String(v));}for(const c of children.flat())if(c!=null)n.append(typeof c==='string'?document.createTextNode(c):c);return n;}
let timer;
export function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}
export function commit(fn){try{fn();return true;}catch(e){toast(e.name==='QuotaExceededError'?'Storage is full. Export a backup, then remove an upload before retrying.':e.message||'Could not save. Check browser storage permissions.');return false;}}
export function modal(title,content){$('#modal-title').textContent=title;$('#modal-body').replaceChildren(content);if(!$('#modal').open)$('#modal').showModal();}
export const close=()=>$('#modal').close();
export function button(text,fn,cls=''){return el('button',{type:'button',class:cls,onclick:fn},text);}
export function field(label,input){return el('label',{class:'field'},label,input);}
export function input(value='',attrs={}){return el('input',{value,...attrs});}
export function download(name,data,type='application/json'){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob);const a=el('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function confirmAction(title,description,action){modal(title,el('div',{},el('p',{class:'help'},description),el('div',{class:'form-actions'},button('Cancel',close),button('Delete',()=>{if(commit(action))close();},'danger'))));}
$('#close-modal').onclick=close;
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
