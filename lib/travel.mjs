// Estimates, not pedestrian routes: straight-line coordinates × 1.3, 80 m/min.
export function walking(a,b){
 if(a.room&&a.room===b.room)return {meters:0,minutes:0};
 const x=a.location,y=b.location;
 if(!x||!y||![x.lat,x.long,y.lat,y.long].every(Number.isFinite))return null;
 const rad=v=>v*Math.PI/180;
 const h=Math.sin(rad(y.lat-x.lat)/2)**2+Math.cos(rad(x.lat))*Math.cos(rad(y.lat))*Math.sin(rad(y.long-x.long)/2)**2;
 const meters=6371000*2*Math.asin(Math.sqrt(Math.min(1,h)))*1.3;
 return {meters:Math.round(meters),minutes:Math.ceil(meters/80)};
}
export function travelSummary(sections){
 let shortfall=0,unknown=0;const transfers=[];
 for(const day of 'MTWRFSU'){
  const meetings=sections.flatMap(s=>s.meetings.map(m=>({...m,course:s.course,crn:s.crn}))).filter(m=>m.days.includes(day)).sort((a,b)=>a.start-b.start);
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
