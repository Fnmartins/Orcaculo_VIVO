import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Button } from '../../components/Button';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import type { AnaliseIA } from '../../data/ia-analise';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseServico } from '../../services/database';
import { compartilharAnaliseIA } from '../../services/compartilhar';
import { RatingConsulta } from '../../components/RatingConsulta';

const FORMATOS = [
  { id: 'texto', icone: 'document-text-outline', titulo: 'Texto', disponivel: true },
  { id: 'audio', icone: 'headset-outline', titulo: 'Áudio', disponivel: false },
  { id: 'video', icone: 'videocam-outline', titulo: 'Vídeo', disponivel: false },
  { id: 'pdf', icone: 'download-outline', titulo: 'PDF', disponivel: false },
];

export default function TelaIAResultado() {
  const { resultado: resParam = '{}', imagemUri = '' } = useLocalSearchParams<{ resultado?: string; imagemUri?: string }>();
  const { perfil, logado } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  let analise: AnaliseIA | null = null;
  try {
    analise = JSON.parse(resParam);
  } catch {
    analise = null;
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  async function salvarAnalise() {
    if (!logado || !perfil?.id || !analise) {
      Alert.alert('Entre para salvar', 'Faça login para guardar suas análises.');
      return;
    }
    setSalvando(true);
    try {
      await DatabaseServico.salvarConsulta({
        usuario_id: perfil.id,
        tipo: analise.tipo,
        resultado: analise,
        resumo: analise.resumo,
      });
      setSalvo(true);
      Hapticos.impactoPesado();
      setTimeout(() => setSalvo(false), 2000);
    } catch (erro) {
      Alert.alert('Erro ao salvar', 'Não foi possível guardar a análise. Tente novamente.');
      console.error(erro);
    } finally {
      setSalvando(false);
    }
  }

  if (!analise) {
    return (
      <GradientBackground>
        <SafeAreaView style={estilos.safeArea}>
          <View style={estilos.erroContainer}>
            <Text style={estilos.erroTexto}>Erro ao carregar análise</Text>
            <Button variante="outline" label="Voltar" onPress={() => router.back()} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const corEnergia = analise.energia === 'positiva' ? '#4CAF50'
    : analise.energia === 'atencao' ? '#FF9800' : '#78909C';
  const textoEnergia = analise.energia === 'positiva' ? 'Energia Positiva'
    : analise.energia === 'atencao' ? 'Atenção' : 'Energia Neutra';

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
            <Pressable onPress={() => router.dismissTo('/(tabs)')} style={estilos.voltarBotao}>
              <Ionicons name="close" size={22} color={Cores.textoClaro} />
            </Pressable>
            <Text style={estilos.headerTitulo}>Resultado da Análise</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Formatos */}
          <Animated.View style={[estilos.formatosContainer, { opacity: fadeAnim }]}>
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

          {/* Imagem + Título */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <LinearGradient
              colors={[analise.cor + '20', 'rgba(26,26,46,0.4)'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={estilos.resultadoCard}
            >
              {/* Mini imagem */}
              {imagemUri ? (
                <View style={estilos.miniImagemContainer}>
                  <Image source={{ uri: imagemUri }} style={estilos.miniImagem} />
                </View>
              ) : null}

              {/* Energia badge */}
              <View style={[estilos.energiaBadge, { backgroundColor: corEnergia + '20', borderColor: corEnergia + '40' }]}>
                <View style={[estilos.energiaPonto, { backgroundColor: corEnergia }]} />
                <Text style={[estilos.energiaTexto, { color: corEnergia }]}>{textoEnergia}</Text>
              </View>

              <Text style={[estilos.resultadoTitulo, { color: analise.cor }]}>{analise.titulo}</Text>
              <Text style={estilos.resultadoResumo}>{analise.resumo}</Text>
            </LinearGradient>
          </Animated.View>

          {/* Detalhes */}
          {analise.detalhes.map((detalhe, index) => (
            <Animated.View
              key={index}
              style={[estilos.detalheCard, {
                opacity: fadeAnim,
                transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + index * 0.2)) }],
              }]}
            >
              <Text style={estilos.detalheLabel}>{detalhe.secao}</Text>
              <Text style={estilos.detalheTexto}>{detalhe.texto}</Text>
            </Animated.View>
          ))}

          {/* Rating */}
          <RatingConsulta />

          {/* Botão Salvar */}
          {logado && (
            <Animated.View style={[estilos.salvarContainer, { opacity: fadeAnim }]}>
              <Pressable
                onPress={() => { Hapticos.impactoMedio(); salvarAnalise(); }}
                disabled={salvando || salvo}
                style={({ pressed }) => [
                  estilos.salvarBotao,
                  (pressed && !salvando && !salvo) && { opacity: 0.8 },
                  salvo && estilos.salvarBotaoSucesso,
                ]}
              >
                {salvando ? (
                  <ActivityIndicator color={Cores.textoClaro} size="small" />
                ) : salvo ? (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color={Cores.textoClaro} />
                    <Text style={estilos.salvarBotaoTexto}>Análise salva!</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="bookmark-outline" size={18} color={Cores.textoClaro} />
                    <Text style={estilos.salvarBotaoTexto}>Salvar análise</Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          )}

          {/* Ações */}
          <View style={estilos.acoesContainer}>
            <View style={estilos.acoesLinha}>
              <Pressable
                onPress={() => {
                  Hapticos.impactoLeve();
                  if (analise) {
                    compartilharAnaliseIA({ tipo: analise.tipo, titulo: analise.titulo, resumo: analise.resumo });
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
                  label="Nova Análise"
                  icone="camera-outline"
                  posicaoIcone="left"
                  larguraTotal
                  onPress={() => router.replace('/ia')}
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Espacamento.sm, paddingBottom: Espacamento.md,
  },
  voltarBotao: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitulo: { fontFamily: Fontes.titulo, fontSize: 22, fontWeight: '700', color: Cores.textoClaro },

  formatosContainer: { marginBottom: Espacamento.md },
  formatosGrid: { flexDirection: 'row', gap: Espacamento.sm },
  formatoItem: {
    flex: 1, alignItems: 'center', paddingVertical: Espacamento.sm,
    borderRadius: RaioBorda.md, backgroundColor: Cores.cardFundo,
    borderWidth: 1, borderColor: Cores.cardBorda,
  },
  formatoAtivo: { borderColor: Cores.acento, backgroundColor: 'rgba(212, 175, 55, 0.08)' },
  formatoDesabilitado: { opacity: 0.5 },
  formatoTexto: { fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario, marginTop: 4 },

  resultadoCard: {
    borderRadius: RaioBorda.xl, padding: Espacamento.lg,
    borderWidth: 1, borderColor: 'rgba(245, 240, 232, 0.06)',
    marginBottom: Espacamento.md,
  },
  miniImagemContainer: {
    width: 80, height: 80, borderRadius: 40,
    overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: Espacamento.md,
  },
  miniImagem: { width: '100%', height: '100%' },
  energiaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RaioBorda.full, borderWidth: 1,
    alignSelf: 'flex-start', marginBottom: Espacamento.md,
  },
  energiaPonto: { width: 8, height: 8, borderRadius: 4 },
  energiaTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 11 },
  resultadoTitulo: { fontFamily: Fontes.titulo, fontSize: 24, fontWeight: '700', marginBottom: Espacamento.sm },
  resultadoResumo: {
    fontFamily: Fontes.corpo, fontSize: 15, color: Cores.textoClaro,
    lineHeight: 23, opacity: 0.9,
  },

  detalheCard: {
    backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg, padding: Espacamento.md, marginBottom: Espacamento.sm,
  },
  detalheLabel: {
    fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.acento,
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  detalheTexto: {
    fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoClaro,
    lineHeight: 22, opacity: 0.85,
  },

  salvarContainer: { marginBottom: Espacamento.lg },
  salvarBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Espacamento.sm,
    paddingVertical: Espacamento.md,
    paddingHorizontal: Espacamento.lg,
    borderRadius: RaioBorda.lg,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  salvarBotaoTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.textoClaro,
  },
  salvarBotaoSucesso: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderColor: 'rgba(76,175,80,0.3)',
  },

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
});
