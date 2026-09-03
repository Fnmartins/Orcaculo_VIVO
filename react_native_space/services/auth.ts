import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface DadosCadastro {
  nome: string;
  email: string;
  senha: string;
}

export interface DadosLogin {
  email: string;
  senha: string;
}

export type RoleUsuario = 'usuario' | 'moderador' | 'editor' | 'admin' | 'super_admin';

export interface Perfil {
  id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
  data_nascimento: string | null;
  signo: string | null;
  caminho_espiritual: string | null;
  intencao: string | null;
  plano: 'gratuito' | 'iniciante' | 'explorador' | 'mestre';
  plano_valido_ate: string | null;
  consultas_restantes: number;
  nivel: number;
  xp: number;
  streak: number;
  ultima_consulta_em: string | null;
  role: RoleUsuario;
  is_super_admin: boolean;
  permissions: string[];
  criado_em: string;
}

export const AuthServico = {
  async cadastrar({ nome, email, senha }: DadosCadastro) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
      },
    });
    if (error) throw error;
    return data;
  },

  async entrar({ email, senha }: DadosLogin) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) throw error;
    return data;
  },

  async sair() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async recuperarSenha(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'arcanus://recuperar-senha',
    });
    if (error) throw error;
  },

  async sessaoAtual(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async usuarioAtual(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  },

  async buscarPerfil(userId: string): Promise<Perfil | null> {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data as Perfil;
  },

  async atualizarPerfil(userId: string, dados: Partial<Perfil>) {
    const { data, error } = await supabase
      .from('perfis')
      .update(dados)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as Perfil;
  },

  onMudancaAuth(callback: (session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return data.subscription;
  },
};
