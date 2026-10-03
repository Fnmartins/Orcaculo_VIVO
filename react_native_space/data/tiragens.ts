/**
 * As tiragens que o app oferece, e a pergunta que cada posição faz.
 *
 * A pergunta não é enfeite: é dela que sai a leitura. A mesma carta diz coisas
 * diferentes em posições diferentes, e é esse encontro — carta mais pergunta — que faz
 * a leitura ser desta tiragem e não de qualquer uma. Por isso as posições viajam até a
 * IA junto das cartas, e aparecem na tela *antes* de qualquer carta cair.
 *
 * Os nomes e a ordem da Cruz Celta vêm da tradição, que não tem dono. A redação de cada
 * pergunta é nossa: significado de posição é livre, frase de autor não é.
 */

import type { PosicaoChave } from './tarot';

export interface PosicaoDaTiragem {
  nome: string;
  /** O que esta posição pergunta. Lida antes da carta, ela explica a tiragem sozinha. */
  regra: string;
  /**
   * Qual das quatro posições-chave esta posição é, quando é alguma.
   * É por ela que a nota da carta para aquela posição é encontrada.
   */
  chave?: PosicaoChave;
  /**
   * Onde a posição fica na mesa, em coordenada de grade.
   *
   * Geometria é dado, não layout: com `lugar`, um componente desenha linha, cruz,
   * círculo ou pirâmide, e acrescentar tiragem passa a ser acrescentar uma entrada.
   */
  lugar: { coluna: number; linha: number };
  /** Girada um quarto de volta, como a carta que atravessa na Cruz Celta. */
  deitada?: boolean;
}

export interface Tiragem {
  id: 'tres-cartas' | 'cruz-celta';
  nome: string;
  /** Uma frase sobre quando esta tiragem serve. */
  quando: string;
  posicoes: PosicaoDaTiragem[];
  /**
   * A ordem em que as posições são LIDAS, quando difere da ordem em que são postas.
   * Existe porque há tiragens assim: "O ano à frente" começa pela carta do mês corrente.
   * Devolve índices de `posicoes`.
   */
  ordemDeLeitura?: (agora: Date) => number[];
}

const TRES_CARTAS: Tiragem = {
  id: 'tres-cartas',
  nome: 'Três cartas',
  quando: 'Para uma pergunta direta, ou para ver o movimento de uma situação.',
  posicoes: [
    { nome: 'Passado', regra: 'o que já se consumou e ainda pesa',
      chave: 'passado', lugar: { coluna: 0, linha: 0 } },
    { nome: 'Presente', regra: 'o que está em jogo agora',
      chave: 'agora', lugar: { coluna: 1, linha: 0 } },
    { nome: 'Futuro', regra: 'o que tende a se formar se nada mudar',
      chave: 'futuro', lugar: { coluna: 2, linha: 0 } },
  ],
};

const CRUZ_CELTA: Tiragem = {
  id: 'cruz-celta',
  nome: 'Cruz Celta',
  quando: 'Para uma situação enroscada, quando a pergunta direta não dá conta.',
  // Copiadas do protótipo aprovado (`Camadas do Tarô`), palavra por palavra. Não são
  // para reescrever: foram lidas e aceitas lá, e trocá-las por redação nova aqui é
  // exatamente o retrabalho que o protótipo existia para evitar.
  //
  // A ORDEM do array é a ordem em que as cartas caem, e segue a dos livros — Burke (O
  // Livro Completo do Tarô, p. 162) e o livreto Rider-Waite (p. 53) numeram igual:
  // 1 presente, 2 o que cruza, 3 acima, 4 abaixo, 5 atrás (passado), 6 adiante, e o
  // bastão de baixo para cima. Antes a raiz vinha em 3º e o que se busca em 5º.
  posicoes: [
    { nome: 'A situação', regra: 'o assunto como ele está',
      chave: 'agora', lugar: { coluna: 1, linha: 1 } },
    { nome: 'O que atravessa', regra: 'o que ajuda ou atrapalha, de lado',
      chave: 'obstaculo', lugar: { coluna: 2, linha: 1 }, deitada: true },
    { nome: 'O que se busca', regra: 'o que você quer que aconteça, dito ou não',
      lugar: { coluna: 1, linha: 0 } },
    { nome: 'A raiz', regra: 'o que sustenta isso por baixo, muitas vezes antigo',
      lugar: { coluna: 1, linha: 2 } },
    { nome: 'O que passou', regra: 'o que já saiu de cena e ainda ecoa',
      chave: 'passado', lugar: { coluna: 0, linha: 1 } },
    { nome: 'O que vem', regra: 'o próximo movimento, não o desfecho',
      chave: 'futuro', lugar: { coluna: 3, linha: 1 } },
    { nome: 'Você nisso', regra: 'como você está se portando dentro do assunto',
      lugar: { coluna: 4, linha: 3 } },
    { nome: 'Os outros', regra: 'o ambiente e as pessoas ao redor',
      lugar: { coluna: 4, linha: 2 } },
    { nome: 'Esperança e medo', regra: 'a mesma coisa vista pelos dois lados',
      lugar: { coluna: 4, linha: 1 } },
    { nome: 'Para onde caminha', regra: 'o desfecho provável se o caminho seguir assim',
      lugar: { coluna: 4, linha: 0 } },
  ],
};

export const TIRAGENS: Tiragem[] = [TRES_CARTAS, CRUZ_CELTA];

export const TIRAGEM_PADRAO = TRES_CARTAS;

/**
 * A ordem em que as posições desta tiragem devem ser LIDAS.
 *
 * Sem regra própria, é a ordem em que as cartas foram postas. Uma regra que devolva
 * índice fora da faixa ou repetido é descartada inteira e volta-se à ordem natural: é
 * melhor ler na ordem errada do que deixar uma posição de fora da leitura.
 */
export function ordemDasPosicoes(tiragem: Tiragem, agora: Date = new Date()): number[] {
  const natural = tiragem.posicoes.map((_, i) => i);
  if (!tiragem.ordemDeLeitura) return natural;
  const pedida = tiragem.ordemDeLeitura(agora);
  const valida = pedida.length === natural.length
    && new Set(pedida).size === natural.length
    && pedida.every((i) => Number.isInteger(i) && i >= 0 && i < natural.length);
  return valida ? pedida : natural;
}
