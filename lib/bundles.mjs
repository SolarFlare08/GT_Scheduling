export function sectionGroup(code){return String(code).trim().toUpperCase().match(/^([A-Z]+)(?:\d.*)?$/)?.[1]??null;}
export function componentType(s){if(s.component)return s.component;const t=(s.type||'lecture').toLowerCase();return /recitation|breakout/.test(t)?'recitation':/laboratory|\blab\b/.test(t)?'lab':'lecture';}
export const meetingsOverlap=(a,b)=>a.days.split('').some(d=>b.days.includes(d))&&a.start<b.end&&b.start<a.end&&(!a.from||!b.from||a.from<=b.to&&b.from<=a.to);
export const sectionsConflict=(a,b)=>a.meetings.some(x=>b.meetings.some(y=>meetingsOverlap(x,y)));
export function bundlesFor(course,catalog,selection,eligible){
 const mapping=selection.components||course.componentSources||{};
 const required=selection.requiredComponents||course.requiredComponents;
 const pool=[...new Set([course.id,...Object.values(mapping)])].flatMap(id=>{
  const c=catalog.find(c=>c.id===id);if(!c)throw Error(`${course.id}: missing component course ${id}`);return c.sections.map(s=>({...s,course:course.id,sourceCourse:id,component:componentType(s)}));
 });
 const present=[...new Set(pool.map(s=>s.component))];
 const coreqs=(course.corequisites||[]).map(c=>c.id).filter(Boolean);
 if(!required&&(present.some(t=>t!=='lecture')||coreqs.length))throw Error(`${course.id}: confirm required components and companion course codes in Components before scheduling. Source linkage is incomplete.`);
 const types=required||['lecture'];
 if(!types.includes('lecture')||types.some(t=>!['lecture','lab','recitation'].includes(t))||new Set(types).size!==types.length)throw Error(`${course.id}: required components must contain lecture and at most one lab and recitation.`);
 const options=types.map(type=>pool.filter(s=>s.component===type&&(!mapping[type]||s.sourceCourse===mapping[type])&&eligible(s)));
 if(options.some(a=>!a.length))return [];
 const locked=[...new Set([selection.lock,...(selection.locks||[])].filter(Boolean))];
 const result=[];
 function add(i,chosen){if(i===types.length){if(!locked.every(crn=>chosen.some(s=>s.crn===crn)))return;
  // Official allow-lists are additional restrictions, never a replacement for letter matching.
  if(chosen.some(s=>s.linkedCrns&& !chosen.filter(t=>t!==s).every(t=>s.linkedCrns.includes(t.crn))))return;
  result.push({sections:chosen,credits:chosen.reduce((n,s)=>n+s.credits,0)});return;}
  for(const s of options[i]){const group=s.groupLetter||sectionGroup(s.code);if(!group&&types.length>1)throw Error(`${course.id} ${s.code}: cannot determine section group.`);
   if(s.groupLetter&&sectionGroup(s.code)!==s.groupLetter)throw Error(`${course.id} ${s.code}: group metadata disagrees with section identifier.`);
   if(chosen.some(t=>(t.groupLetter||sectionGroup(t.code))!==group||sectionsConflict(t,s)))continue;
   add(i+1,[...chosen,s]);
  }
 }
 add(0,[]);return result;
}
