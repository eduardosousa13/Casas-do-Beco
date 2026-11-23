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
console.log(`Node server and public assets built (static text precompressed, ${Math.round(poupado/1024)} KB saved with brotli).`);
