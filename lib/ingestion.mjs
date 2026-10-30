import {mkdir,readFile,writeFile} from 'node:fs/promises';
const base='https://gt-scheduler.github.io/crawler-v2/';
const inflight=new Map();
export async function load(name,refresh=false){
 if(!/^(index|20\d{4})$/.test(name))throw Error('Invalid term');
 if(inflight.has(name))return inflight.get(name);
 const task=(async()=>{await mkdir('data',{recursive:true});let cached;try{cached=JSON.parse(await readFile(`data/${name}.json`,'utf8'));}catch{}
 if(cached&&(!refresh||Date.now()-cached.fetchedAt<60000))return {...cached,cached:true};
 try{const r=await fetch(base+name+'.json',{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Upstream HTTP '+r.status);const raw=await r.json();if(name==='index'?!Array.isArray(raw.terms):(!raw.courses||!raw.caches||raw.version!==3))throw Error('Unsupported upstream schema');const result={raw,fetchedAt:Date.now(),source:base+name+'.json'};await writeFile(`data/${name}.json`,JSON.stringify(result));return {...result,cached:false};}catch(e){if(cached)return {...cached,cached:true,refreshError:e.message};throw e;}})();inflight.set(name,task);try{return await task;}finally{inflight.delete(name);}
}
export function normalize(raw){
 const ca=raw.caches;return Object.entries(raw.courses).map(([id,c])=>({id,title:c[0],description:c[3],prerequisites:c[2],corequisites:c[4],sections:Object.entries(c[1]).map(([code,s])=>{let unknownTime=false;const meetings=s[1].map(m=>{const period=ca.periods[m[0]]||'';const match=period.match(/^(\d{2})(\d{2}) - (\d{2})(\d{2})$/);if(!match||!m[1])unknownTime=true;const dates=(ca.dateRanges[m[5]]||'').split(' - ').map(v=>{const [mm,dd,yy]=v.split('/');return yy?`${yy}-${mm}-${dd}`:null;});return {days:m[1],start:match?+match[1]*60+ +match[2]:0,end:match?+match[3]*60+ +match[4]:0,room:m[2],location:ca.locations?.[m[3]]??null,instructors:m[4],from:dates[0],to:dates[1]};});return {course:id,code,crn:s[0],credits:s[2],type:ca.scheduleTypes[s[3]],campus:ca.campuses[s[4]],attributes:(s[5]||[]).map(i=>ca.attributes?.[i]).filter(Boolean),restrictions:s[8]||[],status:'unknown',capacity:null,seats:null,waitlist:null,unknownTime,meetings};})}));
}
