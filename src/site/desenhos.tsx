import { useRef } from 'react';
import { Desenho, gsap, semMovimento, useGSAP } from './kit';

// Desenhos a traço da aldeia, feitos de geometria simples, que se desenham com o scroll.

export function Capela({ className = '' }: { className?: string }) {
  return (
    <Desenho viewBox="0 0 200 224" className={className} titulo="Desenho da Capela do Espírito Santo">
      <g strokeWidth={1.6}>
        <path d="M14 214 H186" />
        <path d="M42 214 V112 M158 214 V112" />
        <path d="M34 114 L100 52 L166 114" />
        <path d="M100 52 V16 M88 28 H112" />
        <path d="M42 112 V94 M36 94 H48 M158 112 V94 M152 94 H164" />
        <circle cx="42" cy="86" r="7" />
        <circle cx="158" cy="86" r="7" />
        <path d="M90 64 H110 V76 H90 Z" />
        <circle cx="100" cy="94" r="9" />
        <path d="M82 214 V148 H118 V214 M100 148 V214" />
        <path d="M91 166 L95 172 L91 178 L87 172 Z M109 166 L113 172 L109 178 L105 172 Z" />
        <path d="M42 186 H82 M118 186 H158" />
      </g>
    </Desenho>
  );
}

export function Melancia({ className = '' }: { className?: string }) {
  return (
    <Desenho viewBox="0 0 240 160" className={className} titulo="Desenho de uma melancia">
      <g strokeWidth={1.6}>
        <ellipse cx="118" cy="86" rx="104" ry="66" />
        <path d="M18 74 C64 36 172 36 218 74" />
        <path d="M15 92 C64 58 172 58 221 92" />
        <path d="M22 112 C70 84 166 84 214 112" />
        <path d="M38 132 C82 112 154 112 198 132" />
        <path d="M30 54 C76 22 160 22 206 54" />
        <path d="M218 72 C226 64 232 62 238 66" />
        <path d="M226 66 C228 58 234 54 238 56" />
      </g>
    </Desenho>
  );
}

export function Estandarte({ className = '' }: { className?: string }) {
  return (
    <Desenho viewBox="0 0 160 250" className={className} titulo="Desenho do estandarte da procissão">
      <g strokeWidth={1.6}>
        <path d="M22 8 V244" />
        <path d="M22 30 H142" />
        <circle cx="22" cy="8" r="4" />
        <path d="M32 30 V176 L48 190 L64 176 L80 190 L96 176 L112 190 L128 176 V30" />
        <circle cx="80" cy="82" r="15" />
        <path d="M80 97 L66 150 H94 Z" />
        <path d="M70 66 L74 58 L80 64 L86 58 L90 66" />
        <path d="M52 118 C58 112 62 112 66 118 M94 118 C98 112 102 112 108 118" />
      </g>
    </Desenho>
  );
}

// Separador reto entre secções: um fio ocre que se estende de um lado ao outro ao entrar no ecrã.
export function Linha({ traco = 'var(--color-ocre)', className = '' }: { traco?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (semMovimento()) return;
    gsap.fromTo(ref.current, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top 95%', end: 'top 45%', scrub: 0.6 } });
  }, { scope: ref });
  return <div ref={ref} aria-hidden="true" className={`h-px origin-left ${className}`} style={{ background: traco }} />;
}
