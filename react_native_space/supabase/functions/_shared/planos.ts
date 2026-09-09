// supabase/functions/_shared/planos.ts
export type PlanoId = 'iniciante' | 'explorador' | 'mestre';

export interface PlanoServidor {
  /** Nome da env var (secret) que guarda o Price ID recorrente multi-moeda. */
  priceEnv: string;
  /** consultas_restantes ao ativar/renovar. */
  cotaConsultas: number;
}

export const PLANOS: Record<PlanoId, PlanoServidor> = {
  iniciante:  { priceEnv: 'STRIPE_PRICE_INICIANTE',  cotaConsultas: 4 },
  explorador: { priceEnv: 'STRIPE_PRICE_EXPLORADOR', cotaConsultas: 999 },
  mestre:     { priceEnv: 'STRIPE_PRICE_MESTRE',     cotaConsultas: 999 },
};

export const MOEDAS: readonly string[] = ['brl', 'usd', 'eur', 'cad'];
