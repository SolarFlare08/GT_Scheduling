import {test} from 'node:test';
import assert from 'node:assert/strict';
import {travelSummary,walking} from '../lib/travel.mjs';
import {solve} from '../lib/optimizer.mjs';
const m=(start,end,lat,room)=>({start,end,days:'M',room,location:{lat,long:-84.39}});
test('on-campus activities affect walking ranking; off-campus transfers remain unknown',()=>{
 const catalog=[{id:'A',sections:[33.78,33.7701].map((lat,i)=>({crn:String(i),code:String(i),campus:'Atlanta',credits:3,meetings:[m(655,705,lat,'Room '+i)]}))}];
 const event={id:'work',name:'Work',days:'M',start:600,end:650,mode:'required',locationMode:'on-campus',locationName:'Campus office',location:{lat:33.77,long:-84.39}};
 const input={selections:[{id:'A'}],minCredits:3,preferences:{events:[event]}};
 const result=solve(catalog,input);assert.equal(result.schedules[0].sections[0].crn,'1');assert.equal(result.schedules[0].travel.transfers[0].from,'Work');assert.ok(result.schedules[1].travel.shortfall>0);
 const off=travelSummary([result.schedules[0].sections[0]],[{...event,locationMode:'off-campus'}]);assert.equal(off.unknown,1);assert.equal(off.shortfall,0);
 assert.equal(travelSummary([result.schedules[0].sections[0]],[{...event,mode:'disabled'}]).transfers.length,0);
});
test('walking penalizes insufficient double buffer, and missing location is unknown',()=>{const a=m(600,650,33.77,'A'),b=m(655,700,33.774,'B');assert.ok(walking(a,b).minutes>0);const t=travelSummary([{meetings:[a,b]}]);assert.ok(t.shortfall>0);assert.equal(walking(a,{room:'Unknown'}),null);});
test('travel preference outranks gap compression, and pages contain all small-instance results',()=>{const a={crn:'1',campus:'Georgia Tech-Atlanta *',credits:3,status:'open',meetings:[m(600,650,33.77,'A')]};const b={crn:'2',campus:'Georgia Tech-Atlanta *',credits:3,status:'open',meetings:[m(655,700,33.774,'B')]};const c={...b,crn:'3',meetings:[m(680,730,33.774,'B')]};const cs=[{id:'A',sections:[a]},{id:'B',sections:[b,c]}];const input={selections:[{id:'A',role:'required'},{id:'B',role:'required'}],minCredits:6,limit:1};const r=solve(cs,input);assert.equal(r.feasibleCount,2);assert.equal(r.schedules[0].sections[1].crn,'3');assert.equal(solve(cs,{...input,offset:1}).schedules[0].sections[1].crn,'2');});
