// services/stripe.ts
import { supabase } from './supabase';

export * from './stripe-planos';
import type { PlanoIdStripe, MoedaSuportada } from './stripe-planos';

export async function criarCheckout(
  planoId: PlanoIdStripe,
  moeda: MoedaSuportada,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('criar-checkout-stripe', {
    body: { planoId, moeda },
  });
  if (error) throw new Error('Pagamento temporariamente indisponível. Tente novamente.');
  if (!data?.checkoutUrl) {
    throw new Error(data?.erro ?? 'Resposta inválida do serviço de pagamento.');
  }
  return data.checkoutUrl as string;
}

export async function abrirPortalAssinatura(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('criar-portal-stripe', {
    body: {},
  });
  if (error) throw new Error('Não foi possível abrir o gerenciamento da assinatura.');
  if (!data?.portalUrl) {
    throw new Error(data?.erro ?? 'Resposta inválida do serviço.');
  }
  return data.portalUrl as string;
}
