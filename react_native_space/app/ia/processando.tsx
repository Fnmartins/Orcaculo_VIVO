import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { analisarImagem as analisarImagemMock, type TipoAnalise } from '../../data/ia-analise';
import { analisarImagemIA } from '../../services/ia';
import { SomMistico } from '../../services/somMistico';

const ETAPAS_PROCESSO = [
  'Recebendo imagem...',
  'Identificando padrões visuais...',
  'Analisando formas e símbolos...',
  'Gerando interpretação personalizada...',
  'Preparando sua leitura...',
];

export default function TelaProcessando() {
  const { tipo = 'cafe', imagemUri = '' } = useLocalSearchParams<{ tipo?: string; imagemUri?: string }>();
  const [etapaIndex, setEtapaIndex] = useState(0);
  const fadeEtapa = useRef(new Animated.Value(1)).current;
  const rotacaoAnim = useRef(new Animated.Value(0)).current;
  const progressoAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    SomMistico.tocarIA();
    return () => { SomMistico.parar(); };
  }, []);

  useEffect(() => {
    // Rotação contínua
    Animated.loop(
      Animated.timing(rotacaoAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // Pulso
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Progresso
    Animated.timing(progressoAnim, {
      toValue: 1,
      duration: 6000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [rotacaoAnim, pulseAnim, progressoAnim]);

  // Ciclo de etapas
  useEffect(() => {
    let etapaAtual = 0;
    let resultadoIA: object | null = null;

    analisarImagemIA(imagemUri, tipo as TipoAnalise).then((res) => {
      resultadoIA = res;
    }).catch(() => {
      resultadoIA = analisarImagemMock(tipo as TipoAnalise);
    });

    const intervalo = setInterval(() => {
      etapaAtual += 1;
      setEtapaIndex(etapaAtual);

      Animated.sequence([
        Animated.timing(fadeEtapa, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeEtapa, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      if (etapaAtual >= ETAPAS_PROCESSO.length - 1) {
        clearInterval(intervalo);
        const navegar = () => {
          if (resultadoIA) {
            router.replace({
              pathname: '/ia/resultado',
              params: { resultado: JSON.stringify(resultadoIA), imagemUri },
            });
          } else {
            setTimeout(navegar, 300);
          }
        };
        setTimeout(navegar, 500);
      }
    }, 1200);

    return () => clearInterval(intervalo);
  }, [fadeEtapa, tipo, imagemUri]);

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
          {/* Imagem sendo analisada */}
          {imagemUri ? (
            <Animated.View style={[estilos.imagemContainer, { transform: [{ scale: pulseAnim }] }]}>
              <Image source={{ uri: imagemUri }} style={estilos.imagemMini} />
              {/* Overlay de scan */}
              <Animated.View style={[
                estilos.scanOverlay,
                { transform: [{ rotate: rotacao }] },
              ]}>
                <View style={estilos.scanLinha} />
              </Animated.View>
            </Animated.View>
          ) : (
            <View style={estilos.iconeContainer}>
              <Animated.View style={{ transform: [{ rotate: rotacao }] }}>
                <Ionicons name="scan-outline" size={64} color={Cores.acento} />
              </Animated.View>
            </View>
          )}

          {/* Texto da etapa */}
          <Animated.View style={{ opacity: fadeEtapa, marginTop: Espacamento.xl }}>
            <Text style={estilos.etapaTexto}>{ETAPAS_PROCESSO[etapaIndex]}</Text>
          </Animated.View>

          {/* Indicador de etapa */}
          <View style={estilos.etapasIndicador}>
            {ETAPAS_PROCESSO.map((_, i) => (
              <View
                key={i}
                style={[
                  estilos.etapaPonto,
                  i <= etapaIndex && estilos.etapaPontoAtivo,
                ]}
              />
            ))}
          </View>

          {/* Barra de progresso */}
          <View style={estilos.progressoContainer}>
            <Animated.View style={[estilos.progressoBarra, { width: larguraProgresso as any }]} />
          </View>

          <Text style={estilos.iaTexto}>🧠 Inteligência Artificial processando...</Text>
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
  imagemContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Cores.acento,
    position: 'relative',
  },
  imagemMini: {
    width: '100%',
    height: '100%',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLinha: {
    width: '120%',
    height: 2,
    backgroundColor: Cores.acento,
    opacity: 0.5,
  },
  iconeContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etapaTexto: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
  },
  etapasIndicador: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Espacamento.lg,
    marginBottom: Espacamento.xl,
  },
  etapaPonto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(245, 240, 232, 0.15)',
  },
  etapaPontoAtivo: {
    backgroundColor: Cores.acento,
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
  iaTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginTop: Espacamento.md,
  },
});
