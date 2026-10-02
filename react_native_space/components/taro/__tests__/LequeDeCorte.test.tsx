import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { LequeDeCorte } from '../LequeDeCorte';

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
    // sequência longa de cortes, e nenhum erro apareceria.
    render(<LequeDeCorte quantidade={1} aoCortar={jest.fn()} />);
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(1);
  });
});
