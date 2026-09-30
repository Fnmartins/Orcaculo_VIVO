import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

const mockPerfil = {
  plano: 'gratuito', is_super_admin: false, plano_valido_ate: null as string | null,
};
let mockSessao: { user: { id: string } } | null = { user: { id: 'u1' } };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ perfil: mockPerfil, sessao: mockSessao }),
}));
const mockLerUso = jest.fn().mockResolvedValue(null);
jest.mock('../../services/usoIA', () => ({
  lerUsoDoDia: (...a: unknown[]) => mockLerUso(...a),
}));

import { SemaforoUso } from '../SemaforoUso';

// Cada teste mexe no perfil e na sessão; sem devolver ao começo, uma falha no meio
// de um teste contaminaria o seguinte e esconderia qual deles quebrou de verdade.
beforeEach(() => {
  mockPerfil.plano_valido_ate = null;
  mockPerfil.is_super_admin = false;
  mockSessao = { user: { id: 'u1' } };
  mockLerUso.mockClear();
});

describe('SemaforoUso quando o acesso venceu', () => {
  it('mostra o cadeado e a data', async () => {
    // Data no passado de verdade, para o teste não depender do dia em que roda, e ao
    // meio-dia em Brasília (15h UTC) para o dia não virar na conversão de fuso.
    mockPerfil.plano_valido_ate = '2025-10-10T15:00:00Z';
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(await screen.findByLabelText('Acesso vencido')).toBeTruthy();
    expect(screen.getByText(/10\/10/)).toBeTruthy();
  });

  it('validade nula também é vencido, sem escrever "null"', () => {
    mockPerfil.plano_valido_ate = null;
    render(<SemaforoUso tipo="voz" rotulo="Leituras faladas" />);
    expect(screen.getByLabelText('Acesso vencido')).toBeTruthy();
    expect(screen.queryByText(/null/)).toBeNull();
  });

  it('com validade no futuro não mostra cadeado', () => {
    mockPerfil.plano_valido_ate = '2099-01-01T00:00:00Z';
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
  });

  it('super-admin nunca vê cadeado', () => {
    mockPerfil.plano_valido_ate = null;
    mockPerfil.is_super_admin = true;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
    mockPerfil.is_super_admin = false;
  });

  it('quem saiu da conta não lê "seu acesso terminou", nunca teve acesso', () => {
    mockSessao = null;
    mockPerfil.plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
    expect(screen.queryByText(/acesso terminou/)).toBeNull();
  });

  it('trancado não vai ao banco ler o contador do dia', () => {
    mockPerfil.plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(screen.getByLabelText('Acesso vencido')).toBeTruthy();
    expect(mockLerUso).not.toHaveBeenCalled();
  });

  it('com acesso, o contador do dia continua sendo lido', async () => {
    mockPerfil.plano_valido_ate = '2099-01-01T00:00:00Z';
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    await waitFor(() => expect(mockLerUso)
      .toHaveBeenCalledWith('u1', 'gratuito', 'interpretacao'));
  });
});
