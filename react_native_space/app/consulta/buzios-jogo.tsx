import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { GradientBackground } from '../../components/GradientBackground';
import { Button } from '../../components/Button';
import { BuzioIcon } from '../../components/BuzioIcon';
import { MaoLancando } from '../../components/MaoLancando';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { jogarBuzios, type ResultadoBuzios } from '../../data/buzios';
import { SomMistico } from '../../services/somMistico';

const { width: LARGURA_TELA } = Dimensions.get('window');
const AREA_JOGO = Math.min(LARGURA_TELA - 16, 450);
const TAMANHO_BUZIO = 48;

interface BuzioAnimado {
  x: Animated.Value;
  y: Animated.Value;
  rotacao: Animated.Value;
  escala: Animated.Value;
  opacidade: Animated.Value;
}

const MESA_IMG = require('../../assets/mesa-buzios.jpg');

// Gera uma posição aleatória DENTRO do círculo da mesa (distribuição uniforme).
// Como usa Math.random() a cada chamada, a disposição dos búzios muda a cada jogada.
function gerarPosicaoAleatoria(): { x: number; y: number } {
  const centro = AREA_JOGO / 2;
  const raioMax = AREA_JOGO * 0.40; // mantém os búzios sobre o tabuleiro
  const angulo = Math.random() * Math.PI * 2;
  const raio = raioMax * Math.sqrt(Math.random());
  const cx = centro + Math.cos(angulo) * raio;
  const cy = centro + Math.sin(angulo) * raio;
  return {
    x: cx - TAMANHO_BUZIO / 2,
    y: cy - TAMANHO_BUZIO / 2,
  };
}

