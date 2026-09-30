import {
  agregarConsumo, SEM_PLANO, type LinhaUso,
} from '../../supabase/functions/_shared/agregarUso';

/**
 * A agregação do consumo de IA, testada daqui porque a function roda no Deno — fora
 * do `tsc` e fora desta suíte.
 *
 * Este arquivo existe por um defeito concreto: a primeira versão do `admin-custo`
 * pedia o plano por encaixe do PostgREST (`perfis!inner(plano)`), que não existe
 * porque `uso_ia.usuario_id` referencia `auth.users(id)` e não `public.perfis(id)`. A
 * tela dizia "não foi possível carregar o custo" e nada apontava para a causa. O
 * `conferir-functions` vê sintaxe, não relacionamento de tabela — a proteção que
 * faltava era esta: a conta fora da function, e com teste.
 */

const linha = (campos: Partial<LinhaUso>): LinhaUso => ({
  usuario_id: 'u1', dia: '2026-09-30', tipo: 'interpretacao',
  quantidade: 1, tokens_entrada: 0, tokens_saida: 0, caracteres: 0,
  ...campos,
});

const PLANOS = { u1: 'mestre', u2: 'mestre', u3: 'gratuito' };

describe('agregarConsumo', () => {
  it('soma por plano e tipo', () => {
    const { consumo } = agregarConsumo([
      linha({ usuario_id: 'u1', tokens_saida: 100 }),
      linha({ usuario_id: 'u2', tokens_saida: 200 }),
      linha({ usuario_id: 'u3', tokens_saida: 50 }),
    ], PLANOS);

    const mestre = consumo.find((c) => c.plano === 'mestre')!;
    expect(mestre.tokensSaida).toBe(300);
    expect(mestre.chamadas).toBe(2);
    expect(consumo.find((c) => c.plano === 'gratuito')!.tokensSaida).toBe(50);
  });

  it('separa tipos do mesmo plano', () => {
    const { consumo } = agregarConsumo([
      linha({ tipo: 'interpretacao', tokens_saida: 100 }),
      linha({ tipo: 'voz', caracteres: 3000 }),
    ], PLANOS);

    expect(consumo.map((c) => c.tipo).sort()).toEqual(['interpretacao', 'voz']);
    expect(consumo.find((c) => c.tipo === 'voz')!.caracteres).toBe(3000);
  });

  it('conta pessoas distintas, não linhas', () => {
    // A mesma pessoa em cinco dias é uma pessoa. Contar linhas faria a tela dizer
    // que cinco pessoas usaram, e o custo por pessoa sairia cinco vezes menor.
    const { pessoasAtivas } = agregarConsumo([
      linha({ usuario_id: 'u1', dia: '2026-09-28' }),
      linha({ usuario_id: 'u1', dia: '2026-09-29' }),
      linha({ usuario_id: 'u1', dia: '2026-09-30' }),
      linha({ usuario_id: 'u2', dia: '2026-09-30' }),
    ], PLANOS);

    expect(pessoasAtivas).toEqual({ mestre: 2 });
  });

  it('usuário sem perfil não desaparece da soma', () => {
    // Consumo que some faz o total mentir para baixo. Aparece sob rótulo próprio.
    const { consumo, pessoasAtivas } = agregarConsumo(
      [linha({ usuario_id: 'fantasma', tokens_saida: 999 })],
      PLANOS,
    );
    expect(consumo[0].plano).toBe(SEM_PLANO);
    expect(consumo[0].tokensSaida).toBe(999);
    expect(pessoasAtivas[SEM_PLANO]).toBe(1);
  });

  it('número que chega como texto do banco conta', () => {
    // `bigint` volta como string no driver. Tratar como zero mostraria consumo alto
    // com custo zero, sem erro nenhum.
    const { consumo } = agregarConsumo([
      linha({
        tokens_entrada: '1500' as unknown as number,
        quantidade: '2' as unknown as number,
      }),
    ], PLANOS);
    expect(consumo[0].tokensEntrada).toBe(1500);
    expect(consumo[0].chamadas).toBe(2);
  });

  it('medidoDesde é o primeiro dia COM consumo, não com chamada', () => {
    // O dia 28 tem chamada e token zero — é anterior à medição. Dizer que mede desde
    // o 28 seria afirmar medição que não houve.
    const { medidoDesde } = agregarConsumo([
      linha({ dia: '2026-09-28', tokens_saida: 0 }),
      linha({ dia: '2026-09-29', tokens_saida: 10 }),
      linha({ dia: '2026-09-30', tokens_saida: 20 }),
    ], PLANOS);
    expect(medidoDesde).toBe('2026-09-29');
  });

  it('sem nenhum consumo medido, medidoDesde é nulo', () => {
    const { medidoDesde } = agregarConsumo([linha({ tokens_saida: 0 })], PLANOS);
    expect(medidoDesde).toBeNull();
  });

  it('lista vazia devolve vazio, não explode', () => {
    expect(agregarConsumo([], PLANOS)).toEqual({
      consumo: [], pessoasAtivas: {}, medidoDesde: null,
    });
  });

  it('linha sem usuário ou sem tipo é ignorada', () => {
    const { consumo } = agregarConsumo([
      linha({ usuario_id: null }),
      linha({ tipo: '' }),
      linha({ tokens_saida: 5 }),
    ], PLANOS);
    expect(consumo).toHaveLength(1);
    expect(consumo[0].tokensSaida).toBe(5);
  });

  it('valor negativo ou lixo não vira crédito', () => {
    // Token negativo reduziria o total e faria a conta parecer mais barata.
    const { consumo } = agregarConsumo([
      linha({ tokens_saida: -500 as unknown as number, tokens_entrada: NaN }),
      linha({ tokens_saida: 100 }),
    ], PLANOS);
    expect(consumo[0].tokensSaida).toBe(100);
    expect(consumo[0].tokensEntrada).toBe(0);
  });
});
