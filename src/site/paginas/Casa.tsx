import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTopo } from '../Estrutura';
import { gsap, Imagem, Ligacao, Linhas, prenderScroll, semMovimento, useAnimacao } from '../kit';
import { fotos, type Foto } from '../dados';

// Só fotografias: a ordem segue uma visita à casa, da rua aos quartos.
const galeria: { foto: Foto; legenda: string }[] = [
  { foto: fotos.fachada, legenda: 'A rua e a porta' },
  { foto: fotos.entrada, legenda: 'Entrada' },
  { foto: fotos.cozinha, legenda: 'Cozinha' },
  { foto: fotos.quarto, legenda: 'Quarto' },
  { foto: fotos.escada, legenda: 'Escada' },
  { foto: fotos.janela, legenda: 'Janela do quarto' },
  { foto: fotos.banho, legenda: 'Casa de banho' },
  { foto: fotos.placa, legenda: 'Pormenor' },
];

export default function Casa() {
  useTopo('claro');
  const [aberta, setAberta] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useAnimacao(() => {
    if (semMovimento()) return;
    // Cada fotografia abre como uma cortina ao entrar no ecrã; as colunas sobem a velocidades diferentes.
    gsap.utils.toArray<HTMLElement>('[data-foto]').forEach(el => {
      gsap.fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
      gsap.fromTo(el.querySelector('img'), { scale: 1.2 }, { scale: 1, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
  }, { scope: ref });

  return (
    <div ref={ref} className="bg-linho pb-40 pt-32 lg:pb-52 lg:pt-44">
      <div className="contentor">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <Linhas as="h1" imediato className="titulo t-gigante">A <em>casa</em></Linhas>
          <p className="max-w-[34ch] text-terra/80">Entrada, cozinha, quartos e casa de banho. Toque numa fotografia para a ver maior.</p>
        </div>

        <ul className="mt-16 grid grid-cols-2 gap-3 sm:gap-5 lg:mt-24 lg:grid-cols-12 lg:gap-6">
          {galeria.map((g, i) => (
            <li key={g.foto.nome} className={lugar[i]}>
              <button type="button" onClick={() => setAberta(i)} className="group block w-full text-left" aria-label={`Ver maior: ${g.legenda}`}>
                <div data-foto className={`relative overflow-hidden rounded-[2px] bg-palha ${g.foto.a > g.foto.l ? 'aspect-[3/4]' : 'aspect-[4/3]'} ${i === 0 ? 'lg:aspect-[16/9]' : ''}`}>
                  <Imagem foto={g.foto} sizes={i === 0 ? '100vw' : '(min-width: 1024px) 40vw, 50vw'} className="h-full w-full object-cover transition-transform duration-[1.2s] ease-(--ease-sai) group-hover:scale-[1.04]" />
                </div>
                <span className="mt-3 block text-sm text-terra/80">{g.legenda}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-24 flex flex-wrap items-end justify-between gap-8 border-t border-terra/15 pt-10">
          <p className="titulo t-media max-w-[18ch]">Gostou? <em>Escolha as datas.</em></p>
          <Ligacao para="/reservas" principal>Reservar</Ligacao>
        </div>
      </div>
      <Visor itens={galeria} indice={aberta} mudar={setAberta} />
    </div>
  );
}

// Posição de cada fotografia na grelha de 12 colunas do computador (no telemóvel são 2 colunas).
const lugar = [
  'col-span-2 lg:col-span-12',
  'lg:col-span-5',
  'lg:col-span-4 lg:col-start-7 lg:mt-24',
  'col-span-2 lg:col-span-7 lg:col-start-2 lg:mt-8',
  'lg:col-span-3 lg:col-start-10 lg:mt-24',
  'lg:col-span-3 lg:col-start-2 lg:mt-8',
  'lg:col-span-4 lg:col-start-6 lg:mt-24',
  'lg:col-span-3 lg:col-start-10',
];

function Visor({ itens, indice, mudar }: { itens: { foto: Foto; legenda: string }[]; indice: number | null; mudar: (i: number | null) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (indice !== null && !d.open) { d.showModal(); prenderScroll(true); }
    if (indice === null && d.open) d.close();
  }, [indice]);
  useEffect(() => {
    if (indice === null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') mudar((indice + 1) % itens.length);
      if (e.key === 'ArrowLeft') mudar((indice - 1 + itens.length) % itens.length);
    };
    addEventListener('keydown', tecla);
    return () => removeEventListener('keydown', tecla);
  }, [indice, itens.length, mudar]);

  const atual = indice === null ? null : itens[indice];
  return (
    <dialog ref={ref} aria-label="Fotografia ampliada" data-lenis-prevent onClose={() => { prenderScroll(false); mudar(null); }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-noite/95 p-0 text-creme backdrop:bg-noite/70">
      {atual && (
        <div className="grid h-full grid-rows-[auto_1fr_auto]">
          <div className="contentor flex h-[4.5rem] items-center justify-between">
            <span className="numeros text-sm text-creme/75">{indice! + 1} / {itens.length}</span>
            <button type="button" onClick={() => mudar(null)} className="flex items-center gap-2 py-3"><X size={22} strokeWidth={1.4} aria-hidden /> Fechar</button>
          </div>
          <div className="relative min-h-0 px-4 sm:px-20">
            <Imagem key={atual.foto.nome} foto={atual.foto} sizes="100vw" className="mx-auto h-full w-auto max-w-full object-contain" />
            <button type="button" onClick={() => mudar((indice! - 1 + itens.length) % itens.length)} aria-label="Fotografia anterior"
              className="absolute left-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center border border-creme/30 bg-noite/40 hover:bg-creme/15 sm:left-6"><ChevronLeft aria-hidden /></button>
            <button type="button" onClick={() => mudar((indice! + 1) % itens.length)} aria-label="Fotografia seguinte"
              className="absolute right-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center border border-creme/30 bg-noite/40 hover:bg-creme/15 sm:right-6"><ChevronRight aria-hidden /></button>
          </div>
          <p className="contentor py-6 text-center text-creme/85">{atual.legenda}</p>
        </div>
      )}
    </dialog>
  );
}