export default function TelaBuziosJogo() {
  const [resultado, setResultado] = useState<ResultadoBuzios | null>(null);
  const [jogou, setJogou] = useState(false);
  const [animacaoConcluida, setAnimacaoConcluida] = useState(false);
  const [maoVisivel, setMaoVisivel] = useState(false);
  const [buziosCaindo, setBuziosCaindo] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const brilhoArea = useRef(new Animated.Value(0)).current;

  // 12 búzios com animações
  const buziosAnims = useRef<BuzioAnimado[]>(
    Array.from({ length: 12 }, () => ({
      x: new Animated.Value(AREA_JOGO / 2 - TAMANHO_BUZIO / 2),
      y: new Animated.Value(-50),
      rotacao: new Animated.Value(0),
      escala: new Animated.Value(0),
      opacidade: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const lancarBuzios = useCallback(() => {
    const res = jogarBuzios();
    setResultado(res);
    setBuziosCaindo(true);

    // Flash na área de jogo
    Animated.sequence([
      Animated.timing(brilhoArea, { toValue: 0.3, duration: 200, useNativeDriver: true }),
      Animated.timing(brilhoArea, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    Hapticos.impactoPesado();
    SomMistico.tocarBuzios();

    // Animar cada búzio caindo
    buziosAnims.forEach((anim, i) => {
      const destino = gerarPosicaoAleatoria();
      const atraso = i * 80;
      const rotacaoFinal = Math.random() * 360;

      setTimeout(() => {
        Hapticos.impactoLeve();

        Animated.parallel([
          Animated.spring(anim.x, {
            toValue: destino.x,
            damping: 10,
            stiffness: 80,
            useNativeDriver: true,
          }),
          Animated.spring(anim.y, {
            toValue: destino.y,
            damping: 10,
            stiffness: 80,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotacao, {
            toValue: rotacaoFinal,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(anim.escala, {
            toValue: 1,
            damping: 12,
            stiffness: 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacidade, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, atraso);
    });

    // Marcar animação como concluída
    setTimeout(() => {
      setAnimacaoConcluida(true);
    }, 12 * 80 + 800);
  }, [buziosAnims, brilhoArea]);

  const realizarJogada = useCallback(() => {
    if (jogou) return;
    Hapticos.impactoMedio();
    setJogou(true);
    setMaoVisivel(true);
  }, [jogou]);

  const verResultado = useCallback(() => {
    if (!resultado) return;
    Hapticos.impactoMedio();
    router.push({
      pathname: '/consulta/buzios-resultado',
      params: { resultado: JSON.stringify(resultado) },
    });
  }, [resultado]);

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          {/* Header */}
          <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={estilos.titulo}>Jogo de Búzios</Text>
            <Text style={estilos.subtitulo}>
              {!jogou
                ? 'Toque para invocar a mão e lançar os búzios'
                : maoVisivel
                  ? 'A mão está lançando...'
                  : animacaoConcluida
                    ? `${resultado?.buzios.filter(b => b).length ?? 0} búzios abertos • ${resultado?.odu.nome ?? ''}`
                    : 'Os búzios estão caindo...'}
            </Text>
          </Animated.View>

          {/* Área de Jogo */}
          <View style={estilos.areaJogoWrapper}>
            <View style={[estilos.areaJogo, { width: AREA_JOGO, height: AREA_JOGO }]}>
              {/* Tabuleiro real (foto da mesa de búzios) */}
              <Image
                source={MESA_IMG}
                style={estilos.mesaImagem}
                contentFit="cover"
                contentPosition="center"
                transition={300}
              />
              {/* Vinheta sutil para dar contraste aos búzios */}
              <View style={estilos.vinheta} />

              {/* Brilho flash */}
              <Animated.View style={[
                estilos.areaFlash,
                { opacity: brilhoArea, width: AREA_JOGO, height: AREA_JOGO },
              ]} />

              {/* Búzios */}
              {buziosAnims.map((anim, i) => {
                const aberto = resultado?.buzios[i] ?? false;
                const rotacaoStr = anim.rotacao.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                });

                return (
                  <Animated.View
                    key={i}
                    style={[
                      estilos.buzio,
                      {
                        transform: [
                          { translateX: anim.x },
                          { translateY: anim.y },
                          { rotate: rotacaoStr },
                          { scale: anim.escala },
                        ],
                        opacity: anim.opacidade,
                      },
                    ]}
                  >
                    <BuzioIcon aberto={aberto} tamanho={TAMANHO_BUZIO} />
                  </Animated.View>
                );
              })}

              {/* Mão lançando */}
              <MaoLancando
                visivel={maoVisivel}
                tamanho={190}
                onAnimacaoCompleta={() => {
                  setMaoVisivel(false);
                  lancarBuzios();
                }}
              />

              {/* Botão de jogar (antes de jogar) */}
              {!jogou && (
                <Pressable
                  onPress={realizarJogada}
                  style={estilos.botaoJogarOverlay}
                >
                  <LinearGradient
                    colors={Cores.gradienteAcento}
                    style={estilos.botaoJogar}
                  >
                    <MaterialCommunityIcons name="grain" size={40} color={Cores.fundoEscuro} />
                    <Text style={estilos.botaoJogarTexto}>Lançar</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </View>

          {/* Legenda */}
          {animacaoConcluida && resultado && (
            <Animated.View style={estilos.legendaContainer}>
              <View style={estilos.legendaItem}>
                <BuzioIcon aberto tamanho={28} />
                <Text style={estilos.legendaTexto}>
                  Abertos: {resultado.buzios.filter(b => b).length}
                </Text>
              </View>
              <View style={estilos.legendaItem}>
                <BuzioIcon aberto={false} tamanho={28} />
                <Text style={estilos.legendaTexto}>
                  Fechados: {resultado.buzios.filter(b => !b).length}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Footer */}
          <View style={estilos.footer}>
            {animacaoConcluida && resultado ? (
              <Button
                variante="primary"
                label="Ver Interpretação"
                icone="arrow-forward"
                posicaoIcone="right"
                larguraTotal
                onPress={verResultado}
              />
            ) : !jogou ? (
              <Text style={estilos.dicaTexto}>
                🔮 Concentre-se na sua pergunta e toque para lançar
              </Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Espacamento.lg },
  header: {
    alignItems: 'center',
    paddingTop: Espacamento.md,
    paddingBottom: Espacamento.sm,
    zIndex: 20,
    position: 'relative',
    backgroundColor: 'rgba(26,26,46,0.95)',
    paddingHorizontal: Espacamento.lg,
    marginHorizontal: -Espacamento.lg,
    paddingLeft: Espacamento.lg,
    paddingRight: Espacamento.lg,
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 28,
    fontWeight: '700',
    color: Cores.textoClaro,
  },
  subtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    marginTop: Espacamento.xs,
    textAlign: 'center',
  },
  areaJogoWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaJogo: {
    borderRadius: RaioBorda.xl,
    backgroundColor: 'rgba(20, 12, 24, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  mesaImagem: {
    ...StyleSheet.absoluteFillObject,
  },
  vinheta: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 6, 14, 0.08)',
  },
  areaFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: Cores.acento,
    borderRadius: RaioBorda.xl,
  },
  buzio: {
    position: 'absolute',
    width: TAMANHO_BUZIO,
    height: TAMANHO_BUZIO,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
      android: { elevation: 6 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
    }),
  },

  botaoJogarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoJogar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Cores.acento,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
      default: {
        shadowColor: Cores.acento,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
    }),
  },
  botaoJogarTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 12,
    color: Cores.fundoEscuro,
    marginTop: 4,
  },
  legendaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Espacamento.lg,
    paddingVertical: Espacamento.md,
    zIndex: 20,
    position: 'relative',
    backgroundColor: 'rgba(26,26,46,0.95)',
    marginHorizontal: -Espacamento.lg,
    paddingHorizontal: Espacamento.lg,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
  },

  legendaTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  footer: {
    paddingVertical: Espacamento.md,
    paddingBottom: Espacamento.lg,
    alignItems: 'center',
    zIndex: 20,
    position: 'relative',
    backgroundColor: 'rgba(26,26,46,0.95)',
    marginHorizontal: -Espacamento.lg,
    paddingHorizontal: Espacamento.lg,
  },
  dicaTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
  },
});
