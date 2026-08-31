import { createClient } from 'npm:@supabase/supabase-js@2';

const MP_API = 'https://api.mercadopago.com';

const PLANOS = {
  iniciante: { titulo: 'Plano Iniciante', descricao: '4 leituras por mês + acesso a todos os oráculos', valor: 29.9 },
  explorador: { titulo: 'Plano Explorador', descricao: 'Leituras ilimitadas + análise por IA', valor: 79.9 },
  mestre: { titulo: 'Plano Mestre', descricao: 'Tudo + 1 consulta ao vivo por mês com oraculista', valor: 199.9 },
} as const;

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

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!accessToken || !supabaseUrl || !serviceRoleKey) {
      return resposta({ erro: 'Pagamento temporariamente indisponível' }, 503);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const jwt = authorization.replace(/^Bearer\s+/i, '');
    const { data: auth, error: erroAuth } = await supabaseAdmin.auth.getUser(jwt);
    if (erroAuth || !auth.user) return resposta({ erro: 'Sessão inválida ou expirada' }, 401);
    const usuario = auth.user;

    const { planoId } = await request.json() as { planoId?: keyof typeof PLANOS };
    const plano = planoId ? PLANOS[planoId] : undefined;
    if (!plano || !planoId) return resposta({ erro: 'Plano inválido' }, 400);

    const assinaturaId = crypto.randomUUID();
    const referencia = `${usuario.id}__${planoId}__${Date.now()}`;
    const { error: erroAssinatura } = await supabaseAdmin.from('assinaturas').insert({
      id: assinaturaId,
      usuario_id: usuario.id,
      plano: planoId,
      status: 'pendente',
      valor: plano.valor,
      periodo: 'mensal',
    });
    if (erroAssinatura) {
      console.error('Não foi possível registrar a assinatura pendente', erroAssinatura.message);
      return resposta({ erro: 'Não foi possível iniciar o pagamento' }, 500);
    }

    const respostaMp = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': referencia,
      },
      body: JSON.stringify({
        items: [{ id: planoId, title: plano.titulo, description: plano.descricao, quantity: 1, unit_price: plano.valor, currency_id: 'BRL' }],
        payer: usuario.email ? { email: usuario.email } : undefined,
        back_urls: {
          success: `oraculovivo://pagamento/sucesso?plano=${planoId}`,
          failure: 'oraculovivo://pagamento/falha',
          pending: 'oraculovivo://pagamento/pendente',
        },
        auto_return: 'approved',
        external_reference: referencia,
        metadata: { usuario_id: usuario.id, plano_id: planoId, assinatura_id: assinaturaId },
      }),
    });

    const data = await respostaMp.json();
    if (!respostaMp.ok) {
      console.error('Mercado Pago recusou a preferência', respostaMp.status);
      await supabaseAdmin.from('assinaturas').update({ status: 'cancelado' }).eq('id', assinaturaId);
      return resposta({ erro: 'Não foi possível iniciar o pagamento' }, 502);
    }

    const { error: erroPreferencia } = await supabaseAdmin
      .from('assinaturas')
      .update({ mp_preference_id: data.id })
      .eq('id', assinaturaId);
    if (erroPreferencia) {
      console.error('Não foi possível vincular a preferência', erroPreferencia.message);
      return resposta({ erro: 'Não foi possível iniciar o pagamento' }, 500);
    }

    return resposta({ preferenceId: data.id, checkoutUrl: data.init_point });
  } catch (erro) {
    console.error('Erro ao criar preferência', erro instanceof Error ? erro.message : erro);
    return resposta({ erro: 'Não foi possível iniciar o pagamento' }, 500);
  }
});
