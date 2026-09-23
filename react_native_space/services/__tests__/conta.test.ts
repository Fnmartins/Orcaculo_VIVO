const mockInvoke = jest.fn();
jest.mock('../supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

import { excluirConta } from '../conta';

/** Erro do supabase-js para resposta não-2xx: o Response fica em `context`. */
function erroHttp(status: number, corpo: unknown) {
  return { context: { status, json: async () => corpo } };
}

beforeEach(() => mockInvoke.mockReset());

describe('services/conta', () => {
  it('manda a palavra de confirmação e nenhum id de usuário', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    await expect(excluirConta()).resolves.toBeUndefined();
    expect(mockInvoke).toHaveBeenCalledWith('excluir-conta', { body: { confirmacao: 'EXCLUIR' } });
  });

  // Quem é apagado sai do JWT, no servidor. Mandar id daqui deixaria a função
  // apagar conta alheia se alguém trocasse o valor.
  it('nunca envia identificador no corpo', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    await excluirConta();
    const corpo = mockInvoke.mock.calls[0][1] as { body: Record<string, unknown> };
    expect(Object.keys(corpo.body)).toEqual(['confirmacao']);
  });

  it('401 vira SessaoExpiradaError', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: erroHttp(401, { erro: 'Sessão inválida ou expirada' }) });
    await expect(excluirConta()).rejects.toMatchObject({ name: 'SessaoExpiradaError' });
  });

  it('500 traz a mensagem da function, para a tela não inventar o motivo', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: erroHttp(500, { erro: 'Não foi possível excluir a conta. Nada foi apagado pela metade — tente de novo.' }),
    });
    await expect(excluirConta()).rejects.toThrow('Nada foi apagado pela metade');
  });

  it('erro sem corpo JSON cai na mensagem genérica', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { context: { status: 502, json: async () => { throw new Error('não é JSON'); } } },
    });
    await expect(excluirConta()).rejects.toThrow('Falha ao falar com o servidor.');
  });
});
