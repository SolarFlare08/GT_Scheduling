import {setupCampuses} from './campuses.js';
import {renderSchedulePicker} from './schedule-picker.js';
import {unpackSearchPage,recoverySnapshot,trimSnapshot,prepareRecoveryNode,prepareFailureBranches} from './search-pages.js';
import {setupScheduleSummary} from './schedule-summary.js';
let summaryView;
import {compactCode,shortcutCandidate,companionType,courseList,automaticComponents} from './search-shortcuts.js';
import {setupActivities,activeActivities,paintActivities,activityCalendarLines} from './activities.js';
import {setupWorkspace,openWorkspaceTab,courseStyle} from './workspace.js';
import {paintSections,gpaColor} from './section-colors.js';
const gpaSummaries=new Map();
const gpaRequests=new Map();
function courseGpa(id,semester=$('term').value){
 const key=semester+':'+id;
 if(!gpaRequests.has(key))gpaRequests.set(key,api('/api/critique?course='+encodeURIComponent(id)).then(d=>{
  const summary=summarizeProfessors(d.rows,courses.find(c=>c.id===id)?.sections||[],semester);
  gpaSummaries.set(key,summary);return {...d,summary};
 }).catch(e=>{gpaRequests.delete(key);throw e;}));
 return gpaRequests.get(key);
}
import {summarizeProfessors} from './professor-summary.js';
import {setupAdvanced} from './advanced.js';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let autoTimer,solveRunning=false,pendingSolve=null,solveRevision=0;
function scheduleAuto(){solveRevision++;searchId=null;clearTimeout(autoTimer);if(!$('auto-schedule')?.checked||!selected.length)return;autoTimer=setTimeout(()=>optimize(false,0),1200);}
let courses=[],selected=[],schedules=[],active=null,baseline=[],failed=new Set(),resultOffset=0,lastRecovery=false,resultHasMore=false,searchId=null;
let searchSnapshot=null,snapshotRevision=0,snapshotSelection='',pageMessage='',pageError=false;
let recoveryPool=null,recoveryPoolKey='';
let recoveryNode=null,recoveryHistory=[],recoveryGeneration=0;
let preparingRecovery=false,queuedRecoveryNode=null;
function recoveryView(){return {node:recoveryNode,snapshot:searchSnapshot,schedules,active,baseline,failed:[...failed],offset:resultOffset,hasMore:resultHasMore,lastRecovery,analysis:$('analysis').textContent};}
function restoreRecovery(view){
 recoveryGeneration++;pendingSolve=null;
 recoveryNode=view.node;searchSnapshot=view.snapshot;schedules=view.schedules;active=view.active;baseline=view.baseline;failed=new Set(view.failed);resultOffset=view.offset;resultHasMore=view.hasMore;lastRecovery=view.lastRecovery;
 pageMessage='Restored the previous schedule and failures.';pageError=false;$('analysis').textContent=view.analysis;status(pageMessage);calendar();improveRecoveryBranch(recoveryNode);
}
function failSection(crn){
 if(failed.has(crn)||solveRunning)return;
 recoveryHistory.push(recoveryView());if(recoveryHistory.length>12)recoveryHistory.shift();
 failed.add(crn);recoveryGeneration++;calendar();optimize(true);
}
function recoveryRequest(){return {...config(),catalog:advanced.catalog(),preferences:{...advanced.state().preferences,events:[...(advanced.state().preferences?.events||[]),...activeActivities(advanced.state(),$('term').value)]},availability:advanced.state().registration?.availability,offset:0,limit:50,failed:[...failed],baseline};}
async function improveRecoveryBranch(node){
 if(!node||!active||recoveryPoolKey!==recoverySettingsKey())return;
 if(preparingRecovery){queuedRecoveryNode=node;return;}
 preparingRecovery=true;
 const generation=++recoveryGeneration,key=recoverySettingsKey();
 try{
  await prepareFailureBranches(node,JSON.parse(JSON.stringify(recoveryRequest())),request=>api('/api/solve',request),{
   isCurrent:()=>generation===recoveryGeneration&&node===recoveryNode&&key===recoverySettingsKey(),
   onProgress:({done,total,section,errors,complete})=>{$('recovery-ready').textContent=complete?`Recovery preparation: ${done}/${total} section failures searched.${errors?' Some searches failed; preloaded options remain available.':''}`:`Preparing recoveries ${done}/${total} · ${section.course} ${section.code}… You can keep using the calendar.`;}
  });
 }catch(error){if(generation===recoveryGeneration)$('recovery-ready').textContent='Using prepared options. Further preparation failed: '+error.message;}
 finally{preparingRecovery=false;const next=queuedRecoveryNode;queuedRecoveryNode=null;if(next&&next===recoveryNode)improveRecoveryBranch(next);}
}
function recoverySettingsKey(){return JSON.stringify([config(),advanced.catalog(),advanced.state().preferences,advanced.state().registration?.availability,activeActivities(advanced.state(),$('term').value)]);}
function quickRecovery(){
 if(!recoveryPool||!baseline.length||!failed.size||recoveryPoolKey!==recoverySettingsKey())return false;
 const branch=recoveryNode?.branches.get([...failed].at(-1));
 const snapshot=branch||trimSnapshot(recoverySnapshot(recoveryNode?.snapshot||recoveryPool,baseline,[...failed]));
 if(!snapshot.schedules.length&&snapshot.meta.status!=='infeasible')return false;
 const d=unpackSearchPage(snapshot);
 searchSnapshot=snapshot;searchId=null;lastRecovery=true;resultOffset=0;resultHasMore=d.hasMore;schedules=d.schedules;active=schedules[0];
 pageError=false;pageMessage=snapshot.meta.status==='infeasible'?'No recovery satisfies the current restrictions for these failures. Go back or change your restrictions.':recoveryNode?.searched.has([...failed].at(-1))?'Recovery loaded from its prepared search.':'Quick recovery from preloaded schedules while failure searches prepare.';
 recoveryNode=prepareRecoveryNode(snapshot,baseline,[...failed],active);
 $('analysis').textContent=resultOverview(d);status(pageMessage);calendar();improveRecoveryBranch(recoveryNode);return true;
}
const selectionKey=()=>JSON.stringify(selected.map(p=>[p.id,p.components,p.requiredComponents]));
const time=v=>v.split(':').reduce((h,m)=>+h*60+ +m),clock=v=>`${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`;
function calendar(){
 renderCalendar();
 if(typeof activities!=='undefined')activities.render();
 paintActivities($('calendar'),activeActivities(advanced.state(),$('term').value),event=>activities.edit(event.id));
 summaryView?.render();
 const shown=active,term=$('term').value;
 if(shown)Promise.allSettled([...new Set(shown.sections.map(s=>s.course))].map(id=>courseGpa(id,term))).then(()=>{if(active===shown&&$('term').value===term)summaryView?.render();});
}
function selectSchedule(s){active=s;recoveryGeneration++;if(!lastRecovery){baseline=s.sections;failed.clear();recoveryHistory=[];}if(searchSnapshot)recoveryNode=prepareRecoveryNode(searchSnapshot,baseline,[...failed],active);calendar();improveRecoveryBranch(recoveryNode);}
function renderPicker(){if($('undo-failure'))$('undo-failure').disabled=!recoveryHistory.length||solveRunning;renderSchedulePicker($('alternatives'),{schedules,active,offset:resultOffset,hasMore:resultHasMore,busy:solveRunning,totalSelected:selected.length,message:pageMessage,error:pageError,onSelect:selectSchedule,onPage:changePage});}
function changePage(offset){
 if(solveRunning)return;
 if(!searchSnapshot)return optimize(lastRecovery,offset,true);
 try{
  const d=unpackSearchPage(searchSnapshot,offset,50);
  resultOffset=d.offset;resultHasMore=d.hasMore;schedules=d.schedules;active=schedules[0]||null;
  if(!lastRecovery){baseline=active?.sections||[];failed.clear();}
  recoveryGeneration++;if(!lastRecovery)recoveryHistory=[];recoveryNode=prepareRecoveryNode(searchSnapshot,baseline,[...failed],active);
  pageError=false;pageMessage=snapshotRevision===solveRevision?'':'Viewing the saved search. Find schedules applies your latest changes.';
  $('analysis').textContent=resultOverview(d);calendar();improveRecoveryBranch(recoveryNode);
 }catch(error){pageMessage=error.message;pageError=true;renderPicker();}
}
async function api(path,body){const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}
function status(message,error=false){$('status').textContent=message;$('status').className=error?'error':'';}
function resultOverview(d){
 const name=d.solverBackend==='cp-sat'?'CP-SAT':'Backtracking';
 const count=d.feasibleCountIsExact===false?`${d.feasibleCount.toLocaleString()} schedules found; total unknown`:`${d.feasibleCount.toLocaleString()} combinations found`;
 const shown=d.schedules.length?`${d.offset+1}–${d.offset+d.schedules.length}`:'none';
 return `${name} · ${count}. Showing ${shown}. ${d.nodes.toLocaleString()} search branches. ${active?`${active.credits} credits; ${active.score[0]} selected courses omitted; ${active.score[1]} original sections changed; ${active.preferredSections??0} preferred sections selected.`:'No schedule found under these restrictions.'} ${d.warnings.join(' ')}`;
}
function resultStatus(d){
 if(d.status==='infeasible')return 'No feasible schedule under these restrictions.';
 if(d.solverBackend==='cp-sat')return d.optimal?(d.alternativesOptimal?'CP-SAT search complete; all maximum-coverage schedules ranked.':'CP-SAT proved the best schedule optimal; alternatives are ranked among those found.'):'CP-SAT time limit reached; showing the best schedules found, without an optimality proof.';
 return d.optimal?'Search complete; objective proved optimal for the implemented model.':'Search limit reached; optimality is unproven.';
}
async function load(refresh=false){recoveryPool=null;recoveryPoolKey='';recoveryNode=null;recoveryHistory=[];recoveryGeneration++;solveRevision++;status('Loading published course snapshot…');try{const d=await api('/api/courses?term='+$('term').value+(refresh?'&refresh=1':''));courses=advanced.catalog()||d.courses;schedules=[];active=null;baseline=[];failed.clear();draw();status(`${courses.length} courses · Published snapshot ${d.cached?'from cache':'retrieved'} · Source updated ${d.updatedAt||'unknown'}${d.refreshError?' · Refresh failed: '+d.refreshError:''}`);$('provenance').textContent=`Source: ${d.source} | Retrieved: ${new Date(d.fetchedAt).toLocaleString()} | Source update: ${d.updatedAt||'unknown'}`;}catch(e){status(e.message,true);}}
function draw(){selected=selected.map(p=>{const c=courses.find(c=>c.id===p.id);return c?automaticComponents(c,courses,p).selection:p;});if(searchSnapshot&&snapshotSelection!==selectionKey()){searchSnapshot=null;searchId=null;schedules=[];active=null;baseline=[];failed.clear();pageMessage='';}for(const id of new Set(selected.flatMap(p=>[p.id,...Object.values(p.components||{})])))courseGpa(id).catch(()=>{});campusFilter.render();scheduleAuto();search();$('selected').innerHTML=selected.map(p=>`<div class="course selected-course" style="${courseStyle(p.id,selected.map(p=>p.id))}"><strong>${esc(p.id)}</strong>${(p.componentWarnings||[]).map(w=>`<p>${esc(w)}</p>`).join('')}<button data-remove="${esc(p.id)}">Remove</button><select data-role="${esc(p.id)}" aria-label="Course priority">${['required','preferred','optional','backup'].map(r=>`<option ${p.role===r?'selected':''}>${r}</option>`).join('')}</select><button data-detail="${esc(p.id)}">Compare / lock / exclude sections</button>${p.components?`<p>Linked: ${esc(Object.entries(p.components).filter(([t])=>t!=='lecture').map(([t,id])=>id+' ('+t+')').join(', '))}</p>`:''}${p.lock?`<p>Locked CRN ${esc(p.lock)}</p>`:''}</div>`).join('')||'<p>No courses selected.</p>';calendar();}
function addCourse(id,batch=false){
 const c=courses.find(c=>c.id===id);if(!c)return;
 if(selected.some(p=>p.id===id||Object.values(p.components||{}).includes(id)))return;
 const type=companionType(c);
 if(type){const parent=selected.find(p=>compactCode(id)===compactCode(p.id)+(type==='recitation'?'R':'L'));
  if(!parent){if(!batch)status('Add the associated lecture first, then map this component in Data & components.',true);return false;}
  parent.requiredComponents=[...new Set([...(parent.requiredComponents||['lecture']),type])];parent.components={...parent.components,[type]:id};
  if(!batch)status(id+' linked to '+parent.id+' as a required '+type+'.');
 }else if(!selected.some(p=>p.id===id)){if(selected.length>=10){if(!batch)status('Select at most ten courses.',true);return false;}const linked=automaticComponents(c,courses,{id,role:'required',excluded:[]});selected.push(linked.selection);if(!batch)status(linked.warnings.join(' ')||'Added '+id+' with its identified linked components.');}
 else return;
 if(!batch)draw();return true;
}
function addCourseList(){
 const entries=courseList($('search').value);if(!entries)return;
 const matches=[],unresolved=[],added=[],skipped=[];
 for(const entry of entries){const course=courses.find(c=>compactCode(c.id)===compactCode(entry));if(course)matches.push(course);else unresolved.push(entry);}
 matches.sort((a,b)=>Number(!!companionType(a))-Number(!!companionType(b)));
 for(const c of new Map(matches.map(c=>[c.id,c])).values()){
  const result=addCourse(c.id,true);if(result)added.push(c.id);else if(result===false)unresolved.push(c.id);else skipped.push(c.id);
 }
 $('search').value=unresolved.join(', ');draw();
 status([added.length?'Added: '+added.join(', ')+'.':'No new courses added.',skipped.length?'Already selected: '+skipped.join(', ')+'.':'',unresolved.length?'Not added: '+unresolved.join(', ')+'. Check codes, add the associated lecture for components, or check the ten-course limit.':''].filter(Boolean).join(' '),unresolved.length>0);
}
function search(){const list=courseList($('search').value);const button=$('add-course-list');if(button)button.hidden=!list;if(list){$('results').innerHTML='<p>Press Enter to add these course codes:</p>'+list.map(code=>{const c=courses.find(c=>compactCode(c.id)===compactCode(code));return '<p>'+esc(code)+' · '+(c?esc(c.title):'Not found in this term')+'</p>';}).join('');return;}const q=$('search').value.trim().toLowerCase();if(!q){$('results').replaceChildren();return;}$('results').innerHTML=courses.filter(c=>!selected.some(p=>p.id===c.id||Object.values(p.components||{}).includes(c.id))&&((c.id+' '+c.title).toLowerCase().includes(q)||c.id.toLowerCase().replace(/\s+/g,'').includes(q.replace(/\s+/g,'')))).slice(0,15).map(c=>`<div class="course"><strong>${esc(c.id)}</strong><p>${esc(c.title)}</p><button data-add="${esc(c.id)}">+ Add course</button><button data-detail="${esc(c.id)}">Compare</button></div>`).join('');}
function detail(id){openWorkspaceTab('details');const c=courses.find(c=>c.id===id);if(!c)return;const p=selected.find(p=>p.id===id);$('details').innerHTML=`<h3>${esc(c.id)} · ${esc(c.title)}</h3><p>${esc(c.description)}</p><p>Prerequisite tree: ${esc(JSON.stringify(c.prerequisites))}. Verify grades and registration restrictions in OSCAR.</p><p>Course Critique GPA: load the historical records below. RMP rating/difficulty: automated access requires permission. <a href="https://critique.gatech.edu/" target="_blank" rel="noreferrer">Look up Course Critique ↗</a></p><button data-gpa="${esc(id)}">Load Course Critique GPA records</button><div id="gpa-records"></div><div class="tablewrap"><table><thead><tr><th>Section</th><th>Instructor / meetings</th><th>Campus / credits</th><th>Seats / waitlist</th><th>Plan</th></tr></thead><tbody>${c.sections.map(s=>`<tr data-section-crn="${esc(s.crn)}"><td>${esc(s.code)}<br>${esc(s.crn)}<br>${esc(s.type)}</td><td>${s.meetings.map(m=>`${esc(m.instructors.join(', '))}<br>${m.instructors.map(n=>`<a target="_blank" rel="noreferrer" href="https://www.ratemyprofessors.com/search/professors?q=${encodeURIComponent(n.replace(/ \(P\)/g,''))}">RMP lookup ↗</a>`).join(' · ')}<br>${esc(m.days)} ${m.start?clock(m.start)+'–'+clock(m.end):'TBA'}<br>${esc(m.room)}`).join('<br>')}</td><td>${esc(s.campus)}<br>${s.credits}</td><td>Unknown<br>Unknown</td><td>${p?`<button data-lock="${esc(s.crn)}" data-course="${esc(id)}">${p.lock===s.crn?'Unlock':'Lock'}</button><button data-prefer="${esc(s.crn)}" data-course="${esc(id)}">${p.preferredCrns?.includes(s.crn)?'Unprefer':'Prefer'}</button><button data-exclude="${esc(s.crn)}" data-course="${esc(id)}">${p.excluded.includes(s.crn)?'Include':'Exclude'}</button>`:'Add course first'}</td></tr>`).join('')}</tbody></table></div>`;paintSections($('details'),c,gpaSummaries.get($('term').value+':'+id)||[]);renderGpa(id);}
function config(){const blocked=$('blocked').value.trim().split(';').filter(x=>x.trim()).map(x=>{const m=x.trim().match(/^([MTWRFSU]+) (\d\d:\d\d)-(\d\d:\d\d)$/);if(!m||time(m[2])>=time(m[3]))throw Error('Use unavailable-time format MWF 12:00-13:00');return {days:m[1],start:time(m[2]),end:time(m[3])};});return {term:$('term').value,selections:selected,minCredits:+$('min').value,maxCredits:+$('max').value,earliest:time($('early').value),latest:time($('late').value),blocked,allowUnknown:$('unknown').checked};}
async function optimize(recovery=false,offset=0,paging=false,refine=false){
 if(recovery&&!paging&&!refine&&!solveRunning){try{if(quickRecovery())return;}catch(error){status(error.message,true);return;}}
 if(solveRunning){if(!paging)pendingSolve={recovery,offset,paging,refine};return;}
 recoveryGeneration++;queuedRecoveryNode=null;
 solveRunning=true;clearTimeout(autoTimer);renderPicker();const revision=solveRevision,generation=recoveryGeneration;
 try{
  if(!selected.length)throw Error('Add at least one course.');
  if(paging&&!searchId)throw Error('Settings changed. Click Find schedules before changing pages.');
  pageError=false;pageMessage=paging?'Loading schedule page…':'Searching…';renderPicker();
  status(paging?'Loading schedule page…':recovery?'Searching recovery options…':'Searching course combinations…');
  const request=paging?{searchId,offset,limit:50}:{...config(),catalog:advanced.catalog(),preferences:{...advanced.state().preferences,events:[...(advanced.state().preferences?.events||[]),...activeActivities(advanced.state(),$('term').value)]},availability:advanced.state().registration?.availability,offset,limit:50,failed:recovery?[...failed]:[],baseline:recovery?baseline:[]};
  const poolKey=!paging&&!recovery?recoverySettingsKey():null;
  const d=await api('/api/solve',request);if(revision!==solveRevision||(recovery&&generation!==recoveryGeneration))return;
  resultOffset=d.offset;resultHasMore=d.hasMore;searchId=d.searchId;lastRecovery=recovery;schedules=d.schedules;active=schedules[0]||null;
  if(!paging){searchSnapshot=d.snapshot||null;snapshotRevision=revision;snapshotSelection=selectionKey();if(searchSnapshot)searchSnapshot.meta.warnings=d.warnings;}
  if(!paging&&!recovery){recoveryPool=searchSnapshot;recoveryPoolKey=poolKey;}
  pageMessage='';pageError=false;
  if(!paging&&!recovery){baseline=active?.sections||[];failed.clear();}
  if(!paging&&searchSnapshot){
   recoveryNode=prepareRecoveryNode(searchSnapshot,baseline,[...failed],active);
   searchSnapshot=recoveryNode.snapshot;schedules=unpackSearchPage(searchSnapshot).schedules;resultOffset=0;resultHasMore=searchSnapshot.schedules.length>50;
   if(!recovery){recoveryPool=searchSnapshot;recoveryHistory=[];recoveryGeneration++;}
   $('recovery-ready').textContent='Preparing a recovery search for each section in this schedule…';
  }
  $('analysis').textContent=resultOverview({...d,schedules,offset:resultOffset})+' Keeping the top 200 schedules per branch; remaining candidates were used to prepare section-failure branches and discarded.';status(resultStatus(d));calendar();
 }catch(e){if(revision===solveRevision){pageMessage=e.message;pageError=true;status(e.message,true);}}
 finally{solveRunning=false;renderPicker();if(pendingSolve){const next=pendingSolve;pendingSolve=null;optimize(next.recovery,next.offset,next.paging,next.refine);}else if(revision===solveRevision)improveRecoveryBranch(recoveryNode);}
}
function renderCalendar(){renderPicker();if(!active){$('failures').innerHTML='';$('travel').innerHTML='';}$('calendar').innerHTML='<div class="hours">'+Array.from({length:16},(_,i)=>`<div>${i+7}:00</div>`).join('')+'</div>'+[...'MTWRFSU'].map((d,i)=>`<div class="day"><b>${['MON','TUE','WED','THU','FRI','SAT','SUN'][i]}</b>${(active?.sections||[]).flatMap(s=>s.meetings.filter(m=>m.days.includes(d)).map(m=>`<button class="event ${failed.has(s.crn)?'failed':''}" data-fail="${esc(s.crn)}" style="${courseStyle(s.course,selected.map(p=>p.id))};top:${25+(m.start-420)/2}px;height:${Math.max(22,(m.end-m.start)/2)}px" title="Simulate loss of ${esc(s.course)} ${esc(s.code)}">${esc(s.course)} · ${esc(s.code)}<br>${clock(m.start)}–${clock(m.end)}</button>`)).join('')}</div>`).join('');$('travel').innerHTML=active?.travel?`<h3>Travel between consecutive classes</h3><p>Estimated walking distance and time, not routed directions. ${active.travel.unknown} transfers have unknown locations.</p><div class="tablewrap"><table><tr><th>Day / transition</th><th>Distance</th><th>Walk / gap</th><th>Buffer</th></tr>${active.travel.transfers.map(t=>`<tr><td>${esc(t.day)}: ${esc(t.from)} → ${esc(t.to)}<br>${esc(t.fromRoom)} → ${esc(t.toRoom)}</td><td>${t.unknown?'Unknown':t.meters+' m'}</td><td>${t.unknown?'Unknown':t.minutes+' min'} / ${t.gap} min</td><td>${t.unknown?'Unknown':t.shortfall>0?'Below 2× walk time':'Meets 2× walk time'}</td></tr>`).join('')}</table></div>`:'';$('failures').textContent=failed.size?'Unavailable sections: '+[...failed].map(crn=>{const section=recoveryHistory.flatMap(v=>v.active?.sections||[]).find(s=>s.crn===crn);return section?section.course+' '+section.code+' ('+crn+')':crn;}).join(' · '):'No failed sections.';if($('undo-failure'))$('undo-failure').disabled=!recoveryHistory.length||solveRunning;}
document.addEventListener('click',e=>{const d=e.target.dataset;if(d.add)addCourse(d.add);if(d.remove){selected=selected.filter(p=>p.id!==d.remove);draw();}if(d.detail)detail(d.detail);if(d.lock){const p=selected.find(p=>p.id===d.course);p.lock=p.lock===d.lock?null:d.lock;detail(d.course);draw();}if(d.exclude){const p=selected.find(p=>p.id===d.course);p.excluded=p.excluded.includes(d.exclude)?p.excluded.filter(x=>x!==d.exclude):[...p.excluded,d.exclude];detail(d.course);}if(d.prefer){const p=selected.find(p=>p.id===d.course);p.preferredCrns=p.preferredCrns||[];p.preferredCrns=p.preferredCrns.includes(d.prefer)?p.preferredCrns.filter(c=>c!==d.prefer):[...p.preferredCrns,d.prefer];localStorage.setItem('gt-plan',JSON.stringify(config()));detail(d.course);status('Section preference saved. Click Find schedules to apply.');}if(d.option!==undefined){active=schedules[+d.option];calendar();}if(d.fail)failSection(d.fail);});
document.addEventListener('change',e=>{const d=e.target.dataset;if(d.role)selected.find(p=>p.id===d.role).role=e.target.value;if(d.failure){e.target.checked?failed.add(d.failure):failed.delete(d.failure);}});
$('search').oninput=search;
$('search').onkeydown=e=>{if(e.isComposing||e.repeat||e.ctrlKey||e.metaKey||e.altKey||!['Enter',' '].includes(e.key))return;if(courseList($('search').value)){if(e.key==='Enter'){e.preventDefault();addCourseList();}return;}const results=[...$('results').querySelectorAll('[data-add]')].map(b=>courses.find(c=>c.id===b.dataset.add)).filter(Boolean);const candidate=shortcutCandidate($('search').value,results,e.key);if(candidate){e.preventDefault();addCourse(candidate.id);}else if(e.key==='Enter'){e.preventDefault();status('Type the full course code or narrow the search to one result.');}};
$('term').onchange=()=>{selected=[];load();};$('refresh').onclick=()=>load(true);$('solve').onclick=()=>optimize();$('recover').onclick=()=>optimize(true);$('reset').onclick=()=>{if(recoveryHistory.length){const root=recoveryHistory[0];recoveryHistory=[];restoreRecovery(root);}else{failed.clear();calendar();}};
const refineRecovery=document.createElement('button');refineRecovery.id='refine-recovery';refineRecovery.textContent='Refine recovery';refineRecovery.title='Run a full search beyond the preloaded alternatives';refineRecovery.onclick=()=>optimize(true,0,false,true);$('recover').after(refineRecovery);
const undoFailure=document.createElement('button');undoFailure.id='undo-failure';undoFailure.textContent='Go back';undoFailure.disabled=true;undoFailure.onclick=()=>{const previous=recoveryHistory.pop();if(previous)restoreRecovery(previous);};$('recover').before(undoFailure);
const recoveryReady=document.createElement('p');recoveryReady.id='recovery-ready';recoveryReady.setAttribute('role','status');$('failures').after(recoveryReady);
$('recover').textContent='Quick minimum-change recovery';
$('calendar').parentElement.querySelector('.hint').textContent='The initial search uses a 15-second search budget. Recovery searches then prepare each section failure in the background, keeping up to 200 schedules per branch. Click a class to follow its failure branch; preparation moves to the schedule now shown. Go back undoes a failure. Locks remain enforced.';
function download(name,text,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save').onclick=()=>{localStorage.setItem('gt-plan',JSON.stringify(config()));status('Plan saved in this browser.');};
async function restore(p){if(!p||!Array.isArray(p.selections)||p.selections.length>10||![...$('term').options].some(o=>o.value===p.term))throw Error('Invalid configuration');$('term').value=p.term;await load();selected=p.selections.filter(p=>courses.some(c=>c.id===p.id)).map(p=>({...p,excluded:Array.isArray(p.excluded)?p.excluded:[]}));$('min').value=p.minCredits;$('max').value=p.maxCredits;$('early').value=clock(p.earliest);$('late').value=clock(p.latest);$('unknown').checked=!!p.allowUnknown;$('blocked').value=(p.blocked||[]).map(b=>`${b.days} ${clock(b.start)}-${clock(b.end)}`).join('; ');draw();}
$('restore').onclick=()=>restore(JSON.parse(localStorage.getItem('gt-plan'))).catch(e=>status(e.message,true));$('share').onclick=()=>download('gt-plan.json',JSON.stringify(config(),null,2));$('import').onchange=async e=>{try{await restore(JSON.parse(await e.target.files[0].text()));}catch(e){status(e.message,true);}};
$('export').onclick=()=>{if(!active&&!activeActivities(advanced.state(),$('term').value).length)return status('Add activities or generate a schedule first.',true);const stamp=d=>d.replaceAll('-','');const escapeICS=s=>String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/[,;]/g,'\\$&');let lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//GT Resilient Scheduler//EN'];for(const s of active?.sections||[])for(const m of s.meetings){if(!m.from||!m.to)continue;for(const d of m.days){const map={M:1,T:2,W:3,R:4,F:5,S:6,U:0},rr={M:'MO',T:'TU',W:'WE',R:'TH',F:'FR',S:'SA',U:'SU'};let date=new Date(m.from+'T12:00:00Z');while(date.getUTCDay()!==map[d])date.setUTCDate(date.getUTCDate()+1);const start=date.toISOString().slice(0,10);lines.push('BEGIN:VEVENT',`UID:${crypto.randomUUID()}@gt-local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;TZID=America/New_York:${stamp(start)}T${clock(m.start).replace(':','')}00`,`DTEND;TZID=America/New_York:${stamp(start)}T${clock(m.end).replace(':','')}00`,`RRULE:FREQ=WEEKLY;BYDAY=${rr[d]};UNTIL=${stamp(m.to)}T235959Z`,`SUMMARY:${escapeICS(s.course+' '+s.code)}`,`LOCATION:${escapeICS(m.room)}`,'END:VEVENT');}}const dates=courses.flatMap(c=>c.sections.flatMap(s=>s.meetings)).filter(m=>m.from&&m.to);const from=dates.map(m=>m.from).sort()[0],to=dates.map(m=>m.to).sort().at(-1);lines.push(...activityCalendarLines(activeActivities(advanced.state(),$('term').value),{from,to}));lines.push('END:VCALENDAR');download('schedule.ics',lines.join('\r\n'),'text/calendar');};
const advanced=setupAdvanced({getCourses:()=>courses,getSchedules:()=>schedules,getPlan:config,applyPlan:restore,download,changed:()=>{courses=advanced.catalog()||courses;draw();}});
setupWorkspace();
const campusFilter=setupCampuses({getCourses:()=>courses,state:advanced.state,save:campuses=>{advanced.setCampuses(campuses);schedules=[];active=null;baseline=[];failed.clear();calendar();status(campuses.length?'Campus selection saved. Find schedules to apply.':'No campuses selected: no sections will be eligible.');}});
const autoLabel=document.createElement('label');autoLabel.className='check';autoLabel.innerHTML='<input type="checkbox" id="auto-schedule"> Automatically find schedules after changes';$('solve').before(autoLabel);$('auto-schedule').checked=localStorage.getItem('gt-auto-schedule')==='true';$('auto-schedule').onchange=()=>{localStorage.setItem('gt-auto-schedule',String($('auto-schedule').checked));if(!$('auto-schedule').checked)pendingSolve=null;scheduleAuto();};
const shortcutHelp=document.querySelector('.search-help');shortcutHelp.textContent='Paste several codes, e.g. COE3001, ME2202, MATH2552, then press Enter or Add listed courses. Spaces within codes are optional. Single-course Space/Enter shortcuts still work.';
const batchButton=document.createElement('button');batchButton.type='button';batchButton.id='add-course-list';batchButton.textContent='Add listed courses';batchButton.hidden=true;batchButton.onclick=addCourseList;shortcutHelp.after(batchButton);
$('search').placeholder='Search or paste COE3001, ME2202, MATH2552';
$('search').addEventListener('paste',e=>{const pasted=e.clipboardData?.getData('text');if(pasted&&/[\r\n]/.test(pasted)){e.preventDefault();const input=e.currentTarget;input.setRangeText(pasted.replace(/[\r\n]+/g,', '),input.selectionStart,input.selectionEnd,'end');search();}});
document.addEventListener('input',e=>{if(['min','max','early','late','blocked','unknown'].includes(e.target.id))scheduleAuto();});
document.addEventListener('change',e=>{if(e.target.dataset.role)scheduleAuto();});
document.addEventListener('click',e=>{const d=e.target.dataset;if(d.exclude||d.prefer)scheduleAuto();});

const activities=setupActivities({state:advanced.state,save:advanced.setEvents,term:()=>$('term').value,changed:()=>{schedules=[];active=null;calendar();status('Activities updated. Find schedules again to apply the new time blocks.');}});
summaryView=setupScheduleSummary({getSchedule:()=>active,getCourses:()=>courses,getSummaries:id=>gpaSummaries.get($('term').value+':'+id),state:advanced.state,save:advanced.setProfessors});
summaryView.render();
try{const d=await api('/api/terms');$('term').innerHTML=d.terms.slice().reverse().map(t=>`<option value="${esc(t.term)}">${({ '02':'Spring','05':'Summer','08':'Fall'})[t.term.slice(4)]||t.term} ${t.term.slice(0,4)}</option>`).join('');await load();}catch(e){status(e.message,true);}

let courseDetailTab='sections';
function setupCourseDetailNavigation(){
 const root=$('details');if(root.querySelector('.course-detail-tabs'))return;
 const records=$('gpa-records'),load=root.querySelector('[data-gpa]'),table=records.nextElementSibling,note=load.previousElementSibling;
 const nav=document.createElement('div');nav.className='course-detail-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Course comparison');records.before(nav);
 const professors=document.createElement('div');professors.id='course-professors';professors.className='course-detail-panel';
 const sections=document.createElement('div');sections.id='course-sections';sections.className='course-detail-panel';
 const professorHeading=document.createElement('h4');professorHeading.textContent='Current professors & GPA';
 const sectionHeading=document.createElement('h4');sectionHeading.textContent='Sections · '+table.querySelectorAll('[data-section-crn]').length+' options';
 const help=document.createElement('p');help.className='hint';help.textContent='Compare meeting times and use Lock, Prefer or Exclude to choose sections.';
 professors.append(professorHeading,note,load,records);sections.append(sectionHeading,help,table);nav.after(professors,sections);
 for(const [key,label,panel] of [['professors','Professors',professors],['sections','Sections',sections]]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.id='course-detail-tab-'+key;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);
  button.onclick=()=>{courseDetailTab=key;for(const tab of nav.children){const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;$(tab.getAttribute('aria-controls')).hidden=!selected;}};nav.append(button);
 }
 nav.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...nav.children],current=tabs.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?1:1-current;tabs[next].click();tabs[next].focus();});
 nav.querySelector('#course-detail-tab-'+courseDetailTab).click();
}
async function renderGpa(id){
 setupCourseDetailNavigation();
 const target=$('gpa-records'),semester=$('term').value;if(!target)return;
 const sections=courses.find(c=>c.id===id)?.sections||[];
 target.textContent='Loading Course Critique…';
 try{const d=await courseGpa(id,semester);if(!target.isConnected)return;
 const summary=d.summary,fmt=v=>v===null?'Unknown':v.toFixed(2);
 gpaSummaries.set(semester+':'+id,summary);paintSections($('details'),{sections},summary);
 target.innerHTML='<p class="gpa-legend">Section colors use recent GPA: red &lt;3.0 · yellow 3.0–3.19 · light green 3.2–3.49 · green 3.5–3.79 · dark green 3.8–4.0 · white unknown. Co-taught sections use the mean only when all instructors have data. Color describes historical grades, not teaching quality.</p><p>Only instructors with sections of this course in the selected semester. Exact normalized full-name matches only. GPA is the unweighted average of available historical section records, not a student-weighted average or a teaching-quality rating. Recent GPA covers the latest three reported terms through the selected semester. SD measures variation across section GPAs; fewer records mean less evidence.</p>'+
 '<p>Retrieved '+esc(new Date(d.fetchedAt).toLocaleString())+(d.refreshError?' · Cached after error: '+esc(d.refreshError):'')+'</p>'+
 '<div class="tablewrap"><table><tr><th>Current professor / sections</th><th>Average GPA</th><th>Recent GPA</th><th>GPA SD</th><th>Evidence</th></tr>'+summary.map(r=>{const color=gpaColor(r.recentGpa);return '<tr style="background-color:'+color.background+';color:'+color.color+'" title="'+esc(color.label)+'"><td>'+esc(r.name)+'<br>'+esc(r.sections.join(', '))+'<br>'+esc(r.instructorId||'No unique GT ID match')+'</td><td>'+fmt(r.averageGpa)+'</td><td>'+fmt(r.recentGpa)+'</td><td>'+fmt(r.standardDeviation)+'</td><td>'+(r.ambiguous?'Ambiguous identity: multiple GT IDs; metrics withheld':r.recordCount+' GPA records / '+r.termCount+' terms; '+r.suppressedCount+' unavailable records')+'</td></tr>';}).join('')+'</table></div>';
 if(!summary.length)target.textContent='No named instructors are available in the current semester sections.';
 }catch(e){target.textContent=e.message;}
}
document.addEventListener('click',e=>{if(e.target.dataset.gpa)renderGpa(e.target.dataset.gpa);});
