import type { TipoAnalise, AnaliseIA } from '../data/ia-analise';
import type { PosicaoChave } from '../data/tarot';
import { obterImagem } from './imagemCache';
import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';
import { NOME_SEM_CONSULTAS } from './falhaDaIA';

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

// A implementação mora em `falhaDaIA`, que não importa o Supabase e por isso é
// alcançável por teste puro. Reexportado daqui para quem já importava — hoje
// `app/ia/processando.tsx` — não ter de mudar.
export { ehSemConsultas } from './falhaDaIA';

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
      semConsultas.name = NOME_SEM_CONSULTAS;
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
    semConsultas.name = NOME_SEM_CONSULTAS;
    return semConsultas;
  }
  return traduzido;
}

// ─────────────────────────────────────────────────────────────────────────────
// Interpretação de Tarot por IA
// ─────────────────────────────────────────────────────────────────────────────

export interface LeituraDePosicao {
  posicao: string;
  texto: string;
}

export interface InterpretacaoTarot {
  titulo: string;
  /**
   * A resposta da taróloga à pergunta — escrita, ou a que a pessoa trouxe em mente.
   * Opcional porque as leituras salvas antes dela não a têm e precisam continuar abrindo.
   */
  resposta?: string;
  narrativa: string;
  conselho: string;
  /** Uma por posição da tiragem, na ordem em que a pessoa distribuiu. */
  leituras?: LeituraDePosicao[];
  // As três abaixo são o formato antigo, de quando a tiragem era sempre Passado /
  // Presente / Futuro. Continuam aqui porque `consultas.resultado` guarda o objeto
  // inteiro: as leituras já salvas vieram assim e precisam continuar abrindo.
  passado?: string;
  presente?: string;
  futuro?: string;
}

/**
 * Aprofunda a tiragem de tarô. O prompt vive na Edge Function: se ele viesse
 * daqui, qualquer pessoa usaria a chave paga do projeto para gerar o que
 * quisesse. O app manda só as cartas sorteadas.
 */
export interface CartaParaLeitura {
  nome: string;
  posicao: string;
  /** A pergunta que a posição faz. É dela que sai a leitura, não da carta sozinha. */
  regra?: string;
  /** Qual das quatro posições-chave esta posição é, quando é alguma. */
  chave?: PosicaoChave;
  significado: string;
  invertida?: boolean;
  /** Âncora curta: é o que impede a IA de divagar sobre o que a carta significa. */
  palavrasChave?: string[];
  frasesChave?: string[];
  /** A nota desta carta para esta posição, quando o conteúdo já existir. */
  nota?: string;
}

export async function gerarInterpretacaoTarot(
  cartas: CartaParaLeitura[],
  /** O que a pessoa escreveu antes de cortar o baralho. Vazio quando não escreveu. */
  intencao = '',
): Promise<InterpretacaoTarot> {
  const { data, error } = await supabase.functions.invoke('ia-interpretacao', {
    body: { oraculo: 'tarot', cartas, intencao: intencao.trim() },
  });
  if (error) throw await erroDeInterpretacao(error);

  const bruto = (data ?? {}) as Partial<InterpretacaoTarot>;
  if (!bruto.titulo || !bruto.narrativa) {
    throw new Error('A interpretação voltou incompleta. Tente de novo.');
  }
  // Campo a campo, e por isso cada campo novo precisa ser acrescentado aqui: foi
  // esquecer exatamente isto que fez as quatro áreas do mapa chegarem do servidor e
  // morrerem aqui, um dia inteiro, sem erro nenhum.
  return {
    titulo: bruto.titulo,
    ...(bruto.resposta ? { resposta: bruto.resposta } : {}),
    narrativa: bruto.narrativa,
    conselho: bruto.conselho ?? '',
    ...(bruto.leituras ? { leituras: bruto.leituras } : {}),
    ...(bruto.passado ? { passado: bruto.passado } : {}),
    ...(bruto.presente ? { presente: bruto.presente } : {}),
    ...(bruto.futuro ? { futuro: bruto.futuro } : {}),
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
   * As quatro áreas da vida, escritas a partir das casas e dos planetas de cada
   * assunto (`data/areas.ts`).
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
  /**
   * As quatro áreas com as peças de mapa de cada uma (`data/areas.ts`).
   *
   * Sem isto, quem escreve recebia o mapa inteiro e quatro títulos, e o texto de
   * amor saía do mesmo lugar que o de dinheiro. Com isto, cada área chega com a
   * casa dela, o regente dela e os planetas dela — as mesmas peças que a tela
   * mostra ao lado do texto, para a pessoa poder conferir de onde veio.
   */
  areas?: AreaParaIA[];
}

/** Uma área da vida, com as peças do mapa que respondem por ela. */
export interface AreaParaIA {
  id: string;
  titulo: string;
  /** Falso quando não há hora de nascimento: sem casas, a área é a básica. */
  comCasas: boolean;
  /** Cada peça em uma linha: "Casa 7 — Relacionamentos: começa em Libra…". */
  pecas: string[];
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
    // As quatro áreas vinham da function, e morriam aqui: este objeto era
    // montado campo por campo e não as copiava. A tela esconde bloco sem texto,
    // então elas simplesmente não apareciam — sem erro, sem log, sem nada.
    // Copiar campo por campo é o que deixou o defeito passar; é por isso que o
    // teste em `services/__tests__/ia.test.ts` cobre cada campo declarado.
    amor: bruto.amor,
    trabalho: bruto.trabalho,
    dinheiro: bruto.dinheiro,
    caminho: bruto.caminho,
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
