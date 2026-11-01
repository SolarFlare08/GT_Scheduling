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
