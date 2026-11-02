import {travelSummary} from './travel.js';
import {evaluate} from './preferences.js';

// Keep a compact copy of the complete result pool in the browser. Section
// objects occur once, rather than being repeated in thousands of schedules.
export function packSearchResult(result,settings={}){
 const sections=[],indices=new Map(),{schedules,...meta}=result;
 const packed=schedules.map(({sections:chosen,bundles,travel,preferences,...values})=>({
  ...values,sections:chosen.map(s=>{const key=JSON.stringify([s.course,s.sourceCourse,s.crn]);if(!indices.has(key)){indices.set(key,sections.length);sections.push(s);}return indices.get(key);})
 }));
 return {sections,schedules:packed,settings,meta};
}
export function unpackSearchPage(snapshot,offset=0,limit=50){
 if(!Number.isInteger(offset)||offset<0||offset>4950||!Number.isInteger(limit)||limit<1||limit>50)throw Error('Invalid schedule page.');
 if(offset>=snapshot.schedules.length&&offset!==0)throw Error('There are no more schedules in this search.');
 const schedules=snapshot.schedules.slice(offset,offset+limit).map(s=>{
  const sections=s.sections.map(i=>snapshot.sections[i]),groups=new Map();
  for(const section of sections){if(!groups.has(section.course))groups.set(section.course,[]);groups.get(section.course).push(section.crn);}
  return {...s,sections,bundles:[...groups].map(([course,crns])=>({course,crns})),travel:travelSummary(sections),preferences:evaluate(sections,snapshot.settings)};
 });
 return {...snapshot.meta,schedules,offset,limit,hasMore:offset+limit<snapshot.schedules.length};
}

// Reuse every loaded alternative, with recovery's protected change objective.
// Filtering preserves the original preference ordering for ties.
export function recoverySnapshot(snapshot,baseline,failed){
 const unavailable=new Set(failed),original=new Set(baseline.map(s=>s.crn));
 const schedules=snapshot.schedules.filter(s=>s.sections.every(i=>!unavailable.has(snapshot.sections[i].crn))).map(s=>{
  const kept=new Set(s.sections.map(i=>snapshot.sections[i].crn));
  const changes=[...original].filter(crn=>!kept.has(crn)).length;
  return {...s,score:[s.score[0],changes,...s.score.slice(2)],factorValues:{...s.factorValues,scheduleChanges:changes}};
 });
 schedules.sort((a,b)=>{for(let i=0;i<a.score.length;i++){const delta=a.score[i]-b.score[i];if(Math.abs(delta)>1e-8)return delta;}return 0;});
 return {...snapshot,schedules,meta:{...snapshot.meta,feasibleCount:schedules.length,feasibleCountIsExact:false,optimal:false,bestOptimal:false,alternativesOptimal:false,nodes:0,status:schedules.length?'cached-recovery':'unknown',warnings:['Quick recovery uses preloaded schedules and minimizes changes among those options. Refine recovery searches for potentially better alternatives. Seat availability must be confirmed in OSCAR.']}};
}
