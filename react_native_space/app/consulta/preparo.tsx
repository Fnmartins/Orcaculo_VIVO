import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient as SvgRadialGradient, Stop, Ellipse } from 'react-native-svg';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';

const { width: W } = Dimensions.get('window');
const BOLA_SIZE = Math.min(W * 0.6, 220);

const FRASES_TAROT = [
  'Respire fundo...',
  'Concentre-se na sua pergunta...',
  'Deixe a intuição fluir...',
  'As cartas estão se preparando...',
];

const FRASES_BUZIOS = [
  'Sinta a energia dos búzios...',
  'Formule sua intenção com clareza...',
  'O axé está se manifestando...',
  'Os Odus estão se alinhando...',
];

// Bola de Cristal com gradiente radial SVG
function BolaCristal({ pulseAnim }: { pulseAnim: Animated.Value }) {
  const r = BOLA_SIZE / 2;
  return (
    <Animated.View style={[estilos.bolaContainer, { transform: [{ scale: pulseAnim }] }]}>
      <Svg width={BOLA_SIZE} height={BOLA_SIZE}>
        <Defs>
          <SvgRadialGradient id="bolaGrad" cx="38%" cy="30%" r="65%" fx="38%" fy="30%">
            <Stop offset="0%" stopColor="#9B6FE8" stopOpacity="0.95" />
            <Stop offset="35%" stopColor="#4B0082" stopOpacity="0.85" />
            <Stop offset="70%" stopColor="#1a0a2e" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#0B0915" stopOpacity="1" />
          </SvgRadialGradient>
          <SvgRadialGradient id="reflexo" cx="32%" cy="25%" r="30%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.35)" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity="0" />
          </SvgRadialGradient>
          <SvgRadialGradient id="glowExt" cx="50%" cy="50%" r="50%">
            <Stop offset="60%" stopColor="rgba(100,0,180,0)" stopOpacity="0" />
            <Stop offset="100%" stopColor="rgba(100,0,180,0.4)" stopOpacity="0.4" />
          </SvgRadialGradient>
        </Defs>
        {/* Glow externo */}
        <Circle cx={r} cy={r} r={r} fill="url(#glowExt)" />
        {/* Corpo da bola */}
        <Circle cx={r} cy={r} r={r - 2} fill="url(#bolaGrad)" />
        {/* Reflexo de luz */}
        <Ellipse cx={r * 0.72} cy={r * 0.58} rx={r * 0.28} ry={r * 0.18}
          fill="url(#reflexo)" />
        {/* Reflexo menor */}
        <Ellipse cx={r * 0.58} cy={r * 0.44} rx={r * 0.1} ry={r * 0.06}
          fill="rgba(255,255,255,0.2)" />
      </Svg>
    </Animated.View>
  );
}

// Anel orbitante
function AnelOrbitante({ rotAnim, raio, espessura, cor, velocidade, sentido = 1 }:
  { rotAnim: Animated.Value; raio: number; espessura: number; cor: string; velocidade: number; sentido?: number }) {
  const rot = rotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: sentido === 1 ? ['0deg', '360deg'] : ['360deg', '0deg'],
  });
  return (
    <Animated.View style={[
      estilos.anel,
      {
        width: raio * 2,
        height: raio * 2,
        borderRadius: raio,
        borderWidth: espessura,
        borderColor: cor,
        transform: [{ rotate: rot }],
      },
    ]}>
      {/* Ponto brilhante no anel */}
      <View style={[
        estilos.anelPonto,
        { width: espessura * 3.5, height: espessura * 3.5, borderRadius: espessura * 2, backgroundColor: cor },
      ]} />
    </Animated.View>
  );
}

// Estrela estática de fundo
function Estrela({ x, y, tamanho, opacidade }: { x: number; y: number; tamanho: number; opacidade: number }) {
  const brilhaAnim = useRef(new Animated.Value(opacidade)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(brilhaAnim, { toValue: opacidade * 0.3, duration: 1200 + Math.random() * 1000, useNativeDriver: true }),
        Animated.timing(brilhaAnim, { toValue: opacidade, duration: 1200 + Math.random() * 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute',
      left: x, top: y,
      width: tamanho, height: tamanho,
      borderRadius: tamanho / 2,
      backgroundColor: '#fff',
      opacity: brilhaAnim,
    }} />
  );
}

const ESTRELAS = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 137.5 % 1) * W,
  y: (i * 97.3 % 1) * 200,
  tamanho: i % 3 === 0 ? 2 : 1,
  opacidade: 0.3 + (i % 5) * 0.1,
}));

