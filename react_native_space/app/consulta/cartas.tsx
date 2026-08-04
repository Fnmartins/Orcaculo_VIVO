import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Polygon, Circle, Path, G, Line } from 'react-native-svg';
import { Button } from '../../components/Button';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { sortearCartas, type CartaTarot } from '../../data/tarot';

const { width: LARGURA_TELA, height: ALTURA_TELA } = Dimensions.get('window');
const LARGURA_CARTA = Math.min((LARGURA_TELA - 80) / 3, 108);
const ALTURA_CARTA = LARGURA_CARTA * 1.7;
const POSICOES = ['Passado', 'Presente', 'Futuro'];

// SVG do verso da carta — ornamentado com bordas duplas e estrela
function VersoCartaSVG({ largura, altura }: { largura: number; altura: number }) {
  const mx = largura / 2;
  const my = altura / 2;
  const margem = 6;
  const margemInterna = 11;
  const raio = 7;
  const estrelaR = Math.min(largura, altura) * 0.16;
  // Pontos de estrela de 8 pontas
  const pontosEstrela = Array.from({ length: 16 }, (_, i) => {
    const ang = (i * Math.PI) / 8 - Math.PI / 2;
    const r = i % 2 === 0 ? estrelaR : estrelaR * 0.45;
    return `${mx + r * Math.cos(ang)},${my + r * Math.sin(ang)}`;
  }).join(' ');

  return (
    <Svg width={largura} height={altura}>
      {/* Fundo */}
      <Rect x={0} y={0} width={largura} height={altura} rx={raio} ry={raio} fill="#110820" />
      {/* Borda externa dourada */}
      <Rect x={margem} y={margem} width={largura - margem * 2} height={altura - margem * 2}
        rx={raio - 1} ry={raio - 1} fill="none" stroke="#D4AF37" strokeWidth={1.2} />
      {/* Borda interna dourada */}
      <Rect x={margemInterna} y={margemInterna} width={largura - margemInterna * 2} height={altura - margemInterna * 2}
        rx={raio - 3} ry={raio - 3} fill="none" stroke="rgba(212,175,55,0.35)" strokeWidth={0.7} />
      {/* Linha horizontal central sutil */}
      <Line x1={margemInterna + 4} y1={my} x2={mx - estrelaR - 4} y2={my}
        stroke="rgba(212,175,55,0.2)" strokeWidth={0.5} />
      <Line x1={mx + estrelaR + 4} y1={my} x2={largura - margemInterna - 4} y2={my}
        stroke="rgba(212,175,55,0.2)" strokeWidth={0.5} />
      {/* Estrela de 8 pontas central */}
      <Polygon points={pontosEstrela} fill="none" stroke="#D4AF37" strokeWidth={0.9} />
      {/* Círculo no centro da estrela */}
      <Circle cx={mx} cy={my} r={estrelaR * 0.2} fill="rgba(212,175,55,0.5)" />
      {/* Ornamentos nos cantos */}
      {[[margem + 4, margem + 4], [largura - margem - 4, margem + 4],
        [margem + 4, altura - margem - 4], [largura - margem - 4, altura - margem - 4]].map(([cx, cy], i) => (
        <G key={i}>
          <Circle cx={cx} cy={cy} r={3.5} fill="none" stroke="rgba(212,175,55,0.6)" strokeWidth={0.8} />
          <Circle cx={cx} cy={cy} r={1.2} fill="rgba(212,175,55,0.7)" />
        </G>
      ))}
      {/* Número oculto topo */}
      <Polygon
        points={`${mx},${margemInterna + 6} ${mx + 5},${margemInterna + 14} ${mx - 5},${margemInterna + 14}`}
        fill="rgba(212,175,55,0.3)"
      />
    </Svg>
  );
}

// Glow animado abaixo da carta
function GlowCarta({ cor, anim }: { cor: string; anim: Animated.Value }) {
  return (
    <Animated.View style={[estilos.glowCarta, { opacity: anim }]}>
      <LinearGradient
        colors={[cor + '60', cor + '00'] as const}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={estilos.glowGradiente}
      />
    </Animated.View>
  );
}

