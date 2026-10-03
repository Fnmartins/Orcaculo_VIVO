import React, { useCallback, useEffect, useRef } from 'react';
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
  aoMedir?: (medida: { topo: number; base: number; esquerda: number; direita: number }) => void;
  /**
   * Muda quando a tela rola, para a vaga se medir de novo.
   *
   * `onLayout` não dispara ao rolar: com o monte fixo na tela, soltar a carta depois de
   * rolar usaria a medida antiga e a carta cairia na vaga errada.
   */
  versaoDaMedida?: number;
  /** Cartao menor, para a Cruz Celta caber em forma de cruz na tela larga. */
  compacta?: boolean;
  /**
   * Carta posta de lado, como a que atravessa na Cruz Celta.
   *
   * Gira só a lâmina, que é onde a carta está. O nome da posição e a pergunta ficam na
   * horizontal: na mesa de verdade quem se põe cruzada é a carta, não o cartão, e a
   * posição de lado é a que ninguém consegue ler — justo a que a pessoa mais precisa.
   */
  deitada?: boolean;
}

/** 13rem no protótipo. A carta encaixa dentro pela proporção, como no baralho real. */
const ALTURA_LAMINA = 208;
/** Na cruz são dez cartões ao mesmo tempo; no tamanho cheio não cabe cruz nenhuma. */
const ALTURA_COMPACTA = 124;
const PROPORCAO = 1.58;
const larguraDaCarta = (altura: number) => Math.round(altura / PROPORCAO);

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
  posicao, carta, revelada = false, aoReceber, aoVirar, aoMedir, versaoDaMedida = 0,
  compacta = false, deitada = false,
}: Props) {
  const alturaDaLamina = compacta ? ALTURA_COMPACTA : ALTURA_LAMINA;
  const larguraCarta = larguraDaCarta(alturaDaLamina);
  const caixa = useRef<View>(null);
  const giro = useRef(new Animated.Value(0)).current;
  const clarao = useRef(new Animated.Value(0)).current;

  // `measureInWindow` e não o layout do `onLayout`: o layout vem relativo ao pai, e o
  // dedo chega em coordenada de tela. Misturar os dois acerta por acaso.
  const medir = useCallback(() => {
    caixa.current?.measureInWindow((x, y, largura, altura) => {
      aoMedir?.({ topo: y, base: y + altura, esquerda: x, direita: x + largura });
    });
  }, [aoMedir]);

  useEffect(() => { medir(); }, [medir, versaoDaMedida]);

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
      style={[estilos.vaga, compacta && estilos.vagaCompacta]}
      ref={caixa}
      onLayout={medir}
    >
      <Text style={[estilos.posicao, compacta && estilos.posicaoCompacta]}>
        {posicao.nome}
      </Text>

      <View style={[estilos.lamina, { height: alturaDaLamina }]}>
        {/* Gira-se a caixa da carta, e não a da lâmina inteira: sobre o próprio centro ela
            fica de lado no meio da lâmina. Deitada, a carta passa a ter a altura da lâmina
            de largura — 124 na compacta, contra os 142 que o cartão tem por dentro — e não
            encosta em nada. */}
        <View
          testID={deitada ? 'lamina-deitada' : undefined}
          style={deitada ? estilos.deitada : undefined}
        >
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
                    largura={larguraCarta}
                  />
                )
                : <VersoDaCarta largura={larguraCarta} altura={alturaDaLamina} />}
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject, estilos.clarao,
                  { opacity: clarao, borderRadius: larguraCarta * 0.1 },
                ]}
              />
            </Animated.View>
          ) : (
            <View
              style={[estilos.vazia, { width: larguraCarta, height: alturaDaLamina }]}
            />
          )}
        </View>
      </View>

      {revelada && carta ? (
        <View style={estilos.corpo}>
          <Text style={[estilos.nome, compacta && estilos.nomeCompacto]}>
            {carta.nomeCompleto}
          </Text>
          {/* Na cruz o significado fica de fora: dez blocos de texto apagam o desenho
              da cruz, que e a razao de ela existir. Ele volta na leitura completa. */}
          {!compacta && <Text style={estilos.texto}>{carta.significado}</Text>}
        </View>
      ) : (
        <Text style={[estilos.texto, compacta && estilos.textoCompacto]}>
          {posicao.regra}
        </Text>
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
  // Largura fixa, e nao '100%': dentro das colunas da cruz, '100%' faz cada vaga
  // tentar ocupar a linha inteira e duas delas acabam no mesmo lugar, uma sobre a
  // outra — foi exatamente o que aconteceu com 'O que atravessa' e 'O que vem'.
  vagaCompacta: { width: 158, padding: Espacamento.sm, gap: 4, borderRadius: 10 },
  posicao: { fontFamily: Fontes.titulo, fontSize: 17, color: Cores.acento },
  posicaoCompacta: { fontSize: 13 },
  lamina: { alignItems: 'center', justifyContent: 'center' },
  deitada: { transform: [{ rotate: '90deg' }] },
  vazia: {
    borderRadius: RaioBorda.md,
    borderWidth: 1, borderColor: Cores.cardBorda, borderStyle: 'dashed',
  },
  clarao: { backgroundColor: 'rgba(212,175,55,0.9)' },
  corpo: { gap: 4 },
  nome: { fontFamily: Fontes.titulo, fontSize: 18, color: Cores.textoClaro, lineHeight: 23 },
  nomeCompacto: { fontSize: 13, lineHeight: 17 },
  texto: { fontFamily: Fontes.corpo, fontSize: 14, lineHeight: 22, color: Cores.textoSecundario },
  textoCompacto: { fontSize: 11, lineHeight: 15 },
});
