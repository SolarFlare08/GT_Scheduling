import {test} from 'node:test';
import assert from 'node:assert/strict';
import {courseList,compactCode,shortcutCandidate} from '../public/search-shortcuts.js';
test('bulk entry accepts comma, semicolon, newline and space separated full codes',()=>{
 for(const query of ['COE3001, ME2202, MATH2552','COE 3001; ME 2202; MATH 2552','COE3001\nME2202\nMATH2552','COE3001 ME2202 MATH2552'])assert.deepEqual(courseList(query).map(compactCode),['COE3001','ME2202','MATH2552']);
 assert.deepEqual(courseList('CS1371R, CS1371, CS1371R'),['CS1371R','CS1371']);
 assert.deepEqual(courseList('ME2202, not-a-course'),['ME2202','not-a-course']);
 assert.deepEqual(courseList('ME2202,'),['ME2202']);
});
test('single queries and course titles keep normal search and shortcuts',()=>{
 for(const query of ['','MATH 2552','ME','Principles of Accounting','CS1371 and math'])assert.equal(courseList(query),null);
 const courses=[{id:'CS 1371'},{id:'CS 1371R'}];
 assert.equal(shortcutCandidate('cs1371',courses,'Enter').id,'CS 1371');
 assert.equal(shortcutCandidate('cs1371',[courses[1]],'Enter').id,'CS 1371R');
});
