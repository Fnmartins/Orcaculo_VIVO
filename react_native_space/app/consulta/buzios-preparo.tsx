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
import { GradientBackground } from '../../components/GradientBackground';
import { BuzioIcon } from '../../components/BuzioIcon';
import { ResizeMode, Video } from 'expo-av';
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

const VIDEO_PREPARACAO = require('../../assets/buzios-preparacao.mp4');

export default function TelaBuziosPreparo() {
  const [fraseIndex, setFraseIndex] = useState(0);
  const fadeTexto = useRef(new Animated.Value(0)).current;
  const progressoAnim = useRef(new Animated.Value(0)).current;
  const videoOpacidade = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    // Progresso
    Animated.timing(progressoAnim, {
      toValue: 1,
      duration: 10000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [progressoAnim]);

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

  const larguraProgresso = progressoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          {/* Abertura ritual em vídeo amplo; o búzio funciona como fallback */}
          <View style={estilos.videoCentral}>
            <View style={estilos.videoFallback}>
              <BuzioIcon aberto tamanho={76} />
            </View>
            <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: videoOpacidade }]}>
              <Video
                ref={videoRef}
                source={VIDEO_PREPARACAO}
                style={StyleSheet.absoluteFillObject}
                resizeMode={ResizeMode.CONTAIN}
                isMuted
                useNativeControls={false}
                progressUpdateIntervalMillis={250}
                onLoad={async () => {
                  try {
                    await videoRef.current?.setPositionAsync(1800);
                    Animated.timing(videoOpacidade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
                    await videoRef.current?.playAsync();
                  } catch {
                    videoOpacidade.setValue(0);
                  }
                }}
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded && status.didJustFinish) {
                    videoRef.current?.setPositionAsync(1800)
                      .then(() => videoRef.current?.playAsync())
                      .catch(() => videoOpacidade.setValue(0));
                  }
                }}
                onError={() => videoOpacidade.setValue(0)}
              />
              <View style={estilos.videoVinheta} />
            </Animated.View>
            <View style={estilos.videoLegenda}>
              <Text style={estilos.videoLegendaTexto}>RITUAL DE PREPARAÇÃO</Text>
            </View>
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
  videoCentral: {
    width: '100%',
    maxWidth: 520,
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.xl,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.32)',
    backgroundColor: 'rgba(12,7,18,0.92)',
    overflow: 'hidden',
  },
  videoFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoVinheta: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9,6,12,0.04)',
  },
  videoLegenda: {
    position: 'absolute',
    left: 12,
    bottom: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(9,6,12,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.26)',
  },
  videoLegendaTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 9,
    letterSpacing: 1.1,
    color: Cores.acento,
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
    backgroundColor: 'rgba(88, 117, 101, 0.10)',
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
