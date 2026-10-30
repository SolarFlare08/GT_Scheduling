import {nameKey} from './professor-summary.js';

export function saveProfessorRating(records,name,rating,difficulty){
 const number=value=>{if(String(value).trim()==='')return null;const n=Number(value);if(!Number.isFinite(n)||n<1||n>5)throw Error('Rating and difficulty must be between 1 and 5, or blank.');return n;};
 const key=nameKey(name),existing=records.find(p=>nameKey(p.name)===key);
 const entry={...existing,id:existing?.id||'manual-rmp:'+key,name,rating:number(rating),difficulty:number(difficulty),source:'Manually entered Rate My Professors',updatedAt:new Date().toISOString()};
 return [...records.filter(p=>nameKey(p.name)!==key),entry];
}

export function setupScheduleSummary({getSchedule,getCourses,getSummaries,state,save}){
 const root=document.createElement('section');root.id='schedule-summary';root.className='schedule-summary';document.querySelector('main').append(root);
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 const clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
 const metric=n=>Number.isFinite(n)?n.toFixed(2):'Unknown';
 function render(){
  root.replaceChildren(el('h2','Selected schedule summary'));
  const schedule=getSchedule();if(!schedule){root.append(el('p','Find schedules and select an option to see its summary.'));return;}
  root.append(el('p',`${schedule.credits} credits · ${schedule.sections.length} sections, including linked components`));
  const wrap=el('div');wrap.className='tablewrap';const table=el('table'),head=el('tr');
  for(const title of ['Course / section','Instructor / GPA','Meetings / location','Campus / credits'])head.append(el('th',title));
  const thead=el('thead');thead.append(head);table.append(thead);const body=el('tbody'),instructors=new Map();
  for(const section of schedule.sections){
   const row=el('tr'),course=getCourses().find(c=>c.id===section.course),summary=getSummaries(section.course)||[];
   const code=el('td');code.append(el('strong',`${section.course} · ${section.code}`),el('p',course?.title||''),el('p',`CRN ${section.crn} · ${section.type||section.component||'Section'}`));
   const prof=el('td');
   for(const name of new Set(section.meetings.flatMap(m=>m.instructors||[]))){
    const key=nameKey(name),match=summary.find(p=>nameKey(p.name)===key);
    prof.append(el('strong',name.replace(/\s*\(P\)\s*$/i,'')),el('p',`Average GPA: ${metric(match?.averageGpa)} · Recent: ${metric(match?.recentGpa)}`));
    if(key&&!/^(tba|unknown|staff)$/.test(key))instructors.set(key,name.replace(/\s*\(P\)\s*$/i,''));
   }
   if(!prof.children.length)prof.textContent='Instructor unknown';
   const meetings=el('td');for(const m of section.meetings)meetings.append(el('p',`${m.days} ${clock(m.start)}–${clock(m.end)} · ${m.room||'Location unknown'}`));
   const campus=el('td');campus.append(el('p',section.campus||'Unknown campus'),el('p',`${section.credits} credits`));row.append(code,prof,meetings,campus);body.append(row);
  }
  table.append(body);wrap.append(table);root.append(wrap,el('h3','Professor ratings'),el('p','Enter Rate My Professors values from 1–5. Leave blank for unknown. These entries are saved in this browser and included in complete JSON backups. They are displayed here; schedule ranking currently uses Course Critique GPA and your section preferences.'));
  const forms=el('div');forms.className='professor-rating-grid';
  for(const [key,name] of instructors){
   const saved=(state().professors||[]).find(p=>nameKey(p.name)===key),form=el('form');form.className='professor-rating-card';form.append(el('h4',name));
   const link=el('a','Look up on Rate My Professors ↗');link.href='https://www.ratemyprofessors.com/search/professors?q='+encodeURIComponent(name);link.target='_blank';link.rel='noreferrer';form.append(link);
   const fields={};for(const [field,title] of [['rating','Rating'],['difficulty','Difficulty']]){const label=el('label',title+' (1–5)'),input=el('input');input.type='number';input.min='1';input.max='5';input.step='0.1';input.value=saved?.[field]??'';input.setAttribute('aria-label',`${name} ${title}`);label.append(input);form.append(label);fields[field]=input;}
   const button=el('button','Save ratings');button.type='submit';const message=el('p');message.setAttribute('role','status');
   form.onsubmit=e=>{e.preventDefault();try{save(saveProfessorRating(state().professors||[],name,fields.rating.value,fields.difficulty.value));const current=[...root.querySelectorAll('form')].find(f=>f.querySelector('h4')?.textContent===name);if(current)current.querySelector('[role="status"]').textContent='Saved in this browser.';}catch(error){message.textContent=error.message;}};
   form.append(button,message);forms.append(form);
  }
  root.append(forms);
 }
 return {render};
}
