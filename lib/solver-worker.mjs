import {parentPort} from 'node:worker_threads';
import {solve} from './advanced-optimizer.mjs';
import {solveCpSat} from './cp-sat.mjs';
let queue=Promise.resolve();
parentPort.on('message',job=>{queue=queue.then(async()=>{
 const {id,courses,input}=job;
 try{
  const backend=input.preferences?.solverBackend||'cp-sat';
  if(!['cp-sat','backtracking'].includes(backend))throw Error('Unknown solver backend.');
  let result;
  if(backend==='cp-sat')try{result=await solveCpSat(courses,input);}catch(error){
   if(error.code!=='CP_SAT_UNAVAILABLE')throw error;
   result=solve(courses,input,{allResults:true});result.solverBackend='backtracking';result.warnings.push('CP-SAT is not installed; used Backtracking. Run the solver setup to enable CP-SAT.');
  }
  else{result=solve(courses,input,{allResults:true});result.solverBackend='backtracking';}
  parentPort.postMessage({id,result});
 }catch(error){parentPort.postMessage({id,error:error.message});}
});});
