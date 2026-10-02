import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ARCANOS_MAIORES } from '../../../data/tarot';
import { VagaDaTiragem } from '../VagaDaTiragem';

const PASSADO = { nome: 'Passado', regra: 'o que já se consumou e ainda pesa' };
const TORRE = ARCANOS_MAIORES[16];

describe('VagaDaTiragem', () => {
  it('vazia, mostra a pergunta que a posição faz', () => {
    // A tiragem se explica sozinha por causa disto: as perguntas são lidas antes
    // de qualquer resposta. Esconder a regra até a carta cair desperdiça o momento.
    render(<VagaDaTiragem posicao={PASSADO} carta={null} aoReceber={jest.fn()} />);
    expect(screen.getByText('Passado')).toBeTruthy();
    expect(screen.getByText('o que já se consumou e ainda pesa')).toBeTruthy();
  });

  it('vazia, recebe o toque', () => {
    const aoReceber = jest.fn();
    render(<VagaDaTiragem posicao={PASSADO} carta={null} aoReceber={aoReceber} />);
    fireEvent.press(screen.getByLabelText('Posição Passado, vazia'));
    expect(aoReceber).toHaveBeenCalledTimes(1);
  });

  it('a carta pousa de costas, e o toque vira', () => {
    // A spec diz "pousa de costas, vira". Se a cena aparecer na hora em que a carta
    // cai, a virada deixa de existir — e ela é o momento da leitura.
    const aoVirar = jest.fn();
    const aoReceber = jest.fn();
    render(
      <VagaDaTiragem posicao={PASSADO} carta={TORRE} aoReceber={aoReceber} aoVirar={aoVirar} />
    );
    expect(screen.queryByLabelText(TORRE.nomeCompleto)).toBeNull();
    fireEvent.press(screen.getByLabelText('Posição Passado, carta de costas, toque para virar'));
    expect(aoVirar).toHaveBeenCalledTimes(1);
    expect(aoReceber).not.toHaveBeenCalled();
  });

  it('revelada, mostra a cena e não aceita outra', () => {
    const aoReceber = jest.fn();
    const aoVirar = jest.fn();
    render(
      <VagaDaTiragem posicao={PASSADO} carta={TORRE} revelada aoReceber={aoReceber} aoVirar={aoVirar} />
    );
    expect(screen.getByLabelText(TORRE.nomeCompleto)).toBeTruthy();
    fireEvent.press(screen.getByLabelText(`Posição Passado, ${TORRE.nomeCompleto}`));
    expect(aoReceber).not.toHaveBeenCalled();
    expect(aoVirar).not.toHaveBeenCalled();
  });

  it('revelada, troca a pergunta pelo nome da carta', () => {
    render(<VagaDaTiragem posicao={PASSADO} carta={TORRE} revelada aoReceber={jest.fn()} />);
    expect(screen.getByText(TORRE.nome)).toBeTruthy();
    expect(screen.queryByText(PASSADO.regra)).toBeNull();
  });
});
