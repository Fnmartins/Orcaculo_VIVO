import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';
import type { UsuarioAcesso } from '../utils/acessos';

const FUNCAO = 'admin-acessos';

export async function listarUsuarios(): Promise<UsuarioAcesso[]> {
  const { data, error } = await supabase.functions.invoke(FUNCAO, { body: { acao: 'listar' } });
  if (error) throw await erroDaFuncao(error);
  return (data as { usuarios?: UsuarioAcesso[] } | null)?.usuarios ?? [];
}

export async function definirAdmin(usuarioId: string, admin: boolean): Promise<UsuarioAcesso> {
  const { data, error } = await supabase.functions.invoke(FUNCAO, {
    body: { acao: 'definir-admin', usuarioId, admin },
  });
  if (error) throw await erroDaFuncao(error);
  return (data as { usuario: UsuarioAcesso }).usuario;
}
