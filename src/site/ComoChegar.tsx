import { useRef, type CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { PinoCasa } from './Logo';
import { gsap, Linhas, semMovimento, useGSAP } from './kit';
import { localizacao } from './dados';

// Ruas do Ladoeiro tiradas do OpenStreetMap (scripts/ruas.cjs), com a casa no centro exato do desenho.
// Entram como máscara: pintam-se com a cor do texto e o centro fica sempre no centro do bloco.
const ruas = (ficheiro: string): CSSProperties => {
  const url = `url(/img/${ficheiro})`;
  return { maskImage: url, WebkitMaskImage: url, maskSize: 'cover', WebkitMaskSize: 'cover', maskPosition: 'center', WebkitMaskPosition: 'center', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat' };
};

function Pino({ altura, cor }: { altura: string; cor: string }) {
  return (
    <span data-pino className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full ${cor}`}>
      <span className="absolute -bottom-1.5 left-1/2 block size-3 -translate-x-1/2 animate-ping rounded-full border border-current opacity-70 motion-reduce:hidden" aria-hidden />
      <PinoCasa className={`relative block w-auto drop-shadow-[0_6px_10px_rgb(0_0_0/0.35)] ${altura}`} />
    </span>
  );
}

const Creditos = ({ className }: { className: string }) => (
  <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className={`absolute text-[0.65rem] hover:underline ${className}`}>© OpenStreetMap</a>
);

// Página inicial: faixa larga e baixa com as ruas, de ponta a ponta.
export function FaixaComoChegar() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (semMovimento()) return;
    const el = ref.current!;
    gsap.fromTo(el.querySelector('[data-ruas]'), { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from(el.querySelector('[data-pino]'), { yPercent: -160, opacity: 0, duration: 1.1, ease: 'bounce.out', scrollTrigger: { trigger: el, start: 'top 70%' } });
  }, { scope: ref });

  return (
    <section ref={ref} aria-label="Como chegar" className="relative h-[30rem] overflow-hidden bg-noite text-creme sm:h-[26rem] lg:h-[28rem]">
      <div data-ruas className="absolute inset-0 bg-creme/40" style={ruas('ruas-faixa.svg')} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-noite via-noite/70 to-transparent" aria-hidden />
      <Pino altura="h-16 lg:h-20" cor="text-creme" />
      <div className="contentor absolute inset-x-0 bottom-0 flex flex-col gap-6 pb-8 sm:flex-row sm:items-end sm:justify-between lg:pb-12">
        <div>
          <Linhas as="h2" className="titulo t-media">Ladoeiro, <em>Beira Baixa.</em></Linhas>
          <p className="mt-2 text-sm tabular-nums text-creme/80">{localizacao.texto}</p>
        </div>
        <a href={localizacao.googleMaps} target="_blank" rel="noreferrer" className="botao botao-claro botao-cheio self-start sm:self-auto">
          Abrir com o Google Maps <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden />
        </a>
      </div>
      <Creditos className="right-4 top-3 text-creme/55 sm:right-8" />
    </section>
  );
}

// Página do mapa: um postal pequeno e emoldurado, ao centro.
export function PostalComoChegar() {
  return (
    <section aria-label="Como chegar" className="bg-linho py-24 lg:py-32">
      <div className="contentor flex flex-col items-center text-center">
        <div className="relative border border-terra/20 bg-creme p-2 shadow-[0_24px_40px_-28px_rgb(68_62_43/0.5)]">
          <div className="relative size-60 overflow-hidden sm:size-72">
            <div className="absolute inset-0 bg-terra/45" style={ruas('ruas-postal.svg')} aria-hidden />
            <Pino altura="h-14" cor="text-musgo" />
            <Creditos className="bottom-1.5 right-2 text-terra/60" />
          </div>
        </div>
        <Linhas as="h2" className="titulo t-grande mt-12">Estamos <em>aqui.</em></Linhas>
        <p className="mt-3 text-sm tabular-nums text-terra/80">Ladoeiro, Idanha-a-Nova · {localizacao.texto}</p>
        <a href={localizacao.googleMaps} target="_blank" rel="noreferrer" className="ligacao mt-8 text-musgo">
          Abrir com o Google Maps <ArrowUpRight size={18} strokeWidth={1.4} aria-hidden />
        </a>
      </div>
    </section>
  );
}