// Partícula flutuante
function Particula({ x, delay }: { x: number; delay: number }) {
  const yAnim = useRef(new Animated.Value(0)).current;
  const opAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(yAnim, { toValue: -40, duration: 3000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
            Animated.timing(opAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(yAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute',
      left: x,
      bottom: 0,
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: Cores.acento,
      opacity: opAnim,
      transform: [{ translateY: yAnim }],
    }} />
  );
}

export default function TelaCartas() {
  const [cartasSorteadas] = useState<CartaTarot[]>(() => sortearCartas(3));
  const [cartasReveladas, setCartasReveladas] = useState<boolean[]>([false, false, false]);
  const [todasReveladas, setTodasReveladas] = useState(false);
  const flipAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const brilhoAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const glowAnims = useRef([
    new Animated.Value(0.6), new Animated.Value(0.6), new Animated.Value(0.6),
  ]).current;
  const resumoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    // Pulso do glow nas cartas não reveladas
    glowAnims.forEach((a, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(i * 400),
          Animated.timing(a, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
        ])
      );
      loop.start();
    });
  }, []);

  const revelarCarta = useCallback((index: number) => {
    if (cartasReveladas[index]) return;
    Hapticos.impactoMedio();

    Animated.spring(flipAnims[index], {
      toValue: 1,
      damping: 14,
      stiffness: 120,
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.timing(brilhoAnims[index], { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(brilhoAnims[index], { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    const novasReveladas = [...cartasReveladas];
    novasReveladas[index] = true;
    setCartasReveladas(novasReveladas);

    if (novasReveladas.every(r => r)) {
      setTimeout(() => {
        setTodasReveladas(true);
        Animated.timing(resumoAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      }, 700);
    }
  }, [cartasReveladas, flipAnims, brilhoAnims]);

  const verResultado = useCallback(() => {
    Hapticos.impactoMedio();
    router.push({
      pathname: '/consulta/resultado',
      params: { cartas: JSON.stringify(cartasSorteadas) },
    });
  }, [cartasSorteadas]);

  return (
    <LinearGradient
      colors={['#0B0915', '#110D20', '#0B0915']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={estilos.safeArea}>
        {/* Partículas de fundo */}
        <View style={estilos.particulasContainer} pointerEvents="none">
          {[30, 80, 140, 200, 260, 310].map((x, i) => (
            <Particula key={i} x={x} delay={i * 600} />
          ))}
        </View>

        {/* Header */}
        <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={estilos.headerDivisor} />
          <Text style={estilos.titulo}>Suas Cartas</Text>
          <View style={estilos.headerDivisor} />
        </Animated.View>
        <Animated.View style={[estilos.subtituloContainer, { opacity: fadeAnim }]}>
          <Text style={estilos.subtitulo}>
            {todasReveladas ? '✦ Todas reveladas ✦' : '✦ Toque para revelar ✦'}
          </Text>
        </Animated.View>

        {/* Mesa de tarot */}
        <Animated.View style={[estilos.mesaWrapper, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#1C0D35', '#130920', '#1C0D35']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={estilos.mesa}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.5)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Ornamento central da mesa */}
            <View style={estilos.mesaOrnamento} pointerEvents="none">
              <View style={estilos.mesaLinhaH} />
              <View style={estilos.mesaLinhaV} />
            </View>

            {/* Cartas */}
            <View style={estilos.cartasContainer}>
              {cartasSorteadas.map((carta, index) => {
                const revelada = cartasReveladas[index];
                const flipInterpolado = flipAnims[index].interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: ['0deg', '90deg', '0deg'],
                });
                const escalaFlip = flipAnims[index].interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0.88, 1],
                });

                return (
                  <View key={carta.id} style={estilos.cartaWrapper}>
                    {/* Label posição */}
                    <View style={estilos.posicaoBadge}>
                      <Text style={estilos.posicaoTexto}>{POSICOES[index]}</Text>
                    </View>

                    {/* Glow abaixo da carta */}
                    {!revelada && (
                      <GlowCarta cor={Cores.acento} anim={glowAnims[index]} />
                    )}
                    {revelada && (
                      <GlowCarta cor={carta.cor} anim={new Animated.Value(0.5)} />
                    )}

                    {/* Área da carta na mesa */}
                    <View style={[
                      estilos.posicaoMarca,
                      revelada && { borderColor: carta.cor + '50' },
                    ]} />

                    <Pressable
                      onPress={() => revelarCarta(index)}
                      disabled={revelada}
                      style={({ pressed }) => ({
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                      })}
                    >
                      <Animated.View style={[
                        estilos.carta,
                        revelada && {
                          ...Platform.select({
                            ios: { shadowColor: carta.cor, shadowOpacity: 0.6 },
                            android: { elevation: 12 },
                            default: { shadowColor: carta.cor, shadowOpacity: 0.6 },
                          }),
                        },
                        {
                          transform: [
                            { rotateY: flipInterpolado },
                            { scale: escalaFlip },
                          ],
                        },
                      ]}>
                        {/* Flash de revelação */}
                        <Animated.View style={[
                          StyleSheet.absoluteFillObject,
                          {
                            backgroundColor: 'rgba(212,175,55,0.9)',
                            borderRadius: RaioBorda.md,
                            opacity: brilhoAnims[index],
                            zIndex: 20,
                          },
                        ]} />

                        {revelada ? (
                          // Carta revelada — frente
                          <LinearGradient
                            colors={[carta.cor + '40', '#110D20', carta.cor + '15'] as const}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                            style={estilos.cartaFrente}
                          >
                            {/* Número romano no topo */}
                            <Text style={[estilos.cartaNumeroRomano, { color: carta.cor + 'BB' }]}>
                              {carta.nomeCompleto.split(' - ')[0]}
                            </Text>
                            {/* Borda ornamentada */}
                            <View style={[estilos.cartaBordaOrnam, { borderColor: carta.cor + '50' }]} />
                            {/* Ícone */}
                            <View style={[estilos.cartaIconeCirculo, { backgroundColor: carta.cor + '20' }]}>
                              <Ionicons name={carta.icone as any} size={28} color={carta.cor} />
                            </View>
                            {/* Nome */}
                            <Text style={[estilos.cartaNome, { color: carta.cor }]} numberOfLines={2}>
                              {carta.nome}
                            </Text>
                            {/* Divisor */}
                            <View style={[estilos.cartaDivisor, { backgroundColor: carta.cor + '40' }]} />
                            {/* Palavra-chave */}
                            <Text style={estilos.cartaEssencia} numberOfLines={2}>
                              {carta.conselho.split('.')[0]}
                            </Text>
                          </LinearGradient>
                        ) : (
                          // Carta virada — verso ornamentado
                          <VersoCartaSVG largura={LARGURA_CARTA} altura={ALTURA_CARTA} />
                        )}
                      </Animated.View>
                    </Pressable>

                    {/* Indicador de toque */}
                    {!revelada && (
                      <Animated.View style={[estilos.toqueIndicador, { opacity: glowAnims[index] }]}>
                        <Ionicons name="hand-right-outline" size={12} color={Cores.acento} />
                      </Animated.View>
                    )}
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Resumo */}
        {todasReveladas && (
          <Animated.View style={[estilos.resumoContainer, { opacity: resumoAnim }]}>
            <View style={estilos.resumoInner}>
              {cartasSorteadas.map((carta, i) => (
                <View key={carta.id} style={estilos.resumoLinha}>
                  <View style={[estilos.resumoPonto, { backgroundColor: carta.cor }]} />
                  <Text style={estilos.resumoPosicao}>{POSICOES[i]}</Text>
                  <Text style={[estilos.resumoNome, { color: carta.cor }]}>{carta.nome}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Footer */}
        <Animated.View style={[estilos.footer, { opacity: fadeAnim }]}>
          {todasReveladas ? (
            <Button
              variante="primary"
              label="Ver Leitura Completa"
              icone="arrow-forward"
              posicaoIcone="right"
              larguraTotal
              onPress={verResultado}
            />
          ) : (
            <View style={estilos.dicaContainer}>
              <View style={estilos.dicaDivisor} />
              <Text style={estilos.dicaTexto}>Toque em cada carta para revelar</Text>
              <View style={estilos.dicaDivisor} />
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },

  particulasContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    height: 100,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Espacamento.md,
    paddingHorizontal: Espacamento.lg,
    gap: Espacamento.md,
  },
  headerDivisor: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.25)',
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 26,
    fontWeight: '700',
    color: Cores.textoClaro,
    letterSpacing: 2,
  },

  subtituloContainer: {
    alignItems: 'center',
    paddingBottom: Espacamento.sm,
  },
  subtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.acento,
    letterSpacing: 1.5,
    opacity: 0.8,
  },

  mesaWrapper: {
    flex: 1,
    marginHorizontal: Espacamento.md,
    marginBottom: Espacamento.sm,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
    ...Platform.select({
      ios: { shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 10 },
      default: { shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 20 },
    }),
  },
  mesa: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mesaOrnamento: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mesaLinhaH: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.06)',
  },
  mesaLinhaV: {
    position: 'absolute',
    top: 24,
    bottom: 24,
    width: 1,
    backgroundColor: 'rgba(212,175,55,0.06)',
  },

  cartasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: Espacamento.md,
    paddingBottom: Espacamento.lg,
  },

  cartaWrapper: {
    alignItems: 'center',
    position: 'relative',
  },

  posicaoBadge: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    borderRadius: RaioBorda.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: Espacamento.sm,
  },
  posicaoTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 10,
    color: Cores.acento,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  glowCarta: {
    position: 'absolute',
    bottom: -8,
    left: -10,
    right: -10,
    height: 40,
    zIndex: 0,
  },
  glowGradiente: {
    flex: 1,
    borderRadius: 20,
  },

  posicaoMarca: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    right: -4,
    height: ALTURA_CARTA + 8,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
    borderRadius: RaioBorda.md + 2,
    zIndex: 0,
  },

  carta: {
    width: LARGURA_CARTA,
    height: ALTURA_CARTA,
    borderRadius: RaioBorda.md,
    overflow: 'hidden',
    zIndex: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 12 },
      android: { elevation: 10 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 12 },
    }),
  },

  cartaFrente: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Espacamento.xs,
    gap: 4,
  },
  cartaBordaOrnam: {
    position: 'absolute',
    top: 4, left: 4, right: 4, bottom: 4,
    borderWidth: 1,
    borderRadius: RaioBorda.sm,
  },
  cartaNumeroRomano: {
    fontFamily: Fontes.titulo,
    fontSize: 11,
    letterSpacing: 1,
  },
  cartaIconeCirculo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartaNome: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  cartaDivisor: {
    width: 24,
    height: 1,
  },
  cartaEssencia: {
    fontFamily: Fontes.corpo,
    fontSize: 9,
    color: Cores.textoSecundario,
    textAlign: 'center',
    lineHeight: 12,
    paddingHorizontal: 4,
  },

  toqueIndicador: {
    marginTop: Espacamento.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  resumoContainer: {
    marginHorizontal: Espacamento.lg,
    marginBottom: Espacamento.sm,
  },
  resumoInner: {
    backgroundColor: 'rgba(28,13,53,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    borderRadius: RaioBorda.lg,
    paddingHorizontal: Espacamento.md,
    paddingVertical: Espacamento.sm,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resumoLinha: {
    alignItems: 'center',
    gap: 4,
  },
  resumoPonto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resumoPosicao: {
    fontFamily: Fontes.corpo,
    fontSize: 9,
    color: Cores.textoSecundario,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  resumoNome: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 11,
    textAlign: 'center',
  },

  footer: {
    paddingHorizontal: Espacamento.lg,
    paddingVertical: Espacamento.md,
    paddingBottom: Espacamento.lg,
  },
  dicaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
  },
  dicaDivisor: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.2)',
  },
  dicaTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
