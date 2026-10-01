import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

/**
 * O servidor sempre soube por que recusou — "Seu acesso terminou em 28/09", "Suas
 * consultas deste período acabaram" — e estas duas telas trocavam qualquer motivo por
 * "Falha ao conectar. Tocar para tentar novamente.", que não é nenhum dos dois e
 * convida a insistir num caminho que não vai abrir.
 *
 * O custo ficou medido em 30/09: uma investigação inteira às cegas, procurando bundle
 * velho e gatilho no banco, enquanto a resposta estava na mensagem descartada. As
 * outras quatro telas de IA já mostravam o motivo (`ia/processando`, `BotaoOuvir`,
 * `mapa-astral/resultado`, `CaixaDePergunta`) — estas eram as duas fora do padrão.
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

// Os ícones viram nada: as asserções olham texto e rótulo, e o componente real de
// ícone é o que gera aviso de "not wrapped in act(...)".
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('../../../components/BuzioIcon', () => ({ BuzioIcon: () => null }));
jest.mock('../../../components/CartaTarotVisual', () => ({ CartaTarotVisual: () => null }));

// Estes filhos falam com o Supabase por conta própria e têm suíte própria. Aqui eles
// sairiam do caminho do que está sendo medido e trariam rede para dentro do teste.
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
const mockBuzios = jest.fn();
// `services/falhaDaIA` fica de fora dos mocks de propósito: é a decisão sob medição, e
// reimplementá-la aqui faria a suíte concordar consigo mesma em vez de com o app.
jest.mock('../../../services/ia', () => ({
  IA_REMOTA_DISPONIVEL: true,
  gerarInterpretacaoTarot: (...a: unknown[]) => mockTarot(...a),
  gerarInterpretacaoBuzios: (...a: unknown[]) => mockBuzios(...a),
}));

import TelaResultadoTarot from '../../../app/consulta/resultado';
import TelaBuziosResultado from '../../../app/consulta/buzios-resultado';
import { ODUS } from '../../../data/buzios';
import { FALHA_SEM_MOTIVO, NOME_SEM_CONSULTAS } from '../../../services/falhaDaIA';

const TENTAR_DE_NOVO = 'Tentar gerar a interpretação novamente';
const APROFUNDAR = 'Aprofundar com IA ✨';

/** Como o 402 chega às telas: `services/ia` carimba este `name` no erro do servidor. */
const recusaDoPlano = (frase: string) => {
  const falha = new Error(frase);
  falha.name = NOME_SEM_CONSULTAS;
  return falha;
};

const CARTAS = JSON.stringify([
  { id: 1, nomeCompleto: 'O Mago', significado: 'poder de realizar' },
  { id: 2, nomeCompleto: 'A Sacerdotisa', significado: 'escuta do que não se diz' },
  { id: 3, nomeCompleto: 'A Estrela', significado: 'esperança com direção' },
]);

const JOGO = JSON.stringify({
  buzios: Array.from({ length: 16 }, (_, i) => i < ODUS[0].abertos),
  odu: ODUS[0],
});

interface Tela {
  nome: string;
  abrir: () => void;
  mock: jest.Mock;
}

const TELAS: Tela[] = [
  {
    nome: 'tarô',
    mock: mockTarot,
    abrir: () => {
      mockParams = { cartas: CARTAS };
      render(<TelaResultadoTarot />);
    },
  },
  {
    nome: 'búzios',
    mock: mockBuzios,
    abrir: () => {
      mockParams = { resultado: JOGO, intencao: 'o que preciso ver agora' };
      render(<TelaBuziosResultado />);
    },
  },
];

beforeEach(() => {
  mockTarot.mockReset();
  mockBuzios.mockReset();
  mockParams = {};
});

describe.each(TELAS.map((t) => [t.nome, t] as const))('erro da IA em %s', (_nome, tela) => {
  // Toca no botão e devolve o controle: cada teste espera com `findByText`, que já
  // resolve o act() da promessa rejeitada.
  const aprofundar = () => {
    tela.abrir();
    fireEvent.press(screen.getByText(APROFUNDAR));
  };

  it('mostra a frase do servidor em vez de inventar falha de conexão', async () => {
    const frase = 'Seu acesso terminou em 28/09. Atualize seu plano para continuar.';
    tela.mock.mockRejectedValue(recusaDoPlano(frase));
    aprofundar();

    expect(await screen.findByText(frase)).toBeTruthy();
    expect(screen.queryByText(FALHA_SEM_MOTIVO)).toBeNull();
  });

  it('recusa de plano não convida a tentar de novo, porque tentar não abre nada', async () => {
    tela.mock.mockRejectedValue(recusaDoPlano('Suas consultas deste período acabaram.'));
    aprofundar();

    expect(await screen.findByText('Suas consultas deste período acabaram.')).toBeTruthy();
    expect(screen.queryByLabelText(TENTAR_DE_NOVO)).toBeNull();
  });

  it('falha de serviço com motivo mostra o motivo E mantém a nova tentativa', async () => {
    // Aqui tentar de novo resolve mesmo: a recusa não é do plano, é do serviço.
    tela.mock.mockRejectedValue(new Error('A leitura voltou incompleta. Tente de novo.'));
    aprofundar();

    expect(await screen.findByText('A leitura voltou incompleta. Tente de novo.')).toBeTruthy();
    expect(screen.getByLabelText(TENTAR_DE_NOVO)).toBeTruthy();
  });

  it('sem motivo nenhum, continua dizendo o que dizia antes', async () => {
    // Nem todo tropeço chega como Error com texto — uma queda de rede pode resolver em
    // rejeição crua. Nesse caso a frase antiga é a honesta.
    tela.mock.mockRejectedValue({ sem: 'mensagem' });
    aprofundar();

    expect(await screen.findByText(FALHA_SEM_MOTIVO)).toBeTruthy();
    expect(screen.getByLabelText(TENTAR_DE_NOVO)).toBeTruthy();
  });
});
