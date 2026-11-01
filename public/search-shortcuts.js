export const compactCode=value=>value.replace(/\s+/g,'').toUpperCase();
export function courseList(query){
 if(/[,;\n]/.test(query))return [...new Set(query.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean))];
 const matches=query.match(/[A-Za-z]{2,5}\s*\d{4}[A-Za-z]?\b/g)||[];
 return matches.length>1&&query.replace(/[A-Za-z]{2,5}\s*\d{4}[A-Za-z]?\b/g,'').trim()===''?[...new Set(matches)]:null;
}
export function shortcutCandidate(query,results,key){
 const exact=results.find(c=>compactCode(c.id)===compactCode(query));
 return exact||(key==='Enter'&&results.length===1?results[0]:null);
}
export function companionType(course){
 const types=new Set(course.sections.map(s=>s.component||(/recitation|breakout|studio/i.test(s.type||'')?'recitation':/laboratory|\blab\b/i.test(s.type||'')?'lab':'lecture')));
 return types.size===1&&!types.has('lecture')?[...types][0]:null;
}
export function automaticComponents(course,catalog,selection){
 const type=s=>s.component||(/recitation|breakout|studio/i.test(s.type||'')?'recitation':/laboratory|\blab\b/i.test(s.type||'')?'lab':'lecture');
 const explicit=selection.requiredComponents||course.requiredComponents;
 const components={...course.componentSources,...selection.components};
 const required=new Set(explicit||['lecture']),warnings=[];
 for(const component of ['lab','recitation']){
  if(components[component]){required.add(component);continue;}
  // A manual/declared component list takes precedence over inferred relationships.
  if(explicit&&!required.has(component))continue;
  const candidates=catalog.filter(c=>{
   if(c.id===course.id)return c.sections.some(s=>type(s)===component);
   if(companionType(c)!==component)return false;
   const reverse=(c.corequisites||[]).some(r=>r.id===course.id);
   const forward=(course.corequisites||[]).some(r=>r.id===c.id);
   const suffix=compactCode(c.id)===compactCode(course.id)+(component==='lab'?'L':'R');
   return reverse||forward||(suffix&&c.sections.every(s=>s.credits===0));
  });
  if(candidates.length===1){required.add(component);components[component]=candidates[0].id;}
  else if(candidates.length>1)warnings.push(`${course.id}: multiple ${component} sources; confirm the mapping in Data & components.`);
 }
 const mapped=Object.keys(components).length||required.size>1||explicit;
 return {selection:{...(mapped?{...selection,requiredComponents:[...required],components:{lecture:course.id,...components}}:selection),componentWarnings:warnings},warnings};
}
