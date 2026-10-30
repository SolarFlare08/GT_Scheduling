export function evaluate(sections,settings={}){
 const daily={},violations=[];let penalty=0;
 function rule(amount,r,label){if(!r||r.mode==='disabled'||amount<=0)return true;if(r.mode==='required'){violations.push(label);return false;}penalty+=amount*(r.weight??1);return true;}
 let valid=true;
 for(const day of 'MTWRFSU'){
  const meetings=sections.flatMap(s=>s.meetings.filter(m=>m.days.includes(day)).map(m=>({...m,course:s.course})) ).sort((a,b)=>a.start-b.start);
  const count=settings.countBundles?new Set(meetings.map(m=>m.course)).size:meetings.length;
  daily[day]={count,minutes:meetings.reduce((n,m)=>n+m.end-m.start,0)};
  const r=settings.days?.[day]||{};
  valid=rule(Math.max(0,(r.min?.value??0)-count),count||r.min?.allDays?r.min:null,`${day} minimum classes`)&&valid;
  valid=rule(Math.max(0,count-(r.max?.value??100)),r.max,`${day} maximum classes`)&&valid;
  for(const m of meetings){valid=rule(Math.max(0,(r.start?.value??0)-m.start)/60,r.start,`${day} earliest start`)&&valid;valid=rule(Math.max(0,m.end-(r.end?.value??1440))/60,r.end,`${day} latest end`)&&valid;}
  const gaps=[];for(let i=1;i<meetings.length;i++)gaps.push(Math.max(0,meetings[i].start-meetings[i-1].end));
  for(const gap of gaps)for(const band of settings.gapBands||[])if(gap>=band.min&&gap<band.max)penalty+=(band.penalty||0);
  if(settings.lunch?.days?.includes(day)){const l=settings.lunch;let cursor=l.start,longest=0;for(const m of meetings){if(m.end<=l.start||m.start>=l.end)continue;longest=Math.max(longest,m.start-cursor);cursor=Math.max(cursor,m.end);}longest=Math.max(longest,l.end-cursor);valid=rule(Math.max(0,l.duration-longest)/60,l,`${day} lunch`)&&valid;}
 }
 const values='MTWRF'.split('').map(d=>settings.balanceMetric==='hours'?daily[d].minutes/60:daily[d].count);const mean=values.reduce((a,b)=>a+b,0)/5;
 const variance=values.reduce((n,v)=>n+(v-mean)**2,0)/5,active=values.filter(v=>v>0).length;
 const packed=(settings.packed??50)/100;penalty+=((1-packed)*variance+packed*active)*(settings.distributionWeight??0);
 for(const event of settings.events||[]){for(const s of sections)for(const m of s.meetings){const shared=event.days.split('').filter(d=>m.days.includes(d)).length;if(!shared||event.start>=m.end||m.start>=event.end)continue;valid=rule(shared*(Math.min(event.end,m.end)-Math.max(event.start,m.start))/60,event,`Event ${event.name}`)&&valid;}}
 // Measure the continuous class-free break across the end of the week.
 // A later first class and an earlier last class both lengthen that break.
 const weekly=sections.flatMap(s=>s.meetings.flatMap(m=>[...'MTWRFSU'].flatMap((d,i)=>m.days.includes(d)?[{start:i*1440+m.start,end:i*1440+m.end}]:[])));
 const weekendMinutes=weekly.length?10080+Math.min(...weekly.map(m=>m.start))-Math.max(...weekly.map(m=>m.end)):10080;
 if(settings.maximizeWeekends)penalty+=(10080-weekendMinutes)/60;
 return {valid,penalty,daily,violations,weekendMinutes};
}
