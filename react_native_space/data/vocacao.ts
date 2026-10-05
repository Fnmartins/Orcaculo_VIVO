// data/vocacao.ts
//
// A seleção das peças que respondem por carreira. Puro: sem banco, sem HTTP e sem
// React, como `areas.ts`, porque é isso que deixa o Jest testar direto.
//
// Não calcula nada. O meio do céu vem pronto de `MapaAstral.angulos`, e as peças
// vêm da área Trabalho que `data/areas.ts` já resolve — inclusive o regente da casa
// 10 e onde ele mora. Cálculo novo aqui seria uma segunda verdade sobre o mesmo céu.

import {
  AREAS, areasDaVida, pecaDaCasa, pecaDoCorpo, pecasDosAspectos,
  type AreaDaVida, type EntradaAreas, type PecaDaArea,
} from './areas';
import type { Corpo } from './efemerides';
import { signoDoGrau } from './efemerides';

export interface EntradaVocacao extends EntradaAreas {
  /** Longitude do meio do céu, ou nulo quando não há hora de nascimento. */
  meioCeu: number | null;
}

export interface MeioDoCeu {
  signo: string;
  /** Grau dentro do signo, de 0 a 29. */
  grau: number;
}

/**
 * Por que ESTAS peças respondem por carreira.
 *
 * A vocação tem a frase dela, e não a da área Trabalho, desde 05/10/2026. A da área
 * diz "Saturno responde pelo esforço e pela autoridade, Marte pela iniciativa" — que
 * continua certo LÁ, na tela do mapa astral, onde a área é mesmo Saturno e Marte. Mas
 * aqui ela explicava à pessoa um modelo que não é o que a leitura dela usou: desde que
 * Mercúrio, Vênus e a casa 2 entraram, a tela prometia menos do que entregava. Visto
 * numa leitura real, em produção.
 *
 * Fica aqui, e não no prompt, pelo mesmo motivo que a frase da área fica em
 * `areas.ts`: é texto de tela, revisável por quem entende de astrologia sem caçar
 * string no meio do código.
 */
export const PORQUE_DA_VOCACAO = 'O meio do céu e a casa 10 são a carreira e o que '
  + 'você constrói à vista; a 6 é a rotina de quem faz; a casa 2, o que você tem a '
  + 'oferecer. Mercúrio e Vênus são os planetas do ofício — como você pensa e o que '
  + 'você valoriza; Saturno responde pelo esforço e pela autoridade, Marte pela '
  + 'iniciativa.';

export interface Vocacao {
  /**
   * Nulo sem hora de nascimento: sem horizonte não há meridiano. É justamente o
   * meio do céu que a parte grátis mostra, então a tela precisa tratar o nulo.
   */
  meioDoCeu: MeioDoCeu | null;
  /** A área Trabalho: casas 10 e 6, Saturno e Marte, com as peças já resolvidas. */
  trabalho: AreaDaVida;
  /** Por que estas peças. É `PORQUE_DA_VOCACAO`, e não o `porque` da área. */
  porque: string;
  /** Falso sem hora: a leitura sai só dos planetas, e a tela tem de dizer isso. */
  comCasas: boolean;
}

/**
 * As casas da vocação, da principal para a secundária.
 *
 * A 10 e a 6 vêm da área Trabalho. A **2** é acréscimo desta leitura: em toda escola
 * vocacional moderna ela é a terceira casa do assunto — os dons que a pessoa tem e o
 * que consegue ganhar com eles. Ela NÃO entra na área Trabalho compartilhada porque
 * já é da área Dinheiro, e apareceria duas vezes na tela do mapa astral.
 */
const CASAS_DA_VOCACAO = [10, 6, 2];

/**
 * Os corpos da vocação.
 *
 * Saturno e Marte vêm da área Trabalho. **Mercúrio e Vênus** são acréscimo desta
 * leitura, e fecham um buraco que ninguém tinha decidido deixar: em Ptolomeu os
 * planetas do ofício são exatamente três — Mercúrio, Vênus e Marte —, e nós tínhamos
 * herdado da área Trabalho uma lista com Marte e Saturno, sem os outros dois.
 * Mercúrio é o significador de carreira mais citado da doutrina.
 *
 * Também melhora o caso sem hora: sem casas, a leitura saía com dois planetas; agora
 * sai com quatro.
 */
const CORPOS_DA_VOCACAO: Corpo[] = ['mercurio', 'venus', 'saturno', 'marte'];

export function montarVocacao(entrada: EntradaVocacao): Vocacao {
  const trabalho = areasDaVida(entrada).find((area) => area.id === 'trabalho');
  // Lançar, e não devolver vazio: se a área sumir de `AREAS`, a vocação inteira
  // perde o assunto, e uma leitura vazia chegaria à tela sem ninguém notar.
  if (!trabalho) throw new Error('A área Trabalho sumiu de data/areas.ts');
  const definicao = AREAS.find((area) => area.id === 'trabalho');
  if (!definicao) throw new Error('A definição de Trabalho sumiu de data/areas.ts');

  // As peças são remontadas aqui, e não acrescentadas às da área, para a ordem ser a
  // da leitura: as casas, depois os planetas, e os aspectos por último. O filtro dos
  // aspectos continua sendo o da área Trabalho — ver `pecasDosAspectos`.
  const pecas: PecaDaArea[] = [
    ...CASAS_DA_VOCACAO.map((numero) => pecaDaCasa(numero, entrada)),
    ...CORPOS_DA_VOCACAO.map((corpo) => pecaDoCorpo(corpo, entrada)),
  ].filter((peca): peca is PecaDaArea => peca !== null);
  pecas.push(...pecasDosAspectos(definicao, entrada));

  return {
    meioDoCeu: entrada.meioCeu === null
      ? null
      : { signo: signoDoGrau(entrada.meioCeu).nome, grau: Math.floor(entrada.meioCeu % 30) },
    trabalho: { ...trabalho, pecas },
    porque: PORQUE_DA_VOCACAO,
    comCasas: trabalho.comCasas,
  };
}
