import React from 'react';
import { AccessibilityInfo, Dimensions } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
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
import { LARGURA_MINIMA_DO_TABULEIRO } from '../../../components/taro/Tabuleiro';

/**
 * A fiação do dado até a tela: `lugar` e `deitada` de `data/tiragens.ts` chegando ao
 * `Tabuleiro` e à `VagaDaTiragem`, passando por `app/consulta/cartas.tsx`.
 *
 * Os testes de `Tabuleiro` e de `VagaDaTiragem` provam cada peça com dado inventado. A
 * suíte `rito-do-taro` roda na largura padrão do jest, abaixo do limiar, e por isso nunca
 * monta o tabuleiro. Sem este arquivo, nada impede que `cartas.tsx` pare de passar
 * `deitada`, ou de escolher o tabuleiro, com a suíte inteira verde.
 */

const original = Dimensions.get.bind(Dimensions);

/** A janela passa a ter esta largura; o resto das medidas segue o que o jest já dá. */
const larguraDaJanela = (largura: number) => {
  jest.spyOn(Dimensions, 'get').mockImplementation((dimensao) => (
    dimensao === 'window' ? { ...original('window'), width: largura } : original(dimensao)
  ));
};

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
});

afterEach(() => jest.restoreAllMocks());

const abrir = async () => {
  render(<TelaCartas />);
  await act(async () => {});
};

const escolherCruzCelta = () => fireEvent.press(screen.getByLabelText('Cruz Celta, 10 cartas'));
const cortarEIrParaALeitura = () => {
  fireEvent.press(screen.getByLabelText('Cortar aqui, carta 8 de 22'));
  fireEvent.press(screen.getByText('Ir para a leitura'));
};

const celulas = () => screen.queryAllByTestId('celula-do-tabuleiro');
const laminasDeitadas = () => screen.queryAllByTestId('lamina-deitada');
const vagas = () => screen.queryAllByLabelText(/^Posição .*, vazia$/);

describe('o tabuleiro na tela do rito', () => {
  it('em tela larga, a Cruz Celta vira grade de 5 por 4, com uma só carta deitada', async () => {
    larguraDaJanela(1000);
    await abrir();
    escolherCruzCelta();
    cortarEIrParaALeitura();

    expect(vagas()).toHaveLength(10);
    expect(celulas()).toHaveLength(5 * 4);
    // "O que atravessa" é a única deitada. Se `cartas.tsx` deixar de passar `deitada`
    // à vaga, a cruz aparece com ela em pé e nenhum outro teste percebe.
    expect(laminasDeitadas()).toHaveLength(1);
  });

  it('em tela estreita, a Cruz Celta cai na lista em coluna, e a deitada continua deitada', async () => {
    // O padrão do jest é 750, abaixo do limiar. A conferência abaixo impede que o teste
    // passe por acaso se um dia o padrão ou o limiar mudarem.
    expect(Dimensions.get('window').width).toBeLessThan(LARGURA_MINIMA_DO_TABULEIRO);
    await abrir();
    escolherCruzCelta();
    cortarEIrParaALeitura();

    expect(vagas()).toHaveLength(10);
    expect(celulas()).toHaveLength(0);
    // Na lista em coluna a carta que atravessa também é posta de lado: a posição é dado
    // da tiragem, não detalhe do tabuleiro.
    expect(laminasDeitadas()).toHaveLength(1);
  });

  it('com três cartas não há tabuleiro, por larga que seja a tela', async () => {
    // A condição pede mais de três posições: até três a lista já é a própria mesa.
    larguraDaJanela(1000);
    await abrir();
    cortarEIrParaALeitura();

    expect(vagas()).toHaveLength(3);
    expect(celulas()).toHaveLength(0);
    expect(laminasDeitadas()).toHaveLength(0);
  });
});
