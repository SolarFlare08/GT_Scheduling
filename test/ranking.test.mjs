import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rankedScore,rankingGroups} from '../public/ranking.js';
import {validateState,importState} from '../public/data-model.js';
test('priority order is lexicographic, shared priorities combine weights, and required/recovery are protected',()=>{
 const factors={requiredCourses:0,scheduleChanges:0,preferredCourses:0,preferredSections:0,walking:0,lowGpa:0,weekendDays:-2,darkGreen:-1,weekendHours:48,schedulePreferences:2,gaps:100};
 assert.deepEqual(rankedScore(factors),[0,0,0,0,0,0,-3,50,100]);
 const ranking={weekendDays:{rank:1,weight:3},darkGreen:{rank:1,weight:2}};
 assert.equal(rankedScore(factors,{ranking})[2],-8);
 assert.deepEqual(rankedScore({...factors,requiredCourses:1,scheduleChanges:2},{ranking}).slice(0,2),[1,2]);
 const state=validateState({schemaVersion:'1.0',preferences:{ranking,solverBackend:'cp-sat'}});
 assert.deepEqual(importState({schemaVersion:'1.0'},JSON.parse(JSON.stringify(state))).preferences,state.preferences);
});
test('invalid priority imports and weights are rejected',()=>{
 for(const rank of [0,21,1.5,'1'])assert.throws(()=>rankingGroups({ranking:{walking:{rank}}}),/Priorities/);
 for(const weight of [0,101,-1])assert.throws(()=>validateState({schemaVersion:'1.0',preferences:{ranking:{walking:{weight}}}}),/Priorities/);
 assert.throws(()=>validateState({schemaVersion:'1.0',preferences:{solverBackend:'unknown'}}),/backend/);
});
