import { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { useTopo } from '../Estrutura';
import { FotoPorFazer, gsap, Imagem, irPara, Ligacao, Linhas, Revela, semMovimento } from '../kit';
import { fotos, pontos, type Ponto } from '../dados';

const L = 1774, A = 887;
// Zoom em múltiplos do mínimo (a aldeia inteira a cobrir o ecrã): um ponto aproxima pouco e o máximo fica
// perto do que a fotografia aguenta sem desfocar.
const ZOOM_PONTO = 1.45, ZOOM_MAX = 2.2;

type Camara = { ir: (p: Ponto) => void; afastar: () => void };

export default function Mapa() {
  useTopo('escuro');
  const [ativo, setAtivo] = useState<Ponto | null>(null);
  const camara = useRef<Camara>({ ir: () => {}, afastar: () => {} });
  const escolher = useCallback((p: Ponto) => { setAtivo(p); camara.current.ir(p); }, []);
  const fechar = useCallback(() => { setAtivo(null); camara.current.afastar(); }, []);
  const ligar = useCallback((c: Camara) => { camara.current = c; }, []);

  return (
    <>
      <section className="relative overflow-hidden bg-noite text-creme" aria-label="Mapa interativo do Ladoeiro">
        <Visor ativo={ativo} escolher={escolher} ligar={ligar} />
        <div className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-noite/80 to-transparent pb-24 pt-24 transition-opacity duration-500 lg:pt-28 ${ativo ? 'max-md:opacity-0' : ''}`}>
          <div className="contentor">
            <Linhas as="h1" imediato className="titulo t-grande max-w-[14ch]">Uma aldeia <em>para descobrir.</em></Linhas>
          </div>
        </div>
        <Painel ponto={ativo} fechar={fechar} />
      </section>

      <section className="bg-creme pb-40 pt-24 lg:pb-52 lg:pt-32">
        <div className="contentor">
          <Linhas as="h2" className="titulo t-grande max-w-[16ch]">O que há <em>à volta da casa.</em></Linhas>
          <ul className="mt-16 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {pontos.map(p => (
              <li key={p.id}>
                {p.foto ? <Revela foto={p.foto} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" className="aspect-[4/3] rounded-[2px]" />
                  : <FotoPorFazer nome={p.nome} className="aspect-[4/3]" />}
                <h3 className="titulo t-pequena mt-6">{p.nome}</h3>
                <p className="mt-1 text-sm font-medium text-musgo">{p.tipo}</p>
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
  const [aviso, setAviso] = useState(true);
  const [dica, setDica] = useState(false);
  const api = useRef<{ zoom: (k: number) => void }>({ zoom: () => {} });

  useEffect(() => {
    const v = vista.current!, m = mundo.current!;
    // folga: espaço em píxeis que a câmara pode descer além do fundo da imagem (fica escondido por baixo do cartão no telemóvel).
    const cam = { cx: L / 2, cy: A / 2, s: 1, folga: 0 };
    let afastado = true;
    let viagem: gsap.core.Tween | null = null;
    const W = () => v.clientWidth, H = () => v.clientHeight;
    const minS = () => Math.max(W() / L, H() / A);
    const limitar = () => {
      cam.s = Math.min(minS() * ZOOM_MAX, Math.max(minS(), cam.s));
      const mx = W() / (2 * cam.s), my = H() / (2 * cam.s);
      cam.cx = Math.min(L - mx, Math.max(mx, cam.cx));
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
    const voar = (cx: number, cy: number, s: number, duracao: number, ease = 'power3.inOut', folga = cam.folga) => {
      parar();
      if (semMovimento()) { Object.assign(cam, { cx, cy, s, folga }); desenhar(); return; }
      camada(true);
      viagem = gsap.to(cam, { cx, cy, s, folga, duration: duracao, ease, onUpdate: desenhar, onComplete: () => { viagem = null; camada(false); } });
    };
    // No computador o ponto fica à esquerda do painel. No telemóvel fica a meio do espaço livre entre o
    // cabeçalho e o cartão, medido depois de o cartão mostrar o novo ponto.
    const ir = (p: Ponto) => {
      afastado = false;
      const s = Math.max(cam.s, minS() * ZOOM_PONTO);
      if (W() >= 768) { voar(p.x + Math.min(200, W() * 0.15) / s, p.y, s, 1.6, 'power3.inOut', 0); return; }
      requestAnimationFrame(() => {
        const cartao = v.closest('section')?.querySelector('aside');
        const tapado = (cartao?.getBoundingClientRect().height ?? H() * 0.5) + 16;
        const alvoY = (72 + H() - tapado) / 2;
        voar(p.x, p.y + (H() / 2 - alvoY) / s, s, 1.6, 'power3.inOut', tapado);
      });
    };
    const afastar = () => { afastado = true; voar(cam.cx, cam.cy, minS(), 1.4, 'power3.inOut', 0); };
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

    const esconder = () => setAviso(false);
    const toques = new Map<number, [number, number]>();
    let dist0 = 0, s0 = 1;
    const baixo = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      v.setPointerCapture(e.pointerId); toques.set(e.pointerId, [e.clientX, e.clientY]);
      parar(); camada(true); v.dataset.agarra = ''; esconder();
      if (toques.size === 2) { const [a, b] = [...toques.values()]; dist0 = Math.hypot(a[0] - b[0], a[1] - b[1]); s0 = cam.s; }
    };
    const mexe = (e: PointerEvent) => {
      const ant = toques.get(e.pointerId);
      if (!ant) return;
      toques.set(e.pointerId, [e.clientX, e.clientY]);
      const r = v.getBoundingClientRect();
      if (toques.size === 1) { cam.cx -= (e.clientX - ant[0]) / cam.s; cam.cy -= (e.clientY - ant[1]) / cam.s; afastado = false; desenhar(); }
      else if (toques.size === 2) {
        const [a, b] = [...toques.values()];
        zoomEm((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, s0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / dist0);
      }
    };
    const larga = (e: PointerEvent) => { toques.delete(e.pointerId); if (!toques.size) { delete v.dataset.agarra; camada(false); } };
    // A roda sozinha continua a descer a página; com Ctrl (ou o gesto de beliscar do trackpad) aproxima.
    let tempoDica = 0, tempoRoda = 0;
    const roda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) { setDica(true); clearTimeout(tempoDica); tempoDica = window.setTimeout(() => setDica(false), 1600); return; }
      e.preventDefault(); e.stopPropagation(); esconder(); parar(); camada(true);
      clearTimeout(tempoRoda); tempoRoda = window.setTimeout(() => camada(false), 200);
      const r = v.getBoundingClientRect();
      zoomEm(e.clientX - r.left, e.clientY - r.top, cam.s * Math.exp(-e.deltaY * 0.01));
    };
    v.addEventListener('pointerdown', baixo);
    v.addEventListener('pointermove', mexe);
    v.addEventListener('pointerup', larga);
    v.addEventListener('pointercancel', larga);
    v.addEventListener('wheel', roda, { passive: false });
    // Só reage a mudanças reais de tamanho e não corta uma viagem a meio (cada fotograma já se ajusta).
    let tamanho = `${W()}x${H()}`;
    const redimensiona = () => {
      const t = `${W()}x${H()}`;
      if (t === tamanho) return;
      tamanho = t;
      if (viagem) return;
      if (afastado) cam.s = minS();
      desenhar();
    };
    const observa = new ResizeObserver(redimensiona);
    observa.observe(v);

    // Abre com a aldeia inteira; a imagem assenta devagar até ao zoom mínimo.
    cam.s = minS() * (semMovimento() ? 1 : 1.08);
    desenhar();
    voar(L / 2, A / 2, minS(), 2.4, 'expo.out');
    return () => {
      parar(); clearTimeout(tempoDica); clearTimeout(tempoRoda); observa.disconnect();
      v.removeEventListener('pointerdown', baixo); v.removeEventListener('pointermove', mexe);
      v.removeEventListener('pointerup', larga); v.removeEventListener('pointercancel', larga);
      v.removeEventListener('wheel', roda);
    };
  }, [ligar]);

  const zoom = (k: number) => api.current.zoom(k);
  return (
    <div className="relative h-dvh min-h-[32rem]">
      <div ref={vista} className="absolute inset-0 cursor-grab touch-none overflow-hidden select-none data-[agarra]:cursor-grabbing">
        <div ref={mundo} className="absolute left-0 top-0 origin-top-left" style={{ width: L, height: A }}>
          <Imagem foto={fotos.aldeia} prioridade sizes="1774px" className="pointer-events-none h-full w-full" />
          {pontos.map(p => (
            <button key={p.id} type="button" onClick={() => escolher(p)} aria-pressed={ativo?.id === p.id}
              className="group absolute origin-bottom [transform:translate(-50%,-100%)_scale(var(--inv,1))]"
              style={{ left: p.x, top: p.y }}>
              <span className={`mb-2 block whitespace-nowrap bg-noite/85 px-3 py-1.5 text-[0.8rem] font-medium text-creme transition-[opacity,transform] duration-300 ease-(--ease-sai) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ${ativo?.id === p.id || p.id === 'casa' ? 'opacity-100' : 'translate-y-1 opacity-0'}`}>{p.nome}</span>
              <span className={`relative mx-auto block size-5 rounded-full border-4 border-creme shadow-[0_2px_10px_rgb(0_0_0/0.45)] ${p.id === 'casa' ? 'bg-ocre' : 'bg-telha'}`}>
                <span className="absolute inset-[-4px] animate-ping rounded-full border-2 border-creme/60 motion-reduce:hidden" />
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-noite/70 to-transparent" />
      <p className={`pointer-events-none absolute bottom-6 left-4 right-24 text-sm text-creme/90 transition-opacity duration-700 sm:left-8 ${aviso ? 'opacity-100' : 'opacity-0'}`}>
        Arraste para explorar e toque nos pontos. Para aproximar, use os botões ou dois dedos.
      </p>
      <p role="status" className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-noite/85 px-5 py-3 text-sm transition-opacity duration-300 ${dica ? 'opacity-100' : 'opacity-0'}`}>
        Use Ctrl + roda do rato para aproximar o mapa
      </p>
      <div className="absolute bottom-6 right-4 flex flex-col gap-2 sm:right-8">
        <button type="button" onClick={() => zoom(1.35)} aria-label="Aproximar" className="grid size-11 place-items-center border border-musgo/20 bg-creme text-musgo hover:bg-linho"><Plus size={20} aria-hidden /></button>
        <button type="button" onClick={() => zoom(1 / 1.35)} aria-label="Afastar" className="grid size-11 place-items-center border border-musgo/20 bg-creme text-musgo hover:bg-linho"><Minus size={20} aria-hidden /></button>
      </div>
    </div>
  );
}

