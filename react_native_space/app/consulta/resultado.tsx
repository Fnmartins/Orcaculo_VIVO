import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Button } from '../../components/Button';
import { EstadoTela } from '../../components/EstadoTela';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import type { CartaTarot } from '../../data/tarot';
import { gerarInterpretacaoTarot, IA_REMOTA_DISPONIVEL, type InterpretacaoTarot } from '../../services/ia';
import { compartilharTarot } from '../../services/compartilhar';
import { RatingConsulta } from '../../components/RatingConsulta';
import { ConviteHistorico } from '../../components/ConviteHistorico';
import { CartaTarotVisual } from '../../components/CartaTarotVisual';
import { NotaReflexiva } from '../../components/NotaReflexiva';

const POSICOES = ['Passado', 'Presente', 'Futuro'];

const FORMATOS_ENTREGA = [
  { id: 'texto', icone: 'document-text-outline', titulo: 'Texto', disponivel: true },
  { id: 'audio', icone: 'headset-outline', titulo: 'Áudio', disponivel: false },
  { id: 'video', icone: 'videocam-outline', titulo: 'Vídeo', disponivel: false },
  { id: 'pdf', icone: 'download-outline', titulo: 'PDF', disponivel: false },
];

export default function TelaResultado() {
  const { cartas: cartasParam = '[]' } = useLocalSearchParams<{ cartas?: string }>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [interpretacaoIA, setInterpretacaoIA] = useState<InterpretacaoTarot | null>(null);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [erroIA, setErroIA] = useState(false);

  let cartas: CartaTarot[] = [];
  try {
    cartas = JSON.parse(cartasParam);
  } catch {
    cartas = [];
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  async function aprofundarComIA() {
    if (carregandoIA || interpretacaoIA) return;
    setCarregandoIA(true);
    setErroIA(false);
    try {
      const resultado = await gerarInterpretacaoTarot(
        cartas.map((c, i) => ({
          nome: c.nomeCompleto,
          posicao: POSICOES[i] ?? `Carta ${i + 1}`,
          significado: c.significado,
        }))
      );
      setInterpretacaoIA(resultado);
    } catch {
      setErroIA(true);
    } finally {
      setCarregandoIA(false);
    }
  }

  if (cartas.length === 0) {
    return (
      <GradientBackground>
        <SafeAreaView style={estilos.safeArea}>
          <EstadoTela
            tipo="erro"
            titulo="As cartas não carregaram"
            descricao="A leitura não foi perdida. Volte ao jogo para abrir as cartas novamente."
            acaoLabel="Voltar ao jogo"
            onAcao={() => router.back()}
          />
        </SafeAreaView>
      </GradientBackground>
    );
  }

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
              accessibilityRole="button"
              accessibilityLabel="Fechar leitura"
            >
              <Ionicons name="close" size={22} color={Cores.textoClaro} />
            </Pressable>
            <Text style={estilos.headerTitulo}>Sua Leitura</Text>
            <View style={{ width: 44 }} />
          </Animated.View>

          {/* Banner de formatos */}
          <Animated.View style={[estilos.formatosContainer, { opacity: fadeAnim }]}>
            <Text style={estilos.formatosTitulo}>Formato da leitura</Text>
            <View style={estilos.formatosGrid}>
              {FORMATOS_ENTREGA.map((formato) => (
                <View
                  key={formato.id}
                  accessible
                  accessibilityLabel={`${formato.titulo}${formato.disponivel ? ', selecionado' : ', em breve'}`}
                  accessibilityState={{ disabled: !formato.disponivel, selected: formato.id === 'texto' }}
                  style={[
                    estilos.formatoItem,
                    formato.id === 'texto' && estilos.formatoItemAtivo,
                    !formato.disponivel && estilos.formatoItemDesabilitado,
                  ]}
                >
                  <Ionicons
                    name={formato.icone as any}
                    size={20}
                    color={formato.id === 'texto' ? Cores.acento : Cores.textoSecundario}
                  />
                  <Text style={[
                    estilos.formatoTexto,
                    formato.id === 'texto' && estilos.formatoTextoAtivo,
                  ]}>
                    {formato.titulo}
                  </Text>
                  {!formato.disponivel && formato.id !== 'texto' && (
                    <View style={estilos.emBreveBadge}>
                      <Text style={estilos.emBreveBadgeTexto}>Breve</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Cartas detalhadas */}
          {cartas.map((carta, index) => (
            <Animated.View
              key={carta.id}
              style={[estilos.cartaDetalhada, {
                opacity: fadeAnim,
                transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + index * 0.2)) }],
              }]}
            >
              <LinearGradient
                colors={[carta.cor + '15', 'rgba(255,252,246,0.94)'] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={estilos.cartaGradiente}
              >
                {/* Posição + carta */}
                <View style={estilos.cartaHeader}>
                  <View style={estilos.posicaoBadge}>
                    <Text style={estilos.posicaoTexto}>{POSICOES[index]}</Text>
                  </View>
                  <CartaTarotVisual icone={carta.icone} cor={carta.cor} largura={68} />
                </View>

                {/* Nome da carta */}
                <Text style={[estilos.cartaNome, { color: carta.cor }]}>
                  {carta.nomeCompleto}
                </Text>

                {/* Significado */}
                <View style={estilos.secaoCarta}>
                  <Text style={estilos.secaoLabel}>Significado</Text>
                  <Text style={estilos.secaoTexto}>{carta.significado}</Text>
                </View>

                {/* Conselho */}
                <View style={estilos.secaoCarta}>
                  <Text style={estilos.secaoLabel}>💡 Conselho</Text>
                  <Text style={estilos.secaoTexto}>{carta.conselho}</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          ))}

          {/* Síntese */}
          <Animated.View style={[estilos.sinteseContainer, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.12)', 'rgba(75, 0, 130, 0.08)'] as const}
              style={estilos.sinteseGradiente}
            >
              <Text style={estilos.sinteseTitulo}>✨ Síntese da Leitura</Text>
              <Text style={estilos.sinteseTexto}>
                {`${cartas[0]?.nomeCompleto ?? 'A carta do passado'} convida a olhar para experiências que influenciam sua jornada. No presente, ${cartas[1]?.nomeCompleto ?? 'a carta central'} ajuda a refletir sobre desafios e oportunidades deste momento. Na posição de futuro, ${cartas[2]?.nomeCompleto ?? 'a transformação'} sugere uma possibilidade a considerar, que pode mudar conforme suas escolhas. Use esta leitura como apoio para agir com mais consciência.`}
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Bloco IA — Interpretação Aprofundada */}
          {IA_REMOTA_DISPONIVEL && (
            <Animated.View style={[estilos.iaContainer, { opacity: fadeAnim }]}> 
            {!interpretacaoIA && !carregandoIA && (
              <Pressable
                onPress={() => { Hapticos.impactoMedio(); aprofundarComIA(); }}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              >
                <LinearGradient
                  colors={['rgba(181,139,70,0.12)', 'rgba(110,131,144,0.10)'] as const}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={estilos.iaBotaoCard}
                >
                  <View style={estilos.iaIconeCirculo}>
                    <Ionicons name="sparkles-outline" size={24} color={Cores.acento} />
                  </View>
                  <View style={estilos.iaTextoArea}>
                    <Text style={estilos.iaTitulo}>Aprofundar com IA ✨</Text>
                    <Text style={estilos.iaSubtitulo}>
                      Gerar interpretação personalizada conectando as 3 cartas
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Cores.acento} />
                </LinearGradient>
              </Pressable>
            )}

            {carregandoIA && (
              <LinearGradient
                colors={['rgba(181,139,70,0.08)', 'rgba(110,131,144,0.06)'] as const}
                style={estilos.iaCarregando}
                accessibilityRole="progressbar"
                accessibilityLabel="Gerando interpretação aprofundada"
              >
                <ActivityIndicator color={Cores.acento} />
                <Text style={estilos.iaCarregandoTexto}>IA gerando sua interpretação...</Text>
              </LinearGradient>
            )}

            {erroIA && !carregandoIA && (
              <Pressable
                onPress={aprofundarComIA}
                accessibilityRole="button"
                accessibilityLabel="Tentar gerar a interpretação novamente"
              >
                <View style={estilos.iaErro}>
                  <Ionicons name="refresh-outline" size={16} color={Cores.textoSecundario} />
                  <Text style={estilos.iaErroTexto}>Falha ao conectar. Tocar para tentar novamente.</Text>
                </View>
              </Pressable>
            )}

            {interpretacaoIA && (
              <LinearGradient
                colors={['rgba(181,139,70,0.10)', 'rgba(110,131,144,0.08)'] as const}
                style={estilos.iaResultado}
              >
                <View style={estilos.iaResultadoHeader}>
                  <Ionicons name="sparkles" size={16} color={Cores.acento} />
                  <Text style={estilos.iaResultadoLabel}>Interpretação por IA</Text>
                </View>
                <Text style={estilos.iaResultadoTitulo}>{interpretacaoIA.titulo}</Text>
                <Text style={estilos.iaResultadoNarrativa}>{interpretacaoIA.narrativa}</Text>

                {[
                  { label: 'Passado', texto: interpretacaoIA.passado },
                  { label: 'Presente', texto: interpretacaoIA.presente },
                  { label: 'Futuro', texto: interpretacaoIA.futuro },
                  { label: '💡 Conselho da IA', texto: interpretacaoIA.conselho },
                ].map((item) => (
                  <View key={item.label} style={estilos.iaSecao}>
                    <Text style={estilos.iaSecaoLabel}>{item.label}</Text>
                    <Text style={estilos.iaSecaoTexto}>{item.texto}</Text>
                  </View>
                ))}
              </LinearGradient>
            )}
            </Animated.View>
          )}

          <NotaReflexiva />

          {/* Rating */}
          <RatingConsulta />

          <ConviteHistorico
            consulta={{
              tipo: 'tarot',
              resultado: { cartas },
              resumo: cartas.map((carta) => carta.nomeCompleto).join(' · '),
            }}
          />

          {/* Ações */}
          <View style={estilos.acoesContainer}>
            <View style={estilos.acoesLinha}>
              <Pressable
                onPress={() => { Hapticos.impactoLeve(); compartilharTarot({ cartas }); }}
                style={estilos.compartilharBotao}
              >
                <Ionicons name="share-social-outline" size={18} color={Cores.textoClaro} />
                <Text style={estilos.compartilharTexto}>Compartilhar</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Button
                  variante="primary"
                  label="Nova Consulta"
                  icone="refresh-outline"
                  posicaoIcone="left"
                  larguraTotal
                  onPress={() => router.replace('/consulta/preparo')}
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Espacamento.sm,
    paddingBottom: Espacamento.md,
  },
  voltarBotao: {
    width: 44,
    height: 44,
    borderRadius: 20,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    fontWeight: '700',
    color: Cores.textoClaro,
  },

  // Formatos
  formatosContainer: {
    marginBottom: Espacamento.lg,
  },
  formatosTitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginBottom: Espacamento.sm,
  },
  formatosGrid: {
    flexDirection: 'row',
    gap: Espacamento.sm,
  },
  formatoItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Espacamento.sm,
    paddingHorizontal: Espacamento.xs,
    borderRadius: RaioBorda.md,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  formatoItemAtivo: {
    borderColor: Cores.acento,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
  formatoItemDesabilitado: {
    opacity: 0.6,
  },
  formatoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    marginTop: 4,
  },
  formatoTextoAtivo: {
    color: Cores.acento,
  },
  emBreveBadge: {
    backgroundColor: 'rgba(88, 117, 101, 0.10)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RaioBorda.full,
    marginTop: 4,
  },
  emBreveBadgeTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 8,
    color: Cores.textoSecundario,
  },

  // Carta detalhada
  cartaDetalhada: {
    marginBottom: Espacamento.md,
  },
  cartaGradiente: {
    borderRadius: RaioBorda.xl,
    padding: Espacamento.lg,
    borderWidth: 1,
    borderColor: 'rgba(88, 117, 101, 0.12)',
  },
  cartaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Espacamento.md,
  },
  posicaoBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RaioBorda.full,
  },
  posicaoTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
    color: Cores.acento,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cartaIconeCirculo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartaNome: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Espacamento.md,
  },
  secaoCarta: {
    marginBottom: Espacamento.md,
  },
  secaoLabel: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.acento,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoClaro,
    lineHeight: 23,
    opacity: 0.9,
  },

  // Síntese
  sinteseContainer: {
    marginBottom: Espacamento.lg,
  },
  sinteseGradiente: {
    borderRadius: RaioBorda.xl,
    padding: Espacamento.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
  },
  sinteseTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginBottom: Espacamento.sm,
  },
  sinteseTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoClaro,
    lineHeight: 23,
    opacity: 0.85,
  },

  // Ações
  acoesContainer: {
    paddingVertical: Espacamento.md,
  },
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

  // IA
  iaContainer: {
    marginBottom: Espacamento.lg,
  },
  iaBotaoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.md,
    borderRadius: RaioBorda.xl,
    padding: Espacamento.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  iaIconeCirculo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iaTextoArea: { flex: 1 },
  iaTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.textoClaro,
    marginBottom: 2,
  },
  iaSubtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    lineHeight: 17,
  },
  iaCarregando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
    borderRadius: RaioBorda.xl,
    padding: Espacamento.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.12)',
  },
  iaCarregandoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  iaErro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.xs,
    padding: Espacamento.sm,
  },
  iaErroTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
  iaResultado: {
    borderRadius: RaioBorda.xl,
    padding: Espacamento.lg,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
  },
  iaResultadoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Espacamento.sm,
  },
  iaResultadoLabel: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 11,
    color: Cores.acento,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  iaResultadoTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginBottom: Espacamento.sm,
  },
  iaResultadoNarrativa: {
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoClaro,
    lineHeight: 24,
    opacity: 0.9,
    marginBottom: Espacamento.lg,
    fontStyle: 'italic',
  },
  iaSecao: {
    marginBottom: Espacamento.md,
  },
  iaSecaoLabel: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
    color: Cores.acento,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  iaSecaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoClaro,
    lineHeight: 22,
    opacity: 0.88,
  },
});
