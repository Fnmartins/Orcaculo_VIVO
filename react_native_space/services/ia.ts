import type { TipoAnalise, AnaliseIA } from '../data/ia-analise';
import { analisarImagem as analisarImagemMock } from '../data/ia-analise';
import { obterBase64ImagemCache, limparImagemCache } from './imagemCache';

const BASE_URL = 'https://apps.abacus.ai/api/v0';
const CHAVE_API = process.env.EXPO_PUBLIC_ABACUS_API_KEY ?? '';

const MODELO_VISAO = 'claude-3-5-sonnet';
const MODELO_TEXTO = 'gpt-4o-mini';

// ─────────────────────────────────────────────────────────────────────────────
// Verificação de API key
// ─────────────────────────────────────────────────────────────────────────────

function temChaveValida(): boolean {
  return CHAVE_API.length > 0 && !CHAVE_API.includes('SUA_CHAVE');
}

// ─────────────────────────────────────────────────────────────────────────────
// Chamada base à API (OpenAI-compatible)
// ─────────────────────────────────────────────────────────────────────────────

async function chamarIA(mensagens: object[], modelo: string): Promise<string> {
  const resposta = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHAVE_API}`,
    },
    body: JSON.stringify({
      model: modelo,
      messages: mensagens,
      max_tokens: 1200,
      temperature: 0.85,
    }),
  });

  if (!resposta.ok) {
    const erro = await resposta.text();
    throw new Error(`Erro da API (${resposta.status}): ${erro}`);
  }

  const dados = await resposta.json();
  const conteudo = dados?.choices?.[0]?.message?.content;
  if (!conteudo) throw new Error('Resposta vazia da API');
  return conteudo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtenção de Base64 da imagem (via cache do picker)
// ─────────────────────────────────────────────────────────────────────────────

function obterBase64(uri: string): string {
  const base64 = obterBase64ImagemCache(uri);
  if (!base64) throw new Error('Base64 não disponível no cache — capture a imagem novamente.');
  limparImagemCache(uri);
  return base64;
}

function detectarMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompts por tipo
// ─────────────────────────────────────────────────────────────────────────────

const PROMPTS: Record<TipoAnalise, string> = {
  cafe: `Você é um especialista em tasseografia (leitura de borra de café). 
Analise cuidadosamente a imagem fornecida — é o fundo de uma xícara com borra de café.
Identifique formas, padrões e símbolos visíveis e forneça uma leitura espiritual personalizada em Português Brasileiro.

Responda SOMENTE com JSON válido, sem texto antes ou depois, no seguinte formato:
{"titulo":"título poético da leitura","resumo":"resumo da mensagem em 2 frases","detalhes":[{"secao":"Formas Identificadas","texto":"descrição das formas e o que representam"},{"secao":"Interpretação Espiritual","texto":"mensagem espiritual personalizada"},{"secao":"Conselho","texto":"orientação prática para os próximos dias"},{"secao":"Afirmação","texto":"frase de poder para o usuário carregar consigo"}],"energia":"positiva"}

Regras: energia pode ser "positiva", "neutra" ou "atencao". Tom místico, empático e encorajador.`,

  quiromancia: `Você é um quiromante experiente especializado em leitura de palma.
Analise cuidadosamente a imagem da mão fornecida — observe as linhas principais, montes e textura.
Forneça uma leitura espiritual personalizada em Português Brasileiro.

Responda SOMENTE com JSON válido, sem texto antes ou depois, no seguinte formato:
{"titulo":"título poético da leitura","resumo":"resumo da mensagem em 2 frases","detalhes":[{"secao":"Linha da Vida","texto":"interpretação da linha da vida"},{"secao":"Linha do Coração","texto":"interpretação da linha do coração"},{"secao":"Linha da Cabeça","texto":"interpretação da linha da cabeça"},{"secao":"Conselho","texto":"orientação espiritual personalizada"}],"energia":"positiva"}

Regras: energia pode ser "positiva", "neutra" ou "atencao". Tom profundo, místico e encorajador.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Função principal — análise de imagem com IA real
// ─────────────────────────────────────────────────────────────────────────────

