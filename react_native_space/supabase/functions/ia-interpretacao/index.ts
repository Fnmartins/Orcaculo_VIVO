// supabase/functions/ia-interpretacao/index.ts
// Aprofundamento das leituras de tarô e búzios.
//
// Irmã da ia-oraculo, que olha imagem. Esta lê o que o app já sorteou: as três
// cartas ou o odu. As duas telas já tinham o bloco "Aprofundar com IA" pronto,
// escondido atrás de uma constante desligada — faltava o caminho no servidor.
//
// O prompt é montado aqui, nunca recebido do app. Se o texto viesse do cliente,
// qualquer pessoa usaria a chave paga do projeto para gerar o que quisesse.
import Anthropic from 'npm:@anthropic-ai/sdk@^0.70';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { exigirEscrita } from '../_shared/escritas.ts';
// As regras de voz vivem em _shared desde que a ia-pergunta nasceu: duas
// cópias de regra de segurança acabam divergindo, e a que some é sempre a que
// importava.
import { REGRAS } from '../_shared/regras-ia.ts';
import { conferirUso, mensagemDoLimite, registrarUso } from '../_shared/uso.ts';

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
const ORACULOS = ['tarot', 'buzios', 'mapa'] as const;
type Oraculo = (typeof ORACULOS)[number];

/** Nada que venha do app entra no prompt sem corte: texto longo é injeção barata. */
function texto(valor: unknown, limite: number): string {
  return typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim().slice(0, limite) : '';
}

const INSTRUCOES_TAROT = `${REGRAS}

Você interpreta uma tiragem de três cartas, ligando-as numa leitura coerente — não três leituras soltas.

Responda SOMENTE com um objeto JSON, sem cercas de código e sem texto antes ou depois:
{"titulo": "3 a 5 palavras", "narrativa": "4 a 6 frases ligando as três cartas", "passado": "2 a 3 frases", "presente": "2 a 3 frases", "futuro": "2 a 3 frases", "conselho": "2 frases"}`;

const INSTRUCOES_BUZIOS = `${REGRAS}

Você interpreta simbolicamente um jogo de búzios, com respeito às tradições afro-brasileiras. Você não é sacerdote, não fala pelos Orixás e não substitui uma consulta presencial — escreve uma leitura simbólica do odu que saiu, aplicada à intenção de quem consultou.

Responda SOMENTE com um objeto JSON, sem cercas de código e sem texto antes ou depois:
{"titulo": "3 a 5 palavras", "narrativa": "4 a 5 frases aplicando o odu à intenção", "mensagem": "2 a 3 frases", "conselho": "2 frases, uma ação concreta", "afirmacao": "uma frase curta para levar consigo"}`;

const INSTRUCOES_MAPA = `${REGRAS}

Você lê um mapa natal já calculado — as posições vêm de efemérides reais, não são suposição sua. Seu trabalho é **ligar as peças**: o que a combinação entre Sol, Lua e Ascendente faz junta, e como os outros planetas e o equilíbrio de elementos entram nisso.

Mais regras, para esta leitura:
- Não repita a definição de cada peça ("a Lua representa..."): isso já está escrito na tela, acima da sua resposta. Vá direto para a combinação desta pessoa.
- Não invente posição, casa nem aspecto que não esteja nos dados. Se algo não veio, não existe nesta leitura.
- A tensão é para ser dita com franqueza e sem susto: é onde a pessoa puxa para dois lados, não é defeito nem destino.
- Nada de idade, ano, doença, dinheiro, processo, gravidez ou morte.

Responda SOMENTE com um objeto JSON, sem cercas de código e sem texto antes ou depois:
{"titulo": "3 a 5 palavras", "narrativa": "5 a 7 frases ligando Sol, Lua e Ascendente nesta pessoa", "forca": "2 a 3 frases sobre o que essa combinação faz bem", "tensao": "2 a 3 frases sobre onde ela puxa para dois lados", "conselho": "2 frases, uma prática concreta"}`;

const INSTRUCOES_POR_ORACULO: Record<Oraculo, string> = {
  tarot: INSTRUCOES_TAROT,
  buzios: INSTRUCOES_BUZIOS,
  mapa: INSTRUCOES_MAPA,
};

const CAMPOS: Record<Oraculo, string[]> = {
  tarot: ['titulo', 'narrativa', 'passado', 'presente', 'futuro', 'conselho'],
  buzios: ['titulo', 'narrativa', 'mensagem', 'conselho', 'afirmacao'],
  mapa: ['titulo', 'narrativa', 'forca', 'tensao', 'conselho'],
};

function dadosDoTarot(body: Record<string, unknown>): string {
  const cartas = Array.isArray(body.cartas) ? body.cartas.slice(0, 3) : [];
  if (cartas.length === 0) throw new Error('Nenhuma carta recebida');
  const linhas = cartas.map((item) => {
    const c = item as Record<string, unknown>;
    const nome = texto(c.nome, 60);
    const posicao = texto(c.posicao, 40);
    const significado = texto(c.significado, 300);
    if (!nome || !posicao) throw new Error('Carta sem nome ou posição');
    return `- ${posicao}: ${nome}${significado ? ` (${significado})` : ''}`;
  });
  return `<dados>\n${linhas.join('\n')}\n</dados>`;
}

