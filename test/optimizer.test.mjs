import {test} from 'node:test';
import assert from 'node:assert/strict';
import {solve,overlap} from '../lib/optimizer.mjs';
const section=(crn,start=600,status='open')=>({crn,campus:'Georgia Tech-Atlanta *',credits:3,status,meetings:[{days:'M',start,end:start+50}],unknownTime:false});
const courses=[{id:'A',sections:[section('1'),section('2',700)]},{id:'B',sections:[section('3',600),section('4',800)]}];
const selections=[{id:'A',role:'required'},{id:'B',role:'required'}];
test('nonconflicting required courses and exact minimum-change recovery',()=>{const initial=solve(courses,{selections});assert.equal(initial.schedules[0].score[0],0);assert.equal(initial.optimal,true);const baseline=[courses[0].sections[0],courses[1].sections[1]];const r=solve(courses,{selections,baseline,failed:['1']});assert.equal(r.schedules[0].score[1],1);assert.deepEqual(r.schedules[0].sections.map(s=>s.crn),['2','4']);});
test('a failed section releases its lock while other section locks remain fixed',()=>{
 const selections=[{id:'A',role:'required',lock:'1'},{id:'B',role:'required',lock:'4'}];
 const result=solve(courses,{selections,failed:['1'],minCredits:6});
 assert.equal(result.status,'optimal');assert.deepEqual(result.schedules[0].sections.map(s=>s.crn).sort(),['2','4']);
 assert.equal(selections[0].lock,'1');assert.ok(result.schedules.every(s=>s.sections.some(s=>s.crn==='4')));
});
test('closed sections excluded, minimum credit infeasibility, multiple failures',()=>{assert.equal(solve([{id:'A',sections:[section('1',600,'closed')]}],{selections:[selections[0]],minCredits:3}).status,'infeasible');const r=solve(courses,{selections,failed:['1','2']});assert.equal(r.schedules[0].score[0],1);});
test('date-disjoint meetings and touching boundaries do not overlap',()=>{assert.equal(overlap({days:'M',start:600,end:650},{days:'M',start:650,end:700}),false);assert.equal(overlap({days:'M',start:600,end:650,from:'2027-01-01',to:'2027-02-01'},{days:'M',start:600,end:650,from:'2027-03-01',to:'2027-04-01'}),false);});
test('unknown availability can be included; empty schedules are not solutions',()=>{const c=[{id:'A',sections:[section('1',600,'unknown')]}];assert.equal(solve(c,{selections:[selections[0]],minCredits:3}).schedules.length,1);assert.equal(solve(c,{selections:[]}).status,'infeasible');});
