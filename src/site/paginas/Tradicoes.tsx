import { useRef } from 'react';
import { useTopo } from '../Estrutura';
import { Estandarte, Melancia } from '../desenhos';
import { Acende, gsap, Imagem, Ligacao, Linhas, Revela, semMovimento, useGSAP } from '../kit';
import { fotos } from '../dados';

export default function Tradicoes() {
  useTopo('escuro');
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (semMovimento()) return;
    const el = ref.current!;
    gsap.fromTo(el.querySelector('[data-fundo]'), { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'expo.out' });
    gsap.to(el.querySelector('[data-fundo]'), { yPercent: 12, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } });
  }, { scope: ref });

  return (
    <>
      <section ref={ref} className="relative h-dvh min-h-[34rem] overflow-hidden bg-noite text-creme">
        <div data-fundo className="absolute inset-0">
          <Imagem foto={fotos.colheita} prioridade sizes="100vw" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(38_50_31/0.85),rgb(38_50_31/0.15)_60%,rgb(38_50_31/0.45))]" />
        <div className="contentor relative flex h-full flex-col justify-end pb-14 lg:pb-20">
          <Linhas as="h1" imediato className="titulo t-gigante max-w-[12ch]">As tradições <em>do Ladoeiro</em></Linhas>
          <p className="corrido mt-6 text-creme/90">Uma aldeia agrícola tem o calendário marcado pela terra e pela fé. Estas são as alturas em que vale a pena cá estar.</p>
        </div>
      </section>

      <article className="bg-creme py-24 lg:py-36">
        <div className="contentor grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-24">
          <Revela foto={fotos.procissao} sizes="(min-width: 1024px) 42vw, 90vw" className="aspect-[4/5] rounded-[2px]" />
          <div>
            <Estandarte className="mb-8 h-32 w-auto text-oliva" />
            <Linhas as="h2" className="titulo t-grande">Procissão de <em>Santa Catarina de Sena</em></Linhas>
            <Acende className="mt-8 text-[1.2rem] leading-relaxed">
              É o dia em que a aldeia inteira se junta. A imagem de Santa Catarina sai em andor coberto de flores e percorre os caminhos de terra entre os pomares, com o estandarte à frente, o padre, as famílias e quem vem de fora atrás. Não é preciso ser da terra para acompanhar: basta caminhar ao passo da procissão.
            </Acende>
          </div>
        </div>
      </article>

      <article className="bg-linho py-24 lg:py-36">
        <div className="contentor">
          <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-16">
            <Melancia className="h-28 w-auto text-oliva lg:h-36" />
            <div>
              <Linhas as="h2" className="titulo t-grande">Festival <em>da Melancia</em></Linhas>
            </div>
          </div>
          <Revela foto={fotos.festival} sizes="100vw" className="mt-14 aspect-[16/9] rounded-[2px] lg:aspect-[21/9]" />
          <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-24">
            <Acende className="text-[1.2rem] leading-relaxed">
              A melancia do Ladoeiro é conhecida em toda a Beira Baixa e tem direito a selo próprio. No verão, a aldeia dedica-lhe uma festa: caixas cheias à sombra dos plátanos, produtores a vender a colheita, música e famílias a passear com a fruta debaixo do braço.
            </Acende>
            <p className="titulo t-media self-end text-oliva">Bancas cheias, <em>música e a aldeia na rua.</em></p>
          </div>
        </div>
      </article>

      <article className="bg-creme pb-40 pt-24 lg:pb-52 lg:pt-36">
        <div className="contentor grid gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-24">
          <div className="lg:order-2">
            <Linhas as="h2" className="titulo t-grande">A <em>apanha</em></Linhas>
            <Acende className="mt-8 text-[1.2rem] leading-relaxed">
              Antes da festa há o trabalho. A melancia apanha-se à mão, campo a campo, de preferência quando o calor abranda. É um saber passado de geração em geração e uma das imagens mais fortes do verão no Ladoeiro.
            </Acende>
            <Ligacao para="/reservas" principal className="mt-12">Venha numa destas semanas</Ligacao>
          </div>
          <Revela foto={fotos.melancia} sizes="(min-width: 1024px) 48vw, 90vw" className="aspect-[4/3] rounded-[2px] lg:order-1" />
        </div>
      </article>
    </>
  );
}
