// supabase/functions/_shared/avulso.ts
//
// O crédito avulso no banco. A DECISÃO de usá-lo vive em `avulso-regras.ts`,
// pura e testada; aqui só a ida ao banco, como `uso.ts` faz com `limites.ts`.

// deno-lint-ignore no-explicit-any
type Cliente = { from: (tabela: string) => any };

/**
 * O id do crédito mais VELHO ainda válido para este oráculo, ou nulo.
 *
 * O mais velho primeiro porque é o que vence antes: gastar o mais novo deixaria
 * o outro expirar, e a pessoa teria pago dois e usado um.
 *
 * Erro de leitura devolve nulo — ou seja, "não tem crédito". É o lado seguro:
 * nulo barra quem talvez pudesse passar, e o contrário daria leitura paga de
 * graça. O erro vai para o log para a falha não ficar invisível.
 */
export async function creditoDisponivel(
  cliente: Cliente,
  usuarioId: string,
  oraculo: string,
): Promise<number | null> {
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
    return null;
  }
  return typeof data?.id === 'number' ? data.id : null;
}

/**
 * Marca o crédito como gasto, amarrando-o à leitura que o gastou.
 *
 * A condição `is('consumido_em', null)` não é decoração: duas chamadas ao mesmo
 * tempo leriam o mesmo crédito disponível, e sem ela a segunda sobrescreveria a
 * primeira — duas leituras por uma compra. Com ela, a segunda não atualiza linha
 * nenhuma, e isso aparece no log em vez de passar calado.
 */
export async function gastarCredito(
  cliente: Cliente,
  compraId: number,
  chave: string,
): Promise<void> {
  const { data, error } = await cliente
    .from('compras_avulsas')
    .update({ consumido_em: new Date().toISOString(), consumido_chave: chave })
    .eq('id', compraId)
    .is('consumido_em', null)
    .select('id');

  if (error) console.error('falha ao gastar credito avulso', error.message);
  else if (!data || data.length === 0) {
    console.error('credito avulso ja estava gasto', String(compraId));
  }
}
