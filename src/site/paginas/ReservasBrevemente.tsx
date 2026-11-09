import { ArrowUpRight } from 'lucide-react';
import { useTopo } from '../Estrutura';
import { EmblemaDesenhado } from '../Marca';
import { Linhas } from '../kit';
import { contactos, telefoneLink } from '../dados';

// O que o público vê em /reservas enquanto as reservas pelo site não abrem (ver RESERVAS_ABERTAS em dados.ts).
// A página completa (Reservas.tsx) fica guardada para quando o sistema de reservas e pagamentos estiver pronto.
export default function ReservasBrevemente() {
  useTopo('claro');
  const assunto = encodeURIComponent('Pedido de disponibilidade');
  return (
    <div className="bg-creme pb-40 pt-36 lg:pb-52 lg:pt-44">
      <div className="contentor grid gap-12 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-20">
        <EmblemaDesenhado className="h-40 w-auto text-oliva lg:h-64" inicio="top 100%" fim="top 20%" />
        <div>
          <Linhas as="h1" imediato className="titulo t-gigante max-w-[12ch]">Reservas <em>em breve.</em></Linhas>
          <p className="corrido mt-8 text-[1.15rem] text-terra/85">
            Dentro de pouco tempo vai poder reservar a sua estadia diretamente aqui no site. Até lá, fale connosco
            por e-mail ou telefone: dizemos-lhe que datas temos livres e ajudamos a preparar tudo.
          </p>
          <dl className="mt-12 grid max-w-2xl gap-8 sm:grid-cols-2 sm:gap-10">
            <div>
              <dt className="text-sm text-terra/80">E-mail</dt>
              <dd className="mt-1 text-lg"><a href={`mailto:${contactos.email}?subject=${assunto}`} className="break-all underline hover:text-musgo">{contactos.email}</a></dd>
            </div>
            <div>
              <dt className="text-sm text-terra/80">Telefone e WhatsApp</dt>
              <dd className="mt-1 text-lg"><a href={telefoneLink} className="underline hover:text-musgo">{contactos.telefone}</a></dd>
            </div>
          </dl>
          <a href={`mailto:${contactos.email}?subject=${assunto}`} className="botao mt-12">
            Pedir disponibilidade <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
