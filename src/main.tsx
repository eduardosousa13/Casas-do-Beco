import {StrictMode} from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Páginas interiores chegam já escritas (pré-render na build): o React liga-se ao HTML que lá está.
// A página inicial (e o --dev) chega vazia e é desenhada aqui.
const raiz=document.getElementById('root')!;
(window as typeof window & {__cdbArrancou?:boolean}).__cdbArrancou=true;
const app=<StrictMode><App /></StrictMode>;
if(raiz.firstElementChild)hydrateRoot(raiz,app,{onRecoverableError:(e)=>console.error('Hidratação:',e)});
else createRoot(raiz).render(app);