function dadosDosBuzios(body: Record<string, unknown>): string {
  const odu = (body.odu ?? {}) as Record<string, unknown>;
  const nome = texto(odu.nome, 60);
  if (!nome) throw new Error('Odu sem nome');
  const numero = typeof odu.numero === 'number' ? odu.numero : null;
  // O travessão do Opirá é "sem regente", não um nome. Sem este filtro a IA
  // recebia `Orixás regentes: —` e escrevia em cima disso.
  const orixas = Array.isArray(odu.orixas)
    ? odu.orixas
      .map((o) => texto(o, 40))
      .filter((o) => o && o !== '—' && o !== '-')
      .slice(0, 6).join(', ')
    : '';
  return [
    '<dados>',
    `Odu: ${nome}${numero === null ? '' : ` (${numero} búzios abertos)`}`,
    orixas ? `Orixás regentes: ${orixas}` : '',
    `Significado de base: ${texto(odu.descricao, 500)}`,
    `Intenção de quem consultou: ${texto(odu.intencao, 300) || 'não informada'}`,
    '</dados>',
  ].filter(Boolean).join('\n');
}

/**
 * O mapa natal já calculado. Chega pronto do aparelho — as efemérides rodam
 * lá, e nem data, nem hora, nem cidade de nascimento sobem para cá: o que
 * viaja são as posições que elas produziram.
 */
function dadosDoMapa(body: Record<string, unknown>): string {
  const mapa = (body.mapa ?? {}) as Record<string, unknown>;
  const ponto = (valor: unknown, rotulo: string): string => {
    const p = (valor ?? {}) as Record<string, unknown>;
    const signo = texto(p.signo, 30);
    if (!signo) return '';
    const grau = typeof p.grau === 'number' ? Math.floor(p.grau) : null;
    return `${rotulo}: ${signo}${grau === null ? '' : ` (${grau}°)`}`;
  };

  const sol = ponto(mapa.sol, 'Sol');
  if (!sol) throw new Error('Mapa sem posição do Sol');

  const planetas = Array.isArray(mapa.planetas)
    ? mapa.planetas.slice(0, 8).map((item) => {
      const p = item as Record<string, unknown>;
      const nome = texto(p.nome, 20);
      const signo = texto(p.signo, 30);
      if (!nome || !signo) return '';
      return `${nome} em ${signo}${p.retrogrado === true ? ' (retrógrado)' : ''}`;
    }).filter(Boolean).join('; ')
    : '';

  return [
    '<dados>',
    sol,
    ponto(mapa.lua, 'Lua'),
    // Sem hora de nascimento não existe ascendente, e a linha simplesmente
    // não vai — em vez de ir vazia e a IA inventar em cima.
    ponto(mapa.ascendente, 'Ascendente'),
    planetas ? `Outros planetas: ${planetas}` : '',
    `Elemento dominante: ${texto(mapa.elementoDominante, 20) || 'não calculado'}`,
    `Modalidade dominante: ${texto(mapa.qualidadeDominante, 20) || 'não calculada'}`,
    texto(mapa.elementoAusente, 20) ? `Elemento sem nenhum planeta: ${texto(mapa.elementoAusente, 20)}` : '',
    texto(mapa.regente, 40) ? `Regente do mapa: ${texto(mapa.regente, 40)}` : '',
    '</dados>',
  ].filter(Boolean).join('\n');
}

/**
 * A chave da leitura já escrita.
 *
 * O mapa é determinístico: mesma data, hora e cidade dão o mesmo céu, e o
 * mesmo céu dá a mesma leitura. A chave é o resumo das **posições** — não do
 * nascimento — então a tabela não guarda dado pessoal nenhum, e ainda assim
 * quem abrir o próprio mapa dez vezes paga uma.
 */
