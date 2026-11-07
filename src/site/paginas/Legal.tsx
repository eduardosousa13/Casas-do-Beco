import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTopo } from '../Estrutura';
import { contactos } from '../dados';

// Estrutura dos textos obrigatórios para alojamento local. O conteúdo jurídico final ainda tem de ser
// escrito e validado pelos donos; o que falta está marcado.
function Folha({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  useTopo('claro');
  return (
    <div className="bg-linho pb-40 pt-32 lg:pb-52 lg:pt-44">
      <div className="contentor grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <h1 className="titulo t-grande lg:sticky lg:top-32 lg:self-start">{titulo}</h1>
        <div className="corrido grid gap-10 text-[1.05rem] leading-relaxed">
          <p className="rounded-[4px] bg-palha px-5 py-4 text-sm">Texto provisório, a rever pelos proprietários antes de publicar.</p>
          {children}
        </div>
      </div>
    </div>
  );
}

const falta = (t: string) => <em className="por-preencher">{t}</em>;

export function Termos() {
  return (
    <Folha titulo={<>Termos e <em>condições</em></>}>
      <section>
        <h2 className="titulo t-pequena mb-3">Quem somos</h2>
        <p>Casas do Beco, alojamento local no Ladoeiro, Idanha-a-Nova. Registo Nacional de Alojamento Local n.º {contactos.rnal ?? falta('por confirmar')}. Titular da exploração: {falta('nome e NIF por confirmar')}.</p>
      </section>
      <section>
        <h2 className="titulo t-pequena mb-3">Reservas e pagamento</h2>
        <p>A reserva fica confirmada depois do pagamento indicado no momento da reserva. Os preços incluem IVA à taxa legal em vigor. {falta('Taxa turística municipal: confirmar se se aplica.')}</p>
      </section>
      <section>
        <h2 className="titulo t-pequena mb-3">Entrada e saída</h2>
        <p>Entrada a partir das {falta('hora por confirmar')} e saída até às {falta('hora por confirmar')}. Na chegada é pedida a identificação dos hóspedes, como manda a lei, para a comunicação obrigatória de estrangeiros.</p>
      </section>
      <section id="cancelamento" className="scroll-mt-28">
        <h2 className="titulo t-pequena mb-3">Cancelamento</h2>
        <p>{falta('Política de cancelamento por definir: prazos, reembolso total ou parcial e como pedir.')}</p>
      </section>
      <section>
        <h2 className="titulo t-pequena mb-3">Regras da casa</h2>
        <p>{falta('Número máximo de hóspedes, animais, fumar, silêncio e outras regras por definir.')}</p>
      </section>
      <section>
        <h2 className="titulo t-pequena mb-3">Reclamações e litígios</h2>
        <p>Dispomos de Livro de Reclamações físico na casa e eletrónico em <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noreferrer" className="underline">livroreclamacoes.pt</a>. Em caso de litígio, o consumidor pode recorrer a uma entidade de resolução alternativa de litígios de consumo; a lista está no <a href="https://www.consumidor.gov.pt" target="_blank" rel="noreferrer" className="underline">Portal do Consumidor</a>. {falta('Indicar a entidade competente da zona.')}</p>
      </section>
      <p>Dúvidas: <a href={`mailto:${contactos.email}`} className="underline">{contactos.email}</a>.</p>
    </Folha>
  );
}

export function Privacidade() {
  return (
    <Folha titulo={<>Privacidade <em>e cookies</em></>}>
      <section>
        <h2 className="titulo t-pequena mb-3">Que dados recolhemos</h2>
        <p>Os dados que nos envia no formulário de contacto ou numa reserva: nome, e-mail, telefone e a mensagem ou os dados da estadia. Na chegada, os documentos de identificação exigidos por lei.</p>
      </section>
      <section>
        <h2 className="titulo t-pequena mb-3">Para quê</h2>
        <p>Para responder aos pedidos, gerir as reservas e cumprir obrigações legais. Não vendemos nem cedemos dados para publicidade.</p>
      </section>
      <section>
        <h2 className="titulo t-pequena mb-3">Quem os trata</h2>
        <p>Os pagamentos são processados pela Stripe; os e-mails são enviados por um fornecedor de correio eletrónico. {falta('Responsável pelo tratamento e contacto por confirmar.')}</p>
      </section>
      <section>
        <h2 className="titulo t-pequena mb-3">Durante quanto tempo</h2>
        <p>{falta('Prazos de conservação por definir (contactos, reservas, faturação).')}</p>
      </section>
      <section>
        <h2 className="titulo t-pequena mb-3">Os seus direitos</h2>
        <p>Pode pedir acesso, correção ou eliminação dos seus dados através de <a href={`mailto:${contactos.email}`} className="underline">{contactos.email}</a>, e apresentar queixa à <a href="https://www.cnpd.pt" target="_blank" rel="noreferrer" className="underline">CNPD</a>.</p>
      </section>
      <section>
        <h2 className="titulo t-pequena mb-3">Cookies</h2>
        <p>Este site não usa cookies de publicidade nem de estatística. Guarda apenas no seu navegador, durante a visita, se já viu a animação de abertura.</p>
      </section>
      <p><Link to="/termos" className="underline">Ver os termos e condições</Link></p>
    </Folha>
  );
}
