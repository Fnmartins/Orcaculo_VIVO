import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MonteParaDistribuir, vagaSob } from '../MonteParaDistribuir';

describe('MonteParaDistribuir', () => {
  it('diz de onde se pega', () => {
    render(<MonteParaDistribuir restantes={19} aoPuxar={jest.fn()} />);
    expect(screen.getByText('Pegue daqui')).toBeTruthy();
  });

  it('tocar puxa uma carta', () => {
    const aoPuxar = jest.fn();
    render(<MonteParaDistribuir restantes={19} aoPuxar={aoPuxar} />);
    fireEvent.press(screen.getByLabelText('Carta de cima do monte, pegue daqui'));
    expect(aoPuxar).toHaveBeenCalledTimes(1);
  });

  it('monte vazio não puxa nada e diz que acabou', () => {
    const aoPuxar = jest.fn();
    render(<MonteParaDistribuir restantes={0} aoPuxar={aoPuxar} />);
    expect(screen.getByText('Monte vazio')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Carta de cima do monte, pegue daqui'));
    expect(aoPuxar).not.toHaveBeenCalled();
  });

  it('o toque continua funcionando quando ha arraste', () => {
    // O arraste e camada por cima. Se ele engolir o toque, quem nao arrasta no celular
    // fica sem saida — e e a maioria.
    const aoPuxar = jest.fn();
    render(
      <MonteParaDistribuir
        restantes={19}
        aoPuxar={aoPuxar}
        aoSoltarEm={jest.fn()}
        vagas={[{ indice: 0, topo: 100, base: 260, esquerda: 0, direita: 200 }]}
      />
    );
    fireEvent.press(screen.getByLabelText('Carta de cima do monte, pegue daqui'));
    expect(aoPuxar).toHaveBeenCalledTimes(1);
  });

  it('soltar sobre uma vaga poe a carta naquela vaga', () => {
    const aoSoltarEm = jest.fn();
    render(
      <MonteParaDistribuir
        restantes={19}
        aoPuxar={jest.fn()}
        aoSoltarEm={aoSoltarEm}
        vagas={[
          { indice: 0, topo: 100, base: 260, esquerda: 0, direita: 200 },
          { indice: 1, topo: 280, base: 440, esquerda: 0, direita: 200 },
        ]}
      />
    );
    const area = screen.getByTestId('area-de-arraste');
    fireEvent(area, 'touchStart', { nativeEvent: { pageX: 100, pageY: 600 } });
    fireEvent(area, 'responderMove', { nativeEvent: { pageX: 100, pageY: 330 } });
    fireEvent(area, 'responderRelease', { nativeEvent: { pageX: 100, pageY: 330 } });
    expect(aoSoltarEm).toHaveBeenCalledWith(1);
  });

  it('o arraste acompanha o dedo para o lado, e solta na vaga do lado', () => {
    const aoSoltarEm = jest.fn();
    render(
      <MonteParaDistribuir
        restantes={19}
        aoPuxar={jest.fn()}
        aoSoltarEm={aoSoltarEm}
        vagas={[
          { indice: 3, topo: 500, base: 700, esquerda: 78, direita: 236 },
          { indice: 5, topo: 500, base: 700, esquerda: 600, direita: 758 },
        ]}
      />
    );
    const area = screen.getByTestId('area-de-arraste');
    fireEvent(area, 'touchStart', { nativeEvent: { pageX: 240, pageY: 680 } });
    fireEvent(area, 'responderMove', { nativeEvent: { pageX: 680, pageY: 575 } });
    fireEvent(area, 'responderRelease', { nativeEvent: { pageX: 680, pageY: 575 } });
    expect(aoSoltarEm).toHaveBeenCalledWith(5);
  });

  it('soltar fora de qualquer vaga nao poe nada', () => {
    const aoSoltarEm = jest.fn();
    render(
      <MonteParaDistribuir
        restantes={19}
        aoPuxar={jest.fn()}
        aoSoltarEm={aoSoltarEm}
        vagas={[{ indice: 0, topo: 100, base: 260, esquerda: 0, direita: 200 }]}
      />
    );
    const area = screen.getByTestId('area-de-arraste');
    fireEvent(area, 'touchStart', { nativeEvent: { pageX: 100, pageY: 600 } });
    fireEvent(area, 'responderRelease', { nativeEvent: { pageX: 100, pageY: 590 } });
    expect(aoSoltarEm).not.toHaveBeenCalled();
  });
});

describe('vagaSob', () => {
  const vagas = [
    { indice: 0, topo: 100, base: 260, esquerda: 0, direita: 200 },
    { indice: 1, topo: 280, base: 440, esquerda: 0, direita: 200 },
  ];

  it('acha a vaga que contem o dedo', () => {
    expect(vagaSob(100, 150, vagas)).toBe(0);
    expect(vagaSob(100, 430, vagas)).toBe(1);
  });

  it('entre duas vagas, nao escolhe nenhuma', () => {
    // Chutar a mais proxima poria a carta numa posicao que a pessoa nao apontou, e a
    // posicao e metade do significado da leitura.
    expect(vagaSob(100, 270, vagas)).toBe(-1);
  });

  it('na mesma linha, quem decide e o lado', () => {
    // O defeito que isto pega: no tabuleiro da Cruz Celta cinco vagas dividem a mesma
    // altura. Olhando so o y, soltar em 'O que vem' punha a carta em 'O que passou', a
    // primeira da linha.
    const linha = [
      { indice: 3, topo: 500, base: 700, esquerda: 78, direita: 236 },
      { indice: 5, topo: 500, base: 700, esquerda: 600, direita: 758 },
    ];
    expect(vagaSob(680, 575, linha)).toBe(5);
    expect(vagaSob(150, 575, linha)).toBe(3);
    expect(vagaSob(400, 575, linha)).toBe(-1);
  });

  it('sem medidas, nao escolhe nada', () => {
    // As medidas chegam por `onLayout`, depois do primeiro quadro. Antes delas, qualquer
    // escolha seria invencao.
    expect(vagaSob(100, 150, [])).toBe(-1);
  });
});
