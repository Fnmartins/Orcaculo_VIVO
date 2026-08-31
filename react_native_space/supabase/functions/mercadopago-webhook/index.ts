import { createClient } from 'npm:@supabase/supabase-js@2';

const MP_API = 'https://api.mercadopago.com';
const VALORES: Record<string, number> = { iniciante: 29.9, explorador: 79.9, mestre: 199.9 };
const CONSULTAS: Record<string, number> = { iniciante: 4, explorador: 999, mestre: 999 };

function resposta(status = 200) {
  return new Response(JSON.stringify({ recebido: true }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return resposta(405);

  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({})) as { data?: { id?: string | number } };
    const paymentId = String(body.data?.id ?? url.searchParams.get('data.id') ?? '');
    if (!paymentId) return resposta(400);

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!accessToken || !supabaseUrl || !serviceRoleKey) return resposta(503);

    // Nunca confia no payload do webhook: consulta o pagamento na origem.
    const respostaMp = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!respostaMp.ok) return resposta(502);

    const pagamento = await respostaMp.json() as {
      id?: string | number;
      status?: string;
      transaction_amount?: number;
      metadata?: { usuario_id?: string; plano_id?: string; assinatura_id?: string };
    };
    if (pagamento.status !== 'approved') return resposta();

    const usuarioId = pagamento.metadata?.usuario_id;
    const planoId = pagamento.metadata?.plano_id;
    const assinaturaId = pagamento.metadata?.assinatura_id;
    const valorEsperado = planoId ? VALORES[planoId] : undefined;
    if (!usuarioId || !planoId || !assinaturaId || valorEsperado === undefined || Number(pagamento.transaction_amount) !== valorEsperado) {
      console.error('Pagamento aprovado com metadados ou valor inválido', paymentId);
      return resposta(400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const agora = new Date();
    const expiracao = new Date(agora);
    expiracao.setMonth(expiracao.getMonth() + 1);

    const { data: assinatura, error: erroBusca } = await supabaseAdmin
      .from('assinaturas')
      .select('id, status, expira_em')
      .eq('id', assinaturaId)
      .eq('usuario_id', usuarioId)
      .eq('plano', planoId)
      .eq('valor', valorEsperado)
      .maybeSingle();
    if (erroBusca || !assinatura) return resposta(409);

    if (assinatura.status !== 'ativo') {
      const { error: erroAssinatura } = await supabaseAdmin
        .from('assinaturas')
        .update({
          status: 'ativo',
          mp_payment_id: String(pagamento.id),
          inicio_em: agora.toISOString(),
          expira_em: expiracao.toISOString(),
        })
        .eq('id', assinatura.id)
        .eq('status', 'pendente');
      if (erroAssinatura) return resposta(500);

    }

    // Executado também em retries para reparar uma eventual falha parcial anterior.
    const validade = assinatura.status === 'ativo' && assinatura.expira_em
      ? assinatura.expira_em
      : expiracao.toISOString();
    const { error: erroPerfil } = await supabaseAdmin
      .from('perfis')
      .update({
        plano: planoId,
        plano_valido_ate: validade,
        consultas_restantes: CONSULTAS[planoId] ?? 1,
      })
      .eq('id', usuarioId);
    if (erroPerfil) return resposta(500);

    return resposta();
  } catch (erro) {
    console.error('Erro no webhook Mercado Pago', erro instanceof Error ? erro.message : erro);
    return resposta(500);
  }
});
