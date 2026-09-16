export type PlanoUsuario = 'gratuito' | 'iniciante' | 'explorador' | 'mestre';

export interface UsuarioAcesso {
  id: string;
  nome: string | null;
  email: string | null;
  criado_em: string;
  plano: PlanoUsuario;
  is_super_admin: boolean;
}

export const ROTULO_PLANO: Record<PlanoUsuario, string> = {
  gratuito: 'Gratuito',
  iniciante: 'Iniciante',
  explorador: 'Explorador',
  mestre: 'Mestre',
};

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Busca por nome ou e-mail, sem acento e sem caixa. Termo vazio devolve todos. */
export function filtrarUsuarios(usuarios: UsuarioAcesso[], termo: string): UsuarioAcesso[] {
  const busca = normalizar(termo);
  if (!busca) return usuarios;
  return usuarios.filter((u) => normalizar(`${u.nome ?? ''} ${u.email ?? ''}`).includes(busca));
}
