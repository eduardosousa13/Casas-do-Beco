// Pré-render das páginas públicas na build: o mesmo App, com o endereço fixo, convertido em HTML.
// O navegador recebe a página já escrita e o React liga-se a ela (hydrateRoot em main.tsx).
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { Rotas } from './App';

export function render(url: string) {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}><Rotas /></StaticRouter>
    </StrictMode>,
  );
}
