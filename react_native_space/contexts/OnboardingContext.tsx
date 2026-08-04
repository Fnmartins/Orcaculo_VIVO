import React, { createContext, useContext, useState, useCallback } from 'react';

export type CaminhoEspiritual = 'buzios' | 'tarot' | 'numerologia' | 'mapa_astral' | 'cafe' | 'quiromancia' | 'matriz_destino' | 'lei_atracao';
export type FormatoEntrega = 'texto' | 'audio' | 'video';
export type IntencaoUsuario = 'amor' | 'trabalho' | 'saude' | 'autoconhecimento' | 'financeiro' | 'espiritualidade';

interface DadosOnboarding {
  caminhos: CaminhoEspiritual[];
  formatos: FormatoEntrega[];
  intencoes: IntencaoUsuario[];
}

interface ContextoOnboarding {
  dados: DadosOnboarding;
  toggleCaminho: (c: CaminhoEspiritual) => void;
  toggleFormato: (f: FormatoEntrega) => void;
  toggleIntencao: (i: IntencaoUsuario) => void;
  resetar: () => void;
}

const estadoInicial: DadosOnboarding = {
  caminhos: [],
  formatos: [],
  intencoes: [],
};

const Contexto = createContext<ContextoOnboarding | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [dados, setDados] = useState<DadosOnboarding>(estadoInicial);

  const toggleCaminho = useCallback((c: CaminhoEspiritual) => {
    setDados(prev => ({
      ...prev,
      caminhos: prev.caminhos.includes(c)
        ? prev.caminhos.filter(x => x !== c)
        : [...prev.caminhos, c],
    }));
  }, []);

  const toggleFormato = useCallback((f: FormatoEntrega) => {
    setDados(prev => ({
      ...prev,
      formatos: prev.formatos.includes(f)
        ? prev.formatos.filter(x => x !== f)
        : [...prev.formatos, f],
    }));
  }, []);

  const toggleIntencao = useCallback((i: IntencaoUsuario) => {
    setDados(prev => ({
      ...prev,
      intencoes: prev.intencoes.includes(i)
        ? prev.intencoes.filter(x => x !== i)
        : [...prev.intencoes, i],
    }));
  }, []);

  const resetar = useCallback(() => setDados(estadoInicial), []);

  return (
    <Contexto.Provider value={{ dados, toggleCaminho, toggleFormato, toggleIntencao, resetar }}>
      {children}
    </Contexto.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useOnboarding precisa estar dentro de OnboardingProvider');
  return ctx;
}
