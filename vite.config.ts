import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
export default defineConfig({
 plugins:[react(),tailwindcss()],
 cacheDir:process.env.VITE_CACHE_DIR||'node_modules/.vite',
 resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},
 appType:'custom',
 server:{hmr:process.env.DISABLE_HMR!=='true',watch:process.env.DISABLE_HMR==='true'?null:{}},
 build:{outDir:'dist/client',emptyOutDir:true,rollupOptions:{input:{site:fileURLToPath(new URL('./index.html',import.meta.url)),admin:fileURLToPath(new URL('./admin.html',import.meta.url))}}},
});
