// services/stripe.ts
import { supabase } from './supabase';

export * from './stripe-planos';
import type { PlanoIdStripe, MoedaSuportada } from './stripe-planos';

// supabase-js seta `error` (e data=null) em qualquer resposta não-2xx da
// função. A mensagem específica do servidor (ex.: "Plano inválido") fica no
// corpo JSON, acessível via error.context (um Response). Extrai `erro` dali.
async function erroDoServidor(error: unknown): Promise<string | undefined> {
  try {
    const contexto = (error as { context?: unknown })?.context;
    if (contexto && typeof (contexto as Response).json === 'function') {
      const corpo = await (contexto as Response).json();
      const erro = (corpo as { erro?: unknown })?.erro;
      if (typeof erro === 'string' && erro.trim()) return erro;
    }
  } catch {
    // corpo não-JSON ou já consumido → cai no fallback genérico.
  }
  return undefined;
}

export async function criarCheckout(
  planoId: PlanoIdStripe,
  moeda: MoedaSuportada,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('criar-checkout-stripe', {
    body: { planoId, moeda },
  });
  if (error) {
    throw new Error(await erroDoServidor(error) ?? 'Pagamento temporariamente indisponível. Tente novamente.');
  }
  if (!data?.checkoutUrl) {
    throw new Error(data?.erro ?? 'Resposta inválida do serviço de pagamento.');
  }
  return data.checkoutUrl as string;
}

export async function abrirPortalAssinatura(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('criar-portal-stripe', {
    body: {},
  });
  if (error) {
    throw new Error(await erroDoServidor(error) ?? 'Não foi possível abrir o gerenciamento da assinatura.');
  }
  if (!data?.portalUrl) {
    throw new Error(data?.erro ?? 'Resposta inválida do serviço.');
  }
  return data.portalUrl as string;
}
