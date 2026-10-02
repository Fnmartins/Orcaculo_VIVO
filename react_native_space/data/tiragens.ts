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
  // Copiadas do protótipo aprovado (`Camadas do Tarô`), palavra por palavra. Não são
  // para reescrever: foram lidas e aceitas lá, e trocá-las por redação nova aqui é
  // exatamente o retrabalho que o protótipo existia para evitar.
  posicoes: [
    { nome: 'A situação', regra: 'o assunto como ele está' },
    { nome: 'O que atravessa', regra: 'o que ajuda ou atrapalha, de lado' },
    { nome: 'A raiz', regra: 'o que sustenta isso por baixo, muitas vezes antigo' },
    { nome: 'O que passou', regra: 'o que já saiu de cena e ainda ecoa' },
    { nome: 'O que se busca', regra: 'o que você quer que aconteça, dito ou não' },
    { nome: 'O que vem', regra: 'o próximo movimento, não o desfecho' },
    { nome: 'Você nisso', regra: 'como você está se portando dentro do assunto' },
    { nome: 'Os outros', regra: 'o ambiente e as pessoas ao redor' },
    { nome: 'Esperança e medo', regra: 'a mesma coisa vista pelos dois lados' },
    { nome: 'Para onde caminha', regra: 'o desfecho provável se o caminho seguir assim' },
  ],
};

export const TIRAGENS: Tiragem[] = [TRES_CARTAS, CRUZ_CELTA];

export const TIRAGEM_PADRAO = TRES_CARTAS;
