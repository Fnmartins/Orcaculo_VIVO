// supabase/functions/_shared/escritas.ts
// Guardas de escrita do webhook. Puras e sem dependência, para serem testadas
// pelo Jest do app (services/__tests__/escritas.test.ts), como regras-acessos.ts.

export interface RespostaEscrita {
  error?: { message?: string; code?: string } | null;
  data?: unknown[] | null;
}

// Uma escrita que falha e passa batido é o pior caso deste webhook: a função
// responde 200, o event.id continua em webhook_eventos e a Stripe nunca reenvia
// — o pagamento entra e o plano não é liberado, em silêncio. Lançar aqui faz o
// handler apagar a linha de dedupe e responder 500, que é o pedido de retry.
export function exigirEscrita(rotulo: string, resultado: RespostaEscrita): void {
  const erro = resultado.error;
  if (!erro) return;
  throw new Error(`${rotulo}: ${erro.message ?? JSON.stringify(erro)}`);
}

// Para `perfis`, que é a tabela que libera o acesso, nenhuma linha afetada
// também é falha (id inexistente, linha removida) e isso não aparece em `error`.
export function exigirLinhaAtualizada(rotulo: string, resultado: RespostaEscrita): void {
  exigirEscrita(rotulo, resultado);
  const linhas = resultado.data?.length ?? 0;
  if (linhas !== 1) {
    throw new Error(`${rotulo}: esperava atualizar 1 linha, afetou ${linhas}`);
  }
}
