import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTopo } from '../Estrutura';
import { BrasaoDesenhado, Logo } from '../Marca';
import { Capela, Linha, Estandarte, Melancia } from '../desenhos';
import { Acende, aposAbertura, FotoPorFazer, GRANDE, gsap, Imagem, Ligacao, Linhas, Revela, semMovimento, useGSAP } from '../kit';
import { contactos, fotos, pontos, telefoneLink } from '../dados';

export default function Inicio() {
  useTopo('escuro');
  return (
    <>
      <Capa />
      <Manifesto />
      <ACasa />
      <OMapa />
      <AsTradicoes />
      <Reservar />
      <SobreNos />
    </>
  );
}

// O logótipo da abertura acaba exatamente aqui: mesmo tamanho, mesma posição, mesma cor.
function Capa() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    const el = ref.current!;
    const q = gsap.utils.selector(el);
    if (semMovimento()) return;

    // Entrada: a pintura assenta depois de a abertura acabar.
    const parar = aposAbertura(() => {
      gsap.fromTo(q('[data-fundo]'), { scale: 1.1 }, { scale: 1, duration: 2.6, ease: 'expo.out' });
    });

    // Scroll: o logótipo encolhe e sobe para o lugar do emblema do cabeçalho; a pintura aproxima-se.
    const mm = gsap.matchMedia();
    mm.add({ grande: GRANDE, pequeno: '(max-width: 1023px), (pointer: coarse)' }, ctx => {
      const grande = ctx.conditions?.grande;
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: grande ? 0.6 : true } });
      tl.to(q('[data-logo]'), { scale: grande ? 0.42 : 0.7, yPercent: grande ? -62 : -30, opacity: 0, ease: 'power1.in' }, 0)
        .to(q('[data-fundo]'), { scale: 1.14, ease: 'none' }, 0)
        .to(q('[data-veu]'), { opacity: 0.55, ease: 'none' }, 0);
    });
    return parar;
  }, { scope: ref });

  return (
    <section ref={ref} className="relative h-dvh lg:h-[150dvh]" aria-label="Início">
      <h1 className="sr-only">Casas do Beco, casas de aldeia no Ladoeiro, Idanha-a-Nova</h1>
      <div className="sticky top-0 h-dvh overflow-hidden bg-noite text-cal">
        <div data-fundo className="absolute inset-0 will-change-transform">
          <Imagem foto={fotos.hero} prioridade sizes="100vw" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_46%_44%_at_50%_45%,rgb(38_50_31/0.62),rgb(38_50_31/0.2)_70%,transparent),linear-gradient(to_bottom,rgb(38_50_31/0.4),transparent_28%,transparent_60%,rgb(38_50_31/0.45))]" />
        <div data-veu className="absolute inset-0 bg-noite opacity-0" />
        <div className="absolute inset-0 grid place-items-center">
          <div data-logo className="will-change-transform">
            <Logo className="h-auto w-[min(62vw,20rem,42svh)]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Manifesto() {
  return (
    <section className="bg-creme py-24 lg:py-40">
      <div className="contentor grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <BrasaoDesenhado className="h-40 w-auto text-oliva lg:h-72" />
        </div>
        <div>
          <Acende className="leitura max-w-[30ch]">
            No Ladoeiro o dia mede-se pela luz. A planície aquece devagar, as oliveiras dão sombra à hora de almoço e, ao fim da tarde, a aldeia senta-se à porta. As Casas do Beco são casas de aldeia de uma família da terra, abertas a quem quer viver uns dias assim.
          </Acende>
          <div className="mt-14 grid max-w-xl gap-8 sm:grid-cols-2">
            <p className="text-terra/85">A casa fica dentro da aldeia, perto da Igreja Matriz.</p>
            <p className="text-terra/85">Reserva-se diretamente connosco, por quarto, sem plataformas pelo meio.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const fitaCasa = [fotos.entrada, fotos.cozinha, fotos.quarto, fotos.banho, fotos.escada, fotos.placa];

function ACasa() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (semMovimento()) return;
    const el = ref.current!;
    const mm = gsap.matchMedia();
    // Só no computador: a fita de fotografias corre na horizontal enquanto a secção fica presa.
    mm.add(GRANDE, () => {
      const pista = el.querySelector<HTMLElement>('[data-pista]')!;
      const distancia = () => pista.scrollWidth - innerWidth;
      gsap.to(pista, {
        x: () => -distancia(), ease: 'none',
        scrollTrigger: { trigger: el.querySelector('[data-palco]'), start: 'top top', end: () => `+=${distancia()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true },
      });
      gsap.utils.toArray<HTMLElement>(el.querySelectorAll('[data-pista] img')).forEach(img =>
        gsap.fromTo(img, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el.querySelector('[data-palco]'), start: 'top top', end: () => `+=${distancia()}`, scrub: true } }));
    });
  }, { scope: ref });

  return (
    <section ref={ref} className="bg-linho">
      <div className="contentor grid gap-8 pb-12 pt-24 lg:grid-cols-[1fr_auto] lg:items-end lg:pt-32">
        <div>
          <Linhas as="h2" className="titulo t-grande">A casa, <em>por dentro.</em></Linhas>
          <p className="corrido mt-6 text-terra/85">Paredes de pedra, cozinha de azulejo e quartos simples, com tudo o que faz falta para uns dias no Ladoeiro.</p>
        </div>
        <Ligacao para="/casa">Ver as fotografias</Ligacao>
      </div>
      <div data-palco className="overflow-hidden pb-24 lg:flex lg:h-dvh lg:items-center lg:pb-0">
        <ul data-pista className="flex items-center snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:px-8 lg:w-max lg:gap-8 lg:overflow-visible lg:px-14 lg:pb-0">
          {/* Todas à mesma altura e alinhadas; no telemóvel a altura limita-se para a horizontal caber no ecrã. */}
          {fitaCasa.map(foto => (
            <li key={foto.nome} className={`relative h-[min(56svh,64vw)] w-auto shrink-0 snap-center overflow-hidden rounded-[2px] bg-palha lg:h-[62vh] ${foto.a > foto.l ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}>
              <Link to="/casa" aria-label={`${foto.alt}. Ver todas as fotografias da casa`} className="block h-full w-full">
                <Imagem foto={foto} sizes="(min-width: 1024px) 45vw, 80vw" className="h-full w-full object-cover" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function OMapa() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (semMovimento()) return;
    const el = ref.current!;
    const st = { trigger: el.querySelector('[data-foto]'), start: 'top 75%', end: 'bottom 60%', scrub: 0.8 };
    gsap.fromTo(el.querySelectorAll('[data-pino]'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.15, ease: 'back.out(2)', scrollTrigger: st });
    gsap.fromTo(el.querySelector('[data-rota]'), { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', scrollTrigger: st });
  }, { scope: ref });

  // Percurso pelos pontos, da piscina à capela, a passar pela casa.
  const rota = 'M1465 242 Q1390 232 1309 251 Q1220 290 1150 383 Q1070 340 974 356 Q790 350 601 391 L588 416 Q545 360 522 291 Q300 320 100 407 Q55 440 19 475';
  return (
    <section ref={ref} className="relative bg-musgo text-creme">
      <Linha className="absolute inset-x-0 top-0" />
      <div className="contentor grid gap-14 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-16 lg:py-32">
        <div className="flex flex-col">
          <Capela className="mb-10 h-28 w-auto self-start text-ocre lg:h-40" />
          <Linhas as="h2" className="titulo t-grande">A aldeia inteira, <em>à porta.</em></Linhas>
          <p className="corrido mt-6 text-creme/85">Veja o Ladoeiro de cima e descubra o que há à volta da casa: a igreja, a fonte de 1571, o largo do cruzeiro, o recinto da festa. Quase tudo se faz a pé.</p>
          <Ligacao para="/mapa" claro className="mt-12">Explorar o mapa</Ligacao>
        </div>
        <Link to="/mapa" data-foto aria-label="Abrir o mapa interativo do Ladoeiro"
          className="group relative aspect-[1774/887] self-center overflow-hidden rounded-[4px] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]">
          <Imagem foto={fotos.aldeia} sizes="(min-width: 1024px) 60vw, 100vw" className="h-full w-full object-cover transition-transform duration-[1.6s] ease-(--ease-sai) group-hover:scale-[1.03]" />
          <svg viewBox="0 0 1774 887" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <path data-rota d={rota} fill="none" stroke="var(--color-creme)" strokeWidth={4} strokeLinecap="round" opacity={0.9} />
          </svg>
          {pontos.map(p => (
            <span key={p.id} data-pino className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(p.x / 1774) * 100}%`, top: `${(p.y / 887) * 100}%` }} aria-hidden>
              <span className={`block size-4 rounded-full border-[3px] border-creme shadow-[0_2px_8px_rgb(0_0_0/0.4)] lg:size-5 ${p.id === 'casa' ? 'bg-ocre' : 'bg-telha'}`} />
              {p.id === 'casa' && <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap bg-noite/85 px-3 py-1 text-xs font-medium">Casas do Beco</span>}
            </span>
          ))}
        </Link>
      </div>
    </section>
  );
}

function AsTradicoes() {
  return (
    <section className="bg-creme pb-24 pt-28 lg:pb-36 lg:pt-40">
      <div className="contentor grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-24">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Linhas as="h2" className="titulo t-grande">As tradições <em>que nos juntam.</em></Linhas>
          <Acende className="corrido mt-8 text-[1.15rem] leading-relaxed">
            O ano no Ladoeiro tem datas marcadas: a procissão de Santa Catarina de Sena, a apanha e o Festival da Melancia, as festas de verão no largo. Venha numa dessas semanas e fica a conhecer a aldeia por dentro.
          </Acende>
          <Ligacao para="/tradicoes" className="mt-10">Conhecer as tradições</Ligacao>
        </div>
        <div className="grid gap-20 lg:gap-28">
          <article className="grid gap-8 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] sm:items-end">
            <Revela foto={fotos.procissao} sizes="(min-width: 1024px) 34vw, 90vw" className="aspect-[4/5] rounded-[2px]" />
            <div>
              <Estandarte className="mb-6 h-28 w-auto text-oliva" />
              <h3 className="titulo t-pequena">Procissão de <em>Santa Catarina de Sena</em></h3>
              <p className="mt-4 text-terra/85">A santa sai em andor florido pelos caminhos entre os pomares, com o estandarte à frente e quase toda a aldeia atrás.</p>
            </div>
          </article>
          <article className="grid gap-8">
            <Revela foto={fotos.festival} sizes="(min-width: 1024px) 55vw, 90vw" className="aspect-[16/9] rounded-[2px]" />
            <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
              <Melancia className="h-24 w-auto text-oliva" />
              <div>
                <h3 className="titulo t-pequena">Festival <em>da Melancia</em></h3>
                <p className="mt-4 max-w-[52ch] text-terra/85">A melancia do Ladoeiro tem selo próprio e uma festa só para ela: bancas carregadas, música e a aldeia toda na rua.</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Reservar() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (semMovimento()) return;
    const el = ref.current!;
    // A fotografia abre de uma janela estreita até ocupar o ecrã inteiro.
    gsap.fromTo(el.querySelector('[data-janela]'), { clipPath: 'inset(12% 8% 12% 8% round 4px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 15%', scrub: 0.6 },
    });
    gsap.fromTo(el.querySelector('[data-janela] img'), { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  }, { scope: ref });

  return (
    <section ref={ref} className="relative bg-creme">
      <div data-janela className="relative min-h-dvh overflow-hidden bg-noite text-creme">
        <Imagem foto={fotos.fachada} sizes="100vw" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(38_50_31/0.85),rgb(38_50_31/0.25)_55%,rgb(38_50_31/0.35))]" />
        <div className="contentor relative flex min-h-dvh flex-col justify-end gap-10 pb-14 pt-32 lg:pb-20">
          <Linhas as="h2" className="titulo t-gigante max-w-[11ch]">Fique <em>no Beco.</em></Linhas>
          <div className="flex flex-wrap items-end justify-between gap-8">
            <p className="corrido text-creme/90">Escolha a casa e as datas. As reservas são feitas diretamente connosco, quarto a quarto.</p>
            <Ligacao para="/reservas" claro principal>Ver casas e datas</Ligacao>
          </div>
        </div>
      </div>
    </section>
  );
}

function SobreNos() {
  return (
    <section className="bg-creme pb-40 pt-24 lg:pb-52 lg:pt-36">
      <div className="contentor grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center lg:gap-24">
        <FotoPorFazer nome="Os donos à porta de casa" className="aspect-[4/5] max-h-[72vh]" />
        <div>
          <Linhas as="h2" className="titulo t-grande">Uma família <em>da terra.</em></Linhas>
          <p className="corrido mt-8 text-[1.15rem] leading-relaxed text-terra/90">
            As Casas do Beco são de uma família do Ladoeiro que decidiu abrir a porta a quem vem de fora. {contactos.donos} recebem cada hóspede pessoalmente e sabem dizer onde se come bem, a que horas abre a loja e quando é a próxima festa.
          </p>
          <dl className="mt-10 grid gap-5 border-t border-terra/15 pt-8 sm:grid-cols-2">
            <div><dt className="text-sm text-terra/80">E-mail</dt><dd className="mt-1 break-all"><a href={`mailto:${contactos.email}`} className="underline">{contactos.email}</a></dd></div>
            <div><dt className="text-sm text-terra/80">Telefone</dt><dd className="mt-1"><a href={telefoneLink} className="underline">{contactos.telefone}</a></dd></div>
          </dl>
          <Ligacao para="/sobre-nos" className="mt-12">Sobre nós e contactos</Ligacao>
        </div>
      </div>
    </section>
  );
}
