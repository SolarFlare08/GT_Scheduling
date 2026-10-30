import {mkdir,readFile,writeFile} from 'node:fs/promises';
const pending=new Map();
export async function critique(id){
 if(!/^[A-Z]{2,5} \d{4}[A-Z]?$/.test(id))throw Error('Invalid course ID');
 if(pending.has(id))return pending.get(id);
 const task=(async()=>{await mkdir('data',{recursive:true});const file=`data/critique-${id.replace(' ','-')}.json`;let cached;try{cached=JSON.parse(await readFile(file,'utf8'));}catch{}
 if(cached&&Date.now()-cached.fetchedAt<86400000)return {...cached,cached:true};
 const source='https://c4citk6s9k.execute-api.us-east-1.amazonaws.com/prod/data/course?courseID='+encodeURIComponent(id);
 try{const r=await fetch(source,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Course Critique HTTP '+r.status);const raw=await r.json();if(!Array.isArray(raw.raw))throw Error('Unexpected Course Critique schema');const value={source,fetchedAt:Date.now(),rows:raw.raw.map(r=>({instructorId:r.instructor_id,instructor:r.instructor_name,term:r.Term,gpa:typeof r.GPA==='number'?r.GPA:null,sizeGroup:r.class_size_group}))};await writeFile(file,JSON.stringify(value));return value;}catch(e){if(cached)return {...cached,cached:true,refreshError:e.message};throw e;}})();pending.set(id,task);try{return await task;}finally{pending.delete(id);}
}
