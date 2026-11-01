export function scheduleLabel(schedule,index,totalSelected){
 const included=schedule.bundles?.length??new Set(schedule.sections.map(s=>s.course)).size;
 return `Schedule ${index+1} · ${schedule.credits} credits · ${included}/${totalSelected} courses`;
}
export function renderSchedulePicker(root,{schedules,active,offset,hasMore,busy,totalSelected,onSelect,onPage}){
 const focus=document.activeElement?.id;root.replaceChildren();root.className='schedule-picker';if(!schedules.length)return;
 const index=schedules.indexOf(active),row=document.createElement('div');row.className='schedule-choice';
 const button=(id,label,disabled,action)=>{const b=document.createElement('button');b.type='button';b.id=id;b.textContent=label;b.disabled=busy||disabled;b.onclick=action;return b;};
 const label=document.createElement('label');label.textContent='Schedule';label.htmlFor='schedule-option';
 const select=document.createElement('select');select.id='schedule-option';select.disabled=busy;select.setAttribute('aria-label','Selected schedule');
 schedules.forEach((s,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=scheduleLabel(s,offset+i,totalSelected);select.append(option);});
 select.value=String(Math.max(0,index));select.onchange=()=>onSelect(schedules[Number(select.value)]);
 row.append(button('previous-option','‹',index<=0,()=>onSelect(schedules[index-1])),label,select,button('next-option','›',index>=schedules.length-1,()=>onSelect(schedules[index+1])));
 const nav=document.createElement('div');nav.className='schedule-pages';const count=document.createElement('span');count.textContent=`${offset+1}–${offset+schedules.length}`;count.setAttribute('aria-live','polite');
 nav.append(button('previous-results','Previous 50',offset===0,()=>onPage(Math.max(0,offset-50))),count,button('next-results','Next 50',!hasMore,()=>onPage(offset+50)));
 root.append(row,nav);
 if(focus&&root.querySelector('#'+focus))document.getElementById(focus).focus();
}
