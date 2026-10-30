import {test} from 'node:test';import assert from 'node:assert/strict';import {evaluate} from '../lib/preferences.mjs';
const sections=[{course:'A',meetings:[{days:'M',start:600,end:660}]}];
test('maximize weekends rewards earlier finishes and later starts without rejecting schedules',()=>{
 const score=(days,start=600,end=660)=>evaluate([{course:'A',meetings:[{days,start,end}]}],{maximizeWeekends:true});
 assert.ok(score('MTR').penalty<score('MTRF').penalty);
 assert.ok(score('TR').penalty<score('MTR').penalty);
 assert.ok(score('MF',660,720).penalty===score('MF',600,660).penalty);
 const plan=(monday,friday)=>evaluate([{course:'A',meetings:[{days:'M',start:monday,end:monday+60},{days:'F',start:friday-60,end:friday}]}],{maximizeWeekends:true});
 assert.ok(plan(660,900).penalty<plan(600,900).penalty);
 assert.ok(plan(600,840).penalty<plan(600,900).penalty);
 assert.ok(score('MTWRFSU').penalty>score('MTWRF').penalty);
 assert.equal(score('MTWRFSU').valid,true);
 assert.equal(evaluate(sections).penalty,0);
 assert.equal(evaluate([],{maximizeWeekends:true}).weekendMinutes,10080);
});
test('required daily limits, soft violations and free-day handling',()=>{assert.equal(evaluate(sections,{days:{M:{min:{value:2,mode:'required'}}}}).valid,false);assert.equal(evaluate(sections,{days:{M:{min:{value:2,mode:'preferred'}}}}).penalty,1);assert.equal(evaluate(sections,{days:{T:{min:{value:2,mode:'required'}}}}).valid,true);assert.equal(evaluate(sections,{days:{T:{min:{value:2,mode:'required',allDays:true}}}}).valid,false);});
test('time, lunch, fixed event and distribution affect scheduling',()=>{assert.equal(evaluate(sections,{days:{M:{start:{value:620,mode:'required'}}}}).valid,false);assert.equal(evaluate(sections,{events:[{name:'Work',days:'M',start:630,end:700,mode:'required'}]}).valid,false);assert.equal(evaluate(sections,{lunch:{days:['M'],start:600,end:660,duration:30,mode:'required'}}).valid,false);assert.ok(evaluate(sections,{distributionWeight:1,packed:100}).penalty>0);});
