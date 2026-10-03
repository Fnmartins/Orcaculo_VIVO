import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

/**
 * O que a tela do resultado manda para a IA, medido na chamada de `gerarInterpretacaoTarot`.
 *
 * Existe porque o teste do serviço (`services/__tests__/ia.test.ts`) só prova que
 * `gerarInterpretacaoTarot` repassa o que recebe — e ele sempre repassou, porque o corpo
 * leva `cartas` inteiro. Quem monta cada carta é o mapeador de `app/consulta/resultado.tsx`,
 * campo a campo, e todos os campos novos são opcionais: apagar uma linha dali não derruba
 * o `tsc` nem nenhum outro teste. É a mesma forma do defeito que já custou um dia com as
 * quatro áreas do mapa, que chegavam do servidor e morriam num mapeador feito à mão.
 *
 * Aqui a garantia fica do lado certo: monta a tela, aperta o botão e olha os argumentos.
 */

// O prefixo `mock` não é estilo: a fábrica de `jest.mock` é içada para antes das
// declarações, e só variáveis com esse prefixo podem ser citadas lá dentro.
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('../../../components/GradientBackground', () => {
  const { View } = require('react-native');
  return { GradientBackground: View };
});

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('../../../components/CartaTarotVisual', () => ({ CartaTarotVisual: () => null }));

// Estes filhos falam com o Supabase por conta própria e têm suíte própria.
jest.mock('../../../components/BotaoOuvir', () => ({ BotaoOuvir: () => null }));
jest.mock('../../../components/CaixaDePergunta', () => ({ CaixaDePergunta: () => null }));
jest.mock('../../../components/SemaforoUso', () => ({ SemaforoUso: () => null }));
jest.mock('../../../components/RatingConsulta', () => ({ RatingConsulta: () => null }));
jest.mock('../../../components/ConviteHistorico', () => ({ ConviteHistorico: () => null }));
jest.mock('../../../components/NotaReflexiva', () => ({ NotaReflexiva: () => null }));

jest.mock('../../../utils/haptics', () => ({
  Hapticos: { impactoLeve: jest.fn(), impactoMedio: jest.fn() },
}));
jest.mock('../../../utils/navegacao', () => ({ voltarOuIr: jest.fn() }));
jest.mock('../../../services/compartilhar', () => ({ compartilharTarot: jest.fn() }));

const mockTarot = jest.fn();
jest.mock('../../../services/ia', () => ({
  IA_REMOTA_DISPONIVEL: true,
  gerarInterpretacaoTarot: (...a: unknown[]) => mockTarot(...a),
}));

import TelaResultadoTarot from '../../../app/consulta/resultado';

const APROFUNDAR = 'Aprofundar com IA ✨';

const POSICOES_COM_CHAVE = JSON.stringify([
  { nome: 'O que é agora', regra: 'o que está em jogo', chave: 'agora' },
  { nome: 'O que atravessa', regra: 'o que ajuda ou atrapalha', chave: 'obstaculo' },
  { nome: 'Para onde vai', regra: 'o que tende a se formar', chave: 'futuro' },
]);

const POSICOES_SEM_CHAVE = JSON.stringify([
  { nome: 'Passado', regra: 'o que já se consumou' },
  { nome: 'Presente', regra: 'o que está em jogo' },
  { nome: 'Futuro', regra: 'o que tende a se formar' },
]);

// Como `cartas.tsx` as manda: a carta inteira, serializada.
const CARTAS_COM_MATERIAL = JSON.stringify([
  {
    id: 1,
    nomeCompleto: 'I - O Mago',
    significado: 'poder de realizar',
    palavrasChave: ['vontade', 'ação'],
    frasesChave: ['tudo ao alcance da mão'],
    porPosicao: { agora: 'Aqui o Mago pede que se comece.' },
  },
  {
    id: 2,
    nomeCompleto: 'II - A Sacerdotisa',
    significado: 'escuta do que não se diz',
    palavrasChave: ['silêncio'],
    frasesChave: ['o que se sabe sem dizer'],
    // Sem `porPosicao.obstaculo`: a nota tem de cair em `leituraInvertida`.
    leituraInvertida: 'A mesma escuta, travada.',
  },
  {
    id: 3,
    nomeCompleto: 'XVII - A Estrela',
    significado: 'esperança com direção',
    palavrasChave: ['esperança'],
    frasesChave: ['a água volta a correr'],
    // Sem nota para `futuro` e sem `leituraInvertida`: nada a repassar.
  },
]);

// O estado de hoje: nenhuma das 22 cartas tem o verbete preenchido.
const CARTAS_SEM_MATERIAL = JSON.stringify([
  { id: 1, nomeCompleto: 'I - O Mago', significado: 'poder de realizar' },
  { id: 2, nomeCompleto: 'II - A Sacerdotisa', significado: 'escuta do que não se diz' },
  { id: 3, nomeCompleto: 'XVII - A Estrela', significado: 'esperança com direção' },
]);

type CartaEnviada = {
  nome: string;
  chave?: string;
  palavrasChave?: string[];
  frasesChave?: string[];
  nota?: string;
};

