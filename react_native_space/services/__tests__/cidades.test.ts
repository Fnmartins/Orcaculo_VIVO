type Resultado = { data: unknown; error: { message?: string } | null };

const mockFrom = jest.fn();
jest.mock('../supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import { achatar, buscarCidades } from '../cidades';

/** Cadeia do supabase-js: todo método devolve a própria cadeia. */
function cadeia(resultado: Resultado) {
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'like', 'order', 'limit']) {
    c[metodo] = jest.fn(() => c);
  }
  c.then = (resolver: (r: Resultado) => unknown, rejeitar: (e: unknown) => unknown) =>
    Promise.resolve(resultado).then(resolver, rejeitar);
  return c;
}

// A cidade que faltava: é o caso que abriu este arquivo.
const santoAngelo = {
  id: '3449112', nome: 'Santo Ângelo', regiao: 'RS', pais: 'BR',
  lat: -28.3, lon: -54.26, fuso: 'America/Sao_Paulo', populacao: 77000,
};

beforeEach(() => mockFrom.mockReset());

describe('achatar', () => {
  it('tira acento e caixa, para "santo angelo" achar "Santo Ângelo"', () => {
    expect(achatar('Santo Ângelo')).toBe('santo angelo');
    expect(achatar('  SÃO PAULO ')).toBe('sao paulo');
  });
});

describe('buscarCidades', () => {
  it('acha no banco a cidade que a lista local não tinha', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [santoAngelo], error: null }));
    const achadas = await buscarCidades('santo angelo');
    expect(mockFrom).toHaveBeenCalledWith('cidades');
    expect(achadas).toHaveLength(1);
    expect(achadas[0].nome).toBe('Santo Ângelo');
    expect(achadas[0].uf).toBe('RS');
    expect(achadas[0].fuso).toBe('America/Sao_Paulo');
  });

  it('deriva o offset padrão do fuso, em vez de deixar zero', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [santoAngelo], error: null }));
    const [cidade] = await buscarCidades('santo angelo');
    // UTC−3 no horário padrão brasileiro.
    expect(cidade.offsetPadrao).toBe(-180);
  });

  it('cidade de fora sai com o nome do país, não com a sigla', async () => {
    mockFrom.mockReturnValue(cadeia({
      data: [{
        id: '6167865', nome: 'Toronto', regiao: 'ON', pais: 'CA',
        lat: 43.65, lon: -79.38, fuso: 'America/Toronto', populacao: 2731571,
      }],
      error: null,
    }));
    const [cidade] = await buscarCidades('toronto');
    expect(cidade.pais).toBe('Canadá');
    expect(cidade.uf).toBeUndefined();
  });

  // A rede de proteção: sem ela, banco fora do ar deixava a pessoa sem cidade.
  it('banco falhando cai na lista local, sem lançar', async () => {
    mockFrom.mockReturnValue(cadeia({ data: null, error: { message: 'sem rede' } }));
    const achadas = await buscarCidades('sao paulo');
    expect(achadas[0].id).toBe('sao-paulo-sp');
  });

  it('banco sem resultado também cai na lista local', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [], error: null }));
    expect((await buscarCidades('curitiba'))[0].id).toBe('curitiba-pr');
  });

  it('uma letra só não consulta o banco', async () => {
    expect(await buscarCidades('s')).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
