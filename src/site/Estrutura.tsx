import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, X } from 'lucide-react';
import { Emblema, EmblemaDesenhado } from './Marca';
import { Colina } from './desenhos';
import { gsap, Imagem, paraOTopo, ScrollTrigger, semMovimento } from './kit';
import { contactos, paginas } from './dados';

// Cada página diz se o topo é escuro (fotografia por trás) ou claro, para o cabeçalho escolher a cor.
type Topo = 'escuro' | 'claro';
const TopoCtx = createContext<(t: Topo) => void>(() => {});
export function useTopo(t: Topo) {
  const definir = useContext(TopoCtx);
  useLayoutEffect(() => definir(t), [definir, t]);
}

export default function Estrutura() {
  const [topo, setTopo] = useState<Topo>('claro');
  const { pathname, hash } = useLocation();
  const primeira = useRef(true);

  // Mudar de página: volta ao topo (ou à âncora) e recalcula as posições das animações.
  useLayoutEffect(() => {
    if (hash) {
      const alvo = document.getElementById(hash.slice(1));
      if (alvo) { requestAnimationFrame(() => alvo.scrollIntoView()); return; }
    }
    paraOTopo();
  }, [pathname, hash]);
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 300);
    const carregou = () => ScrollTrigger.refresh();
    addEventListener('load', carregou);
    return () => { clearTimeout(t); removeEventListener('load', carregou); };
  }, [pathname]);
  useEffect(() => { primeira.current = false; }, []);

  return (
    <TopoCtx.Provider value={setTopo}>
      <a href="#conteudo" className="sr-only z-[80] rounded bg-musgo px-4 py-3 text-creme focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar para o conteúdo</a>
      <Cabecalho topo={topo} inicio={pathname === '/'} />
      <main id="conteudo">
        <Outlet />
      </main>
      <Rodape />
      <Cortina chave={pathname} />
    </TopoCtx.Provider>
  );
}

function Cabecalho({ topo, inicio }: { topo: Topo; inicio: boolean }) {
  const [desceu, setDesceu] = useState(false);
  const [escondido, setEscondido] = useState(false);
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    let ultimo = scrollY;
    const f = () => {
      const y = scrollY;
      // Na página inicial o cabeçalho só ganha fundo depois de o logótipo grande sair do ecrã.
      setDesceu(y > (inicio ? innerHeight * 0.85 : 40));
      setEscondido(y > ultimo && y > innerHeight * 1.1);
      ultimo = y;
    };
    f();
    addEventListener('scroll', f, { passive: true });
    return () => removeEventListener('scroll', f);
  }, [inicio]);
  useEffect(() => setMenu(false), [pathname]);

  const claro = !desceu && topo === 'escuro';
  const cor = claro ? 'text-creme' : 'text-terra';
  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color,color,box-shadow] duration-500 ease-(--ease-sai) ${escondido && !menu ? '-translate-y-full' : ''} ${desceu ? 'bg-creme shadow-[0_1px_0_rgb(68_62_43/0.12)]' : 'bg-transparent'} ${cor}`}>
        <div className="contentor grid h-[4.5rem] grid-cols-[1fr_auto_1fr] items-center">
          <button type="button" onClick={() => setMenu(true)} aria-haspopup="dialog" aria-expanded={menu}
            className="group flex items-center gap-3 justify-self-start py-3 text-[0.95rem] font-medium">
            <span className="flex w-7 flex-col gap-[6px]" aria-hidden>
              <span className="h-px w-full bg-current transition-transform duration-500 ease-(--ease-sai) group-hover:translate-x-1" />
              <span className="h-px w-2/3 bg-current transition-[width] duration-500 ease-(--ease-sai) group-hover:w-full" />
            </span>
            Menu
          </button>
          <Link to="/" aria-label="Casas do Beco, página inicial"
            className={`transition-[opacity,transform] duration-700 ease-(--ease-sai) ${inicio && !desceu ? 'pointer-events-none -translate-y-2 opacity-0' : ''}`}>
            <Emblema className="h-11 w-auto" />
          </Link>
          <Link to="/reservas" className={`justify-self-end rounded-full border px-5 py-2.5 text-[0.95rem] font-medium transition-colors duration-300 ${claro ? 'border-creme/60 hover:bg-creme hover:text-musgo' : 'border-terra/40 hover:border-musgo hover:bg-musgo hover:text-creme'}`}>
            Reservar
          </Link>
        </div>
      </header>
      <Menu aberto={menu} fechar={() => setMenu(false)} />
    </>
  );
}

function Menu({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [foco, setFoco] = useState(0);
  const itens = [{ para: '/', nome: 'Início', foto: paginas[0].foto }, ...paginas];

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = 'hidden';
      if (!semMovimento()) {
        gsap.fromTo(d, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' });
        gsap.from(d.querySelectorAll('[data-item]'), { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.05, delay: 0.35 });
      }
    } else if (!aberto && d.open) {
      const acabar = () => { d.close(); document.documentElement.style.overflow = ''; };
      if (semMovimento()) acabar();
      else gsap.to(d, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.7, ease: 'expo.inOut', onComplete: acabar });
    }
  }, [aberto]);

  return (
    <dialog ref={ref} aria-label="Menu" onCancel={e => { e.preventDefault(); fechar(); }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-musgo p-0 text-creme backdrop:bg-transparent">
      <div className="contentor flex h-full flex-col">
        <div className="grid h-[4.5rem] grid-cols-[1fr_auto_1fr] items-center">
          <button type="button" onClick={fechar} className="flex items-center gap-3 justify-self-start py-3 text-[0.95rem] font-medium">
            <X size={22} strokeWidth={1.4} aria-hidden /> Fechar
          </button>
          <Link to="/" onClick={fechar} aria-label="Página inicial"><Emblema className="h-11 w-auto text-creme" /></Link>
          <Link to="/reservas" onClick={fechar} className="justify-self-end rounded-full bg-creme px-5 py-2.5 text-[0.95rem] font-medium text-musgo">Reservar</Link>
        </div>
        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.1fr_1fr]">
          <nav aria-label="Páginas">
            <ul className="space-y-1">
              {itens.map((p, i) => (
                <li key={p.para} className="overflow-hidden">
                  <NavLink to={p.para} end onClick={fechar} data-item onMouseEnter={() => setFoco(i)} onFocus={() => setFoco(i)}
                    className={({ isActive }) => `titulo inline-flex items-baseline gap-4 text-[clamp(2.6rem,7.5vh,5rem)] leading-[1.08] transition-colors duration-300 hover:text-ocre ${isActive ? 'text-ocre' : ''}`}>
                    {p.nome}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="relative hidden aspect-[4/5] max-h-[68vh] w-full justify-self-end overflow-hidden rounded-[2px] lg:block lg:w-[80%]">
            {itens.map((p, i) => (
              <div key={p.para} className={`absolute inset-0 transition-[opacity,transform] duration-700 ease-(--ease-sai) ${foco === i ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}>
                <Imagem foto={p.foto} sizes="40vw" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-creme/20 py-5 text-sm text-creme/80">
          <a href={`mailto:${contactos.email}`} className="hover:text-creme">{contactos.email}</a>
          <span>{contactos.morada}</span>
        </div>
      </div>
    </dialog>
  );
}

