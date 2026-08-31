import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { GradientBackground } from '../components/GradientBackground';
import { Button } from '../components/Button';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento } from '../constants/spacing';
import { Hapticos } from '../utils/haptics';

// Dados das estrelas decorativas
const ESTRELAS = [
  { id: 0, x: -80, y: -60, tamanho: 12, opacidadeBase: 0.5 },
  { id: 1, x: 70, y: -40, tamanho: 10, opacidadeBase: 0.4 },
  { id: 2, x: -50, y: 50, tamanho: 8, opacidadeBase: 0.3 },
  { id: 3, x: 90, y: 30, tamanho: 14, opacidadeBase: 0.6 },
  { id: 4, x: -30, y: -80, tamanho: 16, opacidadeBase: 0.4 },
  { id: 5, x: 40, y: 70, tamanho: 10, opacidadeBase: 0.35 },
];

export default function TelaWelcome() {
  const [movimentoReduzido, setMovimentoReduzido] = useState(false);

  // Animações
  const estadoVisivelWeb = Platform.OS === 'web';
  const heroOpacidade = useRef(new Animated.Value(estadoVisivelWeb ? 1 : 0)).current;
  const heroEscala = useRef(new Animated.Value(estadoVisivelWeb ? 1 : 0.8)).current;
  const rotacao = useRef(new Animated.Value(0)).current;
  const tituloOpacidade = useRef(new Animated.Value(estadoVisivelWeb ? 1 : 0)).current;
  const tituloY = useRef(new Animated.Value(estadoVisivelWeb ? 0 : 30)).current;
  const divisorLargura = useRef(new Animated.Value(estadoVisivelWeb ? 60 : 0)).current;
  const taglineOpacidade = useRef(new Animated.Value(estadoVisivelWeb ? 1 : 0)).current;
  const descricaoOpacidade = useRef(new Animated.Value(estadoVisivelWeb ? 1 : 0)).current;
  const ctaOpacidade = useRef(new Animated.Value(estadoVisivelWeb ? 1 : 0)).current;
  const ctaY = useRef(new Animated.Value(estadoVisivelWeb ? 0 : 40)).current;
  const brilhoCTA = useRef(new Animated.Value(0.2)).current;

  // Estrelas twinkle
  const estrelasAnim = useRef(
    ESTRELAS.map(() => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    const verificar = async () => {
      try {
        const reduzido = await AccessibilityInfo?.isReduceMotionEnabled?.();
        setMovimentoReduzido(reduzido ?? false);
      } catch {
        setMovimentoReduzido(false);
      }
    };
    verificar();
  }, []);

  useEffect(() => {
    if (movimentoReduzido) {
      // Estado final sem animação
      heroOpacidade.setValue(1);
      heroEscala.setValue(1);
      tituloOpacidade.setValue(1);
      tituloY.setValue(0);
      divisorLargura.setValue(60);
      taglineOpacidade.setValue(1);
      descricaoOpacidade.setValue(1);
      ctaOpacidade.setValue(1);
      ctaY.setValue(0);
      brilhoCTA.setValue(0.3);
      estrelasAnim.forEach((e) => e.setValue(0.5));
      return;
    }

    // 1. Hero icon
    Animated.parallel([
      Animated.timing(heroOpacidade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(heroEscala, {
        toValue: 1,
        damping: 12,
        stiffness: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Rotação contínua
    Animated.loop(
      Animated.timing(rotacao, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Estrelas twinkle
    estrelasAnim.forEach((anim, i) => {
      const atraso = i * 400;
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: ESTRELAS[i]?.opacidadeBase ?? 0.5,
              duration: 1500 + i * 200,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.1,
              duration: 1500 + i * 200,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, atraso);
    });

    // 2. Título
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(tituloOpacidade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(tituloY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // 3. Divisor
    setTimeout(() => {
      Animated.timing(divisorLargura, {
        toValue: 60,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }, 500);

    // 4. Tagline
    setTimeout(() => {
      Animated.timing(taglineOpacidade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 600);

    // 5. Descrição
    setTimeout(() => {
      Animated.timing(descricaoOpacidade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 800);

    // 6. CTA
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(ctaOpacidade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(ctaY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1000);

    // 7. Brilho CTA loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(brilhoCTA, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(brilhoCTA, {
          toValue: 0.2,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [movimentoReduzido, heroOpacidade, heroEscala, rotacao, tituloOpacidade, tituloY, divisorLargura, taglineOpacidade, descricaoOpacidade, ctaOpacidade, ctaY, brilhoCTA, estrelasAnim]);

  const rotacaoInterpolada = rotacao.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const aoPressionarComecar = useCallback(() => {
    Hapticos.impactoMedio();
    router.push('/auth/cadastro');
  }, []);

  const aoPressionarEntrar = useCallback(() => {
    Hapticos.impactoLeve();
    router.push('/auth/login');
  }, []);

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          {/* Seção Superior - Hero */}
          <View style={estilos.secaoSuperior}>
            {/* Halo radial */}
            <View style={estilos.halo} />

            {/* Estrelas decorativas */}
            {ESTRELAS.map((estrela, i) => (
              <Animated.View
                key={estrela.id}
                style={[
                  estilos.estrelaContainer,
                  {
                    left: '50%',
                    top: '50%',
                    marginLeft: estrela.x,
                    marginTop: estrela.y,
                    opacity: estrelasAnim[i],
                  },
                ]}
              >
                <Ionicons
                  name="star"
                  size={estrela.tamanho}
                  color={Cores.acento}
                />
              </Animated.View>
            ))}

            {/* Ícone hero com rotação */}
            <Animated.View
              style={[
                estilos.heroIcone,
                {
                  opacity: heroOpacidade,
                  transform: [
                    { scale: heroEscala },
                    { rotate: movimentoReduzido ? '0deg' : rotacaoInterpolada },
                  ],
                },
              ]}
            >
              <MaterialCommunityIcons
                name="eye-outline"
                size={100}
                color={Cores.acento}
              />
            </Animated.View>
          </View>

          {/* Seção Central - Texto */}
          <View style={estilos.secaoCentral}>
            <Animated.View
              style={{
                opacity: tituloOpacidade,
                transform: [{ translateY: tituloY }],
              }}
            >
              <Text
                style={estilos.titulo}
                accessibilityRole="header"
              >
                Oráculo Vivo
              </Text>
            </Animated.View>

            {/* Divisor dourado */}
            <Animated.View
              style={[
                estilos.divisor,
                { width: divisorLargura },
              ]}
            />

            <Animated.View style={[estilos.textoLargura, { opacity: taglineOpacidade }]}>
              <Text style={estilos.tagline}>
                Sua jornada de autoconhecimento começa aqui
              </Text>
            </Animated.View>

            <Animated.View style={[estilos.textoLargura, { opacity: descricaoOpacidade }]}>
              <Text style={estilos.descricao}>
                Conecte-se com a sabedoria ancestral através da inteligência artificial.
                Descubra respostas, encontre clareza e desperte sua intuição interior.
              </Text>
            </Animated.View>
          </View>

          {/* Seção Inferior - CTA */}
          <View style={estilos.secaoInferior}>
            <Animated.View
              style={{
                opacity: ctaOpacidade,
                transform: [{ translateY: ctaY }],
                width: '100%',
              }}
            >
              {/* Brilho ao redor do botão */}
              <Animated.View
                style={[
                  estilos.brilhoBotao,
                  { opacity: brilhoCTA },
                ]}
              />
              <Button
                variante="primary"
                label="Criar conta grátis"
                icone="arrow-forward"
                posicaoIcone="right"
                larguraTotal
                onPress={aoPressionarComecar}
              />
              <Button
                variante="outline"
                label="Já tenho conta — Entrar"
                larguraTotal
                onPress={aoPressionarEntrar}
                style={{ marginTop: Espacamento.sm }}
              />
            </Animated.View>

            <Text style={estilos.versao}>v1.0.0</Text>
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Espacamento.lg,
  },
  // Seção Superior
  secaoSuperior: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Cores.acento,
    opacity: 0.1,
  },
  heroIcone: {
    zIndex: 2,
  },
  estrelaContainer: {
    position: 'absolute',
    zIndex: 1,
  },
  // Seção Central
  secaoCentral: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoLargura: {
    alignSelf: 'stretch',
    width: '100%',
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 36,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
  },
  divisor: {
    height: 1,
    backgroundColor: Cores.acento,
    opacity: 0.5,
    marginVertical: Espacamento.md,
    alignSelf: 'center',
  },
  tagline: {
    fontFamily: Fontes.corpo,
    fontSize: 18,
    color: Cores.textoClaro,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 26,
    width: '100%',
    flexShrink: 1,
  },
  descricao: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    width: '100%',
    flexShrink: 1,
  },
  // Seção Inferior
  secaoInferior: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  brilhoBotao: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    backgroundColor: Cores.acento,
    ...Platform.select({
      ios: {
        shadowColor: Cores.acento,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      default: {
        shadowColor: Cores.acento,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
    }),
  },
  versao: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: Espacamento.md,
  },
});
