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
import { voltarOuIr } from '../../utils/navegacao';
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
import { lerSignoSolar, corElemento, type LeituraSignoSolar } from '../../data/astrologia';

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

// Marca só o Sol: Lua e ascendente dependem do cálculo astronômico, que ainda não existe.
function RodaZodiacal({ solIdx }: { solIdx: number }) {
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
        const isAtivo = i === solIdx;
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
      {/* Marcador do Sol */}
      {[
        { idx: solIdx, label: '☀', cor: '#F1C40F' },
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

  // Só o signo solar: é o que a data permite afirmar sem cálculo astronômico.
  // Hora e cidade continuam sendo pedidas porque o motor real vai precisar delas.
  const leitura: LeituraSignoSolar = useMemo(() => {
    const d = parseInt(params.dia ?? '1', 10);
    const m = parseInt(params.mes ?? '1', 10);
    return lerSignoSolar(d, m);
  }, [params.dia, params.mes]);

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
            onAcao={() => voltarOuIr()}
          />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const { signo } = leitura;
  const solIdx = idxSigno(signo.id);

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
              onPress={() => voltarOuIr()}
              style={estilos.voltarBotao}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
            </Pressable>
            <View style={estilos.headerCenter}>
              <Text style={estilos.headerTitulo}>Seu Mapa Astral</Text>
              <Text style={estilos.headerSubtitulo}>
                {params.dia}/{params.mes}/{params.ano}
              </Text>
            </View>
            <View style={estilos.voltarBotaoEspaco} />
          </Animated.View>

          {/* Roda zodiacal */}
          <Animated.View style={[estilos.rodaContainer, { opacity: fadeAnim }]}>
            <View style={estilos.rodaWrapper}>
              <RodaZodiacal solIdx={solIdx} />
            </View>
            <View style={estilos.rodaLegenda}>
              {[
                { label: `☀ Sol em ${signo.nome}`, cor: '#F1C40F' },
              ].map((item) => (
                <View key={item.label} style={estilos.rodaLegendaItem}>
                  <View style={[estilos.rodaLegendaPonto, { backgroundColor: item.cor }]} />
                  <Text style={[estilos.rodaLegendaTexto, { color: item.cor }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Sol: a única posição que a data permite afirmar sem cálculo astronômico */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={estilos.secaoTitulo}>☀ Seu Sol</Text>
            <Text style={estilos.secaoSubtitulo}>O que a sua data de nascimento já revela</Text>

            <CardPrincipal
              titulo="Sol"
              icone="sunny"
              iconeLib="ionicons"
              signo={signo.nome}
              simbolo={signo.simbolo}
              elemento={signo.elemento}
              corElemento={corElemento(signo.elemento)}
              corSigno={signo.cor}
              interpretacao={leitura.texto}
              subtitulo="Sua essência e identidade"
            />
          </Animated.View>

          {/* Síntese */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.12)', 'rgba(75, 0, 130, 0.12)'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={estilos.resumoCard}
            >
              <MaterialCommunityIcons name="auto-fix" size={24} color={Cores.acento} />
              <Text style={estilos.resumoTitulo}>Síntese do seu Sol</Text>
              <Text style={estilos.resumoTexto}>{leitura.sintese}</Text>
            </LinearGradient>
          </Animated.View>

          {/* O que ainda não calculamos: dito com todas as letras, em vez de inventado */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <View style={estilos.emConstrucaoCard}>
              <Ionicons name="planet-outline" size={22} color={Cores.acento} />
              <Text style={estilos.emConstrucaoTitulo}>Seu mapa completo está a caminho</Text>
              <Text style={estilos.emConstrucaoTexto}>
                Lua, ascendente, planetas e casas dependem do cálculo astronômico feito com a hora e a cidade
                do seu nascimento. Estamos construindo esse cálculo com precisão profissional. Até ele ficar
                pronto, mostramos só o que a data permite afirmar com segurança.
              </Text>
              <Text style={estilos.emConstrucaoTexto}>
                Se você nasceu perto da troca de signo, o cálculo completo também vai confirmar o seu Sol.
              </Text>
            </View>
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
  /** Só com cálculo astronômico; sem ele, o card não mostra grau nem casa. */
  grau?: number;
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
            {props.grau != null && <Text style={estilos.grauTexto}>{props.grau}°</Text>}
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
  // Aviso do que o mapa completo vai trazer
  emConstrucaoCard: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    backgroundColor: Cores.cardFundo,
    padding: Espacamento.lg,
    alignItems: 'center',
    gap: Espacamento.sm,
  },
  emConstrucaoTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 17,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
  },
  emConstrucaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    lineHeight: 21,
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
