// supabase/functions/excluir-conta/index.ts
// Apaga a conta de quem chama. Só o service role pode remover usuário do auth,
// então isto não existe no app: a tela chamava um callback vazio e dizia que
// tinha apagado tudo (app/(tabs)/perfil.tsx, corrigido em 23/09).
//
// Quem é apagado sai do JWT, nunca do corpo do request: aceitar um id aqui
// transformaria esta função numa arma para apagar a conta alheia.
import Stripe from 'npm:stripe@^17';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { exigirEscrita } from '../_shared/escritas.ts';

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

/** O app manda esta palavra. Uma chamada acidental não apaga conta de ninguém. */
const CONFIRMACAO = 'EXCLUIR';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return resposta({ erro: 'Método não permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return resposta({ erro: 'Configuração indisponível' }, 503);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const authorization = request.headers.get('Authorization') ?? '';
  const jwt = authorization.replace(/^Bearer\s+/i, '');
  if (!jwt) return resposta({ erro: 'Sem sessão' }, 401);
  const { data: auth, error: erroAuth } = await supabaseAdmin.auth.getUser(jwt);
  if (erroAuth || !auth?.user) return resposta({ erro: 'Sessão inválida ou expirada' }, 401);
  const usuarioId = auth.user.id;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return resposta({ erro: 'JSON inválido' }, 400);
  }
  if (body.confirmacao !== CONFIRMACAO) return resposta({ erro: 'Confirmação ausente' }, 400);

  try {
    const { data: perfil, error: erroPerfil } = await supabaseAdmin
      .from('perfis').select('stripe_customer_id').eq('id', usuarioId).maybeSingle();
    if (erroPerfil) throw new Error(`perfis.select: ${erroPerfil.message}`);
    const customerId = perfil?.stripe_customer_id as string | undefined;

    // 1) Stripe primeiro: se a cobrança não parar, o resto não pode acontecer.
    // Cancelamento é imediato, não no fim do período — a conta deixa de existir
    // hoje, e cobrar por acesso que ninguém pode usar seria indefensável.
    // O cliente e as faturas ficam na Stripe: nota fiscal tem retenção própria.
    if (customerId) {
      const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!secretKey) return resposta({ erro: 'Serviço temporariamente indisponível' }, 503);
      const stripe = new Stripe(secretKey, {
        apiVersion: '2024-09-30.acacia',
        httpClient: Stripe.createFetchHttpClient(),
      });
      const assinaturas = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
      for (const assinatura of assinaturas.data) {
        if (assinatura.status === 'canceled' || assinatura.status === 'incomplete_expired') continue;
        await stripe.subscriptions.cancel(assinatura.id);
      }
    }

    // 2) Dados do app. Sem `select()`: não importa quantas linhas existiam,
    // importa que a remoção não falhe.
    exigirEscrita('consultas.delete',
      await supabaseAdmin.from('consultas').delete().eq('usuario_id', usuarioId));
    exigirEscrita('desejos.delete',
      await supabaseAdmin.from('desejos').delete().eq('usuario_id', usuarioId));
    exigirEscrita('assinaturas.delete',
      await supabaseAdmin.from('assinaturas').delete().eq('usuario_id', usuarioId));

    // 3) Avatar: o arquivo é `avatar_<id>.<ext>` na raiz do bucket, e a extensão
    // vem do que a pessoa enviou — podem existir sobras de envios anteriores.
    const { data: arquivos } = await supabaseAdmin.storage
      .from('avatars').list('', { search: `avatar_${usuarioId}` });
    const caminhos = (arquivos ?? []).map((a) => a.name);
    if (caminhos.length > 0) {
      const { error: erroStorage } = await supabaseAdmin.storage.from('avatars').remove(caminhos);
      if (erroStorage) throw new Error(`avatars.remove: ${erroStorage.message}`);
    }

    exigirEscrita('perfis.delete',
      await supabaseAdmin.from('perfis').delete().eq('id', usuarioId));

    // 4) Por último o usuário do auth: enquanto ele existe, dá para tentar de
    // novo. Se algum passo acima tivesse falhado, a pessoa ficaria sem login e
    // com dados espalhados, sem ninguém para reclamar.
    const { error: erroUsuario } = await supabaseAdmin.auth.admin.deleteUser(usuarioId);
    if (erroUsuario) throw new Error(`auth.deleteUser: ${erroUsuario.message}`);

    return resposta({ ok: true });
  } catch (erro) {
    console.error('falha ao excluir conta', erro instanceof Error ? erro.message : erro);
    return resposta({ erro: 'Não foi possível excluir a conta. Nada foi apagado pela metade — tente de novo.' }, 500);
  }
});
