// supabase/functions/ia-oraculo/index.ts
// Análise de imagem de verdade: a foto vai para o Claude e o texto volta dela.
//
// Até 24/09 a tela dizia "IA generativa analisa padrões" e devolvia texto fixo
// de data/ia-analise.ts, igual para qualquer foto. A chave vive aqui, no
// servidor — nunca no app, que é código que qualquer pessoa lê.
import Anthropic from 'npm:@anthropic-ai/sdk@^0.70';
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

const MODELO = 'claude-opus-5';
const TIPOS = ['cafe', 'quiromancia'] as const;
type Tipo = (typeof TIPOS)[number];

const MEDIA_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
// 4 MB de imagem já é mais do que qualquer foto de celular comprimida precisa,
// e deixa folga para o limite de corpo da function e o da própria API.
const LIMITE_BYTES = 4 * 1024 * 1024;

const O_QUE_OLHAR: Record<Tipo, string> = {
  cafe:
    'A foto é da borra de café no fundo de uma xícara. Descreva as formas que '
    + 'realmente aparecem nela — manchas, linhas, aglomerados, espaços vazios — '
    + 'e só então o que elas evocam na tradição da tasseografia.',
  quiromancia:
    'A foto é da palma de uma mão, a mão dominante de quem consulta. Descreva as '
    + 'linhas que realmente aparecem — coração, cabeça, vida, destino quando visível '
    + '—, seu traçado, profundidade e cruzamentos, e só então o que a quiromancia '
    + 'associa a elas.',
};

const INSTRUCOES = `Você escreve leituras simbólicas para o Arcanus, um app de oráculos em português do Brasil.

Regras que não se quebram:
- Descreva o que está NA IMAGEM antes de interpretar. Se a imagem não for o que foi pedido, ou estiver escura, tremida ou cortada demais para ler, diga isso no resumo e devolva energia "neutra" — não invente uma leitura.
- Nunca faça previsão de saúde, diagnóstico, prognóstico de doença, orientação financeira ou jurídica, nem afirme que algo vai acontecer. Fale de tendências, símbolos e convites à reflexão.
- Nunca prometa resultado, cura ou ganho. Nunca cite marcas, pessoas reais ou datas específicas.
- Escreva em português do Brasil, com respeito e sem misticismo grandiloquente. Trate quem lê por "você".

Responda SOMENTE com um objeto JSON, sem cercas de código e sem texto antes ou depois, neste formato exato:
{"titulo": "3 a 5 palavras", "resumo": "1 a 2 frases", "detalhes": [{"secao": "O que aparece na imagem", "texto": "..."}, {"secao": "Leitura simbólica", "texto": "..."}, {"secao": "Convite", "texto": "..."}], "energia": "positiva" | "neutra" | "atencao"}

Cada "texto" tem de 2 a 4 frases. Use exatamente essas três seções, nessa ordem.`;

interface Detalhe { secao: string; texto: string }
interface Analise {
  titulo: string;
  resumo: string;
  detalhes: Detalhe[];
  energia: 'positiva' | 'neutra' | 'atencao';
}

/** O modelo devolve texto. Nada entra na tela sem passar por aqui. */
function validarAnalise(bruto: string): Analise {
  const limpo = bruto.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const dado = JSON.parse(limpo) as Record<string, unknown>;

  const titulo = typeof dado.titulo === 'string' ? dado.titulo.trim() : '';
  const resumo = typeof dado.resumo === 'string' ? dado.resumo.trim() : '';
  const energia = dado.energia;
  if (!titulo || !resumo) throw new Error('resposta sem título ou resumo');
  if (energia !== 'positiva' && energia !== 'neutra' && energia !== 'atencao') {
    throw new Error(`energia inválida: ${String(energia)}`);
  }
  if (!Array.isArray(dado.detalhes) || dado.detalhes.length === 0) {
    throw new Error('resposta sem detalhes');
  }
  const detalhes: Detalhe[] = dado.detalhes.map((item) => {
    const d = item as Record<string, unknown>;
    const secao = typeof d.secao === 'string' ? d.secao.trim() : '';
    const texto = typeof d.texto === 'string' ? d.texto.trim() : '';
    if (!secao || !texto) throw new Error('detalhe sem seção ou texto');
    return { secao, texto };
  });

  return { titulo, resumo, detalhes, energia };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return resposta({ erro: 'Método não permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anthropicKey) {
    return resposta({ erro: 'Serviço temporariamente indisponível' }, 503);
  }
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
  const tipo = body.tipo as Tipo;
  const imagemBase64 = body.imagemBase64;
  const mediaType = typeof body.mediaType === 'string' ? body.mediaType : 'image/jpeg';

  if (!TIPOS.includes(tipo)) return resposta({ erro: 'Tipo de análise inválido' }, 400);
  if (typeof imagemBase64 !== 'string' || imagemBase64.length < 100) {
    return resposta({ erro: 'Imagem ausente' }, 400);
  }
  if (!MEDIA_ACEITOS.includes(mediaType)) {
    return resposta({ erro: 'Formato de imagem não aceito' }, 400);
  }
  // base64 cresce ~4/3 sobre os bytes originais.
  if ((imagemBase64.length * 3) / 4 > LIMITE_BYTES) {
    return resposta({ erro: 'A imagem é grande demais. Tente uma foto menor.' }, 413);
  }

  // Cota: a mesma coluna que o stripe-webhook preenche na compra e na renovação.
  // Sem isto, uma conta gratuita poderia gastar chamadas pagas sem limite.
  const { data: perfil, error: erroPerfil } = await supabaseAdmin
    .from('perfis').select('consultas_restantes, is_super_admin').eq('id', usuarioId).maybeSingle();
  if (erroPerfil) {
    console.error('falha ao ler perfil', erroPerfil.message);
    return resposta({ erro: 'Falha ao conferir seu plano' }, 502);
  }
  const semLimite = perfil?.is_super_admin === true;
  const restantes = typeof perfil?.consultas_restantes === 'number' ? perfil.consultas_restantes : 0;
  if (!semLimite && restantes <= 0) {
    return resposta({ erro: 'Suas consultas deste período acabaram.', semConsultas: true }, 402);
  }

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const mensagem = await anthropic.messages.create({
      model: MODELO,
      max_tokens: 2000,
      // Leitura curta: esforço baixo entrega o mesmo texto por uma fração do custo.
      output_config: { effort: 'low' },
      system: INSTRUCOES,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imagemBase64 } },
          { type: 'text', text: O_QUE_OLHAR[tipo] },
        ],
      }],
    });

    if (mensagem.stop_reason === 'refusal') {
      return resposta({ erro: 'Não foi possível ler esta imagem. Tente outra foto.' }, 422);
    }
    const texto = mensagem.content
      .filter((bloco): bloco is { type: 'text'; text: string } => bloco.type === 'text')
      .map((bloco) => bloco.text)
      .join('\n');

    const analise = validarAnalise(texto);

    // Só desconta depois que a leitura existe: cobrar por chamada que falhou
    // seria tirar consulta de quem não recebeu nada.
    if (!semLimite) {
      exigirEscrita('perfis.consultas_restantes', await supabaseAdmin
        .from('perfis').update({ consultas_restantes: restantes - 1 }).eq('id', usuarioId));
    }

    return resposta({ ...analise, tipo, restantes: semLimite ? null : restantes - 1 });
  } catch (erro) {
    console.error('falha na análise', erro instanceof Error ? erro.message : erro);
    return resposta({ erro: 'Não foi possível analisar a imagem agora. Tente de novo.' }, 502);
  }
});
