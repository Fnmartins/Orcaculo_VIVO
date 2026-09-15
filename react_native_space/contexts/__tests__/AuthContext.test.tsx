import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../services/auth', () => ({
  AuthServico: {
    sessaoAtual: jest.fn().mockResolvedValue(null),
    onMudancaAuth: jest.fn(() => ({ unsubscribe: jest.fn() })),
    buscarPerfil: jest.fn(),
    atualizarPerfil: jest.fn(),
  },
}));
jest.mock('../../services/consultaPendente', () => ({
  migrarConsultaPendente: jest.fn().mockResolvedValue(undefined),
}));

import { AuthProvider, useAuth, ERRO_SEM_SESSAO } from '../AuthContext';
import { AuthServico } from '../../services/auth';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext.atualizarPerfil', () => {
  it('sem sessão, rejeita com mensagem e não chama o serviço', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await expect(result.current.atualizarPerfil({ nome: 'Teste' })).rejects.toThrow(ERRO_SEM_SESSAO);
    expect(AuthServico.atualizarPerfil).not.toHaveBeenCalled();
  });
});
