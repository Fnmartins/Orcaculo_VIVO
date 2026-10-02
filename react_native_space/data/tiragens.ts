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

export interface PosicaoDaTiragem {
  nome: string;
  /** O que esta posição pergunta. Lida antes da carta, ela explica a tiragem sozinha. */
  regra: string;
}

export interface Tiragem {
  id: 'tres-cartas' | 'cruz-celta';
  nome: string;
  /** Uma frase sobre quando esta tiragem serve. */
  quando: string;
  posicoes: PosicaoDaTiragem[];
}

const TRES_CARTAS: Tiragem = {
  id: 'tres-cartas',
  nome: 'Três cartas',
  quando: 'Para uma pergunta direta, ou para ver o movimento de uma situação.',
  posicoes: [
    { nome: 'Passado', regra: 'o que já se consumou e ainda pesa' },
    { nome: 'Presente', regra: 'o que está em jogo agora' },
    { nome: 'Futuro', regra: 'o que tende a se formar se nada mudar' },
  ],
};

const CRUZ_CELTA: Tiragem = {
  id: 'cruz-celta',
  nome: 'Cruz Celta',
  quando: 'Para uma situação enroscada, quando a pergunta direta não dá conta.',
  posicoes: [
    { nome: 'A situação', regra: 'o assunto como ele se apresenta, no centro de tudo' },
    { nome: 'O que atravessa', regra: 'o que cruza o caminho — ajudando ou atrapalhando' },
    { nome: 'O que você busca', regra: 'o melhor que pode vir disto, ou o que você espera dele' },
    { nome: 'A base', regra: 'o que já está dado e sustenta a situação por baixo' },
    { nome: 'O que ficou para trás', regra: 'o que acabou de passar e ainda deixa marca' },
    { nome: 'O que se aproxima', regra: 'o que vem a seguir, no tempo curto' },
    { nome: 'Você nisto', regra: 'como você se vê e se coloca diante do assunto' },
    { nome: 'O entorno', regra: 'o que as pessoas e o ambiente ao redor trazem para dentro' },
    { nome: 'Esperança e medo', regra: 'o que você quer e o que você teme — que costumam ser a mesma coisa' },
    { nome: 'Para onde tende', regra: 'a direção que isto aponta se nada mudar' },
  ],
};

export const TIRAGENS: Tiragem[] = [TRES_CARTAS, CRUZ_CELTA];

export const TIRAGEM_PADRAO = TRES_CARTAS;
