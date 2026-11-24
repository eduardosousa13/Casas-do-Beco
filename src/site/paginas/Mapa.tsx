import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, Minus, Plus, X } from 'lucide-react';
import { useTopo } from '../Estrutura';
import { PinoCasa } from '../Logo';
import { PostalComoChegar } from '../ComoChegar';
import { FotoPorFazer, gsap, Imagem, irPara, Ligacao, Linhas, Revela, semMovimento } from '../kit';
import { fotos, pontos, type Ponto } from '../dados';

const L = 1774, A = 887;
// Zoom em múltiplos do mínimo (a aldeia inteira a cobrir o ecrã): um ponto aproxima pouco e o máximo fica
// abaixo do ponto em que a fotografia começa a desfocar.
const ZOOM_PONTO = 1.35, ZOOM_MAX = 1.6;
// Abrir e fechar um ponto: o painel e a câmara usam a mesma duração e a mesma curva, a começar no mesmo
// fotograma. Assim o mapa desliza logo enquanto o painel entra, e a parte da câmara que passa além da
// fotografia (folga) fica sempre escondida por baixo do painel, também a fechar.
// Fechar demora um pouco mais: o mapa recua até à aldeia inteira, um caminho maior do que aproximar.
const VIAGEM = 1.2, VIAGEM_FECHO = 1.5, CURVA = 'power3.out';

// Enquadramento ao abrir a página, sempre no zoom mínimo (fechar um ponto volta à vista anterior ao clique):
// - ecrã deitado: encostado à esquerda da fotografia, para a Capela e a Casa Santos, os pontos mais
//   afastados, ficarem à vista;
// - ecrã em pé: centrado na Igreja Matriz, nas Casas do Beco e no Festival da Melancia.
const EM_PE = ['igreja', 'casa', 'festival'];
const centroEmPe = (() => {
  const xs = pontos.filter(p => EM_PE.includes(p.id)).map(p => p.x);
  return xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : L / 2;
})();

type Camara = { ir: (p: Ponto) => void; afastar: () => void };

