import { supabase } from './supabase';
import { AcessoNegadoError } from './acessoNegado';
import type { UsuarioAcesso } from '../utils/acessos';

const FUNCAO = 'admin-acessos';

/** supabase-js coloca o Response de respostas não-2xx em `error.context`. */
async function erroDaFuncao(error: unknown): Promise<Error> {
  const contexto = (error as { context?: { status?: number; json?: () => Promise<unknown> } } | null)?.context;
  if (contexto?.status === 401 || contexto?.status === 403) return new AcessoNegadoError();
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
