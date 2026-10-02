/**
 * As decisões do rito do tarô, sem tela.
 *
 * Moram aqui, puras e sem React, porque é o sorteio que faz o produto ser honesto —
 * e sorteio dentro de componente é sorteio que ninguém testa. A animação mostra o que
 * estas funções decidiram; nenhuma delas é chamada por um efeito visual.
 */

/**
 * Fisher-Yates. O que havia antes era `sort(() => Math.random() - 0.5)`, que **não**
 * produz permutação uniforme: o comparador é inconsistente, o resultado depende do
 * algoritmo de ordenação, e algumas cartas saem menos que outras sem nada avisar.
 */
export function embaralhar<T>(lista: readonly T[]): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Um item ao acaso, com a mesma chance para todos. */
export function sortearUm<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * O corte: tudo da ponta até `indice`, inclusive, sai como monte.
 *
 * Sempre sobra ao menos uma carta no resto. Um corte que levasse o leque inteiro
 * deixaria a pessoa sem onde cortar de novo, e o rito travaria sem dizer por quê.
 */
export function cortar<T>(leque: readonly T[], indice: number): { monte: T[]; resto: T[] } {
  const limite = Math.max(0, Math.min(indice, leque.length - 2));
  return { monte: leque.slice(0, limite + 1), resto: leque.slice(limite + 1) };
}

/**
 * Os montes voltam na ordem em que saíram, e o que restou do leque vai por cima.
 *
 * **Não embaralha, de propósito.** Embaralhar aqui apagaria os cortes da pessoa: o
 * rito inteiro viraria encenação sobre uma ordem decidida em outro lugar.
 */
export function recolher<T>(montes: readonly T[][], leque: readonly T[]): T[] {
  return montes.reduce<T[]>((tudo, monte) => tudo.concat(monte), []).concat(leque);
}
