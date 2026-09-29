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

/** Uma página como a function devolve. `total` acima do tamanho = ainda há mais. */
const pagina = (usuarios: unknown[], total = usuarios.length) => ({ usuarios, total });

beforeEach(() => jest.clearAllMocks());

describe('AbaAcessos', () => {
  it('lista usuários, marca admin e desativa o botão da própria linha', async () => {
    mockListar.mockResolvedValue(pagina([fabiano, marcio]));
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    expect(await screen.findByText('Marcio')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('você')).toBeTruthy();
    expect(screen.getByLabelText('Remover admin de Fabiano').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('tornar admin confirma, chama a função e recarrega a lista', async () => {
    mockListar.mockResolvedValue(pagina([fabiano, marcio]));
    mockDefinir.mockResolvedValue({ ...marcio, is_super_admin: true });
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Tornar admin de Marcio'));
    await waitFor(() => expect(mockDefinir).toHaveBeenCalledWith('m', true));
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
  });

  it('mostra a mensagem da trava quando o servidor recusa', async () => {
    mockListar.mockResolvedValue(pagina([fabiano, { ...marcio, is_super_admin: true }]));
    mockDefinir.mockRejectedValue(new Error('O Arcanus precisa de pelo menos um admin.'));
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Remover admin de Marcio'));
    await waitFor(() => expect(mockAlerta).toHaveBeenCalledWith(
      'Não foi possível alterar', 'O Arcanus precisa de pelo menos um admin.',
    ));
  });

  it('a busca filtra por nome ou e-mail', async () => {
    mockListar.mockResolvedValue(pagina([fabiano, marcio]));
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
    mockListar.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(pagina([fabiano, marcio]));
    const aoPerderAcesso = jest.fn();
    render(<AbaAcessos aoPerderAcesso={aoPerderAcesso} />);
    expect(await screen.findByText('Não foi possível carregar os usuários.')).toBeTruthy();
    fireEvent.press(screen.getByText('Tentar de novo'));
    expect(await screen.findByText('Marcio')).toBeTruthy();
    expect(aoPerderAcesso).not.toHaveBeenCalled();
  });

  // ── Paginação. A lista vinha cortada em mil linhas sem avisar, e o Painel
  // mostrava a fatia como se fosse o total. ────────────────────────────────────

  it('quando há mais gente que a página, diz quantos faltam', async () => {
    mockListar.mockResolvedValue(pagina([fabiano, marcio], 137));
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    expect(await screen.findByText('Carregar mais (135 restantes)')).toBeTruthy();
  });

  it('quando a página é tudo, não oferece carregar mais', async () => {
    mockListar.mockResolvedValue(pagina([fabiano, marcio]));
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    expect(await screen.findByText('Marcio')).toBeTruthy();
    expect(screen.queryByText(/Carregar mais/)).toBeNull();
  });

  it('carregar mais pede a página seguinte e acrescenta ao que já está na tela', async () => {
    const ana = { ...marcio, id: 'a', nome: 'Ana', email: 'ana@exemplo.com' };
    mockListar
      .mockResolvedValueOnce(pagina([fabiano, marcio], 3))
      .mockResolvedValueOnce(pagina([ana], 3));

    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByText('Carregar mais (1 restantes)'));

    expect(await screen.findByText('Ana')).toBeTruthy();
    // Os anteriores continuam: acrescenta, não troca de página.
    expect(screen.getByText('Marcio')).toBeTruthy();
    expect(mockListar).toHaveBeenNthCalledWith(1, 0);
    expect(mockListar).toHaveBeenNthCalledWith(2, 1);
  });

  it('linha repetida entre duas páginas não aparece duas vezes', async () => {
    // Alguém se cadastra entre os dois pedidos, a ordem por data empurra uma linha
    // para a página seguinte, e ela voltaria duplicada — com chave repetida.
    mockListar
      .mockResolvedValueOnce(pagina([fabiano, marcio], 3))
      .mockResolvedValueOnce(pagina([marcio], 3));

    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByText('Carregar mais (1 restantes)'));

    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText('Marcio')).toHaveLength(1);
  });

  it('a busca diz em voz alta que não procurou entre todos', async () => {
    // Sem este aviso, "Nenhum usuário encontrado" podia ser mentira sobre alguém
    // que existe e só não foi carregado ainda.
    mockListar.mockResolvedValue(pagina([fabiano, marcio], 137));
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    fireEvent.changeText(await screen.findByLabelText('Buscar usuário'), 'zoraide');

    expect(await screen.findByText(/A busca procura entre os 2 já carregados/)).toBeTruthy();
    expect(screen.getByText('Nenhum usuário encontrado.')).toBeTruthy();
  });

  it('sem gente por carregar, a busca não avisa nada', async () => {
    mockListar.mockResolvedValue(pagina([fabiano, marcio]));
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    fireEvent.changeText(await screen.findByLabelText('Buscar usuário'), 'zoraide');

    expect(await screen.findByText('Nenhum usuário encontrado.')).toBeTruthy();
    expect(screen.queryByText(/A busca procura entre/)).toBeNull();
  });

  it('falhar ao carregar mais não apaga o que já estava na tela', async () => {
    mockListar
      .mockResolvedValueOnce(pagina([fabiano, marcio], 137))
      .mockRejectedValueOnce(new Error('rede'));

    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByText('Carregar mais (135 restantes)'));

    expect(await screen.findByText('Não foi possível carregar mais usuários.')).toBeTruthy();
    expect(screen.getByText('Marcio')).toBeTruthy();
  });
});
