import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Button } from '../../components/Button';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import type { ResultadoBuzios } from '../../data/buzios';
import { gerarInterpretacaoBuzios, type InterpretacaoBuzios } from '../../services/ia';
import { compartilharBuzios } from '../../services/compartilhar';
import { RatingConsulta } from '../../components/RatingConsulta';

const FORMATOS = [
  { id: 'texto', icone: 'document-text-outline', titulo: 'Texto', disponivel: true },
  { id: 'audio', icone: 'headset-outline', titulo: 'Áudio', disponivel: false },
  { id: 'video', icone: 'videocam-outline', titulo: 'Vídeo', disponivel: false },
  { id: 'pdf', icone: 'download-outline', titulo: 'PDF', disponivel: false },
];

export default function TelaBuziosResultado() {
  const { resultado: resParam = '{}', intencao = '' } = useLocalSearchParams<{ resultado?: string; intencao?: string }>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [interpretacaoIA, setInterpretacaoIA] = useState<InterpretacaoBuzios | null>(null);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [erroIA, setErroIA] = useState(false);

  let resultado: ResultadoBuzios | null = null;
  try {
    resultado = JSON.parse(resParam);
  } catch {
    resultado = null;
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  async function aprofundarComIA() {
    if (carregandoIA || interpretacaoIA || !resultado?.odu) return;
    setCarregandoIA(true);
    setErroIA(false);
    try {
      const res = await gerarInterpretacaoBuzios({
        nome: resultado.odu.nome,
        numero: resultado.odu.numero,
        descricao: resultado.odu.descricao,
        orixas: resultado.odu.orixas,
        intenção: intencao || 'Orientação geral',
      });
      setInterpretacaoIA(res);
    } catch {
      setErroIA(true);
    } finally {
      setCarregandoIA(false);
    }
  }

  if (!resultado?.odu) {
    return (
      <GradientBackground>
        <SafeAreaView style={estilos.safeArea}>
          <View style={estilos.erroContainer}>
            <Text style={estilos.erroTexto}>Não foi possível carregar o resultado</Text>
            <Button variante="outline" label="Voltar" onPress={() => router.back()} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const { odu, buzios } = resultado;
  const numAbertos = buzios.filter((b: boolean) => b).length;
  const numFechados = 12 - numAbertos;

  const corEnergia = odu.energia === 'positiva' ? '#4CAF50'
    : odu.energia === 'atencao' ? '#FF9800'
    : '#78909C';

  const textoEnergia = odu.energia === 'positiva' ? 'Energia Positiva'
    : odu.energia === 'atencao' ? 'Atenção'
    : 'Energia Neutra';

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <ScrollView
          style={estilos.scroll}
          contentContainerStyle={estilos.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Pressable
              onPress={() => router.dismissTo('/(tabs)')}
              style={estilos.voltarBotao}
            >
              <Ionicons name="close" size={22} color={Cores.textoClaro} />
            </Pressable>
            <Text style={estilos.headerTitulo}>Leitura dos Búzios</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Formatos */}
          <Animated.View style={[estilos.formatosContainer, { opacity: fadeAnim }]}>
            <Text style={estilos.formatosTitulo}>Receba em outros formatos</Text>
            <View style={estilos.formatosGrid}>
              {FORMATOS.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => Hapticos.impactoLeve()}
                  style={[
                    estilos.formatoItem,
                    f.id === 'texto' && estilos.formatoAtivo,
                    !f.disponivel && estilos.formatoDesabilitado,
                  ]}
                >
                  <Ionicons
                    name={f.icone as any}
                    size={20}
                    color={f.id === 'texto' ? Cores.acento : Cores.textoSecundario}
                  />
                  <Text style={[estilos.formatoTexto, f.id === 'texto' && { color: Cores.acento }]}>
                    {f.titulo}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Card do Odu */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <LinearGradient
              colors={[odu.cor + '20', 'rgba(26,26,46,0.4)'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={estilos.oduCard}
            >
              {/* Cabeçalho do Odu */}
              <View style={estilos.oduHeader}>
                <View>
                  <Text style={estilos.oduNomeYoruba}>{odu.nomeYoruba}</Text>
                  <Text style={[estilos.oduNome, { color: odu.cor }]}>{odu.nome}</Text>
                </View>
                <View style={[estilos.energiaBadge, { backgroundColor: corEnergia + '20', borderColor: corEnergia + '40' }]}>
                  <View style={[estilos.energiaPonto, { backgroundColor: corEnergia }]} />
                  <Text style={[estilos.energiaTexto, { color: corEnergia }]}>{textoEnergia}</Text>
                </View>
              </View>

              {/* Estatísticas */}
              <View style={estilos.statsContainer}>
                <View style={estilos.statItem}>
                  <MaterialCommunityIcons name="grain" size={20} color={Cores.acento} />
                  <Text style={estilos.statNum}>{numAbertos}</Text>
                  <Text style={estilos.statLabel}>Abertos</Text>
                </View>
                <View style={estilos.statDivisor} />
                <View style={estilos.statItem}>
                  <MaterialCommunityIcons name="circle" size={18} color={Cores.textoSecundario} />
                  <Text style={estilos.statNum}>{numFechados}</Text>
                  <Text style={estilos.statLabel}>Fechados</Text>
                </View>
                <View style={estilos.statDivisor} />
                <View style={estilos.statItem}>
                  <Ionicons name="flame-outline" size={20} color={odu.cor} />
                  <Text style={estilos.statNum}>{odu.elemento}</Text>
                  <Text style={estilos.statLabel}>Elemento</Text>
                </View>
                <View style={estilos.statDivisor} />
                <View style={estilos.statItem}>
                  <Ionicons name="shield-outline" size={20} color={odu.cor} />
                  <Text style={estilos.statNum} numberOfLines={1}>{odu.regente.split('/')[0].trim()}</Text>
                  <Text style={estilos.statLabel}>Regente</Text>
                </View>
              </View>

              {/* Significado */}
              <View style={estilos.secao}>
                <Text style={estilos.secaoLabel}>🔮 Significado</Text>
                <Text style={estilos.secaoTexto}>{odu.significado}</Text>
              </View>

              {/* Conselho */}
              <View style={estilos.secao}>
                <Text style={estilos.secaoLabel}>💡 Conselho</Text>
                <Text style={estilos.secaoTexto}>{odu.conselho}</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Visualização dos búzios */}
          <Animated.View style={[estilos.buziosVisualContainer, { opacity: fadeAnim }]}>
            <Text style={estilos.buziosVisualTitulo}>Posição dos Búzios</Text>
            <View style={estilos.buziosGrid}>
              {buzios.map((aberto: boolean, i: number) => (
                <View key={i} style={[
                  estilos.buzioMini,
                  aberto ? estilos.buzioMiniAberto : estilos.buzioMiniFechado,
                ]}>
                  <Text style={[
                    estilos.buzioMiniTexto,
                    { color: aberto ? Cores.acento : '#8B7355' },
                  ]}>
                    {aberto ? '○' : '●'}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Bloco IA — Interpretação Aprofundada */}
          <Animated.View style={[estilos.iaContainer, { opacity: fadeAnim }]}>
            {!interpretacaoIA && !carregandoIA && (
              <Pressable
                onPress={() => { Hapticos.impactoMedio(); aprofundarComIA(); }}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              >
                <LinearGradient
                  colors={['rgba(124,154,130,0.12)', 'rgba(75,0,130,0.10)'] as const}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={estilos.iaBotaoCard}
                >
                  <View style={estilos.iaIconeCirculo}>
                    <MaterialCommunityIcons name="grain" size={24} color="#7C9A82" />
                  </View>
                  <View style={estilos.iaTextoArea}>
                    <Text style={estilos.iaTitulo}>Aprofundar com IA ✨</Text>
                    <Text style={estilos.iaSubtitulo}>
                      Interpretação personalizada do Odù com base na sua intenção
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#7C9A82" />
                </LinearGradient>
              </Pressable>
            )}

            {carregandoIA && (
              <LinearGradient
                colors={['rgba(124,154,130,0.08)', 'rgba(75,0,130,0.06)'] as const}
                style={estilos.iaCarregando}
              >
                <ActivityIndicator color="#7C9A82" />
                <Text style={estilos.iaCarregandoTexto}>Os Orixás falam através da IA...</Text>
              </LinearGradient>
            )}

            {erroIA && !carregandoIA && (
              <Pressable onPress={aprofundarComIA}>
                <View style={estilos.iaErro}>
                  <Ionicons name="refresh-outline" size={16} color={Cores.textoSecundario} />
                  <Text style={estilos.iaErroTexto}>Falha ao conectar. Tocar para tentar novamente.</Text>
                </View>
              </Pressable>
            )}

            {interpretacaoIA && (
              <LinearGradient
                colors={['rgba(124,154,130,0.10)', 'rgba(75,0,130,0.08)'] as const}
                style={estilos.iaResultado}
              >
                <View style={estilos.iaResultadoHeader}>
                  <MaterialCommunityIcons name="grain" size={14} color="#7C9A82" />
                  <Text style={[estilos.iaResultadoLabel, { color: '#7C9A82' }]}>Leitura Aprofundada por IA</Text>
                </View>
                <Text style={estilos.iaResultadoTitulo}>{interpretacaoIA.titulo}</Text>
                <Text style={estilos.iaResultadoNarrativa}>{interpretacaoIA.narrativa}</Text>

                {[
                  { label: 'Mensagem dos Orixás', texto: interpretacaoIA.mensagem },
                  { label: '💡 Conselho', texto: interpretacaoIA.conselho },
                  { label: '🙏 Axé', texto: interpretacaoIA.afirmacao },
                ].map((item) => (
                  <View key={item.label} style={estilos.iaSecao}>
                    <Text style={[estilos.iaSecaoLabel, { color: '#7C9A82' }]}>{item.label}</Text>
                    <Text style={estilos.iaSecaoTexto}>{item.texto}</Text>
                  </View>
                ))}
              </LinearGradient>
            )}
          </Animated.View>

          {/* Rating */}
          <RatingConsulta />

          {/* Ações */}
          <View style={estilos.acoesContainer}>
            <View style={estilos.acoesLinha}>
              <Pressable
                onPress={() => {
                  Hapticos.impactoLeve();
                  if (resultado?.odu) {
                    compartilharBuzios({ nomeOdu: resultado.odu.nome, descricao: resultado.odu.descricao });
                  }
                }}
                style={estilos.compartilharBotao}
              >
                <Ionicons name="share-social-outline" size={18} color={Cores.textoClaro} />
                <Text style={estilos.compartilharTexto}>Compartilhar</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Button
                  variante="primary"
                  label="Novo Jogo"
                  icone="refresh-outline"
                  posicaoIcone="left"
                  larguraTotal
                  onPress={() => router.replace('/consulta/buzios-preparo')}
                />
              </View>
            </View>
            <View style={{ height: Espacamento.sm }} />
            <Button
              variante="outline"
              label="Voltar ao Início"
              larguraTotal
              onPress={() => router.dismissTo('/(tabs)')}
            />
          </View>

          <View style={{ height: Espacamento.xxl }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Espacamento.lg },
  erroContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  erroTexto: { fontFamily: Fontes.corpo, fontSize: 16, color: Cores.textoClaro, marginBottom: Espacamento.md },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Espacamento.sm,
    paddingBottom: Espacamento.md,
  },
  voltarBotao: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1, borderColor: Cores.cardBorda,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitulo: {
    fontFamily: Fontes.titulo, fontSize: 22, fontWeight: '700', color: Cores.textoClaro,
  },

  formatosContainer: { marginBottom: Espacamento.lg },
  formatosTitulo: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario, marginBottom: Espacamento.sm },
  formatosGrid: { flexDirection: 'row', gap: Espacamento.sm },
  formatoItem: {
    flex: 1, alignItems: 'center', paddingVertical: Espacamento.sm,
    borderRadius: RaioBorda.md, backgroundColor: Cores.cardFundo,
    borderWidth: 1, borderColor: Cores.cardBorda,
  },
  formatoAtivo: { borderColor: Cores.acento, backgroundColor: 'rgba(212, 175, 55, 0.08)' },
  formatoDesabilitado: { opacity: 0.5 },
  formatoTexto: { fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario, marginTop: 4 },

  oduCard: {
    borderRadius: RaioBorda.xl,
    padding: Espacamento.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 240, 232, 0.06)',
    marginBottom: Espacamento.lg,
  },
  oduHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Espacamento.md,
  },
  oduNomeYoruba: {
    fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  oduNome: {
    fontFamily: Fontes.titulo, fontSize: 28, fontWeight: '700', marginTop: 2,
  },
  energiaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RaioBorda.full, borderWidth: 1,
  },
  energiaPonto: { width: 8, height: 8, borderRadius: 4 },
  energiaTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 11 },

  statsContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(245, 240, 232, 0.04)',
    borderRadius: RaioBorda.lg, padding: Espacamento.md,
    marginBottom: Espacamento.lg,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNum: { fontFamily: Fontes.corpoNegrito, fontSize: 14, color: Cores.textoClaro, marginTop: 4 },
  statLabel: { fontFamily: Fontes.corpo, fontSize: 10, color: Cores.textoSecundario, marginTop: 2 },
  statDivisor: { width: 1, height: 30, backgroundColor: 'rgba(245, 240, 232, 0.08)' },

  secao: { marginBottom: Espacamento.md },
  secaoLabel: {
    fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.acento,
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  secaoTexto: {
    fontFamily: Fontes.corpo, fontSize: 15, color: Cores.textoClaro,
    lineHeight: 23, opacity: 0.9,
  },

  buziosVisualContainer: {
    backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg, padding: Espacamento.md, marginBottom: Espacamento.lg,
  },
  buziosVisualTitulo: {
    fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.textoClaro,
    marginBottom: Espacamento.sm, textAlign: 'center',
  },
  buziosGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
  },
  buzioMini: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  buzioMiniAberto: { backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: Cores.acento },
  buzioMiniFechado: { backgroundColor: '#3D2B1F', borderWidth: 1, borderColor: '#5C4033' },
  buzioMiniTexto: { fontSize: 14 },

  acoesContainer: { paddingVertical: Espacamento.md },
  acoesLinha: {
    flexDirection: 'row',
    gap: Espacamento.sm,
    alignItems: 'stretch',
  },
  compartilharBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Espacamento.md,
    borderRadius: RaioBorda.lg,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  compartilharTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.textoClaro,
  },

  iaContainer: { marginBottom: Espacamento.lg },
  iaBotaoCard: {
    flexDirection: 'row', alignItems: 'center', gap: Espacamento.md,
    borderRadius: RaioBorda.xl, padding: Espacamento.md,
    borderWidth: 1, borderColor: 'rgba(124,154,130,0.25)',
  },
  iaIconeCirculo: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(124,154,130,0.12)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iaTextoArea: { flex: 1 },
  iaTitulo: { fontFamily: Fontes.corpoNegrito, fontSize: 15, color: Cores.textoClaro, marginBottom: 2 },
  iaSubtitulo: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario, lineHeight: 17 },
  iaCarregando: {
    flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm,
    borderRadius: RaioBorda.xl, padding: Espacamento.md,
    borderWidth: 1, borderColor: 'rgba(124,154,130,0.12)',
  },
  iaCarregandoTexto: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario },
  iaErro: { flexDirection: 'row', alignItems: 'center', gap: Espacamento.xs, padding: Espacamento.sm },
  iaErroTexto: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario },
  iaResultado: {
    borderRadius: RaioBorda.xl, padding: Espacamento.lg,
    borderWidth: 1, borderColor: 'rgba(124,154,130,0.2)',
  },
  iaResultadoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Espacamento.sm },
  iaResultadoLabel: { fontFamily: Fontes.corpoSemibold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  iaResultadoTitulo: {
    fontFamily: Fontes.titulo, fontSize: 20, fontWeight: '700',
    color: Cores.textoClaro, marginBottom: Espacamento.sm,
  },
  iaResultadoNarrativa: {
    fontFamily: Fontes.corpo, fontSize: 15, color: Cores.textoClaro,
    lineHeight: 24, opacity: 0.9, marginBottom: Espacamento.lg, fontStyle: 'italic',
  },
  iaSecao: { marginBottom: Espacamento.md },
  iaSecaoLabel: { fontFamily: Fontes.corpoSemibold, fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  iaSecaoTexto: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoClaro, lineHeight: 22, opacity: 0.88 },
});
