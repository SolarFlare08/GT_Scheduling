export const rankingFactors=[
 {key:'preferredCourses',label:'Include preferred courses',rank:1},
 {key:'preferredSections',label:'Use manually preferred sections',rank:2},
 {key:'walking',label:'Allow enough walking time',rank:3},
 {key:'lowGpa',label:'Avoid recent GPA below 3.0',rank:4},
 {key:'weekendDays',label:'Keep whole days free around the weekend',rank:5},
 {key:'darkGreen',label:'Prefer dark green professors (recent GPA ≥ 3.8)',rank:5},
 {key:'weekendHours',label:'Finish earlier / start later around the weekend',rank:6},
 {key:'schedulePreferences',label:'Daily limits, lunch, activities and balanced / packed days',rank:6},
 {key:'gaps',label:'Minimize time between classes',rank:7}
];
export function rankingGroups(settings={}){
 const values=settings.ranking||{};
 if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Invalid preference priorities.');
 const groups=new Map();
 for(const factor of rankingFactors){const config=values[factor.key]||{},rank=config.rank??factor.rank,weight=config.weight??1;
  if(!Number.isInteger(rank)||rank<1||rank>20||!Number.isInteger(weight)||weight<1||weight>100)throw Error('Priorities must be 1–20 and weights 1–100.');
  if(!groups.has(rank))groups.set(rank,[]);groups.get(rank).push({key:factor.key,weight});
 }
 return [...groups].sort(([a],[b])=>a-b).map(([rank,factors])=>({rank,factors}));
}
export function rankedScore(values,settings={}){
 return [values.requiredCourses,values.scheduleChanges,...rankingGroups(settings).map(g=>g.factors.reduce((sum,f)=>sum+values[f.key]*f.weight,0))];
}
export function setupRanking(prefs,state){
 const box=document.createElement('fieldset');box.id='ranking-preferences';box.innerHTML='<legend>Preference priorities</legend><p>Smaller priority numbers win first. Required-course retention and minimum-change recovery stay ahead of these preferences. Factors sharing a priority are added together; weight increases a factor within that priority. Hard restrictions always apply.</p><label>Search engine<select id="solver-backend"><option value="cp-sat">CP-SAT</option><option value="backtracking">Backtracking (previous solver)</option></select></label><div class="tablewrap"><table><thead><tr><th>Preference</th><th>Priority (1 = first)</th><th>Weight</th></tr></thead><tbody></tbody></table></div><button type="button" id="reset-ranking">Reset priorities</button>';
 prefs.querySelector('h2').after(box);
 const fields={};for(const f of rankingFactors){const row=document.createElement('tr'),name=document.createElement('td');name.textContent=f.label;row.append(name);fields[f.key]={};for(const [key,max] of [['rank',20],['weight',100]]){const td=document.createElement('td'),input=document.createElement('input');input.type='number';input.min='1';input.max=String(max);input.step='1';input.setAttribute('aria-label',f.label+' '+(key==='rank'?'priority':'weight'));fields[f.key][key]=input;td.append(input);row.append(td);}box.querySelector('tbody').append(row);}
 function restore(){const p=state().preferences||{};document.getElementById('solver-backend').value=p.solverBackend||'cp-sat';for(const f of rankingFactors){fields[f.key].rank.value=p.ranking?.[f.key]?.rank??f.rank;fields[f.key].weight.value=p.ranking?.[f.key]?.weight??1;}}
 document.getElementById('reset-ranking').onclick=()=>{for(const f of rankingFactors){fields[f.key].rank.value=f.rank;fields[f.key].weight.value=1;}};
 restore();return {restore,read(){const ranking=Object.fromEntries(rankingFactors.map(f=>[f.key,{rank:+fields[f.key].rank.value,weight:+fields[f.key].weight.value}]));rankingGroups({ranking});return {ranking,solverBackend:document.getElementById('solver-backend').value};}};
}
