import {nameKey} from './professor-summary.js';
export function gpaColor(gpa){
 if(!Number.isFinite(gpa))return {background:'#ffffff',color:'#192b38',label:'Recent GPA unknown'};
 const label=`Recent GPA ${gpa.toFixed(2)}`;
 if(gpa<3)return {background:gpa<2.5?'#a32c36':'#f5c2c7',color:gpa<2.5?'#ffffff':'#631b25',label};
 if(gpa<3.2)return {background:'#ffe8a3',color:'#513c00',label};
 if(gpa<3.5)return {background:'#c7e9ce',color:'#123c25',label};
 if(gpa<3.8)return {background:'#38834e',color:'#ffffff',label};
 return {background:'#145c32',color:'#ffffff',label};
}
export function sectionGpa(section,summary){
 const names=[...new Set(section.meetings.flatMap(m=>m.instructors||[]).map(nameKey).filter(Boolean))];
 const values=names.map(name=>summary.find(p=>nameKey(p.name)===name)?.recentGpa);
 // Co-taught sections stay unknown unless every listed instructor has a value.
 return values.length&&values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0)/values.length:null;
}
export function paintSections(root,course,summary){
 for(const row of root.querySelectorAll('[data-section-crn]')){
  const section=course.sections.find(s=>s.crn===row.dataset.sectionCrn);if(!section)continue;
  const color=gpaColor(sectionGpa(section,summary));row.classList.add('gpa-section');row.style.backgroundColor=color.background;row.style.color=color.color;
  let label=row.querySelector('.gpa-section-label');if(!label){label=document.createElement('span');label.className='gpa-section-label';row.cells[0].append(label);}label.textContent=color.label;
 }
}
