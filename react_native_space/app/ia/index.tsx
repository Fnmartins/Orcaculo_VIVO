import React, { useRef, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient as SvgRadial, Stop, Path, G, Line } from 'react-native-svg';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';

const { width: W } = Dimensions.get('window');

const TIPOS = [
  {
    id: 'cafe' as const,
    titulo: 'Borra de Café',
    subtitulo: 'Tasseografia Digital',
    descricao: 'A sabedoria milenar da tasseografia encontra a inteligência artificial. Tire uma foto da borra no fundo da xícara.',
    icone: 'cafe-outline' as const,
    corPrimaria: '#8B4513',
    corSecundaria: '#D2691E',
    gradiente: ['#3D1A08', '#1A0A04'] as const,
    instrucao: 'Prepare um café turco, beba devagar e vire a xícara por 1 minuto.',
    simbolo: '☕',
  },
  {
    id: 'quiromancia' as const,
    titulo: 'Leitura de Mão',
    subtitulo: 'Quiromancia por IA',
    descricao: 'As linhas da sua palma guardam segredos únicos. A IA analisa linha da vida, do coração e do destino.',
    icone: 'hand-left-outline' as const,
    corPrimaria: '#C0392B',
    corSecundaria: '#E74C3C',
    gradiente: ['#3D0C08', '#1A0604'] as const,
    instrucao: 'Abra bem a mão dominante sob boa iluminação natural.',
    simbolo: '✋',
  },
];

// Olho místico SVG animado
function OlhoMistico({ pulseAnim, rotAnim }: { pulseAnim: Animated.Value; rotAnim: Animated.Value }) {
  const SIZE = 88;
  const cx = SIZE / 2, cy = SIZE / 2;
  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <SvgRadial id="olhoGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
            <Stop offset="60%" stopColor="#4B0082" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#4B0082" stopOpacity="0" />
          </SvgRadial>
        </Defs>
        {/* Glow */}
        <Circle cx={cx} cy={cy} r={cx} fill="url(#olhoGrad)" />
        {/* Anel externo */}
        <Circle cx={cx} cy={cy} r={cx - 3} fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth={1} />
        {/* Anel interno */}
        <Circle cx={cx} cy={cy} r={cx - 10} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth={0.7} />
        {/* Olho — formato amêndoa */}
        <Path
          d={`M ${cx - 24},${cy} Q ${cx},${cy - 14} ${cx + 24},${cy} Q ${cx},${cy + 14} ${cx - 24},${cy} Z`}
          fill="none" stroke="#D4AF37" strokeWidth={1.5}
        />
        {/* Íris */}
        <Circle cx={cx} cy={cy} r={9} fill="rgba(212,175,55,0.15)" stroke="#D4AF37" strokeWidth={1} />
        {/* Pupila */}
        <Circle cx={cx} cy={cy} r={4} fill="#D4AF37" opacity={0.8} />
        {/* Pestanas superiores */}
        {[-14, -7, 0, 7, 14].map((dx, i) => (
          <Line key={i} x1={cx + dx} y1={cy - 14} x2={cx + dx * 0.7} y2={cy - 19}
            stroke="rgba(212,175,55,0.4)" strokeWidth={0.8} />
        ))}
      </Svg>
    </Animated.View>
  );
}

// Varredura de scan animada
function ScanLine({ cor }: { cor: string }) {
  const yAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(yAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.delay(400),
        Animated.timing(yAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(600),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateY = yAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 120] });
  return (
    <Animated.View style={[estilos.scanLine, { backgroundColor: cor, transform: [{ translateY }] }]} />
  );
}

