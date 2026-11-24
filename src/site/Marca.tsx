import { useId, useRef } from 'react';
import { cheio, emblema, TRANSFORMA, VISTA_EMBLEMA } from './logotipo';
export { Emblema, Logo, PinoCasa } from './Logo';
import { brasao, brasaoTraco, fita, TRANSFORMA_BRASAO, VISTA_BRASAO } from './brasao';
import { gsap, ScrollTrigger, semMovimento, useAnimacao } from './kit';

// O emblema a desenhar-se com o scroll, como na abertura: primeiro o traço, depois o cheio.
export function EmblemaDesenhado({ className = '', inicio = 'top 80%', fim = 'bottom 35%' }: { className?: string; inicio?: string; fim?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useAnimacao(() => {
    if (semMovimento() || !ref.current) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: inicio, end: fim, scrub: 0.8 } });
    tl.fromTo(ref.current.querySelectorAll('.traco'), { traco: '0%' }, { traco: '100%', ease: 'none', stagger: 0.06, duration: 1 })
      .fromTo(ref.current.querySelector('.cheio'), { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.5 }, '>-0.15');
    ref.current.dataset.pronto = '';
  }, { scope: ref });
  return (
    <svg ref={ref} data-desenho viewBox={VISTA_EMBLEMA} className={className} aria-hidden="true" overflow="visible">
      <g transform={TRANSFORMA}>
        <g fill="none" stroke="currentColor" strokeWidth={22} strokeLinejoin="round">
          {emblema.map((d, i) => <path key={i} className="traco" d={d} />)}
        </g>
        <g className="cheio" fill="currentColor">{cheio.slice(0, 20).map((d, i) => <path key={i} d={d} />)}</g>
      </g>
    </svg>
  );
}

// O brasão do Ladoeiro com a mesma ideia do emblema: os contornos principais desenham-se de cima para baixo,
// o listel descobre-se no mesmo sentido, e depois entra o cheio, limpo (os traços saem). Corre sozinho, em
// cerca de 1,9 s, assim que o brasão entra no ecrã, por isso acaba sempre enquanto ainda se vê.
export function BrasaoDesenhado({ className = '', inicio = 'top 85%' }: { className?: string; inicio?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const corte = 'brasao' + useId().replace(/[^a-zA-Z0-9]/g, '');  // o useId traz : ou «», que estragam o url(#…)
  useAnimacao(() => {
    if (semMovimento() || !ref.current) return;
    const tracos = ref.current.querySelector('.tracos'), cheio = ref.current.querySelector('.cheio');
    const tl = gsap.timeline({ paused: true })
      .fromTo(ref.current.querySelectorAll('.tracos path'), { traco: '0%' }, { traco: '100%', duration: 1.1, ease: 'power2.inOut', stagger: { amount: 0.45 } })
      .fromTo(cheio, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.inOut' }, 1.05)
      .fromTo(ref.current.querySelector('.revela'), { attr: { height: 0 } }, { attr: { height: 433 }, duration: 1.2, ease: 'power2.inOut' }, 0.3)
      .to(tracos, { opacity: 0, duration: 0.5, ease: 'power1.in' }, 1.4);
    ScrollTrigger.create({ trigger: ref.current, start: inicio, once: true, onEnter: () => tl.play() });
    ref.current.dataset.pronto = '';
  }, { scope: ref });
  return (
    <svg ref={ref} data-desenho viewBox={VISTA_BRASAO} className={className} role="img" aria-label="Brasão do Ladoeiro" overflow="visible">
      <g transform={TRANSFORMA_BRASAO}>
        <g className="tracos" fill="none" stroke="currentColor" strokeWidth={26} strokeLinejoin="round" strokeLinecap="round">
          {brasaoTraco.map((d, i) => <path key={i} d={d} />)}
        </g>
        <g className="cheio" fill="currentColor">{brasao.map((d, i) => <path key={i} d={d} />)}</g>
      </g>
      {/* O listel e o nome: já são linha, por isso em vez de se desenharem descobrem-se de cima para baixo. */}
      <clipPath id={corte}><rect className="revela" x={0} y={0} width={368} height={433} /></clipPath>
      <path clipPath={`url(#${corte})`} fill="currentColor" fillRule="evenodd" d={fita} />
    </svg>
  );
}
