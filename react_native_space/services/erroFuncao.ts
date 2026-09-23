import { AcessoNegadoError } from './acessoNegado';
import { SessaoExpiradaError } from './sessaoExpirada';

/**
 * Traduz a falha de uma Edge Function no erro que a tela sabe tratar.
 *
 * O supabase-js não lê o corpo de respostas não-2xx: ele entrega o `Response`
 * cru em `error.context`. Sem isto, "sessão expirada" e "acesso negado" chegam
 * na tela como a mesma falha genérica de rede.
 */
export async function erroDaFuncao(error: unknown): Promise<Error> {
  const contexto = (error as { context?: { status?: number; json?: () => Promise<unknown> } } | null)?.context;
  if (contexto?.status === 401) return new SessaoExpiradaError();
  if (contexto?.status === 403) return new AcessoNegadoError();
  let mensagem: string | undefined;
  try {
    const corpo = await contexto?.json?.();
    const erro = (corpo as { erro?: unknown } | undefined)?.erro;
    if (typeof erro === 'string' && erro) mensagem = erro;
  } catch {
    // corpo não é JSON: fica a mensagem genérica
  }
  return new Error(mensagem ?? 'Falha ao falar com o servidor.');
}
