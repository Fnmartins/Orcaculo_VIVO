import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

/**
 * A leitura com IA passou a responder à pergunta, como uma taróloga: "as cartas
 * apontam para arriscar, porque…". Antes ela só ligava as cartas e devolvia perguntas,
 * e quem perguntou "mudo de emprego?" saía sem resposta nenhuma.
 *
 * E a "Síntese da Leitura" fixa, escrita para Passado / Presente / Futuro, chamava a
 * primeira carta da Cruz Celta ("A situação") de "carta do passado".
 */

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
jest.mock('../../../services/compartilhar', () => ({
  compartilharTarot: jest.fn(),
  compartilharBuzios: jest.fn(),
}));

const mockTarot = jest.fn();
jest.mock('../../../services/ia', () => ({
  IA_REMOTA_DISPONIVEL: true,
  gerarInterpretacaoTarot: (...a: unknown[]) => mockTarot(...a),
  gerarInterpretacaoBuzios: jest.fn(),
}));

import TelaResultadoTarot from '../../../app/consulta/resultado';

const APROFUNDAR = 'Aprofundar com IA ✨';
const ROTULO_DA_RESPOSTA = 'O que as cartas respondem';

const TRES = JSON.stringify([
  { id: 1, nomeCompleto: 'O Mago', significado: 'poder de realizar' },
  { id: 2, nomeCompleto: 'A Sacerdotisa', significado: 'escuta do que não se diz' },
  { id: 3, nomeCompleto: 'A Estrela', significado: 'esperança com direção' },
]);

const NOMES_DA_CRUZ = [
  'A situação', 'O que atravessa', 'O que se busca', 'A raiz', 'O que passou',
  'O que vem', 'Você nisso', 'Os outros', 'Esperança e medo', 'Para onde caminha',
];
const DEZ = JSON.stringify(NOMES_DA_CRUZ.map((_, i) => ({
  id: i, nomeCompleto: `Carta ${i}`, significado: `significado ${i}`,
})));
const POSICOES_DA_CRUZ = JSON.stringify(NOMES_DA_CRUZ.map((nome) => ({ nome })));

const leitura = (extra: Record<string, unknown> = {}) => ({
  titulo: 'Coragem com escuta',
  narrativa: 'As cartas falam juntas de um movimento que já começou.',
  conselho: 'Dê o primeiro passo pequeno.',
  leituras: [
    { posicao: 'Passado', texto: 't1' },
    { posicao: 'Presente', texto: 't2' },
    { posicao: 'Futuro', texto: 't3' },
  ],
  ...extra,
});

beforeEach(() => mockTarot.mockReset());

describe('a resposta da taróloga', () => {
  it('aparece com a pergunta que a pessoa escreveu', async () => {
    mockTarot.mockResolvedValue(leitura({
      resposta: 'As cartas apontam para arriscar: o Mago no presente pede o primeiro passo.',
    }));
    mockParams = { cartas: TRES, intencao: 'devo mudar de emprego?' };
    render(<TelaResultadoTarot />);
    fireEvent.press(screen.getByText(APROFUNDAR));
    expect(await screen.findByText(/As cartas apontam para arriscar/)).toBeTruthy();
    expect(screen.getByText(ROTULO_DA_RESPOSTA)).toBeTruthy();
    expect(screen.getByText('Sobre: devo mudar de emprego?')).toBeTruthy();
  });

  it('sem pergunta escrita, não inventa uma linha de "Sobre"', async () => {
    mockTarot.mockResolvedValue(leitura({ resposta: 'Seja qual for a pergunta, as cartas pedem calma.' }));
    mockParams = { cartas: TRES };
    render(<TelaResultadoTarot />);
    fireEvent.press(screen.getByText(APROFUNDAR));
    expect(await screen.findByText(/as cartas pedem calma/)).toBeTruthy();
    expect(screen.queryByText(/^Sobre:/)).toBeNull();
  });

  it('leitura sem resposta, como as salvas antes, continua abrindo', async () => {
    mockTarot.mockResolvedValue(leitura());
    mockParams = { cartas: TRES, intencao: 'devo mudar de emprego?' };
    render(<TelaResultadoTarot />);
    fireEvent.press(screen.getByText(APROFUNDAR));
    expect(await screen.findByText('As cartas falam juntas de um movimento que já começou.')).toBeTruthy();
    expect(screen.queryByText(ROTULO_DA_RESPOSTA)).toBeNull();
  });
});

describe('a síntese fixa', () => {
  it('nas três cartas continua, porque ali passado, presente e futuro são verdade', () => {
    mockParams = { cartas: TRES };
    render(<TelaResultadoTarot />);
    expect(screen.getByText(/Na posição de futuro/)).toBeTruthy();
  });

  it('na Cruz Celta não chama a situação de passado, e o botão conta as dez', () => {
    mockParams = { cartas: DEZ, posicoes: POSICOES_DA_CRUZ };
    render(<TelaResultadoTarot />);
    expect(screen.queryByText(/carta do passado|Na posição de futuro/)).toBeNull();
    expect(screen.queryByText(/3 cartas/)).toBeNull();
    expect(screen.getByText('Ler as 10 cartas juntas e responder à sua pergunta')).toBeTruthy();
  });
});
