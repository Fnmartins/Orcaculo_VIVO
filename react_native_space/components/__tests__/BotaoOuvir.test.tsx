import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockVozDisponivel = jest.fn();
const mockFalar = jest.fn();
const mockParar = jest.fn();
jest.mock('../../utils/vozLeitura', () => ({
  ...jest.requireActual('../../utils/vozLeitura'),
  vozDisponivel: () => mockVozDisponivel(),
  falar: (...a: unknown[]) => mockFalar(...a),
  pararDeFalar: () => mockParar(),
}));

import { BotaoOuvir } from '../BotaoOuvir';

const partes = [
  { texto: 'Ejilaxeborá.' },
  { rotulo: 'Conselho', texto: 'Escute antes de responder.' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockVozDisponivel.mockReturnValue(true);
  mockFalar.mockReturnValue(true);
});

describe('BotaoOuvir', () => {
  it('fala o roteiro montado, e não as partes cruas', () => {
    render(<BotaoOuvir partes={partes} />);
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));
    expect(mockFalar).toHaveBeenCalled();
    expect(mockFalar.mock.calls[0][0])
      .toBe('Ejilaxeborá.\n\nConselho. Escute antes de responder.');
  });

  it('enquanto fala, o botão vira Parar', () => {
    render(<BotaoOuvir partes={partes} />);
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));
    expect(screen.getByText('Parar')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Parar a leitura em voz'));
    expect(mockParar).toHaveBeenCalled();
    expect(screen.getByText('Ouvir a leitura')).toBeTruthy();
  });

  it('sem voz no navegador, o botão não aparece', () => {
    mockVozDisponivel.mockReturnValue(false);
    render(<BotaoOuvir partes={partes} />);
    expect(screen.queryByText('Ouvir a leitura')).toBeNull();
  });

  it('falha ao falar avisa, em vez de ficar com o botão em Parar', () => {
    mockFalar.mockReturnValue(false);
    render(<BotaoOuvir partes={partes} />);
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));
    expect(screen.getByText(/não conseguiu falar/)).toBeTruthy();
    expect(screen.getByText('Ouvir a leitura')).toBeTruthy();
  });
});
