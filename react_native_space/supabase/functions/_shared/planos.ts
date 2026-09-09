// supabase/functions/_shared/planos.ts
export const PLANO_IDS = ['iniciante', 'explorador', 'mestre'] as const;
export type PlanoId = (typeof PLANO_IDS)[number];

/** Nome do Product na Stripe (criado pelo painel de planos). */
export const NOMES_PLANOS: Record<PlanoId, string> = {
  iniciante: 'Arcanus Iniciante',
  explorador: 'Arcanus Explorador',
  mestre: 'Arcanus Mestre',
};

export const MOEDAS = ['brl', 'usd', 'eur', 'cad'] as const;
export type Moeda = (typeof MOEDAS)[number];

export function ehPlanoValido(v: unknown): v is PlanoId {
  return typeof v === 'string' && (PLANO_IDS as readonly string[]).includes(v);
}
