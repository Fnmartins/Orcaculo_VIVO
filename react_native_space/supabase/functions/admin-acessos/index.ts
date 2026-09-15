// supabase/functions/admin-acessos/index.ts
// Lista usuários e dá/tira super-admin. Só super-admin chama (conferido no
// servidor, nunca pelo body). Grava com service role: o cliente não tem
// permissão de UPDATE em role/is_super_admin (supabase/painel-seguranca-perfis.sql).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { validarMudancaAdmin } from '../_shared/regras-acessos.ts';

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUNAS = 'id, nome, email, criado_em, plano, is_super_admin';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return resposta({ erro: 'Método não permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return resposta({ erro: 'Configuração indisponível' }, 503);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // 1) Autorização pelo JWT do request.
  const authorization = request.headers.get('Authorization') ?? '';
  const jwt = authorization.replace(/^Bearer\s+/i, '');
  if (!jwt) return resposta({ erro: 'Sem sessão' }, 401);
  const { data: auth, error: erroAuth } = await supabaseAdmin.auth.getUser(jwt);
  if (erroAuth || !auth?.user) return resposta({ erro: 'Sem sessão' }, 401);
  const solicitanteId = auth.user.id;
  const { data: solicitante } = await supabaseAdmin
    .from('perfis').select('is_super_admin').eq('id', solicitanteId).maybeSingle();
  if (!solicitante?.is_super_admin) return resposta({ erro: 'Acesso negado' }, 403);

  // 2) Corpo.
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return resposta({ erro: 'JSON inválido' }, 400);
  }
  const { acao, usuarioId, admin } = body;

  if (acao === 'listar') {
    const { data, error } = await supabaseAdmin
      .from('perfis').select(COLUNAS).order('criado_em', { ascending: false });
    if (error) {
      console.error('falha ao listar perfis', error.message);
      return resposta({ erro: 'Falha ao listar usuários' }, 502);
    }
    return resposta({ usuarios: data ?? [] });
  }

  if (acao === 'definir-admin') {
    if (typeof usuarioId !== 'string' || !UUID.test(usuarioId)) {
      return resposta({ erro: 'usuarioId inválido' }, 400);
    }
    if (typeof admin !== 'boolean') return resposta({ erro: 'admin inválido' }, 400);

    const { data: alvo, error: erroAlvo } = await supabaseAdmin
      .from('perfis').select('id, is_super_admin').eq('id', usuarioId).maybeSingle();
    if (erroAlvo) {
      console.error('falha ao ler perfil alvo', erroAlvo.message);
      return resposta({ erro: 'Falha ao ler o usuário' }, 502);
    }
    if (!alvo) return resposta({ erro: 'Usuário não encontrado' }, 404);

    const { count, error: erroContagem } = await supabaseAdmin
      .from('perfis').select('id', { count: 'exact', head: true }).eq('is_super_admin', true);
    if (erroContagem || count === null) {
      console.error('falha ao contar admins', erroContagem?.message);
      return resposta({ erro: 'Falha ao conferir os admins' }, 502);
    }

    const validacao = validarMudancaAdmin({
      solicitanteId,
      alvoId: usuarioId,
      tornarAdmin: admin,
      alvoEhAdmin: alvo.is_super_admin === true,
      totalAdmins: count,
    });
    if (!validacao.ok) return resposta({ erro: validacao.erro }, 409);

    const campos = admin
      ? { role: 'super_admin', is_super_admin: true }
      : { role: 'usuario', is_super_admin: false, permissions: [] as string[] };
    const { data: salvo, error: erroSalvar } = await supabaseAdmin
      .from('perfis').update(campos).eq('id', usuarioId).select(COLUNAS).single();
    if (erroSalvar) {
      console.error('falha ao gravar papel', erroSalvar.message);
      return resposta({ erro: 'Falha ao salvar' }, 502);
    }
    return resposta({ usuario: salvo });
  }

  return resposta({ erro: 'acao inválida' }, 400);
});