// Card do tipo de análise
function CardTipo({ tipo, index, fadeAnim, slideAnim }: {
  tipo: typeof TIPOS[0]; index: number;
  fadeAnim: Animated.Value; slideAnim: Animated.Value;
}) {
  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + index * 0.4)) }],
    }}>
      <Pressable
        onPress={() => {
          Hapticos.impactoMedio();
          router.push({ pathname: '/ia/captura', params: { tipo: tipo.id } });
        }}
        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      >
        <LinearGradient
          colors={[tipo.corPrimaria + '22', 'rgba(15,10,28,0.7)'] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={estilos.tipoCard}
        >
          {/* Borda superior colorida */}
          <View style={[estilos.tipoCardBordaTopo, { backgroundColor: tipo.corPrimaria }]} />

          <View style={estilos.tipoCardConteudo}>
            {/* Coluna esquerda — ícone + scan */}
            <View style={[estilos.tipoIconeArea, { backgroundColor: tipo.corPrimaria + '18' }]}>
              <Ionicons name={tipo.icone} size={34} color={tipo.corPrimaria} />
              <ScanLine cor={tipo.corSecundaria + '60'} />
              {/* Cantos do scanner */}
              {[{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }].map((pos, i) => (
                <View key={i} style={[estilos.scanCanto, pos, {
                  borderTopWidth: i < 2 ? 1.5 : 0,
                  borderBottomWidth: i >= 2 ? 1.5 : 0,
                  borderLeftWidth: i % 2 === 0 ? 1.5 : 0,
                  borderRightWidth: i % 2 === 1 ? 1.5 : 0,
                  borderColor: tipo.corPrimaria,
                }]} />
              ))}
            </View>

            {/* Textos */}
            <View style={estilos.tipoTextos}>
              <View style={estilos.tipoTags}>
                <View style={[estilos.tipoTag, { backgroundColor: tipo.corPrimaria + '25' }]}>
                  <Text style={[estilos.tipoTagTexto, { color: tipo.corPrimaria }]}>{tipo.subtitulo}</Text>
                </View>
              </View>
              <Text style={estilos.tipoTitulo}>{tipo.titulo}</Text>
              <Text style={estilos.tipoDescricao}>{tipo.descricao}</Text>

              <View style={estilos.instrucaoBox}>
                <Ionicons name="information-circle-outline" size={13} color={tipo.corPrimaria} />
                <Text style={[estilos.instrucaoTexto, { color: tipo.corPrimaria + 'CC' }]}>
                  {tipo.instrucao}
                </Text>
              </View>
            </View>
          </View>

          {/* Rodapé */}
          <View style={estilos.tipoRodape}>
            <Text style={[estilos.tipoRodapeTexto, { color: tipo.corPrimaria }]}>
              Iniciar análise
            </Text>
            <Ionicons name="scan-outline" size={16} color={tipo.corPrimaria} />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function TelaIASelecao() {
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotAnim = useRef(new Animated.Value(0)).current;
  const redirecionou = useRef(false);

  useEffect(() => {
    if (tipo && (tipo === 'cafe' || tipo === 'quiromancia') && !redirecionou.current) {
      redirecionou.current = true;
      router.replace({ pathname: '/ia/captura', params: { tipo } });
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [tipo]);

  return (
    <LinearGradient colors={['#0A0716', '#0F0A1E', '#0A0716']} style={{ flex: 1 }}>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          {/* Header */}
          <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Pressable onPress={() => router.back()} style={estilos.voltarBotao}>
              <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
            </Pressable>
            <View style={estilos.headerCenter}>
              <Text style={estilos.headerTitulo}>Análise Visual</Text>
            </View>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Olho místico + descrição */}
          <Animated.View style={[estilos.heroContainer, { opacity: fadeAnim }]}>
            <OlhoMistico pulseAnim={pulseAnim} rotAnim={rotAnim} />
            <View style={estilos.heroTextos}>
              <Text style={estilos.heroTitulo}>Visão além do visível</Text>
              <Text style={estilos.heroSubtitulo}>
                IA generativa analisa padrões e revela mensagens ocultas
              </Text>
            </View>
          </Animated.View>

          {/* Divisor */}
          <Animated.View style={[estilos.divisorContainer, { opacity: fadeAnim }]}>
            <View style={estilos.divisorLinha} />
            <Text style={estilos.divisorTexto}>Escolha o método</Text>
            <View style={estilos.divisorLinha} />
          </Animated.View>

          {/* Cards */}
          <View style={estilos.cardsContainer}>
            {TIPOS.map((t, i) => (
              <CardTipo key={t.id} tipo={t} index={i} fadeAnim={fadeAnim} slideAnim={slideAnim} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Espacamento.lg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Espacamento.sm, paddingBottom: Espacamento.sm,
  },
  voltarBotao: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(88,117,101,0.08)',
    borderWidth: 1, borderColor: 'rgba(88,117,101,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitulo: {
    fontFamily: Fontes.titulo, fontSize: 20, fontWeight: '700',
    color: Cores.textoClaro, letterSpacing: 1,
  },

  heroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.lg,
    paddingVertical: Espacamento.md,
    backgroundColor: 'rgba(212,175,55,0.04)',
    borderRadius: RaioBorda.xl,
    paddingHorizontal: Espacamento.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.1)',
    marginBottom: Espacamento.md,
  },
  heroTextos: { flex: 1 },
  heroTitulo: {
    fontFamily: Fontes.titulo, fontSize: 17, fontWeight: '700',
    color: Cores.textoClaro, marginBottom: 4,
  },
  heroSubtitulo: {
    fontFamily: Fontes.corpo, fontSize: 12,
    color: Cores.textoSecundario, lineHeight: 17,
  },

  divisorContainer: {
    flexDirection: 'row', alignItems: 'center',
    gap: Espacamento.sm, marginBottom: Espacamento.md,
  },
  divisorLinha: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.15)' },
  divisorTexto: {
    fontFamily: Fontes.corpoSemibold, fontSize: 11,
    color: Cores.acento, letterSpacing: 1.5, textTransform: 'uppercase',
  },

  cardsContainer: { flex: 1, gap: Espacamento.md },

  tipoCard: {
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: 'rgba(88,117,101,0.12)',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    }),
  },
  tipoCardBordaTopo: { height: 2, opacity: 0.7 },
  tipoCardConteudo: {
    flexDirection: 'row',
    gap: Espacamento.md,
    padding: Espacamento.md,
    paddingBottom: Espacamento.sm,
  },

  tipoIconeArea: {
    width: 80,
    height: 120,
    borderRadius: RaioBorda.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
  },
  scanLine: {
    position: 'absolute',
    left: 0, right: 0,
    height: 1,
    opacity: 0.8,
  },
  scanCanto: {
    position: 'absolute',
    width: 10, height: 10,
  },

  tipoTextos: { flex: 1 },
  tipoTags: { flexDirection: 'row', marginBottom: 6 },
  tipoTag: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RaioBorda.full,
  },
  tipoTagTexto: {
    fontFamily: Fontes.corpoSemibold, fontSize: 9,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  tipoTitulo: {
    fontFamily: Fontes.titulo, fontSize: 19, fontWeight: '700',
    color: Cores.textoClaro, marginBottom: 4,
  },
  tipoDescricao: {
    fontFamily: Fontes.corpo, fontSize: 12,
    color: Cores.textoSecundario, lineHeight: 17,
  },
  instrucaoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 5,
    marginTop: Espacamento.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 6, borderRadius: RaioBorda.sm,
  },
  instrucaoTexto: {
    fontFamily: Fontes.corpo, fontSize: 11, flex: 1, lineHeight: 15,
  },

  tipoRodape: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 6, paddingHorizontal: Espacamento.md, paddingBottom: Espacamento.sm,
  },
  tipoRodapeTexto: {
    fontFamily: Fontes.corpoSemibold, fontSize: 13,
  },
});
