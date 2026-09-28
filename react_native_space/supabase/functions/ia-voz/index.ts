// supabase/functions/ia-voz/index.ts
//
// A leitura falada, com a voz escolhida na decisão de 28/09:
// `pt-BR-Chirp3-HD-Sadaltager`, do Google Chirp 3 HD.
//
// Por que existe uma function em vez de o app chamar o Google direto: a chave.
// Chave no cliente vai para o bundle, e qualquer um extrai e gasta na conta do
// dono. Aqui ela fica em `supabase secrets` e nunca sai daqui.
//
// O áudio gerado é a leitura da pessoa falada em voz alta. Por isso o bucket é
// privado e o que volta para o app é URL assinada de curta duração — não o
// arquivo em endereço permanente.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { conferirUso, mensagemDoLimite, registrarUso } from '../_shared/uso.ts';

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

const VOZ = 'pt-BR-Chirp3-HD-Sadaltager';
const IDIOMA = 'pt-BR';
const BUCKET = 'leituras-faladas';

/**
 * O teto por leitura.
 *
 * Duas razões. A do Google: `text:synthesize` recusa acima de 5000 bytes, e
 * português com acento gasta mais de um byte por caractere. A nossa: Chirp 3 HD
 * cobra por caractere, e uma leitura que cresça sem limite vira custo que
 * ninguém vê até a fatura. O app avisa na tela quando cortou — cortar calado
 * seria pior que não falar.
 */
const LIMITE_CARACTERES = 3000;
const LIMITE_BYTES = 4500;

/** Nenhuma chamada espera para sempre. */
const ESPERA_MAXIMA = 45000;

/** Quanto tempo a URL assinada vale. Basta para tocar; não serve para guardar. */
const VALIDADE_URL = 3600;

/**
 * Validade de um link que a pessoa vai mandar para outra.
 *
 * Uma hora não serve: quem recebe abre depois, e o link já morreu. Sete dias é
 * o meio-termo — dá tempo de ouvir, e o link não vira endereço permanente de
 * uma leitura pessoal. Quem compartilha sabe que está compartilhando; é a
 * mesma exposição de mandar o texto, só que em voz.
 */
const VALIDADE_COMPARTILHAR = 7 * 24 * 3600;

