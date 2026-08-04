import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  FlatList,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import {
  ORACULISTAS,
  CONSULTAS_DEMO,
  gerarHorarios,
  type Oraculista,
  type HorarioDisponivel,
  type ConsultaAgendada,
} from '../../data/consultas';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseServico, type Consulta } from '../../services/database';

type Aba = 'oraculistas' | 'agendadas' | 'historico';
type FormatoConsulta = 'video' | 'chat' | 'audio';
type FiltroHistorico = 'todos' | 'tarot' | 'buzios' | 'cafe' | 'quiromancia' | 'numerologia' | 'mapa_astral' | 'matriz_destino' | 'lei_atracao';

const ICONES_TIPO: Record<string, { icone: string; lib: 'ionicons' | 'material'; cor: string; label: string }> = {
  tarot:          { icone: 'cards-outline',         lib: 'material', cor: '#9B59B6', label: 'Tarot' },
  buzios:         { icone: 'grain',                 lib: 'material', cor: '#7C9A82', label: 'Búzios' },
  cafe:           { icone: 'cafe-outline',           lib: 'ionicons', cor: '#C2853A', label: 'Borra de Café' },
  quiromancia:    { icone: 'hand-left-outline',      lib: 'ionicons', cor: '#E74C3C', label: 'Quiromância' },
  numerologia:    { icone: 'calculator-outline',     lib: 'ionicons', cor: '#3498DB', label: 'Numerologia' },
  mapa_astral:    { icone: 'planet-outline',         lib: 'ionicons', cor: '#E67E22', label: 'Mapa Astral' },
  matriz_destino: { icone: 'star-david',             lib: 'material', cor: '#B565A7', label: 'Matriz do Destino' },
  lei_atracao:    { icone: 'star-four-points',       lib: 'material', cor: '#EC4899', label: 'Lei da Atração' },
};

