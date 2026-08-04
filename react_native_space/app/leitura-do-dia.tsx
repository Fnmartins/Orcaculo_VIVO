import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GradientBackground } from '../components/GradientBackground';
import { Button } from '../components/Button';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { Hapticos } from '../utils/haptics';
import { SomMistico } from '../services/somMistico';
import { ARCANOS_MAIORES, type CartaTarot } from '../data/tarot';

const CHAVE_LEITURA_DIA = '@oraculo:leitura_dia';

interface LeituraDiaSalva {
  data: string;
  cartaId: number;
}

const MENSAGENS_DIA = [
  'O universo tem uma mensagem especial para você hoje.',
  'As estrelas conspiraram para revelar seu caminho agora.',
  'Sua energia atrai esta sabedoria neste momento.',
  'O cosmos preparou esta orientação especialmente para você.',
  'A carta de hoje ilumina o seu momento presente.',
];

function obterDataHoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function sortearCartaDoDia(): CartaTarot {
  const idx = Math.floor(Math.random() * ARCANOS_MAIORES.length);
  return ARCANOS_MAIORES[idx];
}

function obterMensagemDia(): string {
  const idx = new Date().getDate() % MENSAGENS_DIA.length;
  return MENSAGENS_DIA[idx];
}

export default function TelaLeituraDia() {
  const [carta, setCarta] = useState<CartaTarot | null>(null);
  const [revelada, setRevelada] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const revelarFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    carregarOuSortearCarta();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  async function carregarOuSortearCarta() {
    try {
      const salvo = await AsyncStorage.getItem(CHAVE_LEITURA_DIA);
      if (salvo) {
        const dados: LeituraDiaSalva = JSON.parse(salvo);
        if (dados.data === obterDataHoje()) {
          const cartaSalva = ARCANOS_MAIORES.find(c => c.id === dados.cartaId);
          if (cartaSalva) {
            setCarta(cartaSalva);
            setCarregando(false);
            return;
          }
        }
      }
      const nova = sortearCartaDoDia();
      await AsyncStorage.setItem(CHAVE_LEITURA_DIA, JSON.stringify({
        data: obterDataHoje(),
        cartaId: nova.id,
      }));
      setCarta(nova);
    } catch {
      setCarta(sortearCartaDoDia());
    } finally {
      setCarregando(false);
    }
  }

  function revelarCarta() {
    Hapticos.impactoPesado();
    SomMistico.tocarRevelacao();
    setRevelada(true);
    Animated.timing(revelarFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

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
            <Pressable onPress={() => router.back()} style={estilos.voltarBotao}>
              <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
            </Pressable>
            <Text style={estilos.headerTitulo}>Leitura do Dia</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Badge data */}
          <Animated.View style={[estilos.dataBadgeContainer, { opacity: fadeAnim }]}>
            <View style={estilos.dataBadge}>
              <Ionicons name="calendar-outline" size={13} color={Cores.acento} />
              <Text style={estilos.dataBadgeTexto}>
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>
          </Animated.View>

          {/* Mensagem do dia */}
          <Animated.View style={[estilos.mensagemContainer, { opacity: fadeAnim }]}>
            <Text style={estilos.mensagemTexto}>{obterMensagemDia()}</Text>
          </Animated.View>

          {/* Carta */}
          {!carregando && carta && (
            <Animated.View style={[estilos.cartaContainer, { opacity: fadeAnim }]}>
              {!revelada ? (
                /* Verso da carta */
                <Pressable onPress={revelarCarta} style={estilos.cartaVerso}>
                  <LinearGradient
                    colors={['rgba(75,0,130,0.6)', 'rgba(26,26,46,0.9)'] as const}
                    style={estilos.cartaVersoGradiente}
                  >
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <MaterialCommunityIcons name="star-four-points" size={64} color={Cores.acento} />
                    </Animated.View>
                    <Text style={estilos.cartaVersoTexto}>Toque para revelar</Text>
                    <Text style={estilos.cartaVersoSubtexto}>sua carta do dia</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                /* Frente da carta */
                <Animated.View style={{ opacity: revelarFade }}>
                  <LinearGradient
                    colors={[carta.cor + '25', 'rgba(26,26,46,0.8)'] as const}
                    style={estilos.cartaFrente}
                  >
                    <View style={[estilos.cartaIconeCirculo, { backgroundColor: carta.cor + '20' }]}>
                      <Ionicons name={carta.icone as any} size={48} color={carta.cor} />
                    </View>
                    <Text style={[estilos.cartaNome, { color: carta.cor }]}>{carta.nomeCompleto}</Text>
                    <View style={estilos.divisorCarta} />

                    <View style={estilos.secaoCarta}>
                      <Text style={estilos.secaoLabel}>Mensagem do Dia</Text>
                      <Text style={estilos.secaoTexto}>{carta.significado}</Text>
                    </View>

                    <View style={estilos.secaoCarta}>
                      <Text style={estilos.secaoLabel}>💡 Conselho para Hoje</Text>
                      <Text style={estilos.secaoTexto}>{carta.conselho}</Text>
                    </View>
                  </LinearGradient>
                </Animated.View>
              )}
            </Animated.View>
          )}

          {/* Dica */}
          {revelada && carta && (
            <Animated.View style={[estilos.dicaContainer, { opacity: revelarFade }]}>
              <LinearGradient
                colors={['rgba(212,175,55,0.08)', 'rgba(75,0,130,0.06)'] as const}
                style={estilos.dicaCard}
              >
                <Ionicons name="information-circle-outline" size={18} color={Cores.acento} />
                <Text style={estilos.dicaTexto}>
                  Esta carta acompanha você durante todo o dia de hoje. Volte amanhã para uma nova leitura.
                </Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Ações */}
          {revelada && (
            <Animated.View style={[estilos.acoesContainer, { opacity: revelarFade }]}>
              <Button
                variante="primary"
                label="Consulta Completa com Tarot"
                icone="cards-outline"
                posicaoIcone="left"
                larguraTotal
                onPress={() => { Hapticos.impactoLeve(); router.push('/consulta'); }}
              />
              <View style={{ height: Espacamento.sm }} />
              <Button
                variante="outline"
                label="Voltar ao Início"
                larguraTotal
                onPress={() => router.back()}
              />
            </Animated.View>
          )}

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
    paddingTop: Espacamento.sm,
    paddingBottom: Espacamento.md,
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
  },
  headerTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    fontWeight: '700',
    color: Cores.textoClaro,
  },

  dataBadgeContainer: {
    alignItems: 'center',
    marginBottom: Espacamento.md,
  },
  dataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    paddingHorizontal: Espacamento.md,
    paddingVertical: Espacamento.xs,
    borderRadius: RaioBorda.full,
  },
  dataBadgeTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
    color: Cores.acento,
    textTransform: 'capitalize',
  },

  mensagemContainer: {
    alignItems: 'center',
    marginBottom: Espacamento.xl,
    paddingHorizontal: Espacamento.md,
  },
  mensagemTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoSecundario,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },

  cartaContainer: {
    marginBottom: Espacamento.lg,
  },

  cartaVerso: {
    borderRadius: RaioBorda.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  cartaVersoGradiente: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Espacamento.xxl * 2,
    gap: Espacamento.md,
  },
  cartaVersoTexto: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    color: Cores.textoClaro,
    marginTop: Espacamento.md,
  },
  cartaVersoSubtexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
  },

  cartaFrente: {
    borderRadius: RaioBorda.xl,
    padding: Espacamento.xl,
    borderWidth: 1,
    borderColor: 'rgba(245,240,232,0.08)',
    alignItems: 'center',
  },
  cartaIconeCirculo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.md,
  },
  cartaNome: {
    fontFamily: Fontes.titulo,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Espacamento.md,
  },
  divisorCarta: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.3)',
    marginBottom: Espacamento.lg,
  },
  secaoCarta: {
    width: '100%',
    marginBottom: Espacamento.md,
  },
  secaoLabel: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
    color: Cores.acento,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  secaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoClaro,
    lineHeight: 23,
    opacity: 0.9,
  },

  dicaContainer: { marginBottom: Espacamento.lg },
  dicaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Espacamento.sm,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.12)',
  },
  dicaTexto: {
    flex: 1,
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    lineHeight: 19,
  },

  acoesContainer: { paddingBottom: Espacamento.md },
});
