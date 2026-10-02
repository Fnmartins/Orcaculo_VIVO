import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

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

// "Reduzir movimento" ligado: as particulas e o pulso do monte sao lacos infinitos, e
// com eles de pe o Jest nao encerra o processo. Ligado aqui, o fluxo do rito e testado
// sem depender do tempo de nenhuma animacao.
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
});

afterEach(() => jest.restoreAllMocks());

// A leitura do "reduzir movimento" e assincrona: sem este ato, cada teste reclama de um
// setState fora do act quando a promessa resolve.
const abrir = async () => {
  render(<TelaCartas />);
  await act(async () => {});
};

const cortar = () => fireEvent.press(screen.getByLabelText('Cortar aqui, carta 8 de 22'));
const juntar = () => fireEvent.press(screen.getByText('Juntar e seguir'));
const puxar = () => fireEvent.press(screen.getByLabelText('Carta de cima do monte, pegue daqui'));
const virar = (posicao: string) =>
  fireEvent.press(screen.getByLabelText(`Posição ${posicao}, carta de costas, toque para virar`));
const virarAsTres = () => { virar('Passado'); virar('Presente'); virar('Futuro'); };
const seguir = () => fireEvent.press(screen.getByText('Ver Leitura Completa'));
const recomecar = () => fireEvent.press(screen.getByText('Recomeçar o rito'));

describe('o rito do tarô', () => {
  it('começa pedindo o corte, não a tiragem', async () => {
    await abrir();
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(22);
    expect(screen.queryByText('Pegue daqui')).toBeNull();
    // "Juntar e seguir" antes do primeiro corte deixaria passar sem cortar nada.
    expect(screen.queryByText('Juntar e seguir')).toBeNull();
  });

  it('depois de cortar e juntar, as três posições aparecem vazias', async () => {
    await abrir();
    cortar(); juntar();
    expect(screen.getByLabelText('Posição Passado, vazia')).toBeTruthy();
    expect(screen.getByLabelText('Posição Presente, vazia')).toBeTruthy();
    expect(screen.getByLabelText('Posição Futuro, vazia')).toBeTruthy();
    expect(screen.getByText('Pegue daqui')).toBeTruthy();
  });

  it('as três cartas puxadas, viradas, levam ao resultado', async () => {
    await abrir();
    cortar(); juntar();
    puxar(); puxar(); puxar();
    virarAsTres();
    seguir();
    expect(mockPush).toHaveBeenCalledTimes(1);
    const destino = mockPush.mock.calls[0][0];
    expect(destino.pathname).toBe('/consulta/resultado');
    expect(JSON.parse(destino.params.cartas)).toHaveLength(3);
  });

  it('não oferece a leitura com posição vazia', async () => {
    // A regressão mais provável: liberar a leitura assim que a primeira carta cai.
    await abrir();
    cortar(); juntar(); puxar();
    expect(screen.queryByText('Ver Leitura Completa')).toBeNull();
  });

  it('não oferece a leitura com carta sem virar', async () => {
    // A spec manda a carta pousar de costas. Liberar a leitura antes da virada deixaria
    // a pessoa seguir sem nunca ter visto as três cenas.
    await abrir();
    cortar(); juntar(); puxar(); puxar(); puxar();
    expect(screen.queryByText('Ver Leitura Completa')).toBeNull();
    virar('Passado'); virar('Presente');
    expect(screen.queryByText('Ver Leitura Completa')).toBeNull();
  });

  it('as três cartas da tiragem são distintas', async () => {
    // `puxar` tira do topo do baralho recolhido e encurta o monte. Se ele lesse sempre
    // a mesma lista, a tiragem sairia com a mesma carta três vezes.
    await abrir();
    cortar(); juntar(); puxar(); puxar(); puxar(); virarAsTres(); seguir();
    const cartas = JSON.parse(mockPush.mock.calls[0][0].params.cartas) as { id: number }[];
    expect(new Set(cartas.map((c) => c.id)).size).toBe(3);
  });


  it('tocar numa vaga poe a carta naquela vaga, nao na primeira', async () => {
    // Desde o arraste a posicao e escolhida, nao sorteada pela ordem. Se o toque numa
    // vaga caisse sempre na primeira vazia, o arraste e o toque diriam coisas
    // diferentes sobre a mesma tela — e a posicao e metade do significado da leitura.
    await abrir();
    cortar(); juntar();
    fireEvent.press(screen.getByLabelText('Posição Futuro, vazia'));
    expect(screen.getByLabelText('Posição Passado, vazia')).toBeTruthy();
    expect(
      screen.getByLabelText('Posição Futuro, carta de costas, toque para virar')
    ).toBeTruthy();
  });


  it('antes de cortar, nao oferece recomecar', async () => {
    // Nao ha nada a desfazer: o botao so confundiria quem acabou de chegar.
    await abrir();
    expect(screen.queryByText('Recomeçar o rito')).toBeNull();
  });

  it('recomecar devolve o baralho inteiro e desfaz os cortes', async () => {
    await abrir();
    cortar(); juntar();
    expect(screen.getByText('Pegue daqui')).toBeTruthy();
    recomecar();
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(22);
    expect(screen.queryByText('Pegue daqui')).toBeNull();
    expect(screen.queryByText('Juntar e seguir')).toBeNull();
  });

  it('com a tiragem pronta, recomecar limpa as tres vagas', async () => {
    // O defeito que isto pega: zerar o baralho e esquecer as cartas ja postas. A tela
    // voltaria ao leque com a tiragem velha guardada, e a proxima leitura sairia com
    // cartas da anterior.
    await abrir();
    cortar(); juntar(); puxar(); puxar(); puxar(); virarAsTres();
    recomecar();
    cortar(); juntar();
    expect(screen.getByLabelText('Posição Passado, vazia')).toBeTruthy();
    expect(screen.getByLabelText('Posição Presente, vazia')).toBeTruthy();
    expect(screen.getByLabelText('Posição Futuro, vazia')).toBeTruthy();
  });

  it('recomecar nao apaga a intencao escrita', async () => {
    // A pergunta que trouxe a pessoa continua a mesma. Fazer ela digitar de novo e
    // castigo por querer outra tiragem.
    await abrir();
    const campo = screen.getByLabelText('Se quiser, diga o que te trouxe aqui');
    fireEvent.changeText(campo, 'devo aceitar a proposta');
    cortar();
    recomecar();
    expect(
      screen.getByLabelText('Se quiser, diga o que te trouxe aqui').props.value
    ).toBe('devo aceitar a proposta');
  });

  it('sem intenção escrita, nada é afirmado sobre ela', async () => {
    await abrir();
    cortar(); juntar(); puxar(); puxar(); puxar(); virarAsTres(); seguir();
    expect(mockPush.mock.calls[0][0].params.intencao).toBe('');
  });

  it('a intenção escrita chega inteira ao resultado', async () => {
    await abrir();
    fireEvent.changeText(
      screen.getByLabelText('Se quiser, diga o que te trouxe aqui'),
      '  devo aceitar a proposta  '
    );
    cortar(); juntar(); puxar(); puxar(); puxar(); virarAsTres(); seguir();
    expect(mockPush.mock.calls[0][0].params.intencao).toBe('devo aceitar a proposta');
  });
});
