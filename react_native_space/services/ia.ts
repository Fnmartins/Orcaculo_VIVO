import type { TipoAnalise, AnaliseIA } from '../data/ia-analise';
import { obterBase64ImagemCache, limparImagemCache } from './imagemCache';
import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';

const MODELO_TEXTO = 'gpt-4o-mini';
export const IA_REMOTA_DISPONIVEL = false;

// ─────────────────────────────────────────────────────────────────────────────
// Verificação de API key
// ─────────────────────────────────────────────────────────────────────────────

function temChaveValida(): boolean {
  // O envio externo permanece desligado até existir consentimento explícito,
  // política de privacidade e proxy autenticado com controle de uso.
  return IA_REMOTA_DISPONIVEL;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chamada base à API (OpenAI-compatible)
// ─────────────────────────────────────────────────────────────────────────────

async function chamarIA(mensagens: object[], modelo: string): Promise<string> {
  void mensagens;
  void modelo;
  throw new Error('Aprofundamento por IA temporariamente indisponível.');
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
  // Na web a URI é `data:image/png;base64,...` e não tem extensão nenhuma —
  // olhar só o sufixo mandava tudo como jpeg.
  const doDataUrl = /^data:(image\/[a-z0-9.+-]+);/i.exec(uri);
  if (doDataUrl) return doDataUrl[1].toLowerCase();

  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.heic')) return 'image/heic';
  return 'image/jpeg';
}

// ─────────────────────────────────────────────────────────────────────────────
// Função principal — análise de imagem com IA real
// ─────────────────────────────────────────────────────────────────────────────

export type ProfundidadeAnalise = 'simples' | 'completa';

/** A cota do período acabou — é recusa de plano, não falha de serviço. */
export function ehSemConsultas(e: unknown): boolean {
  return (e as { name?: unknown } | null)?.name === 'SemConsultasError';
}

const COR_POR_TIPO: Record<TipoAnalise, string> = {
  cafe: '#8B4513',
  quiromancia: '#C0392B',
};

/**
 * Manda a foto para a Edge Function `ia-oraculo`, que fala com o modelo.
 *
 * Nada de chave aqui: o app é código que qualquer pessoa lê. E nada de cair no
 * texto pronto quando a chamada falha — era assim que a tela dizia "a IA
 * analisou" sobre um texto que não tinha olhado imagem nenhuma. Falhou, a
 * pessoa fica sabendo.
 */
export async function analisarImagemIA(
  imagemUri: string,
  tipo: TipoAnalise,
  profundidade: ProfundidadeAnalise = 'simples',
): Promise<AnaliseIA> {
  const imagemBase64 = obterBase64(imagemUri);
  const mediaType = detectarMimeType(imagemUri);

  const { data, error } = await supabase.functions.invoke('ia-oraculo', {
    body: { tipo, profundidade, imagemBase64, mediaType },
  });

  if (error) {
    const status = (error as { context?: { status?: number } } | null)?.context?.status;
    const traduzido = await erroDaFuncao(error);
    if (status === 402) {
      const semConsultas = new Error(traduzido.message);
      semConsultas.name = 'SemConsultasError';
      throw semConsultas;
    }
    throw traduzido;
  }

  const bruto = (data ?? {}) as Partial<AnaliseIA>;
  if (!bruto.titulo || !Array.isArray(bruto.detalhes) || bruto.detalhes.length === 0) {
    throw new Error('A leitura voltou incompleta. Tente de novo.');
  }

  return {
    tipo,
    titulo: bruto.titulo,
    resumo: bruto.resumo ?? '',
    detalhes: bruto.detalhes,
    energia: bruto.energia ?? 'neutra',
    // Cor é apresentação: fica no app, não vem do modelo.
    cor: COR_POR_TIPO[tipo],
  };
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

Tom: empático, poético e encorajador. Apresente passado, presente e futuro como perspectivas simbólicas e possibilidades condicionais, nunca como fatos inevitáveis. Preserve o livre-arbítrio e não faça diagnósticos ou recomendações médicas, legais ou financeiras. Seja específico e pessoal, não genérico.`;

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

  const prompt = `Você interpreta simbolicamente um jogo de búzios com respeito às tradições afro-brasileiras, sem se apresentar como sacerdote ou substituir uma consulta religiosa presencial.
O jogo revelou o ODU: ${odu.nome} (${odu.numero} búzios abertos).
Orixás regentes: ${odu.orixas.join(', ')}.
Significado base: ${odu.descricao}
Intenção do consulente: ${odu.intenção}

Crie uma interpretação PERSONALIZADA e PROFUNDA em Português Brasileiro.

Responda SOMENTE com JSON válido:
{"titulo":"título da revelação","narrativa":"leitura do odu aplicada à intenção (4-5 frases)","mensagem":"mensagem direta dos Orixás (2-3 frases)","conselho":"ação prática recomendada (2 frases)","afirmacao":"frase de axé para o consulente"}

Tom: respeitoso, profundo e acolhedor. Não invente fundamentos, rituais ou falas literais dos Orixás. Trate a leitura como orientação simbólica, sem certeza sobre o futuro, e não faça diagnósticos ou recomendações médicas, legais ou financeiras.`;

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

  const prompt = `Você oferece uma reflexão espiritual simbólica. ${contexto}\n\nForneça uma mensagem em Português Brasileiro, empática e encorajadora, em 2-4 frases. Não apresente previsões como fatos, preserve o livre-arbítrio e não faça diagnósticos ou recomendações médicas, legais ou financeiras.`;
  const mensagens = [{ role: 'user', content: prompt }];
  return chamarIA(mensagens, MODELO_TEXTO);
}
