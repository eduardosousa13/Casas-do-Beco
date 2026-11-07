import { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { useTopo } from '../Estrutura';
import { FotoPorFazer, Imagem, Ligacao, Linhas, Revela, semMovimento } from '../kit';
import { fotos, pontos, type Ponto } from '../dados';

const L = 1774, A = 887;

export default function Mapa() {
  useTopo('escuro');
  const [ativo, setAtivo] = useState<Ponto | null>(null);
  const irPara = useRef<(p: Ponto) => void>(() => {});
  const escolher = useCallback((p: Ponto) => { setAtivo(p); irPara.current(p); }, []);
  const ligar = useCallback((f: (p: Ponto) => void) => { irPara.current = f; }, []);

  return (
    <>
      <section className="relative overflow-hidden bg-noite text-creme" aria-label="Mapa interativo do Ladoeiro">
        <Visor ativo={ativo} escolher={escolher} ligar={ligar} />
        <div className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-noite/80 to-transparent pb-24 pt-24 transition-opacity duration-500 lg:pt-28 ${ativo ? 'max-md:opacity-0' : ''}`}>
          <div className="contentor">
            <Linhas as="h1" imediato className="titulo t-grande max-w-[14ch]">Uma aldeia <em>para descobrir.</em></Linhas>
          </div>
        </div>
        <Painel ponto={ativo} fechar={() => setAtivo(null)} />
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
                <p className="mt-1 text-sm font-medium text-oliva">{p.tipo}</p>
                <p className="mt-3 text-terra/85">{p.texto}</p>
                <button type="button" onClick={() => { escolher(p); scrollTo({ top: 0, behavior: semMovimento() ? 'auto' : 'smooth' }); }}
                  className="mt-4 text-sm font-medium underline underline-offset-4 hover:text-musgo">Ver no mapa</button>
              </li>
            ))}
          </ul>
          <div className="mt-24 flex flex-wrap items-end justify-between gap-8 border-t border-terra/15 pt-10">
            <p className="titulo t-media max-w-[20ch]">Ficar no meio da aldeia <em>muda a viagem.</em></p>
            <Ligacao para="/reservas">Reservar</Ligacao>
          </div>
        </div>
      </section>
    </>
  );
}

// Fotografia aérea que se arrasta e aproxima (rato, roda com Ctrl, dois dedos, botões).
function Visor({ ativo, escolher, ligar }: { ativo: Ponto | null; escolher: (p: Ponto) => void; ligar: (f: (p: Ponto) => void) => void }) {
  const vista = useRef<HTMLDivElement>(null);
  const mundo = useRef<HTMLDivElement>(null);
  const [aviso, setAviso] = useState(true);
  const [dica, setDica] = useState(false);
  const api = useRef<{ zoomEm: (px: number, py: number, k: number, suave?: boolean) => void }>({ zoomEm: () => {} });

  useEffect(() => {
    const v = vista.current!, m = mundo.current!;
    let s = 1, x = 0, y = 0;
    const W = () => v.clientWidth, H = () => v.clientHeight;
    const minS = () => Math.max(W() / L, H() / A);
    const maxS = () => minS() * 3.2;
    const aplicar = () => {
      s = Math.min(maxS(), Math.max(minS(), s));
      x = Math.min(0, Math.max(W() - L * s, x));
      y = Math.min(0, Math.max(H() - A * s, y));
      m.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
      m.style.setProperty('--inv', String(1 / s));
    };
    const suave = (sim: boolean) => {
      m.style.transition = sim && !semMovimento() ? 'transform 1.4s cubic-bezier(.16,1,.3,1)' : 'none';
    };
    const zoomEm = (px: number, py: number, novo: number, sm = false) => {
      suave(sm);
      const k = Math.min(maxS(), Math.max(minS(), novo)) / s;
      x = px - (px - x) * k; y = py - (py - y) * k; s *= k; aplicar();
    };
    const centrar = (ix: number, iy: number, novo: number, sm = true) => {
      suave(sm);
      s = Math.min(maxS(), Math.max(minS(), novo));
      const largo = W() >= 768;
      // Com o painel aberto à direita, o ponto fica um pouco à esquerda do centro.
      x = W() / 2 - ix * s - (largo ? Math.min(200, W() * 0.15) : 0);
      y = H() / 2 - iy * s + (largo ? 0 : -H() * 0.16);
      aplicar();
    };
    api.current.zoomEm = (px, py, k, sm) => zoomEm(px, py, s * k, sm);
    ligar(p => centrar(p.x, p.y, Math.max(s, minS() * 1.9)));

    const esconder = () => setAviso(false);
    const toques = new Map<number, [number, number]>();
    let dist0 = 0, s0 = 1;
    const baixo = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      v.setPointerCapture(e.pointerId); toques.set(e.pointerId, [e.clientX, e.clientY]); suave(false); v.dataset.agarra = ''; esconder();
      if (toques.size === 2) { const [a, b] = [...toques.values()]; dist0 = Math.hypot(a[0] - b[0], a[1] - b[1]); s0 = s; }
    };
    const mexe = (e: PointerEvent) => {
      const ant = toques.get(e.pointerId);
      if (!ant) return;
      toques.set(e.pointerId, [e.clientX, e.clientY]);
      const r = v.getBoundingClientRect();
      if (toques.size === 1) { x += e.clientX - ant[0]; y += e.clientY - ant[1]; aplicar(); }
      else if (toques.size === 2) {
        const [a, b] = [...toques.values()];
        zoomEm((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, s0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / dist0);
      }
    };
    const larga = (e: PointerEvent) => { toques.delete(e.pointerId); if (!toques.size) delete v.dataset.agarra; };
    // A roda sozinha continua a descer a página; com Ctrl (ou o gesto de beliscar do trackpad) aproxima.
    let tempoDica = 0;
    const roda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) { setDica(true); clearTimeout(tempoDica); tempoDica = window.setTimeout(() => setDica(false), 1600); return; }
      e.preventDefault(); esconder();
      const r = v.getBoundingClientRect();
      zoomEm(e.clientX - r.left, e.clientY - r.top, s * Math.exp(-e.deltaY * 0.01));
    };
    v.addEventListener('pointerdown', baixo);
    v.addEventListener('pointermove', mexe);
    v.addEventListener('pointerup', larga);
    v.addEventListener('pointercancel', larga);
    v.addEventListener('wheel', roda, { passive: false });
    const redimensiona = () => { suave(false); aplicar(); };
    addEventListener('resize', redimensiona);

    // Entrada: a aldeia inteira e depois a câmara aproxima-se da casa.
    centrar(L / 2, A / 2, minS(), false);
    const t = window.setTimeout(() => centrar(1060, 360, minS() * 1.5), 350);
    return () => {
      clearTimeout(t); clearTimeout(tempoDica);
      v.removeEventListener('pointerdown', baixo); v.removeEventListener('pointermove', mexe);
      v.removeEventListener('pointerup', larga); v.removeEventListener('pointercancel', larga);
      v.removeEventListener('wheel', roda); removeEventListener('resize', redimensiona);
    };
  }, [ligar]);

  const zoom = (k: number) => { const v = vista.current!; api.current.zoomEm(v.clientWidth / 2, v.clientHeight / 2, k, true); };
  return (
    <div className="relative h-[100svh] min-h-[32rem]">
      <div ref={vista} className="absolute inset-0 cursor-grab touch-none overflow-hidden select-none data-[agarra]:cursor-grabbing">
        <div ref={mundo} className="absolute left-0 top-0 origin-top-left will-change-transform" style={{ width: L, height: A }}>
          <Imagem foto={fotos.aldeia} prioridade sizes="1774px" className="pointer-events-none h-full w-full" />
          {pontos.map(p => (
            <button key={p.id} type="button" onClick={() => escolher(p)} aria-pressed={ativo?.id === p.id}
              className="group absolute origin-bottom [transform:translate(-50%,-100%)_scale(var(--inv,1))]"
              style={{ left: p.x, top: p.y }}>
              <span className={`mb-2 block whitespace-nowrap rounded-full bg-noite/85 px-3 py-1.5 text-[0.8rem] font-medium text-creme transition-[opacity,transform] duration-300 ease-(--ease-sai) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ${ativo?.id === p.id || p.id === 'casa' ? 'opacity-100' : 'translate-y-1 opacity-0'}`}>{p.nome}</span>
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
      <p role="status" className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-noite/85 px-5 py-3 text-sm transition-opacity duration-300 ${dica ? 'opacity-100' : 'opacity-0'}`}>
        Use Ctrl + roda do rato para aproximar o mapa
      </p>
      <div className="absolute bottom-6 right-4 flex flex-col gap-2 sm:right-8">
        <button type="button" onClick={() => zoom(1.5)} aria-label="Aproximar" className="grid size-11 place-items-center rounded-full bg-creme text-musgo shadow-md hover:bg-linho"><Plus size={20} aria-hidden /></button>
        <button type="button" onClick={() => zoom(1 / 1.5)} aria-label="Afastar" className="grid size-11 place-items-center rounded-full bg-creme text-musgo shadow-md hover:bg-linho"><Minus size={20} aria-hidden /></button>
      </div>
    </div>
  );
}

