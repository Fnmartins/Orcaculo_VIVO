import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Svg, { Polygon, Circle as SvgCircle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

const ETAPAS = [
  { icone: 'calendar-star', texto: 'Decodificando sua data de nascimento...', iconLib: 'material' as const },
  { icone: 'star-four-points', texto: 'Construindo o octograma sagrado...', iconLib: 'material' as const },
  { icone: 'cards-outline', texto: 'Posicionando os 22 Arcanos...', iconLib: 'material' as const },
  { icone: 'meditation', texto: 'Alinhando os 7 chakras...', iconLib: 'material' as const },
  { icone: 'sparkles-outline', texto: 'Revelando seu propósito de alma...', iconLib: 'ionicons' as const },
];

const TAMANHO = 240;
const CENTRO = TAMANHO / 2;
const RAIO = 95;

// Gera os pontos de um quadrado rotacionado
function pontosQuadrado(rotacao: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const ang = (rotacao + i * 90) * (Math.PI / 180);
    const x = CENTRO + Math.cos(ang) * RAIO;
    const y = CENTRO + Math.sin(ang) * RAIO;
    pts.push(`${x},${y}`);
  }
  return pts.join(' ');
}

export default function TelaMatrizCalculando() {
  const params = useLocalSearchParams<{
    nome: string; dia: string; mes: string; ano: string;
  }>();

  const [etapaAtual, setEtapaAtual] = useState(0);
  const rotacao = useRef(new Animated.Value(0)).current;
  const escala = useRef(new Animated.Value(0.6)).current;
  const opacidadeQuad2 = useRef(new Animated.Value(0)).current;
  const pulso = useRef(new Animated.Value(1)).current;
  const fadeEtapa = useRef(new Animated.Value(1)).current;
  const brilhoPontos = useRef(new Animated.Value(0)).current;

  // Animação de construção do octograma
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(escala, { toValue: 1, duration: 800, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
        Animated.timing(rotacao, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(opacidadeQuad2, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(brilhoPontos, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Rotação contínua suave
    Animated.loop(
      Animated.timing(rotacao, { toValue: 2, duration: 20000, easing: Easing.linear, useNativeDriver: true })
    );
  }, []);

  // Pulso central
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1.15, duration: 900, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1, duration: 900, easing: Easing.ease, useNativeDriver: true }),
      ])
    ).start();
  }, [pulso]);

  // Progressão das etapas
  useEffect(() => {
    const intervalos = [1700, 1800, 1800, 1600, 2000];
    let timeout: ReturnType<typeof setTimeout>;

    function avancar(idx: number) {
      if (idx >= ETAPAS.length) {
        Hapticos.impactoMedio();
        router.replace({ pathname: '/matriz-destino/resultado', params });
        return;
      }
      Animated.sequence([
        Animated.timing(fadeEtapa, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeEtapa, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setEtapaAtual(idx);
      Hapticos.impactoLeve();
      timeout = setTimeout(() => avancar(idx + 1), intervalos[idx]);
    }

    timeout = setTimeout(() => avancar(0), 700);
    return () => clearTimeout(timeout);
  }, []);

  const etapa = ETAPAS[etapaAtual];
  const IconeAtual = etapa?.iconLib === 'material' ? MaterialCommunityIcons : Ionicons;

  const rotacaoStr = rotacao.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '45deg', '405deg'],
  });

  // Pontos do octograma (8 pontas)
  const pontas = Array.from({ length: 8 }, (_, i) => {
    const ang = (i * 45 - 90) * (Math.PI / 180);
    return {
      x: CENTRO + Math.cos(ang) * RAIO,
      y: CENTRO + Math.sin(ang) * RAIO,
      cor: ['#9B59B6', '#5B4B8A', '#3498DB', '#2ECC71', '#F1C40F', '#E67E22', '#E74C3C', '#E91E63'][i],
    };
  });

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          <Text style={estilos.titulo}>Construindo sua Matriz</Text>
          <Text style={estilos.subtitulo}>{params.nome || `${params.dia}/${params.mes}/${params.ano}`}</Text>

          {/* Octograma animado */}
          <View style={estilos.octogramaContainer}>
            <Animated.View style={{ transform: [{ scale: escala }, { rotate: rotacaoStr }] }}>
              <Svg width={TAMANHO} height={TAMANHO}>
                <Defs>
                  <RadialGradient id="glowCentro" cx="50%" cy="50%" rx="50%" ry="50%">
                    <Stop offset="0%" stopColor="rgba(212,175,55,0.4)" />
                    <Stop offset="100%" stopColor="rgba(212,175,55,0)" />
                  </RadialGradient>
                </Defs>

                {/* Primeiro quadrado */}
                <Polygon
                  points={pontosQuadrado(-45)}
                  fill="none"
                  stroke="rgba(212,175,55,0.6)"
                  strokeWidth="1.5"
                />
                {/* Segundo quadrado (rotacionado 45°) */}
                <AnimatedPolygon
                  points={pontosQuadrado(0)}
                  fill="none"
                  stroke="rgba(135,206,235,0.5)"
                  strokeWidth="1.5"
                  opacity={opacidadeQuad2}
                />
                {/* Linhas radiais */}
                {pontas.map((p, i) => (
                  <Line
                    key={`l${i}`}
                    x1={CENTRO}
                    y1={CENTRO}
                    x2={p.x}
                    y2={p.y}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="0.8"
                  />
                ))}
                {/* Pontos das pontas */}
                {pontas.map((p, i) => (
                  <AnimatedCircle
                    key={`p${i}`}
                    cx={p.x}
                    cy={p.y}
                    r="7"
                    fill={p.cor}
                    opacity={brilhoPontos}
                  />
                ))}
              </Svg>
            </Animated.View>

            {/* Centro pulsante */}
            <Animated.View style={[estilos.centro, { transform: [{ scale: pulso }] }]}>
              <MaterialCommunityIcons name="star-four-points" size={32} color={Cores.acento} />
            </Animated.View>
          </View>

          {/* Etapa */}
          <Animated.View style={[estilos.etapaContainer, { opacity: fadeEtapa }]}>
            {etapa && (
              <>
                <IconeAtual name={etapa.icone as any} size={22} color={Cores.acento} />
                <Text style={estilos.etapaTexto}>{etapa.texto}</Text>
              </>
            )}
          </Animated.View>

          {/* Barra de progresso */}
          <View style={estilos.progressoContainer}>
            <View style={estilos.progressoBarra}>
              <Animated.View
                style={[
                  estilos.progressoPreenchido,
                  { width: `${((etapaAtual + 1) / ETAPAS.length) * 100}%` },
                ]}
              />
            </View>
            <Text style={estilos.progressoTexto}>{etapaAtual + 1}/{ETAPAS.length}</Text>
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Espacamento.lg,
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 24,
    color: Cores.textoClaro,
    textAlign: 'center',
  },
  subtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Espacamento.xl,
  },
  octogramaContainer: {
    width: TAMANHO,
    height: TAMANHO,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.xl,
  },
  centro: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  etapaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
    marginBottom: Espacamento.xl,
    minHeight: 30,
    paddingHorizontal: Espacamento.md,
  },
  etapaTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 15,
    color: Cores.textoClaro,
    flexShrink: 1,
  },
  progressoContainer: {
    width: '80%',
    alignItems: 'center',
    gap: Espacamento.sm,
  },
  progressoBarra: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressoPreenchido: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Cores.acento,
  },
  progressoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
});
