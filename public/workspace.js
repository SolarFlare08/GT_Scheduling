const palette=[['#2864ad','#eaf2fc'],['#8d43a1','#f5ebf9'],['#087e72','#e4f4f0'],['#b45b17','#fcf0e3'],['#b43f64','#fbeaf0'],['#607429','#f0f4df'],['#4f55b2','#eeedfb'],['#946b12','#fbf4df'],['#346c72','#e1f0f2'],['#8b5148','#f7eae5'],['#574384','#eee8f8'],['#627184','#edf1f6']];
export function courseStyle(id,ids){
 ids=[...(ids||[...document.querySelectorAll('#selected [data-remove]')].map(b=>b.dataset.remove))];if(!ids.includes(id))ids.push(id);
 const index=ids.indexOf(id);const [color,bg]=palette[index%palette.length];return `--course-color:${color};--course-bg:${bg}`;
}
export function openWorkspaceTab(name){document.querySelector(`[data-workspace-tab="${name}"]`)?.click();}
export function setupWorkspace(){
 const $=id=>document.getElementById(id),aside=document.querySelector('aside'),article=document.querySelector('article');
 const searchPanel=$('search').closest('section'),details=$('details').closest('section'),prefs=$('packed').closest('section'),data=$('full-import').closest('section'),basic=$('min').closest('section');
 const heading=(section,text)=>{section.querySelector('h2').textContent=text;};
 heading(searchPanel,'Find courses');heading(details,'Course & instructor details');heading(prefs,'Schedule preferences');heading(data,'Data & components');
 searchPanel.insertBefore(document.querySelector('.term'),$('search'));
 document.querySelector('.intro').remove();
 const selectedPanel=document.createElement('section');selectedPanel.className='selected-panel';selectedPanel.innerHTML='<h2>Selected courses <span id="selected-count" class="count-badge">0</span></h2>';
 $('selected').previousElementSibling.remove();selectedPanel.append($('selected'));searchPanel.after(selectedPanel);
 const toolbar=document.createElement('div');toolbar.className='schedule-toolbar';toolbar.append($('solve'));selectedPanel.append(toolbar);
 const actions=basic.querySelector('.actions');const quick=document.createElement('div');quick.className='data-step';quick.innerHTML='<h3>Saved course plans</h3><p>Save or reload your course selection in this browser. Configuration files contain course selections and basic time settings.</p>';quick.append(actions);data.append(quick);
 const basics=document.createElement('div');basics.className='basic-preferences';basics.innerHTML='<h3>Credits & availability</h3><p>These time bounds apply to every day. Set wider bounds here if you want softer day-specific preferences below.</p>';
 for(const child of [...basic.children])if(child.tagName!=='H2')basics.append(child);
 prefs.insertBefore(basics,prefs.children[1]);basic.remove();
 $('save-preferences').textContent='Save preferences';
 const preferencesFooter=document.createElement('div');preferencesFooter.className='preference-footer';const generate=document.createElement('button');generate.className='primary';generate.textContent='Save preferences & find schedules';generate.onclick=()=>{$('save-preferences').click();if($('preferences-message').textContent.startsWith('Saved.'))$('solve').click();};preferencesFooter.append(generate);prefs.append(preferencesFooter);
 const nav=document.createElement('div');nav.className='workspace-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Scheduler tools');
 const tools=document.createElement('div');tools.className='workspace-tools';details.before(tools);tools.append(nav);
 const preferencePair=document.createElement('div');preferencePair.className='preference-pair';
 preferencePair.append(prefs,$('ranking-preferences'));
 tools.append(preferencePair);
 setupPreferenceNavigation(prefs);
 const panels={details,preferences:preferencePair,data};
 for(const [name,panel] of Object.entries(panels)){const button=document.createElement('button');button.textContent={details:'Course & instructor details',preferences:'Preferences',data:'Data & components'}[name];button.dataset.workspaceTab=name;button.id='tab-'+name;button.setAttribute('role','tab');button.setAttribute('aria-controls','panel-'+name);panel.id='panel-'+name;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);button.onclick=()=>{for(const [key,p] of Object.entries(panels)){p.hidden=key!==name;const b=nav.querySelector(`[data-workspace-tab="${key}"]`);b.setAttribute('aria-selected',String(key===name));b.tabIndex=key===name?0:-1;}localStorage.setItem('gt-workspace-tab',name);};nav.append(button);tools.append(panel);}
 nav.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...nav.children],i=tabs.indexOf(document.activeElement);const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});
 openWorkspaceTab(['details','preferences','data'].includes(localStorage.getItem('gt-workspace-tab'))?localStorage.getItem('gt-workspace-tab'):'details');
 const info=document.createElement('p');info.className='search-help';info.textContent='Search by course code or title. Results appear as you type.';$('search').after(info);
 new MutationObserver(()=>{$('selected-count').textContent=$('selected').querySelectorAll('.course').length;}).observe($('selected'),{childList:true});
 setupPlanStorage(data,quick);
 const source=document.querySelector('.sources');const disclosure=document.createElement('details');disclosure.className='source-disclosure';disclosure.innerHTML='<summary>Data sources & limitations</summary>';source.before(disclosure);disclosure.append(source);
}

