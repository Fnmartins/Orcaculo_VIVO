import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockGerar = jest.fn();
jest.mock('../../services/voz', () => ({
  gerarLeituraFalada: (...a: unknown[]) => mockGerar(...a),
}));

// `expo-av` já vem mockado em `jest.setup.ts`; aqui só se pega a referência
// para poder fazer a criação do som falhar, que é como o Safari do iPhone
// recusa tocar fora de um gesto.
import { Share } from 'react-native';
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

  it('pausa e continua de onde parou, em vez de voltar ao inicio', async () => {
    // Relatado no teste do iPhone: "se tu quiser pausar, tu nao consegue, ele
    // volta para o inicio". Numa leitura de mapa, que passa de dois minutos,
    // isso é o mesmo que não poder pausar.
    const pausar = jest.fn(async () => {});
    const voltar = jest.fn(async () => {});
    (Audio.Sound.createAsync as jest.Mock).mockResolvedValueOnce({
      sound: {
        unloadAsync: jest.fn(async () => {}),
        setOnPlaybackStatusUpdate: jest.fn(),
        pauseAsync: pausar,
        playAsync: voltar,
      },
    });

    render(<BotaoOuvir partes={partes} />);
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));
    await waitFor(() => expect(screen.getByText('Pausar')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Pausar a leitura em voz'));
    await waitFor(() => expect(screen.getByText('Continuar')).toBeTruthy());
    expect(pausar).toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Continuar a leitura em voz'));
    await waitFor(() => expect(screen.getByText('Pausar')).toBeTruthy());
    expect(voltar).toHaveBeenCalled();
    // O que prova que não reiniciou: nenhuma criação de som nova.
    expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(1);
  });

  it('ouvir de novo não chama a função outra vez', async () => {
    // A URL fica guardada: repetir a mesma leitura não pode gastar cota nem
    // fazer a pessoa esperar de novo.
    render(<BotaoOuvir partes={partes} />);
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));
    await waitFor(() => expect(screen.getByText('Pausar')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Pausar a leitura em voz'));
    await waitFor(() => expect(screen.getByText('Continuar')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Continuar a leitura em voz'));

    await waitFor(() => expect(screen.getByText('Pausar')).toBeTruthy());
    // Conta só as chamadas de TOCAR. A outra é a busca antecipada do link de
    // compartilhar, que é acerto de cache e existe justamente para o envio sair
    // no primeiro toque.
    const paraTocar = mockGerar.mock.calls.filter(
      ([, opcoes]) => !(opcoes && (opcoes as { paraCompartilhar?: boolean }).paraCompartilhar),
    );
    expect(paraTocar).toHaveLength(1);
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

  it('compartilhar pede link de validade longa, não o de tocar', async () => {
    // O link de tocar vale uma hora: quem recebe abre depois e encontra link
    // morto. É por isso que compartilhar é uma chamada com pedido diferente, e
    // não a reutilização da URL que já está na mão.
    const compartilhou = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    render(<BotaoOuvir partes={partes} titulo="Meu Mapa" />);
    fireEvent.press(screen.getByLabelText('Compartilhar a leitura em áudio'));

    await waitFor(() => expect(compartilhou).toHaveBeenCalled());
    expect(mockGerar).toHaveBeenCalledWith(expect.any(String), { paraCompartilhar: true });
    expect(compartilhou.mock.calls[0][0].message).toContain('Meu Mapa');
    expect(compartilhou.mock.calls[0][0].message).toContain(LEITURA.url);
  });

  it('leitura cortada pelo teto diz isso na tela', async () => {
    mockGerar.mockResolvedValue({ ...LEITURA, cortado: true });
    render(<BotaoOuvir partes={partes} />);
    fireEvent.press(screen.getByLabelText('Ouvir a leitura em voz'));

    await waitFor(() => expect(screen.getByText(/lê o começo dela/)).toBeTruthy());
  });
});