async function chaveDoMapa(dados: string): Promise<string> {
  const bytes = new TextEncoder().encode(dados);
  const resumo = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(resumo))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function validarResultado(bruto: string, oraculo: Oraculo): Record<string, string> {
  const limpo = bruto.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const dado = JSON.parse(limpo) as Record<string, unknown>;
  const saida: Record<string, string> = {};
  for (const campo of CAMPOS[oraculo]) {
    const valor = dado[campo];
    if (typeof valor !== 'string' || !valor.trim()) {
      throw new Error(`resposta sem o campo ${campo}`);
    }
    saida[campo] = valor.trim();
  }
  return saida;
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
  const oraculo = body.oraculo as Oraculo;
  if (!ORACULOS.includes(oraculo)) return resposta({ erro: 'Oráculo inválido' }, 400);

  let dados: string;
  try {
    if (oraculo === 'tarot') dados = dadosDoTarot(body);
    else if (oraculo === 'buzios') dados = dadosDosBuzios(body);
    else dados = dadosDoMapa(body);
  } catch (erro) {
    return resposta({ erro: erro instanceof Error ? erro.message : 'Dados incompletos' }, 400);
  }

  // A leitura do mapa já escrita vem antes de tudo: não custa chamada, não
  // desconta consulta e não entra no limite do dia. O mapa é determinístico —
  // mesma data, hora e cidade dão o mesmo céu — então reescrever seria pagar
  // duas vezes pela mesma frase.
  let chave = '';
  if (oraculo === 'mapa') {
    chave = await chaveDoMapa(dados);
    const { data: guardada, error: erroCache } = await supabaseAdmin
      .from('interpretacoes_mapa').select('conteudo, usos').eq('chave', chave).maybeSingle();
    if (erroCache) console.error('falha ao ler interpretacao guardada', erroCache.message);
    else if (guardada?.conteudo) {
      const usos = typeof guardada.usos === 'number' ? guardada.usos : 1;
      const { error: erroContar } = await supabaseAdmin
        .from('interpretacoes_mapa').update({ usos: usos + 1 }).eq('chave', chave);
      if (erroContar) console.error('falha ao contar reuso', erroContar.message);
      return resposta({ ...(guardada.conteudo as Record<string, unknown>), oraculo, doCache: true });
    }
  }

  const { data: perfil, error: erroPerfil } = await supabaseAdmin
    .from('perfis').select('consultas_restantes, is_super_admin, plano')
    .eq('id', usuarioId).maybeSingle();
  if (erroPerfil) {
    console.error('falha ao ler perfil', erroPerfil.message);
    return resposta({ erro: 'Falha ao conferir seu plano' }, 502);
  }
  const semLimite = perfil?.is_super_admin === true;
  const restantes = typeof perfil?.consultas_restantes === 'number' ? perfil.consultas_restantes : 0;
  if (!semLimite && restantes <= 0) {
    return resposta({ erro: 'Suas consultas deste período acabaram.', semConsultas: true }, 402);
  }

  // Interruptor por plano e limite do dia, iguais aos da ia-oraculo.
  const plano = typeof perfil?.plano === 'string' ? perfil.plano : 'gratuito';
  const veredito = await conferirUso(supabaseAdmin, usuarioId, plano, semLimite, 'interpretacao');
  if (!veredito.permitido) {
    return resposta({
      erro: mensagemDoLimite(veredito, 'interpretacao'),
      motivo: veredito.motivo,
    }, 402);
  }

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const mensagem = await anthropic.messages.create({
      model: MODELO,
      // Inclui o raciocínio, que neste modelo vem ligado por padrão: teto baixo
      // faz a resposta voltar cortada e o JSON não fechar.
      max_tokens: 12000,
      output_config: { effort: 'high' },
      system: INSTRUCOES_POR_ORACULO[oraculo],
      messages: [{ role: 'user', content: [{ type: 'text', text: dados }] }],
    });

    if (mensagem.stop_reason === 'refusal') {
      return resposta({ erro: 'Não foi possível aprofundar esta leitura.' }, 422);
    }
    if (mensagem.stop_reason === 'max_tokens') {
      console.error('interpretação truncada pelo teto', JSON.stringify(mensagem.usage));
      return resposta({ erro: 'A leitura ficou longa demais e foi interrompida. Tente de novo.' }, 502);
    }
    const saida = mensagem.content
      .filter((bloco): bloco is { type: 'text'; text: string } => bloco.type === 'text')
      .map((bloco) => bloco.text)
      .join('\n');

    let interpretacao;
    try {
      interpretacao = validarResultado(saida, oraculo);
    } catch (erro) {
      console.error(
        'resposta fora do formato',
        erro instanceof Error ? erro.message : erro,
        '| stop_reason:', mensagem.stop_reason,
        '| uso:', JSON.stringify(mensagem.usage),
        '| inicio do texto:', saida.slice(0, 300),
      );
      return resposta({ erro: 'A interpretação voltou fora do formato. Tente de novo.' }, 502);
    }

    // Guarda a leitura do mapa para a próxima abertura. Falhar aqui não pode
    // estragar a leitura que a pessoa já tem na tela — custa uma reescrita,
    // não a resposta.
    if (oraculo === 'mapa' && chave) {
      const { error: erroGuardar } = await supabaseAdmin
        .from('interpretacoes_mapa').insert({ chave, conteudo: interpretacao });
      if (erroGuardar) console.error('falha ao guardar interpretacao', erroGuardar.message);
    }

    // Só desconta depois que a leitura existe.
    if (!semLimite) {
      exigirEscrita('perfis.consultas_restantes', await supabaseAdmin
        .from('perfis').update({ consultas_restantes: restantes - 1 }).eq('id', usuarioId));
    }
    await registrarUso(supabaseAdmin, usuarioId, 'interpretacao', veredito.usadoHoje);

    return resposta({
      ...interpretacao,
      oraculo,
      restantes: semLimite ? null : restantes - 1,
      uso: {
        entrada: mensagem.usage?.input_tokens ?? null,
        saida: mensagem.usage?.output_tokens ?? null,
      },
    });
  } catch (erro) {
    console.error('falha na interpretação', erro instanceof Error ? erro.message : erro);
    return resposta({ erro: 'Não foi possível aprofundar agora. Tente de novo.' }, 502);
  }
});
