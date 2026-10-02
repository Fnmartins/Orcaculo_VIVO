import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Recolhimento } from '../Recolhimento';

describe('Recolhimento', () => {
  it('com movimento desligado, entrega o baralho na hora', async () => {
    // Quem pediu "reduzir movimento" nao pode ficar preso esperando uma animacao que
    // nunca vai rodar: sem esta saida o rito trava no recolhimento.
    const aoTerminar = jest.fn();
    render(<Recolhimento ligado={false} aoTerminar={aoTerminar} />);
    await waitFor(() => expect(aoTerminar).toHaveBeenCalledTimes(1));
  });

  it('com movimento ligado, mostra as cartas entrando dos dois lados', () => {
    render(<Recolhimento ligado aoTerminar={jest.fn()} />);
    expect(screen.getAllByTestId('carta-do-riffle').length).toBeGreaterThan(10);
  });

  it('avisa o fim uma vez so', async () => {
    // O defeito que isto pega: chamar `aoTerminar` por carta. O baralho seria definido
    // vinte vezes, e so a ultima valeria — sem erro nenhum aparecendo.
    const aoTerminar = jest.fn();
    render(<Recolhimento ligado aoTerminar={aoTerminar} />);
    await waitFor(() => expect(aoTerminar).toHaveBeenCalled(), { timeout: 4000 });
    expect(aoTerminar).toHaveBeenCalledTimes(1);
  });
});
