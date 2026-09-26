import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RESPOSTA_CRISE } from '../../utils/perguntas';

const mockPerguntar = jest.fn();
const mockLerConsentimento = jest.fn().mockResolvedValue(false);
const mockGravarConsentimento = jest.fn().mockResolvedValue(undefined);
const mockDenunciar = jest.fn().mockResolvedValue(undefined);
// Sem requireActual: o módulo real carrega o cliente do Supabase, que não roda no Jest.
jest.mock('../../services/perguntas', () => ({
  perguntar: (...a: unknown[]) => mockPerguntar(...a),
  lerConsentimentoPerguntas: (...a: unknown[]) => mockLerConsentimento(...a),
  gravarConsentimentoPerguntas: (...a: unknown[]) => mockGravarConsentimento(...a),
  denunciarConteudoIA: (...a: unknown[]) => mockDenunciar(...a),
}));

// O semáforo dentro da caixa lê o banco pelo services/usoIA, que carrega o
// cliente do Supabase. Aqui ele devolve nulo: sem número, não desenha nada.
const mockLerUso = jest.fn().mockResolvedValue(null);
jest.mock('../../services/usoIA', () => ({
  lerUsoDoDia: (...a: unknown[]) => mockLerUso(...a),
}));

const perfil: { data_nascimento: string | null } = { data_nascimento: '1990-05-10' };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ sessao: { user: { id: 'u1' } }, perfil }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a) },
}));

import { CaixaDePergunta } from '../CaixaDePergunta';

const contexto = {
  oraculo: 'buzios' as const,
  odu: { nome: 'Ejilaxeborá', numero: 12, descricao: 'base', orixas: ['Xangô'] },
};

function montar() {
  return render(<CaixaDePergunta contexto={contexto} textoDaLeitura="Ejilaxeborá: base" />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLerConsentimento.mockResolvedValue(false);
  perfil.data_nascimento = '1990-05-10';
});

describe('CaixaDePergunta', () => {
  it('oferece três perguntas prontas antes do campo vazio', () => {
    montar();
    expect(screen.getByText('O que esse odu pede de mim agora?')).toBeTruthy();
    expect(screen.getByText(/3 de 3 perguntas nesta leitura/)).toBeTruthy();
  });

  it('tocar numa sugestão preenche o campo', () => {
    montar();
    fireEvent.press(screen.getByLabelText('Usar a pergunta: O que esse odu pede de mim agora?'));
    expect(screen.getByLabelText('Sua pergunta sobre esta leitura').props.value)
      .toBe('O que esse odu pede de mim agora?');
  });

  it('pergunta respondida some do contador e ganha botão de denúncia', async () => {
    mockPerguntar.mockResolvedValue({ resposta: 'A resposta.', crise: false, restanteHoje: 4 });
    montar();
    fireEvent.changeText(screen.getByLabelText('Sua pergunta sobre esta leitura'), 'e agora?');
    fireEvent.press(screen.getByText('Perguntar'));

    await waitFor(() => expect(screen.getByText('A resposta.')).toBeTruthy());
    expect(screen.getByText(/2 de 3 perguntas nesta leitura/)).toBeTruthy();
    expect(screen.getByLabelText('Denunciar esta resposta')).toBeTruthy();
    expect(screen.getByText(/Ainda cabem 4 perguntas hoje/)).toBeTruthy();
  });

  it('resposta de crise não gasta pergunta e não pode ser denunciada', async () => {
    mockPerguntar.mockResolvedValue({ resposta: RESPOSTA_CRISE, crise: true, restanteHoje: null });
    montar();
    fireEvent.changeText(
      screen.getByLabelText('Sua pergunta sobre esta leitura'),
      'não quero mais viver',
    );
    fireEvent.press(screen.getByText('Perguntar'));

    await waitFor(() => expect(screen.getByText(RESPOSTA_CRISE)).toBeTruthy());
    expect(screen.getByText(/3 de 3 perguntas nesta leitura/)).toBeTruthy();
    expect(screen.queryByLabelText('Denunciar esta resposta')).toBeNull();
  });

  it('a denúncia leva pergunta, resposta e a leitura', async () => {
    mockPerguntar.mockResolvedValue({ resposta: 'A resposta.', crise: false, restanteHoje: null });
    montar();
    fireEvent.changeText(screen.getByLabelText('Sua pergunta sobre esta leitura'), 'e agora?');
    fireEvent.press(screen.getByText('Perguntar'));
    await waitFor(() => expect(screen.getByLabelText('Denunciar esta resposta')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Denunciar esta resposta'));
    fireEvent.changeText(screen.getByLabelText('Motivo da denúncia'), 'falou de remédio');
    fireEvent.press(screen.getByText('Enviar denúncia'));

    await waitFor(() => expect(mockDenunciar).toHaveBeenCalled());
    const enviado = mockDenunciar.mock.calls[0][0] as Record<string, string>;
    expect(enviado.origem).toBe('pergunta');
    expect(enviado.motivo).toBe('falou de remédio');
    expect(enviado.conteudo).toContain('e agora?');
    expect(enviado.conteudo).toContain('A resposta.');
    expect(enviado.conteudo).toContain('Ejilaxeborá');
    await waitFor(() => expect(screen.getByText(/Denúncia enviada/)).toBeTruthy());
  });

  it('o consentimento começa desmarcado e grava quando é marcado', async () => {
    montar();
    const caixa = screen.getByLabelText('Autorizar guardar minhas perguntas sem ligar ao meu nome');
    await waitFor(() => expect(mockLerConsentimento).toHaveBeenCalledWith('u1'));
    expect(caixa.props.accessibilityState.checked).toBe(false);

    fireEvent.press(caixa);
    await waitFor(() => expect(mockGravarConsentimento).toHaveBeenCalledWith('u1', true));
  });

  it('sem data de nascimento, a porta fica fechada e manda para o perfil', () => {
    perfil.data_nascimento = null;
    montar();
    expect(screen.queryByLabelText('Sua pergunta sobre esta leitura')).toBeNull();
    fireEvent.press(screen.getByText('Abrir o perfil'));
    expect(mockPush).toHaveBeenCalledWith('/perfil');
  });

  it('menor de idade não vê o campo', () => {
    perfil.data_nascimento = '2015-01-01';
    montar();
    expect(screen.queryByLabelText('Sua pergunta sobre esta leitura')).toBeNull();
    expect(screen.getByText(/maiores de 18 anos/)).toBeTruthy();
  });
});
