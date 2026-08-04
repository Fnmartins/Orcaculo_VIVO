import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Text as SvgText, Defs, RadialGradient as SvgRadial, Stop, Path } from 'react-native-svg';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { gerarNumerologiaCompleta, type ResultadoNumerologia } from '../../data/numerologia';

const { width: W } = Dimensions.get('window');

// Roda dos 5 números — exibição visual pitagórica
function RodaNumerologica({ secoes }: { secoes: Array<{ numero: number; cor: string; label: string }> }) {
  const SIZE = Math.min(W - 64, 280);
  const cx = SIZE / 2, cy = SIZE / 2;
  const rExt = SIZE * 0.44;
  const rMed = SIZE * 0.3;
  const rInt = SIZE * 0.14;
  // Posições dos 5 números em pentágono
  const angulos = secoes.map((_, i) => (i * 72 - 90) * (Math.PI / 180));

  return (
    <Svg width={SIZE} height={SIZE}>
      <Defs>
        <SvgRadial id="numGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(212,175,55,0.15)" />
          <Stop offset="100%" stopColor="rgba(212,175,55,0)" />
        </SvgRadial>
      </Defs>
      {/* Glow central */}
      <Circle cx={cx} cy={cy} r={rExt * 0.6} fill="url(#numGlow)" />
      {/* Círculos concêntricos guia */}
      <Circle cx={cx} cy={cy} r={rExt} fill="none" stroke="rgba(212,175,55,0.08)" strokeWidth={1} />
      <Circle cx={cx} cy={cy} r={rMed} fill="none" stroke="rgba(212,175,55,0.1)" strokeWidth={1} />
      {/* Linhas do pentágono */}
      {angulos.map((ang, i) => {
        const x1 = cx + rMed * Math.cos(ang);
        const y1 = cy + rMed * Math.sin(ang);
        const angNext = angulos[(i + 1) % 5];
        const x2 = cx + rMed * Math.cos(angNext);
        const y2 = cy + rMed * Math.sin(angNext);
        return (
          <Path key={i} d={`M ${x1} ${y1} L ${x2} ${y2}`}
            stroke="rgba(212,175,55,0.18)" strokeWidth={0.8} />
        );
      })}
      {/* Linhas do centro para cada nó */}
      {angulos.map((ang, i) => {
        const x = cx + rMed * Math.cos(ang);
        const y = cy + rMed * Math.sin(ang);
        return (
          <Path key={`l${i}`} d={`M ${cx} ${cy} L ${x} ${y}`}
            stroke="rgba(212,175,55,0.1)" strokeWidth={0.6} />
        );
      })}
      {/* Número central — Caminho de Vida */}
      <Circle cx={cx} cy={cy} r={rInt + 4} fill={secoes[0].cor + '20'} />
      <Circle cx={cx} cy={cy} r={rInt} fill={secoes[0].cor + '30'} stroke={secoes[0].cor} strokeWidth={1.5} />
      <SvgText x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={rInt * 0.9} fill={secoes[0].cor} fontWeight="700">{secoes[0].numero}</SvgText>
      {/* 5 nós do pentágono */}
      {secoes.map(({ numero, cor, label }, i) => {
        const ang = angulos[i];
        const nx = cx + rMed * Math.cos(ang);
        const ny = cy + rMed * Math.sin(ang);
        const lx = cx + rExt * 0.88 * Math.cos(ang);
        const ly = cy + rExt * 0.88 * Math.sin(ang);
        const r = SIZE * 0.075;
        return (
          <React.Fragment key={i}>
            <Circle cx={nx} cy={ny} r={r + 3} fill={cor + '15'} />
            <Circle cx={nx} cy={ny} r={r} fill={cor + '25'} stroke={cor} strokeWidth={1.5} />
            <SvgText x={nx} y={ny + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize={r * 1.1} fill={cor} fontWeight="700">{numero}</SvgText>
            {/* Label externo */}
            <SvgText x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fontSize={7.5} fill="rgba(245,240,232,0.5)">{label.split(' ')[0]}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export default function TelaNumerologiaResultado() {
  const params = useLocalSearchParams<{
    nome: string; dia: string; mes: string; ano: string;
  }>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const resultado: ResultadoNumerologia = useMemo(() => {
    return gerarNumerologiaCompleta(
      params.nome ?? '',
      parseInt(params.dia ?? '1', 10),
      parseInt(params.mes ?? '1', 10),
      parseInt(params.ano ?? '2000', 10),
    );
  }, [params.nome, params.dia, params.mes, params.ano]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const secoes = [
    { label: 'Caminho de Vida', icone: 'compass-outline', desc: 'Sua missão principal', dado: resultado.caminhoVida },
    { label: 'Expressão', icone: 'megaphone-outline', desc: 'Seus talentos naturais', dado: resultado.expressao },
    { label: 'Número da Alma', icone: 'heart-outline', desc: 'Seus desejos internos', dado: resultado.almico },
    { label: 'Personalidade', icone: 'person-outline', desc: 'Como os outros te veem', dado: resultado.personalidade },
    { label: 'Ano Pessoal ' + new Date().getFullYear(), icone: 'calendar-outline', desc: 'Energia do momento', dado: resultado.anosPessoais },
  ];

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <ScrollView
          contentContainerStyle={estilos.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Pressable onPress={() => router.back()} style={estilos.voltarBotao}>
              <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
            </Pressable>
            <View style={estilos.headerCenter}>
              <Text style={estilos.headerTitulo}>Sua Numerologia</Text>
              <Text style={estilos.headerSubtitulo}>{params.nome}</Text>
            </View>
            <Pressable onPress={() => Hapticos.impactoLeve()} style={estilos.voltarBotao}>
              <Ionicons name="share-outline" size={20} color={Cores.textoClaro} />
            </Pressable>
          </Animated.View>

          {/* Hero pitagórico */}
          <Animated.View style={[estilos.heroContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient
              colors={['rgba(212,175,55,0.08)', 'rgba(75,0,130,0.06)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={estilos.heroGradiente}
            >
              <Text style={estilos.heroLabel}>✦ Mapa Pitagórico ✦</Text>
              <RodaNumerologica secoes={secoes.map(s => ({ numero: s.dado.numero, cor: s.dado.cor, label: s.label }))} />
              <Text style={estilos.heroDescricao}>
                Caminho de Vida {resultado.caminhoVida.numero} · {resultado.caminhoVida.titulo}
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Cards de Números */}
          {secoes.map((secao, index) => (
            <Animated.View
              key={secao.label}
              style={[estilos.secao, {
                opacity: fadeAnim,
                transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + index * 0.15)) }],
              }]}
            >
              <CardNumero
                label={secao.label}
                icone={secao.icone}
                descricaoLabel={secao.desc}
                numero={secao.dado.numero}
                titulo={secao.dado.titulo}
                essencia={secao.dado.essencia}
                descricao={secao.dado.descricao}
                qualidades={secao.dado.qualidades}
                desafios={secao.dado.desafios}
                cor={secao.dado.cor}
                planeta={secao.dado.planeta}
                elemento={secao.dado.elemento}
              />
            </Animated.View>
          ))}

          {/* Resumo */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.12)', 'rgba(75, 0, 130, 0.12)'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={estilos.resumoCard}
            >
              <MaterialCommunityIcons name="auto-fix" size={24} color={Cores.acento} />
              <Text style={estilos.resumoTitulo}>Síntese Numerológica</Text>
              <Text style={estilos.resumoTexto}>{resultado.resumo}</Text>
            </LinearGradient>
          </Animated.View>

          {/* Formato */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <View style={estilos.formatosBarra}>
              <View style={[estilos.formatoItem, estilos.formatoAtivo]}>
                <Ionicons name="document-text" size={18} color={Cores.acento} />
                <Text style={[estilos.formatoTexto, estilos.formatoTextoAtivo]}>Texto</Text>
              </View>
              {['headset', 'videocam', 'download'].map((icon, i) => (
                <View key={icon} style={estilos.formatoItem}>
                  <Ionicons name={icon as any} size={18} color={Cores.textoSecundario} />
                  <Text style={estilos.formatoTexto}>
                    {i === 0 ? 'Áudio' : i === 1 ? 'Vídeo' : 'PDF'}
                  </Text>
                  <View style={estilos.breveBadge}>
                    <Text style={estilos.breveTexto}>Em breve</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Botões */}
          <Animated.View style={[estilos.botoesFinais, { opacity: fadeAnim }]}>
            <Pressable
              onPress={() => { Hapticos.impactoLeve(); router.replace('/(tabs)'); }}
              style={({ pressed }) => [estilos.botaoVoltar, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <Ionicons name="home-outline" size={18} color={Cores.textoClaro} />
              <Text style={estilos.botaoVoltarTexto}>Início</Text>
            </Pressable>
            <Pressable
              onPress={() => { Hapticos.impactoLeve(); router.replace('/numerologia'); }}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], flex: 1 }]}
            >
              <LinearGradient
                colors={Cores.gradienteAcento}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={estilos.botaoNovo}
              >
                <MaterialCommunityIcons name="calculator-variant" size={18} color="#fff" />
                <Text style={estilos.botaoNovoTexto}>Nova Consulta</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

/* ---- Card Número ---- */
interface CardNumeroProps {
  label: string;
  icone: string;
  descricaoLabel: string;
  numero: number;
  titulo: string;
  essencia: string;
  descricao: string;
  qualidades: string[];
  desafios: string[];
  cor: string;
  planeta: string;
  elemento: string;
}

function CardNumero(props: CardNumeroProps) {
  return (
    <View style={estilos.cardNumero}>
      <LinearGradient
        colors={[props.cor + '15', 'rgba(26,26,46,0.3)'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={estilos.cardNumeroGradiente}
      >
        {/* Header do card */}
        <View style={estilos.cardHeader}>
          <View style={estilos.cardHeaderLeft}>
            <View style={[estilos.cardIconeCirculo, { backgroundColor: props.cor + '18' }]}>
              <Ionicons name={props.icone as any} size={16} color={props.cor} />
            </View>
            <View>
              <Text style={estilos.cardLabel}>{props.label}</Text>
              <Text style={estilos.cardDescLabel}>{props.descricaoLabel}</Text>
            </View>
          </View>
          {/* Número grande com anel */}
          <View style={estilos.numeroBadgeWrap}>
            <View style={[estilos.numeroBadgeAnel, { borderColor: props.cor + '40' }]}>
              <View style={[estilos.numeroBadge, { backgroundColor: props.cor + '20' }]}>
                <Text style={[estilos.numeroBadgeTexto, { color: props.cor }]}>{props.numero}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Título e essência */}
        <Text style={[estilos.cardTitulo, { color: props.cor }]}>{props.titulo}</Text>
        <Text style={estilos.cardEssencia}>{props.essencia}</Text>

        {/* Descrição */}
        <Text style={estilos.cardDescricao}>{props.descricao}</Text>

        {/* Badges */}
        <View style={estilos.badgesRow}>
          <View style={estilos.badgeItem}>
            <Text style={estilos.badgeEmoji}>🪐</Text>
            <Text style={estilos.badgeTexto}>{props.planeta}</Text>
          </View>
          <View style={estilos.badgeItem}>
            <Text style={estilos.badgeEmoji}>{props.elemento === 'Fogo' ? '🔥' : props.elemento === 'Terra' ? '🌍' : props.elemento === 'Ar' ? '💨' : '💧'}</Text>
            <Text style={estilos.badgeTexto}>{props.elemento}</Text>
          </View>
        </View>

        {/* Qualidades */}
        <View style={estilos.tagsContainer}>
          <Text style={estilos.tagsTitulo}>Qualidades</Text>
          <View style={estilos.tagsRow}>
            {props.qualidades.map((q) => (
              <View key={q} style={[estilos.tag, { backgroundColor: props.cor + '15', borderColor: props.cor + '30' }]}>
                <Text style={[estilos.tagTexto, { color: props.cor }]}>{q}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Desafios */}
        <View style={estilos.tagsContainer}>
          <Text style={estilos.tagsTitulo}>Desafios</Text>
          <View style={estilos.tagsRow}>
            {props.desafios.map((d) => (
              <View key={d} style={[estilos.tag, { backgroundColor: 'rgba(217,79,79,0.1)', borderColor: 'rgba(217,79,79,0.2)' }]}>
                <Text style={[estilos.tagTexto, { color: Cores.erro }]}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Espacamento.md,
    paddingTop: Espacamento.md,
    paddingBottom: Espacamento.sm,
  },
  voltarBotao: {
    width: 40,
    height: 40,
    borderRadius: RaioBorda.full,
    backgroundColor: Cores.cardFundo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    color: Cores.textoClaro,
  },
  headerSubtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  heroContainer: {
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  heroGradiente: {
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
    alignItems: 'center',
    paddingVertical: Espacamento.lg,
    paddingHorizontal: Espacamento.md,
  },
  heroLabel: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 11,
    color: Cores.acento,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Espacamento.md,
    opacity: 0.8,
  },
  heroDescricao: {
    fontFamily: Fontes.titulo,
    fontSize: 16,
    color: Cores.textoClaro,
    marginTop: Espacamento.md,
    letterSpacing: 0.5,
  },
  secao: {
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.md,
  },
  // Card Número
  cardNumero: { marginBottom: 0 },
  cardNumeroGradiente: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Espacamento.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
  },
  cardLabel: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.textoClaro,
  },
  cardDescLabel: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
  },
  cardIconeCirculo: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },
  numeroBadgeWrap: { alignItems: 'center', justifyContent: 'center' },
  numeroBadgeAnel: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  numeroBadge: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  numeroBadgeTexto: {
    fontFamily: Fontes.titulo,
    fontSize: 26,
  },
  cardTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    marginBottom: 2,
  },
  cardEssencia: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.acento,
    marginBottom: Espacamento.sm,
  },
  cardDescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    lineHeight: 21,
    marginBottom: Espacamento.md,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Espacamento.md,
    marginBottom: Espacamento.md,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeEmoji: { fontSize: 14 },
  badgeTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  tagsContainer: {
    marginBottom: Espacamento.sm,
  },
  tagsTitulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
    color: Cores.textoSecundario,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RaioBorda.full,
    borderWidth: 1,
  },
  tagTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
  },
  // Resumo
  resumoCard: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.lg,
    alignItems: 'center',
  },
  resumoTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 18,
    color: Cores.textoClaro,
    marginTop: Espacamento.sm,
    marginBottom: Espacamento.sm,
  },
  resumoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoSecundario,
    lineHeight: 22,
    textAlign: 'center',
  },
  // Formato
  formatosBarra: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.sm,
  },
  formatoItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingVertical: Espacamento.sm,
    borderRadius: RaioBorda.md,
  },
  formatoAtivo: { backgroundColor: 'rgba(212, 175, 55, 0.12)' },
  formatoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
  formatoTextoAtivo: {
    color: Cores.acento,
    fontFamily: Fontes.corpoSemibold,
  },
  breveBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RaioBorda.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  breveTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 9,
    color: Cores.textoSecundario,
  },
  // Botões
  botoesFinais: {
    flexDirection: 'row',
    gap: Espacamento.sm,
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.xl,
    paddingBottom: Espacamento.xl,
  },
  botaoVoltar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Espacamento.sm,
    paddingVertical: 14,
    paddingHorizontal: Espacamento.lg,
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  botaoVoltarTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  botaoNovo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Espacamento.sm,
    paddingVertical: 14,
    borderRadius: RaioBorda.lg,
  },
  botaoNovoTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: '#fff',
  },
});
