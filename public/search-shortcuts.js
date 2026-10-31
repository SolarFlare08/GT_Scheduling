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
 const types=new Set(course.sections.map(s=>s.component||(/recitation|breakout/i.test(s.type||'')?'recitation':/laboratory|\blab\b/i.test(s.type||'')?'lab':'lecture')));
 return types.size===1&&!types.has('lecture')?[...types][0]:null;
}
