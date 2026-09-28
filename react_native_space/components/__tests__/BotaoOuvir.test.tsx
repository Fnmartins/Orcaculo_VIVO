import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockGerar = jest.fn();
jest.mock('../../services/voz', () => ({
  gerarLeituraFalada: (...a: unknown[]) => mockGerar(...a),
}));

// `expo-av` já vem mockado em `jest.setup.ts`; aqui só se pega a referência
// para poder fazer a criação do som falhar, que é como o Safari do iPhone
// recusa tocar fora de um gesto.
import { Audio } from 'expo-av';

import { BotaoOuvir } from '../BotaoOuvir';

const partes = [
  { texto: 'Ejilaxeborá.' },
  { rotulo: 'Conselho', texto: 'Escute antes de responder.' },
];

const LEITURA = { url: 'https://exemplo/a.mp3', doCache: false, cortado: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockGerar.mockResolvedValue(LEITURA);
});

describe('BotaoOuvir', () => {
  it('manda o roteiro montado para gerar, e não as partes cruas', async () => {
    render(<BotaoOuvir partes={partes} />);
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));

    await waitFor(() => expect(mockGerar).toHaveBeenCalled());
    expect(mockGerar.mock.calls[0][0])
      .toBe('Ejilaxeborá.\n\nConselho. Escute antes de responder.');
  });

  it('enquanto toca, o botão vira Parar', async () => {
    render(<BotaoOuvir partes={partes} />);
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));

    await waitFor(() => expect(screen.getByText('Parar')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Parar a leitura em voz'));
    await waitFor(() => expect(screen.getByText('Ouvir a leitura')).toBeTruthy());
  });

  it('ouvir de novo não chama a função outra vez', async () => {
    // A URL fica guardada: repetir a mesma leitura não pode gastar cota nem
    // fazer a pessoa esperar de novo.
    render(<BotaoOuvir partes={partes} />);
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));
    await waitFor(() => expect(screen.getByText('Parar')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Parar a leitura em voz'));
    await waitFor(() => expect(screen.getByText('Ouvir a leitura')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));

    await waitFor(() => expect(screen.getByText('Parar')).toBeTruthy());
    expect(mockGerar).toHaveBeenCalledTimes(1);
  });

  it('navegador que recusa tocar vira o botão em Tocar, não em erro', async () => {
    // É a política de autoplay do Safari, não uma falha: o áudio existe, só
    // precisa de um toque para começar.
    (Audio.Sound.createAsync as jest.Mock).mockRejectedValueOnce(new Error('NotAllowedError'));
    render(<BotaoOuvir partes={partes} />);
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));

    await waitFor(() => expect(screen.getByText('Tocar')).toBeTruthy());
    expect(screen.getByText(/Toque de novo/)).toBeTruthy();
  });

  it('falha ao gerar avisa e volta o botão, em vez de ficar preparando', async () => {
    mockGerar.mockRejectedValue(new Error('Você já usou o limite de hoje. Amanhã tem mais.'));
    render(<BotaoOuvir partes={partes} />);
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));

    await waitFor(() => expect(screen.getByText(/limite de hoje/)).toBeTruthy());
    expect(screen.getByText('Ouvir a leitura')).toBeTruthy();
  });

  it('leitura cortada pelo teto diz isso na tela', async () => {
    mockGerar.mockResolvedValue({ ...LEITURA, cortado: true });
    render(<BotaoOuvir partes={partes} />);
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));

    await waitFor(() => expect(screen.getByText(/lê o começo dela/)).toBeTruthy());
  });
});
