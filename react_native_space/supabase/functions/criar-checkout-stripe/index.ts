// supabase/functions/criar-checkout-stripe/index.ts
import Stripe from 'npm:stripe@^17';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { ehMoedaValida, ehPlanoValido, type PlanoId } from '../_shared/planos.ts';
import { lerConfigPlano } from '../_shared/config-planos.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function resposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return resposta({ erro: 'Método não permitido' }, 405);

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return resposta({ erro: 'Autenticação necessária' }, 401);

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL');
    if (!secretKey || !supabaseUrl || !serviceRoleKey || !appBaseUrl) {
      return resposta({ erro: 'Pagamento temporariamente indisponível' }, 503);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const jwt = authorization.replace(/^Bearer\s+/i, '');
    const { data: auth, error: erroAuth } = await supabaseAdmin.auth.getUser(jwt);
    if (erroAuth || !auth.user) return resposta({ erro: 'Sessão inválida ou expirada' }, 401);
    const usuario = auth.user;

    const { planoId, moeda } = await request.json() as { planoId?: PlanoId; moeda?: string };
    if (!ehPlanoValido(planoId)) return resposta({ erro: 'Plano inválido' }, 400);
    const moedaFinal = (moeda ?? 'brl').toLowerCase();
    if (!ehMoedaValida(moedaFinal)) return resposta({ erro: 'Moeda inválida' }, 400);

    const cfg = await lerConfigPlano(supabaseAdmin, planoId);
    const priceId = cfg?.stripe_price_id ?? null;
    if (!priceId) return resposta({ erro: 'Pagamento temporariamente indisponível' }, 503);

    const stripe = new Stripe(secretKey, { apiVersion: '2024-09-30.acacia', httpClient: Stripe.createFetchHttpClient() });

    // Customer: reutiliza o salvo em perfis, senão cria e persiste.
    const { data: perfil } = await supabaseAdmin
      .from('perfis').select('stripe_customer_id').eq('id', usuario.id).maybeSingle();
    let customerId = perfil?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: usuario.email ?? undefined,
        metadata: { supabase_user_id: usuario.id },
      });
      customerId = customer.id;
      await supabaseAdmin.from('perfis')
        .update({ stripe_customer_id: customerId }).eq('id', usuario.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      currency: moedaFinal,
      client_reference_id: usuario.id,
      metadata: { usuario_id: usuario.id, plano_id: planoId },
      subscription_data: { metadata: { usuario_id: usuario.id, plano_id: planoId } },
      success_url: `${appBaseUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/planos`,
      allow_promotion_codes: true,
    });

    await supabaseAdmin.from('assinaturas').insert({
      id: crypto.randomUUID(),
      usuario_id: usuario.id,
      plano: planoId,
      status: 'pendente',
      periodo: 'mensal',
      moeda: moedaFinal,
      stripe_customer_id: customerId,
      stripe_checkout_session_id: session.id,
    });

    return resposta({ checkoutUrl: session.url });
  } catch (erro) {
    console.error('Erro ao criar checkout', erro instanceof Error ? erro.message : erro);
    return resposta({ erro: 'Não foi possível iniciar o pagamento' }, 500);
  }
});
