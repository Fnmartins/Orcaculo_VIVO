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

/**
 * O modelo, e por que este.
 *
 * `claude-opus-5-5` custa US$ 4 / US$ 20 por milhao de tokens contra US$ 5 / US$ 25
 * do `claude-opus-5` que estava aqui — 20% menos, no modelo mais novo. A auditoria
 * de custo por plano (item 31) mostrou que o aprofundamento e a maior linha de
 * gasto, e esta foi a economia mais barata que apareceu: uma constante.
 *
 * A troca e segura NESTE arquivo porque as tres mudancas do 5.5 nao o alcancam: o
 * esforco e declarado abaixo (o 5.5 baixou o PADRAO de `high` para `medium`, e quem
 * nao declara sente), nenhum `thinking: disabled` (que passou a dar 400) e nenhuma
 * ferramenta forcada (idem). A recusa ja e tratada — o 5.5 tem classificadores mais
 * amplos, e `stop_reason === 'refusal'` ja tem caminho proprio logo abaixo.
 *
 * O que NAO da para garantir por teste: o texto muda de voz. Modelo diferente
 * escreve diferente, e isso e gosto, nao regressao. Voltar e esta linha de volta.
 */
const MODELO = 'claude-opus-5-5';
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
- **Use a casa e o aspecto, não só o signo.** "Mercúrio em Escorpião" serve para muita gente; "o seu Mercúrio em Escorpião na casa 12, em quadratura com Saturno" serve para uma. Quando os dados trouxerem casa e aspecto, eles são o que torna a leitura desta pessoa.
- Aspecto tenso não é defeito nem castigo, e harmônico não é sorte: são jeitos diferentes de duas partes se falarem. Diga isso pelo tom, sem precisar explicar a palavra.
- A tensão é para ser dita com franqueza e sem susto: é onde a pessoa puxa para dois lados, não é defeito nem destino.
- Nada de idade, ano, doença, dinheiro, processo, gravidez ou morte.

Depois da leitura geral, escreva quatro areas da vida. **Cada area vem com as pecas de mapa dela dentro de <dados>: a casa que responde por ela, o signo em que essa casa comeca, quem mora dentro, onde esta o regente e os planetas do assunto.** Escreva cada area A PARTIR DESSAS PECAS:
- Cite pelo menos uma peca concreta da area (a casa, o signo da cuspide, o regente e onde ele esta, ou um planeta com a casa dele). Sem citar peca, o texto serve para qualquer pessoa — e e isso que estamos deixando de fazer.
- Nao use a peca de uma area para escrever outra: a casa 7 e amor, a 10 e trabalho, a 2 e dinheiro. Se uma peca aparece nas duas, diga o que ela faz em cada uma.
- Casa vazia nao e area vazia: quando a casa nao tem planeta dentro, o assunto dela esta onde mora o regente, e e de la que voce escreve.
- Quando a area vier marcada "(sem hora de nascimento: sem casas)", escreva com os planetas que ha e diga numa frase que essa parte fica mais firme com a hora. Nunca invente a casa que nao veio.

O que cada area e:
- **amor**: como esta pessoa se vincula — o que procura, o que oferece, onde costuma travar.
- **trabalho**: como ela funciona trabalhando — ambiente, ritmo, relacao com reconhecimento e com autoridade.
- **dinheiro**: a RELACAO dela com recursos — seguranca, valor proprio, atitude diante de ter e de gastar. Nunca indique aplicacao, nunca diga se compra ou vende, nunca fale de valor futuro.
- **caminho**: a direcao que este mapa aponta — o tema que se repete, o que esta em desenvolvimento. NAO e previsao: nao diga quando, nao diga que vai acontecer, nao prometa desfecho. E tendencia simbolica, e a frase precisa deixar isso claro por si.

Se os dados nao trouxerem o suficiente para uma area, escreva o que der com o que ha e diga numa frase que essa parte fica mais firme com a hora de nascimento. Nunca preencha com invencao.

As pecas de cada area vao aparecer na tela ao lado do seu texto, para a pessoa conferir de onde ele saiu. Escreva sabendo que a conta esta a vista.

