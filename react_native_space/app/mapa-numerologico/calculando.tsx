import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';

const FASES = [
  'Analisando seu nome completo...',
  'Aplicando a tabela pitagórica...',
  'Calculando Caminho de Vida...',
  'Extraindo Número de Expressão...',
  'Revelando desejos da Alma...',
  'Desenhando Personalidade...',
  'Projetando Maturidade...',
  'Integrando seu mapa...',
];

export default function TelaCalculandoMapa() {
  const params = useLocalSearchParams<{ nome: string; nomeAtual?: string; dia: string; mes: string; ano: string }>();
  const [faseAtual, setFaseAtual] = useState(0);
  const rotate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [rotate, pulse]);

  useEffect(() => {
    const total = FASES.length;
    const totalMs = 4500;
    const intervalo = totalMs / total;
    const timers: ReturnType<typeof setTimeout>[] = [];
    FASES.forEach((_, i) => {
      timers.push(setTimeout(() => setFaseAtual(i), i * intervalo));
    });
    const finalTimer = setTimeout(() => {
      router.replace({
        pathname: '/mapa-numerologico/resultado',
        params,
      });
    }, totalMs + 300);
    timers.push(finalTimer);
    return () => { timers.forEach(clearTimeout); };
  }, [params]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          <Animated.View style={{ transform: [{ rotate: spin }, { scale: pulse }] }}>
            <View style={estilos.circuloExterno}>
              <MaterialCommunityIcons name="star-four-points" size={72} color={Cores.acento} />
            </View>
          </Animated.View>

          <View style={estilos.numerosVoando}>
            {['1', '3', '7', '9', '11', '22'].map((n, i) => (
              <NumeroFlutuante key={n} valor={n} delay={i * 200} />
            ))}
          </View>

          <Text style={estilos.titulo}>Traduzindo sua essência</Text>
          <Text style={estilos.fase}>{FASES[faseAtual]}</Text>

          <View style={estilos.pontosProgresso}>
            {FASES.map((_, i) => (
              <View
                key={i}
                style={[
                  estilos.ponto,
                  i <= faseAtual && estilos.pontoAtivo,
                ]}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

function NumeroFlutuante({ valor, delay }: { valor: string; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, [anim, delay]);

  const opacity = anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [40, -40] });

  return (
    <Animated.Text
      style={[estilos.numeroFlutuante, { opacity, transform: [{ translateY }] }]}
    >
      {valor}
    </Animated.Text>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Espacamento.xl,
  },
  circuloExterno: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 2, borderColor: Cores.acento,
    alignItems: 'center', justifyContent: 'center',
  },
  numerosVoando: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    height: 80,
    marginTop: Espacamento.lg,
  },
  numeroFlutuante: {
    fontFamily: Fontes.titulo,
    fontSize: 24,
    color: Cores.acento,
    fontWeight: '700',
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    color: Cores.textoClaro,
    fontWeight: '700',
    marginTop: Espacamento.lg,
    textAlign: 'center',
  },
  fase: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    marginTop: Espacamento.sm,
    textAlign: 'center',
    minHeight: 40,
  },
  pontosProgresso: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Espacamento.lg,
  },
  ponto: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pontoAtivo: {
    backgroundColor: Cores.acento,
  },
});
