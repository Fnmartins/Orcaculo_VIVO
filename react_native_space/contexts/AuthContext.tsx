import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthServico, type Perfil } from '../services/auth';

interface AuthContextTipo {
  sessao: Session | null;
  perfil: Perfil | null;
  carregando: boolean;
  logado: boolean;
  atualizarPerfil: (dados: Partial<Perfil>) => Promise<void>;
  recarregarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextTipo>({
  sessao: null,
  perfil: null,
  carregando: true,
  logado: false,
  atualizarPerfil: async () => {},
  recarregarPerfil: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarPerfil = useCallback(async (userId: string) => {
    const p = await AuthServico.buscarPerfil(userId);
    setPerfil(p);
  }, []);

  useEffect(() => {
    AuthServico.sessaoAtual().then((s) => {
      setSessao(s);
      if (s?.user?.id) {
        carregarPerfil(s.user.id).finally(() => setCarregando(false));
      } else {
        setCarregando(false);
      }
    });

    const subscription = AuthServico.onMudancaAuth((s) => {
      setSessao(s);
      if (s?.user?.id) {
        carregarPerfil(s.user.id);
      } else {
        setPerfil(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [carregarPerfil]);

  const atualizarPerfil = useCallback(async (dados: Partial<Perfil>) => {
    if (!sessao?.user?.id) return;
    const atualizado = await AuthServico.atualizarPerfil(sessao.user.id, dados);
    setPerfil(atualizado);
  }, [sessao]);

  const recarregarPerfil = useCallback(async () => {
    if (!sessao?.user?.id) return;
    await carregarPerfil(sessao.user.id);
  }, [sessao, carregarPerfil]);

  return (
    <AuthContext.Provider value={{
      sessao,
      perfil,
      carregando,
      logado: !!sessao,
      atualizarPerfil,
      recarregarPerfil,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
