import { useTopo } from '../Estrutura';
import { EmblemaDesenhado } from '../Marca';
import { Ligacao } from '../kit';

export default function NaoEncontrada() {
  useTopo('claro');
  return (
    <div className="bg-creme pb-40 pt-36 lg:pb-52 lg:pt-44">
      <div className="contentor grid gap-12 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-20">
        <EmblemaDesenhado className="h-40 w-auto text-oliva lg:h-64" inicio="top 100%" fim="top 20%" />
        <div>
          <h1 className="titulo t-gigante max-w-[12ch]">Este beco <em>não tem saída.</em></h1>
          <p className="corrido mt-8 text-[1.15rem] text-terra/85">Erro 404: a página que procura não existe ou mudou de sítio. Volte ao início e siga por outra rua.</p>
          <Ligacao para="/" className="mt-10">Voltar ao início</Ligacao>
        </div>
      </div>
    </div>
  );
}
