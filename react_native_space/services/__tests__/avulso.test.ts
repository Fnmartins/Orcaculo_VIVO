import {
  creditoDisponivel, creditoJaGastoNesta, devolverCredito, reivindicarCredito,
} from '../../supabase/functions/_shared/avulso';

/**
 * O acesso ao crédito avulso, testado daqui porque `avulso.ts` não importa nada
 * do Deno — só o cliente, que entra por parâmetro.
 *
 * O que estes testes provam e o que não provam: um cliente falso não executa SQL,
 * então NÃO prova que a reivindicação é atômica. Prova o que a atomicidade
 * exige do código — que o `update` leve a condição `consumido_em is null` e que
 * "nenhuma linha atualizada" vire `false` —, e prova a distinção que custa
 * dinheiro: falha de leitura não pode se passar por "não tem crédito", porque o
 * `UNIQUE` é por sessão do Stripe e nada impediria a pessoa de pagar duas vezes.
 */

interface Resposta { data: unknown; error: { message: string } | null }
interface Chamada { metodo: string; args: unknown[] }

type Metodo = 'select' | 'update' | 'eq' | 'is' | 'not' | 'gt' | 'order' | 'limit';
type Encadeavel = { [M in Metodo]: (...args: unknown[]) => Encadeavel } & {
  maybeSingle: () => Promise<Resposta>;
  then: PromiseLike<Resposta>['then'];
};

/**
 * Um cliente que registra cada elo da corrente e responde `resposta` no fim.
 * O supabase-js é "thenable" no último elo (`await ....select('id')`) ou em
 * `maybeSingle()`; o falso imita os dois.
 */
function clienteFalso(resposta: Resposta) {
  const chamadas: Chamada[] = [];
  const tabelas: string[] = [];

  const elo = (metodo: Metodo) => (...args: unknown[]): Encadeavel => {
    chamadas.push({ metodo, args });
    return encadeavel;
  };
  const encadeavel: Encadeavel = {
    select: elo('select'),
    update: elo('update'),
    eq: elo('eq'),
    is: elo('is'),
    not: elo('not'),
    gt: elo('gt'),
    order: elo('order'),
    limit: elo('limit'),
    maybeSingle: () => Promise.resolve(resposta),
    then: (aoResolver, aoRejeitar) => Promise.resolve(resposta).then(aoResolver, aoRejeitar),
  };

  return {
    cliente: { from: (tabela: string) => { tabelas.push(tabela); return encadeavel; } },
    tabelas,
    /** Os argumentos da primeira chamada ao método, ou undefined. */
    de: (metodo: string) => chamadas.find((c) => c.metodo === metodo)?.args,
    /** Os argumentos de cada chamada ao método, na ordem. */
    todas: (metodo: string) => chamadas.filter((c) => c.metodo === metodo).map((c) => c.args),
  };
}

const ok = (data: unknown): Resposta => ({ data, error: null });
const falha = (message = 'conexao caiu'): Resposta => ({ data: null, error: { message } });

