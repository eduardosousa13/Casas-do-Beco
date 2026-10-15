import {build} from 'esbuild';
import {cp,rm,mkdir} from 'node:fs/promises';
await rm('dist/server',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await build({entryPoints:['server/index.ts'],outfile:'dist/server/index.mjs',bundle:true,platform:'node',format:'esm',target:'node22',packages:'external'});
await cp('server/templates','dist/server/templates',{recursive:true});
await cp('src/assets','dist/client/src/assets',{recursive:true});
console.log('Node server and public assets built.');
