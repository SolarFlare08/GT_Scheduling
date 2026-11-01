import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {prepareProblem,evaluateSchedule,conflict} from './advanced-optimizer.mjs';
import {rankingGroups} from '../public/ranking.js';

export function solverPython(){
 const local=fileURLToPath(new URL(process.platform==='win32'?'../.venv/Scripts/python.exe':'../.venv/bin/python',import.meta.url));
 return process.env.GT_SOLVER_PYTHON||(existsSync(local)?local:process.platform==='win32'?'python':'python3');
}
export async function solveCpSat(courses,input={}){
 const rows=prepareProblem(courses,input),sections=[];
 const data=rows.map((r,row)=>{const indices=new Map();return {selection:r.p,options:r.options.map(b=>({credits:b.credits,sections:b.sections.map((s,order)=>{const key=s.sourceCourse+':'+s.crn;if(!indices.has(key)){indices.set(key,sections.length);sections.push({...s,row,order});}return indices.get(key);})}))};});
 const conflicts=[];for(let i=0;i<sections.length;i++)for(let j=i+1;j<sections.length;j++)if(sections[i].row!==sections[j].row&&(sections[i].crn===sections[j].crn||conflict(sections[i],sections[j])))conflicts.push([i,j]);
 const payload={rows:data,sections,conflicts,input,groups:rankingGroups(input.preferences)};
 const raw=await runPython(payload);
 const schedules=[];
 for(const choices of raw.choices){const chosen=[],bundles=[];let credits=0;for(let i=0;i<choices.length;i++){if(choices[i]<0)continue;const b=rows[i].options[choices[i]];chosen.push(...b.sections);credits+=b.credits;bundles.push({course:rows[i].p.id,crns:b.sections.map(s=>s.crn)});}const result=evaluateSchedule(chosen,bundles,credits,input);if(!result)throw Error('CP-SAT returned a schedule that failed shared preference validation.');schedules.push(result);}
 schedules.sort((a,b)=>{for(let i=0;i<a.score.length;i++)if(Math.abs(a.score[i]-b.score[i])>1e-8)return a.score[i]-b.score[i];return 0;});
 if(raw.bestOptimal&&raw.optimalScore&&schedules.length&&schedules[0].score.some((v,i)=>Math.abs(v-raw.optimalScore[i])>1e-6))throw Error('CP-SAT objective disagrees with shared schedule scoring. Select Backtracking while this model case is investigated.');
 const complete=raw.complete,optimal=complete||raw.bestOptimal;
 return {schedules,feasibleCount:schedules.length,resultScope:'maximum-course-coverage',feasibleCountIsExact:complete,offset:0,limit:50,hasMore:schedules.length>50,nodes:raw.branches,solverBackend:'cp-sat',optimal,bestOptimal:optimal,alternativesOptimal:complete,status:!schedules.length?(complete?'infeasible':'unknown'):optimal?'optimal':'search-limit',warnings:[...rows.filter(r=>!r.options.length).map(r=>`${r.p.id}: no complete eligible bundle.`),`CP-SAT: ${complete?'all maximal-course-coverage schedules explored':'alternatives prioritize the most selected courses and are ranked among those found; total count is unknown'}.`, 'CP-SAT uses a 15-second search budget and retains up to 5,000 alternatives. GPA data fetching, model construction and process startup take additional time.'],solverStats:raw.stats};
}
function runPython(payload){return new Promise((resolve,reject)=>{
 const child=spawn(solverPython(),[fileURLToPath(new URL('./cp_sat_solver.py',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe']});
 let output='',errors='',settled=false;const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);};
 const timer=setTimeout(()=>{child.kill();finish(Error('CP-SAT process exceeded its startup/model/search timeout. Try fewer sections or use Backtracking in Preferences.'));},60000);
 child.stdout.on('data',chunk=>{output+=chunk;if(output.length>20000000){child.kill();finish(Error('CP-SAT output exceeded its limit.'));}});child.stderr.on('data',chunk=>{errors=(errors+chunk).slice(-4000);});child.stdin.on('error',()=>{});
 child.on('error',error=>{const e=Error('CP-SAT Python is unavailable. Run the solver setup or select Backtracking. '+error.message);e.code='CP_SAT_UNAVAILABLE';finish(e);});
 child.on('close',code=>{if(code!==0){const e=Error('CP-SAT failed: '+(errors||'exit '+code));if(/No module named ['"]ortools/.test(errors))e.code='CP_SAT_UNAVAILABLE';return finish(e);}try{const result=JSON.parse(output);if(result.error)throw Error(result.error);finish(null,result);}catch(error){finish(error);}});
 child.stdin.end(JSON.stringify(payload));
});}
