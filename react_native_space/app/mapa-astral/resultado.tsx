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
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, G, Text as SvgText, Defs, RadialGradient as SvgRadial, Stop, Line } from 'react-native-svg';
import { GradientBackground } from '../../components/GradientBackground';
import { EstadoTela } from '../../components/EstadoTela';
import { NotaReflexiva } from '../../components/NotaReflexiva';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { dataConsultaValida, horarioConsultaValido, textoConsultaValido } from '../../utils/validacaoConsulta';
import { Hapticos } from '../../utils/haptics';
import { gerarMapaAstral, corElemento, type MapaAstralResultado } from '../../data/astrologia';

const { width: W } = Dimensions.get('window');

const SIGNOS_SIMBOLOS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const SIGNOS_CORES = ['#E74C3C','#27AE60','#F1C40F','#3498DB','#E74C3C','#27AE60',
  '#9B59B6','#C0392B','#E67E22','#2C3E50','#3498DB','#1ABC9C'];
const SIGNOS_IDS = ['aries','touro','gemeos','cancer','leao','virgem',
  'libra','escorpiao','sagitario','capricornio','aquario','peixes'];
function idxSigno(id: string): number {
  const i = SIGNOS_IDS.indexOf(id);
  return i >= 0 ? i : 0;
}

