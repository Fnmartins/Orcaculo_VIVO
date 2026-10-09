import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking, StyleSheet } from 'react-native';

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

// O semáforo guarda o que a tela lhe passa: quem diz "você tem N leituras avulsas" é ele
// (tem teste próprio), e o que se prova aqui é que a tela lhe entrega o crédito certo.
const mockSemaforo = jest.fn();
jest.mock('../../../components/SemaforoUso', () => ({
  SemaforoUso: (props: unknown) => { mockSemaforo(props); return null; },
}));
// O filho que busca voz não faz parte do que se prova aqui.
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
let mockFalhou = false;
jest.mock('../../../hooks/useCreditoAvulso', () => ({
  useCreditoAvulso: (oraculo: string) => ({
    credito: mockCreditos[oraculo] ?? 0, gastou: false, falhou: mockFalhou,
  }),
}));

let mockMoeda = 'brl';
jest.mock('../../../services/stripe', () => ({
  moedaPadrao: () => mockMoeda,
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

import { Cores } from '../../../constants/colors';
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
  mockFalhou = false;
  mockMoeda = 'brl';
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

  it('com um crédito, não oferece de novo, e o semáforo é quem diz que ele existe', () => {
    mockCreditos = { mapa: 1 };
    render(<TelaMapaAstralResultado />);
    expect(screen.queryByText(OFERTA)).toBeNull();
    // O semáforo recebe o crédito e o diz ("você tem uma leitura avulsa"). A tela não o
    // repete: duas frases iguais na mesma tela seriam ruído.
    expect(mockSemaforo).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'interpretacao', creditoAvulso: 1 }),
    );
    expect(screen.queryByText(/leitura avulsa|leituras avulsas/)).toBeNull();
    // O botão da leitura segue ali: é com ele que o crédito se gasta.
    expect(screen.getByText(/Ler a minha combinação/)).toBeTruthy();
  });

  it('com vários créditos, o semáforo recebe a contagem inteira', () => {
    mockCreditos = { mapa: 3 };
    render(<TelaMapaAstralResultado />);
    expect(mockSemaforo).toHaveBeenLastCalledWith(expect.objectContaining({ creditoAvulso: 3 }));
    expect(screen.queryByText(OFERTA)).toBeNull();
  });

  it('crédito de vocação não vale como crédito de mapa', () => {
    // Cada crédito paga uma leitura de UM produto. Contar o de vocação aqui esconderia
    // a oferta de quem não tem como ler o mapa, e diria que há leitura onde não há.
    mockCreditos = { vocacao: 2 };
    render(<TelaMapaAstralResultado />);
    expect(mockSemaforo).toHaveBeenLastCalledWith(expect.objectContaining({ creditoAvulso: 0 }));
    expect(screen.getByText(OFERTA)).toBeTruthy();
  });

  it('se a leitura do crédito falhou, não convida a comprar: pode ser quem já pagou', () => {
    // "Zero" por queda de rede não é "não comprou". O `UNIQUE` é por sessão do Stripe, e
    // nada mais impede a segunda compra.
    mockFalhou = true;
    render(<TelaMapaAstralResultado />);
    expect(screen.queryByText(OFERTA)).toBeNull();
    expect(screen.queryByText(/O direito de gerar vale 90 dias/)).toBeNull();
    // A leitura continua à mão: o servidor é quem decide se ela sai.
    expect(screen.getByText(/Ler a minha combinação/)).toBeTruthy();
  });

  it('o botão de comprar é texto puro: sem a borda dos botões de assinatura', () => {
    // A assinatura é a oferta principal e isso tem de se ver. "Ler a minha combinação" é
    // botão de borda; a compra avulsa, não.
    render(<TelaMapaAstralResultado />);
    const compra = StyleSheet.flatten(screen.getByLabelText(OFERTA).props.style);
    const leitura = StyleSheet.flatten(
      screen.getByLabelText('Ler a combinação do meu mapa com IA').props.style,
    );
    expect(leitura.borderWidth).toBe(1);
    expect(compra.borderWidth).toBeUndefined();
    expect(compra.backgroundColor).toBeUndefined();
    const texto = StyleSheet.flatten(screen.getByText(OFERTA).props.style);
    expect(texto.fontSize).toBe(13);
    expect(texto.color).toBe(Cores.textoSecundario);
  });

  it('tocar em comprar pede o checkout do mapa e abre o endereço que voltou', async () => {
    render(<TelaMapaAstralResultado />);
    fireEvent.press(screen.getByText(OFERTA));

    await waitFor(() =>
      expect(abrirURL).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_teste'),
    );
    // O produto certo: comprar `vocacao` aqui entregaria um crédito que esta tela não gasta.
    expect(mockComprar).toHaveBeenCalledWith('mapa', 'brl');
    expect(mockAlerta).not.toHaveBeenCalled();
  });

  it('pede o checkout na moeda de quem compra, e não sempre em reais', async () => {
    mockMoeda = 'usd';
    render(<TelaMapaAstralResultado />);
    fireEvent.press(screen.getByText(OFERTA));

    await waitFor(() => expect(mockComprar).toHaveBeenCalledWith('mapa', 'usd'));
  });

  it('dois toques seguidos abrem um checkout só', async () => {
    // Cada checkout aberto pode virar uma compra. O segundo toque, com o primeiro ainda
    // abrindo, seria dinheiro cobrado por um toque duplo.
    mockComprar.mockReturnValue(new Promise(() => {}));
    render(<TelaMapaAstralResultado />);
    fireEvent.press(screen.getByText(OFERTA));
    fireEvent.press(screen.getByText('Abrindo o pagamento…'));

    expect(mockComprar).toHaveBeenCalledTimes(1);
  });

  it('depois de uma falha o botão volta, e dá para tentar de novo', async () => {
    mockComprar.mockRejectedValueOnce(new Error('O pagamento não abriu. Tente de novo.'));
    render(<TelaMapaAstralResultado />);
    fireEvent.press(screen.getByText(OFERTA));
    await waitFor(() => expect(mockAlerta).toHaveBeenCalledTimes(1));

    await waitFor(() => expect(screen.getByText(OFERTA)).toBeTruthy());
    fireEvent.press(screen.getByText(OFERTA));
    await waitFor(() => expect(mockComprar).toHaveBeenCalledTimes(2));
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
