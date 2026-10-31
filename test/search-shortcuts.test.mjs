import {test} from 'node:test';
import assert from 'node:assert/strict';
import {courseList,compactCode,shortcutCandidate,automaticComponents} from '../public/search-shortcuts.js';
import {bundlesFor} from '../lib/bundles.mjs';
test('auto-linking finds reverse corequisites and creates complete lecture/recitation bundles',()=>{
 const section=(code,type,credits,start)=>({crn:code,code,type,credits,meetings:[{days:'M',start,end:start+50}]});
 const lecture={id:'CS 1371',sections:[section('A','Lecture',3,600)]},recitation={id:'CS 1371R',corequisites:[{id:lecture.id}],sections:[section('A01','Recitation',0,700)]};
 const catalog=[lecture,recitation];const {selection}=automaticComponents(lecture,catalog,{id:lecture.id});
 assert.deepEqual(selection.requiredComponents,['lecture','recitation']);
 assert.equal(selection.components.recitation,'CS 1371R');
 assert.equal(bundlesFor(lecture,catalog,selection,()=>true)[0].sections.length,2);
});
test('auto-linking includes internal labs, preserves manual choices and reports ambiguous sources',()=>{
 const s=(type)=>({type,credits:0});
 const lecture={id:'TEST 1000',sections:[s('Lecture'),s('Laboratory')]};
 assert.equal(automaticComponents(lecture,[lecture],{id:lecture.id}).selection.components.lab,lecture.id);
 const external=id=>({id,corequisites:[{id:lecture.id}],sections:[s('Recitation')]});
 const catalog=[lecture,external('TEST 1000R'),external('TEST 1001R')];
 const result=automaticComponents(lecture,catalog,{id:lecture.id});
 assert.equal(result.warnings.length,1);assert.equal(result.selection.components.recitation,undefined);
 const manual=automaticComponents(lecture,catalog,{id:lecture.id,requiredComponents:['lecture','recitation'],components:{recitation:'TEST 1001R'}});
 assert.equal(manual.selection.components.recitation,'TEST 1001R');assert.equal(manual.selection.components.lab,undefined);
});
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
