import {travelSummary} from './travel.mjs';
export const overlap=(a,b)=>a.days.split('').some(d=>b.days.includes(d))&&a.start<b.end&&b.start<a.end&&(!a.from||!b.from||a.from<=b.to&&b.from<=a.to);
export const conflict=(a,b)=>a.meetings.some(x=>b.meetings.some(y=>overlap(x,y)));
export function solve(courses, input={}) {
 const {selections=[],failed=[],baseline=[],minCredits=0,maxCredits=21,earliest=0,latest=1440,blocked=[],allowUnknown=false}=input;
 if(selections.length>10) throw Error('Select at most 10 courses per optimization.');
 if(!Number.isFinite(minCredits)||!Number.isFinite(maxCredits)||minCredits<0||maxCredits<minCredits||maxCredits>40) throw Error('Invalid credit range.');
 const rows=selections.map(p=>{const c=courses.find(c=>c.id===p.id);if(!c)throw Error('Unknown course: '+p.id);return {p,c,options:c.sections.filter(s=>!failed.includes(s.crn)&&!(p.excluded||[]).includes(s.crn)&&(!p.lock||p.lock===s.crn)&&s.credits>0&&s.status!=='closed'&&(allowUnknown||s.status==='open'||s.status==='unknown')&&!s.unknownTime&&s.meetings.every(m=>m.start>=earliest&&m.end<=latest&&!blocked.some(b=>overlap(m,b))))};});
 const offset=input.offset??0,limit=input.limit??50;
 if(!Number.isInteger(offset)||offset<0||offset>4950||!Number.isInteger(limit)||limit<1||limit>50)throw Error('Result page must be within the first 5,000 schedules, with 1–50 per page.');
 let nodes=0,truncated=false,results=[],feasibleCount=0;
 function visit(i,chosen,credits,missed,preferred){
  if(++nodes>250000){truncated=true;return;}
  if(credits>maxCredits)return;
  if(i===rows.length){if(credits<minCredits||!chosen.length)return;const changed=baseline.filter(s=>!chosen.some(x=>x.crn===s.crn)).length;
   let gap=0;for(const d of 'MTWRFSU'){const ms=chosen.flatMap(s=>s.meetings).filter(m=>m.days.includes(d)).sort((a,b)=>a.start-b.start);for(let j=1;j<ms.length;j++)gap+=Math.max(0,ms[j].start-ms[j-1].end);}
   const travel=travelSummary(chosen);
   const score=[missed,changed,-preferred,travel.shortfall,gap];feasibleCount++;results.push({sections:[...chosen],credits,score,travel});results.sort((a,b)=>compare(a.score,b.score));if(results.length>offset+limit)results.pop();return;}
  const {p,options}=rows[i];for(const s of options){if(!chosen.some(x=>conflict(s,x)))visit(i+1,[...chosen,s],credits+s.credits,missed,preferred+(p.role==='preferred'?1:0));}
  if(!p.lock)visit(i+1,chosen,credits,missed+(p.role==='required'?1:0),preferred);
 }
 visit(0,[],0,0,0);
 return {schedules:results.slice(offset,offset+limit),feasibleCount,offset,limit,hasMore:feasibleCount>offset+limit&&offset+limit<5000,nodes,optimal:!truncated,status:!feasibleCount?'infeasible':truncated?'search-limit':'optimal',warnings:['Walking is estimated from coordinates × 1.3 at 80 m/min; missing locations are unknown, not zero. Gaps shorter than twice estimated walking time are penalized before minimizing gaps.','Results are paginated (up to 5,000 ranked schedules); the 250,000-node search budget may leave combinations unexplored.','Seat availability is unknown in the published crawler. Confirm registration eligibility and linked components in OSCAR.','Courses with unknown meeting times and zero-credit components are excluded. Linked registration combinations are not yet verified.']};
}
function compare(a,b){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;}
