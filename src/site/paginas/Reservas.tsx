import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTopo } from '../Estrutura';
import { Linhas, Revela } from '../kit';
import { contactos, fotos, type Foto } from '../dados';

// Por agora só visual: o sistema real (disponibilidade, quartos, pagamento) liga-se aqui mais tarde.
type Casa = { id: string; nome: string; foto: Foto; texto: string };
const casas: Casa[] = [
  { id: 'nascente', nome: 'Casa Nascente', foto: fotos.entrada, texto: 'Descrição da casa por confirmar.' },
  { id: 'poente', nome: 'Casa Poente', foto: fotos.quarto, texto: 'Descrição da casa por confirmar.' },
];

const hoje = () => new Date().toISOString().slice(0, 10);
const dataCurta = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });

export default function Reservas() {
  useTopo('claro');
  const [chegada, setChegada] = useState('');
  const [partida, setPartida] = useState('');
  const [pessoas, setPessoas] = useState(2);
  const [casa, setCasa] = useState('');
  const [enviado, setEnviado] = useState(false);

  const nomeCasa = casas.find(c => c.id === casa)?.nome;
  const assunto = `Pedido de disponibilidade${nomeCasa ? ` · ${nomeCasa}` : ''}`;
  const corpo = [
    'Olá,', '',
    `Gostaria de saber a disponibilidade${nomeCasa ? ` da ${nomeCasa}` : ''}${chegada && partida ? ` de ${dataCurta(chegada)} a ${dataCurta(partida)}` : ''}, para ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}.`,
    '', 'Obrigado.',
  ].join('\n');
  const mailto = `mailto:${contactos.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;

  const procurar = (e: FormEvent) => { e.preventDefault(); setEnviado(true); };

  return (
    <div className="bg-creme pb-40 pt-32 lg:pb-52 lg:pt-44">
      <div className="contentor">
        <Linhas as="h1" imediato className="titulo t-gigante">Reservar</Linhas>
        <p className="corrido mt-6 text-[1.15rem] text-terra/85">Escolha a casa, as datas e quantas pessoas vêm. A reserva é feita diretamente connosco, quarto a quarto.</p>

        <form onSubmit={procurar} className="mt-14 grid gap-px overflow-hidden rounded-[4px] border border-terra/20 bg-terra/20 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_0.8fr_auto]">
          <label className="grid gap-1 bg-linho px-5 py-4">
            <span className="text-sm text-terra/75">Chegada</span>
            <input type="date" required min={hoje()} value={chegada} onChange={e => { setChegada(e.target.value); setEnviado(false); }} className="numeros bg-transparent text-lg outline-none" />
          </label>
          <label className="grid gap-1 bg-linho px-5 py-4">
            <span className="text-sm text-terra/75">Partida</span>
            <input type="date" required min={chegada || hoje()} value={partida} onChange={e => { setPartida(e.target.value); setEnviado(false); }} className="numeros bg-transparent text-lg outline-none" />
          </label>
          <label className="grid gap-1 bg-linho px-5 py-4">
            <span className="text-sm text-terra/75">Pessoas</span>
            <select value={pessoas} onChange={e => setPessoas(Number(e.target.value))} className="bg-transparent text-lg outline-none">
              {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'pessoa' : 'pessoas'}</option>)}
            </select>
          </label>
          <button type="submit" className="flex items-center justify-center gap-3 bg-musgo px-8 py-5 font-medium text-creme transition-colors hover:bg-noite sm:col-span-2 lg:col-span-1">
            Ver disponibilidade <ArrowRight size={18} aria-hidden />
          </button>
        </form>

        <div role="status" aria-live="polite">
          {enviado && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-6 rounded-[4px] bg-palha px-6 py-5">
              <p className="max-w-[60ch]">As reservas online abrem em breve. Até lá, envie-nos o pedido por e-mail com estas datas e respondemos o mais depressa possível.</p>
              <a href={mailto} className="rounded-full bg-musgo px-6 py-3 font-medium text-creme hover:bg-noite">Pedir por e-mail</a>
            </div>
          )}
        </div>

        <h2 className="titulo t-grande mt-28 lg:mt-36">As <em>casas</em></h2>
        <div className="mt-14 grid gap-20 lg:grid-cols-2 lg:gap-10">
          {casas.map((c, i) => (
            <article key={c.id} className={i % 2 ? 'lg:mt-32' : ''}>
              <Revela foto={c.foto} sizes="(min-width: 1024px) 45vw, 90vw" className="aspect-[4/3] rounded-[2px]" />
              <div className="mt-8 flex flex-wrap items-start justify-between gap-6">
                <div>
                  <h3 className="titulo t-media">{c.nome}</h3>
                  <p className="mt-3 max-w-[40ch] text-terra/85"><em className="por-preencher">{c.texto}</em></p>
                </div>
                <button type="button" aria-pressed={casa === c.id} onClick={() => setCasa(casa === c.id ? '' : c.id)}
                  className={`rounded-full border px-6 py-3 font-medium transition-colors ${casa === c.id ? 'border-musgo bg-musgo text-creme' : 'border-terra/35 hover:border-musgo'}`}>
                  {casa === c.id ? 'Casa escolhida' : 'Escolher esta casa'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
