import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';

const FUNCAO = 'excluir-conta';

/**
 * Palavra combinada com a function. Nasceu para que uma chamada acidental — um
 * clique perdido, um retry automático — não apagasse a conta de ninguém.
 *
 * Desde 24/09 a pessoa também a digita: "Excluir Conta" fica encostado em
 * "Sair" no menu do perfil, e um toque errado é irreversível. A mesma trava
 * passou a valer para a mão humana.
 */
export const PALAVRA_CONFIRMACAO = 'EXCLUIR';

/** Aceita espaços e minúsculas: o cuidado é com o engano, não com a digitação. */
export function confirmacaoValida(texto: string): boolean {
  return texto.trim().toUpperCase() === PALAVRA_CONFIRMACAO;
}

/**
 * Apaga a conta de quem está logado: assinatura cancelada na Stripe, dados do
 * app removidos e usuário retirado do auth. Irreversível.
 *
 * Quem é apagado sai do JWT, no servidor — esta função não manda id nenhum.
 * A sessão local continua válida até quem chamou encerrá-la; quem chama é
 * responsável por sair logo em seguida.
 */
export async function excluirConta(): Promise<void> {
  const { error } = await supabase.functions.invoke(FUNCAO, {
    body: { confirmacao: PALAVRA_CONFIRMACAO },
  });
  if (error) throw await erroDaFuncao(error);
}
