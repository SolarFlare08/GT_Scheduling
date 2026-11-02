import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {solve} from '../lib/advanced-optimizer.mjs';
import {solve as reference} from './fixtures/optimizer-reference.mjs';
import {solveAsync,closeSolver,getSearchPage} from '../lib/solver-service.mjs';
import {Worker} from 'node:worker_threads';
after(closeSolver);
test('foreground and preparation searches keep separate constraints and return valid recovery pools',async()=>{
 const catalog=[{id:'A',sections:[{crn:'1',code:'A',campus:'Atlanta',credits:3,meetings:[{days:'M',start:600,end:650}]},{crn:'2',code:'B',campus:'Atlanta',credits:3,meetings:[{days:'T',start:600,end:650}]}]}];
 const input={selections:[{id:'A'}],preferences:{solverBackend:'backtracking'}};
 const [prepared,normal]=await Promise.all([solveAsync(catalog,{...input,failed:['1'],backgroundPreparation:true}),solveAsync(catalog,input)]);
 assert.ok(prepared.schedules.every(s=>s.sections.every(s=>s.crn!=='1')));
 assert.ok(normal.schedules.some(s=>s.sections.some(s=>s.crn==='1')));
 assert.notEqual(normal.searchId,prepared.searchId);assert.ok(prepared.snapshot.schedules.length);
});
test('missing CP-SAT runtime falls back explicitly without breaking existing schedules',async()=>{
 const worker=new Worker(new URL('../lib/solver-worker.mjs',import.meta.url),{env:{...process.env,GT_SOLVER_PYTHON:'missing-python-for-cp-sat-test'}});
 try{const result=await new Promise((resolve,reject)=>{worker.once('error',reject);worker.once('message',message=>message.error?reject(Error(message.error)):resolve(message.result));worker.postMessage({id:1,courses:[{id:'A',sections:[{crn:'1',code:'A',campus:'Atlanta',credits:3,meetings:[{days:'M',start:600,end:650}]}]}],input:{selections:[{id:'A',role:'required'}]}});});
 assert.equal(result.solverBackend,'backtracking');assert.equal(result.schedules.length,1);assert.ok(result.warnings.some(w=>w.includes('CP-SAT is not installed')));
 }finally{await worker.terminate();}
});
const section=(id,start,days='M')=>({crn:id,code:'A',campus:'Atlanta',credits:3,status:'open',meetings:[{days,start,end:start+50,room:'Test'}]});
test('optimized search preserves complete results, scores, counts, stable ties and pagination',()=>{
 let seed=31337;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let run=0;run<45;run++){
  const catalog=Array.from({length:4},(_,i)=>({id:'C'+i,sections:Array.from({length:3},(_,j)=>section(`${i}-${j}`,480+random(8)*60,['M','TR','WF'][random(3)]))}));
  const selections=catalog.map((c,i)=>({id:c.id,role:i%2?'preferred':'required',...(run%5===0&&i===0?{lock:c.sections[0].crn}:{})}));
  const input={selections,minCredits:run%3*3,maxCredits:9+run%2*3,failed:run%4===0?['1-0']:[],baseline:run%2?catalog.map(c=>c.sections[0]):[],offset:run%3*5,limit:5,preferences:{maximizeWeekends:!!(run%2),darkGreenCrns:['1-1'],lowGpaCrns:['2-2'],distributionWeight:1,gapBands:[{min:30,max:120,penalty:2}]}};
  const expected=reference(catalog,input),actual=solve(catalog,input);
  assert.deepEqual(JSON.parse(JSON.stringify(actual.schedules.map(({factorValues,...s})=>s))),JSON.parse(JSON.stringify(expected.schedules)),`case ${run}`);
  for(const key of ['feasibleCount','hasMore','optimal','status'])assert.equal(actual[key],expected[key],`${run} ${key}`);
 }
});
test('forward checking prunes incompatible locked choices and unreachable minimum credits',()=>{
 const catalog=Array.from({length:5},(_,i)=>({id:'C'+i,sections:Array.from({length:5},(_,j)=>section(`${i}-${j}`,600,['M','T','W','R','M'][i]))}));
 const input={selections:catalog.map(c=>({id:c.id,role:'required',lockCourse:true})),minCredits:15};
 assert.equal(solve(catalog,input).status,'infeasible');
 assert.ok(solve(catalog,input).nodes<reference(catalog,input).nodes);
 const creditInput={selections:catalog.map(c=>({id:c.id})),minCredits:16};
 assert.equal(solve(catalog,creditInput).nodes,1);
});
test('worker pages reuse one ranked search and invalidate on changed constraints',async()=>{
 const catalog=Array.from({length:3},(_,i)=>({id:'C'+i,sections:Array.from({length:5},(_,j)=>section(`${i}-${j}`,480+j*60,['M','T','W'][i]))}));
 const input={selections:catalog.map(c=>({id:c.id,role:'required'})),preferences:{solverBackend:'backtracking'}};
 const expected=reference(catalog,{...input,offset:50,limit:50});
 const [first,page]=await Promise.all([solveAsync(catalog,input),solveAsync(catalog,{...input,offset:50})]);
 assert.deepEqual(JSON.parse(JSON.stringify(page.schedules.map(({factorValues,...s})=>s))),JSON.parse(JSON.stringify(expected.schedules)));assert.equal(page.nodes,first.nodes);
 const snapshotPage=getSearchPage(first.searchId,50,50);assert.deepEqual(snapshotPage.schedules,page.schedules);assert.equal(snapshotPage.searchId,first.searchId);
 assert.deepEqual(getSearchPage(first.searchId,0,50).schedules,first.schedules);
 assert.throws(()=>getSearchPage('expired-search',0,50),/expired/);
 first.warnings.push('client mutation');assert.ok(!(await solveAsync(catalog,input)).warnings.includes('client mutation'));
 const changed=await solveAsync(catalog,{...input,failed:['0-0']});
 assert.ok(changed.schedules.every(s=>s.sections.every(s=>s.crn!=='0-0')));
 await assert.rejects(solveAsync(catalog,{...input,offset:-1}),/Invalid result page/);
});
