import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { GradientBackground } from '../components/GradientBackground';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';

const { width: LARGURA_TELA } = Dimensions.get('window');

// Gera posições aleatórias para partículas
function gerarParticulas(quantidade: number) {
  return Array.from({ length: quantidade }, (_, i) => ({
    id: i,
    x: Math.random() * LARGURA_TELA * 0.6 - LARGURA_TELA * 0.3,
    y: Math.random() * 200 - 100,
    tamanho: 3 + Math.random() * 2,
    atraso: Math.random() * 1000,
  }));
}

export default function TelaSplash() {
  const [movimentoReduzido, setMovimentoReduzido] = useState(false);

  // Valores animados
  const simboloEscala = useRef(new Animated.Value(0.5)).current;
  const anelOpacidade = useRef(new Animated.Value(0)).current;
  const tituloOpacidade = useRef(new Animated.Value(0)).current;
  const tituloY = useRef(new Animated.Value(20)).current;
  const subtituloOpacidade = useRef(new Animated.Value(0)).current;
  const telaOpacidade = useRef(new Animated.Value(1)).current;

  const particulas = useRef(gerarParticulas(10)).current;
  const particulasAnim = useRef(
    particulas.map(() => ({
      opacidade: new Animated.Value(0),
      translateY: new Animated.Value(0),
    }))
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
      // Sem animações - mostra tudo imediatamente
      simboloEscala.setValue(1);
      anelOpacidade.setValue(0.5);
      tituloOpacidade.setValue(1);
      tituloY.setValue(0);
      subtituloOpacidade.setValue(1);

      const timer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 2900);
      return () => clearTimeout(timer);
    }

    // 1. Símbolo escala
    Animated.spring(simboloEscala, {
      toValue: 1,
      damping: 12,
      stiffness: 100,
      useNativeDriver: true,
    }).start();

    // 2. Anel de brilho
    setTimeout(() => {
      anelOpacidade.setValue(0.3);
      Animated.loop(
        Animated.sequence([
          Animated.timing(anelOpacidade, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anelOpacidade, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 300);

    // 3. Título
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
    }, 500);

    // 4. Subtítulo
    setTimeout(() => {
      Animated.timing(subtituloOpacidade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 800);

    // 5. Partículas
    setTimeout(() => {
      particulasAnim.forEach((p) => {
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(p.opacidade, {
                toValue: 0.8,
                duration: 1500,
                useNativeDriver: true,
              }),
              Animated.timing(p.translateY, {
                toValue: -60,
                duration: 3000,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(p.opacidade, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(p.translateY, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
              }),
            ]),
          ])
        ).start();
      });
    }, 400);

    // 6. Fade-out e navegação — verifica sessão para decidir destino
    const timerNavegacao = setTimeout(() => {
      Animated.timing(telaOpacidade, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        router.replace('/(tabs)');
      });
    }, 2500);

    return () => clearTimeout(timerNavegacao);
  }, [movimentoReduzido, simboloEscala, anelOpacidade, tituloOpacidade, tituloY, subtituloOpacidade, telaOpacidade, particulasAnim]);

  return (
    <GradientBackground>
      <Animated.View
        style={[estilos.container, { opacity: telaOpacidade }]}
        accessibilityLabel="Oráculo Vivo, carregando"
        accessibilityRole="header"
      >
        {/* Partículas douradas */}
        {particulas.map((p, i) => (
          <Animated.View
            key={p.id}
            style={[
              estilos.particula,
              {
                width: p.tamanho,
                height: p.tamanho,
                borderRadius: p.tamanho / 2,
                left: LARGURA_TELA / 2 + p.x,
                top: '45%',
                marginTop: p.y,
                opacity: particulasAnim[i]?.opacidade ?? 0,
                transform: [{ translateY: particulasAnim[i]?.translateY ?? 0 }],
              },
            ]}
          />
        ))}

        {/* Anel de brilho */}
        <Animated.View style={[estilos.anelBrilho, { opacity: anelOpacidade }]} />

        {/* Símbolo oracle */}
        <Animated.View
          style={[
            estilos.simboloContainer,
            { transform: [{ scale: simboloEscala }] },
          ]}
        >
          <MaterialCommunityIcons
            name="eye-outline"
            size={120}
            color={Cores.acento}
          />
        </Animated.View>

        {/* Título */}
        <Animated.View
          style={{
            opacity: tituloOpacidade,
            transform: [{ translateY: tituloY }],
          }}
        >
          <Text style={estilos.titulo}>Oráculo Vivo</Text>
        </Animated.View>

        {/* Subtítulo */}
        <Animated.View style={{ opacity: subtituloOpacidade }}>
          <Text style={estilos.subtitulo}>Desperte sua intuição</Text>
        </Animated.View>
      </Animated.View>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simboloContainer: {
    marginBottom: 24,
    zIndex: 2,
  },
  anelBrilho: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: Cores.acento,
    alignSelf: 'center',
    top: '50%',
    marginTop: -90 - 12, // centralizar com o ícone
    zIndex: 1,
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 36,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
  },
  subtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.acento,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
  },
  particula: {
    position: 'absolute',
    backgroundColor: Cores.acento,
    zIndex: 0,
  },
});
