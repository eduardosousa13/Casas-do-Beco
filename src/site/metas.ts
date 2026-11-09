// Título, descrição e endereço canónico de cada página. O servidor escreve-os no HTML (para o Google e as
// pré-visualizações do WhatsApp/Facebook, que não correm JavaScript) e o site atualiza-os ao mudar de página.
export const SITE = 'https://www.casasdobeco.com';

type Meta = { titulo: string; descricao: string };
const metas: Record<string, Meta> = {
  '/': { titulo: 'Casas do Beco · Alojamento local no Ladoeiro', descricao: 'Alojamento local no Ladoeiro, Idanha-a-Nova, na Beira Baixa. Casas de aldeia de uma família da terra, entre a planície, as oliveiras e a melancia.' },
  '/casa': { titulo: 'A casa · Casas do Beco', descricao: 'Fotografias da casa: entrada, cozinha, quartos e casa de banho, numa rua sossegada do Ladoeiro.' },
  '/mapa': { titulo: 'Mapa do Ladoeiro · Casas do Beco', descricao: 'Mapa da aldeia do Ladoeiro com o que há à volta da casa: a Igreja Matriz, a Fonte Grande, o Largo do Cruzeiro, a piscina e o recinto da festa.' },
  '/tradicoes': { titulo: 'Tradições do Ladoeiro · Casas do Beco', descricao: 'A Procissão de Santa Catarina de Sena, o Festival da Melancia e a apanha: as alturas em que vale a pena estar no Ladoeiro.' },
  '/sobre-nos': { titulo: 'Sobre nós e contactos · Casas do Beco', descricao: 'Somos uma família do Ladoeiro. Fale connosco por e-mail, telefone ou WhatsApp.' },
  '/reservas': { titulo: 'Reservas · Casas do Beco', descricao: 'Para saber que datas temos livres, fale connosco por e-mail ou telefone. As reservas pelo site abrem em breve.' },
  '/termos': { titulo: 'Termos e condições · Casas do Beco', descricao: 'Termos e condições do alojamento local Casas do Beco, no Ladoeiro.' },
  '/privacidade': { titulo: 'Privacidade e cookies · Casas do Beco', descricao: 'Como as Casas do Beco tratam os dados pessoais e os cookies.' },
};
const naoEncontrada: Meta = { titulo: 'Página não encontrada · Casas do Beco', descricao: metas['/'].descricao };

export function metaDe(pathname: string) {
  const m = metas[pathname];
  return { ...(m ?? naoEncontrada), canonico: m ? SITE + pathname : null };
}

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// No servidor: troca no index.html o que é próprio de cada página.
export function comMeta(html: string, pathname: string) {
  const m = metaDe(pathname);
  const t = escapar(m.titulo), d = escapar(m.descricao);
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${d}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${t}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${d}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${m.canonico ?? SITE + '/'}`)
    .replace('</head>', m.canonico ? `<link rel="canonical" href="${m.canonico}" />\n  </head>` : '<meta name="robots" content="noindex" />\n  </head>');
}

// No navegador: o mesmo ao mudar de página sem recarregar.
export function aplicarMeta(pathname: string) {
  const m = metaDe(pathname);
  document.title = m.titulo;
  const definir = (sel: string, criar: () => HTMLElement, attr: string, valor: string | null) => {
    let el = document.head.querySelector<HTMLElement>(sel);
    if (valor === null) { el?.remove(); return; }
    if (!el) { el = criar(); document.head.appendChild(el); }
    el.setAttribute(attr, valor);
  };
  const meta = (k: string, v: string) => () => { const e = document.createElement('meta'); e.setAttribute(k, v); return e; };
  definir('meta[name="description"]', meta('name', 'description'), 'content', m.descricao);
  definir('meta[property="og:title"]', meta('property', 'og:title'), 'content', m.titulo);
  definir('meta[property="og:description"]', meta('property', 'og:description'), 'content', m.descricao);
  definir('meta[property="og:url"]', meta('property', 'og:url'), 'content', m.canonico ?? SITE + '/');
  definir('link[rel="canonical"]', () => { const e = document.createElement('link'); e.rel = 'canonical'; return e; }, 'href', m.canonico);
  definir('meta[name="robots"]', meta('name', 'robots'), 'content', m.canonico ? null : 'noindex');
}
