import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockListar = jest.fn();
const mockDefinir = jest.fn();
jest.mock('../../../services/acessos', () => ({
  listarUsuarios: (...a: unknown[]) => mockListar(...a),
  definirAdmin: (...a: unknown[]) => mockDefinir(...a),
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ sessao: { user: { id: 'eu' } } }),
}));
const mockAlerta = jest.fn();
jest.mock('../../../utils/alerta', () => ({
  mostrarAlerta: (...a: unknown[]) => mockAlerta(...a),
  confirmarAcao: (_titulo: string, _mensagem: string, aoConfirmar: () => void) => aoConfirmar(),
}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
}));

import { AbaAcessos } from '../AbaAcessos';
import { AcessoNegadoError } from '../../../services/acessoNegado';
import { SessaoExpiradaError, MENSAGEM_SESSAO_EXPIRADA } from '../../../services/sessaoExpirada';

const fabiano = {
  id: 'eu', nome: 'Fabiano', email: 'fabiano@exemplo.com',
  criado_em: '2026-09-01T00:00:00Z', plano: 'gratuito', is_super_admin: true,
};
const marcio = {
  id: 'm', nome: 'Marcio', email: 'marcio@exemplo.com',
  criado_em: '2026-09-08T00:00:00Z', plano: 'gratuito', is_super_admin: false,
};

beforeEach(() => jest.clearAllMocks());

describe('AbaAcessos', () => {
  it('lista usuários, marca admin e desativa o botão da própria linha', async () => {
    mockListar.mockResolvedValue([fabiano, marcio]);
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    expect(await screen.findByText('Marcio')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('você')).toBeTruthy();
    expect(screen.getByLabelText('Remover admin de Fabiano').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('tornar admin confirma, chama a função e recarrega a lista', async () => {
    mockListar.mockResolvedValue([fabiano, marcio]);
    mockDefinir.mockResolvedValue({ ...marcio, is_super_admin: true });
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Tornar admin de Marcio'));
    await waitFor(() => expect(mockDefinir).toHaveBeenCalledWith('m', true));
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
  });

  it('mostra a mensagem da trava quando o servidor recusa', async () => {
    mockListar.mockResolvedValue([fabiano, { ...marcio, is_super_admin: true }]);
    mockDefinir.mockRejectedValue(new Error('O Arcanus precisa de pelo menos um admin.'));
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Remover admin de Marcio'));
    await waitFor(() => expect(mockAlerta).toHaveBeenCalledWith(
      'Não foi possível alterar', 'O Arcanus precisa de pelo menos um admin.',
    ));
  });

  it('a busca filtra por nome ou e-mail', async () => {
    mockListar.mockResolvedValue([fabiano, marcio]);
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    await screen.findByText('Marcio');
    fireEvent.changeText(screen.getByLabelText('Buscar usuário'), 'marc');
    expect(screen.queryByText('Fabiano')).toBeNull();
    expect(screen.getByText('Marcio')).toBeTruthy();
  });

  it('acesso negado ao listar chama aoPerderAcesso', async () => {
    mockListar.mockRejectedValue(new AcessoNegadoError());
    const aoPerderAcesso = jest.fn();
    render(<AbaAcessos aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(aoPerderAcesso).toHaveBeenCalled());
  });

  it('sessão expirada ao listar avisa e manda para o login', async () => {
    mockListar.mockRejectedValue(new SessaoExpiradaError());
    const aoPerderAcesso = jest.fn();
    render(<AbaAcessos aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(mockAlerta).toHaveBeenCalledWith('Sessão expirada', MENSAGEM_SESSAO_EXPIRADA));
    expect(mockReplace).toHaveBeenCalledWith('/auth/login');
    expect(aoPerderAcesso).not.toHaveBeenCalled();
  });

  it('falha de rede mostra "Tentar de novo" e recarrega', async () => {
    mockListar.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce([fabiano, marcio]);
    const aoPerderAcesso = jest.fn();
    render(<AbaAcessos aoPerderAcesso={aoPerderAcesso} />);
    expect(await screen.findByText('Não foi possível carregar os usuários.')).toBeTruthy();
    fireEvent.press(screen.getByText('Tentar de novo'));
    expect(await screen.findByText('Marcio')).toBeTruthy();
    expect(aoPerderAcesso).not.toHaveBeenCalled();
  });
});
