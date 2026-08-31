import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import {
  HISTORICO_DEMO,
  ESTATISTICAS_DEMO,
  INSIGHTS_DEMO,
  ATIVIDADE_SEMANAL,
  nomeTipo,
  corTipo,
  iconeTipo,
  type LeituraHistorico,
} from '../../data/jornada';

type FiltroTipo = 'todos' | 'tarot' | 'buzios' | 'numerologia' | 'mapa_astral' | 'cafe' | 'quiromancia';

export default function TelaJornada() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [filtro, setFiltro] = useState<FiltroTipo>('todos');
  const [favoritos, setFavoritos] = useState<Set<string>>(
    new Set(HISTORICO_DEMO.filter(l => l.favorita).map(l => l.id))
  );

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const historicoFiltrado = filtro === 'todos'
    ? HISTORICO_DEMO
    : HISTORICO_DEMO.filter(l => l.tipo === filtro);

  const toggleFavorito = (id: string) => {
    Hapticos.impactoLeve();
    setFavoritos(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  };

  const stats = ESTATISTICAS_DEMO;
  const progressoXP = (stats.xp / stats.xpProximoNivel) * 100;

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea} edges={['top']}>
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          <ScrollView
            contentContainerStyle={estilos.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={estilos.header}>
              <Text style={estilos.titulo}>Jornada Espiritual</Text>
              <Text style={estilos.subtitulo}>Sua evolução e histórico</Text>
            </View>

            {/* Nível & XP */}
            <View style={estilos.secao}>
              <LinearGradient
                colors={['rgba(212, 175, 55, 0.12)', 'rgba(75, 0, 130, 0.12)'] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={estilos.nivelCard}
              >
                <View style={estilos.nivelTop}>
                  <View style={estilos.nivelIcone}>
                    <MaterialCommunityIcons name="shield-star" size={28} color={Cores.acento} />
                  </View>
                  <View style={estilos.nivelInfo}>
                    <Text style={estilos.nivelNome}>{stats.nivel}</Text>
                    <Text style={estilos.nivelXP}>{stats.xp} / {stats.xpProximoNivel} XP</Text>
                  </View>
                  <View style={estilos.streakBadge}>
                    <Text style={estilos.streakEmoji}>🔥</Text>
                    <Text style={estilos.streakNumero}>{stats.diasConsecutivos}</Text>
                  </View>
                </View>
                <View style={estilos.xpBarra}>
                  <View style={[estilos.xpPreenchido, { width: `${progressoXP}%` }]} />
                </View>
                <Text style={estilos.xpTexto}>
                  Faltam {stats.xpProximoNivel - stats.xp} XP para o próximo nível
                </Text>
              </LinearGradient>
            </View>

            {/* Estatísticas rápidas */}
            <View style={estilos.secao}>
              <View style={estilos.statsGrid}>
                <StatCard valor={stats.totalLeituras.toString()} label="Total Leituras" icone="book-outline" cor="#9B59B6" />
                <StatCard valor={stats.diasConsecutivos.toString()} label="Dias Seguidos" icone="flame-outline" cor="#E67E22" />
                <StatCard valor={stats.leiturasSemana.toString()} label="Esta Semana" icone="calendar-outline" cor="#3498DB" />
                <StatCard valor={stats.oracularMaisUsado} label="Mais Usado" icone="star-outline" cor="#D4AF37" />
              </View>
            </View>

            {/* Gráfico de Atividade Semanal */}
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo}>📊 Atividade Semanal</Text>
              <View style={estilos.graficoContainer}>
                {ATIVIDADE_SEMANAL.map((item) => {
                  const alturaMax = 80;
                  const maxLeituras = Math.max(...ATIVIDADE_SEMANAL.map(a => a.leituras), 1);
                  const altura = (item.leituras / maxLeituras) * alturaMax;
                  return (
                    <View key={item.dia} style={estilos.graficoBarra}>
                      <View style={estilos.barraContainer}>
                        <LinearGradient
                          colors={item.leituras > 0 ? Cores.gradienteAcento : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)'] as const}
                          style={[estilos.barra, { height: Math.max(altura, 4) }]}
                        />
                      </View>
                      <Text style={estilos.barraLabel}>{item.dia}</Text>
                      <Text style={estilos.barraValor}>{item.leituras}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Insights */}
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo}>💡 Insights da Semana</Text>
              {INSIGHTS_DEMO.map((insight, i) => (
                <View key={i} style={estilos.insightCard}>
                  <View style={estilos.insightIcone}>
                    <Ionicons name={insight.icone as any} size={20} color={Cores.acento} />
                  </View>
                  <View style={estilos.insightInfo}>
                    <Text style={estilos.insightTitulo}>{insight.titulo}</Text>
                    <Text style={estilos.insightDescricao}>{insight.descricao}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Filtros Histórico */}
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo}>📜 Histórico de Leituras</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={estilos.filtrosRow}
              >
                {(['todos', 'tarot', 'buzios', 'numerologia', 'mapa_astral', 'cafe', 'quiromancia'] as FiltroTipo[]).map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => { Hapticos.selecao(); setFiltro(f); }}
                    style={[estilos.filtroChip, filtro === f && estilos.filtroChipAtivo]}
                  >
                    <Text style={[
                      estilos.filtroTexto,
                      filtro === f && estilos.filtroTextoAtivo,
                    ]}>
                      {f === 'todos' ? 'Todos' : nomeTipo(f)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Lista de Leituras */}
            <View style={estilos.secaoLeituras}>
              {historicoFiltrado.length === 0 ? (
                <View style={estilos.vazioContainer}>
                  <Ionicons name="search-outline" size={32} color={Cores.textoSecundario} />
                  <Text style={estilos.vazioTexto}>Nenhuma leitura com este filtro</Text>
                </View>
              ) : (
                historicoFiltrado.map((leitura, index) => (
                  <CardLeitura
                    key={leitura.id}
                    leitura={leitura}
                    favorita={favoritos.has(leitura.id)}
                    onToggleFavorito={() => toggleFavorito(leitura.id)}
                    index={index}
                  />
                ))
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </GradientBackground>
  );
}

/* ---- Stat Card ---- */
function StatCard({ valor, label, icone, cor }: { valor: string; label: string; icone: string; cor: string }) {
  return (
    <View style={estilos.statCard}>
      <View style={[estilos.statIcone, { backgroundColor: cor + '18' }]}>
        <Ionicons name={icone as any} size={18} color={cor} />
      </View>
      <Text style={estilos.statValor}>{valor}</Text>
      <Text style={estilos.statLabel}>{label}</Text>
    </View>
  );
}

/* ---- Card Leitura ---- */
function CardLeitura({
  leitura, favorita, onToggleFavorito, index,
}: {
  leitura: LeituraHistorico;
  favorita: boolean;
  onToggleFavorito: () => void;
  index: number;
}) {
  const cor = corTipo(leitura.tipo);
  const icone = iconeTipo(leitura.tipo);
  const iconeLib = leitura.tipo === 'buzios' ? 'material' : 'ionicons';
  const IconComp = iconeLib === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <View style={estilos.leituraCard}>
      {/* Timeline dot */}
      <View style={estilos.timelineContainer}>
        <View style={[estilos.timelinePonto, { backgroundColor: cor }]} />
        {index < HISTORICO_DEMO.length - 1 && <View style={estilos.timelineLinha} />}
      </View>

      <View style={estilos.leituraConteudo}>
        <LinearGradient
          colors={[cor + '12', 'rgba(255,252,246,0.94)'] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={estilos.leituraGradiente}
        >
          <View style={estilos.leituraTop}>
            <View style={[estilos.leituraIcone, { backgroundColor: cor + '20' }]}>
              <IconComp name={icone as any} size={18} color={cor} />
            </View>
            <View style={estilos.leituraTopInfo}>
              <Text style={estilos.leituraTipo}>{nomeTipo(leitura.tipo)}</Text>
              <Text style={estilos.leituraData}>{leitura.data} às {leitura.hora}</Text>
            </View>
            <Pressable onPress={onToggleFavorito} hitSlop={8}>
              <Ionicons
                name={favorita ? 'heart' : 'heart-outline'}
                size={20}
                color={favorita ? '#E74C3C' : Cores.textoSecundario}
              />
            </Pressable>
          </View>

          <Text style={estilos.leituraTitulo}>{leitura.titulo}</Text>
          <Text style={estilos.leituraResumo} numberOfLines={2}>{leitura.resumo}</Text>

          <View style={estilos.leituraFooter}>
            <View style={[estilos.destaqueBadge, { backgroundColor: cor + '18', borderColor: cor + '30' }]}>
              <Text style={[estilos.destaqueBadgeTexto, { color: cor }]}>{leitura.destaque}</Text>
            </View>
            <View style={estilos.formatoBadge}>
              <Ionicons
                name={leitura.formato === 'texto' ? 'document-text-outline' : leitura.formato === 'audio' ? 'headset-outline' : 'videocam-outline'}
                size={12}
                color={Cores.textoSecundario}
              />
              <Text style={estilos.formatoBadgeTexto}>
                {leitura.formato === 'texto' ? 'Texto' : leitura.formato === 'audio' ? 'Áudio' : 'Vídeo'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    paddingHorizontal: Espacamento.md,
    paddingTop: Espacamento.md,
    paddingBottom: Espacamento.sm,
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 28,
    color: Cores.textoClaro,
  },
  subtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  secao: {
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.md,
  },
  secaoTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 18,
    color: Cores.textoClaro,
    marginBottom: Espacamento.sm,
  },
  secaoLeituras: {
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.xs,
    paddingBottom: Espacamento.lg,
  },
  // Nível Card
  nivelCard: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
  },
  nivelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Espacamento.sm,
  },
  nivelIcone: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  nivelInfo: { flex: 1 },
  nivelNome: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 16,
    color: Cores.textoClaro,
  },
  nivelXP: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(230, 126, 34, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RaioBorda.full,
  },
  streakEmoji: { fontSize: 16 },
  streakNumero: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 16,
    color: '#E67E22',
  },
  xpBarra: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpPreenchido: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Cores.acento,
  },
  xpTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Espacamento.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    alignItems: 'center',
  },
  statIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Espacamento.xs,
  },
  statValor: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 20,
    color: Cores.textoClaro,
  },
  statLabel: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginTop: 2,
  },
  // Gráfico
  graficoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    height: 140,
  },
  graficoBarra: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barraContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '60%',
    maxWidth: 28,
  },
  barra: {
    borderRadius: 4,
    width: '100%',
  },
  barraLabel: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    marginTop: 6,
  },
  barraValor: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 11,
    color: Cores.acento,
    marginTop: 2,
  },
  // Insights
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
    gap: Espacamento.sm,
  },
  insightIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightInfo: { flex: 1 },
  insightTitulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.textoClaro,
    marginBottom: 2,
  },
  insightDescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    lineHeight: 18,
  },
  // Filtros
  filtrosRow: {
    gap: 8,
    paddingRight: Espacamento.md,
  },
  filtroChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RaioBorda.full,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  filtroChipAtivo: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: Cores.acento,
  },
  filtroTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  filtroTextoAtivo: {
    color: Cores.acento,
    fontFamily: Fontes.corpoSemibold,
  },
  // Card Leitura (Timeline)
  leituraCard: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineContainer: {
    width: 28,
    alignItems: 'center',
  },
  timelinePonto: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 14,
  },
  timelineLinha: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 4,
  },
  leituraConteudo: {
    flex: 1,
    marginBottom: Espacamento.sm,
  },
  leituraGradiente: {
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
  },
  leituraTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Espacamento.sm,
  },
  leituraIcone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  leituraTopInfo: { flex: 1 },
  leituraTipo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.textoClaro,
  },
  leituraData: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
  },
  leituraTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.textoClaro,
    marginBottom: 4,
  },
  leituraResumo: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    lineHeight: 19,
    marginBottom: Espacamento.sm,
  },
  leituraFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destaqueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RaioBorda.full,
    borderWidth: 1,
  },
  destaqueBadgeTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 11,
  },
  formatoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  formatoBadgeTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
  },
  // Vazio
  vazioContainer: {
    alignItems: 'center',
    paddingVertical: Espacamento.xl,
    gap: Espacamento.sm,
  },
  vazioTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
  },
});
