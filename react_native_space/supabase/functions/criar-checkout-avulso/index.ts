// supabase/functions/criar-checkout-avulso/index.ts
import Stripe from 'npm:stripe@^17';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { ehMoedaValida } from '../_shared/planos.ts';

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

    // Dois produtos, e a lista é fechada aqui de propósito: um oráculo que
    // chegasse pelo corpo da requisição viraria venda de algo sem preço.
    const VENDAVEIS = ['mapa', 'vocacao'];

    const { oraculo, moeda } = await request.json() as { oraculo?: string; moeda?: string };
    if (typeof oraculo !== 'string' || !VENDAVEIS.includes(oraculo)) {
      return resposta({ erro: 'Produto inválido' }, 400);
    }
    const moedaFinal = (moeda ?? 'brl').toLowerCase();
    if (!ehMoedaValida(moedaFinal)) return resposta({ erro: 'Moeda inválida' }, 400);

    const { data: preco, error: erroPreco } = await supabaseAdmin
      .from('precos_avulsos')
      .select('stripe_price_id, ativo')
      .eq('oraculo', oraculo)
      .maybeSingle();
    if (erroPreco) {
      console.error('falha ao ler preco avulso', erroPreco.message);
      return resposta({ erro: 'Pagamento temporariamente indisponível' }, 503);
    }
    // Preço ausente e produto desativado dão a MESMA resposta de propósito: as
    // duas significam "não está à venda", e distinguir só ajudaria quem sonda.
    if (!preco?.stripe_price_id || preco.ativo !== true) {
      return resposta({ erro: 'Pagamento temporariamente indisponível' }, 503);
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-09-30.acacia', httpClient: Stripe.createFetchHttpClient() });

    // Customer: reutiliza o salvo em perfis, senao cria e persiste.
    //
    // Ler errado aqui custa caro: `perfil` nulo por FALHA de leitura e `perfil`
    // nulo por ainda nao haver cliente sao indistinguiveis, e o segundo caminho
    // cria um cliente novo na Stripe. Entao a falha de leitura para aqui.
    const { data: perfil, error: erroPerfil } = await supabaseAdmin
      .from('perfis').select('stripe_customer_id').eq('id', usuario.id).maybeSingle();
    if (erroPerfil) {
      console.error('Falha ao ler o cliente Stripe do perfil', erroPerfil.message);
      return resposta({ erro: 'Não foi possível iniciar o pagamento agora. Tente de novo.' }, 503);
    }

    let customerId = perfil?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: usuario.email ?? undefined,
        metadata: { supabase_user_id: usuario.id },
      // Chave de idempotencia amarrada a pessoa: se esta function falhar depois de
      // criar o cliente e a pessoa tentar de novo, a Stripe devolve O MESMO
      // cliente em vez de criar um segundo. E o que torna seguro abortar abaixo.
      }, { idempotencyKey: `customer:${usuario.id}` });
      customerId = customer.id;

      // Esta escrita era ignorada, e o preco dela e concreto: `criar-portal-
      // stripe` le `perfis.stripe_customer_id`, e sem ele o portal responde
      // "Nenhuma assinatura encontrada". A pessoa pagava e depois nao conseguia
      // gerenciar nem cancelar a propria assinatura — sem erro em lugar nenhum.
      //
      // Agora para ANTES de pagar. Nao ha perda: o cliente ja existe na Stripe, e a
      // chave de idempotencia garante que a proxima tentativa reaproveita ele.
      const gravado = await supabaseAdmin.from('perfis')
        .update({ stripe_customer_id: customerId }).eq('id', usuario.id).select('id');
      if (gravado.error) {
        console.error('Falha ao guardar o cliente Stripe no perfil',
          { usuario: usuario.id, customerId, erro: gravado.error.message });
        return resposta({ erro: 'Não foi possível iniciar o pagamento agora. Tente de novo.' }, 503);
      }
    }

    const session = await stripe.checkout.sessions.create({
      // `payment`, e não `subscription`: é uma compra, não uma assinatura. O
      // webhook ramifica por este campo.
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: preco.stripe_price_id, quantity: 1 }],
      currency: moedaFinal,
      client_reference_id: usuario.id,
      metadata: { usuario_id: usuario.id, oraculo, tipo: 'avulso' },
      success_url: `${appBaseUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/planos`,
      allow_promotion_codes: true,
    });

    // `checkoutUrl`, e não `url`: é o nome que `criar-checkout-stripe` já usa e
    // que `services/stripe.ts` lê. Duas functions que fazem a mesma coisa com
    // nomes diferentes fazem quem copiar o serviço existente falhar sem erro de
    // compilação — o campo simplesmente vem `undefined`.
    return resposta({ checkoutUrl: session.url });
  } catch (erro) {
    console.error('Erro ao criar checkout', erro instanceof Error ? erro.message : erro);
    return resposta({ erro: 'Não foi possível iniciar o pagamento' }, 500);
  }
});