export async function analisarImagemIA(
  imagemUri: string,
  tipo: TipoAnalise
): Promise<AnaliseIA> {
  if (!temChaveValida()) {
    return analisarImagemMock(tipo);
  }

  try {
    const base64 = obterBase64(imagemUri);
    const mimeType = detectarMimeType(imagemUri);

    const mensagens = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64}`,
            },
          },
          {
            type: 'text',
            text: PROMPTS[tipo],
          },
        ],
      },
    ];

    const resposta = await chamarIA(mensagens, MODELO_VISAO);

    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON não encontrado na resposta');

    const dados = JSON.parse(jsonMatch[0]);

    const analise: AnaliseIA = {
      tipo,
      titulo: dados.titulo ?? 'Sua Leitura',
      resumo: dados.resumo ?? '',
      detalhes: Array.isArray(dados.detalhes) ? dados.detalhes : [],
      energia: (['positiva', 'neutra', 'atencao'].includes(dados.energia)
        ? dados.energia
        : 'positiva') as AnaliseIA['energia'],
      cor: tipo === 'cafe' ? '#8B4513' : '#E74C3C',
    };

    return analise;
  } catch (erro) {
    console.warn('[IA] Falha na análise de imagem, usando fallback:', erro);
    return analisarImagemMock(tipo);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Interpretação de Tarot por IA
// ─────────────────────────────────────────────────────────────────────────────

export interface InterpretacaoTarot {
  titulo: string;
  narrativa: string;
  passado: string;
  presente: string;
  futuro: string;
  conselho: string;
}

export async function gerarInterpretacaoTarot(cartas: {
  nome: string;
  posicao: string;
  significado: string;
}[]): Promise<InterpretacaoTarot> {
  if (!temChaveValida()) throw new Error('Chave não configurada');

  const descricaoCartas = cartas
    .map(c => `- ${c.posicao}: ${c.nome} (${c.significado})`)
    .join('\n');

  const prompt = `Você é um tarólOgo experiente e empático. O usuário tirou 3 cartas:

${descricaoCartas}

Crie uma interpretação PERSONALIZADA e FLUÍDA em Português Brasileiro que conecte as 3 cartas numa narrativa coerente.

Responda SOMENTE com JSON válido:
{"titulo":"título da leitura","narrativa":"parágrafo geral conectando as 3 cartas (4-6 frases)","passado":"interpretação aprofundada do passado (2-3 frases)","presente":"interpretação aprofundada do presente (2-3 frases)","futuro":"interpretação aprofundada do futuro (2-3 frases)","conselho":"conselho prático e espiritual (2 frases)"}

Tom: empático, poético, encorajador. Seja específico e pessoal, não genérico.`;

  const mensagens = [{ role: 'user', content: prompt }];
  const resposta = await chamarIA(mensagens, MODELO_TEXTO);

  const jsonMatch = resposta.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON inválido');
  return JSON.parse(jsonMatch[0]) as InterpretacaoTarot;
}

// ─────────────────────────────────────────────────────────────────────────────
// Interpretação de Búzios por IA
// ─────────────────────────────────────────────────────────────────────────────

export interface InterpretacaoBuzios {
  titulo: string;
  narrativa: string;
  mensagem: string;
  conselho: string;
  afirmacao: string;
}

export async function gerarInterpretacaoBuzios(odu: {
  nome: string;
  numero: number;
  descricao: string;
  orixas: string[];
  intenção: string;
}): Promise<InterpretacaoBuzios> {
  if (!temChaveValida()) throw new Error('Chave não configurada');

  const prompt = `Você é um pai/mãe de santo especialista em jogo de búzios.
O jogo revelou o ODU: ${odu.nome} (${odu.numero} búzios abertos).
Orixás regentes: ${odu.orixas.join(', ')}.
Significado base: ${odu.descricao}
Intenção do consulente: ${odu.intenção}

Crie uma interpretação PERSONALIZADA e PROFUNDA em Português Brasileiro.

Responda SOMENTE com JSON válido:
{"titulo":"título da revelação","narrativa":"leitura do odu aplicada à intenção (4-5 frases)","mensagem":"mensagem direta dos Orixás (2-3 frases)","conselho":"ação prática recomendada (2 frases)","afirmacao":"frase de axé para o consulente"}

Tom: respeitoso, profundo, sagrado. Misture referências ao candomblé com linguagem acessível.`;

  const mensagens = [{ role: 'user', content: prompt }];
  const resposta = await chamarIA(mensagens, MODELO_TEXTO);

  const jsonMatch = resposta.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON inválido');
  return JSON.parse(jsonMatch[0]) as InterpretacaoBuzios;
}

// ─────────────────────────────────────────────────────────────────────────────
// Texto livre para qualquer consulta
// ─────────────────────────────────────────────────────────────────────────────

export async function gerarMensagemEspiritual(contexto: string): Promise<string> {
  if (!temChaveValida()) return '';

  const prompt = `Você é um oráculo espiritual. ${contexto}\n\nForneça uma mensagem espiritual em Português Brasileiro, empática e encorajadora, em 2-4 frases.`;
  const mensagens = [{ role: 'user', content: prompt }];
  return chamarIA(mensagens, MODELO_TEXTO);
}
