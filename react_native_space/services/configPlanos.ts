import { supabase } from './supabase';
import {
  MOEDAS_SUPORTADAS, NOMES_PLANOS,
  type MoedaSuportada, type PlanoIdStripe,
} from './stripe-planos';

export interface PlanoStripe {
  id: PlanoIdStripe;
  nome: string;
  cotaConsultas: number;
  /** Unidades maiores (ex.: 29.9). A cobrança real usa o Price da Stripe. */
  precos: Record<MoedaSuportada, number>;
  stripePriceId: string | null;
}

interface ConfigPlanoRow {
  id: PlanoIdStripe;
  cota_consultas: number;
  preco_brl: number;
  preco_usd: number;
  preco_eur: number;
  preco_cad: number;
  stripe_price_id: string | null;
}

export const centavosParaNumero = (c: number): number => Math.round(c) / 100;
export const numeroParaCentavos = (n: number): number => Math.round(n * 100);

const ORDEM: PlanoIdStripe[] = ['iniciante', 'explorador', 'mestre'];

function linhaParaPlano(r: ConfigPlanoRow): PlanoStripe {
  return {
    id: r.id,
    nome: NOMES_PLANOS[r.id],
    cotaConsultas: r.cota_consultas,
    precos: {
      brl: centavosParaNumero(r.preco_brl),
      usd: centavosParaNumero(r.preco_usd),
      eur: centavosParaNumero(r.preco_eur),
      cad: centavosParaNumero(r.preco_cad),
    },
    stripePriceId: r.stripe_price_id,
  };
}

export async function carregarConfigPlanos(
  opts?: { incluirNaoConfigurados?: boolean },
): Promise<PlanoStripe[]> {
  const { data, error } = await supabase
    .from('config_planos')
    .select('id, cota_consultas, preco_brl, preco_usd, preco_eur, preco_cad, stripe_price_id');
  if (error) throw error;
  const planos = ((data ?? []) as ConfigPlanoRow[]).map(linhaParaPlano);
  const filtrados = opts?.incluirNaoConfigurados
    ? planos
    : planos.filter((p) => p.stripePriceId !== null);
  return filtrados.sort((a, b) => ORDEM.indexOf(a.id) - ORDEM.indexOf(b.id));
}

export async function salvarPlano(
  planoId: PlanoIdStripe,
  dados: { cotaConsultas: number; precos: Record<MoedaSuportada, number> },
): Promise<PlanoStripe> {
  const precosCentavos: Record<string, number> = {};
  for (const m of MOEDAS_SUPORTADAS) precosCentavos[m] = numeroParaCentavos(dados.precos[m]);
  const { data, error } = await supabase.functions.invoke('admin-configurar-plano', {
    body: { planoId, cotaConsultas: dados.cotaConsultas, precos: precosCentavos },
  });
  if (error) throw error;
  return linhaParaPlano((data as { plano: ConfigPlanoRow }).plano);
}
