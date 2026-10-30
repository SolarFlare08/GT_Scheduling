import {test} from 'node:test';import assert from 'node:assert/strict';import {solve} from '../lib/optimizer.mjs';import {campusKey} from '../public/campuses.js';
const s=(crn,campus,component='lecture',code='A')=>({crn,campus,component,code,credits:component==='lecture'?3:0,status:'open',meetings:[{days:'M',start:component==='lecture'?600:700,end:component==='lecture'?650:750}]});
const input={selections:[{id:'TEST 1000',role:'required'}],minCredits:3};
test('dark green courses share the whole weekend day priority and do not override manual preferences',()=>{
 const catalog=[{id:'TEST 1000',sections:[s('1','Atlanta'),s('2','Atlanta')]}];
 const preferences={maximizeWeekends:true,darkGreenCrns:['2']};
 assert.equal(solve(catalog,{...input,preferences}).schedules[0].sections[0].crn,'2');
 assert.equal(solve(catalog,{...input,preferences,selections:[{id:'TEST 1000',role:'required',preferredCrns:['1']}]}).schedules[0].sections[0].crn,'1');
 const plain=solve(catalog,input).schedules[0],green=solve(catalog,{...input,preferences:{darkGreenCrns:['1','2']}}).schedules[0];
 assert.equal(plain.score[5]-green.score[5],1);
});
test('Honors Program sections are excluded by default, including mandatory components',()=>{
 const normal=s('1','Atlanta'),honors={...s('2','Atlanta'),attributes:['Honors Program']};
 const catalog=[{id:'TEST 1000',sections:[normal,honors]}];
 assert.equal(solve(catalog,input).schedules.length,1);
 assert.equal(solve(catalog,{...input,preferences:{includeHonors:true}}).schedules.length,2);
 const bundled=[{id:'TEST 1000',requiredComponents:['lecture','lab'],sections:[normal,{...s('3','Atlanta','lab','A01'),attributes:['Honors Program']}]}];
 assert.equal(solve(bundled,input).status,'infeasible');
 assert.equal(solve(bundled,{...input,preferences:{includeHonors:true}}).schedules.length,1);
});
test('maximize weekends ranks a full Friday off above shorter Monday and Friday hours',()=>{
 const section=(crn,meetings)=>({...s(crn,'Atlanta'),meetings});
 const catalog=[{id:'TEST 1000',sections:[section('free-friday',[{days:'M',start:480,end:540},{days:'R',start:1140,end:1200}]),section('short-days',[{days:'M',start:900,end:960},{days:'F',start:480,end:540}])]}];
 assert.equal(solve(catalog,{...input,preferences:{maximizeWeekends:true}}).schedules[0].sections[0].crn,'free-friday');
});
test('Atlanta default excludes online, foreign and unknown sections',()=>{const c=[{id:'TEST 1000',sections:[s('1','Georgia Tech-Atlanta *'),s('2','Foreign Exchange'),s('3','Online'),s('4',null)]}];assert.equal(campusKey('Georgia Tech-Atlanta *'),'atlanta');assert.equal(solve(c,input).schedules.length,1);assert.equal(solve(c,input).schedules[0].sections[0].crn,'1');assert.equal(solve(c,{...input,preferences:{campuses:['online']}}).schedules[0].sections[0].crn,'3');assert.equal(solve(c,{...input,preferences:{campuses:[]}}).status,'infeasible');});
test('every mandatory bundle component must satisfy the campus filter',()=>{const c=[{id:'TEST 1000',requiredComponents:['lecture','lab'],sections:[s('1','Atlanta'),s('2','Foreign Exchange','lab','A01')]}];assert.equal(solve(c,input).status,'infeasible');assert.equal(solve(c,{...input,preferences:{campuses:['atlanta','foreign exchange']}}).schedules[0].sections.length,2);});
