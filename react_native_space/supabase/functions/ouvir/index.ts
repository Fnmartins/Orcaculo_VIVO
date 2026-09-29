// supabase/functions/ouvir/index.ts
//
// Resolve o codigo curto de um audio compartilhado.
//
// **Esta function roda sem sessao**, e tem de rodar: quem recebe o link nao
// tem conta no Arcanus. Publicar com `--no-verify-jwt`.
//
// O que ela aceita e um codigo de oito caracteres, e so. Nao gera audio, nao
// gasta cota, nao chama o Google, nao diz de quem e a leitura. Devolve um
// endereco assinado de curta duracao para tocar, ou recusa.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function resposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const BUCKET = 'leituras-faladas';

/** Quanto tempo o link compartilhado vale, contado de quando foi criado. */
const VALIDADE_DIAS = 7;

/** Quanto tempo o endereco de tocar vale. Basta para ouvir. */
const VALIDADE_URL = 3600;

/**
 * Formato do codigo, conferido antes de ir ao banco.
 *
 * Nao e capricho: sem isto, qualquer texto vira uma consulta, e a function
 * publica vira um jeito barato de bater no banco em volume.
 */
const FORMATO_CODIGO = /^[23456789bcdfghjkmnpqrstvwxzBCDFGHJKMNPQRSTVWXZ]{8}$/;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return resposta({ erro: 'Método não permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return resposta({ erro: 'Serviço temporariamente indisponível' }, 503);
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return resposta({ erro: 'JSON inválido' }, 400);
  }

  const codigo = typeof body.codigo === 'string' ? body.codigo.trim() : '';
  if (!FORMATO_CODIGO.test(codigo)) {
    return resposta({ erro: 'Este link não é válido.' }, 400);
  }

  const { data: linha, error } = await supabaseAdmin
    .from('voz_cache').select('arquivo, compartilhado_em').eq('codigo', codigo).maybeSingle();
  if (error) {
    console.error('falha ao ler voz_cache', error.message);
    return resposta({ erro: 'Não foi possível abrir esta leitura agora.' }, 502);
  }

  // Codigo que nao existe e codigo expirado dao a MESMA resposta, de proposito:
  // respostas diferentes contariam a quem tentasse adivinhar que um codigo
  // existiu um dia.
  const criado = linha?.compartilhado_em ? Date.parse(linha.compartilhado_em) : NaN;
  const venceu = !Number.isFinite(criado)
    || Date.now() - criado > VALIDADE_DIAS * 24 * 3600 * 1000;

  if (!linha?.arquivo || venceu) {
    return resposta({ erro: 'Este link expirou. Peça um novo a quem enviou.' }, 404);
  }

  const { data: assinada, error: erroUrl } = await supabaseAdmin
    .storage.from(BUCKET).createSignedUrl(linha.arquivo, VALIDADE_URL);
  if (erroUrl || !assinada?.signedUrl) {
    console.error('falha ao assinar url', erroUrl?.message);
    return resposta({ erro: 'Não foi possível abrir esta leitura agora.' }, 502);
  }

  return resposta({ url: assinada.signedUrl });
});
