import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VersoDaCarta } from './VersoDaCarta';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';

interface Props {
  restantes: number;
  aoPuxar: () => void;
}

const LARGURA_MONTE = 76;
const ALTURA_MONTE = 120;
const BORDA = 2;
const LARGURA_VERSO = LARGURA_MONTE - BORDA * 2;
const ALTURA_VERSO = ALTURA_MONTE - BORDA * 2;

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
      >
        <VersoDaCarta largura={LARGURA_VERSO} altura={ALTURA_VERSO} />
      </Pressable>
      <Text style={estilos.rotulo}>{vazio ? 'Monte vazio' : 'Pegue daqui'}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { alignItems: 'center', gap: 6 },
  // A borda dourada fica POR FORA do verso: por dentro ela se perderia na borda que o
  // próprio verso já desenha, e era justamente ela que dizia de onde se pega.
  monte: {
    width: LARGURA_MONTE, height: ALTURA_MONTE, borderRadius: 8, overflow: 'hidden',
    backgroundColor: '#365247', borderWidth: BORDA, borderColor: Cores.acento,
  },
  vazio: { opacity: 0.2, borderColor: Cores.cardBorda },
  rotulo: {
    fontFamily: Fontes.corpo, fontSize: 11, letterSpacing: 1,
    textTransform: 'uppercase', color: Cores.acento,
  },
});
