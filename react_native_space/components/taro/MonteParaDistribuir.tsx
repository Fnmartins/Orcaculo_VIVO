import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { VersoDaCarta } from './VersoDaCarta';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';

export interface MedidaDaVaga {
  indice: number;
  /** Topo e base em coordenadas de tela, como chegam no `pageY` do toque. */
  topo: number;
  base: number;
}

interface Props {
  restantes: number;
  aoPuxar: () => void;
  /** Soltar a carta sobre uma vaga. Ausente, só o toque distribui. */
  aoSoltarEm?: (indiceDaVaga: number) => void;
  vagas?: MedidaDaVaga[];
}

const LARGURA_MONTE = 76;
const ALTURA_MONTE = 120;
const BORDA = 2;
const LARGURA_VERSO = LARGURA_MONTE - BORDA * 2;
const ALTURA_VERSO = ALTURA_MONTE - BORDA * 2;
/** Abaixo disto é tremor de dedo em cima do botão, não arraste. */
const FOLGA = 8;

/**
 * Onde o dedo soltou a carta, ou -1.
 *
 * Fora de qualquer faixa devolve -1 em vez da vaga mais próxima: chutar poria a carta
 * numa posição que a pessoa não apontou, e a posição é metade do significado da leitura.
 */
export function vagaSob(y: number, vagas: readonly MedidaDaVaga[]): number {
  const achada = vagas.find((v) => y >= v.topo && y <= v.base);
  return achada ? achada.indice : -1;
}

/**
 * O monte de onde a carta sai.
 *
 * A borda dourada e o rótulo não são enfeite: no rito o monte tem exatamente a mesma
 * aparência dos versos do leque, e nada diria que de um se pega e do outro não.
 *
 * O arraste é camada por cima do toque, e só reivindica o gesto depois de alguns pixels
 * de movimento — sem isso, quem não arrasta no celular ficaria sem saída, e é a maioria.
 */
export function MonteParaDistribuir({ restantes, aoPuxar, aoSoltarEm, vagas = [] }: Props) {
  const vazio = restantes <= 0;
  const podeArrastar = !vazio && Boolean(aoSoltarEm) && vagas.length > 0;
  const partida = useRef(0);
  const fantasma = useRef(new Animated.Value(0)).current;

  function soltar(pageY: number) {
    Animated.spring(fantasma, { toValue: 0, useNativeDriver: true }).start();
    const alvo = vagaSob(pageY, vagas);
    if (alvo >= 0) aoSoltarEm?.(alvo);
  }

  return (
    <View style={estilos.bloco}>
      <View
        testID="area-de-arraste"
        // `onTouchStart` não reivindica o gesto: só anota de onde o dedo partiu, para o
        // `onMoveShouldSetResponder` saber distinguir um toque de um arraste.
        onTouchStart={(e) => { partida.current = e.nativeEvent.pageY; }}
        onMoveShouldSetResponder={(e) =>
          podeArrastar && Math.abs(e.nativeEvent.pageY - partida.current) > FOLGA}
        onResponderMove={(e) => fantasma.setValue(e.nativeEvent.pageY - partida.current)}
        onResponderRelease={(e) => soltar(e.nativeEvent.pageY)}
        onResponderTerminate={() => {
          Animated.spring(fantasma, { toValue: 0, useNativeDriver: true }).start();
        }}
      >
        <Animated.View style={{ transform: [{ translateY: fantasma }] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Carta de cima do monte, pegue daqui"
            accessibilityHint={vazio ? undefined : 'Põe a carta na próxima posição vazia'}
            onPress={() => { if (!vazio) aoPuxar(); }}
            style={[estilos.monte, vazio && estilos.vazio]}
          >
            <VersoDaCarta largura={LARGURA_VERSO} altura={ALTURA_VERSO} />
          </Pressable>
        </Animated.View>
      </View>
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
