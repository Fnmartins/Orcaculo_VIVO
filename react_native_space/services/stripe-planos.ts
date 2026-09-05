export type MoedaSuportada = 'brl' | 'usd' | 'eur' | 'cad';
export const MOEDAS_SUPORTADAS: MoedaSuportada[] = ['brl', 'usd', 'eur', 'cad'];

export type PlanoIdStripe = 'iniciante' | 'explorador' | 'mestre';

export interface PlanoStripe {
  id: PlanoIdStripe;
  nome: string;
  cotaConsultas: number;
  /** Apenas EXIBIÇÃO. A cobrança real usa o Price da Stripe. */
  precos: Record<MoedaSuportada, number>;
}

// ⚠️ Valores não-BRL são PROVISÓRIOS: devem ser iguais aos currency_options
// configurados na Stripe. Confirmar com o Fabiano antes do go-live.
export const PLANOS_STRIPE: PlanoStripe[] = [
  { id: 'iniciante',  nome: 'Iniciante',  cotaConsultas: 4,
    precos: { brl: 29.9,  usd: 6.9,  eur: 6.9,  cad: 8.9 } },
  { id: 'explorador', nome: 'Explorador', cotaConsultas: 999,
    precos: { brl: 79.9,  usd: 16.9, eur: 16.9, cad: 21.9 } },
  { id: 'mestre',     nome: 'Mestre',     cotaConsultas: 999,
    precos: { brl: 199.9, usd: 39.9, eur: 39.9, cad: 54.9 } },
];

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

const SIMBOLO: Record<MoedaSuportada, string> = {
  brl: 'R$', usd: 'US$', eur: '€', cad: 'C$',
};

export function formatarPreco(valor: number, moeda: MoedaSuportada): string {
  const usaVirgula = moeda === 'brl' || moeda === 'eur';
  const numero = valor.toFixed(2).replace('.', usaVirgula ? ',' : '.');
  return `${SIMBOLO[moeda]} ${numero}`;
}
