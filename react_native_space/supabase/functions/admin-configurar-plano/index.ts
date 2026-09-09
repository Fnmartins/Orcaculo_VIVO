// supabase/functions/admin-configurar-plano/index.ts
import Stripe from 'npm:stripe@^17';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { NOMES_PLANOS, MOEDAS, ehPlanoValido, type Moeda } from '../_shared/planos.ts';
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

  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secretKey || !supabaseUrl || !serviceRoleKey) {
    return resposta({ erro: 'Configuração indisponível' }, 503);
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // 1) Autorização pelo JWT do request (nunca pelo body).
  const authorization = request.headers.get('Authorization') ?? '';
  const jwt = authorization.replace(/^Bearer\s+/i, '');
  if (!jwt) return resposta({ erro: 'Sem sessão' }, 401);
  const { data: auth, error: erroAuth } = await supabaseAdmin.auth.getUser(jwt);
  if (erroAuth || !auth?.user) return resposta({ erro: 'Sem sessão' }, 401);
  const userId = auth.user.id;
  const { data: perfil } = await supabaseAdmin
    .from('perfis').select('is_super_admin').eq('id', userId).maybeSingle();
  if (!perfil?.is_super_admin) return resposta({ erro: 'Acesso negado' }, 403);

  // 2) Validar input.
  let body: { planoId?: unknown; cotaConsultas?: unknown; precos?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return resposta({ erro: 'JSON inválido' }, 400);
  }
  if (!ehPlanoValido(body.planoId)) return resposta({ erro: 'planoId inválido' }, 400);
  const planoId = body.planoId;
  const cota = Number(body.cotaConsultas);
  if (!Number.isInteger(cota) || cota <= 0) return resposta({ erro: 'cotaConsultas inválida' }, 400);
  const precos = body.precos ?? {};
  const valores = {} as Record<Moeda, number>;
  for (const m of MOEDAS) {
    const v = Number((precos as Record<string, unknown>)[m]);
    if (!Number.isInteger(v) || v <= 0) return resposta({ erro: `preço ${m} inválido` }, 400);
    valores[m] = v;
  }

  // 3) No-op guard: cota + 4 preços iguais e já existe price → não cria Price duplicado.
  const atual = await lerConfigPlano(supabaseAdmin, planoId);
  const inalterado = atual && atual.stripe_price_id &&
    atual.cota_consultas === cota &&
    atual.preco_brl === valores.brl && atual.preco_usd === valores.usd &&
    atual.preco_eur === valores.eur && atual.preco_cad === valores.cad;
  if (inalterado) return resposta({ plano: atual });

  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-09-30.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    // 4) Product (cria se faltar).
    let productId = atual?.stripe_product_id ?? null;
    if (!productId) {
      const prod = await stripe.products.create({ name: NOMES_PLANOS[planoId] });
      productId = prod.id;
    }
    // 5) Price novo com currency_options das 4 moedas (base = brl).
    const price = await stripe.prices.create({
      product: productId,
      currency: 'brl',
      unit_amount: valores.brl,
      recurring: { interval: 'month' },
      currency_options: {
        usd: { unit_amount: valores.usd },
        eur: { unit_amount: valores.eur },
        cad: { unit_amount: valores.cad },
      },
    });
    // 6) Gravar no banco ANTES de arquivar o antigo.
    const { data: salvo, error: upErr } = await supabaseAdmin
      .from('config_planos')
      .update({
        cota_consultas: cota,
        preco_brl: valores.brl,
        preco_usd: valores.usd,
        preco_eur: valores.eur,
        preco_cad: valores.cad,
        stripe_product_id: productId,
        stripe_price_id: price.id,
        atualizado_em: new Date().toISOString(),
        atualizado_por: userId,
      })
      .eq('id', planoId)
      .select()
      .single();
    if (upErr) {
      console.error('falha ao gravar config_planos', upErr.message ?? upErr);
      return resposta({ erro: 'Falha ao salvar no banco' }, 502);
    }
    // 7) Arquivar o Price antigo (falha aqui não derruba a resposta).
    if (atual?.stripe_price_id) {
      try {
        await stripe.prices.update(atual.stripe_price_id, { active: false });
      } catch (e) {
        console.error('falha ao arquivar price antigo', e instanceof Error ? e.message : e);
      }
    }
    return resposta({ plano: salvo });
  } catch (e) {
    console.error('falha na Stripe', e instanceof Error ? e.message : e);
    return resposta({ erro: 'Falha ao configurar o plano na Stripe' }, 502);
  }
});
