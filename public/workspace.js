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
 const panels={details,preferences:prefs,data};
 for(const [name,panel] of Object.entries(panels)){const button=document.createElement('button');button.textContent={details:'Course & instructor details',preferences:'Preferences',data:'Data & components'}[name];button.dataset.workspaceTab=name;button.id='tab-'+name;button.setAttribute('role','tab');button.setAttribute('aria-controls','panel-'+name);panel.id='panel-'+name;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);button.onclick=()=>{for(const [key,p] of Object.entries(panels)){p.hidden=key!==name;const b=nav.querySelector(`[data-workspace-tab="${key}"]`);b.setAttribute('aria-selected',String(key===name));b.tabIndex=key===name?0:-1;}localStorage.setItem('gt-workspace-tab',name);};nav.append(button);tools.append(panel);}
 nav.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...nav.children],i=tabs.indexOf(document.activeElement);const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});
 openWorkspaceTab(['details','preferences','data'].includes(localStorage.getItem('gt-workspace-tab'))?localStorage.getItem('gt-workspace-tab'):'details');
 const info=document.createElement('p');info.className='search-help';info.textContent='Search by course code or title. Results appear as you type.';$('search').after(info);
 new MutationObserver(()=>{$('selected-count').textContent=$('selected').querySelectorAll('.course').length;}).observe($('selected'),{childList:true});
 // Turn the existing import controls into a progressive, three-step workflow.
 const file=$('full-import'),mode=$('full-mode'),cats=$('import-categories'),preview=$('import-preview'),confirm=$('confirm-import');
 const start=document.createElement('div');start.className='data-step';start.innerHTML='<h3>1. Choose a JSON file</h3><p>Use a complete-state export from this scheduler (schema version 1.0). Nothing changes until you review and confirm.</p>';file.closest('label').before(start);start.append(file.closest('label'));
 const review=document.createElement('div');review.className='data-step';review.hidden=true;review.innerHTML='<h3>2. Review what to import</h3><p>Merge adds new records and updates matching identifiers. Replace overwrites only the checked categories.</p>';start.after(review);review.append(mode.closest('label'),cats,preview);
 const final=document.createElement('div');final.className='data-step';final.hidden=true;final.innerHTML='<h3>3. Apply the import</h3><p>Check your selection above, then confirm.</p>';final.append(confirm);review.after(final);
 const names={catalog:'Course catalog',preferences:'Preferences & plan',professors:'Professor records',courseRatings:'Course ratings',events:'Events',profiles:'Profiles',schedules:'Schedule records',registration:'Registration records',history:'History',degreePlans:'Degree plans'};
 for(const label of cats.children){const input=label.querySelector('input');label.lastChild.textContent=names[input.value]||input.value;}
 new MutationObserver(()=>{review.hidden=false;final.hidden=confirm.disabled;}).observe(preview,{childList:true,subtree:true,characterData:true});
 $('full-export').textContent='Download complete JSON backup';const exportBox=document.createElement('div');exportBox.className='data-step';exportBox.innerHTML='<h3>Export a backup</h3><p>Download your loaded catalog, current plan, preferences, and stored records. Import this file above to restore them.</p>';exportBox.append($('full-export'));data.append(exportBox);
 const source=document.querySelector('.sources');const disclosure=document.createElement('details');disclosure.className='source-disclosure';disclosure.innerHTML='<summary>Data sources & limitations</summary>';source.before(disclosure);disclosure.append(source);
}
