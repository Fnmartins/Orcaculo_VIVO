// supabase/functions/_shared/avulso-regras.ts
//
// De onde descontar uma leitura: da cota do plano, de um crédito avulso, ou de
// lugar nenhum.
//
// Pura e sem dependência, para o Jest do app poder testá-la — as functions
// rodam no Deno, fora do `tsc` e fora da suíte. Mesmo motivo de `limites.ts`.

export type FonteDoDesconto = 'isento' | 'plano' | 'avulso' | 'sem_acesso';

export interface EstadoDeCobranca {
  /** Admin e testador: têm acesso e não descontam de nada. */
  semLimite: boolean;
  /** Consultas que sobram no plano. Valor negativo conta como zero. */
  restantesDoPlano: number;
  /** Há crédito avulso não usado e não vencido PARA ESTE oráculo. */
  temCreditoAvulso: boolean;
}

export interface DecisaoDeCobranca {
  permitido: boolean;
  fonte: FonteDoDesconto;
}

/**
 * A ordem importa e é dinheiro.
 *
 * Cota do plano primeiro: o avulso comprado fica guardado para quando ela
 * acabar. O contrário faria o assinante queimar o que pagou à parte enquanto a
 * cota do mês sobrava — e ele não teria como perceber.
 */
export function decidirCobranca(estado: EstadoDeCobranca): DecisaoDeCobranca {
  if (estado.semLimite) return { permitido: true, fonte: 'isento' };
  if (estado.restantesDoPlano > 0) return { permitido: true, fonte: 'plano' };
  if (estado.temCreditoAvulso) return { permitido: true, fonte: 'avulso' };
  return { permitido: false, fonte: 'sem_acesso' };
}
