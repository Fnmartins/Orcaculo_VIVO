import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';
import type { UsuarioAcesso } from '../utils/acessos';

const FUNCAO = 'admin-acessos';

export interface PaginaDeUsuarios {
  usuarios: UsuarioAcesso[];
  /** Quantos existem no total, e não quantos vieram nesta página. */
  total: number;
}

/**
 * Uma página de usuários, do mais recente para o mais antigo.
 *
 * Pedia a tabela inteira, e o Supabase cortava em mil linhas sem avisar: a lista
 * chegava incompleta e o Painel mostrava como se fosse tudo. O `total` vem junto
 * porque é ele que permite dizer quantos faltam — sem ele, "mostrando cinquenta" e
 * "existem cinquenta" ficam iguais na tela.
 */
export async function listarUsuarios(pagina = 0): Promise<PaginaDeUsuarios> {
  const { data, error } = await supabase.functions.invoke(FUNCAO, {
    body: { acao: 'listar', pagina },
  });
  if (error) throw await erroDaFuncao(error);
  const corpo = data as { usuarios?: UsuarioAcesso[]; total?: number } | null;
  const usuarios = corpo?.usuarios ?? [];
  // Sem `total` na resposta — function antiga ainda no ar — o que veio é o que se
  // sabe. Melhor um total conservador do que `undefined` virando "0 usuários".
  return { usuarios, total: corpo?.total ?? usuarios.length };
}

export async function definirAdmin(usuarioId: string, admin: boolean): Promise<UsuarioAcesso> {
  const { data, error } = await supabase.functions.invoke(FUNCAO, {
    body: { acao: 'definir-admin', usuarioId, admin },
  });
  if (error) throw await erroDaFuncao(error);
  return (data as { usuario: UsuarioAcesso }).usuario;
}
