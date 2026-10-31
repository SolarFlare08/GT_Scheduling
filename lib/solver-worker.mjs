import {parentPort} from 'node:worker_threads';
import {solve} from './advanced-optimizer.mjs';
parentPort.on('message',({id,courses,input})=>{
 try{parentPort.postMessage({id,result:solve(courses,input,{allResults:true})});}
 catch(error){parentPort.postMessage({id,error:error.message});}
});
