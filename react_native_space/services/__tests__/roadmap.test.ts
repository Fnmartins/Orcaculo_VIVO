type Resultado = { data: unknown; error: { code?: string; message?: string } | null };

const mockFrom = jest.fn();
jest.mock('../supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import {
  listarRoadmap, criarItemRoadmap, atualizarItemRoadmap, excluirItemRoadmap,
} from '../roadmap';

/** Cadeia do supabase-js: todo método devolve a própria cadeia; `await` resolve no resultado. */
function cadeia(resultado: Resultado) {
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single']) {
    c[metodo] = jest.fn(() => c);
  }
  c.then = (resolver: (r: Resultado) => unknown, rejeitar: (e: unknown) => unknown) =>
    Promise.resolve(resultado).then(resolver, rejeitar);
  return c;
}

const itemA = {
  id: 'a', fase: 'A', titulo: 'Item A', descricao: null, status: 'todo',
  ordem: 1, criado_em: '2026-09-15T00:00:00Z', atualizado_em: '2026-09-15T00:00:00Z',
};
const dados = { fase: 'A', titulo: 'Item A', descricao: null, status: 'todo' as const, ordem: 1 };

beforeEach(() => mockFrom.mockReset());

describe('services/roadmap', () => {
  it('lista os itens da tabela roadmap_itens', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [itemA], error: null }));
    await expect(listarRoadmap()).resolves.toEqual([itemA]);
    expect(mockFrom).toHaveBeenCalledWith('roadmap_itens');
  });

  it('criar recusado pela RLS (42501) vira AcessoNegadoError', async () => {
    mockFrom.mockReturnValue(cadeia({ data: null, error: { code: '42501', message: 'rls' } }));
    await expect(criarItemRoadmap(dados)).rejects.toMatchObject({ name: 'AcessoNegadoError' });
  });

  it('atualizar sem nenhuma linha afetada vira AcessoNegadoError', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [], error: null }));
    await expect(atualizarItemRoadmap('a', { titulo: 'Novo' })).rejects.toMatchObject({ name: 'AcessoNegadoError' });
  });

  it('atualizar devolve a linha gravada', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [{ ...itemA, titulo: 'Novo' }], error: null }));
    await expect(atualizarItemRoadmap('a', { titulo: 'Novo' })).resolves.toMatchObject({ titulo: 'Novo' });
  });

  it('erro comum mantém a mensagem do Supabase', async () => {
    mockFrom.mockReturnValue(cadeia({ data: null, error: { code: '08006', message: 'sem conexão' } }));
    await expect(excluirItemRoadmap('a')).rejects.toThrow('sem conexão');
  });
});
