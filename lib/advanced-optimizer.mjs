import {travelSummary} from './travel.mjs';
import {campusAllowed} from '../public/campuses.js';
import {evaluate} from './preferences.mjs';
import {bundlesFor,meetingsOverlap,sectionsConflict} from './bundles.mjs';
import {rankedScore,rankingGroups} from '../public/ranking.js';
import {automaticComponents} from '../public/search-shortcuts.js';
export const overlap=meetingsOverlap,conflict=sectionsConflict;
export function prepareProblem(courses,input={}){
 const {selections=[],failed=[],baseline=[],minCredits=0,maxCredits=21,earliest=0,latest=1440,blocked=[]}=input;
 if(selections.length>10||new Set(selections.map(p=>p.id)).size!==selections.length)throw Error('Select at most ten distinct courses.');
 if(!Number.isFinite(minCredits)||!Number.isFinite(maxCredits)||minCredits<0||maxCredits<minCredits||maxCredits>40)throw Error('Invalid credit range.');
 const companionIds=new Set(selections.flatMap(p=>Object.values(p.components||{}).filter(id=>id!==p.id)));
 if(selections.some(p=>companionIds.has(p.id)))throw Error('Map companion courses inside the lecture bundle instead of selecting them independently.');
 const campuses=input.preferences?.campuses??['atlanta'];
 rankingGroups(input.preferences);
 if(!Array.isArray(campuses)||campuses.some(c=>typeof c!=='string'))throw Error('Campuses must be an array of campus identifiers.');
 const rows=selections.map(p=>{const c=courses.find(c=>c.id===p.id);if(!c)throw Error('Unknown course: '+p.id);
  if(!p.requiredComponents&&!c.requiredComponents&&c.sections.some(s=>/studio/i.test(s.type||'')))p=automaticComponents(c,courses,p).selection;
  const options=bundlesFor(c,courses,p,s=>campusAllowed(s,campuses)&&(input.preferences?.includeHonors===true||!(s.attributes||[]).some(a=>/^honors program$/i.test(String(a).trim())))&&!failed.includes(s.crn)&&!(p.excluded||[]).includes(s.crn)&&!['closed','full','unavailable','waitlisted'].includes(input.availability?.[s.crn]?.status||s.status)&&!s.unknownTime&&s.meetings.every(m=>m.start>=earliest&&m.end<=latest&&!blocked.some(b=>overlap(m,b))));return {p,c,options};
 }).sort((a,b)=>a.options.length-b.options.length);
 return rows;
}
export function evaluateSchedule(chosen,bundles,credits,input={}){
 const {baseline=[],selections=[]}=input;
 const missed=selections.filter(p=>!bundles.some(b=>b.course===p.id)).length;
 const preferred=selections.filter(p=>p.role==='preferred'&&bundles.some(b=>b.course===p.id)).length;
 const changed=baseline.filter(s=>!chosen.some(x=>x.crn===s.crn)).length;
 const travel=travelSummary(chosen,input.preferences?.events);let gap=0;for(const d of 'MTWRFSU'){const ms=chosen.flatMap(s=>s.meetings).filter(m=>m.days.includes(d)).sort((a,b)=>a.start-b.start);for(let j=1;j<ms.length;j++)gap+=Math.max(0,ms[j].start-ms[j-1].end);}
 const preferences=evaluate(chosen,input.preferences);if(!preferences.valid)return null;
 const preferredSections=chosen.filter(s=>selections.find(p=>p.id===s.course)?.preferredCrns?.includes(s.crn)).length;
 const darkGreenCourses=bundles.filter(b=>b.crns.some(crn=>(input.preferences?.darkGreenCrns||[]).includes(crn))).length;
 const lowGpaCourses=bundles.filter(b=>b.crns.some(crn=>(input.preferences?.lowGpaCrns||[]).includes(crn))).length;
 const factorValues={requiredCourses:missed,scheduleChanges:changed,preferredCourses:-preferred,preferredSections:-preferredSections,walking:travel.shortfall,lowGpa:lowGpaCourses,weekendDays:-preferences.weekendFreeDays,darkGreen:-darkGreenCourses,weekendHours:preferences.weekendPenalty,schedulePreferences:preferences.penalty-preferences.weekendPenalty,gaps:gap};
 return {sections:chosen,bundles,credits,score:rankedScore(factorValues,input.preferences),travel,preferences,preferredSections,darkGreenCourses,lowGpaCourses,factorValues};
}
export function solve(courses,input={}, {allResults=false}={}){
 const {selections=[],minCredits=0,maxCredits=21}=input;
 const rows=prepareProblem(courses,input);
 const offset=input.offset??0,limit=input.limit??50;
 if(!Number.isInteger(offset)||offset<0||offset>4950||!Number.isInteger(limit)||limit<1||limit>50)throw Error('Invalid result page.');
 let nodes=0,truncated=false,results=[],feasibleCount=0;const deadline=Date.now()+15000;
 const retain=allResults?5000:offset+limit;
 const conflicts=new WeakMap();let cachedPairs=0;
 function incompatible(a,b){let memo=conflicts.get(a);if(memo?.has(b))return memo.get(b);const value=a.sections.some(s=>b.sections.some(t=>s.crn===t.crn||conflict(s,t)));if(cachedPairs<250000){if(!memo){memo=new WeakMap();conflicts.set(a,memo);}memo.set(b,value);cachedPairs++;}return value;}
 const mandatory=p=>!!(p.lock||(p.locks||[]).length||p.lockCourse);
 function visit(i,chosen,credits,missed,preferred,bundles,domains){
  if(truncated)return;if(nodes>=500000||Date.now()>deadline){truncated=true;return;}nodes++;
  if(credits>maxCredits)return;
  let possible=credits;
  for(let j=i;j<rows.length;j++){if(!domains[j].length&&mandatory(rows[j].p))return;possible+=domains[j].reduce((n,b)=>Math.max(n,b.credits),0);}
  if(possible<minCredits)return;
  if(i===rows.length){if(credits<minCredits||!chosen.length)return;
   const result=evaluateSchedule(chosen,bundles,credits,input);if(!result)return;const {score}=result;feasibleCount++;
   if(results.length===retain&&compare(results.at(-1).score,score)<=0)return;
   let lo=0,hi=results.length;while(lo<hi){const mid=(lo+hi)>>1;if(compare(results[mid].score,score)<=0)lo=mid+1;else hi=mid;}results.splice(lo,0,result);if(results.length>retain)results.pop();return;
  }
  const {p}=rows[i];for(const b of domains[i]){if(credits+b.credits>maxCredits)continue;const next=domains.slice();for(let j=i+1;j<rows.length;j++)next[j]=domains[j].filter(other=>!incompatible(b,other));visit(i+1,[...chosen,...b.sections],credits+b.credits,missed,preferred+(p.role==='preferred'?1:0),[...bundles,{course:p.id,crns:b.sections.map(s=>s.crn)}],next);}
  if(!mandatory(p))visit(i+1,chosen,credits,missed+(p.role==='required'?1:0),preferred,bundles,domains);
 }
 visit(0,[],0,0,0,[],rows.map(r=>r.options));
 return {schedules:allResults?results:results.slice(offset,offset+limit),feasibleCount,offset,limit,hasMore:feasibleCount>offset+limit&&offset+limit<5000,nodes,optimal:!truncated,status:!feasibleCount?(truncated?'unknown':'infeasible'):truncated?'search-limit':'optimal',warnings:[...rows.filter(r=>!r.options.length).map(r=>`${r.p.id}: no complete bundle satisfies components, availability, locks and times.`),'Mandatory components share their lecture section group.','Walking estimates and double-walking-time preference remain active.','Limits: 500,000 search nodes, 15 seconds, 5,000 ranked schedules. Seat counts are source dependent.']};
}
function compare(a,b){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;}
