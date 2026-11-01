import {test} from 'node:test';
import assert from 'node:assert/strict';
import {solve} from '../lib/advanced-optimizer.mjs';
import {packSearchResult,unpackSearchPage} from '../public/search-pages.js';
const json=value=>JSON.parse(JSON.stringify(value));
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
