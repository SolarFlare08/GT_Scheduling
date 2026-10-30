export const overlap=(a,b)=>a.days.split('').some(d=>b.days.includes(d))&&a.start<b.end&&b.start<a.end&&(!a.from||!b.from||a.from<=b.to&&b.from<=a.to);
export const conflict=(a,b)=>a.meetings.some(x=>b.meetings.some(y=>overlap(x,y)));
export function solve(courses, input={}) {
 const {selections=[],failed=[],baseline=[],minCredits=0,maxCredits=21,earliest=0,latest=1440,blocked=[],allowUnknown=false}=input;
 if(selections.length>10) throw Error('Select at most 10 courses per optimization.');
 if(!Number.isFinite(minCredits)||!Number.isFinite(maxCredits)||minCredits<0||maxCredits<minCredits||maxCredits>40) throw Error('Invalid credit range.');
 const rows=selections.map(p=>{const c=courses.find(c=>c.id===p.id);if(!c)throw Error('Unknown course: '+p.id);return {p,c,options:c.sections.filter(s=>!failed.includes(s.crn)&&!(p.excluded||[]).includes(s.crn)&&(!p.lock||p.lock===s.crn)&&s.credits>0&&s.status!=='closed'&&(allowUnknown||s.status==='open')&&!s.unknownTime&&s.meetings.every(m=>m.start>=earliest&&m.end<=latest&&!blocked.some(b=>overlap(m,b))))};});
 let nodes=0,truncated=false,results=[];
 function visit(i,chosen,credits,missed,preferred){
  if(++nodes>250000){truncated=true;return;}
  if(credits>maxCredits)return;
  if(i===rows.length){if(credits<minCredits)return;const changed=baseline.filter(s=>!chosen.some(x=>x.crn===s.crn)).length;
   let gap=0;for(const d of 'MTWRFSU'){const ms=chosen.flatMap(s=>s.meetings).filter(m=>m.days.includes(d)).sort((a,b)=>a.start-b.start);for(let j=1;j<ms.length;j++)gap+=Math.max(0,ms[j].start-ms[j-1].end);}
   const score=[missed,changed,-preferred,gap];results.push({sections:[...chosen],credits,score});results.sort((a,b)=>compare(a.score,b.score));results=results.slice(0,5);return;}
  const {p,options}=rows[i];for(const s of options){if(!chosen.some(x=>conflict(s,x)))visit(i+1,[...chosen,s],credits+s.credits,missed,preferred+(p.role==='preferred'?1:0));}
  if(!p.lock)visit(i+1,chosen,credits,missed+(p.role==='required'?1:0),preferred);
 }
 visit(0,[],0,0,0);
 return {schedules:results,nodes,optimal:!truncated,status:!results.length?'infeasible':truncated?'search-limit':'optimal',warnings:['Seat availability is unknown in the published crawler. Confirm registration eligibility and linked components in OSCAR.','Courses with unknown meeting times and zero-credit components are excluded. Linked registration combinations are not yet verified.']};
}
function compare(a,b){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;}
