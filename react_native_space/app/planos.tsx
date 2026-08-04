import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Platform,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../components/GradientBackground';
import { Button } from '../components/Button';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { Hapticos } from '../utils/haptics';
import { useAuth } from '../contexts/AuthContext';
import { MercadoPagoServico, PLANOS_MP } from '../services/mercadopago';
import { DatabaseServico } from '../services/database';

const { width: LARGURA_TELA } = Dimensions.get('window');

interface Plano {
  id: string;
  nome: string;
  preco: string;
  precoNum: number;
  periodo: string;
  descricao: string;
  destaque: boolean;
  badge?: string;
  icone: string;
  gradiente: readonly [string, string];
  beneficios: { texto: string; disponivel: boolean }[];
}

const PLANOS: Plano[] = [
  {
    id: 'iniciante',
    nome: 'Iniciante',
    preco: 'R$ 29,90',
    precoNum: 29.9,
    periodo: '/mês',
    descricao: 'Ideal para começar sua jornada',
    destaque: false,
    icone: 'star-outline',
    gradiente: ['rgba(124, 154, 130, 0.15)', 'rgba(124, 154, 130, 0.05)'] as const,
    beneficios: [
      { texto: '1 leitura por semana', disponivel: true },
      { texto: 'Entrega em texto + áudio', disponivel: true },
      { texto: 'Acesso ao histórico', disponivel: true },
      { texto: 'Análise de imagem por IA', disponivel: false },
      { texto: 'Vídeo personalizado', disponivel: false },
      { texto: 'Rituais guiados', disponivel: false },
      { texto: 'Consulta ao vivo', disponivel: false },
    ],
  },
  {
    id: 'explorador',
    nome: 'Explorador',
    preco: 'R$ 79,90',
    precoNum: 79.9,
    periodo: '/mês',
    descricao: 'Experiência completa com IA',
    destaque: true,
    badge: 'MAIS POPULAR',
    icone: 'diamond-outline',
    gradiente: ['rgba(212, 175, 55, 0.2)', 'rgba(75, 0, 130, 0.15)'] as const,
    beneficios: [
      { texto: 'Leituras ilimitadas por IA', disponivel: true },
      { texto: 'Todos os formatos (texto, áudio, vídeo)', disponivel: true },
      { texto: 'Análise de imagem ilimitada', disponivel: true },
      { texto: 'Rituais guiados completos', disponivel: true },
      { texto: 'Jornada espiritual personalizada', disponivel: true },
      { texto: 'Envio por WhatsApp', disponivel: true },
      { texto: 'Consulta ao vivo', disponivel: false },
    ],
  },
  {
    id: 'mestre',
    nome: 'Mestre',
    preco: 'R$ 199,90',
    precoNum: 199.9,
    periodo: '/mês',
    descricao: 'Tudo + consulta com oraculista',
    destaque: false,
    badge: 'PREMIUM',
    icone: 'crown-outline',
    gradiente: ['rgba(75, 0, 130, 0.2)', 'rgba(212, 175, 55, 0.1)'] as const,
    beneficios: [
      { texto: 'Tudo do plano Explorador', disponivel: true },
      { texto: '1 consulta ao vivo/mês (30min)', disponivel: true },
      { texto: 'Prioridade no suporte', disponivel: true },
      { texto: 'Conteúdo exclusivo mensal', disponivel: true },
      { texto: 'Relatórios personalizados', disponivel: true },
      { texto: 'Acesso antecipado a novidades', disponivel: true },
      { texto: 'Desconto em consultas extras', disponivel: true },
    ],
  },
];

