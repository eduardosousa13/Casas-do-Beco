import dotenv from 'dotenv';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {ViteDevServer} from 'vite';
import {webRequest,clientIp,sendResponse} from './transport';
import {handleApi,adminBootstrap,publicPages,securityHeaders,bootstrapJson} from './app';
import {staticResponse} from './static';
import {database} from '../pms/db';
import {runWorker} from '../pms/worker';
import {readiness} from './health';
dotenv.config({path:'.env.local',override:false,quiet:true});
const dev=process.argv.includes('--dev'),root=process.cwd(),clientRoot=path.join(root,'dist/client');
const argumentPort=process.argv.indexOf('--port'),port=Number(argumentPort>=0?process.argv[argumentPort+1]:process.env.PORT||3000),host=process.env.HOST||'0.0.0.0';
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid server port');
let vite:ViteDevServer|undefined;
const htmlCache=new Map<string,string>();
async function html(file:string,url:string){
 if(dev)return vite!.transformIndexHtml(url,await readFile(path.join(root,file),'utf8'));
 if(!htmlCache.has(file))htmlCache.set(file,await readFile(path.join(clientRoot,file),'utf8'));
 return htmlCache.get(file)!;
}
const server=createServer({requestTimeout:15000,headersTimeout:10000},async(req,res)=>{
 try{
  const incoming=new URL(req.url||'/','http://localhost'),pathname=incoming.pathname.replace(/\/$/,'')||'/';
  for(const [key,value] of securityHeaders(pathname))res.setHeader(key,value);
  if(pathname==='/healthz'&&['GET','HEAD'].includes(req.method||'GET')){await sendResponse(req,res,await readiness(database(),process.env.PMS_WORKER_ENABLED==='true'));return;}
  if(process.env.NODE_ENV==='production'&&process.env.PUBLIC_SITE_URL&&['GET','HEAD'].includes(req.method||'GET')&&req.headers.host!==new URL(process.env.PUBLIC_SITE_URL).host&&req.headers.host!=='healthcheck.railway.app'){const target=new URL(process.env.PUBLIC_SITE_URL);target.pathname=incoming.pathname;target.search=incoming.search;res.writeHead(308,{Location:target.href});res.end();return;}
  if(pathname==='/api'||pathname.startsWith('/api/')){const request=await webRequest(req);await sendResponse(req,res,await handleApi(request,clientIp(req)));return;}
  if(!['GET','HEAD'].includes(req.method||'GET')){res.writeHead(405,{Allow:'GET, HEAD'});res.end('Método inválido.');return;}
  const request=await webRequest(req);
  if(pathname==='/admin'||pathname.startsWith('/admin/')){
   const boot=await adminBootstrap(request);if(boot instanceof Response){await sendResponse(req,res,boot);return;}
   await sendResponse(req,res,new Response((await html('admin.html',req.url||'/admin')).replace('__ADMIN_BOOTSTRAP__',bootstrapJson(boot)),{headers:{'Content-Type':'text/html; charset=utf-8'}}));return;
  }
  if(publicPages.has(pathname)){await sendResponse(req,res,new Response(await html('index.html',req.url||'/'),{headers:{'Content-Type':'text/html; charset=utf-8'}}));return;}
  if(pathname==='/reserva/resultado'||pathname==='/reserva/cancelada'){
   const name=pathname.endsWith('resultado')?'resultado':'cancelada';
   const file=dev?path.join(root,`server/templates/reserva-${name}.html`):fileURLToPath(new URL(`./templates/reserva-${name}.html`,import.meta.url));
   await sendResponse(req,res,new Response(await readFile(file,'utf8'),{headers:{'Content-Type':'text/html; charset=utf-8','Referrer-Policy':'no-referrer','Cache-Control':'no-store'}}));return;
  }
  // Never expose the admin template directly, bypassing its server-side gate.
  if(pathname==='/admin.html'){res.writeHead(404);res.end('Página não encontrada.');return;}
  if(dev){vite!.middlewares(req,res,()=>{if(!res.writableEnded){res.writeHead(404);res.end('Página não encontrada.');}});return;}
  await sendResponse(req,res,await staticResponse(request,clientRoot)||new Response('Página não encontrada.',{status:404}));
 }catch(error){
  if(error instanceof Error&&error.message==='BODY_TOO_LARGE'){if(!res.headersSent){res.writeHead(413,{'Connection':'close','Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"Pedido demasiado longo."}');}return;}
  if(error instanceof Error&&error.message==='INVALID_URL'){res.writeHead(400,{'Cache-Control':'no-store'});res.end('Pedido inválido.');return;}
  console.error('HTTP request failed',error instanceof Error?error.name:'UnknownError');
  if(!res.headersSent){res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('Serviço temporariamente indisponível.');}else res.destroy();
 }
});
if(dev){const {createServer:createVite}=await import('vite');vite=await createVite({server:{middlewareMode:true,hmr:{server}},appType:'custom'});}
server.listen(port,host,()=>console.log(`Casas do Beco ${dev?'development':'production'}: http://${host}:${port}`));
const workerAbort=new AbortController();
const worker=process.env.PMS_WORKER_ENABLED==='true'?runWorker(workerAbort.signal):undefined;
worker?.catch(()=>{console.error('PMS worker stopped unexpectedly');void stop();process.exitCode=1;});
let stopping=false;
async function stop(){if(stopping)return;stopping=true;const deadline=setTimeout(()=>{server.closeAllConnections();process.exit(1);},25000);deadline.unref();workerAbort.abort();server.close();server.closeIdleConnections();await vite?.close();await worker;if(process.env.DATABASE_URL)await database().end();clearTimeout(deadline);}
process.on('SIGTERM',()=>void stop());process.on('SIGINT',()=>void stop());
