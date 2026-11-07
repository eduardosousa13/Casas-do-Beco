// Conteúdo do site num só sítio. O que ainda não é verdade confirmada vai marcado em PROVISORIO
// e aparece no site com a classe .por-preencher.

export type Foto = { nome: string; alt: string; l: number; a: number; posicao?: string };

const f = (nome: string, alt: string, l: number, a: number, posicao?: string): Foto => ({ nome, alt, l, a, posicao });

export const fotos = {
  hero: f('hero', 'Pintura de uma noite de festa no Ladoeiro: mesas sob uma árvore em flor, luzes acesas e o palco ao fundo', 1672, 941),
  aldeia: f('aldeia', 'Vista aérea do Ladoeiro, com o casario branco de telhados vermelhos rodeado de olivais', 1774, 887),
  fachada: f('fachada', 'Fachada branca das Casas do Beco, porta n.º 16, numa rua de calçada ao fim da tarde', 1536, 1024, '40% 60%'),
  capela: f('capela', 'Capela do Espírito Santo, branca com cantaria de granito, entre oliveiras', 1536, 1024),
  casaSantos: f('casa-santos', 'Fachada da Casa Santos, loja da aldeia com toldos e garrafas de gás à porta', 1536, 1024),
  largo: f('largo', 'Largo da aldeia com um pinheiro manso, cruzeiro e esplanada à sombra de uma laranjeira', 1920, 1078),
  colheita: f('colheita', 'Senhora de lenço na cabeça a apanhar uma melancia no campo, vista de cima', 1536, 1024),
  festival: f('festival', 'Festival da Melancia: caixas cheias de melancias e pessoas a passear sob os plátanos', 1600, 835, '50% 70%'),
  melancia: f('melancia', 'Melancia com o selo Melancia do Ladoeiro', 1448, 1086),
  procissao: f('procissao', 'Procissão de Santa Catarina por um caminho de terra entre pomares, com o andor florido e o estandarte', 1024, 1536, '50% 35%'),
  entrada: f('interior-entrada', 'Entrada da casa com sofá de madeira clara e parede de pedra', 1536, 2048),
  sala: f('interior-sala', 'Canto da sala com sofá e manta', 719, 1600),
  cozinha: f('interior-cozinha', 'Cozinha com azulejo padrão, bancada de granito e armários de madeira', 1536, 2048),
  quarto: f('interior-quarto', 'Quarto com duas camas, candeeiros acesos e quadros de borboletas', 1600, 719),
  banho: f('interior-banho', 'Casa de banho com lavatório branco e estante de madeira com toalhas', 1536, 2048),
  escada: f('interior-escada', 'Escada de pedra clara com um banco e uma planta', 719, 1600),
  janela: f('interior-janela', 'Janela com cortinas de linho bordadas e toalhas dobradas num banco', 719, 1600),
  placa: f('interior-placa', 'Placas de madeira na parede: o que faz a nossa casa especial é quem a habita', 1536, 2048),
};

// Imagens em AVIF (com JPEG para browsers antigos), em dois tamanhos: -m (900 px) e a original.
export function fontes(foto: Foto) {
  const retrato = foto.a > foto.l;
  const lm = retrato ? Math.round((1100 * foto.l) / foto.a) : 900;
  const base = `/img/${foto.nome}`;
  return {
    avif: `${base}-m.avif ${lm}w, ${base}.avif ${foto.l}w`,
    jpg: `${base}-m.jpg ${lm}w, ${base}.jpg ${foto.l}w`,
    src: `${base}-m.jpg`,
  };
}

export const paginas = [
  { para: '/casa', nome: 'A casa', foto: fotos.entrada },
  { para: '/mapa', nome: 'Mapa', foto: fotos.aldeia },
  { para: '/tradicoes', nome: 'Tradições', foto: fotos.procissao },
  { para: '/reservas', nome: 'Reservas', foto: fotos.fachada },
  { para: '/sobre-nos', nome: 'Sobre nós', foto: fotos.largo },
];

// Contactos. O e-mail vem do site anterior; o resto falta confirmar com os donos.
export const contactos = {
  email: 'casasdobecoladoeiro@gmail.com',
  telefone: null as string | null,
  rnal: null as string | null,
  morada: 'Ladoeiro, Idanha-a-Nova · Beira Baixa',
};

// Pontos do mapa, em píxeis da imagem aérea (1774 × 887). Posições provisórias até o Eduardo as indicar.
export type Ponto = { id: string; x: number; y: number; nome: string; tipo: string; texto: string; foto?: Foto };
export const pontos: Ponto[] = [
  { id: 'casa', x: 803, y: 417, nome: 'Casas do Beco', tipo: 'A nossa casa', foto: fotos.fachada,
    texto: 'Numa rua sossegada, a dois passos do largo. É daqui que se parte a pé para tudo o resto.' },
  { id: 'largo', x: 1002, y: 341, nome: 'Largo da Fonte Velha', tipo: 'Centro da aldeia', foto: fotos.largo,
    texto: 'O pinheiro manso, o cruzeiro e a esplanada à sombra da laranjeira. Ao fim da tarde, meia aldeia passa por aqui.' },
  { id: 'capela', x: 661, y: 497, nome: 'Capela do Espírito Santo', tipo: 'Património', foto: fotos.capela,
    texto: 'Pequena capela caiada, com cantaria de granito e a data de 1883 gravada na fachada, rodeada de oliveiras antigas.' },
  { id: 'casa-santos', x: 1096, y: 512, nome: 'Casa Santos', tipo: 'Comércio local', foto: fotos.casaSantos,
    texto: 'A loja da aldeia: drogaria, gás e um pouco de tudo o que faz falta numa casa.' },
  { id: 'festival', x: 532, y: 319, nome: 'Festival da Melancia', tipo: 'No verão', foto: fotos.festival,
    texto: 'O recinto onde a aldeia celebra a melancia do Ladoeiro, com bancas, música e muita fruta.' },
  { id: 'piscinas', x: 1375, y: 244, nome: 'Piscinas do Ladoeiro', tipo: 'No verão',
    texto: 'As piscinas da aldeia, para os dias de calor da Beira Baixa.' },
];

// Datas e factos das festas por confirmar com os donos.
export const PROVISORIO = {
  dataSantaCatarina: 'data por confirmar',
  dataFestival: 'data por confirmar',
  donos: 'nomes dos donos por confirmar',
};
