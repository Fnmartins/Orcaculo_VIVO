// components/taro/__tests__/Tabuleiro.test.tsx
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Tabuleiro } from '../Tabuleiro';

const POSICOES = [
  { nome: 'A', regra: 'a', lugar: { coluna: 1, linha: 0 } },
  { nome: 'B', regra: 'b', lugar: { coluna: 0, linha: 1 } },
  { nome: 'C', regra: 'c', lugar: { coluna: 1, linha: 1 }, deitada: true },
  { nome: 'D', regra: 'd', lugar: { coluna: 3, linha: 2 } },
];

describe('Tabuleiro', () => {
  it('desenha uma vaga por posição', () => {
    render(<Tabuleiro posicoes={POSICOES} vaga={(i) => <Text>vaga {i}</Text>} />);
    for (let i = 0; i < POSICOES.length; i++) {
      expect(screen.getByText(`vaga ${i}`)).toBeTruthy();
    }
  });

  it('a grade tem o tamanho da maior coordenada, não o número de posições', () => {
    // O defeito que isto pega: dimensionar pela contagem. A Cruz Celta tem dez cartas
    // numa grade de cinco por quatro, com buracos — contar cartas daria grade errada.
    render(<Tabuleiro posicoes={POSICOES} vaga={(i) => <Text>vaga {i}</Text>} />);
    expect(screen.getAllByTestId('celula-do-tabuleiro')).toHaveLength(4 * 3);
  });

  it('a posição deitada é girada um quarto de volta', () => {
    render(<Tabuleiro posicoes={POSICOES} vaga={(i) => <Text>vaga {i}</Text>} />);
    const deitada = screen.getByTestId('deitada-2');
    const estilo = [deitada.props.style].flat(5).find(
      (e) => e && Array.isArray((e as { transform?: unknown }).transform),
    ) as { transform: { rotate: string }[] };
    expect(estilo.transform[0].rotate).toBe('90deg');
  });

  it('a coluna da carta deitada ganha a largura que a carta tem deitada', () => {
    // Girar não mexe no layout: a vaga continua ocupando a caixa de antes do giro. Sem
    // trocar largura por altura na margem, a carta deitada — mais larga do que a coluna —
    // passa por cima das colunas vizinhas.
    render(<Tabuleiro posicoes={POSICOES} vaga={(i) => <Text>vaga {i}</Text>} />);
    const deitada = screen.getByTestId('deitada-2');
    fireEvent(deitada, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 158, height: 200 } },
    });
    const estilo = StyleSheet.flatten(screen.getByTestId('deitada-2').props.style);
    expect(158 + 2 * estilo.marginHorizontal).toBe(200);
    expect(200 + 2 * estilo.marginVertical).toBe(158);
  });

  it('a coluna tem a largura da célula mais larga, em todas as linhas', () => {
    // Cada linha é um bloco à parte: célula vazia não ocupa nada, e sem esta medida a
    // coluna 3 de uma linha cai debaixo da coluna 1 de outra. Foi o que apareceu na tela.
    render(<Tabuleiro posicoes={POSICOES} vaga={(i) => <Text>vaga {i}</Text>} />);
    const medir = (testID: string, width: number) => fireEvent(
      screen.getByTestId(testID), 'layout',
      { nativeEvent: { layout: { x: 0, y: 0, width, height: 50 } } },
    );
    medir('vaga-0', 158); // coluna 1, linha 0
    medir('vaga-1', 100); // coluna 0, linha 1

    const celulas = screen.getAllByTestId('celula-do-tabuleiro');
    const larguraMinima = (i: number) => StyleSheet.flatten(celulas[i].props.style).minWidth;
    // A grade tem 4 colunas: a célula (coluna c, linha l) é a de número l * 4 + c.
    expect(larguraMinima(0 * 4 + 0)).toBe(100);
    expect(larguraMinima(1 * 4 + 0)).toBe(100);
    expect(larguraMinima(2 * 4 + 0)).toBe(100);
    expect(larguraMinima(0 * 4 + 1)).toBe(158);
    expect(larguraMinima(1 * 4 + 1)).toBe(158); // a carta deitada está nesta, e ainda não mediu
    expect(larguraMinima(2 * 4 + 1)).toBe(158);
    expect(larguraMinima(2 * 4 + 2)).toBe(0); // coluna sem ninguém medido
  });

  it('a vaga que não é deitada não é girada', () => {
    render(<Tabuleiro posicoes={POSICOES} vaga={(i) => <Text>vaga {i}</Text>} />);
    expect(StyleSheet.flatten(screen.getByTestId('vaga-0').props.style)?.transform).toBeUndefined();
  });
});
