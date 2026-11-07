import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { gsap, prenderScroll, semMovimento } from './kit';
import { Provisorio, TextoCancelamento, TextoPrivacidade, TextoTermos } from './paginas/Legal';

export type Separador = 'termos' | 'cancelamento' | 'privacidade';
const separadores: { id: Separador; nome: string }[] = [
  { id: 'termos', nome: 'Termos' },
  { id: 'cancelamento', nome: 'Cancelamento' },
  { id: 'privacidade', nome: 'Privacidade e cookies' },
];

// Janela com os textos legais, aberta a partir do rodapé. No telemóvel ocupa o ecrã; no computador é um
// painel central sobre a página escurecida.
export default function InfoLegal({ aberto, separador, mudar, fechar }: {
  aberto: boolean; separador: Separador; mudar: (s: Separador) => void; fechar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const corpo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) {
      d.showModal();
      prenderScroll(true);
      if (!semMovimento()) gsap.fromTo(d.firstElementChild, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out' });
    } else if (!aberto && d.open) {
      const acabar = () => { d.close(); prenderScroll(false); };
      if (semMovimento()) acabar();
      else gsap.to(d.firstElementChild, { y: 24, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: acabar });
    }
  }, [aberto]);
  useEffect(() => { corpo.current?.scrollTo({ top: 0 }); }, [separador]);

  return (
    <dialog ref={ref} aria-labelledby="info-legal-titulo" data-lenis-prevent
      onCancel={e => { e.preventDefault(); fechar(); }}
      onClick={e => { if (e.target === ref.current) fechar(); }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-noite/70 sm:open:grid sm:place-items-center">
      <div className="flex h-full w-full flex-col bg-linho text-terra sm:h-[min(52rem,88dvh)] sm:w-[min(48rem,92vw)] sm:shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)]">
        <div className="flex items-start justify-between gap-6 border-b border-terra/15 px-6 pb-5 pt-6 sm:px-10 sm:pt-9">
          <h2 id="info-legal-titulo" className="titulo t-media">Informação <em>legal</em></h2>
          <button type="button" onClick={fechar} className="flex items-center gap-2 py-2 text-[0.95rem] font-medium">
            <X size={20} strokeWidth={1.4} aria-hidden /> Fechar
          </button>
        </div>
        <div role="tablist" aria-label="Textos legais" className="flex gap-6 overflow-x-auto border-b border-terra/15 px-6 [scrollbar-width:none] sm:px-10">
          {separadores.map(s => (
            <button key={s.id} type="button" role="tab" id={`sep-${s.id}`} aria-selected={separador === s.id} aria-controls="info-legal-texto"
              onClick={() => mudar(s.id)}
              className={`-mb-px shrink-0 border-b-2 py-4 text-[0.95rem] font-medium transition-colors ${separador === s.id ? 'border-musgo text-musgo' : 'border-transparent text-terra/80 hover:text-terra'}`}>
              {s.id === 'privacidade' ? <>Privacidade<span className="max-sm:hidden"> e cookies</span></> : s.nome}
            </button>
          ))}
        </div>
        <div ref={corpo} id="info-legal-texto" role="tabpanel" aria-labelledby={`sep-${separador}`} tabIndex={0}
          className="grid flex-1 content-start gap-8 overflow-y-auto overscroll-contain px-6 py-8 text-[1.02rem] leading-relaxed sm:px-10">
          <Provisorio />
          {separador === 'termos' && <TextoTermos />}
          {separador === 'cancelamento' && <TextoCancelamento />}
          {separador === 'privacidade' && <TextoPrivacidade />}
        </div>
      </div>
    </dialog>
  );
}
