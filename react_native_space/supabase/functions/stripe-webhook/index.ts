// supabase/functions/stripe-webhook/index.ts
import Stripe from 'npm:stripe@^17';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { PLANOS, type PlanoId } from '../_shared/planos.ts';

function resposta(status = 200) {
  return new Response(JSON.stringify({ recebido: true }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function ativarPlano(
  supabaseAdmin: SupabaseClient,
  usuarioId: string,
  planoId: PlanoId,
  sub: Stripe.Subscription,
  customerId: string,
) {
  const fimPeriodo = new Date(sub.current_period_end * 1000).toISOString();
  const inicio = new Date(sub.current_period_start * 1000).toISOString();

  await supabaseAdmin.from('assinaturas')
    .update({
      status: 'ativo',
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      inicio_em: inicio,
      expira_em: fimPeriodo,
    })
    .eq('usuario_id', usuarioId)
    .in('status', ['pendente', 'ativo']);

  await supabaseAdmin.from('perfis')
    .update({
      plano: planoId,
      plano_valido_ate: fimPeriodo,
      consultas_restantes: PLANOS[planoId].cotaConsultas,
    })
    .eq('id', usuarioId);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return resposta(405);

  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) return resposta(503);

  const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const assinatura = request.headers.get('stripe-signature');
  if (!assinatura) return resposta(400);
  const corpo = await request.text();

  let evento: Stripe.Event;
  try {
    evento = await stripe.webhooks.constructEventAsync(
      corpo, assinatura, webhookSecret, undefined, Stripe.createSubtleCryptoProvider(),
    );
  } catch (erro) {
    console.error('Assinatura de webhook inválida', erro instanceof Error ? erro.message : erro);
    return resposta(400);
  }

  // Dedupe idempotente: se o event.id já existe, já foi processado.
  const { error: erroDedupe } = await supabaseAdmin
    .from('webhook_eventos').insert({ id: evento.id });
  if (erroDedupe) return resposta();

  try {
    switch (evento.type) {
      case 'checkout.session.completed': {
        const session = evento.data.object as Stripe.Checkout.Session;
        const usuarioId = session.metadata?.usuario_id;
        const planoId = session.metadata?.plano_id as PlanoId | undefined;
        if (!usuarioId || !planoId || !(planoId in PLANOS) || !session.subscription) {
          return resposta(400);
        }
        const sub = await stripe.subscriptions.retrieve(String(session.subscription));
        await ativarPlano(supabaseAdmin, usuarioId, planoId, sub, String(session.customer));
        break;
      }
      case 'invoice.paid': {
        const invoice = evento.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;
        const sub = await stripe.subscriptions.retrieve(String(invoice.subscription));
        const usuarioId = sub.metadata?.usuario_id;
        const planoId = sub.metadata?.plano_id as PlanoId | undefined;
        if (!usuarioId || !planoId || !(planoId in PLANOS)) break;
        await ativarPlano(supabaseAdmin, usuarioId, planoId, sub, String(sub.customer));
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = evento.data.object as Stripe.Subscription;
        const usuarioId = sub.metadata?.usuario_id;
        if (!usuarioId) break;
        await supabaseAdmin.from('perfis')
          .update({ plano: 'gratuito', consultas_restantes: 0 }).eq('id', usuarioId);
        await supabaseAdmin.from('assinaturas')
          .update({ status: 'cancelado' }).eq('stripe_subscription_id', sub.id);
        break;
      }
      default:
        break;
    }
    return resposta();
  } catch (erro) {
    console.error('Erro ao processar webhook', evento.type,
      erro instanceof Error ? erro.message : erro);
    // libera o dedupe pra a Stripe reprocessar no retry.
    await supabaseAdmin.from('webhook_eventos').delete().eq('id', evento.id);
    return resposta(500);
  }
});
