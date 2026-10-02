import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { LequeDeCorte, geometriaDoLeque, MEIA_ABERTURA } from '../LequeDeCorte';

/** O estilo já achatado de uma lâmina. */
function estiloDa(no: { props: { style?: unknown } }): Record<string, number | string> {
  return StyleSheet.flatten(no.props.style) as Record<string, number | string>;
}

/** Os graus de rotação declarados no transform da lâmina. */
function giroDa(no: { props: { style?: unknown } }): number {
  const transformacoes = estiloDa(no).transform as unknown as { rotate: string }[];
  return parseFloat(transformacoes[0].rotate);
}

describe('LequeDeCorte', () => {
  it('abre uma lâmina por carta', () => {
    render(<LequeDeCorte quantidade={22} aoCortar={jest.fn()} />);
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(22);
  });

  it('tocar numa lâmina entrega o índice dela', () => {
    // O índice é o contrato com `cortar`: errar aqui corta no lugar errado e nada
    // quebra — a pessoa só recebe outra tiragem, sem jeito de perceber.
    const aoCortar = jest.fn();
    render(<LequeDeCorte quantidade={22} aoCortar={aoCortar} />);
    fireEvent.press(screen.getByLabelText('Cortar aqui, carta 7 de 22'));
    expect(aoCortar).toHaveBeenCalledWith(6);
  });

  it('desligado, não corta', () => {
    const aoCortar = jest.fn();
    render(<LequeDeCorte quantidade={22} aoCortar={aoCortar} desligado />);
    fireEvent.press(screen.getByLabelText('Cortar aqui, carta 7 de 22'));
    expect(aoCortar).not.toHaveBeenCalled();
  });

  it('com uma carta só, ainda abre uma lâmina', () => {
    // O passo do arco é `(abertura * 2) / (quantidade - 1)`: com uma carta isso divide
    // por zero e a rotação sai `NaNdeg`. O leque chega a esse estado no fim de uma
    // sequência longa de cortes.
    render(<LequeDeCorte quantidade={1} aoCortar={jest.fn()} />);
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(1);
  });

  it('cada lâmina é posicionada por LAYOUT, e só girada por transform', () => {
    // Este é o defeito que foi para produção e que o dono encontrou com o dedo: as 22
    // lâminas tinham a mesma caixa de layout e só o transform as espalhava. Onde o
    // toque é testado pela caixa e não pelo desenho, elas ficam empilhadas num ponto
    // só — o leque parecia morto, com um único "lugar certo" que cortava sempre na
    // mesma carta.
    //
    // Enquanto a posição vier de `left`/`top`, a área de toque é onde a carta aparece.
    render(<LequeDeCorte quantidade={22} aoCortar={jest.fn()} />);
    const laminas = screen.getAllByLabelText(/Cortar aqui/);

    const margens = new Set<number>();
    for (const lamina of laminas) {
      const estilo = estiloDa(lamina);
      const transformacoes = estilo.transform as unknown as Record<string, unknown>[];
      expect(transformacoes).toHaveLength(1);
      expect(Object.keys(transformacoes[0])).toEqual(['rotate']);
      expect(typeof estilo.marginLeft).toBe('number');
      expect(typeof estilo.top).toBe('number');
      margens.add(estilo.marginLeft as number);
    }
    // Vinte e duas posições horizontais distintas: nenhuma empilhada sobre a outra.
    expect(margens.size).toBe(22);
  });

  it('o arco é simétrico, e a lâmina do meio é a mais alta', () => {
    render(<LequeDeCorte quantidade={21} aoCortar={jest.fn()} />);
    const laminas = screen.getAllByLabelText(/Cortar aqui/);

    expect(giroDa(laminas[0])).toBeCloseTo(-MEIA_ABERTURA, 1);
    expect(giroDa(laminas[20])).toBeCloseTo(MEIA_ABERTURA, 1);

    const primeira = estiloDa(laminas[0]);
    const ultima = estiloDa(laminas[20]);
    const meio = estiloDa(laminas[10]);

    // Espelhadas em torno do centro, e a do meio sem queda nenhuma.
    expect(primeira.marginLeft as number).toBeCloseTo(-(ultima.marginLeft as number) - 38, 1);
    expect(meio.top as number).toBeCloseTo(0, 1);
    expect(primeira.top as number).toBeGreaterThan(meio.top as number);
  });
});

describe('geometriaDoLeque', () => {
  it('o arco cabe na tela, do celular estreito ao navegador largo', () => {
    // Raio fixo abre um arco mais largo que a tela no celular, e pequeno demais no
    // navegador.
    for (const largura of [320, 375, 414, 768, 1800]) {
      const { meiaLargura } = geometriaDoLeque(largura, 22);
      expect(meiaLargura * 2).toBeLessThanOrEqual(largura);
      expect(meiaLargura).toBeGreaterThan(60);
    }
  });

  it('a mesa é alta o bastante para a queda das pontas', () => {
    // Com altura fixa a borda corta o arco — defeito que já apareceu no protótipo.
    const { altura, queda } = geometriaDoLeque(375, 22);
    expect(altura).toBeGreaterThan(queda);
  });

  it('entrega um lugar por carta, e nada vira NaN', () => {
    const { lugares } = geometriaDoLeque(375, 22);
    expect(lugares).toHaveLength(22);
    for (const { x, y, giro } of lugares) {
      for (const n of [x, y, giro]) expect(Number.isFinite(n)).toBe(true);
    }
  });

  it('com uma carta só, ela fica no meio e sem giro', () => {
    const { lugares } = geometriaDoLeque(375, 1);
    expect(lugares).toEqual([{ x: 0, y: 0, giro: 0 }]);
  });
});
