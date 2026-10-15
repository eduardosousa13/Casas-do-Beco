import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {isIP} from 'node:net';
import {Readable} from 'node:stream';
export const maxRequestBytes=256000;
export function clientIp(req:IncomingMessage){
 // Only enable this behind Railway HTTP ingress, which supplies X-Real-IP.
 if(process.env.TRUST_RAILWAY_PROXY==='true'){
  const ip=req.headers['x-real-ip'];if(typeof ip==='string'&&isIP(ip))return ip;
 }
 return req.socket.remoteAddress||'unknown';
}
export function requestOrigin(req:IncomingMessage){
 if(process.env.PUBLIC_SITE_URL)return new URL(process.env.PUBLIC_SITE_URL).origin;
 return 'http://'+(req.headers.host||'localhost');
}
async function bodyBytes(req:IncomingMessage):Promise<Buffer>{
 return new Promise((resolve,reject)=>{
  const chunks:Buffer[]=[];let size=0;
  const cleanup=()=>{req.off('data',data);req.off('end',end);req.off('error',error);req.off('aborted',aborted);};
  const error=(e:Error)=>{cleanup();reject(e);};const aborted=()=>error(Error('ABORTED'));
  const end=()=>{cleanup();resolve(Buffer.concat(chunks));};
  const data=(chunk:Buffer)=>{size+=chunk.length;if(size>maxRequestBytes){cleanup();req.resume();reject(Error('BODY_TOO_LARGE'));}else chunks.push(chunk);};
  req.on('data',data);req.on('end',end);req.on('error',error);req.on('aborted',aborted);
 });
}
export async function webRequest(req:IncomingMessage){
 const headers=new Headers();for(const [name,value] of Object.entries(req.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(', '):value);
 const method=req.method||'GET';let body:Buffer|undefined;
 if(!['GET','HEAD'].includes(method)){
  if(Number(req.headers['content-length']||0)>maxRequestBytes){req.resume();throw Error('BODY_TOO_LARGE');}
  body=await bodyBytes(req);
 }
 const origin=requestOrigin(req),url=new URL(req.url||'/',origin);
 // Absolute-form request targets must not replace our trusted application origin.
 if(url.origin!==origin)throw Error('INVALID_URL');
 return new Request(url,{method,headers,...(body?{body:new Uint8Array(body)}:{})});
}
export async function sendResponse(req:IncomingMessage,res:ServerResponse,response:Response){
 res.statusCode=response.status;
 for(const [key,value] of response.headers)if(key.toLowerCase()!=='set-cookie')res.setHeader(key,value);
 const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
 if(req.method==='HEAD'||!response.body){await response.body?.cancel();res.end();return;}
 await new Promise<void>((resolve,reject)=>{
  const stream=Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
  stream.on('error',reject);res.on('finish',resolve);res.on('close',()=>{stream.destroy();resolve();});stream.pipe(res);
 });
}
export function transport(handler:(request:Request,ip:string)=>Promise<Response>){
 return createServer({requestTimeout:15000,headersTimeout:10000},async(req,res)=>{
  try{await sendResponse(req,res,await handler(await webRequest(req),clientIp(req)));}
  catch(error){if(!res.headersSent){res.statusCode=error instanceof Error&&error.message==='BODY_TOO_LARGE'?413:400;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('Connection','close');res.end(JSON.stringify({error:'Pedido inválido.'}));}else res.destroy();}
 });
}
