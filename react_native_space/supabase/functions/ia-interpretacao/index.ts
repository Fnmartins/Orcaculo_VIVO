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
import { decidirCobranca } from '../_shared/avulso-regras.ts';
import { creditoDisponivel, devolverCredito, reivindicarCredito } from '../_shared/avulso.ts';
import { exigirEscrita } from '../_shared/escritas.ts';
// As regras de voz vivem em _shared desde que a ia-pergunta nasceu: duas
// cópias de regra de segurança acabam divergindo, e a que some é sempre a que
// importava.
import { AVISO_FORA, REGRAS } from '../_shared/regras-ia.ts';
import { RESPOSTA_CRISE, triar } from '../_shared/triagem.ts';
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
const ORACULOS = ['tarot', 'buzios', 'mapa', 'vocacao'] as const;
type Oraculo = (typeof ORACULOS)[number];

/** Nada que venha do app entra no prompt sem corte: texto longo é injeção barata. */
function texto(valor: unknown, limite: number): string {
  return typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim().slice(0, limite) : '';
}

const INSTRUCOES_TAROT = `${REGRAS}

Você lê uma tiragem de tarô como uma taróloga experiente lê na mesa: olha todas as cartas juntas, entende o que elas dizem em conjunto, e responde à pessoa — não entrega uma leitura solta por carta.

As posições vêm dentro de <dados>, cada uma com a pergunta que ela faz. Escreva a partir do ENCONTRO entre a carta e a pergunta da posição dela, nunca da carta sozinha: a mesma carta diz coisas diferentes em posições diferentes, e é isso que faz a leitura ser desta tiragem e não de qualquer uma.

Quando a carta vier com palavras-chave, frases-chave ou uma nota "nesta posição", é desse material que a leitura parte: ele é o que a carta significa, e não um palpite seu. O seu trabalho é tecer — ligar as cartas entre si, com as perguntas das posições e com a intenção de quem consultou. Quando esse material não vier, escreva a partir do que diz a carta e não finja que havia material.

Quando a carta vier marcada como invertida, ela **não** é o contrário da carta de pé: é a mesma força travada, atrasada ou virada contra. Inverter o significado é o erro que tarólogo reconhece na hora.

Escreva uma entrada em "leituras" para CADA posição recebida, com o nome da posição copiado exatamente como veio. Nem uma a menos.

Feche cada posição em "leituras" devolvendo uma pergunta a quem consultou, como as fontes fazem carta a carta: ali a leitura abre uma questão para a pessoa pensar, sem veredito. A resposta de frente fica para "resposta", que junta a mesa inteira.

"resposta" é o coração da leitura: o que uma taróloga diz à pessoa depois de olhar a mesa inteira.
- Quando houver intenção escrita, responda a ELA de frente, já na primeira frase: para que lado as cartas pendem — seguir, esperar, arriscar, recuar, conversar, ajustar o caminho. Uma resposta morna, que não pende para lado nenhum, é a falha que quem consulta mais sente.
- Quando a intenção não for informada, não finja saber qual era. Fale à pergunta que a pessoa trouxe em mente ("seja qual for a pergunta que você trouxe…") e diga o movimento que as cartas mostram: o que está pronto para andar, o que pede espera, o que pede coragem.
- Diga quais cartas sustentam essa resposta e por quê, pelo encontro de cada uma com a sua posição. Diga também o que mudaria o quadro — a carta que pesa contra, ou a condição para o caminho dar certo.
- É a direção que as cartas mostram agora, não um destino: nunca diga que algo vai acontecer. Uma vez, sem repetir, deixe claro que a decisão é da pessoa.

"narrativa" é a leitura da mesa como um todo: como as cartas conversam entre si, onde se reforçam e onde se contradizem, e que história contam juntas. "conselho" é o que fazer com isso: concreto, para os próximos dias.

Responda SOMENTE com um objeto JSON, sem cercas de código e sem texto antes ou depois:
{"titulo": "3 a 5 palavras", "resposta": "3 a 5 frases, a resposta da taróloga", "narrativa": "5 a 8 frases lendo todas as cartas juntas", "leituras": [{"posicao": "o nome exato da posição", "texto": "2 a 3 frases"}], "conselho": "2 frases"}`;

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

