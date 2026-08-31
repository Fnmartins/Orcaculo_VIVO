import { useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

type RecursoPlano =
  | 'consulta_basica'     // Tarot, Búzios, Numerologia, Mapa Astral
  | 'consulta_premium'    // Matriz do Destino, Lei da Atração
  | 'ia_visual'           // Café, Quiromância (câmera)
  | 'consulta_ao_vivo';   // Agendamento com oraculista

const ACESSO: Record<string, RecursoPlano[]> = {
  gratuito:   ['consulta_basica'],
  iniciante:  ['consulta_basica', 'consulta_premium'],
  explorador: ['consulta_basica', 'consulta_premium', 'ia_visual'],
  mestre:     ['consulta_basica', 'consulta_premium', 'ia_visual', 'consulta_ao_vivo'],
};

const PLANO_MINIMO: Record<RecursoPlano, string> = {
  consulta_basica:    'iniciante',
  consulta_premium:   'iniciante',
  ia_visual:          'explorador',
  consulta_ao_vivo:   'mestre',
};

const NOME_RECURSO: Record<RecursoPlano, string> = {
  consulta_basica:    'oráculos',
  consulta_premium:   'Matriz do Destino e Lei da Atração',
  ia_visual:          'Análise por IA (câmera)',
  consulta_ao_vivo:   'consultas ao vivo',
};

const NOME_PLANO: Record<string, string> = {
  iniciante: 'Plano Iniciante (R$ 29,90/mês)',
  explorador: 'Plano Explorador (R$ 79,90/mês)',
  mestre: 'Plano Mestre (R$ 199,90/mês)',
};

export function usePlano() {
  const { perfil } = useAuth();

  const planoAtual = perfil?.plano ?? 'gratuito';
  const consultasRestantes = perfil?.consultas_restantes ?? 0;
  const isSuperAdmin = perfil?.is_super_admin === true;

  const temAcesso = useCallback((recurso: RecursoPlano): boolean => {
    if (isSuperAdmin) return true;
    return ACESSO[planoAtual]?.includes(recurso) ?? false;
  }, [planoAtual, isSuperAdmin]);

  const podeFazerConsulta = useCallback((): boolean => {
    if (!perfil) return true; // modo livre (sem login)
    if (isSuperAdmin) return true;
    if (planoAtual === 'explorador' || planoAtual === 'mestre') return true;
    return consultasRestantes > 0;
  }, [perfil, planoAtual, consultasRestantes, isSuperAdmin]);

  /**
   * Verifica se o usuário pode acessar o recurso.
   * Se não puder, exibe alerta e retorna false.
   * Use antes de navegar para uma tela premium.
   */
  const verificarAcesso = useCallback((recurso: RecursoPlano): boolean => {
    if (!temAcesso(recurso)) {
      const planoNecessario = PLANO_MINIMO[recurso];
      Alert.alert(
        '🔒 Recurso Premium',
        `${NOME_RECURSO[recurso]} está disponível no ${NOME_PLANO[planoNecessario]}.`,
        [
          { text: 'Ver planos', onPress: () => router.push('/planos') },
          { text: 'Agora não', style: 'cancel' },
        ]
      );
      return false;
    }

    if (recurso === 'consulta_basica' || recurso === 'consulta_premium') {
      if (!podeFazerConsulta()) {
        Alert.alert(
          'Limite atingido',
          'Você usou todas as leituras do seu plano este mês. Faça upgrade para continuar.',
          [
            { text: 'Ver planos', onPress: () => router.push('/planos') },
            { text: 'Entendi', style: 'cancel' },
          ]
        );
        return false;
      }
    }

    return true;
  }, [temAcesso, podeFazerConsulta]);

  return {
    planoAtual,
    consultasRestantes,
    temAcesso,
    podeFazerConsulta,
    verificarAcesso,
  };
}