export default function TelaConsultas() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [abaAtiva, setAbaAtiva] = useState<Aba>('oraculistas');
  const [consultas, setConsultas] = useState<ConsultaAgendada[]>(CONSULTAS_DEMO);
  const { perfil, logado } = useAuth();

  // Histórico
  const [historico, setHistorico] = useState<Consulta[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [atualizandoHistorico, setAtualizandoHistorico] = useState(false);
  const [filtroHistorico, setFiltroHistorico] = useState<FiltroHistorico>('todos');

  // Modal de agendamento
  const [modalVisivel, setModalVisivel] = useState(false);
  const [oraculistaSelecionado, setOraculistaSelecionado] = useState<Oraculista | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);
  const [formatoSelecionado, setFormatoSelecionado] = useState<FormatoConsulta>('video');
  const [etapaModal, setEtapaModal] = useState<'data' | 'horario' | 'confirmar'>('data');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const carregarHistorico = useCallback(async (silencioso = false) => {
    if (!logado || !perfil?.id) return;
    if (!silencioso) setCarregandoHistorico(true);
    else setAtualizandoHistorico(true);
    try {
      const dados = await DatabaseServico.listarConsultas(perfil.id, 30);
      setHistorico(dados);
    } catch (erro) {
      console.error('[Histórico]', erro);
    } finally {
      setCarregandoHistorico(false);
      setAtualizandoHistorico(false);
    }
  }, [logado, perfil?.id]);

  useEffect(() => {
    if (abaAtiva === 'historico') carregarHistorico();
  }, [abaAtiva, carregarHistorico]);

  async function alternarFavorito(consulta: Consulta) {
    Hapticos.impactoLeve();
    try {
      await DatabaseServico.alternarFavorito(consulta.id, !consulta.favorita);
      setHistorico(prev => prev.map(c => c.id === consulta.id ? { ...c, favorita: !c.favorita } : c));
    } catch { /* silencioso */ }
  }

  const historicoFiltrado = filtroHistorico === 'todos'
    ? historico
    : historico.filter(c => c.tipo === filtroHistorico);

  const abrirAgendamento = useCallback((orac: Oraculista) => {
    Hapticos.impactoLeve();
    setOraculistaSelecionado(orac);
    setDataSelecionada(new Date());
    setHorarioSelecionado(null);
    setFormatoSelecionado('video');
    setEtapaModal('data');
    setModalVisivel(true);
  }, []);

  const confirmarAgendamento = useCallback(() => {
    if (!oraculistaSelecionado || !horarioSelecionado) return;
    Hapticos.impactoMedio();
    const nova: ConsultaAgendada = {
      id: `c${Date.now()}`,
      oraculista: oraculistaSelecionado,
      data: `${dataSelecionada.getDate().toString().padStart(2, '0')}/${(dataSelecionada.getMonth() + 1).toString().padStart(2, '0')}/${dataSelecionada.getFullYear()}`,
      hora: horarioSelecionado,
      tipo: oraculistaSelecionado.especialidades[0],
      status: 'agendada',
      formato: formatoSelecionado,
    };
    setConsultas(prev => [nova, ...prev]);
    setModalVisivel(false);
    Alert.alert(
      'Consulta Agendada! ✨',
      `Sua consulta com ${oraculistaSelecionado.nome} está marcada para ${nova.data} às ${nova.hora}.`,
      [{ text: 'OK' }]
    );
  }, [oraculistaSelecionado, horarioSelecionado, dataSelecionada, formatoSelecionado]);

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea} edges={['top']}>
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={estilos.header}>
            <Text style={estilos.titulo}>Consultas</Text>
            <Text style={estilos.subtitulo}>Agende uma leitura ao vivo</Text>
          </View>

          {/* Abas */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={estilos.abasScroll}
            contentContainerStyle={estilos.abasContainer}
          >
            <Pressable
              onPress={() => { Hapticos.selecao(); setAbaAtiva('oraculistas'); }}
              style={[estilos.aba, abaAtiva === 'oraculistas' && estilos.abaAtiva]}
            >
              <Ionicons name="people-outline" size={15} color={abaAtiva === 'oraculistas' ? Cores.acento : Cores.textoSecundario} />
              <Text style={[estilos.abaTexto, abaAtiva === 'oraculistas' && estilos.abaTextoAtivo]}>Oraculistas</Text>
            </Pressable>
            <Pressable
              onPress={() => { Hapticos.selecao(); setAbaAtiva('agendadas'); }}
              style={[estilos.aba, abaAtiva === 'agendadas' && estilos.abaAtiva]}
            >
              <Ionicons name="calendar-outline" size={15} color={abaAtiva === 'agendadas' ? Cores.acento : Cores.textoSecundario} />
              <Text style={[estilos.abaTexto, abaAtiva === 'agendadas' && estilos.abaTextoAtivo]}>Agendadas</Text>
              {consultas.filter(c => c.status === 'agendada').length > 0 && (
                <View style={estilos.badgeContador}>
                  <Text style={estilos.badgeContadorTexto}>{consultas.filter(c => c.status === 'agendada').length}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => { Hapticos.selecao(); setAbaAtiva('historico'); }}
              style={[estilos.aba, abaAtiva === 'historico' && estilos.abaAtiva]}
            >
              <Ionicons name="time-outline" size={15} color={abaAtiva === 'historico' ? Cores.acento : Cores.textoSecundario} />
              <Text style={[estilos.abaTexto, abaAtiva === 'historico' && estilos.abaTextoAtivo]}>Histórico</Text>
              {historico.length > 0 && (
                <View style={estilos.badgeContador}>
                  <Text style={estilos.badgeContadorTexto}>{historico.length}</Text>
                </View>
              )}
            </Pressable>
          </ScrollView>

          {/* Conteúdo */}
          {abaAtiva === 'oraculistas' && (
            <ScrollView contentContainerStyle={estilos.listaContent} showsVerticalScrollIndicator={false}>
              {ORACULISTAS.map((orac) => (
                <CardOraculista key={orac.id} oraculista={orac} onAgendar={() => abrirAgendamento(orac)} />
              ))}
            </ScrollView>
          )}

          {abaAtiva === 'agendadas' && (
            <ScrollView contentContainerStyle={estilos.listaContent} showsVerticalScrollIndicator={false}>
              {consultas.length === 0 ? (
                <View style={estilos.vazioContainer}>
                  <Ionicons name="calendar-outline" size={48} color={Cores.textoSecundario} />
                  <Text style={estilos.vazioTexto}>Nenhuma consulta agendada</Text>
                  <Pressable onPress={() => setAbaAtiva('oraculistas')}>
                    <Text style={estilos.vazioLink}>Agendar agora</Text>
                  </Pressable>
                </View>
              ) : (
                consultas.map((consulta) => (
                  <CardConsultaAgendada key={consulta.id} consulta={consulta} />
                ))
              )}
            </ScrollView>
          )}

          {abaAtiva === 'historico' && (
            <View style={{ flex: 1 }}>
              {/* Filtros */}
              {historico.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={estilos.filtrosContent}
                >
                  {(['todos', 'tarot', 'buzios', 'cafe', 'quiromancia', 'numerologia', 'mapa_astral', 'matriz_destino', 'lei_atracao'] as FiltroHistorico[]).map((f) => (
                    <Pressable
                      key={f}
                      onPress={() => { Hapticos.selecao(); setFiltroHistorico(f); }}
                      style={[estilos.filtroBadge, filtroHistorico === f && estilos.filtroBadgeAtivo]}
                    >
                      <Text style={[estilos.filtroTexto, filtroHistorico === f && estilos.filtroTextoAtivo]}>
                        {f === 'todos' ? 'Todos' : ICONES_TIPO[f]?.label ?? f}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {carregandoHistorico ? (
                <View style={estilos.vazioContainer}>
                  <ActivityIndicator color={Cores.acento} size="large" />
                  <Text style={estilos.vazioTexto}>Carregando histórico...</Text>
                </View>
              ) : !logado ? (
                <View style={estilos.vazioContainer}>
                  <Ionicons name="lock-closed-outline" size={48} color={Cores.textoSecundario} />
                  <Text style={estilos.vazioTexto}>Entre para ver seu histórico</Text>
                  <Text style={[estilos.vazioLink, { textAlign: 'center', maxWidth: 240 }]}>
                    Suas consultas ficam salvas para você revisitar quando quiser.
                  </Text>
                </View>
              ) : historicoFiltrado.length === 0 ? (
                <View style={estilos.vazioContainer}>
                  <Ionicons name="sparkles-outline" size={48} color={Cores.textoSecundario} />
                  <Text style={estilos.vazioTexto}>
                    {filtroHistorico === 'todos' ? 'Nenhuma consulta salva ainda' : `Nenhuma consulta de ${ICONES_TIPO[filtroHistorico]?.label ?? filtroHistorico}`}
                  </Text>
                  <Text style={[estilos.vazioTexto, { fontSize: 13 }]}>
                    Faça uma consulta e salve para aparecer aqui
                  </Text>
                </View>
              ) : (
                <ScrollView
                  contentContainerStyle={estilos.listaContent}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={atualizandoHistorico}
                      onRefresh={() => carregarHistorico(true)}
                      tintColor={Cores.acento}
                    />
                  }
                >
                  {historicoFiltrado.map((consulta) => (
                    <CardHistorico
                      key={consulta.id}
                      consulta={consulta}
                      onFavoritar={() => alternarFavorito(consulta)}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </Animated.View>

        {/* Modal de Agendamento */}
        <Modal
          visible={modalVisivel}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisivel(false)}
        >
          <View style={estilos.modalOverlay}>
            <View style={estilos.modalContainer}>
              <GradientBackground style={estilos.modalGradient}>
                {/* Header Modal */}
                <View style={estilos.modalHeader}>
                  <Pressable onPress={() => {
                    if (etapaModal === 'data') { setModalVisivel(false); }
                    else if (etapaModal === 'horario') { setEtapaModal('data'); }
                    else { setEtapaModal('horario'); }
                  }}>
                    <Ionicons
                      name={etapaModal === 'data' ? 'close' : 'arrow-back'}
                      size={22}
                      color={Cores.textoClaro}
                    />
                  </Pressable>
                  <Text style={estilos.modalTitulo}>
                    {etapaModal === 'data' ? 'Escolha a Data' : etapaModal === 'horario' ? 'Escolha o Horário' : 'Confirmar'}
                  </Text>
                  <View style={{ width: 22 }} />
                </View>

                {/* Oraculista resumo */}
                {oraculistaSelecionado && (
                  <View style={estilos.modalOraculista}>
                    <Text style={estilos.modalAvatar}>{oraculistaSelecionado.avatar}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.modalOraNome}>{oraculistaSelecionado.nome}</Text>
                      <Text style={estilos.modalOraTitulo}>{oraculistaSelecionado.titulo}</Text>
                    </View>
                  </View>
                )}

                <ScrollView
                  contentContainerStyle={estilos.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {etapaModal === 'data' && (
                    <SelecaoData
                      dataSelecionada={dataSelecionada}
                      onSelecionar={(d) => { setDataSelecionada(d); setHorarioSelecionado(null); }}
                      onProximo={() => setEtapaModal('horario')}
                    />
                  )}
                  {etapaModal === 'horario' && (
                    <SelecaoHorario
                      data={dataSelecionada}
                      horarioSelecionado={horarioSelecionado}
                      onSelecionar={setHorarioSelecionado}
                      formatoSelecionado={formatoSelecionado}
                      onSelecionarFormato={setFormatoSelecionado}
                      onProximo={() => setEtapaModal('confirmar')}
                    />
                  )}
                  {etapaModal === 'confirmar' && oraculistaSelecionado && (
                    <TelaConfirmacao
                      oraculista={oraculistaSelecionado}
                      data={dataSelecionada}
                      horario={horarioSelecionado ?? ''}
                      formato={formatoSelecionado}
                      onConfirmar={confirmarAgendamento}
                    />
                  )}
                </ScrollView>
              </GradientBackground>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

/* ==================== Card Histórico ==================== */
function CardHistorico({ consulta, onFavoritar }: { consulta: Consulta; onFavoritar: () => void }) {
  const meta = ICONES_TIPO[consulta.tipo] ?? { icone: 'sparkles-outline', lib: 'ionicons', cor: Cores.acento, label: consulta.tipo };
  const IconeComp = meta.lib === 'material' ? MaterialCommunityIcons : Ionicons;

  const dataCriacao = new Date(consulta.criado_em);
  const dataFormatada = dataCriacao.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const resumo = consulta.resumo
    ?? (consulta.resultado as any)?.titulo
    ?? (consulta.resultado as any)?.odu?.nome
    ?? 'Consulta realizada';

  return (
    <View style={estilos.cardHistorico}>
      <LinearGradient
        colors={[meta.cor + '18', 'rgba(26,26,46,0.5)'] as const}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={estilos.cardHistoricoGradiente}
      >
        {/* Linha superior */}
        <View style={estilos.cardHistoricoTop}>
          <View style={[estilos.cardHistoricoIcone, { backgroundColor: meta.cor + '22' }]}>
            <IconeComp name={meta.icone as any} size={22} color={meta.cor} />
          </View>
          <View style={estilos.cardHistoricoInfo}>
            <Text style={[estilos.cardHistoricoTipo, { color: meta.cor }]}>{meta.label}</Text>
            <Text style={estilos.cardHistoricoData}>{dataFormatada}</Text>
          </View>
          <Pressable onPress={onFavoritar} style={estilos.favoritoBotao}>
            <Ionicons
              name={consulta.favorita ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={consulta.favorita ? Cores.acento : Cores.textoSecundario}
            />
          </Pressable>
        </View>

        {/* Resumo */}
        <Text style={estilos.cardHistoricoResumo} numberOfLines={2}>{resumo}</Text>

        {/* Rodapé */}
        <View style={estilos.cardHistoricoRodape}>
          {consulta.pergunta ? (
            <View style={estilos.perguntaChip}>
              <Ionicons name="chatbubble-outline" size={11} color={Cores.textoSecundario} />
              <Text style={estilos.perguntaTexto} numberOfLines={1}>{consulta.pergunta}</Text>
            </View>
          ) : null}
          {consulta.favorita && (
            <View style={estilos.favoritoChip}>
              <Ionicons name="bookmark" size={10} color={Cores.acento} />
              <Text style={estilos.favoritoTexto}>Favorita</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

/* ==================== Card Oraculista ==================== */
function CardOraculista({ oraculista, onAgendar }: { oraculista: Oraculista; onAgendar: () => void }) {
  return (
    <View style={estilos.cardOra}>
      <LinearGradient
        colors={[oraculista.cor + '15', 'rgba(26,26,46,0.4)'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={estilos.cardOraGradiente}
      >
        <View style={estilos.cardOraTop}>
          <View style={[estilos.cardOraAvatar, { backgroundColor: oraculista.cor + '20' }]}>
            <Text style={estilos.cardOraAvatarTexto}>{oraculista.avatar}</Text>
          </View>
          <View style={estilos.cardOraInfo}>
            <View style={estilos.cardOraNomeLinha}>
              <Text style={estilos.cardOraNome}>{oraculista.nome}</Text>
              {oraculista.disponivel && <View style={estilos.onlinePonto} />}
            </View>
            <Text style={estilos.cardOraTituloTexto}>{oraculista.titulo}</Text>
            <View style={estilos.cardOraStats}>
              <Ionicons name="star" size={13} color="#F1C40F" />
              <Text style={estilos.cardOraStatsTexto}>{oraculista.avaliacao}</Text>
              <Text style={estilos.cardOraDivisor}>·</Text>
              <Text style={estilos.cardOraStatsTexto}>{oraculista.totalConsultas.toLocaleString('pt-BR')} consultas</Text>
            </View>
          </View>
        </View>

        <Text style={estilos.cardOraBio} numberOfLines={2}>{oraculista.bio}</Text>

        <View style={estilos.cardOraEspecs}>
          {oraculista.especialidades.map((esp) => (
            <View key={esp} style={[estilos.especTag, { backgroundColor: oraculista.cor + '18', borderColor: oraculista.cor + '30' }]}>
              <Text style={[estilos.especTagTexto, { color: oraculista.cor }]}>{esp}</Text>
            </View>
          ))}
        </View>

        <View style={estilos.cardOraFooter}>
          <View>
            <Text style={estilos.precoLabel}>Consulta</Text>
            <Text style={estilos.precoValor}>R$ {oraculista.precoConsulta},00</Text>
          </View>
          <Pressable
            onPress={onAgendar}
            disabled={!oraculista.disponivel}
            style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: oraculista.disponivel ? 1 : 0.5 }]}
          >
            <LinearGradient
              colors={Cores.gradienteAcento}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={estilos.agendarBotao}
            >
              <Ionicons name="calendar-outline" size={16} color="#fff" />
              <Text style={estilos.agendarBotaoTexto}>
                {oraculista.disponivel ? 'Agendar' : 'Indisponível'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

/* ==================== Card Consulta Agendada ==================== */
function CardConsultaAgendada({ consulta }: { consulta: ConsultaAgendada }) {
  const statusCor = consulta.status === 'agendada' ? '#27AE60'
    : consulta.status === 'concluida' ? Cores.acento : Cores.erro;
  const statusTexto = consulta.status === 'agendada' ? 'Agendada'
    : consulta.status === 'concluida' ? 'Concluída' : 'Cancelada';
  const formatoIcone = consulta.formato === 'video' ? 'videocam-outline'
    : consulta.formato === 'audio' ? 'headset-outline' : 'chatbubble-outline';

  return (
    <View style={estilos.cardConsulta}>
      <View style={estilos.cardConsultaTop}>
        <View style={[estilos.cardConsultaAvatar, { backgroundColor: consulta.oraculista.cor + '20' }]}>
          <Text style={{ fontSize: 24 }}>{consulta.oraculista.avatar}</Text>
        </View>
        <View style={estilos.cardConsultaInfo}>
          <Text style={estilos.cardConsultaNome}>{consulta.oraculista.nome}</Text>
          <Text style={estilos.cardConsultaTipo}>{consulta.tipo}</Text>
        </View>
        <View style={[estilos.statusBadge, { backgroundColor: statusCor + '20' }]}>
          <View style={[estilos.statusPonto, { backgroundColor: statusCor }]} />
          <Text style={[estilos.statusTexto, { color: statusCor }]}>{statusTexto}</Text>
        </View>
      </View>

      <View style={estilos.cardConsultaDetalhes}>
        <View style={estilos.detalheItem}>
          <Ionicons name="calendar-outline" size={14} color={Cores.textoSecundario} />
          <Text style={estilos.detalheTexto}>{consulta.data}</Text>
        </View>
        <View style={estilos.detalheItem}>
          <Ionicons name="time-outline" size={14} color={Cores.textoSecundario} />
          <Text style={estilos.detalheTexto}>{consulta.hora}</Text>
        </View>
        <View style={estilos.detalheItem}>
          <Ionicons name={formatoIcone as any} size={14} color={Cores.textoSecundario} />
          <Text style={estilos.detalheTexto}>
            {consulta.formato === 'video' ? 'Vídeo' : consulta.formato === 'audio' ? 'Áudio' : 'Chat'}
          </Text>
        </View>
      </View>

      {consulta.status === 'agendada' && (
        <View style={estilos.cardConsultaAcoes}>
          <Pressable style={estilos.acaoBotaoSecundario}>
            <Text style={estilos.acaoTextoSecundario}>Reagendar</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [estilos.acaoBotaoPrimario, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          >
            <LinearGradient
              colors={Cores.gradienteAcento}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={estilos.acaoGradiente}
            >
              <Ionicons name="videocam" size={14} color="#fff" />
              <Text style={estilos.acaoTextoPrimario}>Entrar</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/* ==================== Seleção de Data (Mini Calendar) ==================== */
function SelecaoData({
  dataSelecionada, onSelecionar, onProximo,
}: { dataSelecionada: Date; onSelecionar: (d: Date) => void; onProximo: () => void }) {
  const hoje = new Date();
  const dias: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    dias.push(d);
  }

  const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <View>
      <Text style={estilos.modalSecaoTitulo}>📅 Próximos 14 dias</Text>

      <FlatList
        data={dias}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(d) => d.toISOString()}
        contentContainerStyle={{ paddingHorizontal: Espacamento.sm, gap: 8 }}
        renderItem={({ item }) => {
          const selecionado = item.toDateString() === dataSelecionada.toDateString();
          const ehHoje = item.toDateString() === hoje.toDateString();
          return (
            <Pressable
              onPress={() => { Hapticos.selecao(); onSelecionar(item); }}
              style={[estilos.diaItem, selecionado && estilos.diaItemSelecionado]}
            >
              <Text style={[estilos.diaSemana, selecionado && estilos.diaTextoSelecionado]}>
                {ehHoje ? 'Hoje' : DIAS_SEMANA[item.getDay()]}
              </Text>
              <Text style={[estilos.diaNumero, selecionado && estilos.diaTextoSelecionado]}>
                {item.getDate()}
              </Text>
              <Text style={[estilos.diaMes, selecionado && estilos.diaTextoSelecionado]}>
                {MESES[item.getMonth()]}
              </Text>
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={() => { Hapticos.impactoLeve(); onProximo(); }}
        style={({ pressed }) => [estilos.modalBotao, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      >
        <LinearGradient
          colors={Cores.gradienteAcento}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={estilos.modalBotaoGradiente}
        >
          <Text style={estilos.modalBotaoTexto}>Escolher Horário</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/* ==================== Seleção de Horário ==================== */
function SelecaoHorario({
  data, horarioSelecionado, onSelecionar,
  formatoSelecionado, onSelecionarFormato, onProximo,
}: {
  data: Date;
  horarioSelecionado: string | null;
  onSelecionar: (h: string) => void;
  formatoSelecionado: FormatoConsulta;
  onSelecionarFormato: (f: FormatoConsulta) => void;
  onProximo: () => void;
}) {
  const horarios = gerarHorarios(data);
  const FORMATOS: Array<{ id: FormatoConsulta; label: string; icone: string }> = [
    { id: 'video', label: 'Vídeo', icone: 'videocam-outline' },
    { id: 'audio', label: 'Áudio', icone: 'headset-outline' },
    { id: 'chat', label: 'Chat', icone: 'chatbubble-outline' },
  ];

  return (
    <View>
      {/* Formato */}
      <Text style={estilos.modalSecaoTitulo}>🎤 Formato da Consulta</Text>
      <View style={estilos.formatosRow}>
        {FORMATOS.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => { Hapticos.selecao(); onSelecionarFormato(f.id); }}
            style={[estilos.formatoOpcao, formatoSelecionado === f.id && estilos.formatoOpcaoAtiva]}
          >
            <Ionicons
              name={f.icone as any}
              size={20}
              color={formatoSelecionado === f.id ? Cores.acento : Cores.textoSecundario}
            />
            <Text style={[
              estilos.formatoOpcaoTexto,
              formatoSelecionado === f.id && estilos.formatoOpcaoTextoAtivo,
            ]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Horários */}
      <Text style={estilos.modalSecaoTitulo}>⏰ Horários Disponíveis</Text>
      <View style={estilos.horariosGrid}>
        {horarios.map((h) => (
          <Pressable
            key={h.hora}
            onPress={() => { if (h.disponivel) { Hapticos.selecao(); onSelecionar(h.hora); } }}
            disabled={!h.disponivel}
            style={[
              estilos.horarioItem,
              horarioSelecionado === h.hora && estilos.horarioItemSelecionado,
              !h.disponivel && estilos.horarioItemIndisponivel,
            ]}
          >
            <Text style={[
              estilos.horarioTexto,
              horarioSelecionado === h.hora && estilos.horarioTextoSelecionado,
              !h.disponivel && estilos.horarioTextoIndisponivel,
            ]}>{h.hora}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => { if (horarioSelecionado) { Hapticos.impactoLeve(); onProximo(); } }}
        disabled={!horarioSelecionado}
        style={({ pressed }) => [
          estilos.modalBotao,
          { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: horarioSelecionado ? 1 : 0.5 },
        ]}
      >
        <LinearGradient
          colors={Cores.gradienteAcento}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={estilos.modalBotaoGradiente}
        >
          <Text style={estilos.modalBotaoTexto}>Confirmar</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/* ==================== Confirmação ==================== */
function TelaConfirmacao({
  oraculista, data, horario, formato, onConfirmar,
}: {
  oraculista: Oraculista;
  data: Date;
  horario: string;
  formato: FormatoConsulta;
  onConfirmar: () => void;
}) {
  const MESES_COMPLETO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const DIAS_COMPLETO = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  return (
    <View>
      <LinearGradient
        colors={['rgba(212, 175, 55, 0.1)', 'rgba(75, 0, 130, 0.1)'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={estilos.confirmCard}
      >
        <MaterialCommunityIcons name="check-circle-outline" size={40} color={Cores.acento} />
        <Text style={estilos.confirmTitulo}>Resumo da Consulta</Text>

        <View style={estilos.confirmLinha}>
          <Text style={estilos.confirmLabel}>Oraculista</Text>
          <Text style={estilos.confirmValor}>{oraculista.avatar} {oraculista.nome}</Text>
        </View>
        <View style={estilos.confirmLinha}>
          <Text style={estilos.confirmLabel}>Especialidade</Text>
          <Text style={estilos.confirmValor}>{oraculista.especialidades[0]}</Text>
        </View>
        <View style={estilos.confirmLinha}>
          <Text style={estilos.confirmLabel}>Data</Text>
          <Text style={estilos.confirmValor}>
            {DIAS_COMPLETO[data.getDay()]}, {data.getDate()} de {MESES_COMPLETO[data.getMonth()]}
          </Text>
        </View>
        <View style={estilos.confirmLinha}>
          <Text style={estilos.confirmLabel}>Horário</Text>
          <Text style={estilos.confirmValor}>{horario}</Text>
        </View>
        <View style={estilos.confirmLinha}>
          <Text style={estilos.confirmLabel}>Formato</Text>
          <Text style={estilos.confirmValor}>
            {formato === 'video' ? '🎥 Vídeo Chamada' : formato === 'audio' ? '🎧 Áudio' : '💬 Chat'}
          </Text>
        </View>
        <View style={[estilos.confirmLinha, { borderBottomWidth: 0 }]}>
          <Text style={estilos.confirmLabel}>Valor</Text>
          <Text style={[estilos.confirmValor, { color: Cores.acento, fontFamily: Fontes.corpoNegrito }]}>
            R$ {oraculista.precoConsulta},00
          </Text>
        </View>
      </LinearGradient>

      <Pressable
        onPress={onConfirmar}
        style={({ pressed }) => [estilos.modalBotao, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      >
        <LinearGradient
          colors={Cores.gradienteAcento}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={estilos.modalBotaoGradiente}
        >
          <MaterialCommunityIcons name="check" size={20} color="#fff" />
          <Text style={estilos.modalBotaoTexto}>Confirmar Agendamento</Text>
        </LinearGradient>
      </Pressable>

      <View style={estilos.notaContainer}>
        <Ionicons name="shield-checkmark-outline" size={14} color={Cores.primaria} />
        <Text style={estilos.notaTexto}>
          Pagamento seguro. Você pode reagendar até 24h antes.
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
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
  // Abas
  aba: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RaioBorda.sm,
  },
  abaAtiva: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  abaTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  abaTextoAtivo: {
    color: Cores.acento,
    fontFamily: Fontes.corpoSemibold,
  },
  badgeContador: {
    backgroundColor: Cores.acento,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 2,
  },
  badgeContadorTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 10,
    color: '#fff',
  },
  listaContent: {
    padding: Espacamento.md,
    paddingBottom: 40,
  },
  // Card Oraculista
  cardOra: {
    marginBottom: Espacamento.md,
  },
  cardOraGradiente: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
  },
  cardOraTop: {
    flexDirection: 'row',
    marginBottom: Espacamento.sm,
  },
  cardOraAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  cardOraAvatarTexto: { fontSize: 26 },
  cardOraInfo: { flex: 1, justifyContent: 'center' },
  cardOraNomeLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardOraNome: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 16,
    color: Cores.textoClaro,
  },
  onlinePonto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27AE60',
  },
  cardOraTituloTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    marginTop: 1,
  },
  cardOraStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  cardOraStatsTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
  cardOraDivisor: {
    color: Cores.textoSecundario,
    fontSize: 12,
    marginHorizontal: 2,
  },
  cardOraBio: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    lineHeight: 19,
    marginBottom: Espacamento.sm,
  },
  cardOraEspecs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Espacamento.md,
  },
  especTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RaioBorda.full,
    borderWidth: 1,
  },
  especTagTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
  },
  cardOraFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  precoLabel: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
  },
  precoValor: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 18,
    color: Cores.textoClaro,
  },
  agendarBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Espacamento.lg,
    paddingVertical: 10,
    borderRadius: RaioBorda.lg,
  },
  agendarBotaoTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    color: '#fff',
  },
  // Card Consulta Agendada
  cardConsulta: {
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    marginBottom: Espacamento.md,
  },
  cardConsultaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Espacamento.sm,
  },
  cardConsultaAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  cardConsultaInfo: { flex: 1 },
  cardConsultaNome: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  cardConsultaTipo: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RaioBorda.full,
  },
  statusPonto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 11,
  },
  cardConsultaDetalhes: {
    flexDirection: 'row',
    gap: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  detalheItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detalheTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  cardConsultaAcoes: {
    flexDirection: 'row',
    gap: Espacamento.sm,
    marginTop: Espacamento.xs,
  },
  acaoBotaoSecundario: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  acaoTextoSecundario: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.textoClaro,
  },
  acaoBotaoPrimario: { flex: 1 },
  acaoGradiente: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RaioBorda.md,
  },
  acaoTextoPrimario: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 13,
    color: '#fff',
  },
  // Vazio
  vazioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Espacamento.md,
  },
  vazioTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 16,
    color: Cores.textoSecundario,
  },
  vazioLink: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.acento,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '85%',
    borderTopLeftRadius: RaioBorda.xl,
    borderTopRightRadius: RaioBorda.xl,
    overflow: 'hidden',
  },
  modalGradient: {
    borderTopLeftRadius: RaioBorda.xl,
    borderTopRightRadius: RaioBorda.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Espacamento.md,
    paddingTop: Espacamento.md,
    paddingBottom: Espacamento.sm,
  },
  modalTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 18,
    color: Cores.textoClaro,
  },
  modalOraculista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
    marginHorizontal: Espacamento.md,
    paddingBottom: Espacamento.md,
    borderBottomWidth: 1,
    borderBottomColor: Cores.cardBorda,
  },
  modalAvatar: { fontSize: 32 },
  modalOraNome: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  modalOraTitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
  modalScrollContent: {
    paddingHorizontal: Espacamento.md,
    paddingBottom: 40,
  },
  modalSecaoTitulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 15,
    color: Cores.textoClaro,
    marginTop: Espacamento.lg,
    marginBottom: Espacamento.sm,
  },
  // Seleção de data
  diaItem: {
    width: 64,
    paddingVertical: Espacamento.sm,
    borderRadius: RaioBorda.md,
    alignItems: 'center',
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  diaItemSelecionado: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: Cores.acento,
  },
  diaSemana: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    marginBottom: 2,
  },
  diaNumero: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 20,
    color: Cores.textoClaro,
  },
  diaMes: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  diaTextoSelecionado: {
    color: Cores.acento,
  },
  // Horários
  horariosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  horarioItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RaioBorda.md,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    minWidth: 72,
    alignItems: 'center',
  },
  horarioItemSelecionado: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: Cores.acento,
  },
  horarioItemIndisponivel: {
    opacity: 0.35,
  },
  horarioTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.textoClaro,
  },
  horarioTextoSelecionado: {
    color: Cores.acento,
  },
  horarioTextoIndisponivel: {
    color: Cores.textoSecundario,
  },
  // Formatos
  formatosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatoOpcao: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RaioBorda.md,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  formatoOpcaoAtiva: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderColor: Cores.acento,
  },
  formatoOpcaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  formatoOpcaoTextoAtivo: {
    color: Cores.acento,
    fontFamily: Fontes.corpoSemibold,
  },
  // Botão modal
  modalBotao: {
    marginTop: Espacamento.lg,
  },
  modalBotaoGradiente: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Espacamento.sm,
    paddingVertical: 14,
    borderRadius: RaioBorda.lg,
  },
  modalBotaoTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 16,
    color: '#fff',
  },
  // Confirmação
  confirmCard: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.lg,
    alignItems: 'center',
    marginTop: Espacamento.lg,
  },
  confirmTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 18,
    color: Cores.textoClaro,
    marginTop: Espacamento.sm,
    marginBottom: Espacamento.md,
  },
  confirmLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Cores.cardBorda,
  },
  confirmLabel: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
  },
  confirmValor: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.textoClaro,
    textAlign: 'right',
    flex: 1,
    marginLeft: Espacamento.md,
  },
  notaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Espacamento.md,
  },
  notaTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },

  // Abas scroll horizontal
  abasScroll: {
    maxHeight: 52,
    marginHorizontal: Espacamento.md,
    marginTop: Espacamento.md,
  },
  abasContainer: {
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.md,
    padding: 4,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    flexDirection: 'row',
    gap: 4,
  },

  // Filtros do histórico
  filtrosContent: {
    paddingHorizontal: Espacamento.md,
    paddingTop: Espacamento.sm,
    paddingBottom: Espacamento.xs,
    gap: 8,
  },
  filtroBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RaioBorda.full,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  filtroBadgeAtivo: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderColor: Cores.acento,
  },
  filtroTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
  filtroTextoAtivo: {
    color: Cores.acento,
    fontFamily: Fontes.corpoSemibold,
  },

  // Card Histórico
  cardHistorico: {
    marginBottom: Espacamento.sm,
  },
  cardHistoricoGradiente: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,240,232,0.07)',
    padding: Espacamento.md,
  },
  cardHistoricoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Espacamento.sm,
  },
  cardHistoricoIcone: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Espacamento.sm,
    flexShrink: 0,
  },
  cardHistoricoInfo: { flex: 1 },
  cardHistoricoTipo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHistoricoData: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    marginTop: 1,
  },
  favoritoBotao: {
    padding: 6,
    marginLeft: Espacamento.xs,
  },
  cardHistoricoResumo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoClaro,
    lineHeight: 20,
    opacity: 0.88,
    marginBottom: Espacamento.xs,
  },
  cardHistoricoRodape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  perguntaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,240,232,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RaioBorda.full,
    maxWidth: 200,
  },
  perguntaTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    flex: 1,
  },
  favoritoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(212,175,55,0.10)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RaioBorda.full,
  },
  favoritoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 10,
    color: Cores.acento,
  },
});