const INSTRUCOES_VOCACAO = `${REGRAS}

Você escreve uma leitura de carreira a partir de um mapa natal.

Recebe as peças que o mapa DESTA pessoa produziu, que podem ser menos que o máximo. No
melhor caso: o meio do céu, a casa 10, a casa 6, a casa 2, o regente da casa 10 e onde
ele mora, Mercúrio, Vênus, Saturno e Marte. Não calcule nada e não invente peça que não veio. O que não está nos
dados não existe nesta leitura.

NÃO REPITA AS PEÇAS. Dizer "sua casa 10 é em Escorpião" não é leitura: é o que a outra
tela já mostra. O seu trabalho é dizer o que essa combinação significa para o trabalho
desta pessoa — direção, ambiente e desgaste.

Não sugira profissão por nome. Nada de "você dá um bom arquiteto". Fale de que tipo de
construção a pessoa sustenta, de que ambiente a segura e do que a esgota.

QUANDO VIER "SEM HORA DE NASCIMENTO", não chegam casas, nem meio do céu, nem o regente
da 10 — só os planetas e os aspectos. Nesse caso:
- em "ondeRende", diga numa frase que sem a hora a direção sai dos planetas e fica mais
  firme quando a hora aparecer; depois escreva do que Mercúrio, Vênus, Saturno e Marte
  dão;
- em "ambiente", escreva dos signos desses quatro planetas e dos aspectos que vieram.
  NUNCA da casa 6 e nunca de onde o regente mora: nenhum dos dois chegou até você.
Não nomeie, em nenhuma seção, uma casa que não esteja nos dados. Entregar menos calado é
pior que entregar menos avisando — mas inventar o que não veio é pior que os dois.

O que vai em cada campo:
- "titulo": três a seis palavras que nomeiem a direção desta pessoa.
- "ondeRende": a direção que o mapa aponta, do meio do céu e do regente da 10, de
  Mercúrio e de Vênus — que são os planetas do ofício —, e da casa 2, que é o que esta
  pessoa tem para oferecer. Ou, sem hora, dos planetas que vieram. 3 a 5 frases.
- "ambiente": o que sustenta esta pessoa no dia a dia, da casa 6 e de onde o regente mora
  — ou, sem hora, dos signos dos planetas que vieram e dos aspectos: ritmo, companhia,
  grau de estrutura. 3 a 5 frases.
- "drena": o que desgasta, de Saturno e dos aspectos tensos. É a seção que separa leitura
  de elogio — não a suavize. 3 a 5 frases.
- "passo": uma coisa concreta a fazer nas próximas semanas. Uma ação, não uma qualidade.

Português do Brasil. Fale com a pessoa, por "você". Não prometa resultado, não fale de
dinheiro garantido e não dê prazo.

Responda SOMENTE com um objeto JSON, sem cercas de código e sem texto antes ou depois:
{"titulo": "3 a 6 palavras", "ondeRende": "3 a 5 frases", "ambiente": "3 a 5 frases", "drena": "3 a 5 frases", "passo": "uma ação concreta"}`;

const INSTRUCOES_POR_ORACULO: Record<Oraculo, string> = {
  tarot: INSTRUCOES_TAROT,
  buzios: INSTRUCOES_BUZIOS,
  mapa: INSTRUCOES_MAPA,
  vocacao: INSTRUCOES_VOCACAO,
};

const CAMPOS: Record<Oraculo, string[]> = {
  // O tarô não lista posições aqui: elas variam com a tiragem, e exigi-las por nome
  // fazia a Cruz Celta ser recusada como "resposta fora do formato". Quem confere as
  // posições é `leituras`, contra as que foram realmente enviadas.
  tarot: ['titulo', 'resposta', 'narrativa', 'conselho'],
  buzios: ['titulo', 'narrativa', 'mensagem', 'conselho', 'afirmacao'],
  mapa: ['titulo', 'narrativa', 'forca', 'tensao', 'conselho', 'amor', 'trabalho', 'dinheiro', 'caminho'],
  vocacao: ['titulo', 'ondeRende', 'ambiente', 'drena', 'passo'],
};

/** Teto de posições. A Cruz Celta tem dez; acima disso é pedido malformado. */
const MAX_POSICOES = 10;