function Painel({ ponto, fechar }: { ponto: Ponto | null; fechar: () => void }) {
  const [mostrado, setMostrado] = useState<Ponto | null>(ponto);
  useEffect(() => { if (ponto) setMostrado(ponto); }, [ponto]);
  const p = mostrado;
  return (
    <aside aria-live="polite" aria-label={p ? p.nome : undefined}
      className={`absolute bottom-4 left-4 right-4 z-10 max-h-[62svh] overflow-auto rounded-[4px] bg-creme p-6 text-terra shadow-[0_30px_60px_-20px_rgb(0_0_0/0.55)] transition-transform duration-700 ease-(--ease-sai) md:bottom-auto md:left-auto md:right-8 md:top-24 md:w-[22rem] md:max-h-[calc(100svh-8rem)] ${ponto ? 'translate-y-0 md:translate-x-0' : 'translate-y-[calc(100%+2rem)] md:translate-x-[calc(100%+3rem)] md:translate-y-0'}`}>
      {p && (
        <>
          <button type="button" onClick={fechar} aria-label="Fechar" className="absolute right-3 top-3 grid size-10 place-items-center rounded-full hover:bg-palha"><X size={20} aria-hidden /></button>
          {p.foto ? <div className="mb-5 aspect-[4/3] overflow-hidden rounded-[2px] bg-palha"><Imagem foto={p.foto} sizes="22rem" className="h-full w-full object-cover" /></div>
            : <FotoPorFazer nome={p.nome} className="mb-5 aspect-[4/3]" />}
          <h2 className="titulo t-pequena pr-8">{p.nome}</h2>
          <p className="mt-1 text-sm font-medium text-oliva">{p.tipo}</p>
          <p className="mt-4 leading-relaxed">{p.texto}</p>
        </>
      )}
    </aside>
  );
}
