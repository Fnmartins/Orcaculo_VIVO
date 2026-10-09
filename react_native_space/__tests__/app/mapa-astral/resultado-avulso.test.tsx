import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

/**
 * A oferta da compra avulsa no mapa astral.
 *
 * O crédito paga exatamente uma chamada de `ia-interpretacao`, a leitura da
 * combinação. Os dois cards de "Ver os planos" desta tela trancam conteúdo de PLANO
 * (os outros oito planetas e as doze casas), que o crédito não libera: oferecer a
 * compra ali venderia um produto que não entrega o que o card promete. Por isso a
 * oferta tem de estar ao lado da leitura, e só quando a pessoa não tem como lê-la.
 */

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('../../../utils/haptics', () => ({
  Hapticos: { impactoLeve: jest.fn(), impactoMedio: jest.fn(), selecao: jest.fn() },
}));

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

// Os dois filhos que buscam sessão e voz não fazem parte do que se prova aqui.
jest.mock('../../../components/SemaforoUso', () => ({ SemaforoUso: () => null }));
jest.mock('../../../components/BotaoOuvir', () => ({ BotaoOuvir: () => null }));
jest.mock('../../../services/compartilhar', () => ({ compartilharMapaAstral: jest.fn() }));

// `podeFazerConsulta` é a única verdade sobre "ainda tem consulta" que a tela usa:
// os testes a mexem diretamente, em vez de reconstruir plano, cota e super-admin.
let mockPodeConsultar = false;
jest.mock('../../../hooks/usePlano', () => ({
  usePlano: () => ({
    temAcesso: () => false,
    podeFazerConsulta: () => mockPodeConsultar,
  }),
}));

// Créditos por produto, como o hook real os separa: um teste pode dar crédito de
// vocação a quem não tem nenhum de mapa e conferir que a tela não confunde os dois.
let mockCreditos: Record<string, number> = {};
jest.mock('../../../hooks/useCreditoAvulso', () => ({
  useCreditoAvulso: (oraculo: string) => ({ credito: mockCreditos[oraculo] ?? 0 }),
}));

const mockComprar = jest.fn();
jest.mock('../../../services/avulso', () => ({
  comprarAvulso: (...a: unknown[]) => mockComprar(...a),
}));

const mockAlerta = jest.fn();
jest.mock('../../../utils/alerta', () => ({
  mostrarAlerta: (...a: unknown[]) => mockAlerta(...a),
}));

const mockInterpretar = jest.fn();
jest.mock('../../../services/ia', () => ({
  gerarInterpretacaoMapa: (...a: unknown[]) => mockInterpretar(...a),
}));

import TelaMapaAstralResultado from '../../../app/mapa-astral/resultado';

const PARAMS_SAO_PAULO = {
  dia: '15', mes: '7', ano: '1990', hora: '14', minuto: '30', semHora: '0',
  cidade: 'São Paulo', cidadeId: 'sao-paulo-sp', cidadeUf: 'SP', cidadePais: 'Brasil',
  lat: '-23.55', lon: '-46.63', fuso: 'America/Sao_Paulo', offsetPadrao: '-180',
};

const OFERTA = 'Comprar só esta leitura';

/** Todo texto da tela, na ordem em que aparece de cima para baixo. */
function textosNaOrdem(): string[] {
  const saida: string[] = [];
  const percorrer = (no: unknown): void => {
    if (typeof no === 'string') { saida.push(no); return; }
    if (Array.isArray(no)) { no.forEach(percorrer); return; }
    if (no && typeof no === 'object' && 'children' in no) {
      percorrer((no as { children: unknown }).children);
    }
  };
  percorrer(screen.toJSON());
  return saida;
}

let abrirURL: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { ...PARAMS_SAO_PAULO };
  mockPodeConsultar = false;
  mockCreditos = {};
  mockComprar.mockResolvedValue('https://checkout.stripe.com/c/pay/cs_teste');
  abrirURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => { abrirURL.mockRestore(); });

