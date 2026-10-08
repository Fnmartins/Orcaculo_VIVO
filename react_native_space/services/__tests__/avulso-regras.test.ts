import {
  decidirCobranca, type EstadoDeCobranca,
} from '../../supabase/functions/_shared/avulso-regras';

/**
 * A precedência é dinheiro: descontar do avulso enquanto a cota do mês sobra
 * queima o que a pessoa pagou à parte. E liberar sem ter de onde descontar dá
 * leitura paga de graça. As duas falhas são silenciosas.
 *
 * Testada daqui porque a function roda no Deno — fora do `tsc` e fora do Jest.
 */
const estado = (campos: Partial<EstadoDeCobranca> = {}): EstadoDeCobranca => ({
  semLimite: false, restantesDoPlano: 0, temCreditoAvulso: false, ...campos,
});

describe('decidirCobranca', () => {
  it('quem tem cota do plano gasta a cota, mesmo tendo avulso guardado', () => {
    const d = decidirCobranca(estado({ restantesDoPlano: 3, temCreditoAvulso: true }));
    expect(d).toEqual({ permitido: true, fonte: 'plano' });
  });

  it('sem cota e com avulso, gasta o avulso', () => {
    const d = decidirCobranca(estado({ restantesDoPlano: 0, temCreditoAvulso: true }));
    expect(d).toEqual({ permitido: true, fonte: 'avulso' });
  });

  it('sem cota e sem avulso, barra', () => {
    expect(decidirCobranca(estado())).toEqual({ permitido: false, fonte: 'sem_acesso' });
  });

  it('quem é isento não gasta nada de ninguém', () => {
    // `semLimite` é admin e testador. Descontar deles sujaria a medição de custo
    // com consumo que não é de cliente.
    const d = decidirCobranca(estado({ semLimite: true, temCreditoAvulso: true }));
    expect(d).toEqual({ permitido: true, fonte: 'isento' });
  });

  it('cota negativa cai no avulso, e não vira crédito infinito', () => {
    // Defeito possível no banco: decremento concorrente deixando -1. Com
    // `restantes > 0` o caminho é o avulso, que é o certo; com `>= 0` seria
    // leitura de graça para sempre.
    const d = decidirCobranca(estado({ restantesDoPlano: -1, temCreditoAvulso: true }));
    expect(d).toEqual({ permitido: true, fonte: 'avulso' });
  });
});
