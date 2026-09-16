const mockInvoke = jest.fn();
jest.mock('../supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

import { definirAdmin, listarUsuarios } from '../acessos';

/** Erro do supabase-js para resposta não-2xx: o Response fica em `context`. */
function erroHttp(status: number, corpo: unknown) {
  return { context: { status, json: async () => corpo } };
}

const marcio = {
  id: '6b1f3c1e-0000-4000-8000-000000000002', nome: 'Marcio', email: 'marcio@exemplo.com',
  criado_em: '2026-09-08T19:32:53Z', plano: 'gratuito', is_super_admin: false,
};

beforeEach(() => mockInvoke.mockReset());

describe('services/acessos', () => {
  it('listarUsuarios chama a função com acao=listar e devolve a lista', async () => {
    mockInvoke.mockResolvedValue({ data: { usuarios: [marcio] }, error: null });
    await expect(listarUsuarios()).resolves.toEqual([marcio]);
    expect(mockInvoke).toHaveBeenCalledWith('admin-acessos', { body: { acao: 'listar' } });
  });

  it('definirAdmin envia usuarioId e admin e devolve o usuário gravado', async () => {
    mockInvoke.mockResolvedValue({ data: { usuario: { ...marcio, is_super_admin: true } }, error: null });
    await expect(definirAdmin(marcio.id, true)).resolves.toMatchObject({ is_super_admin: true });
    expect(mockInvoke).toHaveBeenCalledWith('admin-acessos', {
      body: { acao: 'definir-admin', usuarioId: marcio.id, admin: true },
    });
  });

  it('403 vira AcessoNegadoError', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: erroHttp(403, { erro: 'Acesso negado' }) });
    await expect(listarUsuarios()).rejects.toMatchObject({ name: 'AcessoNegadoError' });
  });

  it('409 traz a mensagem da trava', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: erroHttp(409, { erro: 'O Arcanus precisa de pelo menos um admin.' }),
    });
    await expect(definirAdmin(marcio.id, false)).rejects.toThrow('O Arcanus precisa de pelo menos um admin.');
  });

  it('falha sem corpo legível usa mensagem genérica', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Failed to fetch') });
    await expect(listarUsuarios()).rejects.toThrow('Falha ao falar com o servidor.');
  });
});
