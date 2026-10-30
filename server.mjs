import {validateState} from './public/data-model.js';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {load,normalize} from './lib/ingestion.mjs';
import {solve} from './lib/optimizer.mjs';
import {critique} from './lib/critique.mjs';
const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/advanced.js':'advanced.js','/data-model.js':'data-model.js','/professor-summary.js':'professor-summary.js','/section-colors.js':'section-colors.js','/workspace.js':'workspace.js','/activities.js':'activities.js'};
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-ancestors 'none'");
 const json=(v,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(v));};
 try{if(req.headers.origin&&!['http://localhost:3000','http://127.0.0.1:3000'].includes(req.headers.origin))return json({error:'Origin rejected'},403);
 if(url.pathname==='/api/critique'){return json(await critique(url.searchParams.get('course')));}
 if(url.pathname==='/api/terms'){const d=await load('index');return json({terms:d.raw.terms,...meta(d)});}
 if(url.pathname==='/api/courses'){const d=await load(url.searchParams.get('term'),url.searchParams.has('refresh'));return json({courses:normalize(d.raw),...meta(d)});}
 if(url.pathname==='/api/solve'&&req.method==='POST'){let body='';for await(const chunk of req){body+=chunk;if(body.length>10000000)throw Error('Request too large');}const input=JSON.parse(body);if(input.catalog){validateState({schemaVersion:'1.0',catalog:input.catalog});return json(solve(input.catalog,input));}const d=await load(input.term);return json(solve(normalize(d.raw),input));}
 if(files[url.pathname]&&req.method==='GET'){res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':'text/html');return res.end(await readFile(new URL('./public/'+files[url.pathname],import.meta.url)));}json({error:'Not found'},404);
 }catch(e){json({error:e.message},400);}});
function meta(d){return {source:d.source,fetchedAt:d.fetchedAt,updatedAt:d.raw.updatedAt,cached:d.cached,refreshError:d.refreshError};}
server.listen(3000,'127.0.0.1',()=>console.log('Private local scheduler: http://127.0.0.1:3000'));
