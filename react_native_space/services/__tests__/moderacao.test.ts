type Resultado = { data: unknown; error: { code?: string; message?: string } | null };

const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { listarDenuncias, listarPerguntasAnonimas, resolverDenuncia } from '../moderacao';
import { ehAcessoNegado } from '../acessoNegado';
import { ehSessaoExpirada } from '../sessaoExpirada';

/** Cadeia do supabase-js: todo método devolve a própria cadeia; `await` resolve no resultado. */
function cadeia(resultado: Resultado) {
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'update', 'eq', 'order', 'limit']) {
    c[metodo] = jest.fn(() => c);
  }
  c.then = (resolver: (r: Resultado) => unknown, rejeitar: (e: unknown) => unknown) =>
    Promise.resolve(resultado).then(resolver, rejeitar);
  return c;
}

const denuncia = {
  id: 'd1', origem: 'pergunta', oraculo: 'buzios',
  conteudo: 'Pergunta: e agora?\n\nResposta: texto da IA',
  motivo: 'falou de remédio', criado_em: '2026-09-26T12:00:00Z', resolvida: false,
};

const pergunta = {
  id: 'p1', oraculo: 'buzios', contexto: 'Odu: Ejilaxeborá',
  pergunta: 'o que esse odu pede de mim?', dia: '2026-09-26',
};

beforeEach(() => {
  mockFrom.mockReset();
  mockRpc.mockReset();
});

describe('services/moderacao', () => {
  it('lista as denúncias da tabela denuncias_ia', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [denuncia], error: null }));
    await expect(listarDenuncias()).resolves.toEqual([denuncia]);
    expect(mockFrom).toHaveBeenCalledWith('denuncias_ia');
  });

  it('lista vazia sendo admin é o estado bom, não erro', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: true, error: null });
    await expect(listarDenuncias()).resolves.toEqual([]);
  });

  it('lista vazia sem ser admin vira AcessoNegadoError', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: false, error: null });
    const erro = await listarDenuncias().catch((e) => e);
    expect(ehAcessoNegado(erro)).toBe(true);
  });

  it('token vencido vira SessaoExpiradaError, não falha de rede', async () => {
    mockFrom.mockReturnValue(cadeia({ data: null, error: { code: 'PGRST301' } }));
    const erro = await listarDenuncias().catch((e) => e);
    expect(ehSessaoExpirada(erro)).toBe(true);
  });

  it('resolver devolve a linha atualizada', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [{ ...denuncia, resolvida: true }], error: null }));
    await expect(resolverDenuncia('d1', true)).resolves.toEqual({ ...denuncia, resolvida: true });
  });

  it('resolver sem afetar linha, sendo admin, é item removido', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: true, error: null });
    await expect(resolverDenuncia('d1', true)).rejects.toMatchObject({ name: 'ItemRemovidoError' });
  });

  it('lista as perguntas guardadas da tabela perguntas_anonimas', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [pergunta], error: null }));
    await expect(listarPerguntasAnonimas()).resolves.toEqual([pergunta]);
    expect(mockFrom).toHaveBeenCalledWith('perguntas_anonimas');
  });

  it('pergunta nenhuma não é erro nem exige admin: lista vazia é normal', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [], error: null }));
    await expect(listarPerguntasAnonimas()).resolves.toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
