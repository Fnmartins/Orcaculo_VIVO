import { supabase } from './supabase';
import type { Perfil, RoleUsuario } from './auth';

interface PerfilAdmin extends Perfil {
  email: string;
  nome: string;
}

export const AdminServico = {
  async promoverRole(userId: string, role: RoleUsuario) {
    const { data, error } = await supabase
      .from('perfis')
      .update({
        role,
        is_super_admin: role === 'super_admin',
      })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as PerfilAdmin;
  },

  async promoverSuperAdmin(userId: string) {
    return this.promoverRole(userId, 'super_admin');
  },

  async darAcessoPro(userId: string) {
    const { data, error } = await supabase
      .from('perfis')
      .update({
        plano: 'mestre',
        plano_valido_ate: '2099-12-31T23:59:59+00:00',
        consultas_restantes: 999999,
      })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as PerfilAdmin;
  },

  async adicionarPermissao(userId: string, permissao: string) {
    const { data: perfil, error: errSelect } = await supabase
      .from('perfis')
      .select('permissions')
      .eq('id', userId)
      .single();
    if (errSelect) throw errSelect;

    const atuais = perfil?.permissions ?? [];
    if (atuais.includes(permissao)) return;

    const { data, error } = await supabase
      .from('perfis')
      .update({ permissions: [...atuais, permissao] })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as PerfilAdmin;
  },

  async listarAdmins(): Promise<PerfilAdmin[]> {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .in('role', ['admin', 'super_admin']);
    if (error) throw error;
    return (data ?? []) as PerfilAdmin[];
  },

  async buscarPerfilPorEmail(email: string): Promise<PerfilAdmin | null> {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('email', email)
      .single();
    if (error) return null;
    return data as PerfilAdmin;
  },

  async listarTodosUsuarios(): Promise<PerfilAdmin[]> {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .order('criado_em', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PerfilAdmin[];
  },

  async rebaixarParaUsuario(userId: string) {
    const { data, error } = await supabase
      .from('perfis')
      .update({
        role: 'usuario',
        is_super_admin: false,
        permissions: [],
      })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as PerfilAdmin;
  },
};
