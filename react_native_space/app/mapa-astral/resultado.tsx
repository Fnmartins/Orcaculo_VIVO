import React, { useRef, useEffect, useMemo, useState } from 'react';
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
import { BotaoOuvir } from '../../components/BotaoOuvir';
import { EstadoTela } from '../../components/EstadoTela';
import { NotaReflexiva } from '../../components/NotaReflexiva';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { dataConsultaValida, horarioConsultaValido, textoConsultaValido } from '../../utils/validacaoConsulta';
import { Hapticos } from '../../utils/haptics';
import { lerSigno, corElemento, type LeituraSignoSolar } from '../../data/astrologia';
import {
  escreverGrau, montarMapaAstral, ordemDeLeitura, visivelNoGratuito, type MapaAstral,
} from '../../data/mapaAstral';
import {
  TEXTO_ABERTURA, TEXTO_ASCENDENTE, TEXTO_CORPO, TEXTO_ELEMENTO,
  TEXTO_ELEMENTO_AUSENTE, TEXTO_QUALIDADE, TEXTO_RETROGRADO,
} from '../../data/textos-mapa';
import { rotuloDoOffset } from '../../utils/fuso';
import { usePlano } from '../../hooks/usePlano';
import { gerarInterpretacaoMapa, type InterpretacaoMapa } from '../../services/ia';
import { SemaforoUso } from '../../components/SemaforoUso';

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

interface MarcadorRoda {
  /** Longitude eclíptica, 0 a 360 — o grau de verdade, não o meio do signo. */
  longitude: number;
  label: string;
  cor: string;
}