async function sha256(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Corta no fim de frase mais próximo, para a fala não parar no meio da palavra. */
function limitar(bruto: string): { texto: string; cortado: boolean } {
  const limpo = bruto.trim();
  const cabe = limpo.length <= LIMITE_CARACTERES
    && new TextEncoder().encode(limpo).length <= LIMITE_BYTES;
  if (cabe) return { texto: limpo, cortado: false };

  let corte = limpo.slice(0, LIMITE_CARACTERES);
  while (new TextEncoder().encode(corte).length > LIMITE_BYTES && corte.length > 50) {
    corte = corte.slice(0, -50);
  }
  const fimDeFrase = Math.max(
    corte.lastIndexOf('. '),
    corte.lastIndexOf('! '),
    corte.lastIndexOf('? '),
  );
  if (fimDeFrase > corte.length * 0.6) corte = corte.slice(0, fimDeFrase + 1);
  return { texto: corte.trim(), cortado: true };
}

async function falar(chave: string, texto: string): Promise<Uint8Array> {
  const freio = new AbortController();
  const relogio = setTimeout(() => freio.abort(), ESPERA_MAXIMA);
  try {
    const r = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${chave}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: texto },
          voice: { languageCode: IDIOMA, name: VOZ },
          audioConfig: { audioEncoding: 'MP3' },
        }),
        signal: freio.signal,
      },
    );
    const corpo = await r.json();
    if (!r.ok) throw new Error(corpo?.error?.message ?? `HTTP ${r.status}`);
    return Uint8Array.from(atob(corpo.audioContent), (c) => c.charCodeAt(0));
  } finally {
    clearTimeout(relogio);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return resposta({ erro: 'Método não permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const googleKey = Deno.env.get('GOOGLE_TTS_KEY');
  if (!supabaseUrl || !serviceRoleKey || !googleKey) {
    return resposta({ erro: 'Serviço temporariamente indisponível' }, 503);
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const jwt = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
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
  const bruto = typeof body.texto === 'string' ? body.texto : '';
  if (!bruto.trim()) return resposta({ erro: 'Sem texto para falar' }, 400);

  const validade = body.compartilhar === true ? VALIDADE_COMPARTILHAR : VALIDADE_URL;

  const { texto, cortado } = limitar(bruto);
  const hash = await sha256(`${VOZ}\n${texto}`);

  // O cache vem ANTES da cota, de propósito: ouvir de novo o que já foi gerado
  // não custa chamada paga, então não pode custar uma do dia. É o mesmo desenho
  // do cache de interpretação do mapa.
  const { data: guardado } = await supabaseAdmin
    .from('voz_cache').select('arquivo, usos').eq('hash', hash).maybeSingle();

  if (guardado?.arquivo) {
    const { data: assinada, error: erroUrl } = await supabaseAdmin
      .storage.from(BUCKET).createSignedUrl(guardado.arquivo, validade);
    if (!erroUrl && assinada?.signedUrl) {
      await supabaseAdmin.from('voz_cache').update({
        usos: (typeof guardado.usos === 'number' ? guardado.usos : 1) + 1,
        ultimo_uso: new Date().toISOString(),
      }).eq('hash', hash);
      return resposta({ url: assinada.signedUrl, doCache: true, cortado });
    }
    // Linha órfã: o registro existe, o arquivo não. Cai para gerar de novo em
    // vez de devolver erro — a pessoa não tem culpa da nossa inconsistência.
    console.error('cache com arquivo ausente', hash);
  }

  const { data: perfil, error: erroPerfil } = await supabaseAdmin
    .from('perfis').select('is_super_admin, plano').eq('id', usuarioId).maybeSingle();
  if (erroPerfil) {
    console.error('falha ao ler perfil', erroPerfil.message);
    return resposta({ erro: 'Falha ao conferir seu plano' }, 502);
  }
  const semLimite = perfil?.is_super_admin === true;
  const plano = typeof perfil?.plano === 'string' ? perfil.plano : 'gratuito';

  const veredito = await conferirUso(supabaseAdmin, usuarioId, plano, semLimite, 'voz');
  if (!veredito.permitido) {
    return resposta({ erro: mensagemDoLimite(veredito, 'voz'), motivo: veredito.motivo }, 402);
  }

  let audio: Uint8Array;
  try {
    audio = await falar(googleKey, texto);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error('falha ao sintetizar', mensagem);
    return resposta({ erro: 'Não foi possível gerar a leitura falada agora.' }, 502);
  }

  const arquivo = `${hash}.mp3`;
  const { error: erroUpload } = await supabaseAdmin
    .storage.from(BUCKET).upload(arquivo, audio, {
      contentType: 'audio/mpeg',
      upsert: true,
    });
  if (erroUpload) {
    console.error('falha ao guardar audio', erroUpload.message);
    return resposta({ erro: 'Não foi possível guardar a leitura falada.' }, 502);
  }

  const { data: assinada, error: erroUrl } = await supabaseAdmin
    .storage.from(BUCKET).createSignedUrl(arquivo, validade);
  if (erroUrl || !assinada?.signedUrl) {
    console.error('falha ao assinar url', erroUrl?.message);
    return resposta({ erro: 'Não foi possível entregar a leitura falada.' }, 502);
  }

  // Grava o cache e conta o uso só agora, com o áudio existindo: ninguém paga
  // por falha nossa.
  const { error: erroCache } = await supabaseAdmin.from('voz_cache').upsert({
    hash, voz: VOZ, arquivo, caracteres: texto.length, usos: 1,
    ultimo_uso: new Date().toISOString(),
  }, { onConflict: 'hash' });
  if (erroCache) console.error('falha ao gravar cache', erroCache.message);

  await registrarUso(supabaseAdmin, usuarioId, 'voz', veredito.usadoHoje);

  return resposta({ url: assinada.signedUrl, doCache: false, cortado });
});
