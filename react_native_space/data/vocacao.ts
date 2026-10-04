// data/vocacao.ts
//
// A seleção das peças que respondem por carreira. Puro: sem banco, sem HTTP e sem
// React, como `areas.ts`, porque é isso que deixa o Jest testar direto.
//
// Não calcula nada. O meio do céu vem pronto de `MapaAstral.angulos`, e as peças
// vêm da área Trabalho que `data/areas.ts` já resolve — inclusive o regente da casa
// 10 e onde ele mora. Cálculo novo aqui seria uma segunda verdade sobre o mesmo céu.

import { areasDaVida, type AreaDaVida, type EntradaAreas } from './areas';
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

export interface Vocacao {
  /**
   * Nulo sem hora de nascimento: sem horizonte não há meridiano. É justamente o
   * meio do céu que a parte grátis mostra, então a tela precisa tratar o nulo.
   */
  meioDoCeu: MeioDoCeu | null;
  /** A área Trabalho: casas 10 e 6, Saturno e Marte, com as peças já resolvidas. */
  trabalho: AreaDaVida;
  /** Falso sem hora: a leitura sai só dos planetas, e a tela tem de dizer isso. */
  comCasas: boolean;
}

export function montarVocacao(entrada: EntradaVocacao): Vocacao {
  const trabalho = areasDaVida(entrada).find((area) => area.id === 'trabalho');
  // Lançar, e não devolver vazio: se a área sumir de `AREAS`, a vocação inteira
  // perde o assunto, e uma leitura vazia chegaria à tela sem ninguém notar.
  if (!trabalho) throw new Error('A área Trabalho sumiu de data/areas.ts');

  return {
    meioDoCeu: entrada.meioCeu === null
      ? null
      : { signo: signoDoGrau(entrada.meioCeu).nome, grau: Math.floor(entrada.meioCeu % 30) },
    trabalho,
    comCasas: trabalho.comCasas,
  };
}
