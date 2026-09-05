// supabase/functions/criar-portal-stripe/index.ts
import Stripe from 'npm:stripe@^17';
import { createClient } from 'npm:@supabase/supabase-js@2';

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
      return resposta({ erro: 'Serviço temporariamente indisponível' }, 503);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const jwt = authorization.replace(/^Bearer\s+/i, '');
    const { data: auth, error: erroAuth } = await supabaseAdmin.auth.getUser(jwt);
    if (erroAuth || !auth.user) return resposta({ erro: 'Sessão inválida ou expirada' }, 401);

    const { data: perfil } = await supabaseAdmin
      .from('perfis').select('stripe_customer_id').eq('id', auth.user.id).maybeSingle();
    const customerId = perfil?.stripe_customer_id as string | undefined;
    if (!customerId) return resposta({ erro: 'Nenhuma assinatura encontrada' }, 400);

    const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appBaseUrl}/planos`,
    });

    return resposta({ portalUrl: session.url });
  } catch (erro) {
    console.error('Erro ao criar portal', erro instanceof Error ? erro.message : erro);
    return resposta({ erro: 'Não foi possível abrir o gerenciamento' }, 500);
  }
});