export default function TelaPlanos() {
  const [planoSelecionado, setPlanoSelecionado] = useState<string>('explorador');
  const [processando, setProcessando] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const { sessao, perfil } = useAuth();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const aoSelecionarPlano = useCallback((id: string) => {
    Hapticos.impactoLeve();
    setPlanoSelecionado(id);
  }, []);

  const aoAssinar = useCallback(async () => {
    if (!sessao?.user) {
      Alert.alert('Atenção', 'Faça login para assinar um plano.', [
        { text: 'Entrar', onPress: () => router.push('/auth/login') },
        { text: 'Cancelar' },
      ]);
      return;
    }

    const planoMP = PLANOS_MP.find(p => p.id === planoSelecionado);
    if (!planoMP) return;

    setProcessando(true);
    Hapticos.impactoMedio();

    try {
      const { checkoutUrl, preferenceId } = await MercadoPagoServico.criarPreferencia(
        planoMP,
        sessao.user.email ?? '',
        sessao.user.id
      );

      await DatabaseServico.criarAssinatura({
        usuario_id: sessao.user.id,
        plano: planoMP.id,
        valor: planoMP.valor,
        periodo: planoMP.periodo,
        mp_preference_id: preferenceId,
      });

      await Linking.openURL(checkoutUrl);
    } catch (e: any) {
      const msg = e?.message?.includes('Configure')
        ? e.message
        : 'Erro ao iniciar pagamento. Tente novamente.';
      Alert.alert('Erro', msg);
    } finally {
      setProcessando(false);
    }
  }, [planoSelecionado, sessao]);

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        {/* Header */}
        <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Pressable
            onPress={() => router.back()}
            style={estilos.voltarBotao}
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
          </Pressable>
          <View style={estilos.headerTexto}>
            <Text style={estilos.headerTitulo}>Escolha seu Plano</Text>
            <Text style={estilos.headerSubtitulo}>Desbloqueie todo o poder do oráculo</Text>
          </View>
        </Animated.View>

        <ScrollView
          style={estilos.scroll}
          contentContainerStyle={estilos.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {PLANOS.map((plano, index) => {
            const selecionado = planoSelecionado === plano.id;
            return (
              <Animated.View
                key={plano.id}
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + index * 0.2)) }],
                }}
              >
                <Pressable
                  onPress={() => aoSelecionarPlano(plano.id)}
                  style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                >
                  <LinearGradient
                    colors={plano.gradiente}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      estilos.planoCard,
                      selecionado && estilos.planoCardSelecionado,
                      plano.destaque && estilos.planoCardDestaque,
                    ]}
                  >
                    {/* Badge */}
                    {plano.badge && (
                      <View style={[
                        estilos.badge,
                        plano.id === 'explorador' && estilos.badgePopular,
                        plano.id === 'mestre' && estilos.badgePremium,
                      ]}>
                        <Text style={estilos.badgeTexto}>{plano.badge}</Text>
                      </View>
                    )}

                    {/* Indicador de seleção */}
                    <View style={estilos.planoHeader}>
                      <View style={estilos.planoHeaderEsquerda}>
                        <View style={[
                          estilos.radioCirculo,
                          selecionado && estilos.radioCirculoSelecionado,
                        ]}>
                          {selecionado && <View style={estilos.radioInterno} />}
                        </View>
                        <View>
                          <View style={estilos.planoNomeLinha}>
                            <MaterialCommunityIcons
                              name={plano.icone as any}
                              size={20}
                              color={selecionado ? Cores.acento : Cores.textoClaro}
                            />
                            <Text style={[
                              estilos.planoNome,
                              selecionado && estilos.planoNomeSelecionado,
                            ]}>
                              {plano.nome}
                            </Text>
                          </View>
                          <Text style={estilos.planoDescricao}>{plano.descricao}</Text>
                        </View>
                      </View>
                      <View style={estilos.precoContainer}>
                        <Text style={[
                          estilos.preco,
                          selecionado && estilos.precoSelecionado,
                        ]}>
                          {plano.preco}
                        </Text>
                        <Text style={estilos.periodo}>{plano.periodo}</Text>
                      </View>
                    </View>

                    {/* Benefícios (visível quando selecionado) */}
                    {selecionado && (
                      <View style={estilos.beneficiosContainer}>
                        <View style={estilos.beneficiosDivisor} />
                        {plano.beneficios.map((beneficio, i) => (
                          <View key={i} style={estilos.beneficioLinha}>
                            <Ionicons
                              name={beneficio.disponivel ? 'checkmark-circle' : 'close-circle'}
                              size={18}
                              color={beneficio.disponivel ? '#4CAF50' : 'rgba(245, 240, 232, 0.2)'}
                            />
                            <Text style={[
                              estilos.beneficioTexto,
                              !beneficio.disponivel && estilos.beneficioIndisponivel,
                            ]}>
                              {beneficio.texto}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            );
          })}

          {/* Garantia */}
          <Animated.View style={[estilos.garantiaContainer, { opacity: fadeAnim }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Cores.primaria} />
            <Text style={estilos.garantiaTexto}>
              7 dias de garantia. Cancele quando quiser.
            </Text>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer fixo */}
        <View style={estilos.footer}>
          <Button
            variante="primary"
            label={processando ? 'Aguarde...' : `Assinar ${PLANOS.find(p => p.id === planoSelecionado)?.nome ?? ''}`}
            larguraTotal
            onPress={aoAssinar}
            disabled={processando}
          />
          <Pressable
            onPress={() => router.back()}
            style={estilos.pularBotao}
          >
            <Text style={estilos.pularTexto}>Continuar gratuitamente</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: Espacamento.lg,
    paddingTop: Espacamento.sm,
    paddingBottom: Espacamento.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  voltarBotao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Espacamento.md,
  },
  headerTexto: { flex: 1 },
  headerTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 24,
    fontWeight: '700',
    color: Cores.textoClaro,
  },
  headerSubtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Espacamento.lg,
    paddingTop: Espacamento.sm,
  },

  // Plano Card
  planoCard: {
    borderRadius: RaioBorda.xl,
    padding: Espacamento.md,
    marginBottom: Espacamento.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 240, 232, 0.08)',
  },
  planoCardSelecionado: {
    borderColor: Cores.acento,
    borderWidth: 2,
  },
  planoCardDestaque: {
    ...Platform.select({
      ios: {
        shadowColor: Cores.acento,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {
        shadowColor: Cores.acento,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RaioBorda.full,
    marginBottom: Espacamento.sm,
  },
  badgePopular: {
    backgroundColor: Cores.acento,
  },
  badgePremium: {
    backgroundColor: Cores.roxoMistico,
  },
  badgeTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 1,
  },
  planoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planoHeaderEsquerda: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  radioCirculo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(245, 240, 232, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Espacamento.sm,
    marginTop: 2,
  },
  radioCirculoSelecionado: {
    borderColor: Cores.acento,
  },
  radioInterno: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Cores.acento,
  },
  planoNomeLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planoNome: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 18,
    color: Cores.textoClaro,
  },
  planoNomeSelecionado: {
    color: Cores.acento,
  },
  planoDescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  precoContainer: {
    alignItems: 'flex-end',
  },
  preco: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    fontWeight: '700',
    color: Cores.textoClaro,
  },
  precoSelecionado: {
    color: Cores.acento,
  },
  periodo: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },

  // Beneficios
  beneficiosContainer: {
    marginTop: Espacamento.sm,
  },
  beneficiosDivisor: {
    height: 1,
    backgroundColor: 'rgba(245, 240, 232, 0.08)',
    marginBottom: Espacamento.sm,
  },
  beneficioLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  beneficioTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoClaro,
  },
  beneficioIndisponivel: {
    color: 'rgba(245, 240, 232, 0.25)',
    textDecorationLine: 'line-through',
  },

  // Garantia
  garantiaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Espacamento.md,
  },
  garantiaTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },

  // Footer
  footer: {
    paddingHorizontal: Espacamento.lg,
    paddingVertical: Espacamento.md,
    paddingBottom: Espacamento.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 240, 232, 0.05)',
  },
  pularBotao: {
    alignItems: 'center',
    paddingVertical: Espacamento.sm,
    marginTop: Espacamento.xs,
  },
  pularTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textDecorationLine: 'underline',
  },
});
