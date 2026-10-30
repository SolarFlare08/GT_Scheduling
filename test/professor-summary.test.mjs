import {test} from 'node:test';import assert from 'node:assert/strict';
import {summarizeProfessors} from '../public/professor-summary.js';
import {solve} from '../lib/optimizer.mjs';
test('summaries group only current professors, skip suppressed records, exclude future terms',()=>{
 const rows=[{instructor:'Johnson, Carl',instructorId:'cj',term:'Fall 2024',gpa:4},{instructor:'Johnson, Carl',instructorId:'cj',term:'Fall 2025',gpa:3},{instructor:'Johnson, Carl',instructorId:'cj',term:'Spring 2026',gpa:null},{instructor:'Johnson, Carl',instructorId:'cj',term:'Fall 2028',gpa:1},{instructor:'Former, Professor',instructorId:'old',term:'Fall 2025',gpa:4}];
 const r=summarizeProfessors(rows,[{code:'A',meetings:[{instructors:['Carl Johnson (P)','New Professor']}]}],'202702');assert.equal(r.length,2);assert.equal(r[0].averageGpa,3.5);assert.equal(r[0].standardDeviation,.5);assert.equal(r[0].recordCount,2);assert.equal(r[0].suppressedCount,1);assert.equal(r[1].averageGpa,null);
});
test('ambiguous full-name identities are not merged',()=>{const rows=['id1','id2'].map(instructorId=>({instructor:'Smith, Alex',instructorId,gpa:4,term:'Fall 2025'}));const [r]=summarizeProfessors(rows,[{code:'A',meetings:[{instructors:['Alex Smith']}]}]);assert.equal(r.ambiguous,true);assert.equal(r.averageGpa,null);});
test('preferred section changes ranking but not recovery or hard constraints',()=>{
 const section=(crn,start)=>({crn,code:crn==='1'?'A':'B',campus:'Georgia Tech-Atlanta *',credits:3,status:'open',meetings:[{days:'M',start,end:start+50}]});
 const c=[{id:'TEST 1000',sections:[section('1',600),section('2',700)]}];const selections=[{id:c[0].id,role:'required',preferredCrns:['2']}];
 const r=solve(c,{selections});assert.equal(r.schedules[0].sections[0].crn,'2');assert.equal(r.schedules[0].preferredSections,1);
 assert.equal(solve(c,{selections,baseline:[c[0].sections[0]]}).schedules[0].sections[0].crn,'1');
 assert.equal(solve(c,{selections,failed:['2']}).schedules[0].sections[0].crn,'1');
});
