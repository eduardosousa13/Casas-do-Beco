import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { ArrowRight } from 'lucide-react';
import { fontes, type Foto } from './dados';
import './traco';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
// No telemóvel a barra do navegador encolhe e cresce ao fazer scroll; isso não deve recalcular as animações.
ScrollTrigger.config({ ignoreMobileResize: true });
export { gsap, ScrollTrigger, useGSAP };

// Sem movimento: preferência do sistema, ou ?estatico no endereço (para rever o estado final).
const estatico = typeof location !== 'undefined' && new URLSearchParams(location.search).has('estatico');
export const semMovimento = () => estatico || matchMedia('(prefers-reduced-motion: reduce)').matches;

// Computador com rato: só aqui há secções presas e scroll horizontal. No telemóvel tudo corre em fluxo normal.
export const GRANDE = '(min-width: 1024px) and (pointer: fine)';
export function useGrande() {
  const [g, setG] = useState(() => matchMedia(GRANDE).matches && !semMovimento());
  useEffect(() => {
    const m = matchMedia(GRANDE);
    const f = () => setG(m.matches && !semMovimento());
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return g;
}

// A abertura (o logótipo a desenhar-se no index.html) só existe na primeira visita à página inicial.
// Quem anima a seguir a ela espera por este sinal.
export function aposAbertura(f: () => void) {
  const estado = document.documentElement.dataset.abertura;
  if (estado !== 'a') { f(); return () => {}; }
  addEventListener('cdb:abertura', f, { once: true });
  return () => removeEventListener('cdb:abertura', f);
}

// Texto que sobe linha a linha por trás de uma máscara quando entra no ecrã.
export function Linhas({ as: T = 'p', className = '', children, atraso = 0, imediato = false }: { as?: ElementType; className?: string; children: ReactNode; atraso?: number; imediato?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (semMovimento() || !ref.current) return;
    const el = ref.current;
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'linha-mascara', autoSplit: true,
      onSplit: self => gsap.from(self.lines, {
        yPercent: 110, duration: 1.2, stagger: 0.08, delay: atraso, ease: 'expo.out',
        ...(imediato ? {} : { scrollTrigger: { trigger: el, start: 'top 88%', once: true } }),
      }),
    });
  }, { scope: ref });
  return <T ref={ref} className={className}>{children}</T>;
}

// Parágrafo que ganha cor palavra a palavra à medida que se lê (o efeito do Hotel Odisej).
export function Acende({ as: T = 'p', className = '', children }: { as?: ElementType; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (semMovimento() || !ref.current) return;
    const el = ref.current;
    SplitText.create(el, {
      type: 'words', autoSplit: true,
      onSplit: self => gsap.fromTo(self.words, { opacity: 0.16 }, {
        opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 65%', scrub: 0.6 },
      }),
    });
  }, { scope: ref });
  return <T ref={ref} className={className}>{children}</T>;
}

// Fotografia com AVIF e JPEG nos dois tamanhos.
export function Imagem({ foto, sizes = '100vw', className = '', prioridade = false, style }: { foto: Foto; sizes?: string; className?: string; prioridade?: boolean; style?: React.CSSProperties }) {
  const s = fontes(foto);
  return (
    <picture>
      <source type="image/avif" srcSet={s.avif} sizes={sizes} />
      <img src={s.src} srcSet={s.jpg} sizes={sizes} alt={foto.alt} width={foto.l} height={foto.a}
        loading={prioridade ? 'eager' : 'lazy'} fetchPriority={prioridade ? 'high' : undefined} decoding="async"
        className={className} style={{ objectPosition: foto.posicao, ...style }} />
    </picture>
  );
}

// Fotografia que abre de baixo para cima ao entrar e desliza devagar dentro da moldura.
export function Revela({ foto, className = '', sizes, paralaxe = true }: { foto: Foto; className?: string; sizes?: string; paralaxe?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (semMovimento() || !ref.current) return;
    const img = ref.current.querySelector('img');
    const st = { trigger: ref.current, start: 'top 92%', once: true };
    gsap.fromTo(ref.current, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: st });
    gsap.fromTo(img, { scale: 1.25 }, { scale: paralaxe ? 1.1 : 1, duration: 1.8, ease: 'expo.out', scrollTrigger: st });
    if (paralaxe) gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true } });
  }, { scope: ref });
  return (
    <div ref={ref} className={`relative overflow-hidden bg-palha ${className}`}>
      <Imagem foto={foto} sizes={sizes} className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}

