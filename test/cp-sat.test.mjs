import {test} from 'node:test';
import assert from 'node:assert/strict';
import {solveCpSat} from '../lib/cp-sat.mjs';
import {solve} from '../lib/advanced-optimizer.mjs';
import {spawnSync} from 'node:child_process';
import {solverPython} from '../lib/cp-sat.mjs';
const available=spawnSync(solverPython(),['-c','import ortools'],{windowsHide:true,timeout:20000}).status===0;
const s=(crn,start,days='M',extra={})=>({crn,code:'A',campus:'Atlanta',credits:3,status:'open',meetings:[{days,start,end:start+50,room:crn,location:{lat:33.77+Number(crn)*.0001,long:-84.39}}],...extra});
const catalog=[{id:'A',sections:[s('1',600),s('2',800,'TR')]},{id:'B',sections:[s('3',600),s('4',900,'MWF')]}];
const selections=catalog.map(c=>({id:c.id,role:'required'}));
function signature(schedule){return schedule.sections.map(s=>s.crn).sort().join(',');}
async function equivalent(catalog,input){
 const expected=solve(catalog,input,{allResults:true}),actual=await solveCpSat(catalog,input);
 assert.equal(actual.feasibleCountIsExact,true,JSON.stringify(actual.solverStats));
 assert.equal(actual.status,expected.status);assert.equal(actual.feasibleCount,expected.feasibleCount);
 assert.deepEqual(actual.schedules.map(signature).sort(),expected.schedules.map(signature).sort());
 if(expected.schedules.length)assert.deepEqual(actual.schedules[0].score,expected.schedules[0].score);
 return actual;
}
test('CP-SAT matches complete backtracking results with GPA, recovery, walking and weekend objectives',{skip:!available},async()=>{
 await equivalent(catalog,{selections,baseline:[catalog[0].sections[0]],preferences:{maximizeWeekends:true,darkGreenCrns:['2'],lowGpaCrns:['3'],distributionWeight:1}});
});
test('CP-SAT enforces linked bundles, failed locks, campuses and honors',{skip:!available},async()=>{
 const lecture={id:'A',requiredComponents:['lecture','recitation'],sections:[s('1',600),{...s('2',700),code:'A01',component:'recitation',credits:0}]};
 await equivalent([lecture],{selections:[{id:'A',role:'required'}],minCredits:3});
 await equivalent([lecture],{selections:[{id:'A',lock:'1'}],failed:['1']});
 await equivalent([{id:'A',sections:[s('1',600,'M',{campus:'Online'}),s('2',700,'M',{attributes:['Honors Program']})]}],{selections:[{id:'A'}]});
});
test('CP-SAT supports daily rules, lunch, fixed activities, gap bands and hours balancing',{skip:!available},async()=>{
 await equivalent(catalog,{selections,preferences:{countBundles:true,packed:37,balanceMetric:'hours',distributionWeight:2,gapBands:[{min:30,max:400,penalty:2}],days:{M:{min:{value:2,mode:'preferred'},end:{value:850,mode:'preferred'}}},lunch:{days:['M','T'],start:660,end:900,duration:45,mode:'preferred'},events:[{days:'M',start:590,end:660,mode:'preferred',weight:2,name:'Work'}]}});
 await equivalent(catalog,{selections,preferences:{lunch:{days:['M'],start:600,end:650,duration:30,mode:'required'},events:[{days:'T',start:600,end:700,mode:'required',name:'Work'}]}});
});
test('custom priority changes both solvers and can put weekends ahead of GPA',{skip:!available},async()=>{
 const data=[{id:'A',sections:[s('1',600,'MWF'),s('2',600,'TR')]}];
 const input={selections:[{id:'A',role:'required'}],preferences:{maximizeWeekends:true,darkGreenCrns:['1'],ranking:{weekendDays:{rank:1,weight:1},darkGreen:{rank:2,weight:1}}}};
 const weekend=await equivalent(data,input);assert.equal(weekend.schedules[0].sections[0].crn,'2');
 const gpa=await equivalent(data,{...input,preferences:{...input.preferences,ranking:{darkGreen:{rank:1,weight:1},weekendDays:{rank:2,weight:1}}}});assert.equal(gpa.schedules[0].sections[0].crn,'1');
 const weighted=await equivalent(data,{...input,preferences:{...input.preferences,ranking:{darkGreen:{rank:1,weight:3},weekendDays:{rank:1,weight:1}}}});assert.equal(weighted.schedules[0].sections[0].crn,'1');
});
test('CP-SAT handles date-disjoint overlapping meetings and sections without meetings',{skip:!available},async()=>{
 const a={...s('1',600),meetings:[{days:'M',start:600,end:700,from:'2027-01-01',to:'2027-02-01',room:'A'}]};
 const b={...s('2',600),meetings:[{days:'M',start:600,end:650,from:'2027-03-01',to:'2027-04-01',room:'B'}]};
 await equivalent([{id:'A',sections:[a]},{id:'B',sections:[b]}],{selections,preferences:{maximizeWeekends:true,lunch:{days:['M'],start:600,end:750,duration:80,mode:'preferred'}}});
 await equivalent([{id:'A',sections:[{...a,meetings:[]}]}],{selections:[{id:'A',role:'required'}],preferences:{maximizeWeekends:true}});
});
