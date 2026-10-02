import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { CartaTarotVisual } from '../CartaTarotVisual';
import { VersoDaCarta } from './VersoDaCarta';
import type { CartaTarot } from '../../data/tarot';

interface Props {
  posicao: { nome: string; regra: string };
  carta: CartaTarot | null;
  /** No rito a carta pousa de costas: a cena só aparece quando ela vira. */
  revelada?: boolean;
  aoReceber: () => void;
  aoVirar?: () => void;
  /** Onde esta vaga está na tela, para o arraste saber o que há debaixo do dedo. */
  aoMedir?: (medida: { topo: number; base: number }) => void;
}

/** 13rem no protótipo. A carta encaixa dentro pela proporção, como no baralho real. */
const ALTURA_LAMINA = 208;
const PROPORCAO = 1.58;
const LARGURA_CARTA = Math.round(ALTURA_LAMINA / PROPORCAO);

/**
 * Uma posição da tiragem, como cartão.
 *
 * É o `.vaga` do protótipo: um painel com o nome da posição em dourado, a lâmina que
 * vira, e embaixo o nome da carta com o significado. Vazia, mostra a pergunta da
 * posição — e é só por isso que a tiragem se explica sozinha, porque as perguntas são
 * lidas antes de qualquer resposta.
 *
 * O clarão dourado no meio do giro não é enfeite: é o que cobre a troca das duas faces,
 * já que no React Native não há `backface-visibility` para fazer o giro de verdade.
 */
export function VagaDaTiragem({
  posicao, carta, revelada = false, aoReceber, aoVirar, aoMedir,
}: Props) {
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
      style={estilos.vaga}
      ref={caixa}
      // `measureInWindow` e não o layout do `onLayout`: o layout vem relativo ao pai, e
      // o dedo chega em coordenada de tela. Misturar os dois acerta por acaso.
      onLayout={() => {
        caixa.current?.measureInWindow((_x, y, _largura, altura) => {
          aoMedir?.({ topo: y, base: y + altura });
        });
      }}
    >
      <Text style={estilos.posicao}>{posicao.nome}</Text>

      <View style={estilos.lamina}>
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
              ? (
                <CartaTarotVisual
                  cartaId={carta.id}
                  nome={carta.nomeCompleto}
                  largura={LARGURA_CARTA}
                />
              )
              : <VersoDaCarta largura={LARGURA_CARTA} altura={ALTURA_LAMINA} />}
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, estilos.clarao, { opacity: clarao }]}
            />
          </Animated.View>
        ) : (
          <View style={estilos.vazia} />
        )}
      </View>

      {revelada && carta ? (
        <View style={estilos.corpo}>
          <Text style={estilos.nome}>{carta.nomeCompleto}</Text>
          <Text style={estilos.texto}>{carta.significado}</Text>
        </View>
      ) : (
        <Text style={estilos.texto}>{posicao.regra}</Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  vaga: {
    width: '100%', gap: Espacamento.sm, padding: Espacamento.md,
    backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda,
    borderRadius: 14,
  },
  posicao: { fontFamily: Fontes.titulo, fontSize: 17, color: Cores.acento },
  lamina: { height: ALTURA_LAMINA, alignItems: 'center', justifyContent: 'center' },
  vazia: {
    width: LARGURA_CARTA, height: ALTURA_LAMINA, borderRadius: RaioBorda.md,
    borderWidth: 1, borderColor: Cores.cardBorda, borderStyle: 'dashed',
  },
  clarao: {
    backgroundColor: 'rgba(212,175,55,0.9)', borderRadius: LARGURA_CARTA * 0.1,
  },
  corpo: { gap: 4 },
  nome: { fontFamily: Fontes.titulo, fontSize: 18, color: Cores.textoClaro, lineHeight: 23 },
  texto: { fontFamily: Fontes.corpo, fontSize: 14, lineHeight: 22, color: Cores.textoSecundario },
});
