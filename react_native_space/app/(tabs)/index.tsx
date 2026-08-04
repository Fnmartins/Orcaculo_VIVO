import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { usePlano } from '../../hooks/usePlano';
import { useAuth } from '../../contexts/AuthContext';

const { width: LARGURA_TELA } = Dimensions.get('window');
const CARD_DESTAQUE_LARGURA = (LARGURA_TELA - Espacamento.lg * 2 - Espacamento.sm) / 2;
const CARD_PADRAO_LARGURA = (LARGURA_TELA - Espacamento.lg * 2 - Espacamento.sm) / 2;

type CategoriaServico = 'destaque' | 'padrao' | 'ia';
type BadgeServico = 'POPULAR' | 'NOVO' | 'PREMIUM' | 'IA' | null;

interface Servico {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  iconeLib: 'material' | 'ionicons';
  cor: string;
  badge: BadgeServico;
  categoria: CategoriaServico;
  rota: string;
}

const SERVICOS: Servico[] = [
  {
    id: 'buzios',
    titulo: 'Búzios',
    descricao: 'Jogo sagrado dos Orixás',
    icone: 'grain',
    iconeLib: 'material',
    cor: '#7C9A82',
    badge: 'POPULAR',
    categoria: 'destaque',
    rota: '/consulta/buzios-preparo',
  },
  {
    id: 'tarot',
    titulo: 'Tarot',
    descricao: '78 arcanos revelados',
    icone: 'cards-outline',
    iconeLib: 'material',
    cor: '#9B59B6',
    badge: 'POPULAR',
    categoria: 'destaque',
    rota: '/consulta',
  },
  {
    id: 'numerologia',
    titulo: 'Numerologia',
    descricao: 'Números da sua alma',
    icone: 'calculator-outline',
    iconeLib: 'ionicons',
    cor: '#3498DB',
    badge: 'NOVO',
    categoria: 'padrao',
    rota: '/numerologia',
  },
  {
    id: 'mapa_astral',
    titulo: 'Mapa Astral',
    descricao: 'Astros & planetas',
    icone: 'planet-outline',
    iconeLib: 'ionicons',
    cor: '#E67E22',
    badge: null,
    categoria: 'padrao',
    rota: '/mapa-astral',
  },
  {
    id: 'matriz_destino',
    titulo: 'Matriz do Destino',
    descricao: '22 Arcanos Maiores',
    icone: 'star-david',
    iconeLib: 'material',
    cor: '#B565A7',
    badge: 'PREMIUM',
    categoria: 'padrao',
    rota: '/matriz-destino',
  },
  {
    id: 'lei_atracao',
    titulo: 'Lei da Atração',
    descricao: 'Manifeste seus sonhos',
    icone: 'star-four-points',
    iconeLib: 'material',
    cor: '#EC4899',
    badge: 'PREMIUM',
    categoria: 'padrao',
    rota: '/lei-atracao',
  },
  {
    id: 'cafe',
    titulo: 'Borra de Café',
    descricao: 'IA analisa sua xícara',
    icone: 'cafe-outline',
    iconeLib: 'ionicons',
    cor: '#C2853A',
    badge: 'IA',
    categoria: 'ia',
    rota: '/ia?tipo=cafe',
  },
  {
    id: 'quiromancia',
    titulo: 'Quiromância',
    descricao: 'IA lê suas mãos',
    icone: 'hand-left-outline',
    iconeLib: 'ionicons',
    cor: '#E74C3C',
    badge: 'IA',
    categoria: 'ia',
    rota: '/ia?tipo=quiromancia',
  },
];

const COR_BADGE: Record<NonNullable<BadgeServico>, string> = {
  POPULAR: '#D4AF37',
  NOVO: '#3498DB',
  PREMIUM: '#B565A7',
  IA: '#7C9A82',
};

const RITUAIS = [
  { id: 'limpeza', titulo: 'Limpeza Energética', descricao: 'Renove suas energias', icone: 'leaf-outline', duracao: '15 min' },
  { id: 'protecao', titulo: 'Proteção Espiritual', descricao: 'Fortaleça sua aura', icone: 'shield-outline', duracao: '20 min' },
  { id: 'meditacao', titulo: 'Meditação Guiada', descricao: 'Conecte-se interiormente', icone: 'flower-outline', duracao: '10 min' },
];

function obterSaudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function BadgeServico({ tipo }: { tipo: NonNullable<BadgeServico> }) {
  const cor = COR_BADGE[tipo];
  return (
    <View style={[estilosBadge.badge, { backgroundColor: cor + '22', borderColor: cor + '55' }]}>
      <Text style={[estilosBadge.texto, { color: cor }]}>{tipo}</Text>
    </View>
  );
}

