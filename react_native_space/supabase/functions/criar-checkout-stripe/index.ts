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

    // Comecar uma compra nova abandona as pendentes anteriores desta pessoa.
    //
    // Sem isto, cada checkout desistido deixava uma linha `pendente` para sempre:
    // ninguem le, ninguem limpa, e a auditoria de custo por plano conta compra que
    // nunca houve. Marcar aqui mantem o limite em UMA pendente aberta por pessoa,
    // sem varredura agendada e sem apagar historico.
    //
    // Nao bloqueia: e arrumacao, nao a transacao. Se falhar, registra e segue — e
    // o pagamento por uma sessao antiga ainda encontra a linha, porque o webhook
    // aceita `abandonado` ao ativar.
    const arrumacao = await supabaseAdmin.from('assinaturas')
      .update({ status: 'abandonado' })
      .eq('usuario_id', usuario.id)
      .eq('status', 'pendente')
      .select('id');
    if (arrumacao.error) {
      console.error('Falha ao abandonar pendentes anteriores',
        { usuario: usuario.id, erro: arrumacao.error.message });
    }

    // A linha pendente e o que o webhook procura pela sessao para virar "ativo".
    // Sem ela o webhook registra "Assinatura sem linha para atualizar" e o ledger
    // fica sem historico daquela compra. Tambem era ignorado aqui.
    //
    // Falhar agora e barato: a pessoa ainda NAO foi para a Stripe, e tentar de
    // novo cria outra sessao. Falhar depois seria pagar sem registro.
    const pendente = await supabaseAdmin.from('assinaturas').insert({
      id: crypto.randomUUID(),
      usuario_id: usuario.id,
      plano: planoId,
      status: 'pendente',
      periodo: 'mensal',
      moeda: moedaFinal,
      stripe_customer_id: customerId,
      stripe_checkout_session_id: session.id,
    }).select('id');
    if (pendente.error) {
      console.error('Falha ao registrar a assinatura pendente',
        { usuario: usuario.id, sessao: session.id, erro: pendente.error.message });
      return resposta({ erro: 'Não foi possível iniciar o pagamento agora. Tente de novo.' }, 503);
    }

    return resposta({ checkoutUrl: session.url });
  } catch (erro) {
    console.error('Erro ao criar checkout', erro instanceof Error ? erro.message : erro);
    return resposta({ erro: 'Não foi possível iniciar o pagamento' }, 500);
  }
});
