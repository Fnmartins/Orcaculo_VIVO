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
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';

const ETAPAS = [
  { icone: 'telescope', texto: 'Mapeando posições celestes...', iconLib: 'material' as const },
  { icone: 'sunny-outline', texto: 'Calculando o Sol...', iconLib: 'ionicons' as const },
  { icone: 'moon-outline', texto: 'Identificando a Lua...', iconLib: 'ionicons' as const },
  { icone: 'earth-outline', texto: 'Definindo o Ascendente...', iconLib: 'ionicons' as const },
  { icone: 'star-four-points-outline', texto: 'Interpretando as Casas...', iconLib: 'material' as const },
  { icone: 'sparkles-outline', texto: 'Gerando sua interpretação...', iconLib: 'ionicons' as const },
];

const SIMBOLOS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

export default function TelaMapaAstralGerando() {
  const params = useLocalSearchParams<{
    dia: string; mes: string; ano: string;
    hora: string; minuto: string; cidade: string;
  }>();

  const [etapaAtual, setEtapaAtual] = useState(0);
  const rotacao = useRef(new Animated.Value(0)).current;
  const fadeEtapa = useRef(new Animated.Value(1)).current;
  const pulso = useRef(new Animated.Value(1)).current;

  // Animação de rotação contínua
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotacao, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotacao]);

  // Pulso do centro
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulso]);

  // Progressão das etapas
  useEffect(() => {
    const intervalos = [1500, 1500, 1500, 1500, 1500, 2000];
    let timeout: ReturnType<typeof setTimeout>;

    function avancar(idx: number) {
      if (idx >= ETAPAS.length) {
        Hapticos.impactoMedio();
        router.replace({
          pathname: '/mapa-astral/resultado',
          params,
        });
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

    timeout = setTimeout(() => avancar(0), 800);
    return () => clearTimeout(timeout);
  }, []);

  const spin = rotacao.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const etapa = ETAPAS[etapaAtual];
  const IconeAtual = etapa?.iconLib === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          {/* Título */}
          <Text style={estilos.titulo}>Gerando Mapa Astral</Text>
          <Text style={estilos.subtitulo}>
            {params.dia}/{params.mes}/{params.ano} às {params.hora}:{(params.minuto ?? '0').padStart(2, '0')}
          </Text>

          {/* Roda zodiacal */}
          <View style={estilos.rodaContainer}>
            <Animated.View style={[estilos.rodaExterna, { transform: [{ rotate: spin }] }]}>
              {SIMBOLOS.map((simbolo, i) => {
                const angulo = (i * 30 * Math.PI) / 180;
                const raio = 110;
                return (
                  <Text
                    key={i}
                    style={[
                      estilos.simbolo,
                      {
                        left: 110 + Math.cos(angulo - Math.PI / 2) * raio - 12,
                        top: 110 + Math.sin(angulo - Math.PI / 2) * raio - 12,
                      },
                    ]}
                  >
                    {simbolo}
                  </Text>
                );
              })}
            </Animated.View>

            {/* Centro pulsante */}
            <Animated.View style={[estilos.centro, { transform: [{ scale: pulso }] }]}>
              <MaterialCommunityIcons name="star-four-points" size={32} color={Cores.acento} />
            </Animated.View>
          </View>

          {/* Etapa atual */}
          <Animated.View style={[estilos.etapaContainer, { opacity: fadeEtapa }]}>
            {etapa && (
              <>
                <IconeAtual name={etapa.icone as any} size={24} color={Cores.acento} />
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
  rodaContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.xl,
  },
  rodaExterna: {
    width: 240,
    height: 240,
    position: 'absolute',
  },
  simbolo: {
    position: 'absolute',
    fontSize: 22,
    color: 'rgba(212, 175, 55, 0.6)',
    width: 24,
    textAlign: 'center',
  },
  centro: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
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
