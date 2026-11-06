// Shared pure implementation used by both the server and browser paging.
export function walking(a,b){
 if(a.offCampus||b.offCampus)return null;
 if(a.room&&a.room===b.room)return {meters:0,minutes:0};
 const x=a.location,y=b.location;
 if(!x||!y||![x.lat,x.long,y.lat,y.long].every(Number.isFinite))return null;
 const rad=v=>v*Math.PI/180;
 const h=Math.sin(rad(y.lat-x.lat)/2)**2+Math.cos(rad(x.lat))*Math.cos(rad(y.lat))*Math.sin(rad(y.long-x.long)/2)**2;
 const meters=6371000*2*Math.asin(Math.sqrt(Math.min(1,h)))*1.3;
 return {meters:Math.round(meters),minutes:Math.ceil(meters/80)};
}
export function activityMeetings(events=[]){return events.filter(e=>e.mode!=='disabled').map(e=>({days:e.days,start:e.start,end:e.end,room:e.locationMode==='on-campus'?e.locationName:e.locationMode==='off-campus'?'Off campus':undefined,offCampus:e.locationMode==='off-campus',location:e.locationMode==='on-campus'?e.location:null,course:e.name,crn:'activity:'+e.id}));}
export function travelSummary(sections,events=[]){
 let shortfall=0,unknown=0;const transfers=[];
 for(const day of 'MTWRFSU'){
  const meetings=[...sections.flatMap(s=>s.meetings.map(m=>({...m,course:s.course,crn:s.crn}))),...activityMeetings(events)].filter(m=>m.days.includes(day)).sort((a,b)=>a.start-b.start);
  for(let i=1;i<meetings.length;i++){
   const a=meetings[i-1],b=meetings[i];
   if(a.from&&b.from&&(a.from>b.to||b.from>a.to))continue;
   const gap=b.start-a.end,estimate=walking(a,b);if(!estimate)unknown++;
   const deficit=estimate?Math.max(0,2*estimate.minutes-gap):0;shortfall+=deficit;
   transfers.push({day,from:a.course||a.crn,to:b.course||b.crn,fromRoom:a.room,toRoom:b.room,gap,...estimate,unknown:!estimate,shortfall:deficit});
  }
 }
 return {shortfall,unknown,transfers};
}