function setupPlanStorage(data,oldQuick){
 const $=id=>document.getElementById(id),file=$('full-import'),mode=$('full-mode'),cats=$('import-categories'),preview=$('import-preview'),confirm=$('confirm-import');
 const title=[...data.querySelectorAll('h3')].find(h=>h.textContent==='JSON import and export');
 const box=document.createElement('div');box.className='plan-storage';box.innerHTML='<h3>Plans & backups</h3><div class="browser-plan"><div><strong>This browser</strong><p>Save or reload your course selection and basic time settings.</p></div><div class="storage-buttons"></div></div><div class="file-transfer"><div class="storage-export"><h4>Export</h4><label>Include<select id="export-scope"><option value="complete">Complete backup</option><option value="plan">Course plan only</option></select></label><p id="export-scope-help">Catalog, plan, preferences, activities and saved records.</p><button type="button" id="download-state">Download JSON</button></div><div class="storage-import"><h4>Import</h4><p>Choose a course plan or complete backup. The file type is detected automatically.</p></div></div>';
 title.replaceWith(box);box.querySelector('.storage-buttons').append($('save'),$('restore'));
 const exportHelp=$('export-scope-help');$('export-scope').onchange=()=>{exportHelp.textContent=$('export-scope').value==='plan'?'Course selection and basic credit / time settings.':'Catalog, plan, preferences, activities and saved records.';};
 $('download-state').onclick=()=>($('export-scope').value==='plan'?$('share'):$('full-export')).click();
 box.querySelector('.storage-import').append(file.closest('label'));
 const review=document.createElement('div');review.className='storage-review';review.hidden=true;review.innerHTML='<h4>Review complete backup</h4><p>Merge updates matching records. Replace overwrites the selected categories.</p>';review.append(mode.closest('label'),cats,preview,confirm);box.append(review,$('data-message'));
 const names={catalog:'Course catalog',preferences:'Preferences & plan',professors:'Professor records',courseRatings:'Course ratings',events:'Activities',profiles:'Profiles',schedules:'Schedules',registration:'Registration',history:'History',degreePlans:'Degree plans'};
 for(const label of cats.children){const input=label.querySelector('input');label.lastChild.textContent=names[input.value]||input.value;}
 const originalImport=file.onchange;
 file.onchange=async event=>{
  for(const node of box.querySelectorAll('.storage-plan-review'))node.remove();
  review.hidden=true;confirm.disabled=true;$('data-message').textContent='';preview.textContent='';
  const chosen=event.target.files?.[0];if(!chosen)return;
  try{
   const value=JSON.parse(await chosen.text());
   if(Array.isArray(value.selections)&&!value.schemaVersion){
    const apply=document.createElement('button');apply.type='button';apply.textContent='Import course plan';
    const notice=document.createElement('p');notice.textContent=`Course plan · ${value.selections.length} courses · term ${value.term||'unknown'}. Replaces your current course selection and basic time settings.`;
    const planReview=document.createElement('div');planReview.className='storage-plan-review';planReview.append(notice,apply);box.querySelector('.storage-import').append(planReview);
    apply.onclick=async()=>{apply.disabled=true;await $('import').onchange(event);planReview.remove();};
   }else{await originalImport(event);review.hidden=confirm.disabled;}
  }catch(error){$('data-message').textContent='Could not read this JSON file: '+error.message;}
 };
 const hidden=document.createElement('div');hidden.hidden=true;hidden.append($('share'),$('import').closest('label'),$('full-export'));box.append(hidden);oldQuick.remove();
 const componentTitle=data.querySelector('h2'),componentNote=componentTitle.nextElementSibling,editor=$('component-editor'),edit=$('edit-components');
 const components=document.createElement('details');components.className='component-disclosure';components.innerHTML='<summary>Linked course components</summary>';components.append(componentNote,edit,editor);box.after(components);
 data.querySelector('hr')?.remove();
}

function setupPreferenceNavigation(prefs){
 const $=id=>document.getElementById(id),original=[...prefs.children];
 const basics=prefs.querySelector('.basic-preferences'),honors=$('include-honors').closest('label'),weekends=$('maximize-weekends').closest('label'),daily=$('daily-preferences').closest('.tablewrap');
 const lunch=original.find(n=>n.tagName==='H3'&&n.textContent==='Lunch'),save=$('save-preferences'),intro=original.find(n=>n.tagName==='P');
 const between=(start,end)=>original.slice(original.indexOf(start),original.indexOf(end));
 const campusBody=document.createElement('div');campusBody.id='preference-campus-body';
 const groups=[['basics','Basics',[basics]],['campus','Campus & eligibility',[campusBody,honors,honors.nextElementSibling]],['layout','Weekends & layout',between(weekends,daily).concat(intro)],['daily','Daily rules',between(daily,lunch)],['breaks','Lunch & gaps',between(lunch,save)]];
 const nav=document.createElement('div');nav.className='preference-nav';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Preference categories');prefs.querySelector('h2').after(nav);
 const body=document.createElement('div');body.className='preference-body';nav.after(body);
 for(const [id,title,nodes] of groups){
  const panel=document.createElement('div');panel.id='preference-'+id;panel.className='preference-category';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','preference-tab-'+id);panel.tabIndex=0;panel.append(...nodes);body.append(panel);
  const button=document.createElement('button');button.type='button';button.id='preference-tab-'+id;button.textContent=title;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);
  button.onclick=()=>{for(const tab of nav.children){const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;}body.scrollTop=0;};nav.append(button);
 }
 nav.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...nav.children],i=tabs.indexOf(document.activeElement);const index=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[index].click();tabs[index].focus();});
 const footer=prefs.querySelector('.preference-footer');footer.prepend(save,$('preferences-message'));nav.firstElementChild.click();
}
