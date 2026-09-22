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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { MesaBuzios } from '../../components/MesaBuzios';
import { Button } from '../../components/Button';
import { BuzioIcon } from '../../components/BuzioIcon';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { jogarBuzios, QUANTIDADE_BUZIOS, type ResultadoBuzios } from '../../data/buzios';
import { SomMistico } from '../../services/somMistico';

const { width: LARGURA_TELA } = Dimensions.get('window');
// A peneira ocupa quase toda a largura no celular e cresce até 560 px na web.
// Antes parava em 450 px, o que deixava a mesa pequena numa tela grande.
const AREA_JOGO = Math.min(LARGURA_TELA * 0.92, 560);
const TAMANHO_BUZIO = Math.round(AREA_JOGO * 0.105);

interface BuzioAnimado {
  x: Animated.Value;
  y: Animated.Value;
  rotacao: Animated.Value;
  escala: Animated.Value;
  opacidade: Animated.Value;
}

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
  const [chacoalhando, setChacoalhando] = useState(false);
  const [buziosCaindo, setBuziosCaindo] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const brilhoArea = useRef(new Animated.Value(0)).current;
  // Tremor do botão enquanto a pessoa segura para chacoalhar os búzios.
  const tremor = useRef(new Animated.Value(0)).current;

  // Os 16 búzios do merindilogun, cada um com a sua animação
  const buziosAnims = useRef<BuzioAnimado[]>(
    Array.from({ length: QUANTIDADE_BUZIOS }, () => ({
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
    }, QUANTIDADE_BUZIOS * 80 + 800);
  }, [buziosAnims, brilhoArea]);

  // Segurar para chacoalhar, soltar para lançar: no lugar do vídeo que repetia
  // o da preparação (conselho de 21/09, item B4).
  const iniciarChacoalho = useCallback(() => {
    if (jogou) return;
    setChacoalhando(true);
    Hapticos.impactoLeve();
    Animated.loop(
      Animated.sequence([
        Animated.timing(tremor, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(tremor, { toValue: -1, duration: 90, useNativeDriver: true }),
      ]),
    ).start();
  }, [jogou, tremor]);

  const soltarELancar = useCallback(() => {
    if (jogou) return;
    tremor.stopAnimation(() => tremor.setValue(0));
    setChacoalhando(false);
    Hapticos.impactoMedio();
    setJogou(true);
    lancarBuzios();
  }, [jogou, tremor, lancarBuzios]);

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
                ? (chacoalhando ? 'Solte para lançar...' : 'Segure para chacoalhar os búzios')
                : animacaoConcluida
                  ? `${resultado?.buzios.filter(b => b).length ?? 0} búzios abertos • ${resultado?.odu.nome ?? ''}`
                  : 'Os búzios estão caindo...'}
            </Text>
          </Animated.View>

          {/* Área de Jogo */}
          <View style={estilos.areaJogoWrapper}>
            <View style={[estilos.areaJogo, { width: AREA_JOGO, height: AREA_JOGO }]}>
              {/* Peneira desenhada, no mesmo traço das conchas */}
              <MesaBuzios tamanho={AREA_JOGO} />

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

              {/* Segurar para chacoalhar, soltar para lançar */}
              {!jogou && (
                <Pressable
                  onPressIn={iniciarChacoalho}
                  onPressOut={soltarELancar}
                  style={estilos.botaoJogarOverlay}
                  accessibilityRole="button"
                  accessibilityLabel="Segure para chacoalhar e solte para lançar os búzios"
                >
                  <Animated.View
                    style={{
                      transform: [
                        {
                          translateX: tremor.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-6, 6],
                          }),
                        },
                        {
                          rotate: tremor.interpolate({
                            inputRange: [-1, 1],
                            outputRange: ['-4deg', '4deg'],
                          }),
                        },
                      ],
                    }}
                  >
                    <LinearGradient
                      colors={Cores.gradienteAcento}
                      style={estilos.botaoJogar}
                    >
                      <MaterialCommunityIcons name="grain" size={40} color={Cores.fundoEscuro} />
                      <Text style={estilos.botaoJogarTexto}>
                        {chacoalhando ? 'Solte' : 'Segure'}
                      </Text>
                    </LinearGradient>
                  </Animated.View>
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
                🔮 Concentre-se na sua pergunta, segure para chacoalhar e solte
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
    backgroundColor: 'rgba(255,252,246,0.96)',
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
    // A peneira é redonda e desenhada: o contêiner fica transparente e redondo,
    // senão sobra um retângulo escuro em volta dela.
    borderRadius: AREA_JOGO / 2,
    backgroundColor: 'transparent',
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
  areaFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: Cores.acento,
    borderRadius: AREA_JOGO / 2,
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
      // No navegador, box-shadow acompanha a caixa retangular do SVG.
      default: {},
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
    backgroundColor: 'rgba(255,252,246,0.96)',
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
    backgroundColor: 'rgba(255,252,246,0.96)',
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
