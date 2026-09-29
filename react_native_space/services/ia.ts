import type { TipoAnalise, AnaliseIA } from '../data/ia-analise';
import { obterImagem } from './imagemCache';
import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';

/**
 * Liga o bloco "Aprofundar com IA" nas telas de tarô e búzios.
 *
 * Ficou `false` enquanto o envio externo não tinha as três coisas que o
 * comentário original exigia: consentimento explícito, o que está na Política,
 * e um proxy autenticado com controle de uso — hoje as Edge Functions
 * ia-oraculo e ia-interpretacao, que guardam a chave e descontam a cota.
 */
export const IA_REMOTA_DISPONIVEL = true;

// ─────────────────────────────────────────────────────────────────────────────
// Obtenção de Base64 da imagem (via cache do picker)
// ─────────────────────────────────────────────────────────────────────────────

function obterBase64(imagemId: string): { base64: string; uri: string } {
  const imagem = obterImagem(imagemId);
  // Sem apagar aqui: a tela de resultado ainda mostra a foto, e apagar depois
  // de analisar deixava o resultado sem imagem.
  if (!imagem) throw new Error('A imagem não está mais disponível. Capture de novo.');
  return imagem;
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
  imagemId: string,
  tipo: TipoAnalise,
  profundidade: ProfundidadeAnalise = 'simples',
): Promise<AnaliseIA> {
  // Recebe o identificador, não a foto: imagem em parâmetro de rota vira uma
  // URL de megabytes e a navegação morre em silêncio (ver services/imagemCache).
  const { base64: imagemBase64, uri } = obterBase64(imagemId);
  const mediaType = detectarMimeType(uri);

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

/** Mesma tradução da análise de imagem: cota esgotada não é falha de serviço. */
async function erroDeInterpretacao(error: unknown): Promise<Error> {
  const status = (error as { context?: { status?: number } } | null)?.context?.status;
  const traduzido = await erroDaFuncao(error);
  if (status === 402) {
    const semConsultas = new Error(traduzido.message);
    semConsultas.name = 'SemConsultasError';
    return semConsultas;
  }
  return traduzido;
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

/**
 * Aprofunda a tiragem de tarô. O prompt vive na Edge Function: se ele viesse
 * daqui, qualquer pessoa usaria a chave paga do projeto para gerar o que
 * quisesse. O app manda só as cartas sorteadas.
 */
export async function gerarInterpretacaoTarot(cartas: {
  nome: string;
  posicao: string;
  significado: string;
}[]): Promise<InterpretacaoTarot> {
  const { data, error } = await supabase.functions.invoke('ia-interpretacao', {
    body: { oraculo: 'tarot', cartas },
  });
  if (error) throw await erroDeInterpretacao(error);

  const bruto = (data ?? {}) as Partial<InterpretacaoTarot>;
  if (!bruto.titulo || !bruto.narrativa) {
    throw new Error('A interpretação voltou incompleta. Tente de novo.');
  }
  return {
    titulo: bruto.titulo,
    narrativa: bruto.narrativa,
    passado: bruto.passado ?? '',
    presente: bruto.presente ?? '',
    futuro: bruto.futuro ?? '',
    conselho: bruto.conselho ?? '',
  };
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

// ─────────────────────────────────────────────────────────────────────────────
// Leitura do Mapa Astral por IA
// ─────────────────────────────────────────────────────────────────────────────

export interface InterpretacaoMapa {
  titulo: string;
  narrativa: string;
  forca: string;
  tensao: string;
  conselho: string;
  /**
   * As quatro áreas da vida, na versão básica: escritas a partir de Sol, Lua e
   * Ascendente. A versão completa, que usa as casas e os planetas de cada área,
   * ficou no roadmap para depois.
   *
   * Opcionais porque leituras geradas antes destes campos existirem não os
   * têm — e a tela precisa continuar abrindo com elas.
   */
  amor?: string;
  trabalho?: string;
  dinheiro?: string;
  /**
   * Direção, não previsão. O mapa natal não sabe quando: quem sabe de tempo é
   * trânsito, que este app não calcula. Chamar de "futuro" faria a pessoa
   * esperar data e receber tema — e sair achando que foi enrolada.
   */
  caminho?: string;
}

export interface PosicaoParaIA {
  nome: string;
  signo: string;
  retrogrado?: boolean;
  /** O grau dentro do signo. Sem ele, "Mercúrio em Escorpião" perde precisão. */
  grau?: number;
  /** Em que casa o planeta caiu. Ausente quando não há hora de nascimento. */
  casa?: number;
}

/** Uma conversa entre dois pontos do mapa, já resolvida em palavras. */
export interface AspectoParaIA {
  /** Ex.: "Sol em quadratura com Saturno". */
  texto: string;
  natureza: 'harmonico' | 'tenso' | 'neutro';
}

export interface MapaParaIA {
  sol: { signo: string; grau: number };
  lua: { signo: string; grau: number };
  /** Ausente quando a pessoa não sabe a hora de nascimento. */
  ascendente?: { signo: string; grau: number };
  planetas: PosicaoParaIA[];
  elementoDominante: string;
  qualidadeDominante: string;
  elementoAusente?: string;
  regente?: string;
  /**
   * As casas, quando existem: o que cada uma governa e o signo da cúspide.
   *
   * Calculávamos as doze e não contávamos nenhuma para quem escreve o texto —
   * era por isso que a leitura saía servindo para qualquer pessoa.
   */
  casas?: { numero: number; signo: string; area: string; corpos: string[] }[];
  /**
   * Os aspectos mais fortes, já em palavras. Só os mais exatos: um mapa produz
   * dezenas, e mandar todos afoga o que importa.
   */
  aspectos?: AspectoParaIA[];
}

/**
 * Lê a combinação do mapa — o que Sol, Lua e Ascendente fazem juntos nesta
 * pessoa. O que cada peça significa já está escrito na tela
 * (`data/textos-mapa.ts`), e é revisável; o que a IA escreve é só a combinação.
 *
 * Sobem as posições já calculadas, nunca data, hora ou cidade de nascimento:
 * as efemérides rodam no aparelho, e o dado pessoal não precisa viajar.
 */
export async function gerarInterpretacaoMapa(mapa: MapaParaIA): Promise<InterpretacaoMapa> {
  const { data, error } = await supabase.functions.invoke('ia-interpretacao', {
    body: { oraculo: 'mapa', mapa },
  });
  if (error) throw await erroDeInterpretacao(error);

  const bruto = (data ?? {}) as Partial<InterpretacaoMapa>;
  if (!bruto.titulo || !bruto.narrativa) {
    throw new Error('A leitura voltou incompleta. Tente de novo.');
  }
  return {
    titulo: bruto.titulo,
    narrativa: bruto.narrativa,
    forca: bruto.forca ?? '',
    tensao: bruto.tensao ?? '',
    conselho: bruto.conselho ?? '',
  };
}

/** Aprofunda o jogo de búzios. Como no tarô, o prompt fica na function. */
export async function gerarInterpretacaoBuzios(odu: {
  nome: string;
  numero: number;
  descricao: string;
  orixas: string[];
  intencao: string;
}): Promise<InterpretacaoBuzios> {
  const { data, error } = await supabase.functions.invoke('ia-interpretacao', {
    body: { oraculo: 'buzios', odu },
  });
  if (error) throw await erroDeInterpretacao(error);

  const bruto = (data ?? {}) as Partial<InterpretacaoBuzios>;
  if (!bruto.titulo || !bruto.narrativa) {
    throw new Error('A interpretação voltou incompleta. Tente de novo.');
  }
  return {
    titulo: bruto.titulo,
    narrativa: bruto.narrativa,
    mensagem: bruto.mensagem ?? '',
    conselho: bruto.conselho ?? '',
    afirmacao: bruto.afirmacao ?? '',
  };
}