export default function Mapa() {
  useTopo('escuro');
  const [ativo, setAtivo] = useState<Ponto | null>(null);
  const camara = useRef<Camara>({ ir: () => {}, afastar: () => {} });
  const escolher = useCallback((p: Ponto) => { setAtivo(p); camara.current.ir(p); }, []);
  const fechar = useCallback(() => { setAtivo(null); camara.current.afastar(); }, []);
  const ligar = useCallback((c: Camara) => { camara.current = c; }, []);
  // Com o painel aberto o botão Reservar do cabeçalho fica por cima do bege e passa a verde (index.css).
  useEffect(() => {
    const html = document.documentElement;
    if (ativo) html.dataset.mapaAberto = ''; else delete html.dataset.mapaAberto;
    return () => { delete html.dataset.mapaAberto; };
  }, [ativo]);

  return (
    <>
      <section className="relative overflow-hidden bg-noite text-creme" aria-label="Mapa interativo do Ladoeiro">
        <Visor ativo={ativo} escolher={escolher} ligar={ligar} />
        <div className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-noite/80 to-transparent pb-24 pt-24 transition-opacity duration-500 lg:pt-28 ${ativo ? 'telefone:opacity-0' : ''}`}>
          <div className="contentor">
            <Linhas as="h1" imediato className="titulo t-grande max-w-[14ch]">Uma aldeia <em>para descobrir.</em></Linhas>
          </div>
        </div>
        <Painel ponto={ativo} fechar={fechar} />
        <VerTudo escondido={!!ativo} />
        <Aviso />
      </section>

      <PostalComoChegar />

      <section id="lugares" className="scroll-mt-16 bg-creme pb-40 pt-24 lg:pb-52 lg:pt-32">
        <div className="contentor">
          <Linhas as="h2" className="titulo t-grande max-w-[16ch]">O que há <em>à volta da casa.</em></Linhas>
          <ul className="mt-16 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {pontos.map(p => (
              <li key={p.id}>
                {p.foto ? <Revela foto={p.foto} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" className="aspect-[4/3] rounded-[2px]" />
                  : <FotoPorFazer nome={p.nome} className="aspect-[4/3]" />}
                <h3 className="titulo t-pequena mt-6">{p.nome}</h3>
                <p className="mt-3 text-terra/85">{p.texto}</p>
                <button type="button" onClick={() => { escolher(p); irPara(0, true); }}
                  className="mt-4 text-sm font-medium underline underline-offset-4 hover:text-musgo">Ver no mapa</button>
              </li>
            ))}
          </ul>
          <div className="mt-24 flex flex-wrap items-end justify-between gap-8 border-t border-terra/15 pt-10">
            <p className="titulo t-media max-w-[20ch]">Ficar no meio da aldeia <em>muda a viagem.</em></p>
            <Ligacao para="/reservas" principal>Reservar</Ligacao>
          </div>
        </div>
      </section>
    </>
  );
}

// Fotografia aérea que se arrasta e aproxima (rato, roda com Ctrl, dois dedos, botões).
// A câmara guarda o ponto da imagem que está no centro do ecrã e a escala; as viagens são do GSAP,
// para poderem ser interrompidas a meio (arrastar durante uma viagem continua dali).
function Visor({ ativo, escolher, ligar }: { ativo: Ponto | null; escolher: (p: Ponto) => void; ligar: (c: Camara) => void }) {
  const vista = useRef<HTMLDivElement>(null);
  const mundo = useRef<HTMLDivElement>(null);
  const api = useRef<{ zoom: (k: number) => void }>({ zoom: () => {} });

  useEffect(() => {
    const v = vista.current!, m = mundo.current!;
    // folga / folgaX: espaço em píxeis que a câmara pode passar além do fundo (telemóvel) ou da direita
    // (computador) da imagem; fica escondido por baixo do cartão.
    const cam = { cx: L / 2, cy: A / 2, s: 1, folga: 0, folgaX: 0 };
    let afastado = true;
    // Vista que a pessoa tinha antes de abrir um ponto; fechar o painel volta a ela. Mudar de ponto com o
    // painel aberto não a substitui. Se ainda estava no enquadramento inicial (ou a assentar nele), guarda-se
    // o enquadramento inicial e não um fotograma a meio da animação de abertura.
    let antes: { cx: number; cy: number; s: number; afastado: boolean } | null = null;
    let viagem: gsap.core.Tween | null = null;
    const W = () => v.clientWidth, H = () => v.clientHeight;
    const minS = () => Math.max(W() / L, H() / A);
    // Centro horizontal do enquadramento inicial; o limite da câmara encosta-o à margem quando for preciso.
    const inicioX = () => (W() > H() ? 0 : centroEmPe);
    const limitar = () => {
      cam.s = Math.min(minS() * ZOOM_MAX, Math.max(minS(), cam.s));
      const mx = W() / (2 * cam.s), my = H() / (2 * cam.s);
      cam.cx = Math.min(L - mx + cam.folgaX / cam.s, Math.max(mx, cam.cx));
      cam.cy = Math.min(A - my + cam.folga / cam.s, Math.max(my, cam.cy));
    };
    const desenhar = () => {
      limitar();
      const x = W() / 2 - cam.cx * cam.s, y = H() / 2 - cam.cy * cam.s;
      m.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${cam.s})`;
      m.style.setProperty('--inv', String(1 / cam.s));
    };
    // Durante o movimento a imagem fica numa camada da placa gráfica; parada, o navegador volta a
    // desenhá-la à escala certa, com o máximo de nitidez.
    const camada = (sim: boolean) => { m.style.willChange = sim ? 'transform' : 'auto'; };
    const parar = () => { viagem?.kill(); viagem = null; };
    // As viagens animam o que se vê no ecrã (deslocamento da imagem e escala), entre dois enquadramentos já
    // dentro dos limites. Os limites são lineares nestes valores, por isso cada fotograma intermédio também
    // cabe e nada é empurrado a meio do caminho. Antes animava-se o centro e a escala em separado; ao afastar,
    // o limite ia corrigindo a imagem a cada fotograma e o mapa recuava aos solavancos, com um eixo a chegar
    // muito antes do outro.
    type Vista = { x: number; y: number; s: number; folga: number; folgaX: number };
    const vistaAtual = (): Vista => ({ x: W() / 2 - cam.cx * cam.s, y: H() / 2 - cam.cy * cam.s, s: cam.s, folga: cam.folga, folgaX: cam.folgaX });
    const aplicar = (e: Vista) => {
      Object.assign(cam, { s: e.s, cx: (W() / 2 - e.x) / e.s, cy: (H() / 2 - e.y) / e.s, folga: e.folga, folgaX: e.folgaX });
      desenhar();
    };
    const voar = (cx: number, cy: number, s: number, duracao: number, ease = 'power3.inOut', folga = cam.folga, folgaX = cam.folgaX) => {
      parar();
      const atual = { ...cam };
      Object.assign(cam, { cx, cy, s, folga, folgaX }); limitar();
      const fim = vistaAtual();
      Object.assign(cam, atual);
      if (semMovimento()) { aplicar(fim); return; }
      camada(true);
      const e = vistaAtual();
      viagem = gsap.to(e, { ...fim, duration: duracao, ease, onUpdate: () => aplicar(e), onComplete: () => { viagem = null; camada(false); } });
    };
    // No computador o ponto fica à esquerda do painel. No telemóvel fica a meio do espaço livre entre o
    // cabeçalho e o cartão, medido depois de o cartão mostrar o novo ponto.
    const ir = (p: Ponto) => {
      antes ??= afastado ? { cx: inicioX(), cy: A / 2, s: minS(), afastado: true } : { cx: cam.cx, cy: cam.cy, s: cam.s, afastado: false };
      afastado = false;
      const s = Math.max(cam.s, minS() * ZOOM_PONTO);
      if (W() >= 768) {
        const cartao = v.closest('section')?.querySelector('aside');
        const tapado = cartao?.offsetWidth ?? 384;
        voar(p.x + tapado / 2 / s, p.y, s, VIAGEM, CURVA, 0, tapado);
        return;
      }
      requestAnimationFrame(() => {
        const cartao = v.closest('section')?.querySelector('aside');
        const tapado = cartao?.offsetHeight ?? H() * 0.5;
        const alvoY = (64 + H() - tapado) / 2;
        voar(p.x, p.y + (H() / 2 - alvoY) / s, s, VIAGEM, CURVA, tapado, 0);
      });
    };
    const afastar = () => {
      const v = antes ?? { cx: inicioX(), cy: A / 2, s: minS(), afastado: true };
      antes = null; afastado = v.afastado;
      voar(v.cx, v.cy, v.s, VIAGEM_FECHO, CURVA, 0, 0);
    };
    ligar({ ir, afastar });
    api.current.zoom = k => {
      afastado = false;
      const s = Math.min(minS() * ZOOM_MAX, Math.max(minS(), cam.s * k));
      voar(cam.cx, cam.cy, s, 0.9, 'power2.inOut');
    };
    // Aproximar mantendo parado o ponto da imagem que está debaixo do cursor (ou entre os dedos).
    const zoomEm = (px: number, py: number, s: number) => {
      const ix = cam.cx + (px - W() / 2) / cam.s, iy = cam.cy + (py - H() / 2) / cam.s;
      cam.s = Math.min(minS() * ZOOM_MAX, Math.max(minS(), s));
      cam.cx = ix - (px - W() / 2) / cam.s; cam.cy = iy - (py - H() / 2) / cam.s;
      afastado = false; desenhar();
    };

    const toques = new Map<number, [number, number]>();
    let dist0 = 0, s0 = 1;
    // Um toque que começa num ponto fica pendente: se o dedo andar mais de 8 px é um arrasto do mapa (o
    // navegador puxa os toques próximos para o ponto, e sem isto não se conseguia arrastar perto dele);
    // se não andar, é um toque normal e abre o ponto.
    let pendente: number | null = null, arrastou = false;
    const baixo = (e: PointerEvent) => {
      arrastou = false;
      const botao = (e.target as HTMLElement).closest('button');
      if (botao && !m.contains(botao)) return;
      toques.set(e.pointerId, [e.clientX, e.clientY]);
      if (botao) { pendente = e.pointerId; return; }
      v.setPointerCapture(e.pointerId);
      parar(); camada(true); v.dataset.agarra = '';
      if (toques.size === 2) { const [a, b] = [...toques.values()]; dist0 = Math.hypot(a[0] - b[0], a[1] - b[1]); s0 = cam.s; }
    };
    const mexe = (e: PointerEvent) => {
      const ant = toques.get(e.pointerId);
      if (!ant) return;
      if (e.pointerId === pendente) {
        if (Math.hypot(e.clientX - ant[0], e.clientY - ant[1]) < 8) return;
        pendente = null; arrastou = true;
        v.setPointerCapture(e.pointerId); parar(); camada(true); v.dataset.agarra = '';
      }
      toques.set(e.pointerId, [e.clientX, e.clientY]);
      const r = v.getBoundingClientRect();
      if (toques.size === 1) { cam.cx -= (e.clientX - ant[0]) / cam.s; cam.cy -= (e.clientY - ant[1]) / cam.s; afastado = false; desenhar(); }
      else if (toques.size === 2) {
        const [a, b] = [...toques.values()];
        zoomEm((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, s0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / dist0);
      }
    };
    const larga = (e: PointerEvent) => {
      if (e.pointerId === pendente) pendente = null;
      toques.delete(e.pointerId); if (!toques.size) { delete v.dataset.agarra; camada(false); }
    };
    // Depois de um arrasto que começou num ponto, o clique que o navegador ainda gera não abre nada.
    const clique = (e: MouseEvent) => { if (arrastou) { e.stopPropagation(); e.preventDefault(); arrastou = false; } };
    // A roda sozinha continua a descer a página; com Ctrl (ou o gesto de beliscar do trackpad) aproxima.
    let tempoRoda = 0;
    const roda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault(); e.stopPropagation(); parar(); camada(true);
      clearTimeout(tempoRoda); tempoRoda = window.setTimeout(() => camada(false), 200);
      const r = v.getBoundingClientRect();
      zoomEm(e.clientX - r.left, e.clientY - r.top, cam.s * Math.exp(-e.deltaY * 0.01));
    };
    v.addEventListener('pointerdown', baixo);
    v.addEventListener('pointermove', mexe);
    v.addEventListener('pointerup', larga);
    v.addEventListener('pointercancel', larga);
    v.addEventListener('click', clique, true);
    v.addEventListener('wheel', roda, { passive: false });
    // Só reage a mudanças reais de tamanho e não corta uma viagem a meio (cada fotograma já se ajusta).
    let tamanho = `${W()}x${H()}`;
    const redimensiona = () => {
      const t = `${W()}x${H()}`;
      if (t === tamanho) return;
      tamanho = t;
      if (viagem) return;
      if (afastado) Object.assign(cam, { s: minS(), cx: inicioX(), cy: A / 2 });
      desenhar();
    };
    const observa = new ResizeObserver(redimensiona);
    observa.observe(v);

    // Abre no enquadramento inicial; a imagem assenta devagar até ao zoom mínimo.
    Object.assign(cam, { cx: inicioX(), cy: A / 2, s: minS() * (semMovimento() ? 1 : 1.08) });
    desenhar();
    voar(inicioX(), A / 2, minS(), 2.4, 'expo.out');
    return () => {
      parar(); clearTimeout(tempoRoda); observa.disconnect();
      v.removeEventListener('pointerdown', baixo); v.removeEventListener('pointermove', mexe);
      v.removeEventListener('pointerup', larga); v.removeEventListener('pointercancel', larga); v.removeEventListener('click', clique, true);
      v.removeEventListener('wheel', roda);
    };
  }, [ligar]);

  const zoom = (k: number) => api.current.zoom(k);
  // Nunca mais alto do que o ecrã: com o telemóvel deitado o "Ver tudo" tem de ficar à vista, porque
  // arrastar em cima do mapa move o mapa e não a página.
  return (
    <div className="relative h-dvh min-h-[min(32rem,100dvh)]">
      <div ref={vista} className="absolute inset-0 cursor-grab touch-none overflow-hidden select-none data-[agarra]:cursor-grabbing">
        <div ref={mundo} className="absolute left-0 top-0 origin-top-left" style={{ width: L, height: A }}>
          <Imagem foto={fotos.aldeia} prioridade sizes="1774px" className="pointer-events-none h-full w-full" />
          {pontos.map(p => (
            <button key={p.id} type="button" onClick={() => escolher(p)} aria-pressed={ativo?.id === p.id}
              className="group absolute origin-bottom [transform:translate(-50%,-100%)_scale(var(--inv,1))]"
              style={{ left: p.x, top: p.y }}>
              {/* O nome fica por cima do ponto; perto das margens da fotografia encosta-se ao lado de dentro para não sair do ecrã. Invisível, não apanha toques: tapava o ponto vizinho. */}
              <span className={`pointer-events-none absolute bottom-full mb-2 block whitespace-nowrap bg-noite/85 ${p.x < 260 ? 'left-0' : p.x > L - 260 ? 'right-0' : 'left-1/2 -translate-x-1/2'} px-3 py-1.5 text-[0.8rem] font-medium text-creme transition-[opacity,transform] duration-300 ease-(--ease-sai) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ${ativo?.id === p.id ? 'opacity-100' : 'translate-y-1 opacity-0'}`}>{p.nome}</span>
              {p.id === 'casa' ? (
                <PinoCasa className="mx-auto block h-12 w-auto drop-shadow-[0_4px_8px_rgb(0_0_0/0.45)] transition-transform duration-300 ease-(--ease-sai) group-hover:-translate-y-1" />
              ) : (
                <span className="relative mx-auto block size-5 rounded-full border-4 border-creme bg-telha shadow-[0_2px_10px_rgb(0_0_0/0.45)]">
                  <span className="absolute inset-[-4px] animate-ping rounded-full border-2 border-creme/60 motion-reduce:hidden" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-noite/70 to-transparent" />
      {/* No computador ficam por cima do painel bege e passam a verde; no telemóvel o painel tapa-os. Com o
          telemóvel deitado (pouca altura) tapavam a fotografia do painel: aí deslizam para o lado do mapa. */}
      <div className={`absolute bottom-6 right-4 flex flex-col gap-2 transition-[right] duration-[1200ms] ease-[cubic-bezier(0.215,0.61,0.355,1)] sm:right-8 md:z-20 ${ativo ? '[@media(min-width:768px)_and_(max-height:500px)]:right-[25rem]' : ''}`}>
        <button type="button" onClick={() => zoom(1.35)} aria-label="Aproximar" className={`grid size-11 place-items-center border transition-colors duration-700 ${ativo ? 'border-musgo bg-musgo text-creme hover:bg-noite' : 'border-musgo/20 bg-creme text-musgo hover:bg-linho'}`}><Plus size={20} aria-hidden /></button>
        <button type="button" onClick={() => zoom(1 / 1.35)} aria-label="Afastar" className={`grid size-11 place-items-center border transition-colors duration-700 ${ativo ? 'border-musgo bg-musgo text-creme hover:bg-noite' : 'border-musgo/20 bg-creme text-musgo hover:bg-linho'}`}><Minus size={20} aria-hidden /></button>
      </div>
    </div>
  );
}

// Aviso único, igual em todos os aparelhos: aparece ao abrir a página, com o mapa um pouco desfocado por
// trás, e sai ao fim de uns segundos ou ao primeiro toque.
function Aviso() {
  const [visivel, setVisivel] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisivel(false), 2600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div onPointerDown={() => setVisivel(false)} aria-hidden={!visivel}
      className={`absolute inset-0 z-20 grid place-items-center bg-noite/25 px-6 backdrop-blur-[3px] transition-[opacity,backdrop-filter] duration-700 ease-(--ease-sai) ${visivel ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
      <p role="status" className={`max-w-[22rem] border border-creme/30 bg-noite/80 px-7 py-5 text-center text-creme transition-transform duration-700 ease-(--ease-sai) ${visivel ? 'translate-y-0' : 'translate-y-2'}`}>
        <span className="titulo block text-[1.5rem] leading-tight">Explore <em>a aldeia.</em></span>
        <span className="mt-2 block text-[0.95rem] text-creme/85">Arraste para mover o mapa e clique nos pontos.</span>
      </p>
    </div>
  );
}

// Sinal no fundo do mapa: leva à lista com todos os lugares, mais abaixo.
function VerTudo({ escondido }: { escondido: boolean }) {
  return (
    <button type="button" onClick={() => irPara(document.getElementById('lugares') ?? 0, true)}
      className={`group absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-creme transition-opacity duration-500 ${escondido ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
      <span className="text-[0.72rem] font-medium uppercase tracking-[0.22em]">Ver tudo</span>
      <span className="relative block h-9 w-px overflow-hidden bg-creme/30" aria-hidden>
        <span className="absolute inset-x-0 top-0 h-1/2 animate-[descer_2.2s_ease-in-out_infinite] bg-creme motion-reduce:animate-none" />
      </span>
      <ArrowDown size={14} strokeWidth={1.5} aria-hidden className="-mt-2 transition-transform duration-300 group-hover:translate-y-0.5" />
    </button>
  );
}

// Painel bege de alto a baixo do lado direito (computador) ou colado ao fundo (telemóvel): por baixo dele a
// câmara pode passar além da fotografia sem se ver o fundo verde. A entrada é do GSAP (--p de 0 a 1), com a
// mesma duração e curva da câmara. Desliza exatamente a sua largura (ou altura), tal como a folga da câmara,
// e a sombra apaga-se com ele, para nada ficar à vista quando está fechado.
function Painel({ ponto, fechar }: { ponto: Ponto | null; fechar: () => void }) {
  const [mostrado, setMostrado] = useState<Ponto | null>(ponto);
  const caixa = useRef<HTMLElement>(null);
  // Ao fechar, o painel continua a mostrar o último ponto enquanto desliza para fora.
  useEffect(() => { if (ponto) setMostrado(ponto); }, [ponto]);
  const aberto = !!ponto;
  useLayoutEffect(() => {
    const el = caixa.current!;
    gsap.killTweensOf(el);
    if (semMovimento()) gsap.set(el, { '--p': aberto ? 1 : 0 });
    else gsap.to(el, { '--p': aberto ? 1 : 0, duration: aberto ? VIAGEM : VIAGEM_FECHO, ease: CURVA });
  }, [aberto]);
  // Painel lateral: o Fechar fica na linha do Reservar, na margem do texto (32 px). Com o conteúdo do site
  // limitado a 92rem, em ecrãs largos o Reservar pode cair nesse sítio (1920 px); aí encosta-se logo a seguir.
  const [fecharX, setFecharX] = useState<number | null>(null);
  useLayoutEffect(() => {
    const medir = () => {
      const el = caixa.current, res = document.querySelector<HTMLElement>('header a[href="/reservas"]');
      if (!el || !res || innerWidth < 768) { setFecharX(null); return; }
      const esquerda = innerWidth - el.offsetWidth, r = res.getBoundingClientRect();
      const x = esquerda + 32, tam = 40, folga = 12;
      const choca = x < r.right + folga && x + tam > r.left - folga;
      setFecharX(choca ? Math.round(r.right + folga - esquerda) : 32);
    };
    medir();
    addEventListener('resize', medir);
    return () => removeEventListener('resize', medir);
  }, [aberto]);
  const p = ponto ?? mostrado;
  return (
    <aside ref={caixa} aria-live="polite" aria-label={p ? p.nome : undefined} aria-hidden={!aberto} inert={!aberto}
      style={{ '--p': 0 } as React.CSSProperties}
      className="absolute inset-x-0 bottom-0 z-10 flex max-h-[70svh] flex-col overflow-hidden rounded-t-[4px] bg-creme text-terra shadow-[0_-20px_50px_-20px_rgb(0_0_0/calc(0.5*var(--p)))] [transform:translateY(calc((1-var(--p))*100%))] md:inset-y-0 md:left-auto md:max-h-none md:w-[24rem] md:rounded-none md:shadow-[-30px_0_60px_-20px_rgb(0_0_0/calc(0.5*var(--p)))] md:[transform:translateX(calc((1-var(--p))*100%))]">
      {p && (
        <>
          {/* Telemóvel de pé: no canto da fotografia, verde transparente. Painel lateral: na linha do Reservar,
              alinhado com a margem do texto, com a mesma moldura fina. Em ambos enche de verde ao passar. */}
          <button type="button" onClick={fechar} aria-label="Fechar" style={fecharX != null ? { left: fecharX } : undefined}
            className="absolute right-3 top-3 z-10 grid size-10 place-items-center bg-musgo/55 text-creme backdrop-blur-[2px] transition-colors duration-300 hover:bg-musgo hover:text-creme focus-visible:bg-musgo focus-visible:text-creme md:left-8 md:right-auto md:top-3 md:border md:border-musgo/35 md:bg-transparent md:text-musgo md:hover:border-musgo md:hover:bg-musgo md:hover:text-creme"><X size={20} strokeWidth={1.5} aria-hidden /></button>
          {/* A margem fica num bloco interior: no fim do texto há sempre o mesmo espaço que dos lados, mesmo quando o painel tem de deslizar. */}
          <div data-cartao className="min-h-0 overflow-y-auto overscroll-contain">
            <div className="p-6 md:px-8 md:pb-36 md:pt-24">
              {p.foto ? <div className="mb-5 aspect-[16/10] overflow-hidden rounded-[2px] bg-palha md:aspect-[4/3]"><Imagem foto={p.foto} sizes="24rem" className="h-full w-full object-cover" /></div>
                : <FotoPorFazer nome={p.nome} className="mb-5 aspect-[16/10] md:aspect-[4/3]" />}
              <h2 className="titulo t-pequena pr-8">{p.nome}</h2>
              {/* 40px: os 16px de antes mais o lugar da antiga linha da categoria (20px + 4px), para o cartão manter a altura. */}
              <p className="mt-10 leading-relaxed">{p.texto}</p>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
