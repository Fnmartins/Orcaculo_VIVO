import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('../../../utils/haptics', () => ({
  Hapticos: { impactoLeve: jest.fn(), impactoMedio: jest.fn(), selecao: jest.fn() },
}));

import TelaCartas from '../../../app/consulta/cartas';

// "Reduzir movimento" ligado: o riffle entrega o baralho na hora, e o fluxo do rito é
// testado sem depender do tempo de nenhuma animação.
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
});

afterEach(() => jest.restoreAllMocks());

// A leitura do "reduzir movimento" é assíncrona: sem este ato, cada teste reclama de um
// setState fora do act quando a promessa resolve.
const abrir = async () => {
  render(<TelaCartas />);
  await act(async () => {});
};

const CAMPO_INTENCAO = 'O que te trouxe aqui?';
const cortar = () => fireEvent.press(screen.getByLabelText('Cortar aqui, carta 8 de 22'));
const irParaLeitura = () => fireEvent.press(screen.getByText('Ir para a leitura'));
const puxar = () => fireEvent.press(screen.getByLabelText('Carta de cima do monte, pegue daqui'));
const seguir = () => fireEvent.press(screen.getByText('Ver Leitura Completa'));
const escolherCruzCelta = () => fireEvent.press(screen.getByLabelText('Cruz Celta, 10 cartas'));

/** Puxa `quantas` cartas e espera elas virarem sozinhas, como no protótipo. */
const distribuir = async (quantas: number) => {
  for (let i = 0; i < quantas; i++) puxar();
  await waitFor(() => expect(screen.getByText('Ver Leitura Completa')).toBeTruthy());
};

