import {build} from 'esbuild';
import {cp,rm,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {constants,brotliCompressSync,gzipSync} from 'node:zlib';
await rm('dist/server',{recursive:true,force:true});
await rm('dist/pms',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await build({entryPoints:['server/index.ts'],outfile:'dist/server/index.mjs',bundle:true,platform:'node',format:'esm',target:'node22',packages:'external'});
await build({entryPoints:['pms/migrate.ts','pms/admin.ts','pms/bootstrap-owner.ts','pms/worker-cli.ts','pms/alerts-cli.ts','pms/email-cli.ts'],outdir:'dist/pms',outExtension:{'.js':'.mjs'},bundle:true,platform:'node',format:'esm',target:'node22',packages:'external'});
await cp('pms/migrations','dist/pms/migrations',{recursive:true});
await cp('server/templates','dist/server/templates',{recursive:true});
// Text assets compressed once, at the strongest level, so the server sends them without compressing per request
// (server/static.ts). Same extensions as `compressed` there; HTML pages stay dynamic and are compressed on the fly.
let poupado=0;
for(const entry of await readdir('dist/client',{recursive:true,withFileTypes:true})){
 if(!entry.isFile()||!/\.(js|css|svg|json|xml|txt|webmanifest)$/.test(entry.name))continue;
 const file=path.join(entry.parentPath,entry.name),data=await readFile(file);
 if(data.length<1024)continue;
 const br=brotliCompressSync(data,{params:{[constants.BROTLI_PARAM_QUALITY]:11,[constants.BROTLI_PARAM_SIZE_HINT]:data.length}});
 const gz=gzipSync(data,{level:9});
 if(br.length<data.length){await writeFile(file+'.br',br);poupado+=data.length-br.length;}
 if(gz.length<data.length)await writeFile(file+'.gz',gz);
}
// Páginas interiores pré-renderizadas: o HTML já leva o conteúdo, por isso o texto e as fotos aparecem antes
// de o JavaScript chegar (num telemóvel fraco, 2 s mais cedo). A página inicial fica de fora: a abertura já
// mostra o logótipo logo, e o conteúdo dela (com o brasão e o logótipo em SVG) só pesava no HTML.
const {render}=await import(path.resolve('dist/ssr/entry-server.js'));
const molde=await readFile('dist/client/index.html','utf8');
if(!molde.includes('<div id="root"></div>'))throw Error('index.html sem <div id="root"></div>');
await mkdir('dist/server/paginas',{recursive:true});
const prerender=['/casa','/mapa','/tradicoes','/sobre-nos','/reservas','/termos','/privacidade'];
for(const url of prerender)await writeFile(`dist/server/paginas${url}.html`,molde.replace('<div id="root"></div>',()=>`<div id="root">${render(url)}</div>`));
await rm('dist/ssr',{recursive:true,force:true});
console.log(`Node server and public assets built (static text precompressed, ${Math.round(poupado/1024)} KB saved with brotli; ${prerender.length} pages prerendered).`);