let log: jest.SpyInstance;
beforeEach(() => { log = jest.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { log.mockRestore(); });

describe('creditoDisponivel', () => {
  it('devolve o id quando há crédito', async () => {
    const { cliente } = clienteFalso(ok({ id: 42 }));
    expect(await creditoDisponivel(cliente, 'u1', 'mapa')).toEqual({ estado: 'tem', id: 42 });
  });

  it('diz que não tem quando a consulta volta vazia', async () => {
    const { cliente } = clienteFalso(ok(null));
    expect(await creditoDisponivel(cliente, 'u1', 'mapa')).toEqual({ estado: 'nao_tem' });
    expect(log).not.toHaveBeenCalled();
  });

  it('falha de leitura é ERRO, e não "não tem": senão quem já comprou veria "compre"', async () => {
    const { cliente } = clienteFalso(falha());
    expect(await creditoDisponivel(cliente, 'u1', 'mapa')).toEqual({ estado: 'erro' });
    expect(log).toHaveBeenCalledWith('falha ao ler credito avulso', 'conexao caiu');
  });

  it('linha com id que não é número é ERRO, e não some calada', async () => {
    const { cliente } = clienteFalso(ok({ id: '42' }));
    expect(await creditoDisponivel(cliente, 'u1', 'mapa')).toEqual({ estado: 'erro' });
    expect(log).toHaveBeenCalledWith('credito avulso com id inesperado', '{"id":"42"}');
  });

  it('procura só o crédito desta pessoa e deste oráculo, não gasto, não vencido, o mais velho', async () => {
    const f = clienteFalso(ok(null));
    const antes = Date.now();
    await creditoDisponivel(f.cliente, 'u1', 'vocacao');

    expect(f.tabelas).toEqual(['compras_avulsas']);
    expect(f.todas('eq')).toEqual([['usuario_id', 'u1'], ['oraculo', 'vocacao']]);
    expect(f.de('is')).toEqual(['consumido_em', null]);
    expect(f.de('order')).toEqual(['expira_em', { ascending: true }]);
    expect(f.de('limit')).toEqual([1]);

    // "Ainda não venceu" é comparar `expira_em` com AGORA, não com uma data fixa.
    const [coluna, quando] = f.de('gt') as [string, string];
    expect(coluna).toBe('expira_em');
    expect(Math.abs(Date.parse(quando) - antes)).toBeLessThan(5000);
  });
});

describe('reivindicarCredito', () => {
  it('consegue quando atualiza exatamente uma linha', async () => {
    const { cliente } = clienteFalso(ok([{ id: 42 }]));
    expect(await reivindicarCredito(cliente, 42, 'mapa:2026-10-08')).toBe(true);
  });

  it('perde a corrida quando nenhuma linha é atualizada: devolve false, sem erro', async () => {
    // Outro clique chegou antes e já marcou o crédito. É o caso que o
    // `is('consumido_em', null)` existe para detectar.
    const { cliente } = clienteFalso(ok([]));
    expect(await reivindicarCredito(cliente, 42, 'mapa:2026-10-08')).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });

  it('devolve false quando o banco falha, e registra', async () => {
    const { cliente } = clienteFalso(falha());
    expect(await reivindicarCredito(cliente, 42, 'mapa:2026-10-08')).toBe(false);
    expect(log).toHaveBeenCalledWith('falha ao reivindicar credito avulso', 'conexao caiu');
  });

  it('devolve false quando o banco não manda lista nenhuma', async () => {
    const { cliente } = clienteFalso(ok(null));
    expect(await reivindicarCredito(cliente, 42, 'mapa:2026-10-08')).toBe(false);
  });

  it('só atualiza a linha que ainda não foi gasta — a condição que torna isto atômico', async () => {
    const f = clienteFalso(ok([{ id: 42 }]));
    await reivindicarCredito(f.cliente, 42, 'mapa:2026-10-08');

    expect(f.tabelas).toEqual(['compras_avulsas']);
    expect(f.de('eq')).toEqual(['id', 42]);
    expect(f.de('is')).toEqual(['consumido_em', null]);
    const [campos] = f.de('update') as [Record<string, unknown>];
    expect(campos.consumido_chave).toBe('mapa:2026-10-08');
    expect(typeof campos.consumido_em).toBe('string');
  });
});

describe('devolverCredito', () => {
  it('zera o consumo da compra, para o crédito voltar a valer', async () => {
    const f = clienteFalso(ok([{ id: 42 }]));
    await devolverCredito(f.cliente, 42);

    expect(f.tabelas).toEqual(['compras_avulsas']);
    expect(f.de('update')).toEqual([{ consumido_em: null, consumido_chave: null }]);
    expect(f.de('eq')).toEqual(['id', 42]);
  });

  it('falhar ao devolver só vai para o log: não lança dentro do catch de quem chama', async () => {
    const { cliente } = clienteFalso(falha('timeout'));
    await expect(devolverCredito(cliente, 42)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith('falha ao devolver credito avulso', 'timeout');
  });
});

describe('creditoJaGastoNesta', () => {
  it('diz que sim quando existe compra consumida com esta chave', async () => {
    const { cliente } = clienteFalso(ok([{ id: 7 }]));
    await expect(creditoJaGastoNesta(cliente, 'u1', 'vocacao', 'ch1')).resolves.toBe(true);
  });

  it('diz que não quando não há nenhuma', async () => {
    const { cliente } = clienteFalso(ok([]));
    await expect(creditoJaGastoNesta(cliente, 'u1', 'vocacao', 'ch1')).resolves.toBe(false);
  });

  it('falha de leitura responde NÃO, e não sim', async () => {
    // Falhar para "sim" entregaria leitura guardada a quem o portão barraria.
    // Falhar para "não" só mantém a recusa que a pessoa já teria tido.
    const { cliente } = clienteFalso(falha());
    await expect(creditoJaGastoNesta(cliente, 'u1', 'vocacao', 'ch1')).resolves.toBe(false);
    expect(log).toHaveBeenCalledWith('falha ao conferir credito ja gasto', 'conexao caiu');
  });

  it('casa pessoa, oráculo E chave, e exige consumo', async () => {
    const f = clienteFalso(ok([]));
    await creditoJaGastoNesta(f.cliente, 'u1', 'vocacao', 'ch1');

    expect(f.tabelas).toEqual(['compras_avulsas']);
    // Os três, e nesta ordem: sem a chave, qualquer compra gasta da pessoa abriria
    // qualquer leitura guardada; sem o oráculo, uma compra de mapa abriria vocação.
    expect(f.todas('eq')).toEqual([
      ['usuario_id', 'u1'], ['oraculo', 'vocacao'], ['consumido_chave', 'ch1'],
    ]);
    // Sem isto, um crédito ainda NÃO gasto daria direito a leitura de graça.
    expect(f.todas('not')).toEqual([['consumido_em', 'is', null]]);
  });
});