function Rodape() {
  const ano = new Date().getFullYear();
  return (
    <footer className="relative bg-noite text-creme">
      <Colina cor="var(--color-noite)" className="absolute inset-x-0 bottom-full" />
      <div className="contentor pb-8 pt-16 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-[auto_1fr] lg:gap-20">
          <EmblemaDesenhado className="h-40 w-auto text-ocre lg:h-56" inicio="top 95%" fim="center 60%" />
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="titulo t-media max-w-[12ch]">Até breve, <em>no Ladoeiro.</em></p>
            </div>
            <nav aria-label="Rodapé" className="space-y-2 text-creme/85">
              <h2 className="mb-4 text-sm font-semibold text-ocre">Páginas</h2>
              {paginas.map(p => <Link key={p.para} to={p.para} className="block w-fit hover:text-creme hover:underline">{p.nome}</Link>)}
            </nav>
            <div className="space-y-2 text-creme/85">
              <h2 className="mb-4 text-sm font-semibold text-ocre">Contactos</h2>
              <a href={`mailto:${contactos.email}`} className="block w-fit break-all hover:text-creme hover:underline">{contactos.email}</a>
              <p>{contactos.telefone ?? <em className="por-preencher text-creme">telefone por confirmar</em>}</p>
              <p>{contactos.morada}</p>
            </div>
          </div>
        </div>
        <div className="mt-16 grid gap-6 border-t border-creme/15 pt-6 text-sm text-creme/70 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/termos" className="hover:text-creme hover:underline">Termos e condições</Link>
            <Link to="/termos#cancelamento" className="hover:text-creme hover:underline">Cancelamento</Link>
            <Link to="/privacidade" className="hover:text-creme hover:underline">Privacidade e cookies</Link>
            <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-creme hover:underline">
              Livro de Reclamações Eletrónico <ArrowUpRight size={14} aria-hidden />
            </a>
            <a href="https://www.consumidor.gov.pt/parceiros/sistema-de-defesa-do-consumidor/entidades-de-resolucao-alternativa-de-litigios-de-consumo.aspx" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-creme hover:underline">
              Resolução alternativa de litígios <ArrowUpRight size={14} aria-hidden />
            </a>
          </div>
          <p className="numeros">
            © {ano} Casas do Beco · Alojamento Local n.º {contactos.rnal ?? <em className="por-preencher text-creme">RNAL por confirmar</em>}
          </p>
        </div>
      </div>
    </footer>
  );
}

// Cortina entre páginas: a página nova chega tapada pelo verde e o pano sobe.
function Cortina({ chave }: { chave: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const primeira = useRef(true);
  useLayoutEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const el = ref.current;
    if (!el || semMovimento()) return;
    gsap.killTweensOf(el);
    gsap.set(el, { clipPath: 'inset(0% 0% 0% 0%)', visibility: 'visible' });
    gsap.timeline()
      .fromTo(el.querySelector('svg'), { opacity: 1, y: 0 }, { opacity: 0, y: -16, duration: 0.5, ease: 'power2.in' }, 0.15)
      .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut' }, 0.3)
      .set(el, { visibility: 'hidden' });
  }, [chave]);
  return (
    <div ref={ref} aria-hidden="true" className="invisible fixed inset-0 z-[70] grid place-items-center bg-musgo text-creme">
      <Emblema className="h-20 w-auto" />
    </div>
  );
}