function RodaZodiacal({ solIdx, marcadores }: { solIdx: number; marcadores: MarcadorRoda[] }) {
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
          <Stop offset="0%" stopColor="rgba(181,139,70,0.14)" />
          <Stop offset="60%" stopColor="rgba(88,117,101,0.07)" />
          <Stop offset="100%" stopColor="rgba(88,117,101,0)" />
        </SvgRadial>
      </Defs>
      {/* Glow central */}
      <Circle cx={cx} cy={cy} r={rExt} fill="url(#astralCore)" />
      {/* Anéis */}
      <Circle cx={cx} cy={cy} r={rExt} fill="none" stroke="rgba(181,139,70,0.35)" strokeWidth={1} />
      <Circle cx={cx} cy={cy} r={rMed} fill="none" stroke="rgba(181,139,70,0.22)" strokeWidth={0.8} />
      <Circle cx={cx} cy={cy} r={rInt} fill="none" stroke="rgba(181,139,70,0.18)" strokeWidth={0.6} />
      <Circle cx={cx} cy={cy} r={rCore} fill="rgba(181,139,70,0.10)" stroke="rgba(181,139,70,0.45)" strokeWidth={1} />
      {/* Cruz no centro */}
      <Line x1={cx - rCore} y1={cy} x2={cx + rCore} y2={cy} stroke="rgba(181,139,70,0.45)" strokeWidth={0.7} />
      <Line x1={cx} y1={cy - rCore} x2={cx} y2={cy + rCore} stroke="rgba(181,139,70,0.45)" strokeWidth={0.7} />
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
              stroke="rgba(181,139,70,0.28)" strokeWidth={0.7} />
            {/* Fundo da fatia ativa */}
            {isAtivo && (
              <Path
                d={`M ${cx} ${cy} L ${cx + rExt * Math.cos(angSlice)} ${cy + rExt * Math.sin(angSlice)} A ${rExt} ${rExt} 0 0 1 ${cx + rExt * Math.cos(angNext)} ${cy + rExt * Math.sin(angNext)} Z`}
                fill={SIGNOS_CORES[i] + '18'}
              />
            )}
            {/* Símbolo */}
            <SvgText x={symX} y={symY + 3} textAnchor="middle"
              fontSize={10} fill={isAtivo ? SIGNOS_CORES[i] : 'rgba(36,49,45,0.55)'}
              fontWeight={isAtivo ? '700' : '400'}>{sim}</SvgText>
          </G>
        );
      })}
      {/* Marcadores no grau real. Raios diferentes para dois corpos no mesmo
          grau não virarem um borrão só. */}
      {marcadores.map(({ longitude, label, cor }, i) => {
        const ang = (longitude - 90) * (Math.PI / 180);
        const raio = rInt * (0.82 - i * 0.22);
        const px = cx + raio * Math.cos(ang);
        const py = cy + raio * Math.sin(ang);
        return (
          <G key={label}>
            <Circle cx={px} cy={py} r={9} fill={cor + '30'} stroke={cor} strokeWidth={1} />
            <SvgText x={px} y={py + 3} textAnchor="middle"
              fontSize={label.length > 1 ? 7 : 10} fill={cor}>{label}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// O campo de estrelas piscando saiu junto com o fundo escuro: era branco sobre
// preto, e esta era a única tela do app em tema inverso. O conselho de 21/09
// também pediu "sem brilho sobre texto".

export default function TelaMapaAstralResultado() {
  const params = useLocalSearchParams<{
    dia: string; mes: string; ano: string;
    hora: string; minuto: string; semHora: string; cidade: string; cidadeId: string;
  }>();
  const { temAcesso } = usePlano();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [interpretacao, setInterpretacao] = useState<InterpretacaoMapa | null>(null);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [erroIA, setErroIA] = useState<string | null>(null);

  // O mapa de verdade: posições do céu naquele instante, naquele lugar. Até
  // 26/09 esta tela mostrava só o signo solar, porque o resto era inventado
  // por aritmética e tinha sido tirado da tela em 23/09.
  const mapa: MapaAstral | null = useMemo(() => {
    if (!params.cidadeId) return null;
    const semHora = params.semHora === '1';
    try {
      return montarMapaAstral({
        ano: parseInt(params.ano ?? '0', 10),
        mes: parseInt(params.mes ?? '0', 10),
        dia: parseInt(params.dia ?? '0', 10),
        hora: semHora ? null : parseInt(params.hora ?? '0', 10),
        minuto: semHora ? null : parseInt(params.minuto ?? '0', 10),
        cidadeId: params.cidadeId,
      });
    } catch {
      return null;
    }
  }, [params.ano, params.mes, params.dia, params.hora, params.minuto, params.semHora, params.cidadeId]);

  // O signo solar vem da longitude do Sol, não da faixa de datas: quem nasce na
  // virada recebia o signo do vizinho.
  const leitura: LeituraSignoSolar | null = useMemo(() => {
    const sol = mapa?.posicoes.find((p) => p.corpo === 'sol');
    return sol ? lerSigno(sol.signo) : null;
  }, [mapa]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Sem cidade da lista não existe mapa: foi o que mudou quando a cidade deixou
  // de ser texto livre. Link antigo cai aqui e pede para refazer.
  const parametrosValidos = dataConsultaValida(params.dia, params.mes, params.ano)
    && horarioConsultaValido(params.hora, params.minuto)
    && textoConsultaValido(params.cidade)
    && mapa !== null
    && leitura !== null;

  if (!parametrosValidos) {
    return (
      <GradientBackground>
        <SafeAreaView style={estilos.safeArea}>
          <EstadoTela
            tipo="erro"
            titulo="Faltam dados para o mapa astral"
            descricao="Refaça o pedido escolhendo a cidade de nascimento na lista: sem a coordenada e o fuso dela não dá para calcular o seu ascendente."
            acaoLabel="Revisar dados"
            onAcao={() => voltarOuIr()}
          />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const { signo } = leitura;
  const solIdx = idxSigno(signo.id);
  const posicoes = ordemDeLeitura(mapa.posicoes);

  const aprofundar = async () => {
    if (carregandoIA || interpretacao || !mapa) return;
    setCarregandoIA(true);
    setErroIA(null);
    Hapticos.impactoMedio();
    try {
      // Sobem só as posições calculadas. Data, hora e cidade de nascimento
      // ficam no aparelho: as efemérides já rodaram aqui.
      setInterpretacao(await gerarInterpretacaoMapa({
        sol: { signo: posicoes[0].signo.nome, grau: posicoes[0].grau },
        lua: { signo: posicoes[1].signo.nome, grau: posicoes[1].grau },
        ascendente: mapa.signoAscendente
          ? { signo: mapa.signoAscendente.nome, grau: mapa.grauAscendente ?? 0 }
          : undefined,
        planetas: posicoes.filter((p) => !visivelNoGratuito(p.corpo)).map((p) => ({
          nome: TEXTO_CORPO[p.corpo].titulo,
          signo: p.signo.nome,
          retrogrado: p.retrogrado,
        })),
        elementoDominante: mapa.sintese.elementoDominante,
        qualidadeDominante: mapa.sintese.qualidadeDominante,
        elementoAusente: mapa.sintese.elementoAusente ?? undefined,
        regente: mapa.sintese.regenteDoMapa?.planeta,
      }));
    } catch (e) {
      setErroIA(e instanceof Error ? e.message : 'Não foi possível ler agora. Tente de novo.');
    } finally {
      setCarregandoIA(false);
    }
  };
  const sol = posicoes[0];
  const lua = posicoes[1];
  const temMapaCompleto = temAcesso('mapa_completo');

  // Os marcadores da roda, no grau real — não mais no meio da fatia do signo.
  const marcadores = [
    { longitude: sol.longitude, label: '☀', cor: '#F1C40F' },
    { longitude: lua.longitude, label: '☾', cor: Cores.secundaria },
    ...(mapa.angulos ? [{ longitude: mapa.angulos.ascendente, label: 'Asc', cor: '#D4AF37' }] : []),
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
              <RodaZodiacal solIdx={solIdx} marcadores={marcadores} />
            </View>
            <View style={estilos.rodaLegenda}>
              {[
                { label: `☀ Sol em ${signo.nome}`, cor: '#F1C40F' },
                { label: `☾ Lua em ${lua.signo.nome}`, cor: Cores.secundaria },
                ...(mapa.signoAscendente
                  ? [{ label: `Asc em ${mapa.signoAscendente.nome}`, cor: '#D4AF37' }]
                  : []),
              ].map((item) => (
                <View key={item.label} style={estilos.rodaLegendaItem}>
                  <View style={[estilos.rodaLegendaPonto, { backgroundColor: item.cor }]} />
                  <Text style={[estilos.rodaLegendaTexto, { color: item.cor }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <BotaoOuvir
            partes={[
              { texto: `Sol em ${signo.nome}, ${escreverGrau(sol.longitude)}.` },
              { texto: `Lua em ${lua.signo.nome}, ${escreverGrau(lua.longitude)}.` },
              ...(mapa.signoAscendente && mapa.angulos
                ? [{ texto: `Ascendente em ${mapa.signoAscendente.nome}, ${escreverGrau(mapa.angulos.ascendente)}.` }]
                : [{ texto: 'Sem a hora de nascimento, este mapa não tem ascendente.' }]),
              {
                rotulo: 'Equilíbrio',
                texto: `Predomina ${mapa.sintese.elementoDominante}, na modalidade ${mapa.sintese.qualidadeDominante}.`,
              },
              ...(interpretacao
                ? [
                  { rotulo: interpretacao.titulo, texto: interpretacao.narrativa },
                  { texto: interpretacao.forca },
                  { texto: interpretacao.tensao },
                  { rotulo: 'Uma prática', texto: interpretacao.conselho },
                ]
                : []),
            ]}
          />

          {/* O que o mapa é, antes de qualquer interpretação */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.aberturaTexto}>{TEXTO_ABERTURA}</Text>
          </Animated.View>

          {/* Sol, Lua e ascendente: o que o plano gratuito mostra (decisão M7) */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={estilos.secaoTitulo}>☀ Seu Sol</Text>
            <Text style={estilos.secaoSubtitulo}>{escreverGrau(sol.longitude)}</Text>

            <CardPrincipal
              titulo="Sol"
              icone="sunny"
              iconeLib="ionicons"
              signo={signo.nome}
              simbolo={signo.simbolo}
              grau={Math.floor(sol.grau)}
              elemento={signo.elemento}
              corElemento={corElemento(signo.elemento)}
              corSigno={signo.cor}
              interpretacao={`${TEXTO_CORPO.sol.papel} ${leitura.texto}`}
              subtitulo="Sua essência e identidade"
            />
          </Animated.View>

          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>☾ Sua Lua</Text>
            <Text style={estilos.secaoSubtitulo}>{escreverGrau(lua.longitude)}</Text>

            <CardPrincipal
              titulo="Lua"
              icone="moon"
              iconeLib="ionicons"
              signo={lua.signo.nome}
              simbolo={lua.signo.simbolo}
              grau={Math.floor(lua.grau)}
              elemento={lua.signo.elemento}
              corElemento={corElemento(lua.signo.elemento)}
              corSigno={lua.signo.cor}
              interpretacao={`${TEXTO_CORPO.lua.papel} Em ${lua.signo.nome}: ${lua.signo.descricao}`}
              subtitulo="Seu mundo interno"
            />
            {mapa.luaIncerta && (
              <Text style={estilos.avisoHonesto}>
                Sem a hora de nascimento, a Lua pode ter mudado de signo nesse dia — ela anda 13
                graus por dia, e a sua está perto da virada. Com a hora, esta resposta fica firme.
              </Text>
            )}
          </Animated.View>

          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>↑ Seu Ascendente</Text>
            {mapa.signoAscendente && mapa.angulos ? (
              <>
                <Text style={estilos.secaoSubtitulo}>
                  {escreverGrau(mapa.angulos.ascendente)}
                </Text>
                <CardPrincipal
                  titulo="Ascendente"
                  icone="arrow-up-circle"
                  iconeLib="ionicons"
                  signo={mapa.signoAscendente.nome}
                  simbolo={mapa.signoAscendente.simbolo}
                  grau={Math.floor(mapa.grauAscendente ?? 0)}
                  elemento={mapa.signoAscendente.elemento}
                  corElemento={corElemento(mapa.signoAscendente.elemento)}
                  corSigno={mapa.signoAscendente.cor}
                  interpretacao={`${TEXTO_ASCENDENTE.papel} Em ${mapa.signoAscendente.nome}: ${mapa.signoAscendente.descricao}`}
                  subtitulo="Como você chega"
                />
                <Text style={estilos.rodapeCalculo}>
                  {`Calculado para ${params.cidade} às ${params.hora}:${(params.minuto ?? '0').padStart(2, '0')} (${rotuloDoOffset(mapa.offsetMinutos)}).`}
                  {mapa.fusoAproximado
                    ? ' Este aparelho não soube confirmar o horário de verão da época, então o ascendente pode estar uma hora fora.'
                    : ''}
                </Text>
              </>
            ) : (
              <View style={estilos.emConstrucaoCard}>
                <Ionicons name="time-outline" size={22} color={Cores.acento} />
                <Text style={estilos.emConstrucaoTitulo}>Sem a hora, não há ascendente</Text>
                <Text style={estilos.emConstrucaoTexto}>
                  {TEXTO_ASCENDENTE.papel}
                </Text>
                <Text style={estilos.emConstrucaoTexto}>
                  Ele muda de signo a cada duas horas, mais ou menos. Chutar um seria inventar —
                  e o resto do seu mapa acima continua valendo. Se achar a hora na certidão, refaça
                  o pedido: leva um minuto.
                </Text>
              </View>
            )}
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

          {/* O resto do céu: planos pagos (decisão M7) */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>Os outros planetas</Text>
            {temMapaCompleto ? (
              <>
                <Text style={estilos.secaoSubtitulo}>
                  Oito posições, calculadas para o seu instante de nascimento
                </Text>
                {posicoes.filter((p) => !visivelNoGratuito(p.corpo)).map((p) => (
                  <View key={p.corpo} style={estilos.planetaLinha}>
                    <View style={estilos.planetaCabeca}>
                      <Text style={[estilos.planetaNome, { color: p.signo.cor }]}>
                        {TEXTO_CORPO[p.corpo].titulo}
                      </Text>
                      <Text style={estilos.planetaGrau}>
                        {escreverGrau(p.longitude)}{p.retrogrado ? ' ℞' : ''}
                      </Text>
                    </View>
                    <Text style={estilos.planetaPapel}>{TEXTO_CORPO[p.corpo].papel}</Text>
                  </View>
                ))}
                {posicoes.some((p) => p.retrogrado && !visivelNoGratuito(p.corpo)) && (
                  <Text style={estilos.notaRodape}>℞ {TEXTO_RETROGRADO}</Text>
                )}
              </>
            ) : (
              <View style={estilos.emConstrucaoCard}>
                <Ionicons name="planet-outline" size={22} color={Cores.acento} />
                <Text style={estilos.emConstrucaoTitulo}>
                  Mercúrio, Vênus, Marte e mais cinco
                </Text>
                <Text style={estilos.emConstrucaoTexto}>
                  Sol, Lua e ascendente são os três que mais fazem alguém reconhecer o próprio mapa,
                  e ficam abertos. As outras oito posições — como você pensa, o que te dá prazer,
                  como você age — entram a partir do plano Iniciante.
                </Text>
                <Pressable
                  onPress={() => { Hapticos.impactoLeve(); router.push('/planos'); }}
                  accessibilityRole="button"
                  accessibilityLabel="Ver os planos"
                  style={estilos.botaoPlanos}
                >
                  <Text style={estilos.botaoPlanosTexto}>Ver os planos</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>

          {/* A leitura da combinação, escrita na hora. O que cada peça significa
              já está acima, em texto revisável; aqui a IA só liga as peças. */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>O que isso forma junto</Text>
            {interpretacao ? (
              <View style={estilos.equilibrioCaixa}>
                <Text style={estilos.iaTituloResultado}>{interpretacao.titulo}</Text>
                <Text style={estilos.equilibrioTexto}>{interpretacao.narrativa}</Text>
                {[
                  { rotulo: 'O que essa combinação faz bem', texto: interpretacao.forca },
                  { rotulo: 'Onde ela puxa para dois lados', texto: interpretacao.tensao },
                  { rotulo: 'Uma prática', texto: interpretacao.conselho },
                ].filter((b) => b.texto).map((bloco) => (
                  <View key={bloco.rotulo}>
                    <Text style={estilos.iaRotulo}>{bloco.rotulo}</Text>
                    <Text style={estilos.equilibrioTexto}>{bloco.texto}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <>
                <SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />
                <Text style={estilos.secaoSubtitulo}>
                  Acima está o que cada peça do mapa significa. Isto aqui é a leitura da sua
                  combinação — o que Sol, Lua e Ascendente fazem juntos em você.
                </Text>
                {erroIA && <Text style={estilos.avisoHonesto}>{erroIA}</Text>}
                <Pressable
                  onPress={aprofundar}
                  disabled={carregandoIA}
                  accessibilityRole="button"
                  accessibilityLabel="Ler a combinação do meu mapa com IA"
                  style={[estilos.botaoPlanos, carregandoIA && { opacity: 0.6 }]}
                >
                  <Text style={estilos.botaoPlanosTexto}>
                    {carregandoIA ? 'Lendo o seu mapa…' : 'Ler a minha combinação ✨'}
                  </Text>
                </Pressable>
              </>
            )}
          </Animated.View>

          {/* Equilíbrio de elementos e qualidades: a leitura do mapa como um todo */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>O seu equilíbrio</Text>
            <View style={estilos.equilibrioCaixa}>
              <Text style={estilos.equilibrioLinha}>
                {Object.entries(mapa.sintese.elementos)
                  .map(([nome, quantos]) => `${nome} ${quantos}`)
                  .join('   ·   ')}
              </Text>
              <Text style={estilos.equilibrioTexto}>
                {`Predomina ${mapa.sintese.elementoDominante}. ${TEXTO_ELEMENTO[mapa.sintese.elementoDominante] ?? ''}`}
              </Text>
              {mapa.sintese.elementoAusente && (
                <Text style={estilos.equilibrioTexto}>
                  {`Sem nenhum planeta em ${mapa.sintese.elementoAusente}. ${TEXTO_ELEMENTO_AUSENTE}`}
                </Text>
              )}
              <Text style={estilos.equilibrioTexto}>
                {`Modalidade dominante: ${mapa.sintese.qualidadeDominante}. ${TEXTO_QUALIDADE[mapa.sintese.qualidadeDominante] ?? ''}`}
              </Text>
              {mapa.sintese.regenteDoMapa && (
                <Text style={estilos.equilibrioTexto}>
                  {`Regente do mapa: ${mapa.sintese.regenteDoMapa.planeta}, que rege o seu ascendente em ${mapa.sintese.regenteDoMapa.signo}.`}
                </Text>
              )}
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
        colors={[props.corSigno + '15', Cores.cardFundo] as const}
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

  aberturaTexto: {
    fontFamily: Fontes.corpo, fontSize: 13, lineHeight: 20,
    color: Cores.textoSecundario, textAlign: 'center',
    paddingHorizontal: Espacamento.sm,
  },
  avisoHonesto: {
    fontFamily: Fontes.corpo, fontSize: 12, lineHeight: 18,
    color: Cores.textoSecundario, marginTop: Espacamento.sm,
  },
  rodapeCalculo: {
    fontFamily: Fontes.corpo, fontSize: 11, lineHeight: 17,
    color: Cores.textoSecundario, marginTop: Espacamento.sm,
  },
  planetaLinha: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(181,139,70,0.35)',
    paddingVertical: Espacamento.sm, gap: 4,
  },
  planetaCabeca: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'space-between', gap: Espacamento.sm,
  },
  planetaPapel: {
    fontFamily: Fontes.corpo, fontSize: 13, lineHeight: 20,
    color: Cores.textoClaro,
  },
  notaRodape: {
    fontFamily: Fontes.corpo, fontSize: 11, lineHeight: 17,
    color: Cores.textoSecundario, marginTop: Espacamento.sm,
  },
  botaoPlanos: {
    marginTop: Espacamento.sm, borderWidth: 1, borderColor: Cores.acento,
    borderRadius: RaioBorda.full, paddingVertical: 10, paddingHorizontal: Espacamento.lg,
  },
  botaoPlanosTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.acento },
  equilibrioCaixa: {
    backgroundColor: 'rgba(181,139,70,0.10)', borderRadius: RaioBorda.lg,
    padding: Espacamento.md, gap: Espacamento.sm,
  },
  equilibrioLinha: {
    fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.acento, textAlign: 'center',
  },
  equilibrioTexto: {
    fontFamily: Fontes.corpo, fontSize: 13, lineHeight: 20, color: Cores.textoClaro,
  },
  iaTituloResultado: {
    fontFamily: Fontes.titulo, fontSize: 17, color: Cores.acento,
  },
  iaRotulo: {
    fontFamily: Fontes.corpoSemibold, fontSize: 12, color: Cores.textoSecundario,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
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
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
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
    // Era um véu branco, feito para o fundo escuro; sobre o creme sumia.
    backgroundColor: 'rgba(88,117,101,0.10)',
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
