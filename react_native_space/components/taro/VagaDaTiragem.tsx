import React, { useEffect, useRef } from 'react';
import {
  Animated, Pressable, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { CartaTarotVisual } from '../CartaTarotVisual';
import { VersoDaCarta } from './VersoDaCarta';
import type { CartaTarot } from '../../data/tarot';

interface Props {
  posicao: { nome: string; regra: string };
  carta: CartaTarot | null;
  /** No rito a carta pousa de costas: a cena só aparece quando a pessoa vira. */
  revelada?: boolean;
  aoReceber: () => void;
  aoVirar?: () => void;
  /** Onde esta vaga está na tela, para o arraste saber o que há debaixo do dedo. */
  aoMedir?: (medida: { topo: number; base: number }) => void;
}

const LARGURA_MAXIMA = 104;
const PROPORCAO = 1.58;
/** Folga da coluna mais os vãos entre três colunas. */
const FOLGA_DA_LINHA = 56;

/**
 * Três cabem numa linha em qualquer celular.
 *
 * Largura fixa estourava a tela de 320; `flex: 1` resolvia isso numa linha só, mas a
 * Cruz Celta precisa de uma linha que envolve, e aí `flex` faz cada item tentar ocupar
 * a linha inteira. Calculada, a largura é previsível nos dois casos.
 */
export function larguraDaVaga(larguraDaTela: number): number {
  return Math.max(76, Math.min(LARGURA_MAXIMA, (larguraDaTela - FOLGA_DA_LINHA) / 3));
}

/**
 * Uma das três posições da tiragem.
 *
 * Vazia, ela mostra a pergunta que faz — e é só por isso que a tiragem se explica
 * sozinha. Guardar a regra até a carta cair gasta o único momento em que a pessoa
 * ainda está disposta a ler.
 *
 * Com carta, ela tem dois lados. A carta pousa de costas e vira ao toque, com a mola e
 * o clarão dourado que a tela antiga usava: o clarão não é enfeite, é o que cobre a
 * troca das duas faces no meio do giro.
 */
export function VagaDaTiragem({
  posicao, carta, revelada = false, aoReceber, aoVirar, aoMedir,
}: Props) {
  const { width } = useWindowDimensions();
  const largura = larguraDaVaga(width);
  const caixa = useRef<View>(null);
  const giro = useRef(new Animated.Value(0)).current;
  const clarao = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!revelada) {
      giro.setValue(0);
      return;
    }
    Animated.spring(giro, {
      toValue: 1, damping: 14, stiffness: 120, useNativeDriver: true,
    }).start();
    Animated.sequence([
      Animated.timing(clarao, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(clarao, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [revelada, giro, clarao]);

  const rotulo = carta
    ? (revelada
      ? `Posição ${posicao.nome}, ${carta.nomeCompleto}`
      : `Posição ${posicao.nome}, carta de costas, toque para virar`)
    : `Posição ${posicao.nome}, vazia`;

  function tocar() {
    if (!carta) {
      aoReceber();
      return;
    }
    if (!revelada) aoVirar?.();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityHint={carta ? undefined : 'Põe aqui a carta de cima do monte'}
      onPress={tocar}
      style={[estilos.vaga, { width: largura }]}
      ref={caixa}
      // `measureInWindow` e nao o layout do `onLayout`: o layout vem relativo ao pai, e o
      // dedo chega em coordenada de tela. Misturar os dois acerta por acaso e so no topo.
      onLayout={() => {
        caixa.current?.measureInWindow((_x, y, _largura, altura) => {
          aoMedir?.({ topo: y, base: y + altura });
        });
      }}
    >
      <Text style={estilos.nome}>{posicao.nome}</Text>
      {carta ? (
        <Animated.View
          style={{
            transform: [
              {
                rotateY: giro.interpolate({
                  inputRange: [0, 0.5, 1], outputRange: ['0deg', '90deg', '0deg'],
                }),
              },
              { scale: giro.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.88, 1] }) },
            ],
          }}
        >
          {revelada
            ? <CartaTarotVisual cartaId={carta.id} nome={carta.nomeCompleto} largura={largura} />
            : <VersoDaCarta largura={largura} altura={largura * PROPORCAO} />}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject, estilos.clarao,
              { opacity: clarao, borderRadius: largura * 0.1 },
            ]}
          />
        </Animated.View>
      ) : (
        <View
          style={[estilos.vazia, { width: largura, height: largura * PROPORCAO }]}
        />
      )}
      <Text style={estilos.regra}>{revelada && carta ? carta.nome : posicao.regra}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  vaga: { alignItems: 'center', gap: Espacamento.sm },
  nome: { fontFamily: Fontes.titulo, fontSize: 15, color: Cores.acento },
  vazia: {
    borderRadius: RaioBorda.md,
    borderWidth: 1, borderColor: Cores.cardBorda, borderStyle: 'dashed',
  },
  clarao: { backgroundColor: 'rgba(212,175,55,0.9)' },
  regra: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario, textAlign: 'center' },
});