// Desenho a traço que se desenha com o scroll (cada <path>, <line>, <circle>… do SVG filho).
// Ao chegar ao fim fica o desenho completo; sem movimento aparece já desenhado.
export function Desenho({ children, className = '', viewBox, inicio = 'top 85%', fim = 'bottom 45%', titulo, esticar = false }: { children: ReactNode; className?: string; viewBox: string; inicio?: string; fim?: string; titulo?: string; esticar?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  useGSAP(() => {
    if (semMovimento() || !ref.current) return;
    const tracos = ref.current.querySelectorAll('path, line, circle, ellipse, polyline, rect');
    gsap.fromTo(tracos, { traco: '0%' }, {
      traco: '100%', ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: ref.current, start: inicio, end: fim, scrub: 0.8 },
    });
  }, { scope: ref });
  return (
    <svg ref={ref} viewBox={viewBox} preserveAspectRatio={esticar ? 'none' : undefined} className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
      role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      {children}
    </svg>
  );
}

// Ligação entre páginas. A principal (uma por ecrã) é um botão de moldura fina; as outras são
// ligações editoriais, em itálico com um traço por baixo (estilos .botao e .ligacao no index.css).
export function Ligacao({ para, children, claro = false, principal = false, className = '' }: { para: string; children: ReactNode; claro?: boolean; principal?: boolean; className?: string }) {
  if (principal) {
    return (
      <Link to={para} className={`botao ${claro ? 'botao-claro' : ''} ${className}`}>
        {children} <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
      </Link>
    );
  }
  return (
    <Link to={para} className={`ligacao ${claro ? 'text-creme' : 'text-musgo'} ${className}`}>
      {children} <ArrowRight size={18} strokeWidth={1.4} aria-hidden />
    </Link>
  );
}

// Lugar guardado para uma fotografia que ainda não existe.
export function FotoPorFazer({ nome, className = '', escuro = false }: { nome: string; className?: string; escuro?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-[2px] border border-dashed p-6 text-center ${escuro ? 'border-creme/40 text-creme' : 'border-terra/35 text-terra'} ${className}`}>
      <span className="titulo t-pequena"><em>{nome}</em></span>
      <span className="text-sm opacity-75">Fotografia por fazer</span>
    </div>
  );
}

// Scroll suave com a roda e o trackpad (no toque fica o nativo do telemóvel). Corre no relógio do GSAP
// para os ScrollTrigger acompanharem cada fotograma.
let lenis: Lenis | null = null;
export function ligarScrollSuave() {
  if (semMovimento()) return () => {};
  const l = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  l.on('scroll', ScrollTrigger.update);
  const tique = (t: number) => l.raf(t * 1000);
  gsap.ticker.add(tique);
  gsap.ticker.lagSmoothing(0);
  lenis = l;
  return () => { gsap.ticker.remove(tique); l.destroy(); lenis = null; };
}

// Parar o scroll da página por trás de um menu ou de uma fotografia aberta.
export function prenderScroll(sim: boolean) {
  document.documentElement.style.overflow = sim ? 'hidden' : '';
  if (sim) lenis?.stop(); else lenis?.start();
}

// Ir para um ponto da página (topo, âncora), suave ou de imediato.
export function irPara(alvo: number | HTMLElement, suave = false) {
  if (lenis) { lenis.scrollTo(alvo, { immediate: !suave, force: true, duration: suave ? 1.4 : undefined }); return; }
  const top = typeof alvo === 'number' ? alvo : alvo.getBoundingClientRect().top + scrollY;
  window.scrollTo({ top, behavior: (suave && !semMovimento() ? 'smooth' : 'instant') as ScrollBehavior });
}

export const paraOTopo = () => irPara(0);
