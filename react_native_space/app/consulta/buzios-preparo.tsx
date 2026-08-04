import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';

const FRASES = [
  'Silencie sua mente...',
  'Conecte-se com os Orixás...',
  'Formule sua pergunta interiormente...',
  'Os búzios estão sendo consagrados...',
  'A sabedoria ancestral se manifesta...',
];

export default function TelaBuziosPreparo() {
  const [fraseIndex, setFraseIndex] = useState(0);
  const fadeTexto = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotacaoAnim = useRef(new Animated.Value(0)).current;
  const progressoAnim = useRef(new Animated.Value(0)).current;

  // Animações de fundo
  const anel1 = useRef(new Animated.Value(0.8)).current;
  const anel2 = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Pulso do ícone
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Rotação
    Animated.loop(
      Animated.timing(rotacaoAnim, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // Anéis pulsantes
    Animated.loop(
      Animated.sequence([
        Animated.timing(anel1, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anel1, { toValue: 0.8, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(anel2, { toValue: 0.9, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anel2, { toValue: 0.6, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Progresso
    Animated.timing(progressoAnim, {
      toValue: 1,
      duration: 10000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [pulseAnim, rotacaoAnim, anel1, anel2, progressoAnim]);

  // Ciclo de frases
  useEffect(() => {
    const mostrarFrase = (index: number) => {
      fadeTexto.setValue(0);
      setFraseIndex(index);
      Animated.sequence([
        Animated.timing(fadeTexto, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(fadeTexto, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        if (index < FRASES.length - 1) {
          mostrarFrase(index + 1);
        } else {
          router.replace('/consulta/buzios-jogo');
        }
      });
    };
    mostrarFrase(0);
  }, [fadeTexto]);

  const rotacao = rotacaoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const larguraProgresso = progressoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          {/* Ícone central com anéis */}
          <View style={estilos.iconeCentral}>
            {/* Anel externo */}
            <Animated.View style={[
              estilos.anel, estilos.anelExterno,
              { transform: [{ scale: anel1 }, { rotate: rotacao }], opacity: anel1 },
            ]} />
            {/* Anel interno */}
            <Animated.View style={[
              estilos.anel, estilos.anelInterno,
              { transform: [{ scale: anel2 }], opacity: anel2 },
            ]} />

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={estilos.iconeContainer}>
                <MaterialCommunityIcons name="grain" size={64} color={Cores.acento} />
              </View>
            </Animated.View>
          </View>

          {/* Frase animada */}
          <Animated.View style={{ opacity: fadeTexto, marginBottom: Espacamento.xxl }}>
            <Text style={estilos.frase}>{FRASES[fraseIndex]}</Text>
          </Animated.View>

          {/* Barra de progresso */}
          <View style={estilos.progressoContainer}>
            <Animated.View style={[estilos.progressoBarra, { width: larguraProgresso as any }]} />
          </View>
          <Text style={estilos.preparandoTexto}>Preparando os búzios...</Text>
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
    paddingHorizontal: Espacamento.xl,
  },
  iconeCentral: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.xxl,
  },
  anel: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  anelExterno: {
    width: 200,
    height: 200,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  anelInterno: {
    width: 150,
    height: 150,
    borderColor: 'rgba(212, 175, 55, 0.15)',
  },
  iconeContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frase: {
    fontFamily: Fontes.titulo,
    fontSize: 24,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
    lineHeight: 32,
  },
  progressoContainer: {
    width: '80%',
    height: 3,
    backgroundColor: 'rgba(245, 240, 232, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressoBarra: {
    height: '100%',
    backgroundColor: Cores.acento,
    borderRadius: 2,
  },
  preparandoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginTop: Espacamento.md,
  },
});
