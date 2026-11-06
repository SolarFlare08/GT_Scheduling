import {travelSummary} from './travel.js';
import {evaluate} from './preferences.js';

export function releaseFailedLocks(selections,failed=[]){
 const unavailable=new Set(failed);
 return selections.map(selection=>({...selection,...(unavailable.has(selection.lock)?{lock:null}:{}),...(selection.locks?{locks:selection.locks.filter(crn=>!unavailable.has(crn))}:{})}));
}

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
  return {...s,sections,bundles:[...groups].map(([course,crns])=>({course,crns})),travel:travelSummary(sections,snapshot.settings.events),preferences:evaluate(sections,snapshot.settings)};
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

// Each node owns at most 200 schedules and only its immediate failure branches.
// Reindex sections so trimming also releases unused section objects.
export function trimSnapshot(snapshot,limit=200){
 const sections=[],indices=new Map();
 const schedules=snapshot.schedules.slice(0,limit).map(s=>({...s,sections:s.sections.map(i=>{
  if(!indices.has(i)){indices.set(i,sections.length);sections.push(snapshot.sections[i]);}return indices.get(i);
 })}));
 return {...snapshot,sections,schedules,meta:{...snapshot.meta,feasibleCount:schedules.length,feasibleCountIsExact:false}};
}
export function prepareRecoveryNode(pool,baseline,failed=[],shown=null){
 const snapshot=trimSnapshot(pool),branches=new Map();
 const current=shown||unpackSearchPage(snapshot).schedules[0];
 for(const section of current?.sections||[]){
  if(branches.has(section.crn)||failed.includes(section.crn))continue;
  branches.set(section.crn,trimSnapshot(recoverySnapshot(pool,baseline,[...failed,section.crn])));
 }
 return {snapshot,branches,baseline,failed:[...failed],sections:current?.sections||[],searched:new Set()};
}

// Search every one-section failure of the schedule currently on screen. Only
// the selected path gets another level, keeping preparation and memory bounded.
export async function prepareFailureBranches(node,request,solve,{isCurrent=()=>true,onProgress=()=>{}}={}){
 const sections=[...new Map(node.sections.map(s=>[s.crn,s])).values()].filter(s=>!node.failed.includes(s.crn));
 const total=sections.length;let errors=0;
 for(const section of sections){
  if(!isCurrent())return;
  if(node.searched.has(section.crn))continue;
  onProgress({done:node.searched.size,total,section,errors});
  try{
   const failed=[...new Set([...node.failed,section.crn])];
   const d=await solve({...request,selections:releaseFailedLocks(request.selections||[],failed),baseline:node.baseline,failed,backgroundPreparation:true});
   if(!isCurrent())return;
   if(!d.snapshot)throw Error('Recovery search returned no snapshot.');
   const branch=trimSnapshot(d.snapshot);branch.meta.warnings=d.warnings||branch.meta.warnings;
   node.branches.set(section.crn,branch);node.searched.add(section.crn);
  }catch(error){if(!isCurrent())return;errors++;onProgress({done:node.searched.size,total,section,errors,error:error.message});}
 }
 if(isCurrent())onProgress({done:node.searched.size,total,errors,complete:true});
}
