import { json } from '../pms/http';
import { AccessError,staffSession } from '../pms/auth';
import type { RouteHandler } from './types';
import * as rooms from './routes/pms/rooms';
import * as quote from './routes/pms/quote';
import * as checkout from './routes/pms/checkout';
import * as status from './routes/pms/status';
import * as webhook from './routes/pms/stripe-webhook';
import * as operations from './routes/admin/operations';
import * as configuration from './routes/admin/configuration';
import * as history from './routes/admin/history';
import * as sessions from './routes/admin/sessions';
import * as auth from './routes/auth/[...all]';
import * as contact from './routes/contact';

type Routes = { GET?:RouteHandler;POST?:RouteHandler;ALL?:RouteHandler };
const routes:Record<string,Routes>={
 '/api/pms/rooms':rooms,'/api/pms/quote':quote,'/api/pms/checkout':checkout,
 '/api/pms/status':status,'/api/pms/stripe-webhook':webhook,
 '/api/admin/operations':operations,'/api/admin/configuration':configuration,
 '/api/admin/history':history,'/api/admin/sessions':sessions,'/api/contact':contact,
};
export const publicPages=new Set(['/','/sobre-nos','/onde-estamos','/contactos','/casas/nascente','/casas/poente']);
export const adminPages=new Set(['','login','security','history','sessions','calendar','reservations','finance','recover','reset-password']);
export const protectedPath=(path:string)=>path==='/admin'||path.startsWith('/admin/')||path.startsWith('/api/admin/')||path.startsWith('/api/auth/');
export function securityHeaders(path:string){
 const h=new Headers({'X-Content-Type-Options':'nosniff'});
 if(protectedPath(path)){
  h.set('Cache-Control','no-store');h.set('X-Robots-Tag','noindex, nofollow');h.set('Referrer-Policy','no-referrer');
  h.set('Content-Security-Policy',"frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
 }
 return h;
}
export async function handleApi(request:Request,clientAddress:string):Promise<Response>{
 const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
 const route=path.startsWith('/api/auth/')?auth:routes[path];
 if(!route)return json(404,{error:'Página não encontrada.'});
 const method=request.method==='HEAD'?'GET':request.method;
 const handler=route.ALL??route[method as 'GET'|'POST'];
 if(!handler){const response=json(405,{error:'Método inválido.'});response.headers.set('Allow',Object.keys(route).filter(k=>['GET','POST'].includes(k)).join(', '));return response;}
 const response=await handler({request,url,clientAddress});
 for(const [key,value] of securityHeaders(path))response.headers.set(key,value);
 return response;
}
export async function adminBootstrap(request:Request):Promise<Response|{page:string;userName:string;factorEnabled:boolean}>{
 const page=new URL(request.url).pathname.replace(/\/$/,'').slice('/admin'.length).replace(/^\//,'');
 if(!adminPages.has(page))return new Response('Página não encontrada',{status:404});
 let userName='',factorEnabled=false;
 if(!['login','recover','reset-password'].includes(page)){
  try{const actor=await staffSession(request,page!=='security');userName=actor.user.name;factorEnabled=actor.user.twoFactorEnabled===true;}
  catch(error){
   if(error instanceof AccessError){if(error.status===401)return new Response(null,{status:302,headers:{Location:'/admin/login'}});if(error.message.startsWith('Configure'))return new Response(null,{status:302,headers:{Location:'/admin/security'}});return new Response('Acesso não autorizado.',{status:403});}
   return new Response('Configure o acesso administrativo para continuar.',{status:503});
  }
 }
 return {page,userName,factorEnabled};
}
export const bootstrapJson=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
