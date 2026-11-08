import { useRef } from 'react';
import { cheio, emblema, TRANSFORMA, VISTA_EMBLEMA } from './logotipo';
export { Emblema, Logo, PinoCasa } from './Logo';
import { brasao, TRANSFORMA_BRASAO, VISTA_BRASAO } from './brasao';
import { gsap, semMovimento, useGSAP } from './kit';

// O emblema a desenhar-se com o scroll, como na abertura: primeiro o traço, depois o cheio.
export function EmblemaDesenhado({ className = '', inicio = 'top 80%', fim = 'bottom 35%' }: { className?: string; inicio?: string; fim?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useGSAP(() => {
    if (semMovimento() || !ref.current) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: inicio, end: fim, scrub: 0.8 } });
    tl.fromTo(ref.current.querySelectorAll('.traco'), { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', stagger: 0.06, duration: 1 })
      .fromTo(ref.current.querySelector('.cheio'), { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.5 }, '>-0.15');
  }, { scope: ref });
  return (
    <svg ref={ref} viewBox={VISTA_EMBLEMA} className={className} aria-hidden="true" overflow="visible">
      <g transform={TRANSFORMA}>
        <g fill="none" stroke="currentColor" strokeWidth={22} strokeLinejoin="round">
          {emblema.map((d, i) => <path key={i} className="traco" d={d} />)}
        </g>
        <g className="cheio" fill="currentColor">{cheio.slice(0, 20).map((d, i) => <path key={i} d={d} />)}</g>
      </g>
    </svg>
  );
}

// O brasão do Ladoeiro com a mesma animação do emblema: os contornos desenham-se com o scroll, de cima
// para baixo, e depois entra o cheio.
export function BrasaoDesenhado({ className = '', inicio = 'top 80%', fim = 'bottom 35%' }: { className?: string; inicio?: string; fim?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useGSAP(() => {
    if (semMovimento() || !ref.current) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: inicio, end: fim, scrub: 0.8 } });
    tl.fromTo(ref.current.querySelectorAll('.traco'), { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', stagger: { amount: 1.2 }, duration: 0.6 })
      .fromTo(ref.current.querySelector('.cheio'), { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.5 }, '>-0.15');
  }, { scope: ref });
  return (
    <svg ref={ref} viewBox={VISTA_BRASAO} className={className} role="img" aria-label="Brasão do Ladoeiro" overflow="visible">
      <g transform={TRANSFORMA_BRASAO}>
        <g fill="none" stroke="currentColor" strokeWidth={10} strokeLinejoin="round">
          {brasao.map((d, i) => <path key={i} className="traco" d={d} />)}
        </g>
        <g className="cheio" fill="currentColor">{brasao.map((d, i) => <path key={i} d={d} />)}</g>
      </g>
    </svg>
  );
}