/** Monta a tela, aperta "Aprofundar" e devolve as cartas que foram para a IA. */
function aprofundarEPegarCartas(params: Record<string, string>): CartaEnviada[] {
  mockParams = params;
  render(<TelaResultadoTarot />);
  fireEvent.press(screen.getByText(APROFUNDAR));
  expect(mockTarot).toHaveBeenCalledTimes(1);
  return mockTarot.mock.calls[0][0] as CartaEnviada[];
}

beforeEach(() => {
  mockTarot.mockReset();
  // Promessa que nunca resolve: a medição é a chamada, e uma resposta faria a tela
  // atualizar estado depois do teste.
  mockTarot.mockReturnValue(new Promise(() => {}));
  mockParams = {};
});

describe('o que a tela do resultado manda para a IA', () => {
  describe('com material nas cartas', () => {
    const params = {
      cartas: CARTAS_COM_MATERIAL,
      posicoes: POSICOES_COM_CHAVE,
      intencao: 'o que fazer agora',
    };

    it('leva palavras-chave e frases-chave de cada carta', () => {
      const cartas = aprofundarEPegarCartas(params);

      expect(cartas.map((c) => c.palavrasChave)).toEqual([['vontade', 'ação'], ['silêncio'], ['esperança']]);
      expect(cartas.map((c) => c.frasesChave)).toEqual([
        ['tudo ao alcance da mão'],
        ['o que se sabe sem dizer'],
        ['a água volta a correr'],
      ]);
    });

    it('leva a chave de cada posição', () => {
      const cartas = aprofundarEPegarCartas(params);

      expect(cartas.map((c) => c.chave)).toEqual(['agora', 'obstaculo', 'futuro']);
    });

    it('leva a nota que a carta tem para aquela posição', () => {
      const cartas = aprofundarEPegarCartas(params);

      expect(cartas[0].nota).toBe('Aqui o Mago pede que se comece.');
    });

    it('na posição de obstáculo, a nota cai em `leituraInvertida` quando não há nota própria', () => {
      // É a regra de `notaDaPosicao`: as fontes tratam "revertida" e "obstáculo" como
      // a mesma leitura. Se o mapeador deixar de passar a chave, ou de chamar a função,
      // a IA fica sem a única frase que diz o que esta carta faz nesta posição.
      const cartas = aprofundarEPegarCartas(params);

      expect(cartas[1].nota).toBe('A mesma escuta, travada.');
    });

    it('sem nota para a posição, a nota fica de fora em vez de inventada', () => {
      const cartas = aprofundarEPegarCartas(params);

      expect(cartas[2].nota).toBeUndefined();
    });

    it('continua mandando a posição, a regra e o significado de sempre', () => {
      const cartas = aprofundarEPegarCartas(params);

      expect(cartas[1]).toMatchObject({
        nome: 'II - A Sacerdotisa',
        posicao: 'O que atravessa',
        regra: 'o que ajuda ou atrapalha',
        significado: 'escuta do que não se diz',
      });
      expect(mockTarot.mock.calls[0][1]).toBe('o que fazer agora');
    });
  });

  describe('sem material nas cartas, que é o estado de hoje', () => {
    it('numa leitura sem `chave`, os quatro campos vão `undefined` e nada lança', () => {
      // Leitura aberta antes de `posicoes` carregar `chave`, e cartas sem verbete.
      const cartas = aprofundarEPegarCartas({
        cartas: CARTAS_SEM_MATERIAL,
        posicoes: POSICOES_SEM_CHAVE,
      });

      expect(cartas).toHaveLength(3);
      for (const carta of cartas) {
        expect(carta.chave).toBeUndefined();
        expect(carta.palavrasChave).toBeUndefined();
        expect(carta.frasesChave).toBeUndefined();
        expect(carta.nota).toBeUndefined();
      }
    });

    it('sem o parâmetro `posicoes` (recuo para leituras antigas), também não lança', () => {
      const cartas = aprofundarEPegarCartas({ cartas: CARTAS_SEM_MATERIAL });

      expect(cartas).toHaveLength(3);
      for (const carta of cartas) {
        expect(carta.chave).toBeUndefined();
        expect(carta.palavrasChave).toBeUndefined();
        expect(carta.frasesChave).toBeUndefined();
        expect(carta.nota).toBeUndefined();
      }
    });

    it('com a chave da posição mas sem texto de carta, só a chave viaja', () => {
      // O que acontece hoje numa tiragem real: `cartas.tsx` já manda `chave`, e as
      // cartas ainda não têm palavras, frases nem nota.
      const cartas = aprofundarEPegarCartas({
        cartas: CARTAS_SEM_MATERIAL,
        posicoes: POSICOES_COM_CHAVE,
      });

      expect(cartas.map((c) => c.chave)).toEqual(['agora', 'obstaculo', 'futuro']);
      for (const carta of cartas) {
        expect(carta.palavrasChave).toBeUndefined();
        expect(carta.frasesChave).toBeUndefined();
        expect(carta.nota).toBeUndefined();
      }
    });
  });
});
