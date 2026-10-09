import { comprarAvulso, creditosDaPessoa } from '../avulso';

/**
 * O lado do app da compra avulsa. Fica em `avulso-cliente` e não em `avulso`
 * porque `avulso.test.ts` já existe e testa o outro lado, o módulo do servidor
 * (`supabase/functions/_shared/avulso.ts`).
 */

const mockFrom = jest.fn();
const mockInvoke = jest.fn();
jest.mock('../supabase', () => ({
  supabase: {
    from: (t: string) => mockFrom(t),
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
  },
}));

/**
 * A tabela falsa: `disponiveis` responde a corrente `select → is → gt` e `consumidas`, a
 * `select → not`. `creditosDaPessoa` faz as duas perguntas, e cada teste decide o que
 * cada uma responde.
 */
type Resposta = { data: unknown[] | null; error: { message: string } | null };
function tabela(disponiveis: Resposta, consumidas: Resposta = { data: [], error: null }) {
  mockFrom.mockReturnValue({
    select: () => ({
      is: () => ({ gt: () => Promise.resolve(disponiveis) }),
      not: () => Promise.resolve(consumidas),
    }),
  });
}

describe('creditosDaPessoa', () => {
  // A falha vai para o log por desenho; o spy impede que ela suje a saída do Jest e
  // deixa o teste afirmar que ela de fato foi registrada.
  let aviso: jest.SpyInstance;
  beforeEach(() => { aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { aviso.mockRestore(); });

  it('devolve vazio quando a leitura falha, em vez de explodir, e diz que falhou', async () => {
    // Isto decora um card e, na vocação, abre a leitura. Falhar aqui não pode derrubar a
    // tela, que é o que a pessoa veio ver. E "falhou" não é "zero": quem leu zero por
    // queda de rede pode já ter pagado, e a tela não deve convidá-lo a pagar de novo.
    tabela({ data: null, error: { message: 'x' } });
    await expect(creditosDaPessoa()).resolves.toEqual({
      porOraculo: {}, consumidasPorOraculo: {}, falhou: true,
    });
    expect(aviso).toHaveBeenCalledWith('falha ao ler creditos avulsos', 'x');
  });

  it('a falha da leitura das gastas também é falha, e não "nenhuma gasta"', async () => {
    tabela({ data: [{ oraculo: 'mapa' }], error: null }, { data: null, error: { message: 'y' } });
    await expect(creditosDaPessoa()).resolves.toEqual({
      porOraculo: { mapa: 1 }, consumidasPorOraculo: {}, falhou: true,
    });
    expect(aviso).toHaveBeenCalledWith('falha ao ler creditos avulsos', 'y');
  });

  it('conta quantos creditos ha de cada produto', async () => {
    tabela({
      data: [{ oraculo: 'mapa' }, { oraculo: 'mapa' }, { oraculo: 'vocacao' }], error: null,
    });
    await expect(creditosDaPessoa()).resolves.toEqual({
      porOraculo: { mapa: 2, vocacao: 1 }, consumidasPorOraculo: {}, falhou: false,
    });
    expect(aviso).not.toHaveBeenCalled();
  });

  it('conta as compras já gastas por produto, separadas dos créditos', async () => {
    tabela(
      { data: [{ oraculo: 'mapa' }], error: null },
      { data: [{ oraculo: 'vocacao' }, { oraculo: 'vocacao' }, { oraculo: 'mapa' }], error: null },
    );
    await expect(creditosDaPessoa()).resolves.toEqual({
      porOraculo: { mapa: 1 }, consumidasPorOraculo: { vocacao: 2, mapa: 1 }, falhou: false,
    });
  });

  it('só conta como crédito o que não foi gasto e ainda não venceu', async () => {
    // Sem estes dois filtros a tela mostraria "você tem uma leitura" para um
    // crédito que o servidor já recusa, e a pessoa tocaria para ler um erro.
    const is = jest.fn();
    const gt = jest.fn().mockResolvedValue({ data: [], error: null });
    is.mockReturnValue({ gt });
    const select = jest.fn().mockReturnValue({
      is, not: () => Promise.resolve({ data: [], error: null }),
    });
    mockFrom.mockReturnValue({ select });

    const antes = Date.now();
    await creditosDaPessoa();

    expect(mockFrom).toHaveBeenCalledWith('compras_avulsas');
    expect(select).toHaveBeenCalledWith('oraculo');
    expect(is).toHaveBeenCalledWith('consumido_em', null);
    // "Ainda não venceu" é comparar com AGORA, não com uma data fixa.
    const [coluna, quando] = gt.mock.calls[0] as [string, string];
    expect(coluna).toBe('expira_em');
    expect(Math.abs(Date.parse(quando) - antes)).toBeLessThan(5000);
  });

  it('as gastas são só as que têm `consumido_em`, SEM filtro de validade', async () => {
    // O prazo de 90 dias é do direito de gerar. A leitura que o crédito já pagou não
    // expira, e quem a gastou há seis meses ainda tem direito de reabri-la.
    const not = jest.fn().mockResolvedValue({ data: [], error: null });
    const gt = jest.fn().mockResolvedValue({ data: [], error: null });
    const select = jest.fn().mockReturnValue({ is: () => ({ gt }), not });
    mockFrom.mockReturnValue({ select });

    await creditosDaPessoa();

    expect(not).toHaveBeenCalledWith('consumido_em', 'is', null);
    // O único `gt` da leitura é o dos créditos disponíveis.
    expect(gt).toHaveBeenCalledTimes(1);
  });
});

describe('comprarAvulso', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('devolve o endereço que a function mandou em `checkoutUrl`', async () => {
    mockInvoke.mockResolvedValue({ data: { checkoutUrl: 'https://checkout.stripe.com/c/abc' }, error: null });
    await expect(comprarAvulso('mapa')).resolves.toBe('https://checkout.stripe.com/c/abc');
  });

  it('pede a function certa, com o produto e a moeda', async () => {
    mockInvoke.mockResolvedValue({ data: { checkoutUrl: 'https://x' }, error: null });
    await comprarAvulso('vocacao');
    expect(mockInvoke).toHaveBeenCalledWith('criar-checkout-avulso', {
      body: { oraculo: 'vocacao', moeda: 'brl' },
    });
    await comprarAvulso('mapa', 'usd');
    expect(mockInvoke).toHaveBeenLastCalledWith('criar-checkout-avulso', {
      body: { oraculo: 'mapa', moeda: 'usd' },
    });
  });

  it('resposta sem `checkoutUrl` vira erro, e não um endereço "undefined"', async () => {
    // `url` é o nome errado e daria `undefined` sem erro de compilação: é o que
    // este teste existe para pegar se alguém "arrumar" o nome.
    mockInvoke.mockResolvedValue({ data: { url: 'https://x' }, error: null });
    await expect(comprarAvulso('mapa')).rejects.toThrow('O pagamento não abriu. Tente de novo.');
    mockInvoke.mockResolvedValue({ data: null, error: null });
    await expect(comprarAvulso('mapa')).rejects.toThrow('O pagamento não abriu. Tente de novo.');
  });

  it('a mensagem do servidor chega à tela quando a function recusa', async () => {
    const corpo = { erro: 'Este produto não está à venda.' };
    mockInvoke.mockResolvedValue({
      data: null,
      error: { context: { status: 400, json: () => Promise.resolve(corpo) } },
    });
    await expect(comprarAvulso('mapa')).rejects.toThrow('Este produto não está à venda.');
  });
});
