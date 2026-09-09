export type MoedaSuportada = 'brl' | 'usd' | 'eur' | 'cad';
export const MOEDAS_SUPORTADAS: MoedaSuportada[] = ['brl', 'usd', 'eur', 'cad'];

export type PlanoIdStripe = 'iniciante' | 'explorador' | 'mestre';

// Nome de exibição (estático). Preço e cota vêm do banco (config_planos) via
// services/configPlanos.ts — editáveis pelo painel /manager sem redeploy.
export const NOMES_PLANOS: Record<PlanoIdStripe, string> = {
  iniciante: 'Iniciante',
  explorador: 'Explorador',
  mestre: 'Mestre',
};

export function moedaPadrao(locale?: string): MoedaSuportada {
  const bruto = locale ?? (typeof navigator !== 'undefined' ? navigator.language : '') ?? '';
  const l = bruto.toLowerCase();
  if (l.includes('-br') || l === 'pt') return 'brl';
  if (l.includes('-ca')) return 'cad';
  if (l.startsWith('en') || l.includes('-us')) return 'usd';
  if (/-(de|fr|es|it|pt|ie|nl|at|be|fi|gr)\b/.test(l) ||
      ['de', 'fr', 'es', 'it', 'nl'].includes(l)) return 'eur';
  return 'brl';
}

export const SIMBOLO: Record<MoedaSuportada, string> = {
  brl: 'R$', usd: 'US$', eur: '€', cad: 'C$',
};

export function formatarPreco(valor: number, moeda: MoedaSuportada): string {
  const usaVirgula = moeda === 'brl' || moeda === 'eur';
  const numero = valor.toFixed(2).replace('.', usaVirgula ? ',' : '.');
  return `${SIMBOLO[moeda]} ${numero}`;
}
