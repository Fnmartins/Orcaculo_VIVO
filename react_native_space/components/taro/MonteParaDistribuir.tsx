import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';

interface Props {
  restantes: number;
  aoPuxar: () => void;
}

/**
 * O monte de onde a carta sai.
 *
 * A borda dourada e o rótulo não são enfeite: no rito o monte tem exatamente a mesma
 * aparência dos versos do leque, e nada diria que de um se pega e do outro não.
 */
export function MonteParaDistribuir({ restantes, aoPuxar }: Props) {
  const vazio = restantes <= 0;
  return (
    <View style={estilos.bloco}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Carta de cima do monte, pegue daqui"
        accessibilityHint={vazio ? undefined : 'Põe a carta na próxima posição vazia'}
        onPress={() => { if (!vazio) aoPuxar(); }}
        style={[estilos.monte, vazio && estilos.vazio]}
      />
      <Text style={estilos.rotulo}>{vazio ? 'Monte vazio' : 'Pegue daqui'}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { alignItems: 'center', gap: 6 },
  monte: {
    width: 76, height: 120, borderRadius: 8,
    backgroundColor: '#2A1B3D', borderWidth: 2, borderColor: Cores.acento,
  },
  vazio: { opacity: 0.2, borderColor: Cores.cardBorda },
  rotulo: {
    fontFamily: Fontes.corpo, fontSize: 11, letterSpacing: 1,
    textTransform: 'uppercase', color: Cores.acento,
  },
});