const estilosBadge = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RaioBorda.full,
    borderWidth: 1,
  },
  texto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 8,
    letterSpacing: 0.8,
  },
});

function CardDestaque({ servico, index, fadeAnim, aoPress }: { servico: Servico; index: number; fadeAnim: Animated.Value; aoPress: (s: Servico) => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const IconeComp = servico.iconeLib === 'material' ? MaterialCommunityIcons : Ionicons;
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View style={{ opacity: fadeAnim, width: CARD_DESTAQUE_LARGURA }}>
      <Pressable
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
        onPress={() => { Hapticos.impactoMedio(); aoPress(servico); }}
        accessibilityLabel={servico.titulo}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Animated.View style={[estilosCard.glowDestaque, { borderColor: servico.cor, opacity: glowOpacity }]} />
          <LinearGradient
            colors={[servico.cor + '30', servico.cor + '10', 'rgba(26,26,46,0.8)'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[estilosCard.cardDestaque, { borderColor: servico.cor + '50' }]}
          >
            {servico.badge && <BadgeServico tipo={servico.badge} />}
            <View style={[estilosCard.iconeDestaque, { backgroundColor: servico.cor + '25' }]}>
              <IconeComp name={servico.icone as any} size={36} color={servico.cor} />
            </View>
            <Text style={estilosCard.tituloDestaque}>{servico.titulo}</Text>
            <Text style={estilosCard.descricaoDestaque}>{servico.descricao}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function CardPadrao({ servico, fadeAnim, aoPress }: { servico: Servico; fadeAnim: Animated.Value; aoPress: (s: Servico) => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const IconeComp = servico.iconeLib === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <Animated.View style={{ opacity: fadeAnim, width: CARD_PADRAO_LARGURA }}>
      <Pressable
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
        onPress={() => { Hapticos.impactoLeve(); aoPress(servico); }}
        accessibilityLabel={servico.titulo}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={[servico.cor + '22', servico.cor + '08', 'rgba(26,26,46,0.9)'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[estilosCard.cardPadrao, { borderColor: servico.cor + '40' }]}
          >
            {servico.badge && <BadgeServico tipo={servico.badge} />}
            <View style={[estilosCard.iconePadrao, { backgroundColor: servico.cor + '20' }]}>
              <IconeComp name={servico.icone as any} size={28} color={servico.cor} />
            </View>
            <Text style={estilosCard.tituloPadrao}>{servico.titulo}</Text>
            <Text style={estilosCard.descricaoPadrao}>{servico.descricao}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function CardIA({ servico, fadeAnim, aoPress }: { servico: Servico; fadeAnim: Animated.Value; aoPress: (s: Servico) => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const IconeComp = servico.iconeLib === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <Animated.View style={{ opacity: fadeAnim, width: CARD_PADRAO_LARGURA }}>
      <Pressable
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
        onPress={() => { Hapticos.impactoLeve(); aoPress(servico); }}
        accessibilityLabel={servico.titulo}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={[servico.cor + '1A', 'rgba(124,154,130,0.12)', 'rgba(26,26,46,0.95)'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[estilosCard.cardIA, { borderColor: servico.cor + '35' }]}
          >
            {servico.badge && <BadgeServico tipo={servico.badge} />}
            <View style={[estilosCard.iconeIA, { backgroundColor: servico.cor + '18' }]}>
              <IconeComp name={servico.icone as any} size={26} color={servico.cor} />
            </View>
            <View style={estilosCard.iaLabelRow}>
              <Ionicons name="camera-outline" size={10} color={COR_BADGE.IA} />
              <Text style={estilosCard.iaLabel}>Foto + IA</Text>
            </View>
            <Text style={estilosCard.tituloIA}>{servico.titulo}</Text>
            <Text style={estilosCard.descricaoIA}>{servico.descricao}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const estilosCard = StyleSheet.create({
  glowDestaque: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: RaioBorda.xl,
    borderWidth: 1.5,
    zIndex: 0,
  },
  cardDestaque: {
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    padding: Espacamento.md,
    paddingTop: Espacamento.lg,
    minHeight: 150,
    justifyContent: 'flex-end',
  },
  iconeDestaque: {
    width: 60,
    height: 60,
    borderRadius: RaioBorda.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.sm,
  },
  tituloDestaque: {
    fontFamily: Fontes.titulo,
    fontSize: 18,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginBottom: 2,
  },
  descricaoDestaque: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    lineHeight: 15,
  },
  cardPadrao: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    padding: Espacamento.md,
    paddingTop: Espacamento.lg,
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  iconePadrao: {
    width: 48,
    height: 48,
    borderRadius: RaioBorda.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.xs,
  },
  tituloPadrao: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    color: Cores.textoClaro,
    marginBottom: 2,
  },
  descricaoPadrao: {
    fontFamily: Fontes.corpo,
    fontSize: 10,
    color: Cores.textoSecundario,
    lineHeight: 14,
  },
  cardIA: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: Espacamento.md,
    paddingTop: Espacamento.lg,
    minHeight: 110,
    justifyContent: 'flex-end',
  },
  iconeIA: {
    width: 44,
    height: 44,
    borderRadius: RaioBorda.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.xs,
  },
  iaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  iaLabel: {
    fontFamily: Fontes.corpo,
    fontSize: 9,
    color: COR_BADGE.IA,
    letterSpacing: 0.5,
  },
  tituloIA: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 13,
    color: Cores.textoClaro,
    marginBottom: 1,
  },
  descricaoIA: {
    fontFamily: Fontes.corpo,
    fontSize: 10,
    color: Cores.textoSecundario,
    lineHeight: 14,
  },
});

export default function TelaHome() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const { verificarAcesso } = usePlano();
  const { perfil, logado } = useAuth();

  function acessarServico(servico: Servico) {
    const recurso = servico.categoria === 'ia'
      ? 'ia_visual'
      : (servico.badge === 'PREMIUM' ? 'consulta_premium' : 'consulta_basica');
    if (!verificarAcesso(recurso)) return;
    router.push(servico.rota as any);
  }

  const xpNivel = perfil?.nivel ?? 1;
  const xpAtual = perfil?.xp ?? 0;
  const xpNecessario = xpNivel * 100;
  const xpPorcentagem = Math.min(xpAtual / xpNecessario, 1);
  const streakDias = perfil?.streak ?? 0;
  const nomeUsuario = perfil?.nome?.split(' ')[0] ?? 'Buscador de Luz';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (logado) {
      Animated.timing(xpAnim, {
        toValue: xpPorcentagem,
        duration: 1000,
        delay: 700,
        useNativeDriver: false,
      }).start();
    }
  }, [logado, xpPorcentagem]);

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea} edges={['top']}>
        <ScrollView
          style={estilos.scroll}
          contentContainerStyle={estilos.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View>
              <Text style={estilos.saudacao}>{obterSaudacao()} ✨</Text>
              <Text style={estilos.nomeUsuario}>{nomeUsuario}</Text>
            </View>
            <Pressable
              style={estilos.notificacaoBotao}
              onPress={() => Hapticos.impactoLeve()}
              accessibilityLabel="Notificações"
            >
              <Ionicons name="notifications-outline" size={24} color={Cores.textoClaro} />
              <View style={estilos.notificacaoPonto} />
            </Pressable>
          </Animated.View>

          {/* Card Gamificação — só para logados */}
          {logado && (
            <Animated.View style={[estilos.gamificacaoCard, { opacity: fadeAnim }]}>
              {/* Nível + XP */}
              <View style={estilos.gamificacaoTop}>
                <View style={estilos.nivelBadge}>
                  <Text style={estilos.nivelIcone}>⭐</Text>
                  <Text style={estilos.nivelTexto}>Nível {xpNivel}</Text>
                </View>
                <Text style={estilos.xpTexto}>{xpAtual} / {xpNecessario} XP</Text>
              </View>

              {/* Barra de XP */}
              <View style={estilos.xpBarraContainer}>
                <Animated.View
                  style={[
                    estilos.xpBarra,
                    { width: xpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any },
                  ]}
                />
              </View>

              {/* Streak + Plano */}
              <View style={estilos.gamificacaoBottom}>
                {streakDias > 0 && (
                  <View style={estilos.streakChip}>
                    <Text style={estilos.streakIcone}>🔥</Text>
                    <Text style={estilos.streakTexto}>{streakDias} {streakDias === 1 ? 'dia' : 'dias'} seguidos</Text>
                  </View>
                )}
                <View style={[estilos.planoChip, {
                  backgroundColor: perfil?.plano === 'gratuito' ? 'rgba(245,240,232,0.06)' : 'rgba(212,175,55,0.12)',
                }]}>
                  <Text style={[estilos.planoChipTexto, {
                    color: perfil?.plano === 'gratuito' ? Cores.textoSecundario : Cores.acento,
                  }]}>
                    {perfil?.plano === 'gratuito' ? 'Gratuito' :
                     perfil?.plano === 'iniciante' ? '⭐ Iniciante' :
                     perfil?.plano === 'explorador' ? '🌙 Explorador' : '👑 Mestre'}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Card Leitura do Dia */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Pressable
              onPress={() => { Hapticos.impactoMedio(); router.push('/leitura-do-dia'); }}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <LinearGradient
                colors={['rgba(212, 175, 55, 0.15)', 'rgba(75, 0, 130, 0.15)'] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={estilos.cardLeituraDia}
              >
                <View style={estilos.cardLeituraHeader}>
                  <View style={estilos.cardLeituraIcone}>
                    <MaterialCommunityIcons name="star-four-points" size={24} color={Cores.acento} />
                  </View>
                  <View style={estilos.cardLeituraBadge}>
                    <Text style={estilos.cardLeituraBadgeTexto}>NOVA</Text>
                  </View>
                </View>
                <Text style={estilos.cardLeituraTitulo}>Leitura do Dia</Text>
                <Text style={estilos.cardLeituraDescricao}>
                  As energias de hoje trazem renovação e clareza. Toque para revelar sua mensagem.
                </Text>
                <View style={estilos.cardLeituraFooter}>
                  <Text style={estilos.cardLeituraAcao}>Revelar mensagem</Text>
                  <Ionicons name="arrow-forward" size={16} color={Cores.acento} />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Oráculos — Grid Hierarquizado */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>Oráculos</Text>
            <Text style={estilos.secaoSubtitulo}>Escolha seu método de consulta</Text>

            {/* Linha 1 — Destaques: Búzios + Tarot */}
            <View style={estilos.gridLinha}>
              {SERVICOS.filter(s => s.categoria === 'destaque').map((servico, i) => (
                <CardDestaque key={servico.id} servico={servico} index={i} fadeAnim={fadeAnim} aoPress={acessarServico} />
              ))}
            </View>

            {/* Divisor categorias */}
            <View style={estilos.divisorCategoria}>
              <View style={estilos.divisorLinha} />
              <Text style={estilos.divisorTexto}>NUMEROLOGIA & DESTINO</Text>
              <View style={estilos.divisorLinha} />
            </View>

            {/* Linha 2 — Padrão: Numerologia, Mapa Astral, Matriz, Lei da Atração */}
            <View style={estilos.gridLinha}>
              {SERVICOS.filter(s => s.categoria === 'padrao').map((servico) => (
                <CardPadrao key={servico.id} servico={servico} fadeAnim={fadeAnim} aoPress={acessarServico} />
              ))}
            </View>

            {/* Divisor categorias */}
            <View style={estilos.divisorCategoria}>
              <View style={estilos.divisorLinha} />
              <Text style={estilos.divisorTexto}>ANÁLISE POR IA</Text>
              <View style={estilos.divisorLinha} />
            </View>

            {/* Linha 3 — IA: Café + Quiromância */}
            <View style={estilos.gridLinha}>
              {SERVICOS.filter(s => s.categoria === 'ia').map((servico) => (
                <CardIA key={servico.id} servico={servico} fadeAnim={fadeAnim} aoPress={acessarServico} />
              ))}
            </View>
          </Animated.View>

          {/* Card Mapa Numerológico Premium */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Pressable
              onPress={() => { Hapticos.impactoLeve(); router.push('/mapa-numerologico'); }}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <LinearGradient
                colors={['rgba(212, 175, 55, 0.25)', 'rgba(75, 0, 130, 0.25)'] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={estilos.cardIA}
              >
                <View style={[estilos.cardIAIcone, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
                  <MaterialCommunityIcons name="numeric" size={32} color={Cores.acento} />
                </View>
                <View style={estilos.cardIATexto}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={estilos.cardIATitulo}>Mapa Numerológico</Text>
                    <View style={{ backgroundColor: Cores.acento, paddingHorizontal: 6, paddingVertical: 1, borderRadius: RaioBorda.full }}>
                      <Text style={{ fontFamily: Fontes.corpoNegrito, fontSize: 8, color: Cores.fundoEscuro, letterSpacing: 0.5 }}>PREMIUM</Text>
                    </View>
                  </View>
                  <Text style={estilos.cardIADescricao}>
                    Análise pitagórica completa com 5 números essenciais e integração.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Cores.acento} />
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Banner Planos */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Pressable
              onPress={() => { Hapticos.impactoLeve(); router.push('/planos'); }}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <LinearGradient
                colors={Cores.gradienteAcento}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={estilos.bannerPlanos}
              >
                <View style={estilos.bannerPlanosTexto}>
                  <Text style={estilos.bannerPlanosTitulo}>Desbloqueie tudo ✨</Text>
                  <Text style={estilos.bannerPlanosDescricao}>Leituras ilimitadas, IA visual e mais</Text>
                </View>
                <View style={estilos.bannerPlanosBtn}>
                  <Text style={estilos.bannerPlanosBtnTexto}>Ver planos</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Rituais */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>Rituais Guiados</Text>
            <Text style={estilos.secaoSubtitulo}>Prepare sua energia antes da leitura</Text>
            {RITUAIS.map((ritual) => (
              <Pressable
                key={ritual.id}
                onPress={() => { Hapticos.impactoLeve(); router.push(`/rituais/${ritual.id}`); }}
                style={({ pressed }) => [
                  estilos.ritualCard,
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <View style={estilos.ritualIcone}>
                  <Ionicons name={ritual.icone as any} size={24} color={Cores.primaria} />
                </View>
                <View style={estilos.ritualInfo}>
                  <Text style={estilos.ritualTitulo}>{ritual.titulo}</Text>
                  <Text style={estilos.ritualDescricao}>{ritual.descricao}</Text>
                </View>
                <View style={estilos.ritualDuracao}>
                  <Text style={estilos.ritualDuracaoTexto}>{ritual.duracao}</Text>
                </View>
              </Pressable>
            ))}
          </Animated.View>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Espacamento.md,
    paddingBottom: Espacamento.lg,
  },
  saudacao: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
  },
  nomeUsuario: {
    fontFamily: Fontes.titulo,
    fontSize: 24,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginTop: 2,
  },
  notificacaoBotao: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificacaoPonto: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Cores.acento,
  },
  // Gamificação
  gamificacaoCard: {
    backgroundColor: 'rgba(245,240,232,0.04)',
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,240,232,0.07)',
    padding: Espacamento.md,
    marginBottom: Espacamento.md,
  },
  gamificacaoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nivelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  nivelIcone: { fontSize: 14 },
  nivelTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    color: Cores.textoClaro,
  },
  xpTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
  },
  xpBarraContainer: {
    height: 5,
    backgroundColor: 'rgba(245,240,232,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  xpBarra: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Cores.acento,
  },
  gamificacaoBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,127,0,0.12)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RaioBorda.full,
  },
  streakIcone: { fontSize: 12 },
  streakTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 11,
    color: '#FF7F00',
  },
  planoChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RaioBorda.full,
  },
  planoChipTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 11,
  },

  cardLeituraDia: {
    borderRadius: RaioBorda.xl,
    padding: Espacamento.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    marginBottom: Espacamento.lg,
  },
  cardLeituraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Espacamento.md,
  },
  cardLeituraIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLeituraBadge: {
    backgroundColor: Cores.acento,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RaioBorda.full,
  },
  cardLeituraBadgeTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 10,
    color: Cores.fundoEscuro,
    letterSpacing: 1,
  },
  cardLeituraTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginBottom: Espacamento.xs,
  },
  cardLeituraDescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    lineHeight: 20,
  },
  cardLeituraFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Espacamento.md,
    gap: 6,
  },
  cardLeituraAcao: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.acento,
  },
  secao: {
    marginBottom: Espacamento.lg,
  },
  secaoTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginBottom: 2,
  },
  secaoSubtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginBottom: Espacamento.md,
  },
  gridLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Espacamento.sm,
    marginBottom: Espacamento.sm,
    flexWrap: 'wrap',
  },
  divisorCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Espacamento.md,
    gap: Espacamento.sm,
  },
  divisorLinha: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.15)',
  },
  divisorTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 9,
    color: 'rgba(212,175,55,0.5)',
    letterSpacing: 1.5,
  },
  cardIA: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    borderWidth: 1,
    borderColor: 'rgba(124, 154, 130, 0.2)',
  },
  cardIAIcone: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(124, 154, 130, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Espacamento.md,
  },
  cardIATexto: {
    flex: 1,
  },
  cardIATitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  cardIADescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    lineHeight: 17,
    marginTop: 2,
  },
  ritualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  ritualIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124, 154, 130, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Espacamento.md,
  },
  ritualInfo: {
    flex: 1,
  },
  ritualTitulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.textoClaro,
  },
  ritualDescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  ritualDuracao: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RaioBorda.full,
  },
  ritualDuracaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.acento,
  },
  bannerPlanos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
  },
  bannerPlanosTexto: {
    flex: 1,
  },
  bannerPlanosTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 16,
    color: Cores.fundoEscuro,
  },
  bannerPlanosDescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: 'rgba(26, 26, 46, 0.7)',
    marginTop: 2,
  },
  bannerPlanosBtn: {
    backgroundColor: Cores.fundoEscuro,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RaioBorda.full,
  },
  bannerPlanosBtnTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 12,
    color: Cores.acento,
  },
});
