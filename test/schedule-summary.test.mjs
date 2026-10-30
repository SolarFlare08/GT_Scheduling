import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveProfessorRating} from '../public/schedule-summary.js';
import {validateState,importState} from '../public/data-model.js';
test('manual professor ratings update normalized identities, retain metadata, and round-trip through backups',()=>{
 const original=[{id:'gt123',name:'Smith, Jane',notes:'Verified profile',rating:4},{id:'other',name:'Other Professor',rating:3}];
 const records=saveProfessorRating(original,'Jane Smith (P)','4.5','2.1');
 assert.equal(records.length,2);assert.equal(original[0].rating,4);
 const saved=records.find(p=>p.id==='gt123');assert.equal(saved.rating,4.5);assert.equal(saved.difficulty,2.1);assert.equal(saved.notes,'Verified profile');
 const backup=validateState(JSON.parse(JSON.stringify({schemaVersion:'1.0',professors:records})));
 assert.deepEqual(importState({schemaVersion:'1.0'},backup).professors,records);
 assert.equal(saveProfessorRating(records,'Jane Smith','','')[1].rating,null);
});
test('manual RMP fields reject out of range and invalid values',()=>{
 for(const value of ['0','5.1','-1','abc','Infinity'])assert.throws(()=>saveProfessorRating([],'Jane Smith',value,'3'),/between 1 and 5/);
 assert.throws(()=>saveProfessorRating([],'Jane Smith','4','6'),/between 1 and 5/);
});
