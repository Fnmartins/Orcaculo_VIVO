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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';

const ETAPAS = [
  { icone: 'format-letter-case', texto: 'Decodificando letras do nome...', iconLib: 'material' as const },
  { icone: 'calculator-variant', texto: 'Calculando Caminho de Vida...', iconLib: 'material' as const },
  { icone: 'heart-outline', texto: 'Revelando Número da Alma...', iconLib: 'ionicons' as const },
  { icone: 'person-outline', texto: 'Analisando Personalidade...', iconLib: 'ionicons' as const },
  { icone: 'sparkles-outline', texto: 'Gerando interpretação...', iconLib: 'ionicons' as const },
];

const NUMEROS_FLUTUANTES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22'];

export default function TelaNumerologiaCalculando() {
  const params = useLocalSearchParams<{
    nome: string; dia: string; mes: string; ano: string;
  }>();

  const [etapaAtual, setEtapaAtual] = useState(0);
  const pulso = useRef(new Animated.Value(1)).current;
  const fadeEtapa = useRef(new Animated.Value(1)).current;
  const numAnims = useRef(NUMEROS_FLUTUANTES.map(() => ({
    pos: new Animated.Value(0),
    opacity: new Animated.Value(0.3),
  }))).current;

  // Animação dos números flutuantes
  useEffect(() => {
    numAnims.forEach((anim, i) => {
      const delay = i * 200;
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim.pos, { toValue: -40, duration: 2000 + i * 100, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(anim.opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
              Animated.timing(anim.opacity, { toValue: 0.2, duration: 1200 + i * 100, useNativeDriver: true }),
            ]),
          ]),
          Animated.timing(anim.pos, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });
  }, [numAnims]);

  // Pulso central
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1.15, duration: 800, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1, duration: 800, easing: Easing.ease, useNativeDriver: true }),
      ])
    ).start();
  }, [pulso]);

  // Progressão
  useEffect(() => {
    const intervalos = [1800, 1800, 1500, 1500, 2000];
    let timeout: ReturnType<typeof setTimeout>;

    function avancar(idx: number) {
      if (idx >= ETAPAS.length) {
        Hapticos.impactoMedio();
        router.replace({ pathname: '/numerologia/resultado', params });
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

    timeout = setTimeout(() => avancar(0), 600);
    return () => clearTimeout(timeout);
  }, []);

  const etapa = ETAPAS[etapaAtual];
  const IconeAtual = etapa?.iconLib === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          <Text style={estilos.titulo}>Calculando Numerologia</Text>
          <Text style={estilos.subtitulo}>{params.nome}</Text>

          {/* Números flutuantes ao redor */}
          <View style={estilos.numerosContainer}>
            {NUMEROS_FLUTUANTES.map((num, i) => {
              const angulo = (i * (360 / NUMEROS_FLUTUANTES.length) * Math.PI) / 180;
              const raio = 100;
              return (
                <Animated.Text
                  key={i}
                  style={[
                    estilos.numeroFlutuante,
                    {
                      left: 110 + Math.cos(angulo - Math.PI / 2) * raio - 14,
                      top: 110 + Math.sin(angulo - Math.PI / 2) * raio - 14,
                      opacity: numAnims[i].opacity,
                      transform: [{ translateY: numAnims[i].pos }],
                    },
                  ]}
                >
                  {num}
                </Animated.Text>
              );
            })}

            {/* Centro */}
            <Animated.View style={[estilos.centro, { transform: [{ scale: pulso }] }]}>
              <MaterialCommunityIcons name="numeric" size={36} color={Cores.acento} />
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

          {/* Barra */}
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
  numerosContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.xl,
  },
  numeroFlutuante: {
    position: 'absolute',
    fontSize: 20,
    fontFamily: Fontes.corpoNegrito,
    color: Cores.acento,
    width: 28,
    textAlign: 'center',
  },
  centro: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  },
  etapaTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 16,
    color: Cores.textoClaro,
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