describe('compra avulsa no resultado do mapa astral', () => {
  it('sem crédito e sem consulta para gastar, oferece a compra, DEPOIS do botão da leitura', () => {
    render(<TelaMapaAstralResultado />);
    const textos = textosNaOrdem();
    const leitura = textos.findIndex((t) => /Ler a minha combinação/.test(t));
    const oferta = textos.indexOf(OFERTA);
    expect(leitura).toBeGreaterThanOrEqual(0);
    expect(oferta).toBeGreaterThanOrEqual(0);
    // A leitura continua sendo o caminho principal; a compra é a segunda saída.
    expect(leitura).toBeLessThan(oferta);
  });

  it('a oferta é uma só, ao lado da leitura, e não nos cards de "Ver os planos"', () => {
    // Os dois cards trancam planetas e casas, que o crédito não libera.
    render(<TelaMapaAstralResultado />);
    expect(screen.getAllByText('Ver os planos')).toHaveLength(2);
    expect(screen.getAllByText(OFERTA)).toHaveLength(1);
  });

  it('diz o prazo do direito e que a leitura gerada fica, antes de a pessoa pagar', () => {
    render(<TelaMapaAstralResultado />);
    expect(screen.getByText(/O direito de gerar vale 90 dias/)).toBeTruthy();
    expect(screen.getByText(/depois de gerada, fica para sempre/)).toBeTruthy();
  });

  it('com consulta para gastar, não oferece a compra', () => {
    // Quem ainda tem leitura no plano (ou é ilimitado, ou é super-admin) não precisa
    // pagar à parte. A decisão é de `podeFazerConsulta`, que o app já usa.
    mockPodeConsultar = true;
    render(<TelaMapaAstralResultado />);
    expect(screen.queryByText(OFERTA)).toBeNull();
    expect(screen.queryByText(/leitura avulsa|leituras avulsas/)).toBeNull();
  });

  it('com um crédito, não oferece de novo e diz que ele existe', () => {
    mockCreditos = { mapa: 1 };
    render(<TelaMapaAstralResultado />);
    expect(screen.getByText('Você tem uma leitura avulsa deste mapa para usar.')).toBeTruthy();
    expect(screen.queryByText(OFERTA)).toBeNull();
    // O botão da leitura segue ali: é com ele que o crédito se gasta.
    expect(screen.getByText(/Ler a minha combinação/)).toBeTruthy();
  });

  it('com vários créditos, diz quantos no plural', () => {
    mockCreditos = { mapa: 3 };
    render(<TelaMapaAstralResultado />);
    expect(screen.getByText('Você tem 3 leituras avulsas deste mapa para usar.')).toBeTruthy();
    expect(screen.queryByText(OFERTA)).toBeNull();
  });

  it('crédito de vocação não vale como crédito de mapa', () => {
    // Cada crédito paga uma leitura de UM produto. Contar o de vocação aqui esconderia
    // a oferta de quem não tem como ler o mapa, e diria que há leitura onde não há.
    mockCreditos = { vocacao: 2 };
    render(<TelaMapaAstralResultado />);
    expect(screen.queryByText(/leitura avulsa|leituras avulsas/)).toBeNull();
    expect(screen.getByText(OFERTA)).toBeTruthy();
  });

  it('tocar em comprar pede o checkout do mapa e abre o endereço que voltou', async () => {
    render(<TelaMapaAstralResultado />);
    fireEvent.press(screen.getByText(OFERTA));

    await waitFor(() =>
      expect(abrirURL).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_teste'),
    );
    // O produto certo: comprar `vocacao` aqui entregaria um crédito que esta tela não gasta.
    expect(mockComprar).toHaveBeenCalledWith('mapa');
    expect(mockAlerta).not.toHaveBeenCalled();
  });

  it('se o pagamento não abre, a pessoa lê o motivo e nenhum endereço é aberto', async () => {
    mockComprar.mockRejectedValue(new Error('O pagamento não abriu. Tente de novo.'));
    render(<TelaMapaAstralResultado />);
    fireEvent.press(screen.getByText(OFERTA));

    await waitFor(() => expect(mockAlerta).toHaveBeenCalledWith(
      'Não foi possível abrir o pagamento', 'O pagamento não abriu. Tente de novo.',
    ));
    expect(abrirURL).not.toHaveBeenCalled();
  });

  it('depois que a leitura aparece, não há mais o que comprar', async () => {
    mockInterpretar.mockResolvedValue({
      titulo: 'Uma combinação', narrativa: 'Texto da narrativa.',
      forca: 'Texto da força.', tensao: 'Texto da tensão.', conselho: 'Texto do conselho.',
    });
    render(<TelaMapaAstralResultado />);
    fireEvent.press(screen.getByText(/Ler a minha combinação/));

    await waitFor(() => expect(screen.getByText('Texto da narrativa.')).toBeTruthy());
    expect(screen.queryByText(OFERTA)).toBeNull();
  });
});
