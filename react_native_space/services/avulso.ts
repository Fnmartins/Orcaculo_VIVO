// services/avulso.ts
import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';

/** Quantos créditos não usados e não vencidos a pessoa tem, por produto. */
export async function creditosDaPessoa(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('compras_avulsas')
    .select('oraculo')
    .is('consumido_em', null)
    .gt('expira_em', new Date().toISOString());

  // Isto decora um card. Falhar aqui não pode derrubar a tela da leitura, que é
  // o que a pessoa veio ver — então o erro vira "nenhum crédito" e fica no log.
  if (error) {
    console.warn('falha ao ler creditos avulsos', error.message);
    return {};
  }

  const porOraculo: Record<string, number> = {};
  for (const linha of data ?? []) {
    const o = String((linha as { oraculo?: string }).oraculo ?? '');
    if (o) porOraculo[o] = (porOraculo[o] ?? 0) + 1;
  }
  return porOraculo;
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