function RodaZodiacal({ solIdx, luaIdx, ascIdx }: { solIdx: number; luaIdx: number; ascIdx: number }) {
  const SIZE = Math.min(W - 48, 260);
  const cx = SIZE / 2, cy = SIZE / 2;
  const rExt = SIZE * 0.48;
  const rMed = SIZE * 0.38;
  const rInt = SIZE * 0.28;
  const rCore = SIZE * 0.14;
  const sliceDeg = 360 / 12;

  return (
    <Svg width={SIZE} height={SIZE}>
      <Defs>
        <SvgRadial id="astralCore" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(212,175,55,0.2)" />
          <Stop offset="60%" stopColor="rgba(75,0,130,0.1)" />
          <Stop offset="100%" stopColor="rgba(75,0,130,0)" />
        </SvgRadial>
      </Defs>
      {/* Glow central */}
      <Circle cx={cx} cy={cy} r={rExt} fill="url(#astralCore)" />
      {/* Anéis */}
      <Circle cx={cx} cy={cy} r={rExt} fill="none" stroke="rgba(212,175,55,0.2)" strokeWidth={1} />
      <Circle cx={cx} cy={cy} r={rMed} fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth={0.8} />
      <Circle cx={cx} cy={cy} r={rInt} fill="none" stroke="rgba(212,175,55,0.1)" strokeWidth={0.6} />
      <Circle cx={cx} cy={cy} r={rCore} fill="rgba(212,175,55,0.08)" stroke="rgba(212,175,55,0.3)" strokeWidth={1} />
      {/* Cruz no centro */}
      <Line x1={cx - rCore} y1={cy} x2={cx + rCore} y2={cy} stroke="rgba(212,175,55,0.3)" strokeWidth={0.7} />
      <Line x1={cx} y1={cy - rCore} x2={cx} y2={cy + rCore} stroke="rgba(212,175,55,0.3)" strokeWidth={0.7} />
      {/* 12 fatias + símbolos */}
      {SIGNOS_SIMBOLOS.map((sim, i) => {
        const angMid = (i * sliceDeg - 90 + sliceDeg / 2) * (Math.PI / 180);
        const angSlice = (i * sliceDeg - 90) * (Math.PI / 180);
        const angNext = ((i + 1) * sliceDeg - 90) * (Math.PI / 180);
        const sx = cx + rExt * Math.cos(angSlice);
        const sy = cy + rExt * Math.sin(angSlice);
        const ex = cx + rMed * Math.cos(angSlice);
        const ey = cy + rMed * Math.sin(angSlice);
        const symX = cx + (rMed + (rExt - rMed) / 2) * Math.cos(angMid);
        const symY = cy + (rMed + (rExt - rMed) / 2) * Math.sin(angMid);
        const isAtivo = i === solIdx || i === luaIdx || i === ascIdx;
        return (
          <G key={i}>
            {/* Linha divisória */}
            <Path d={`M ${ex} ${ey} L ${sx} ${sy}`}
              stroke="rgba(212,175,55,0.15)" strokeWidth={0.7} />
            {/* Fundo da fatia ativa */}
            {isAtivo && (
              <Path
                d={`M ${cx} ${cy} L ${cx + rExt * Math.cos(angSlice)} ${cy + rExt * Math.sin(angSlice)} A ${rExt} ${rExt} 0 0 1 ${cx + rExt * Math.cos(angNext)} ${cy + rExt * Math.sin(angNext)} Z`}
                fill={SIGNOS_CORES[i] + '18'}
              />
            )}
            {/* Símbolo */}
            <SvgText x={symX} y={symY + 3} textAnchor="middle"
              fontSize={10} fill={isAtivo ? SIGNOS_CORES[i] : 'rgba(36,49,45,0.45)'}
              fontWeight={isAtivo ? '700' : '400'}>{sim}</SvgText>
          </G>
        );
      })}
      {/* Marcadores Sol/Lua/Asc */}
      {[
        { idx: solIdx, label: '☀', cor: '#F1C40F' },
        { idx: luaIdx, label: '☽', cor: '#87CEEB' },
        { idx: ascIdx, label: '↑', cor: '#9B59B6' },
      ].map(({ idx, label, cor }) => {
        const ang = (idx * sliceDeg - 90 + sliceDeg / 2) * (Math.PI / 180);
        const px = cx + rInt * 0.72 * Math.cos(ang);
        const py = cy + rInt * 0.72 * Math.sin(ang);
        return (
          <G key={label}>
            <Circle cx={px} cy={py} r={9} fill={cor + '30'} stroke={cor} strokeWidth={1} />
            <SvgText x={px} y={py + 3} textAnchor="middle"
              fontSize={10} fill={cor}>{label}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// Estrela piscante para o fundo
function EstrelaFundo({ x, y, op }: { x: number; y: number; op: number }) {
  const anim = useRef(new Animated.Value(op)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: op * 0.2, duration: 1500 + Math.random() * 1000, useNativeDriver: true }),
      Animated.timing(anim, { toValue: op, duration: 1500 + Math.random() * 1000, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={{ position: 'absolute', left: x, top: y, width: 1.5, height: 1.5, borderRadius: 1, backgroundColor: '#fff', opacity: anim }} />;
}

const ESTRELAS_FUNDO = Array.from({ length: 30 }, (_, i) => ({
  x: (i * 131.3 % 1) * W,
  y: (i * 83.7 % 1) * 220,
  op: 0.2 + (i % 4) * 0.12,
}));

export default function TelaMapaAstralResultado() {
  const params = useLocalSearchParams<{
    dia: string; mes: string; ano: string;
    hora: string; minuto: string; cidade: string;
  }>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const mapa: MapaAstralResultado = useMemo(() => {
    const d = parseInt(params.dia ?? '1', 10);
    const m = parseInt(params.mes ?? '1', 10);
    const a = parseInt(params.ano ?? '2000', 10);
    const h = parseInt(params.hora ?? '12', 10);
    const min = parseInt(params.minuto ?? '0', 10);
    return gerarMapaAstral(d, m, a, h, min);
  }, [params.dia, params.mes, params.ano, params.hora, params.minuto]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const parametrosValidos = dataConsultaValida(params.dia, params.mes, params.ano)
    && horarioConsultaValido(params.hora, params.minuto)
    && textoConsultaValido(params.cidade);

  if (!parametrosValidos) {
    return (
      <GradientBackground colors={['#060413', '#0D0820', '#060413']}>
        <SafeAreaView style={estilos.safeArea}>
          <EstadoTela
            tipo="erro"
            titulo="Faltam dados para o mapa astral"
            descricao="Revise sua data, horário e cidade de nascimento para calcular o mapa corretamente."
            acaoLabel="Revisar dados"
            onAcao={() => router.back()}
          />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // índices dos signos para a roda
  const solIdx = idxSigno(mapa.sol.signo.id);
  const luaIdx = idxSigno(mapa.lua.signo.id);
  const ascIdx = idxSigno(mapa.ascendente.signo.id);

  return (
    <GradientBackground colors={['#060413', '#0D0820', '#060413']}>
      {/* Campo estelar */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {ESTRELAS_FUNDO.map((e, i) => <EstrelaFundo key={i} {...e} />)}
      </View>
      <SafeAreaView style={estilos.safeArea}>
        <ScrollView
          contentContainerStyle={estilos.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Pressable
              onPress={() => router.back()}
              style={estilos.voltarBotao}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
            </Pressable>
            <View style={estilos.headerCenter}>
              <Text style={estilos.headerTitulo}>Seu Mapa Astral</Text>
              <Text style={estilos.headerSubtitulo}>
                {params.dia}/{params.mes}/{params.ano} — {params.cidade}
              </Text>
            </View>
            <View style={estilos.voltarBotaoEspaco} />
          </Animated.View>

          {/* Roda zodiacal */}
          <Animated.View style={[estilos.rodaContainer, { opacity: fadeAnim }]}>
            <View style={estilos.rodaWrapper}>
              <RodaZodiacal solIdx={solIdx} luaIdx={luaIdx} ascIdx={ascIdx} />
            </View>
            <View style={estilos.rodaLegenda}>
              {[
                { label: `☀ Sol em ${mapa.sol.signo.nome}`, cor: '#F1C40F' },
                { label: `☽ Lua em ${mapa.lua.signo.nome}`, cor: '#87CEEB' },
                { label: `↑ Asc. ${mapa.ascendente.signo.nome}`, cor: '#9B59B6' },
              ].map((item) => (
                <View key={item.label} style={estilos.rodaLegendaItem}>
                  <View style={[estilos.rodaLegendaPonto, { backgroundColor: item.cor }]} />
                  <Text style={[estilos.rodaLegendaTexto, { color: item.cor }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Big 3 - Sol, Lua, Ascendente */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={estilos.secaoTitulo}>✨ Trindade Astral</Text>
            <Text style={estilos.secaoSubtitulo}>Sol, Lua e Ascendente — a base do seu mapa</Text>

            {/* Sol */}
            <CardPrincipal
              titulo="Sol"
              icone="sunny"
              iconeLib="ionicons"
              signo={mapa.sol.signo.nome}
              simbolo={mapa.sol.signo.simbolo}
              grau={mapa.sol.grau}
              casa={mapa.sol.casa}
              elemento={mapa.sol.signo.elemento}
              corElemento={corElemento(mapa.sol.signo.elemento)}
              corSigno={mapa.sol.signo.cor}
              interpretacao={mapa.sol.interpretacao}
              subtitulo="Sua essência e identidade"
            />

            {/* Lua */}
            <CardPrincipal
              titulo="Lua"
              icone="moon"
              iconeLib="ionicons"
              signo={mapa.lua.signo.nome}
              simbolo={mapa.lua.signo.simbolo}
              grau={mapa.lua.grau}
              casa={mapa.lua.casa}
              elemento={mapa.lua.signo.elemento}
              corElemento={corElemento(mapa.lua.signo.elemento)}
              corSigno={mapa.lua.signo.cor}
              interpretacao={mapa.lua.interpretacao}
              subtitulo="Suas emoções e mundo interior"
            />

            {/* Ascendente */}
            <CardPrincipal
              titulo="Ascendente"
              icone="arrow-up-circle"
              iconeLib="ionicons"
              signo={mapa.ascendente.signo.nome}
              simbolo={mapa.ascendente.signo.simbolo}
              grau={mapa.ascendente.grau}
              elemento={mapa.ascendente.signo.elemento}
              corElemento={corElemento(mapa.ascendente.signo.elemento)}
              corSigno={mapa.ascendente.signo.cor}
              interpretacao={mapa.ascendente.interpretacao}
              subtitulo="Como o mundo te percebe"
            />
          </Animated.View>

          {/* Planetas */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>🪐 Posições Planetárias</Text>
            <Text style={estilos.secaoSubtitulo}>Onde cada planeta estava no seu nascimento</Text>

            {mapa.planetas.map((p) => (
              <View key={p.planeta.id} style={estilos.planetaCard}>
                <View style={estilos.planetaHeader}>
                  <View style={[estilos.planetaIcone, { backgroundColor: p.planeta.cor + '20' }]}>
                    <Text style={[estilos.planetaSimbolo, { color: p.planeta.cor }]}>{p.planeta.simbolo}</Text>
                  </View>
                  <View style={estilos.planetaInfo}>
                    <Text style={estilos.planetaNome}>{p.planeta.nome}</Text>
                    <Text style={estilos.planetaSigno}>
                      {p.signo.simbolo} {p.signo.nome} — Casa {p.casa}
                    </Text>
                  </View>
                  <Text style={estilos.planetaGrau}>{p.grau}°</Text>
                </View>
                <Text style={estilos.planetaInterpretacao}>{p.interpretacao}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Casas Astrológicas */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>🏠 Casas Astrológicas</Text>
            <Text style={estilos.secaoSubtitulo}>As 12 áreas da sua vida</Text>

            <View style={estilos.casasGrid}>
              {mapa.casas.map((c) => (
                <View key={c.casa.numero} style={estilos.casaItem}>
                  <View style={estilos.casaNumero}>
                    <Text style={estilos.casaNumeroTexto}>{c.casa.numero}</Text>
                  </View>
                  <View style={estilos.casaInfo}>
                    <Text style={estilos.casaNome}>{c.casa.nome}</Text>
                    <Text style={estilos.casaSigno}>{c.signo.simbolo} {c.signo.nome}</Text>
                    <Text style={estilos.casaArea}>{c.casa.area}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Resumo */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.12)', 'rgba(75, 0, 130, 0.12)'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={estilos.resumoCard}
            >
              <MaterialCommunityIcons name="auto-fix" size={24} color={Cores.acento} />
              <Text style={estilos.resumoTitulo}>Síntese do seu Mapa</Text>
              <Text style={estilos.resumoTexto}>{mapa.resumo}</Text>
            </LinearGradient>
          </Animated.View>

          {/* Barra de formato (como nas outras consultas) */}
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

          <View style={{ paddingHorizontal: Espacamento.lg }}>
            <NotaReflexiva />
          </View>

          {/* Botões finais */}
          <Animated.View style={[estilos.botoesFinais, { opacity: fadeAnim }]}>
            <Pressable
              onPress={() => { Hapticos.impactoLeve(); router.replace('/(tabs)'); }}
              style={({ pressed }) => [estilos.botaoVoltar, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <Ionicons name="home-outline" size={18} color={Cores.textoClaro} />
              <Text style={estilos.botaoVoltarTexto}>Voltar ao Início</Text>
            </Pressable>

            <Pressable
              onPress={() => { Hapticos.impactoLeve(); router.replace('/mapa-astral'); }}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <LinearGradient
                colors={Cores.gradienteAcento}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={estilos.botaoNovo}
              >
                <MaterialCommunityIcons name="creation" size={18} color="#fff" />
                <Text style={estilos.botaoNovoTexto}>Novo Mapa</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

/* ---- Card Principal (Sol/Lua/Ascendente) ---- */
interface CardPrincipalProps {
  titulo: string;
  icone: string;
  iconeLib: 'ionicons' | 'material';
  signo: string;
  simbolo: string;
  grau: number;
  casa?: number;
  elemento: string;
  corElemento: string;
  corSigno: string;
  interpretacao: string;
  subtitulo: string;
}

function CardPrincipal(props: CardPrincipalProps) {
  const Icone = props.iconeLib === 'material' ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={estilos.cardPrincipal}>
      <LinearGradient
        colors={[props.corSigno + '15', 'rgba(255,252,246,0.94)'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={estilos.cardPrincipalGradiente}
      >
        <View style={estilos.cardPrincipalTop}>
          <View style={[estilos.cardPrincipalIcone, { backgroundColor: props.corSigno + '20' }]}>
            <Icone name={props.icone as any} size={22} color={props.corSigno} />
          </View>
          <View style={estilos.cardPrincipalTituloBox}>
            <Text style={estilos.cardPrincipalTitulo}>{props.titulo}</Text>
            <Text style={estilos.cardPrincipalSub}>{props.subtitulo}</Text>
          </View>
          <Text style={estilos.cardPrincipalSimbolo}>{props.simbolo}</Text>
        </View>

        <View style={estilos.cardPrincipalSignoRow}>
          <Text style={[estilos.cardPrincipalSignoNome, { color: props.corSigno }]}>{props.signo}</Text>
          <View style={estilos.badgesRow}>
            <View style={[estilos.elementoBadge, { backgroundColor: props.corElemento + '20' }]}>
              <Text style={[estilos.elementoBadgeTexto, { color: props.corElemento }]}>{props.elemento}</Text>
            </View>
            <Text style={estilos.grauTexto}>{props.grau}°</Text>
            {props.casa != null && <Text style={estilos.grauTexto}>Casa {props.casa}</Text>}
          </View>
        </View>

        <Text style={estilos.cardPrincipalInterp}>{props.interpretacao}</Text>
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
    width: 44,
    height: 44,
    borderRadius: RaioBorda.full,
    backgroundColor: Cores.cardFundo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voltarBotaoEspaco: { width: 44, height: 44 },
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
  secao: {
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.lg,
  },
  rodaContainer: {
    alignItems: 'center',
    paddingVertical: Espacamento.lg,
    marginHorizontal: Espacamento.md,
    backgroundColor: 'rgba(10,7,25,0.6)',
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.12)',
    marginTop: Espacamento.sm,
    marginBottom: Espacamento.md,
  },
  rodaWrapper: { marginBottom: Espacamento.md },
  rodaLegenda: {
    flexDirection: 'row',
    gap: Espacamento.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  rodaLegendaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  rodaLegendaPonto: {
    width: 6, height: 6, borderRadius: 3,
  },
  rodaLegendaTexto: {
    fontFamily: Fontes.corpoSemibold, fontSize: 12,
  },
  secaoTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    color: Cores.textoClaro,
    marginBottom: 4,
  },
  secaoSubtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    marginBottom: Espacamento.md,
  },
  // Card Principal
  cardPrincipal: {
    marginBottom: Espacamento.md,
  },
  cardPrincipalGradiente: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
  },
  cardPrincipalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Espacamento.sm,
  },
  cardPrincipalIcone: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  cardPrincipalTituloBox: { flex: 1 },
  cardPrincipalTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 16,
    color: Cores.textoClaro,
  },
  cardPrincipalSub: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
  cardPrincipalSimbolo: {
    fontSize: 32,
    color: 'rgba(212, 175, 55, 0.4)',
  },
  cardPrincipalSignoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Espacamento.sm,
  },
  cardPrincipalSignoNome: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
  },
  elementoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RaioBorda.full,
  },
  elementoBadgeTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
  },
  grauTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  cardPrincipalInterp: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    lineHeight: 21,
  },
  // Planetas
  planetaCard: {
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  planetaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Espacamento.sm,
  },
  planetaIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  planetaSimbolo: {
    fontSize: 20,
    fontWeight: '700',
  },
  planetaInfo: { flex: 1 },
  planetaNome: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  planetaSigno: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  planetaGrau: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.acento,
  },
  planetaInterpretacao: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    lineHeight: 19,
  },
  // Casas
  casasGrid: {},
  casaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.sm,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.sm,
    marginBottom: Espacamento.xs,
  },
  casaNumero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  casaNumeroTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    color: Cores.acento,
  },
  casaInfo: { flex: 1 },
  casaNome: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.textoClaro,
  },
  casaSigno: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  casaArea: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.acento,
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
  formatoAtivo: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Espacamento.sm,
    paddingVertical: 14,
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
    flex: 1,
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