Responda SOMENTE com um objeto JSON, sem cercas de código e sem texto antes ou depois:
{"titulo": "3 a 5 palavras", "narrativa": "5 a 7 frases ligando Sol, Lua e Ascendente nesta pessoa", "forca": "2 a 3 frases sobre o que essa combinação faz bem", "tensao": "2 a 3 frases sobre onde ela puxa para dois lados", "conselho": "2 frases, uma prática concreta", "amor": "3 a 4 frases", "trabalho": "3 a 4 frases", "dinheiro": "3 a 4 frases", "caminho": "3 a 4 frases"}`;

const INSTRUCOES_POR_ORACULO: Record<Oraculo, string> = {
  tarot: INSTRUCOES_TAROT,
  buzios: INSTRUCOES_BUZIOS,
  mapa: INSTRUCOES_MAPA,
};

const CAMPOS: Record<Oraculo, string[]> = {
  tarot: ['titulo', 'narrativa', 'passado', 'presente', 'futuro', 'conselho'],
  buzios: ['titulo', 'narrativa', 'mensagem', 'conselho', 'afirmacao'],
  mapa: ['titulo', 'narrativa', 'forca', 'tensao', 'conselho', 'amor', 'trabalho', 'dinheiro', 'caminho'],
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
      const grau = typeof p.grau === 'number' ? ` ${Math.floor(p.grau)}°` : '';
      const casa = typeof p.casa === 'number' ? `, casa ${p.casa}` : '';
      return `${nome} em ${signo}${grau}${casa}${p.retrogrado === true ? ' (retrógrado)' : ''}`;
    }).filter(Boolean).join('; ')
    : '';

  // As casas: o que cada uma governa, o signo da cuspide e quem mora la.
  // Calculavamos as doze e nao contavamos nenhuma — era por isso que a leitura
  // saia servindo para qualquer pessoa.
  const casas = Array.isArray(mapa.casas)
    ? mapa.casas.slice(0, 12).map((item) => {
      const c = item as Record<string, unknown>;
      const numero = typeof c.numero === 'number' ? c.numero : null;
      const signo = texto(c.signo, 30);
      if (numero === null || !signo) return '';
      const corpos = Array.isArray(c.corpos)
        ? c.corpos.map((n) => texto(n, 20)).filter(Boolean).join(', ')
        : '';
      const area = texto(c.area, 60);
      return `Casa ${numero} (${area}): comeca em ${signo}${corpos ? ` — ${corpos}` : ''}`;
    }).filter(Boolean).join('\n')
    : '';

  const aspectos = Array.isArray(mapa.aspectos)
    ? mapa.aspectos.slice(0, 8).map((item) => {
      const a = item as Record<string, unknown>;
      const frase = texto(a.texto, 80);
      if (!frase) return '';
      const natureza = a.natureza === 'tenso' ? ' (tenso)'
        : a.natureza === 'harmonico' ? ' (harmonico)' : '';
      return `${frase}${natureza}`;
    }).filter(Boolean).join('; ')
    : '';

  // Cada area com as pecas de mapa que respondem por ela (`data/areas.ts`).
  // Sem isto o modelo recebia o mapa inteiro e quatro titulos, e o texto de amor
  // saia do mesmo lugar que o de dinheiro: as quatro areas ficavam parecidas
  // entre si, e parecidas com as de qualquer pessoa.
  const areas = Array.isArray(mapa.areas)
    ? mapa.areas.slice(0, 4).map((item) => {
      const a = item as Record<string, unknown>;
      const titulo = texto(a.titulo, 30);
      const pecas = Array.isArray(a.pecas)
        ? a.pecas.map((p) => texto(p, 180)).filter(Boolean).slice(0, 8)
        : [];
      if (!titulo || pecas.length === 0) return '';
      const semCasas = a.comCasas === false ? ' (sem hora de nascimento: sem casas)' : '';
      const linhas = pecas.map((p) => `  - ${p}`).join('\n');
      return `${titulo}${semCasas}:\n${linhas}`;
    }).filter(Boolean).join('\n')
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
    casas ? `As casas:
${casas}` : '',
    aspectos ? `Aspectos mais exatos: ${aspectos}` : '',
    areas ? `As quatro areas da vida, cada uma com as pecas do mapa que respondem por ela:
${areas}` : '',
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
/**
 * A versão do FORMATO da leitura entra na chave.
 *
 * Em 28/09 a resposta do mapa ganhou quatro áreas (amor, trabalho, dinheiro,
 * caminho). Sem este número, uma leitura guardada antes disso voltaria do cache
 * no formato velho — sem as áreas — e a tela mostraria menos do que mostra para
 * quem gerou depois, sem erro nenhum aparecendo. Mudou o formato, sobe o
 * número, e as leituras antigas simplesmente deixam de ser encontradas.
 */
/**
 * Em 29/09 as areas passaram a sair das casas e dos planetas de cada assunto
 * (`data/areas.ts`), e as pecas de cada area passaram a aparecer na tela ao lado
 * do texto. Uma leitura guardada antes disso foi escrita sem ver esse dossie: a
 * tela mostraria as pecas como se fossem a base de um texto que nunca as
 * conheceu. Sobe o numero, e as antigas deixam de ser encontradas.
 *
 * O preco disso e uma geracao nova por pessoa que ja tinha leitura. E o preco de
 * nao mostrar uma conta que nao foi feita.
 */
const VERSAO_FORMATO = 'v3-areas-casas';

async function chaveDoMapa(dados: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${VERSAO_FORMATO}\n${dados}`);
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
    .from('perfis').select('consultas_restantes, is_super_admin, plano, plano_valido_ate')
    .eq('id', usuarioId).maybeSingle();
  if (erroPerfil) {
    console.error('falha ao ler perfil', erroPerfil.message);
    return resposta({ erro: 'Falha ao conferir seu plano' }, 502);
  }
  const semLimite = perfil?.is_super_admin === true;
  const restantes = typeof perfil?.consultas_restantes === 'number' ? perfil.consultas_restantes : 0;

  // Interruptor por plano e limite do dia, iguais aos da ia-oraculo.
  const plano = typeof perfil?.plano === 'string' ? perfil.plano : 'gratuito';
  const veredito = await conferirUso(
    supabaseAdmin, usuarioId, plano, semLimite, 'interpretacao',
    perfil?.plano_valido_ate as string | null,
  );
  if (!veredito.permitido) {
    return resposta({
      erro: mensagemDoLimite(veredito, 'interpretacao'),
      motivo: veredito.motivo,
    }, 402);
  }

  // A cota do período fica DEPOIS do veredito, e a ordem importa pelo mesmo motivo de
  // vencido vir antes de desligado em `decidirUso`. O webhook da Stripe zera
  // `consultas_restantes` E `plano_valido_ate` no mesmo update do cancelamento: com esta
  // checagem na frente, quem cancelou lia "suas consultas deste período acabaram" do
  // servidor e "seu acesso terminou" no semáforo da mesma tela — duas explicações para
  // uma pessoa, e a do servidor manda para o lugar errado. Vencimento responde primeiro.
  if (!semLimite && restantes <= 0) {
    return resposta({ erro: 'Suas consultas deste período acabaram.', semConsultas: true }, 402);
  }

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const mensagem = await anthropic.messages.create({
      model: MODELO,
      // Inclui o raciocínio, que neste modelo vem ligado por padrão: teto baixo
      // faz a resposta voltar cortada e o JSON não fechar.
      max_tokens: 12000,
      // `medium` desde 01/10, e esta é a maior economia disponível: a aba Custo
      // mostrou o aprofundamento com 95% do gasto de IA (US$ 0,19 de US$ 0,20), e
      // esforço é profundidade de raciocínio — cobrado como SAÍDA, a US$ 20 por
      // milhão neste modelo.
      //
      // `high` aqui era opt-in: o padrão do próprio Opus 5.5 é `medium`. E esforço
      // alto rende em código e agente de longo prazo, não em escrita delimitada como
      // esta, que recebe cartas, posições e significados prontos no prompt — sem
      // busca, sem ferramenta, sem verificação em etapas.
      //
      // O que muda não é acerto, é voz, e isso é gosto: a decisão de voltar para
      // `high` está no roadmap, para depois dos primeiros clientes. Voltar é esta
      // palavra de volta.
      output_config: { effort: 'medium' },
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
    // Os tokens da resposta vao para o contador: e o que faz a auditoria de custo
    // por plano (item 31) ser medida, em vez de estimada sobre media inventada.
    await registrarUso(supabaseAdmin, usuarioId, 'interpretacao', {
      entrada: mensagem.usage?.input_tokens,
      saida: mensagem.usage?.output_tokens,
    });

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