function Painel({ ponto, fechar }: { ponto: Ponto | null; fechar: () => void }) {
  const [mostrado, setMostrado] = useState<Ponto | null>(ponto);
  // Ao fechar, o cartão continua a mostrar o último ponto enquanto desliza para fora.
  useEffect(() => { if (ponto) setMostrado(ponto); }, [ponto]);
  const p = ponto ?? mostrado;
  return (
    <aside aria-live="polite" aria-label={p ? p.nome : undefined}
      className={`absolute bottom-4 left-4 right-4 z-10 flex max-h-[70svh] flex-col overflow-hidden rounded-[4px] bg-creme text-terra shadow-[0_30px_60px_-20px_rgb(0_0_0/0.55)] transition-transform duration-700 ease-(--ease-sai) md:bottom-auto md:left-auto md:right-8 md:top-24 md:w-[22rem] md:max-h-[calc(100svh-8rem)] ${ponto ? 'translate-y-0 md:translate-x-0' : 'translate-y-[calc(100%+2rem)] md:translate-x-[calc(100%+3rem)] md:translate-y-0'}`}>
      {p && (
        <>
          <button type="button" onClick={fechar} aria-label="Fechar" className="absolute right-3 top-3 z-10 grid size-10 place-items-center bg-creme/90 hover:bg-palha"><X size={20} aria-hidden /></button>
          {/* A margem fica num bloco interior: no fim do texto há sempre o mesmo espaço que dos lados, mesmo quando o cartão tem de deslizar. */}
          <div data-cartao className="min-h-0 overflow-y-auto overscroll-contain">
            <div className="p-6">
              {p.foto ? <div className="mb-5 aspect-[16/10] overflow-hidden rounded-[2px] bg-palha md:aspect-[4/3]"><Imagem foto={p.foto} sizes="22rem" className="h-full w-full object-cover" /></div>
                : <FotoPorFazer nome={p.nome} className="mb-5 aspect-[16/10] md:aspect-[4/3]" />}
              <h2 className="titulo t-pequena pr-8">{p.nome}</h2>
              <p className="mt-1 text-sm font-medium text-musgo">{p.tipo}</p>
              <p className="mt-4 leading-relaxed">{p.texto}</p>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
