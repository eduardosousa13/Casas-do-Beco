import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTopo } from '../Estrutura';
import { contactos } from '../dados';

// Textos obrigatórios para alojamento local. O conteúdo jurídico final ainda tem de ser escrito e validado
// pelos donos; o que falta está marcado. Os mesmos textos servem as páginas /termos e /privacidade e a
// janela de informação legal que abre no rodapé.

const falta = (t: string) => <em className="por-preencher">{t}</em>;

export function Provisorio() {
  return <p className="rounded-[4px] bg-palha px-5 py-4 text-sm">Texto provisório, a rever pelos proprietários antes de publicar.</p>;
}

function Parte({ titulo, children, id }: { titulo: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="titulo t-pequena mb-3">{titulo}</h2>
      {children}
    </section>
  );
}

export function TextoTermos() {
  return (
    <>
      <Parte titulo="Quem somos">
        <p>Casas do Beco, alojamento local no Ladoeiro, Idanha-a-Nova, de {contactos.donos}. Registo Nacional de Alojamento Local n.º {contactos.rnal ?? falta('por atribuir')}. NIF do titular da exploração: {falta('por confirmar')}.</p>
      </Parte>
      <Parte titulo="Reservas e pagamento">
        <p>A reserva fica confirmada depois do pagamento indicado no momento da reserva. Os preços incluem IVA à taxa legal em vigor. {falta('Taxa turística municipal: confirmar se se aplica.')}</p>
      </Parte>
      <Parte titulo="Entrada e saída">
        <p>Entrada a partir das {falta('hora por confirmar')} e saída até às {falta('hora por confirmar')}. Na chegada é pedida a identificação dos hóspedes, como manda a lei, para a comunicação obrigatória de estrangeiros.</p>
      </Parte>
      <Parte titulo="Regras da casa">
        <p>{falta('Número máximo de hóspedes, animais, fumar, silêncio e outras regras por definir.')}</p>
      </Parte>
      <Parte titulo="Reclamações e litígios">
        <p>Dispomos de Livro de Reclamações físico na casa e eletrónico em <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noreferrer" className="underline">livroreclamacoes.pt</a>. Em caso de litígio, o consumidor pode recorrer a uma entidade de resolução alternativa de litígios de consumo; a lista está no <a href="https://www.consumidor.gov.pt" target="_blank" rel="noreferrer" className="underline">Portal do Consumidor</a>. {falta('Indicar a entidade competente da zona.')}</p>
      </Parte>
      <p>Dúvidas: <a href={`mailto:${contactos.email}`} className="underline">{contactos.email}</a>.</p>
    </>
  );
}

export function TextoCancelamento() {
  return (
    <Parte titulo="Cancelamento" id="cancelamento">
      <p>{falta('Política de cancelamento por definir: prazos, reembolso total ou parcial e como pedir.')}</p>
      <p className="mt-3">Para cancelar ou alterar uma reserva, escreva para <a href={`mailto:${contactos.email}`} className="underline">{contactos.email}</a> ou ligue para {contactos.telefone}.</p>
    </Parte>
  );
}

export function TextoPrivacidade() {
  return (
    <>
      <Parte titulo="Que dados recolhemos">
        <p>Os dados que nos envia no formulário de contacto ou numa reserva: nome, e-mail, telefone e a mensagem ou os dados da estadia. Na chegada, os documentos de identificação exigidos por lei.</p>
      </Parte>
      <Parte titulo="Para quê">
        <p>Para responder aos pedidos, gerir as reservas e cumprir obrigações legais. Não vendemos nem cedemos dados para publicidade.</p>
      </Parte>
      <Parte titulo="Quem os trata">
        <p>Os responsáveis pelo tratamento são {contactos.donos}, que pode contactar em <a href={`mailto:${contactos.email}`} className="underline">{contactos.email}</a>. Os pagamentos são processados pela Stripe e os e-mails são enviados por um fornecedor de correio eletrónico.</p>
      </Parte>
      <Parte titulo="Durante quanto tempo">
        <p>{falta('Prazos de conservação por definir (contactos, reservas, faturação).')}</p>
      </Parte>
      <Parte titulo="Os seus direitos">
        <p>Pode pedir acesso, correção ou eliminação dos seus dados através de <a href={`mailto:${contactos.email}`} className="underline">{contactos.email}</a>, e apresentar queixa à <a href="https://www.cnpd.pt" target="_blank" rel="noreferrer" className="underline">CNPD</a>.</p>
      </Parte>
      <Parte titulo="Cookies">
        <p>Este site não usa cookies de publicidade nem de estatística. Guarda apenas no seu navegador, durante a visita, se já viu a animação de abertura.</p>
      </Parte>
    </>
  );
}

function Folha({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  useTopo('claro');
  return (
    <div className="bg-linho pb-40 pt-32 lg:pb-52 lg:pt-44">
      <div className="contentor grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <h1 className="titulo t-grande lg:sticky lg:top-32 lg:self-start">{titulo}</h1>
        <div className="corrido grid gap-10 text-[1.05rem] leading-relaxed">
          <Provisorio />
          {children}
        </div>
      </div>
    </div>
  );
}

export function Termos() {
  return (
    <Folha titulo={<>Termos e <em>condições</em></>}>
      <TextoTermos />
      <TextoCancelamento />
    </Folha>
  );
}

export function Privacidade() {
  return (
    <Folha titulo={<>Privacidade <em>e cookies</em></>}>
      <TextoPrivacidade />
      <p><Link to="/termos" className="underline">Ver os termos e condições</Link></p>
    </Folha>
  );
}
