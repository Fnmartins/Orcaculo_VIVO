// services/avulso.ts
import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';

export interface CreditosDaPessoa {
  /** Quantos créditos não usados e não vencidos, por produto. Vazio quando a leitura falhou. */
  porOraculo: Record<string, number>;
  /**
   * Quantas compras já foram gastas, por produto. Sem filtro de validade: `expira_em` é o
   * prazo do direito de GERAR, e a leitura já gerada não expira.
   */
  consumidasPorOraculo: Record<string, number>;
  /**
   * Zero crédito e falha de leitura são coisas diferentes. Quem lê "zero" por causa de uma
   * queda de rede pode ser alguém que já pagou, e convidá-lo a comprar de novo é cobrar duas
   * vezes: o `UNIQUE` é por sessão do Stripe, e nada mais impede o segundo pagamento.
   */
  falhou: boolean;
}

function contarPorOraculo(linhas: unknown[] | null): Record<string, number> {
  const porOraculo: Record<string, number> = {};
  for (const linha of linhas ?? []) {
    const o = String((linha as { oraculo?: string }).oraculo ?? '');
    if (o) porOraculo[o] = (porOraculo[o] ?? 0) + 1;
  }
  return porOraculo;
}

/**
 * O que a pessoa tem de compra avulsa: os créditos que ainda pode gastar e as compras que
 * já gastou, por produto.
 */
export async function creditosDaPessoa(): Promise<CreditosDaPessoa> {
  const [disponiveis, consumidas] = await Promise.all([
    supabase
      .from('compras_avulsas')
      .select('oraculo')
      .is('consumido_em', null)
      .gt('expira_em', new Date().toISOString()),
    supabase
      .from('compras_avulsas')
      .select('oraculo')
      .not('consumido_em', 'is', null),
  ]);

  // Quem chama usa isto para decidir se oferece uma compra, e na vocação para decidir se a
  // leitura abre. Por isso o erro não vira "nenhum crédito" calado: vira `falhou`, e fica
  // no log. O que a outra consulta trouxe com sucesso continua valendo.
  const erro = disponiveis.error ?? consumidas.error;
  if (erro) console.warn('falha ao ler creditos avulsos', erro.message);

  return {
    porOraculo: disponiveis.error ? {} : contarPorOraculo(disponiveis.data),
    consumidasPorOraculo: consumidas.error ? {} : contarPorOraculo(consumidas.data),
    falhou: erro != null,
  };
}

/** Abre o checkout de compra avulsa e devolve a URL para onde ir. */
export async function comprarAvulso(
  oraculo: 'mapa' | 'vocacao',
  moeda = 'brl',
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('criar-checkout-avulso', {
    body: { oraculo, moeda },
  });
  if (error) throw await erroDaFuncao(error);
  // `checkoutUrl` é o nome que as duas functions de checkout devolvem, e o que
  // `services/stripe.ts` já lê. Ler `url` aqui daria `undefined` em silêncio.
  const url = (data as { checkoutUrl?: string } | null)?.checkoutUrl;
  if (!url) throw new Error('O pagamento não abriu. Tente de novo.');
  return url;
}