export default function TelaPreparo() {
  const { tipo = 'tarot' } = useLocalSearchParams<{ tipo?: string }>();
  const frases = tipo === 'buzios' ? FRASES_BUZIOS : FRASES_TAROT;

  const [fraseIndex, setFraseIndex] = useState(0);
  const fadeTexto = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotacao1 = useRef(new Animated.Value(0)).current;
  const rotacao2 = useRef(new Animated.Value(0)).current;
  const rotacao3 = useRef(new Animated.Value(0)).current;
  const progressoAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Pulso suave da bola
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 2200, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.97, duration: 2200, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
      ])
    ).start();

    // Anéis em velocidades diferentes
    Animated.loop(
      Animated.timing(rotacao1, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.timing(rotacao2, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.timing(rotacao3, { toValue: 1, duration: 13000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // Glow pulsante
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Progresso
    Animated.timing(progressoAnim, {
      toValue: 1,
      duration: 8000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, []);

  // Ciclo de frases
  useEffect(() => {
    const mostrarFrase = (index: number) => {
      fadeTexto.setValue(0);
      setFraseIndex(index);
      Animated.sequence([
        Animated.timing(fadeTexto, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.delay(1300),
        Animated.timing(fadeTexto, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start(() => {
        if (index < frases.length - 1) {
          mostrarFrase(index + 1);
        } else {
          router.replace('/consulta/cartas');
        }
      });
    };
    mostrarFrase(0);
  }, [fadeTexto]);

  const larguraProgresso = progressoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient colors={['#070510', '#0F0A1E', '#070510']} style={{ flex: 1 }}>
      {/* Campo de estrelas */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {ESTRELAS.map((e, i) => (
          <Estrela key={i} {...e} />
        ))}
      </View>

      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          {/* Glow de fundo da bola */}
          <Animated.View style={[estilos.bolaGlowFundo, { opacity: glowAnim }]} />

          {/* Anéis orbitantes */}
          <View style={estilos.anelWrapper} pointerEvents="none">
            <AnelOrbitante rotAnim={rotacao1} raio={BOLA_SIZE / 2 + 28} espessura={1.2}
              cor="rgba(212,175,55,0.5)" velocidade={6000} />
            <AnelOrbitante rotAnim={rotacao2} raio={BOLA_SIZE / 2 + 52} espessura={0.8}
              cor="rgba(155,111,232,0.35)" velocidade={9000} sentido={-1} />
            <AnelOrbitante rotAnim={rotacao3} raio={BOLA_SIZE / 2 + 76} espessura={0.6}
              cor="rgba(212,175,55,0.2)" velocidade={13000} />
          </View>

          {/* Bola de Cristal */}
          <BolaCristal pulseAnim={pulseAnim} />

          {/* Frase animada */}
          <Animated.View style={[estilos.fraseContainer, { opacity: fadeTexto }]}>
            <Text style={estilos.frase}>{frases[fraseIndex]}</Text>
          </Animated.View>

          {/* Barra de progresso */}
          <View style={estilos.progressoContainer}>
            <View style={estilos.progressoTrack}>
              <Animated.View style={[estilos.progressoBarra, { width: larguraProgresso as any }]} />
            </View>
          </View>

          <Text style={estilos.preparandoTexto}>
            {tipo === 'buzios' ? 'Preparando o jogo...' : 'Preparando sua leitura...'}
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Espacamento.xl,
  },

  bolaGlowFundo: {
    position: 'absolute',
    width: BOLA_SIZE * 1.8,
    height: BOLA_SIZE * 1.8,
    borderRadius: BOLA_SIZE * 0.9,
    backgroundColor: 'rgba(75,0,130,0.25)',
  },

  anelWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: BOLA_SIZE + 200,
    height: BOLA_SIZE + 200,
  },
  anel: {
    position: 'absolute',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  anelPonto: {
    marginLeft: -4,
  },

  bolaContainer: {
    marginBottom: Espacamento.xxl + Espacamento.md,
  },

  fraseContainer: {
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
    marginBottom: Espacamento.xxl,
  },
  frase: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: 0.5,
  },

  progressoContainer: {
    width: '70%',
    alignItems: 'center',
  },
  progressoTrack: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressoBarra: {
    height: '100%',
    backgroundColor: Cores.acento,
    borderRadius: 1,
  },

  preparandoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: 'rgba(212,175,55,0.5)',
    marginTop: Espacamento.md,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
