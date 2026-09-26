import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { useAuth } from '../contexts/AuthContext';
import { lerUsoDoDia, type TipoUso, type UsoDoDia } from '../services/usoIA';

/**
 * Semáforo de uso: diz quanto de IA ainda cabe hoje, **antes** de a pessoa
 * gastar.
 *
 * O limite de verdade é o do servidor (configuracao_ia + uso_ia, conferidos
 * nas Edge Functions). Este componente só mostra o número, e desaparece
 * quando não tem número para mostrar — semáforo apagado é melhor que semáforo
 * chutando.
 */

const VERDE = '#4CAF50';
const AMBAR = '#FF9800';

interface Props {
  tipo: TipoUso;
  /** Rótulo curto do que está sendo contado. */
  rotulo: string;
}

export function SemaforoUso({ tipo, rotulo }: Props) {
  const { perfil, sessao } = useAuth();
  const [uso, setUso] = useState<UsoDoDia | null>(null);
  const usuarioId = sessao?.user?.id ?? null;
  const plano = perfil?.plano ?? 'gratuito';
  const semLimite = perfil?.is_super_admin === true;

  useEffect(() => {
    if (!usuarioId || semLimite) return;
    let vivo = true;
    lerUsoDoDia(usuarioId, plano, tipo).then((resultado) => {
      if (vivo) setUso(resultado);
    });
    return () => { vivo = false; };
  }, [usuarioId, plano, tipo, semLimite]);

  if (!usuarioId || semLimite || !uso) return null;

  if (!uso.ligado) {
    return (
      <View style={estilos.faixa}>
        <View style={[estilos.ponto, { backgroundColor: Cores.erro }]} />
        <Text style={estilos.texto}>{rotulo} não está no seu plano.</Text>
      </View>
    );
  }

  if (uso.limiteDia === null) return null;

  const restante = Math.max(0, uso.limiteDia - uso.usadoHoje);
  const cor = restante === 0 ? Cores.erro
    : restante <= Math.ceil(uso.limiteDia / 2) ? AMBAR
      : VERDE;

  return (
    <View style={estilos.faixa}>
      <View style={[estilos.ponto, { backgroundColor: cor }]} />
      <Text style={estilos.texto}>
        {restante === 0
          ? `${rotulo}: você usou as ${uso.limiteDia} de hoje. Amanhã tem mais.`
          : `${rotulo}: ${restante} de ${uso.limiteDia} ainda hoje.`}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  faixa: {
    flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm,
    backgroundColor: 'rgba(88, 117, 101, 0.07)',
    borderRadius: RaioBorda.md,
    paddingVertical: 8, paddingHorizontal: Espacamento.sm,
    marginBottom: Espacamento.sm,
  },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  texto: { flex: 1, fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario },
});
