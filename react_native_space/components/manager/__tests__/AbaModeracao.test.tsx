import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockListarDenuncias = jest.fn();
const mockListarPerguntas = jest.fn();
const mockResolver = jest.fn();
// Sem requireActual: o módulo real carrega o cliente do Supabase, que não roda no Jest.
jest.mock('../../../services/moderacao', () => ({
  listarDenuncias: (...a: unknown[]) => mockListarDenuncias(...a),
  listarPerguntasAnonimas: (...a: unknown[]) => mockListarPerguntas(...a),
  resolverDenuncia: (...a: unknown[]) => mockResolver(...a),
}));

const mockAlerta = jest.fn();
jest.mock('../../../utils/alerta', () => ({
  mostrarAlerta: (...a: unknown[]) => mockAlerta(...a),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

import { AbaModeracao } from '../AbaModeracao';

const denuncia = {
  id: 'd1', origem: 'pergunta' as const, oraculo: 'buzios',
  conteudo: 'Pergunta: e agora?\n\nResposta: texto da IA',
  motivo: 'falou de remédio', criado_em: '2026-09-26T12:00:00Z', resolvida: false,
};

const pergunta = {
  id: 'p1', oraculo: 'buzios' as const, contexto: 'Odu: Ejilaxeborá',
  pergunta: 'o que esse odu pede de mim?', dia: '2026-09-26',
};

const aoPerderAcesso = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockListarDenuncias.mockResolvedValue([denuncia]);
  mockListarPerguntas.mockResolvedValue([pergunta]);
});

describe('AbaModeracao', () => {
  it('mostra a denúncia com motivo, conteúdo e contagem de abertas', async () => {
    render(<AbaModeracao aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(screen.getByText(/1 em aberto/)).toBeTruthy());
    expect(screen.getByText('“falou de remédio”')).toBeTruthy();
    expect(screen.getByText(/Resposta: texto da IA/)).toBeTruthy();
    expect(screen.getByText(/Pergunta · buzios/)).toBeTruthy();
  });

  it('resolver troca o botão para reabrir', async () => {
    mockResolver.mockResolvedValue({ ...denuncia, resolvida: true });
    render(<AbaModeracao aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(screen.getByText('Marcar como resolvida')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Marcar esta denúncia como resolvida'));
    await waitFor(() => expect(mockResolver).toHaveBeenCalledWith('d1', true));
    await waitFor(() => expect(screen.getByText('Reabrir')).toBeTruthy());
    expect(screen.getByText(/0 em aberto/)).toBeTruthy();
  });

  it('lista vazia diz que é o estado bom', async () => {
    mockListarDenuncias.mockResolvedValue([]);
    mockListarPerguntas.mockResolvedValue([]);
    render(<AbaModeracao aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(screen.getByText(/Nenhuma denúncia/)).toBeTruthy());
    expect(screen.getByText(/Nenhuma pergunta guardada ainda/)).toBeTruthy();
  });

  it('mostra as perguntas guardadas com oráculo, contexto e dia', async () => {
    render(<AbaModeracao aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(screen.getByText('o que esse odu pede de mim?')).toBeTruthy());
    expect(screen.getByText(/Búzios · Odu: Ejilaxeborá · 2026-09-26/)).toBeTruthy();
  });

  it('falha ao ler perguntas não esconde as denúncias', async () => {
    mockListarPerguntas.mockRejectedValue(new Error('sem acesso'));
    render(<AbaModeracao aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(screen.getByText(/1 em aberto/)).toBeTruthy());
    expect(screen.getByText(/Nenhuma pergunta guardada ainda/)).toBeTruthy();
  });

  it('perder o acesso avisa quem cuida da tela', async () => {
    const negado = new Error('Acesso negado');
    negado.name = 'AcessoNegadoError';
    mockListarDenuncias.mockRejectedValue(negado);
    render(<AbaModeracao aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(aoPerderAcesso).toHaveBeenCalled());
  });
});
