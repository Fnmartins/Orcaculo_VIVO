// supabase/functions/_shared/avulso.ts
//
// O crédito avulso no banco. A DECISÃO de usá-lo vive em `avulso-regras.ts`,
// pura e testada; aqui só a ida ao banco, como `uso.ts` faz com `limites.ts`.

// deno-lint-ignore no-explicit-any
type Cliente = { from: (tabela: string) => any };

/** O que a busca de crédito achou. `erro` NÃO é o mesmo que `nao_tem`. */
export type BuscaDeCredito =
  | { estado: 'tem'; id: number }
  | { estado: 'nao_tem' }
  | { estado: 'erro' };

/**
 * O crédito mais VELHO ainda válido para este oráculo.
 *
 * O mais velho primeiro porque é o que vence antes: gastar o mais novo deixaria
 * o outro expirar, e a pessoa teria pago dois e usado um.
 *
 * `erro` e `nao_tem` são estados DIFERENTES de propósito. Confundi-los faria uma
 * falha de leitura dizer "compre" a quem já comprou — e como o `UNIQUE` é por
 * sessão do Stripe e não por pessoa, nada impediria a segunda compra. Quem chama
 * precisa poder dizer "tente de novo" em vez de "pague".
 */
export async function creditoDisponivel(
  cliente: Cliente,
  usuarioId: string,
  oraculo: string,
): Promise<BuscaDeCredito> {
  const { data, error } = await cliente
    .from('compras_avulsas')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('oraculo', oraculo)
    .is('consumido_em', null)
    .gt('expira_em', new Date().toISOString())
    .order('expira_em', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('falha ao ler credito avulso', error.message);
    return { estado: 'erro' };
  }
  if (typeof data?.id === 'number') return { estado: 'tem', id: data.id };
  // Veio linha mas o id não é número: não deveria acontecer (`int8` chega como
  // número no PostgREST), e sumir calado esconderia um crédito pago.
  if (data) {
    console.error('credito avulso com id inesperado', JSON.stringify(data));
    return { estado: 'erro' };
  }
  return { estado: 'nao_tem' };
}

/**
 * Reivindica o crédito: marca como gasto e diz se CONSEGUIU.
 *
 * Chamada ANTES de gerar a leitura, e não depois. Ler o crédito, gerar e só
 * então gastar seria verificar-depois-agir: dois cliques simultâneos leriam o
 * mesmo crédito disponível, os dois gerariam, e a guarda abaixo só impediria o
 * segundo `update` — a pessoa receberia duas leituras por uma compra, e a
 * Anthropic seria paga duas vezes.
 *
 * O `is('consumido_em', null)` é o que torna isto atômico: quem perde a corrida
 * não atualiza linha nenhuma, recebe `false`, e para antes de gerar.
 *
 * Quem reivindica e falha ao gerar precisa chamar `devolverCredito`.
 */
export async function reivindicarCredito(
  cliente: Cliente,
  compraId: number,
  chave: string,
): Promise<boolean> {
  const { data, error } = await cliente
    .from('compras_avulsas')
    .update({ consumido_em: new Date().toISOString(), consumido_chave: chave })
    .eq('id', compraId)
    .is('consumido_em', null)
    .select('id');

  if (error) {
    console.error('falha ao reivindicar credito avulso', error.message);
    return false;
  }
  return Array.isArray(data) && data.length === 1;
}

/**
 * Devolve um crédito reivindicado cuja leitura não saiu.
 *
 * Sem isto, um erro da Anthropic faria a pessoa perder o que pagou. Falhar aqui
 * só pode ir para o log: a resposta de erro já está a caminho de quem pediu, e
 * um crédito preso é problema menor que uma exceção dentro do `catch`.
 */
export async function devolverCredito(cliente: Cliente, compraId: number): Promise<void> {
  const { error } = await cliente
    .from('compras_avulsas')
    .update({ consumido_em: null, consumido_chave: null })
    .eq('id', compraId);
  if (error) console.error('falha ao devolver credito avulso', error.message);
}
