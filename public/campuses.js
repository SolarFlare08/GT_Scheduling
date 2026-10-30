export function campusKey(value){
 const key=String(value||'').replace(/\*/g,'').trim().toLowerCase().replace(/\s+/g,' ');
 return /^(georgia tech[ -]+)?atlanta$/.test(key)?'atlanta':key||'unknown';
}
export function campusAllowed(section,allowed=['atlanta']){return allowed.includes(campusKey(section.campus));}
export function setupCampuses({getCourses,state,save}){
 const box=document.createElement('fieldset');box.id='campus-filter';box.innerHTML='<legend>Campuses</legend><p>Only checked campuses can appear in schedules, including required labs and recitations. Atlanta is selected by default. Campus selection does not confirm registration eligibility.</p><div id="campus-options"></div><button type="button" id="atlanta-only">Atlanta only</button>';
 document.querySelector('.basic-preferences').append(box);
 function render(){const labels=new Map([['atlanta','Georgia Tech — Atlanta']]);for(const course of getCourses())for(const section of course.sections){const key=campusKey(section.campus);if(!labels.has(key))labels.set(key,section.campus?.replace(/\*/g,'').trim()||'Unknown campus');}
  const allowed=state().preferences?.campuses??['atlanta'];for(const key of allowed)if(!labels.has(key))labels.set(key,key+' (not in current catalog)');
  const list=document.getElementById('campus-options');list.replaceChildren();for(const [key,name] of [...labels].sort(([a],[b])=>a==='atlanta'?-1:b==='atlanta'?1:a.localeCompare(b))){const label=document.createElement('label');label.className='check';const input=document.createElement('input');input.type='checkbox';input.value=key;input.checked=allowed.includes(key);input.onchange=()=>{const next=[...list.querySelectorAll('input:checked')].map(e=>e.value);save(next);};label.append(input,document.createTextNode(name));list.append(label);}
 }
 document.getElementById('atlanta-only').onclick=()=>save(['atlanta']);render();return {render};
}
