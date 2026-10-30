import {test} from 'node:test';
import assert from 'node:assert/strict';
import {travelSummary,walking} from '../lib/travel.mjs';
import {solve} from '../lib/optimizer.mjs';
const m=(start,end,lat,room)=>({start,end,days:'M',room,location:{lat,long:-84.39}});
test('walking penalizes insufficient double buffer, and missing location is unknown',()=>{const a=m(600,650,33.77,'A'),b=m(655,700,33.774,'B');assert.ok(walking(a,b).minutes>0);const t=travelSummary([{meetings:[a,b]}]);assert.ok(t.shortfall>0);assert.equal(walking(a,{room:'Unknown'}),null);});
test('travel preference outranks gap compression, and pages contain all small-instance results',()=>{const a={crn:'1',credits:3,status:'open',meetings:[m(600,650,33.77,'A')]};const b={crn:'2',credits:3,status:'open',meetings:[m(655,700,33.774,'B')]};const c={...b,crn:'3',meetings:[m(680,730,33.774,'B')]};const cs=[{id:'A',sections:[a]},{id:'B',sections:[b,c]}];const input={selections:[{id:'A',role:'required'},{id:'B',role:'required'}],minCredits:6,limit:1};const r=solve(cs,input);assert.equal(r.feasibleCount,2);assert.equal(r.schedules[0].sections[1].crn,'3');assert.equal(solve(cs,{...input,offset:1}).schedules[0].sections[1].crn,'2');});
