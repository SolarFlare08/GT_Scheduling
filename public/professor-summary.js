// Match exact normalized full names only; never fuzzy-match initials or surnames.
export function nameKey(name){
 let value=String(name||'').replace(/\s*\(P\)\s*$/i,'').trim();
 if(value.includes(',')){const [last,...first]=value.split(',');value=first.join(' ')+' '+last;}
 return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
const termNumber=term=>{const m=String(term).match(/^(Spring|Summer|Fall) (\d{4})$/);return m?Number(m[2])*100+({Spring:2,Summer:5,Fall:8})[m[1]]:null;};
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
export function summarizeProfessors(rows,sections,semester){
 const current=new Map();for(const s of sections)for(const m of s.meetings)for(const name of m.instructors||[]){const key=nameKey(name);if(!key||/^(tba|unknown|staff)$/.test(key))continue;if(!current.has(key))current.set(key,{name:name.replace(/\s*\(P\)\s*$/i,''),sections:new Set(),rows:[],ids:new Set()});current.get(key).sections.add(s.code);}
 for(const row of rows){const p=current.get(nameKey(row.instructor));if(p){p.ids.add(row.instructorId||nameKey(row.instructor));const t=termNumber(row.term);if(!semester||t===null||t<=Number(semester))p.rows.push(row);}}
 return [...current.values()].map(p=>{
  const ambiguous=p.ids.size>1;
  const values=ambiguous?[]:p.rows.filter(r=>Number.isFinite(r.gpa)&&r.gpa>=0&&r.gpa<=4);
  const terms=[...new Set(values.map(r=>termNumber(r.term)).filter(t=>t!==null))].sort((a,b)=>b-a);
  const recent=values.filter(r=>terms.slice(0,3).includes(termNumber(r.term)));
  const average=mean(values.map(r=>r.gpa));
  return {name:p.name,sections:[...p.sections],instructorId:ambiguous?null:[...p.ids][0]||null,ambiguous,averageGpa:average,recentGpa:mean(recent.map(r=>r.gpa)),standardDeviation:average===null?null:Math.sqrt(mean(values.map(r=>(r.gpa-average)**2))),recordCount:values.length,termCount:terms.length,suppressedCount:ambiguous?null:p.rows.length-values.length,latestTerm:terms[0]||null};
 }).sort((a,b)=>a.name.localeCompare(b.name));
}
