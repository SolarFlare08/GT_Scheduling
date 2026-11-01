import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scheduleLabel} from '../public/schedule-picker.js';
test('schedule labels use global page numbers and distinguish courses from components',()=>{
 const schedule={credits:19,bundles:Array.from({length:6},(_,i)=>({course:'C'+i})),sections:Array.from({length:8},()=>({course:'C0'}))};
 assert.equal(scheduleLabel(schedule,50,6),'Schedule 51 · 19 credits · 6/6 courses');
 assert.equal(scheduleLabel({...schedule,bundles:schedule.bundles.slice(0,5)},0,6),'Schedule 1 · 19 credits · 5/6 courses');
});
