type Resultado = { data: unknown; error: { code?: string; message?: string } | null };

const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  listarDecisoes, criarDecisao, fecharDecisao, listarManifestacoes, registrarManifestacao,
} from '../decisoes';

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

const decisao = {
  id: 'd1', titulo: 'Mesa de búzios', contexto: null, link: null, status: 'aberta',
  decidido_em: null, criado_em: '2026-09-22T12:00:00Z', atualizado_em: '2026-09-22T12:00:00Z',
};

const manifestacao = {
  id: 'm1', decisao_id: 'd1', autor_nome: 'Marcio', posicao: 'aprovo',
  texto: 'Gostei.', criado_em: '2026-09-22T13:00:00Z',
};

const novaManifestacao = {
  decisaoId: 'd1', autorId: 'u1', autorNome: 'Marcio', posicao: 'aprovo' as const, texto: 'Gostei.',
};

beforeEach(() => {
  mockFrom.mockReset();
  mockRpc.mockReset();
});

describe('services/decisoes', () => {
  it('lista as decisões da tabela decisoes', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [decisao], error: null }));
    await expect(listarDecisoes()).resolves.toEqual([decisao]);
    expect(mockFrom).toHaveBeenCalledWith('decisoes');
  });

  it('lista vazia sem ser admin vira AcessoNegadoError', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: false, error: null });
    await expect(listarDecisoes()).rejects.toMatchObject({ name: 'AcessoNegadoError' });
  });

  it('lista vazia sendo admin é só uma lista vazia', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: true, error: null });
    await expect(listarDecisoes()).resolves.toEqual([]);
  });

  it('criar recusado pela RLS (42501) vira AcessoNegadoError', async () => {
    mockFrom.mockReturnValue(cadeia({ data: null, error: { code: '42501', message: 'rls' } }));
    await expect(criarDecisao({ titulo: 'X', contexto: null, link: null }))
      .rejects.toMatchObject({ name: 'AcessoNegadoError' });
  });

  it('JWT vencido vira SessaoExpiradaError', async () => {
    mockFrom.mockReturnValue(cadeia({ data: null, error: { code: 'PGRST301', message: 'JWT expired' } }));
    await expect(listarManifestacoes('d1')).rejects.toMatchObject({ name: 'SessaoExpiradaError' });
  });

  it('lista as manifestações de uma decisão', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [manifestacao], error: null }));
    await expect(listarManifestacoes('d1')).resolves.toEqual([manifestacao]);
    expect(mockFrom).toHaveBeenCalledWith('decisao_manifestacoes');
  });

  it('registra a manifestação e devolve a linha gravada', async () => {
    mockFrom.mockReturnValue(cadeia({ data: manifestacao, error: null }));
    await expect(registrarManifestacao(novaManifestacao)).resolves.toEqual(manifestacao);
  });

  // A policy barra manifestação em decisão fechada com o mesmo código de permissão
  // negada; quem ainda é admin precisa ouvir o motivo certo.
  it('manifestar em decisão fechada vira DecisaoFechadaError, não acesso negado', async () => {
    mockFrom.mockReturnValue(cadeia({ data: null, error: { code: '42501', message: 'rls' } }));
    mockRpc.mockResolvedValue({ data: true, error: null });
    await expect(registrarManifestacao(novaManifestacao))
      .rejects.toMatchObject({ name: 'DecisaoFechadaError' });
  });

  it('manifestar sem ser admin continua sendo acesso negado', async () => {
    mockFrom.mockReturnValue(cadeia({ data: null, error: { code: '42501', message: 'rls' } }));
    mockRpc.mockResolvedValue({ data: false, error: null });
    await expect(registrarManifestacao(novaManifestacao))
      .rejects.toMatchObject({ name: 'AcessoNegadoError' });
  });

  it('fechar devolve a decisão atualizada', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [{ ...decisao, status: 'decidida' }], error: null }));
    await expect(fecharDecisao('d1', 'u1')).resolves.toMatchObject({ status: 'decidida' });
  });

  it('fechar sem afetar linha, sendo admin, vira ItemRemovidoError', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: true, error: null });
    await expect(fecharDecisao('d1', 'u1')).rejects.toMatchObject({ name: 'ItemRemovidoError' });
  });
});
