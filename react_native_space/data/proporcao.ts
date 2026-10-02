// data/proporcao.ts
import type { CartaTarot } from './tarot';

/**
 * Quantos Maiores e quantos Menores saíram.
 *
 * Devolve `null` quando não há os dois tipos em jogo: enquanto o baralho forem só os 22
 * Maiores, dizer "todas Maiores" em toda leitura é ruído que a IA repetiria como se
 * fosse achado. A conta fica pronta aqui e passa a valer sozinha quando os 56 Menores
 * chegarem (Fase 3).
 */
export function proporcaoDeMaiores(
  cartas: CartaTarot[],
): { maiores: number; menores: number } | null {
  const menores = cartas.filter((c) => Boolean(c.naipe)).length;
  const maiores = cartas.length - menores;
  if (maiores === 0 || menores === 0) return null;
  return { maiores, menores };
}
