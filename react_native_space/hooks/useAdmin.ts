import { useAuth } from '../contexts/AuthContext';

export function useIsAdmin(): boolean {
  const { perfil } = useAuth();
  if (!perfil) return false;
  return perfil.role === 'admin' || perfil.is_super_admin === true;
}

export function useIsSuperAdmin(): boolean {
  const { perfil } = useAuth();
  if (!perfil) return false;
  return perfil.is_super_admin === true;
}

export function useHasPermission(permission: string): boolean {
  const { perfil } = useAuth();
  if (!perfil) return false;
  if (perfil.is_super_admin) return true;
  const perms = perfil.permissions ?? [];
  if (perms.includes('read:*') && permission.startsWith('read:')) return true;
  if (perms.includes('edit:*') && permission.startsWith('edit:')) return true;
  if (perms.includes('delete:*') && permission.startsWith('delete:')) return true;
  if (perms.includes('manage:*') && permission.startsWith('manage:')) return true;
  return perms.includes(permission);
}

export function useRole(): string {
  const { perfil } = useAuth();
  return perfil?.role ?? 'usuario';
}