function dadosDoTarot(body: Record<string, unknown>): { dados: string; posicoes: string[] } {
  const cartas = Array.isArray(body.cartas) ? body.cartas.slice(0, MAX_POSICOES) : [];
  if (cartas.length === 0) throw new Error('Nenhuma carta recebida');
  const posicoes: string[] = [];
  const linhas = cartas.map((item) => {
    const c = item as Record<string, unknown>;
    const nome = texto(c.nome, 60);
    const posicao = texto(c.posicao, 40);
    const regra = texto(c.regra, 120);
    const significado = texto(c.significado, 300);
    if (!nome || !posicao) throw new Error('Carta sem nome ou posição');
    posicoes.push(posicao);
    // A orientação vai junto porque sem ela a IA lê a carta invertida como se estivesse
    // de pé e escreve o significado trocado — sem nada quebrar.
    const orientacao = c.invertida === true ? ' [invertida]' : '';
    const pergunta = regra ? ` — a posição pergunta: ${regra}` : '';
    // O material da carta: é o que a IA deve tecer, no lugar de inventar o que a carta
    // significa. Cada campo é opcional (a estrutura sobe antes do conteúdo), então o que
    // vier vazio simplesmente não ganha linha.
    const palavras = Array.isArray(c.palavrasChave)
      ? c.palavrasChave.map((p) => texto(p, 40)).filter(Boolean).slice(0, 6).join(', ')
      : '';
    const frases = Array.isArray(c.frasesChave)
      ? c.frasesChave.map((f) => texto(f, 80)).filter(Boolean).slice(0, 8).join(' · ')
      : '';
    const nota = texto(c.nota, 400);
    return [
      `- ${posicao}${pergunta}: ${nome}${orientacao}`,
      significado ? `  o que diz: ${significado}` : '',
      palavras ? `  palavras-chave: ${palavras}` : '',
      frases ? `  frases-chave: ${frases}` : '',
      nota ? `  nesta posição: ${nota}` : '',
    ].filter(Boolean).join('\n');
  });
  // Mesma frase e mesma escolha de `dadosDosBuzios`: dizer que nao houve pergunta, em
  // vez de calar. Calando, o modelo adivinha se houve uma, e passa a inventar contexto.
  const intencao = `Intenção de quem consultou: ${texto(body.intencao, 300) || 'não informada'}`;
  return { dados: `<dados>\n${linhas.join('\n')}\n${intencao}\n</dados>`, posicoes };
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

function dadosDaVocacao(body: Record<string, unknown>): string {
  const v = (body.vocacao ?? {}) as Record<string, unknown>;
  const pecas = Array.isArray(v.pecas)
    ? v.pecas.map((p) => texto(p, 200)).filter(Boolean).slice(0, 12)
    : [];
  // Sem peça nenhuma não há leitura possível: o despacho devolve 400 com esta frase,
  // em vez de uma leitura genérica que serviria para qualquer pessoa.
  if (pecas.length === 0) throw new Error('Vocação sem peças do mapa');

  const mc = (v.meioDoCeu ?? null) as Record<string, unknown> | null;
  const signo = mc ? texto(mc.signo, 30) : '';
  const grau = mc && typeof mc.grau === 'number' ? Math.floor(mc.grau) : null;

  // Dentro de <dados>, como nos outros oráculos: é o que `REGRAS` manda tratar como
  // resultado do jogo, e não como instrução. As peças são texto livre vindo do aparelho.
  return [
    '<dados>',
    signo
      ? `Meio do céu: ${signo}${grau === null ? '' : ` (${grau}°)`}`
      : 'Meio do céu: não disponível (sem hora de nascimento)',
    v.comCasas === true ? 'Mapa com casas.' : 'Mapa SEM HORA DE NASCIMENTO: sem casas.',
    'Peças:',
    ...pecas.map((p) => `- ${p}`),
    '</dados>',
  ].join('\n');
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

function validarResultado(
  bruto: string,
  oraculo: Oraculo,
  posicoes: string[] = [],
): Record<string, unknown> {
  const limpo = bruto.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const dado = JSON.parse(limpo) as Record<string, unknown>;
  const saida: Record<string, unknown> = {};
  for (const campo of CAMPOS[oraculo]) {
    const valor = dado[campo];
    if (typeof valor !== 'string' || !valor.trim()) {
      throw new Error(`resposta sem o campo ${campo}`);
    }
    saida[campo] = valor.trim();
  }

  // Uma entrada por posição ENVIADA, e não por posição que a IA resolveu escrever.
  // Faltando alguma, a leitura é recusada aqui: é melhor pedir de novo do que mostrar
  // uma posição em branco no meio de uma tiragem que a pessoa montou com a mão.
  if (posicoes.length > 0) {
    const escritas = new Map<string, string>();
    for (const item of Array.isArray(dado.leituras) ? dado.leituras : []) {
      const i = item as Record<string, unknown>;
      const posicao = typeof i.posicao === 'string' ? i.posicao.trim() : '';
      const corpo = typeof i.texto === 'string' ? i.texto.trim() : '';
      if (posicao && corpo) escritas.set(posicao, corpo);
    }
    const faltando = posicoes.filter((p) => !escritas.has(p));
    if (faltando.length > 0) {
      throw new Error(`resposta sem as posições: ${faltando.join(', ')}`);
    }
    // Reordenadas pela tiragem: a tela mostra na ordem em que a pessoa distribuiu, não
    // na ordem em que o modelo escreveu.
    saida.leituras = posicoes.map((p) => ({ posicao: p, texto: escritas.get(p) }));
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
  // As posições enviadas viajam até a validação: é por elas que se confere se a IA
  // escreveu TODAS. Sem isso, uma Cruz Celta voltando com oito das dez posições
  // mostraria duas em branco na tela, e nada no servidor teria reclamado.
  let posicoesDaTiragem: string[] = [];
  try {
    if (oraculo === 'tarot') {
      const tarot = dadosDoTarot(body);
      dados = tarot.dados;
      posicoesDaTiragem = tarot.posicoes;
    } else if (oraculo === 'buzios') dados = dadosDosBuzios(body);
    else if (oraculo === 'vocacao') dados = dadosDaVocacao(body);
    else dados = dadosDoMapa(body);
  } catch (erro) {
    return resposta({ erro: erro instanceof Error ? erro.message : 'Dados incompletos' }, 400);
  }

  // Desde que o tarô responde à pergunta de frente, a intenção passa pela mesma triagem
  // da ia-pergunta. Uma resposta direta a "devo investir?" seria conselho financeiro, e
  // a alguém em crise as cartas não respondem: volta o telefone, antes da cota e antes
  // da IA, porque isso não é consulta e não pode custar uma.
  let avisoDaIntencao = '';
  if (oraculo === 'tarot') {
    const triagem = triar(typeof body.intencao === 'string' ? body.intencao : '');
    if (triagem.tipo === 'crise') {
      return resposta({
        titulo: 'Uma pausa antes das cartas',
        narrativa: RESPOSTA_CRISE,
        conselho: '',
        crise: true,
        oraculo,
      });
    }
    if (triagem.tipo === 'fora') avisoDaIntencao = `\n\n${AVISO_FORA[triagem.assunto]}`;
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

  // O crédito avulso é lido só para os dois produtos vendáveis: tarô e búzios
  // não estão à venda avulsa, e uma consulta a mais por leitura deles seria
  // custo sem uso.
  const busca = (oraculo === 'mapa' || oraculo === 'vocacao')
    ? await creditoDisponivel(supabaseAdmin, usuarioId, oraculo)
    : { estado: 'nao_tem' as const };

  const cobranca = decidirCobranca({
    semLimite,
    restantesDoPlano: restantes,
    temCreditoAvulso: busca.estado === 'tem',
  });

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

  // Falha ao LER o crédito não pode virar "compre": a pessoa pode já ter
  // comprado, e o `UNIQUE` é por sessão do Stripe, não por pessoa — nada
  // impediria a segunda compra. Só importa para quem seria barrado; quem tem
  // cota do plano passa de qualquer jeito.
  if (!cobranca.permitido && busca.estado === 'erro') {
    return resposta({ erro: 'Não foi possível conferir seu acesso agora. Tente de novo.' }, 503);
  }

  // A cota do período fica DEPOIS do veredito, e a ordem importa pelo mesmo motivo de
  // vencido vir antes de desligado em `decidirUso`. O webhook da Stripe zera
  // `consultas_restantes` E `plano_valido_ate` no mesmo update do cancelamento: com esta
  // checagem na frente, quem cancelou lia "suas consultas deste período acabaram" do
  // servidor e "seu acesso terminou" no semáforo da mesma tela — duas explicações para
  // uma pessoa, e a do servidor manda para o lugar errado. Vencimento responde primeiro.
  //
  // Quem barra é `cobranca`, e não a cota crua: o crédito avulso vale no lugar da cota,
  // então "sem cota" só barra quem também não tem crédito a gastar.
  if (!cobranca.permitido) {
    return resposta({ erro: 'Suas consultas deste período acabaram.', semConsultas: true }, 402);
  }

  // A leitura de vocação já escrita vem DEPOIS do veredito e da cota do período, ao
  // contrário da do mapa. A chave do mapa carrega a posição exata de dez corpos e quase
  // não se repete entre pessoas; a da vocação é grossa (signos e graus de poucas peças),
  // então o acerto entre pessoas diferentes é comum. Antes dos dois portões, uma leitura
  // guardada iria de graça a quem está com o plano vencido ou com a cota gasta — e esta
  // leitura é para quem paga. O acerto continua sem custar chamada, sem descontar consulta
  // e sem entrar no limite do dia: só deixa de passar por cima de quem não tem acesso.
  if (oraculo === 'vocacao') {
    // O prefixo entra no TEXTO que vira hash, e não na função: assim as chaves de
    // mapa já guardadas continuam valendo, e uma vocação nunca cai na linha de um
    // mapa. Trocar `chaveDoMapa` invalidaria o cache de todo mundo de uma vez.
    chave = await chaveDoMapa(`vocacao:${dados}`);
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

  // Reivindicar antes de gerar, e não depois: quem perde a corrida para aqui,
  // sem gastar chamada de IA. Os dois `return` de cache estão acima, então uma
  // releitura nunca chega a este ponto e nunca come a compra.
  //
  // `idReivindicado` é o crédito que ESTA execução reivindicou, e só ele autoriza a
  // devolução no `finally`: a devolução não confere de quem é o crédito, então
  // devolver um que não foi reivindicado aqui desfaria o gasto de outra requisição.
  let idReivindicado: number | null = null;
  if (cobranca.fonte === 'avulso' && busca.estado === 'tem') {
    const ganhou = await reivindicarCredito(supabaseAdmin, busca.id, chave);
    if (!ganhou) {
      return resposta({ erro: 'Esta leitura já está sendo gerada. Aguarde um instante.' }, 409);
    }
    idReivindicado = busca.id;
  }

  // Fica verdadeiro na última linha antes da resposta de sucesso. O `finally` o
  // consulta: toda outra saída do `try` — recusa do modelo, resposta cortada, fora do
  // formato, exceção — é uma leitura que não saiu.
  let leituraEntregue = false;
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
      system: INSTRUCOES_POR_ORACULO[oraculo] + avisoDaIntencao,
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
      interpretacao = validarResultado(saida, oraculo, posicoesDaTiragem);
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
    if ((oraculo === 'mapa' || oraculo === 'vocacao') && chave) {
      const { error: erroGuardar } = await supabaseAdmin
        .from('interpretacoes_mapa').insert({ chave, conteudo: interpretacao });
      if (erroGuardar) console.error('falha ao guardar interpretacao', erroGuardar.message);
    }

    // Só desconta depois que a leitura existe. O avulso já foi reivindicado antes de
    // gerar; aqui só resta o plano.
    if (cobranca.fonte === 'plano') {
      exigirEscrita('perfis.consultas_restantes', await supabaseAdmin
        .from('perfis').update({ consultas_restantes: restantes - 1 }).eq('id', usuarioId));
    }
    // O que sobra no PLANO depois desta leitura. Paga com crédito avulso, a cota do
    // plano não se mexeu: `restantes - 1` mostraria -1 a quem tem zero.
    const restantesDepois = cobranca.fonte === 'plano' ? restantes - 1 : restantes;
    // Os tokens da resposta vao para o contador: e o que faz a auditoria de custo
    // por plano (item 31) ser medida, em vez de estimada sobre media inventada.
    await registrarUso(supabaseAdmin, usuarioId, 'interpretacao', oraculo, {
      entrada: mensagem.usage?.input_tokens,
      saida: mensagem.usage?.output_tokens,
    });

    leituraEntregue = true;
    return resposta({
      ...interpretacao,
      oraculo,
      restantes: semLimite ? null : restantesDepois,
      uso: {
        entrada: mensagem.usage?.input_tokens ?? null,
        saida: mensagem.usage?.output_tokens ?? null,
      },
    });
  } catch (erro) {
    console.error('falha na interpretação', erro instanceof Error ? erro.message : erro);
    return resposta({ erro: 'Não foi possível aprofundar agora. Tente de novo.' }, 502);
  } finally {
    // A leitura não saiu, e o crédito já estava reivindicado. Sem devolver, a
    // pessoa perderia o que pagou por uma falha nossa. Fica aqui e não no `catch`
    // porque o `try` tem três saídas de falha que não passam por ele (recusa,
    // resposta cortada, fora do formato) — e uma saída nova também ficaria coberta.
    if (idReivindicado !== null && !leituraEntregue) {
      await devolverCredito(supabaseAdmin, idReivindicado);
    }
  }
});
