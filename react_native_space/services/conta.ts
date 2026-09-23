import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';

const FUNCAO = 'excluir-conta';

/**
 * Palavra combinada com a function. Serve para que uma chamada acidental — um
 * clique perdido, um retry automático — não apague a conta de ninguém.
 */
const CONFIRMACAO = 'EXCLUIR';

/**
 * Apaga a conta de quem está logado: assinatura cancelada na Stripe, dados do
 * app removidos e usuário retirado do auth. Irreversível.
 *
 * Quem é apagado sai do JWT, no servidor — esta função não manda id nenhum.
 * A sessão local continua válida até quem chamou encerrá-la; quem chama é
 * responsável por sair logo em seguida.
 */
export async function excluirConta(): Promise<void> {
  const { error } = await supabase.functions.invoke(FUNCAO, { body: { confirmacao: CONFIRMACAO } });
  if (error) throw await erroDaFuncao(error);
}
