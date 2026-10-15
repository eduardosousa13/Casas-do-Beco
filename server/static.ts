import {readFile,stat,realpath} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import path from 'node:path';
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.webm':'video/webm','.mp4':'video/mp4','.woff':'font/woff','.woff2':'font/woff2','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8','.xml':'application/xml'};
export async function staticResponse(request:Request,root:string):Promise<Response|null>{
 let pathname:string;try{pathname=decodeURIComponent(new URL(request.url).pathname);}catch{return new Response('Pedido inválido',{status:400});}
 if(pathname.split('/').some(p=>p.startsWith('.'))||pathname.includes('\\')||pathname.includes('\0')||pathname==='/admin.html')return new Response('Página não encontrada',{status:404});
 const file=path.resolve(root,'.'+pathname),base=path.resolve(root)+path.sep;if(!file.startsWith(base))return new Response('Página não encontrada',{status:404});
 let size:number,modified:Date;try{const resolved=await realpath(file),realBase=(await realpath(root))+path.sep;if(!resolved.startsWith(realBase))return new Response('Página não encontrada',{status:404});const info=await stat(file);if(!info.isFile())return null;size=info.size;modified=info.mtime;}catch{return null;}
 const extension=path.extname(file),headers=new Headers({'Content-Type':mime[extension]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':/^\/assets\/.+-[\w-]{6,}\./.test(pathname)?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate','Last-Modified':modified.toUTCString()});
 const etag=`W/"${size}-${modified.getTime()}"`;headers.set('ETag',etag);
 if(request.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers});
 let start=0,end=size-1,status=200;
 if(['.webm','.mp4'].includes(extension)){
  headers.set('Accept-Ranges','bytes');const range=request.headers.get('range');
  if(range&&(!request.headers.has('if-range')||request.headers.get('if-range')===modified.toUTCString())){
   const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||(!m[1]&&!m[2])){headers.set('Content-Range',`bytes */${size}`);return new Response(null,{status:416,headers});}
   if(m[1]){start=Number(m[1]);end=m[2]?Number(m[2]):end;}else{const suffix=Number(m[2]);start=Math.max(0,size-suffix);if(suffix<1)start=size;}
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start){headers.set('Content-Range',`bytes */${size}`);return new Response(null,{status:416,headers});}
   end=Math.min(end,size-1);status=206;headers.set('Content-Range',`bytes ${start}-${end}/${size}`);
  }
 }
 headers.set('Content-Length',String(Math.max(0,end-start+1)));
 if(request.method==='HEAD'||size===0)return new Response(null,{status,headers});
 const stream=Readable.toWeb(createReadStream(file,{start,end}));return new Response(stream as ReadableStream<Uint8Array>,{status,headers});
}
export {readFile};
