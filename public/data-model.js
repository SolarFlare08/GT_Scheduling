export const categories=['catalog','preferences','professors','courseRatings','events','profiles','schedules','registration','history','degreePlans'];
export function validateState(value){
 if(!value||typeof value!=='object'||value.schemaVersion!=='1.0')throw Error('Expected schemaVersion "1.0". Legacy plan files use Import configuration.');
 const state=structuredClone(value);
 for(const key of categories.filter(k=>!['preferences','registration'].includes(k)))if(state[key]!==undefined&&!Array.isArray(state[key]))throw Error(`${key} must be an array`);
 const crns=new Set(),ids=new Set();for(const c of state.catalog||[]){
  if(!/^[A-Z]{2,5} \d{4}[A-Z]?$/.test(c.id)||ids.has(c.id)||!Array.isArray(c.sections))throw Error(`Invalid or duplicate course ${c.id}`);ids.add(c.id);
  if(c.requiredComponents&&(!c.requiredComponents.includes('lecture')||c.requiredComponents.some(t=>!['lecture','lab','recitation'].includes(t))))throw Error(`${c.id}: invalid requiredComponents`);
  for(const s of c.sections){if(typeof s.crn!=='string'||!s.crn||crns.has(s.crn)||typeof s.code!=='string'||!Array.isArray(s.meetings)||!Number.isFinite(s.credits)||s.credits<0)throw Error(`${c.id}: invalid or duplicate section ${s.crn}`);crns.add(s.crn);
   if(s.component&&!['lecture','lab','recitation'].includes(s.component))throw Error(`${s.crn}: invalid component`);
   if(s.groupLetter&&s.code.match(/^([A-Z]+)/)?.[1]!==s.groupLetter)throw Error(`${s.crn}: group disagrees with section identifier`);
   for(const m of s.meetings){if(s.unknownTime)continue;if(!/^[MTWRFSU]+$/.test(m.days)||!Number.isFinite(m.start)||!Number.isFinite(m.end)||m.start<0||m.end>1440||m.start>=m.end)throw Error(`${s.crn}: invalid meeting time (minutes after midnight)`);}
  }
 }
 for(const p of state.professors||[])for(const [k,max] of [['rating',5],['difficulty',5],['preference',10],['reviewCount',1000000]])if(p[k]!=null&&(!Number.isFinite(p[k])||p[k]<0||p[k]>max))throw Error(`${p.name}: invalid ${k}`);
 for(const p of state.courseRatings||[])for(const [k,max] of [['gpa',4],['preference',10],['difficulty',10],['workload',168]])if(p[k]!=null&&(!Number.isFinite(p[k])||p[k]<0||p[k]>max))throw Error(`Invalid ${k}`);
 return state;
}
export function importState(current,incoming,mode='merge',selected=categories){
 validateState(incoming);const next=structuredClone(current);for(const key of selected){if(!categories.includes(key)||incoming[key]===undefined)continue;
  if(mode==='replace'||!Array.isArray(incoming[key]))next[key]=structuredClone(incoming[key]);
  else{const map=new Map((next[key]||[]).map(r=>[r.id||r.name||r.course, r]));for(const r of incoming[key]){const id=r.id||r.name||r.course;if(!id)throw Error(`${key}: merge needs an id, name or course`);map.set(id,structuredClone(r));}next[key]=[...map.values()];}
 }if(incoming.semester!==undefined)next.semester=incoming.semester;return validateState(next);
}
