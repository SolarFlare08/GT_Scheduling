import {test} from 'node:test';
import assert from 'node:assert/strict';
import {solve} from '../lib/advanced-optimizer.mjs';
import {packSearchResult,unpackSearchPage,recoverySnapshot,trimSnapshot,prepareRecoveryNode,prepareFailureBranches} from '../public/search-pages.js';
const json=value=>JSON.parse(JSON.stringify(value));
test('background searches find failure recoveries beyond the initial pool and reuse completed branches',async()=>{
 const catalog=['A','B'].map((id,i)=>({id,sections:[0,1].map(j=>({crn:id+j,code:String(j),campus:'Atlanta',credits:3,meetings:[{days:i?'T':'M',start:480+j*60,end:530+j*60}]}))}));
 const input={selections:catalog.map(c=>({id:c.id})),preferences:{solverBackend:'backtracking'}};
 const initial=solve(catalog,input,{allResults:true}),baseline=initial.schedules[0].sections;
 const node=prepareRecoveryNode(packSearchResult({...initial,schedules:initial.schedules.slice(0,1)}),baseline);
 assert.ok([...node.branches.values()].every(branch=>branch.schedules.length===0));
 const calls=[],progress=[];
 const search=async request=>{calls.push(request);const result=solve(catalog,request,{allResults:true});return {...result,snapshot:packSearchResult(result)};};
 await prepareFailureBranches(node,input,search,{onProgress:p=>progress.push(p)});
 assert.equal(calls.length,2);assert.equal(node.searched.size,2);
 for(const request of calls){assert.equal(request.backgroundPreparation,true);assert.deepEqual(request.baseline,baseline);assert.equal(request.failed.length,1);const branch=node.branches.get(request.failed[0]);assert.ok(branch.schedules.length);assert.ok(unpackSearchPage(branch).schedules.every(s=>s.sections.every(s=>s.crn!==request.failed[0])));}
 assert.equal(progress.at(-1).done,2);assert.equal(progress.at(-1).complete,true);
 await prepareFailureBranches(node,input,search);assert.equal(calls.length,2);
 // Changing the displayed schedule stops the old path and discards its result.
 const obsolete=prepareRecoveryNode(packSearchResult(initial),baseline);let current=true,count=0;
 await prepareFailureBranches(obsolete,input,async request=>{count++;current=false;return search(request);},{isCurrent:()=>current});
 assert.equal(count,1);assert.equal(obsolete.searched.size,0);
});
test('compact browser snapshot preserves complete schedules and pages without a server',()=>{
 const catalog=Array.from({length:3},(_,i)=>({id:'C'+i,sections:Array.from({length:5},(_,j)=>({crn:`${i}-${j}`,code:'A',campus:'Atlanta',credits:3,status:'open',meetings:[{days:['M','T','W'][i],start:480+j*60,end:530+j*60,room:'Room '+j}]}))}));
 const preferences={maximizeWeekends:true,distributionWeight:1,packed:50,lunch:{days:['M'],start:660,end:840,duration:45,mode:'preferred'}};
 const result=solve(catalog,{selections:catalog.map(c=>({id:c.id,role:'required'})),preferences},{allResults:true});
 const snapshot=json(packSearchResult(result,preferences));
 assert.equal(snapshot.sections.length,15);assert.ok(snapshot.schedules.length>100);
 assert.ok(JSON.stringify(snapshot).length<JSON.stringify(result).length/2);
 const second=unpackSearchPage(snapshot,50,50);assert.deepEqual(json(second.schedules),json(result.schedules.slice(50,100)));assert.equal(second.offset,50);assert.equal(second.hasMore,true);
 assert.deepEqual(json(unpackSearchPage(snapshot,0,50).schedules),json(result.schedules.slice(0,50)));
 const last=unpackSearchPage(snapshot,Math.floor((snapshot.schedules.length-1)/50)*50,50);assert.equal(last.hasMore,false);
 assert.throws(()=>unpackSearchPage(snapshot,4950,50),/no more/);assert.throws(()=>unpackSearchPage(snapshot,-1),/Invalid/);
});
test('failure branches are capped, independent, and continue through successive failures',()=>{
 const sections=Array.from({length:40},(_,i)=>({course:i<20?'A':'B',crn:String(i),meetings:[]}));
 const schedules=[];for(let a=0;a<20;a++)for(let b=20;b<40;b++)schedules.push({sections:[a,b],score:[0,0,a+b],credits:6});
 const pool={sections,schedules,settings:{},meta:{warnings:[]}};
 const baseline=[sections[0],sections[20]],shown={sections:baseline};
 const node=prepareRecoveryNode(pool,baseline,[],shown);
 assert.equal(node.snapshot.schedules.length,200);assert.equal(node.branches.size,2);
 const branch=node.branches.get('0');assert.equal(branch.schedules.length,200);
 assert.ok(branch.schedules.every(s=>s.sections.every(i=>branch.sections[i].crn!=='0')));
 // A branch includes options outside the root's top 200.
 assert.ok(branch.sections.some(s=>!node.snapshot.sections.some(t=>t.crn===s.crn)));
 const child=prepareRecoveryNode(branch,baseline,['0']);
 const failNext=unpackSearchPage(branch).schedules[0].sections[1].crn;
 const next=child.branches.get(failNext);
 assert.ok(next.schedules.length<=200);
 assert.ok(next.schedules.every(s=>s.sections.every(i=>!['0',failNext].includes(next.sections[i].crn))));
 assert.equal(node.branches.get('0'),branch);assert.equal(pool.schedules.length,400);
 assert.equal(trimSnapshot(pool,1).sections.length,2);
});
test('preloaded recovery agrees with a full recovery search and retains its original pool',()=>{
 const catalog=['A','B'].map((id,i)=>({id,sections:[0,1,2].map(j=>({crn:id+j,code:String(j),campus:'Atlanta',credits:3,status:'open',meetings:[{days:i?'T':'M',start:480+j*60,end:530+j*60}]}))}));
 const input={selections:catalog.map(c=>({id:c.id,role:'required'}))};
 const result=solve(catalog,input,{allResults:true}),pool=packSearchResult(result);
 const baseline=result.schedules[2].sections,failed=[baseline[0].crn];
 const fast=recoverySnapshot(pool,baseline,failed);
 const fresh=solve(catalog,{...input,baseline,failed},{allResults:true});
 assert.deepEqual(fast.schedules.map(s=>s.score),fresh.schedules.map(s=>s.score));
 assert.deepEqual(new Set(unpackSearchPage(fast).schedules.map(s=>s.sections.map(s=>s.crn).sort().join(','))),new Set(fresh.schedules.map(s=>s.sections.map(s=>s.crn).sort().join(','))));
 assert.equal(fast.meta.optimal,false);assert.equal(fast.meta.feasibleCountIsExact,false);
 assert.equal(pool.schedules.length,result.schedules.length);
 assert.equal(recoverySnapshot(pool,baseline,catalog.flatMap(c=>c.sections.map(s=>s.crn))).schedules.length,0);
});
