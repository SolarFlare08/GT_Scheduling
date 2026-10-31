import {Worker} from 'node:worker_threads';
import {createHash} from 'node:crypto';

// One background worker serializes CPU work; identical requests share a job.
// Keep two recent searches, including their ranked pages, for five minutes.
let worker,sequence=0;
const jobs=new Map(),pending=new Map(),cache=new Map();
function startWorker(){
 if(worker)return worker;
 const current=new Worker(new URL('./solver-worker.mjs',import.meta.url));worker=current;
 current.on('message',({id,result,error})=>{const job=jobs.get(id);if(!job)return;jobs.delete(id);error?job.reject(Error(error)):job.resolve(result);});
 const fail=error=>{if(worker!==current)return;worker=undefined;for(const job of jobs.values())job.reject(error);jobs.clear();};
 current.on('error',fail);current.on('exit',code=>fail(Error('Schedule worker stopped (code '+code+'). Please retry.')));
 return current;
}
export async function solveAsync(courses,input={}){
 const offset=input.offset??0,limit=input.limit??50;
 if(!Number.isInteger(offset)||offset<0||offset>4950||!Number.isInteger(limit)||limit<1||limit>50)throw Error('Invalid result page.');
 const normalized={...input,offset:0,limit:50};delete normalized.catalog;
 const key=createHash('sha256').update(JSON.stringify([courses,normalized])).digest('hex');
 let entry=cache.get(key),result;
 if(entry&&Date.now()-entry.created<300000){cache.delete(key);cache.set(key,entry);result=entry.result;}
 else{
  cache.delete(key);
  let task=pending.get(key);
  if(!task){
   task=new Promise((resolve,reject)=>{const id=++sequence;jobs.set(id,{resolve,reject});try{startWorker().postMessage({id,courses,input:normalized});}catch(error){jobs.delete(id);reject(error);}}).then(result=>{cache.set(key,{result,created:Date.now()});while(cache.size>2)cache.delete(cache.keys().next().value);return result;}).finally(()=>pending.delete(key));
   pending.set(key,task);
  }
  result=await task;
 }
 return {...result,warnings:[...result.warnings],schedules:result.schedules.slice(offset,offset+limit),offset,limit,hasMore:result.feasibleCount>offset+limit&&offset+limit<5000};
}
export async function closeSolver(){const current=worker;if(current)await current.terminate();cache.clear();}
