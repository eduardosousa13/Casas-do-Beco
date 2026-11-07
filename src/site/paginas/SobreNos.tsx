import { useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useTopo } from '../Estrutura';
import { EmblemaDesenhado } from '../Marca';
import { FotoPorFazer, Linhas, Revela } from '../kit';
import { contactos, fotos, telefoneLink } from '../dados';

export default function SobreNos() {
  useTopo('claro');
  return (
    <div className="bg-creme pb-40 pt-32 lg:pb-52 lg:pt-44">
      <div className="contentor">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-24">
          <div>
            <Linhas as="h1" imediato className="titulo t-gigante">Sobre <em>nós</em></Linhas>
            <Linhas imediato atraso={0.2} className="leitura mt-12 max-w-[26ch]">
              Somos uma família do Ladoeiro. Recuperámos casas da aldeia para receber quem chega com vontade de abrandar.
            </Linhas>
          </div>
          <FotoPorFazer nome="Os donos à porta de casa" className="aspect-[4/5]" />
        </div>

        <div className="mt-28 grid gap-14 lg:mt-40 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <EmblemaDesenhado className="h-32 w-auto text-oliva lg:h-48" />
          </div>
          <div className="grid gap-8 text-[1.1rem] leading-relaxed text-terra/90">
            <p>{contactos.donos} recebem cada hóspede pessoalmente. Entregam a chave, explicam a casa e ficam por perto durante a estadia.</p>
            <p>Conhecem a aldeia como ninguém: onde se come bem, a que horas abre a loja, quando é a próxima festa e qual o caminho mais bonito para ver o pôr do sol na planície.</p>
            <p>As casas são simples e cuidadas. Não somos um hotel: somos uma casa de família, aberta a quem gosta de viver a aldeia por dentro.</p>
            <Revela foto={fotos.fachada} sizes="(min-width: 1024px) 50vw, 90vw" className="mt-6 aspect-[3/2] rounded-[2px]" />
          </div>
        </div>

        <section id="contactos" className="mt-28 scroll-mt-28 border-t border-terra/15 pt-20 lg:mt-40 lg:pt-28">
          <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-24">
            <div>
              <Linhas as="h2" className="titulo t-grande">Fale <em>connosco</em></Linhas>
              <dl className="mt-12 grid gap-8">
                <div>
                  <dt className="text-sm text-terra/70">E-mail</dt>
                  <dd className="mt-1 text-lg"><a href={`mailto:${contactos.email}`} className="break-all underline hover:text-musgo">{contactos.email}</a></dd>
                </div>
                <div>
                  <dt className="text-sm text-terra/70">Telefone e WhatsApp</dt>
                  <dd className="mt-1 text-lg"><a href={telefoneLink} className="underline">{contactos.telefone}</a></dd>
                </div>
                <div>
                  <dt className="text-sm text-terra/70">Onde estamos</dt>
                  <dd className="mt-1 text-lg">{contactos.morada}</dd>
                  <dd className="mt-1 text-terra/80">Cerca de 20 minutos de Castelo Branco.</dd>
                  <dd className="mt-3">
                    <a href="https://maps.google.com/?q=Ladoeiro,+Idanha-a-Nova,+Portugal" target="_blank" rel="noreferrer" referrerPolicy="no-referrer" className="inline-flex items-center gap-1 font-medium underline hover:text-musgo">
                      Abrir no Google Maps <ArrowUpRight size={16} aria-hidden />
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
            <Formulario />
          </div>
        </section>
      </div>
    </div>
  );
}

// Envia para /api/contact, que guarda a mensagem e avisa os donos.
function Formulario() {
  const [estado, setEstado] = useState<'pronto' | 'a-enviar' | 'enviado' | 'erro'>('pronto');
  const [erro, setErro] = useState('');

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setEstado('a-enviar'); setErro('');
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...dados, casa: 'geral' }) });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(corpo.error || 'Não foi possível enviar a mensagem.');
      setEstado('enviado');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível enviar a mensagem.');
      setEstado('erro');
    }
  };

  if (estado === 'enviado') {
    return (
      <div role="status" className="self-start rounded-[4px] bg-palha p-8 lg:p-10">
        <p className="titulo t-media">Mensagem <em>recebida.</em></p>
        <p className="mt-4 text-terra/85">Obrigado. Respondemos para o e-mail que indicou assim que possível.</p>
        <button type="button" onClick={() => setEstado('pronto')} className="mt-6 font-medium underline">Enviar outra mensagem</button>
      </div>
    );
  }

  const campo = 'w-full border-b border-terra/30 bg-transparent py-3 text-lg outline-none transition-colors focus:border-musgo';
  return (
    <form onSubmit={enviar} className="grid gap-8 self-start sm:grid-cols-2">
      <label className="grid gap-1">
        <span className="text-sm text-terra/75">Nome</span>
        <input name="nome" required minLength={2} maxLength={100} autoComplete="name" className={campo} />
      </label>
      <label className="grid gap-1">
        <span className="text-sm text-terra/75">E-mail</span>
        <input name="email" type="email" required maxLength={254} autoComplete="email" className={campo} />
      </label>
      <label className="grid gap-1 sm:col-span-2">
        <span className="text-sm text-terra/75">Telefone <span className="text-terra/60">(opcional)</span></span>
        <input name="telefone" type="tel" maxLength={40} autoComplete="tel" className={campo} />
      </label>
      <label className="grid gap-1 sm:col-span-2">
        <span className="text-sm text-terra/75">Mensagem</span>
        <textarea name="mensagem" required minLength={10} maxLength={3000} rows={5} className={`${campo} resize-y`} placeholder="Datas, número de pessoas, perguntas…" />
      </label>
      {/* Campo escondido que só os robôs preenchem. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
      <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
        <button type="submit" disabled={estado === 'a-enviar'} className="inline-flex items-center gap-3 rounded-full bg-musgo px-8 py-4 font-medium text-creme transition-colors hover:bg-noite disabled:cursor-wait disabled:opacity-60">
          {estado === 'a-enviar' ? 'A enviar…' : 'Enviar mensagem'} <ArrowRight size={18} aria-hidden />
        </button>
        {estado === 'erro' && <p role="alert" className="text-telha">{erro} Pode também escrever para {contactos.email}.</p>}
      </div>
    </form>
  );
}
