// supabase/functions/admin-custo/index.ts
// Devolve o consumo de IA medido e os precos declarados, para o Painel montar a
// auditoria de custo por plano (item 31 do roadmap).
//
// So super-admin chama, conferido no SERVIDOR pelo JWT, nunca pelo body. Le com
// service role porque `uso_ia` tem RLS de "cada um le o proprio" e `precos_ia` nao e
// legivel por ninguem do app — preco de custo nao e assunto de quem assina.
//
// Esta function SO LE. Nenhuma escrita, nenhuma chamada a modelo, nenhum custo.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { agregarConsumo, type LinhaUso } from '../_shared/agregarUso.ts';

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

/**
 * Quantos dias a janela cobre, no maximo.
 *
 * O teto e do SERVIDOR: um pedido de dez anos varreria a tabela inteira, e a
 * consulta viraria o problema que ela deveria medir.
 */
const DIAS_MAXIMO = 365;
const DIAS_PADRAO = 30;

/** 'YYYY-MM-DD' do dia que fica N dias atras, em UTC como o resto do contador. */
function diasAtras(dias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return resposta({ erro: 'Método não permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return resposta({ erro: 'Configuração indisponível' }, 503);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // 1) Autorizacao pelo JWT do request.
  const authorization = request.headers.get('Authorization') ?? '';
  const jwt = authorization.replace(/^Bearer\s+/i, '');
  if (!jwt) return resposta({ erro: 'Sem sessão' }, 401);
  const { data: auth, error: erroAuth } = await supabaseAdmin.auth.getUser(jwt);
  if (erroAuth || !auth?.user) return resposta({ erro: 'Sem sessão' }, 401);
  const { data: solicitante, error: erroSolicitante } = await supabaseAdmin
    .from('perfis').select('is_super_admin').eq('id', auth.user.id).maybeSingle();
  if (erroSolicitante) {
    console.error('falha ao ler perfil do solicitante', erroSolicitante.message);
    return resposta({ erro: 'Falha ao conferir o acesso' }, 502);
  }
  if (!solicitante?.is_super_admin) return resposta({ erro: 'Acesso negado' }, 403);

  // 2) A janela pedida, dentro do teto.
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Corpo vazio e pedido valido: vale o padrao.
  }
  const pedido = Number.isInteger(body.dias) ? (body.dias as number) : DIAS_PADRAO;
  const dias = Math.min(Math.max(pedido, 1), DIAS_MAXIMO);
  const desde = diasAtras(dias);

  // 3) O consumo medido no periodo.
  //
  // Traz `usuario_id` porque "quantas pessoas usaram" precisa de distintos, e isso
  // nao sai de uma soma. A janela limita o tamanho.
  //
  // O plano vem numa segunda consulta, e NAO por encaixe do PostgREST. A primeira
  // versao pedia `perfis!inner(plano)` e falhava: `uso_ia.usuario_id` referencia
  // `auth.users(id)`, nao `public.perfis(id)`, e sem chave estrangeira entre as duas
  // tabelas nao existe encaixe. O resultado era 502 e a tela dizendo "nao foi
  // possivel carregar o custo".
  const { data: linhas, error: erroUso } = await supabaseAdmin
    .from('uso_ia')
    .select('usuario_id, dia, tipo, quantidade, tokens_entrada, tokens_saida, caracteres')
    .gte('dia', desde);
  if (erroUso) {
    console.error('falha ao ler uso_ia', erroUso.message);
    return resposta({ erro: 'Falha ao ler o consumo' }, 502);
  }

  // O plano de quem aparece no periodo, em blocos.
  //
  // Em blocos porque `in(...)` monta a lista dentro da URL, e uma janela de um ano
  // com muita gente estouraria o tamanho — falha que apareceria so quando a base
  // crescesse, que e o pior momento para descobrir.
  const usuarios = [...new Set((linhas ?? [])
    .map((l) => String((l as { usuario_id?: string }).usuario_id ?? ''))
    .filter(Boolean))];
  const planoPorUsuario: Record<string, string> = {};
  const BLOCO = 200;
  for (let i = 0; i < usuarios.length; i += BLOCO) {
    const { data: perfis, error } = await supabaseAdmin
      .from('perfis').select('id, plano').in('id', usuarios.slice(i, i + BLOCO));
    if (error) {
      console.error('falha ao ler plano dos perfis', error.message);
      return resposta({ erro: 'Falha ao ler os planos' }, 502);
    }
    for (const p of perfis ?? []) {
      const linha = p as { id?: string; plano?: string };
      if (linha.id) planoPorUsuario[linha.id] = String(linha.plano ?? '');
    }
  }

  // A agregacao mora em `_shared/agregarUso.ts`, pura e com teste no Jest do app.
  // Aqui dentro ela seria intestavel: esta function roda no Deno, fora do tsc e fora
  // da suite — foi assim que o encaixe inexistente do PostgREST passou.
  const { consumo, pessoasAtivas, medidoDesde } = agregarConsumo(
    (linhas ?? []) as LinhaUso[],
    planoPorUsuario,
  );

  // 4) Assinantes de cada plano, usem IA ou nao — o denominador que responde "o
  //    plano se paga?". Contagem por cabeca, sem trazer linha de ninguem.
  const assinantes: Record<string, number> = {};
  for (const plano of ['gratuito', 'iniciante', 'explorador', 'mestre']) {
    const { count, error } = await supabaseAdmin
      .from('perfis').select('id', { count: 'exact', head: true }).eq('plano', plano);
    if (error) {
      console.error('falha ao contar assinantes', plano, error.message);
      return resposta({ erro: 'Falha ao contar assinantes' }, 502);
    }
    assinantes[plano] = count ?? 0;
  }

  // 5) Os precos declarados, com a data em que foram confirmados.
  const { data: precos, error: erroPrecos } = await supabaseAdmin
    .from('precos_ia').select('chave, descricao, dolar_por_milhao, confirmado_em, fonte');
  if (erroPrecos) {
    console.error('falha ao ler precos_ia', erroPrecos.message);
    return resposta({ erro: 'Falha ao ler os preços' }, 502);
  }

  return resposta({
    desde,
    dias,
    medidoDesde,
    consumo,
    pessoasAtivas,
    assinantes,
    precos: precos ?? [],
  });
});