describe('o rito do tarô', () => {
  it('começa pedindo o corte, e conta o que há na mesa', async () => {
    await abrir();
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(22);
    expect(screen.getByText('Toque numa carta do leque para tirar um monte.')).toBeTruthy();
    expect(screen.getByText(/O baralho tem 22 cartas, embaralhadas/)).toBeTruthy();
    // "Ir para a leitura" só aparece quando já há um corte dado.
    expect(screen.queryByText('Ir para a leitura')).toBeNull();
    expect(screen.queryByText('Pegue daqui')).toBeNull();
  });

  it('o corte deixa rastro: o monte aparece e a narração muda', async () => {
    // Sem os montes na tela o corte não registra nada, e a pessoa não vê que fez algo.
    await abrir();
    cortar();
    expect(screen.getByText(/^1º · \d+ cartas?$/)).toBeTruthy();
    expect(screen.getByText('Cortar de novo, ou seguir para a leitura?')).toBeTruthy();
    expect(screen.getByText(/1 monte de lado, \d+ cartas ainda no leque\./)).toBeTruthy();
  });


  it('cortar perto da ponta esvazia o leque, e a tela diz isso', async () => {
    // O defeito que o dono encontrou com o dedo: o corte leva TUDO do comeco do leque
    // ate onde se toca. Tocar perto da direita leva quase o baralho — e com 22 cartas
    // o corte acaba num toque so. A carta mais facil de acertar e justamente a da
    // ponta, que esta por cima de todas.
    //
    // Nao e defeito de toque; e o leque ficando sem cartas. O que era defeito e a tela
    // continuar desenhando um leque com cara de clicavel depois disso.
    await abrir();
    fireEvent.press(screen.getByLabelText('Cortar aqui, carta 21 de 22'));
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(1);
    expect(screen.getByText('Nao sobrou leque para cortar.'.replace('Nao', 'Não'))).toBeTruthy();
    expect(screen.getByText('Siga para a leitura.')).toBeTruthy();
    expect(screen.getByText('Ir para a leitura')).toBeTruthy();
  });

  it('antes de soltar, a tela diz o tamanho do monte que sairia', async () => {
    // Sem isto a pessoa so descobre o tamanho do corte depois de dado, e um toque na
    // ponta direita leva o baralho inteiro sem aviso.
    await abrir();
    fireEvent(screen.getByLabelText('Cortar aqui, carta 8 de 22'), 'pressIn');
    expect(screen.getByText(/Soltando aqui, saem 8 cartas e ficam 14 no leque\./)).toBeTruthy();
    fireEvent(screen.getByLabelText('Cortar aqui, carta 8 de 22'), 'pressOut');
    expect(screen.getByText(/O baralho tem 22 cartas/)).toBeTruthy();
  });

  it('depois de juntar, as posições aparecem vazias com a pergunta de cada uma', async () => {
    await abrir();
    cortar(); irParaLeitura();
    expect(screen.getByLabelText('Posição Passado, vazia')).toBeTruthy();
    expect(screen.getByLabelText('Posição Presente, vazia')).toBeTruthy();
    expect(screen.getByLabelText('Posição Futuro, vazia')).toBeTruthy();
    expect(screen.getByText('o que já se consumou e ainda pesa')).toBeTruthy();
    expect(
      screen.getByText('Montes juntos. Agora as cartas são suas para distribuir.')
    ).toBeTruthy();
  });

  it('a carta pousa de costas e vira sozinha', async () => {
    // É a espera que faz a leitura acontecer. No protótipo são 320 ms entre pousar e
    // virar; sem isso a carta aparece pronta e não acontece nada.
    await abrir();
    cortar(); irParaLeitura();
    puxar();
    expect(screen.getByLabelText(/^Posição Passado, carta de costas/)).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByLabelText(/^Posição Passado, carta de costas/)).toBeNull()
    );
  });

  it('a distribuição conta quantas faltam', async () => {
    await abrir();
    cortar(); irParaLeitura();
    expect(screen.getByText(/Faltam 3 cartas\./)).toBeTruthy();
    puxar();
    await waitFor(() => expect(screen.getByText(/Faltam 2 cartas\./)).toBeTruthy());
  });

  it('as três cartas distribuídas levam ao resultado', async () => {
    await abrir();
    cortar(); irParaLeitura();
    await distribuir(3);
    seguir();
    expect(mockPush).toHaveBeenCalledTimes(1);
    const destino = mockPush.mock.calls[0][0];
    expect(destino.pathname).toBe('/consulta/resultado');
    expect(JSON.parse(destino.params.cartas)).toHaveLength(3);
  });

  it('não oferece a leitura com posição vazia', async () => {
    // A regressão mais provável: liberar a leitura assim que a primeira carta cai.
    await abrir();
    cortar(); irParaLeitura(); puxar();
    await waitFor(() =>
      expect(screen.queryByLabelText(/^Posição Passado, carta de costas/)).toBeNull()
    );
    expect(screen.queryByText('Ver Leitura Completa')).toBeNull();
  });

  it('as três cartas da tiragem são distintas', async () => {
    // `puxar` tira do topo do baralho recolhido e encurta o monte. Se ele lesse sempre
    // a mesma lista, a tiragem sairia com a mesma carta três vezes.
    await abrir();
    cortar(); irParaLeitura();
    await distribuir(3);
    seguir();
    const cartas = JSON.parse(mockPush.mock.calls[0][0].params.cartas) as { id: number }[];
    expect(new Set(cartas.map((c) => c.id)).size).toBe(3);
  });

  it('tocar numa vaga põe a carta naquela vaga, não na primeira', async () => {
    // Desde o arraste a posição é escolhida, não sorteada pela ordem. Se o toque numa
    // vaga caísse sempre na primeira vazia, o arraste e o toque diriam coisas
    // diferentes sobre a mesma tela.
    await abrir();
    cortar(); irParaLeitura();
    fireEvent.press(screen.getByLabelText('Posição Futuro, vazia'));
    expect(screen.getByLabelText('Posição Passado, vazia')).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByLabelText('Posição Futuro, vazia')).toBeNull()
    );
  });

  it('recomeçar está sempre à mão, e devolve o baralho inteiro', async () => {
    // No protótipo o botão vive no painel do baralho desde o começo. Quem cortou errado
    // na primeira carta não precisa sair da tela para recomeçar.
    await abrir();
    expect(screen.getByText('Recomeçar o rito')).toBeTruthy();
    cortar(); irParaLeitura();
    expect(screen.getByText('Pegue daqui')).toBeTruthy();
    fireEvent.press(screen.getByText('Recomeçar o rito'));
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(22);
    expect(screen.queryByText('Pegue daqui')).toBeNull();
  });

  it('recomeçar não apaga a intenção escrita', async () => {
    // A pergunta que trouxe a pessoa continua a mesma. Fazê-la digitar de novo é
    // castigo por querer outra tiragem.
    await abrir();
    fireEvent.changeText(screen.getByLabelText(CAMPO_INTENCAO), 'devo aceitar a proposta');
    cortar();
    fireEvent.press(screen.getByText('Recomeçar o rito'));
    expect(screen.getByLabelText(CAMPO_INTENCAO).props.value).toBe('devo aceitar a proposta');
  });

  it('oferece as duas tiragens antes de cortar', async () => {
    await abrir();
    expect(screen.getByLabelText(/Três cartas, 3 cartas/)).toBeTruthy();
    expect(screen.getByLabelText('Cruz Celta, 10 cartas')).toBeTruthy();
  });

  it('depois do primeiro corte não dá mais para trocar de tiragem', async () => {
    // Os cortes já foram dados sobre uma tiragem. Trocar ali embaixo faria outra coisa.
    await abrir();
    cortar();
    expect(screen.queryByLabelText('Cruz Celta, 10 cartas')).toBeNull();
  });

  it('a Cruz Celta abre dez posições, com as perguntas do protótipo', async () => {
    await abrir();
    escolherCruzCelta();
    cortar(); irParaLeitura();
    expect(screen.getAllByLabelText(/^Posição .*, vazia$/)).toHaveLength(10);
    expect(screen.getByText('o assunto como ele está')).toBeTruthy();
    expect(screen.getByText('o desfecho provável se o caminho seguir assim')).toBeTruthy();
  });

  it('trocar de tiragem redimensiona a tiragem inteira', async () => {
    // O defeito que isto pega: guardar três vagas e trocar para a Cruz Celta. Com três
    // cartas puxadas o rito se daria por completo, e a leitura sairia com sete posições
    // vazias que a pessoa nunca viu.
    await abrir();
    escolherCruzCelta();
    cortar(); irParaLeitura();
    for (let i = 0; i < 3; i++) puxar();
    await waitFor(() => expect(screen.getByText(/Faltam 7 cartas\./)).toBeTruthy());
    expect(screen.queryByText('Ver Leitura Completa')).toBeNull();
  });

  it('a tiragem escolhida viaja até o resultado, com a pergunta de cada posição', async () => {
    await abrir();
    escolherCruzCelta();
    cortar(); irParaLeitura();
    await distribuir(10);
    seguir();
    const enviadas = JSON.parse(mockPush.mock.calls[0][0].params.posicoes);
    expect(enviadas).toHaveLength(10);
    expect(enviadas[0].nome).toBe('A situação');
    expect(enviadas[0].regra).toBe('o assunto como ele está');
  });

  it('sem intenção escrita, nada é afirmado sobre ela', async () => {
    await abrir();
    cortar(); irParaLeitura();
    expect(screen.getByText(/Você não disse o que trouxe/)).toBeTruthy();
    await distribuir(3);
    seguir();
    expect(mockPush.mock.calls[0][0].params.intencao).toBe('');
  });

  it('a intenção escrita aparece na tela e chega inteira ao resultado', async () => {
    await abrir();
    fireEvent.changeText(screen.getByLabelText(CAMPO_INTENCAO), '  devo aceitar a proposta  ');
    cortar(); irParaLeitura();
    expect(screen.getByText('Leitura sobre: devo aceitar a proposta')).toBeTruthy();
    await distribuir(3);
    seguir();
    expect(mockPush.mock.calls[0][0].params.intencao).toBe('devo aceitar a proposta');
  });
});
