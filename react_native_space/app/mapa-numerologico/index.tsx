import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';

const BENEFICIOS = [
  { icone: 'compass-outline', titulo: 'Caminho de Vida', desc: 'Sua missão essencial nesta encarnação' },
  { icone: 'star-four-points-outline', titulo: 'Número de Expressão', desc: 'Seus talentos e dons naturais' },
  { icone: 'heart-outline', titulo: 'Número da Alma', desc: 'O que sua alma verdadeiramente deseja' },
  { icone: 'account-outline', titulo: 'Personalidade', desc: 'Como o mundo te percebe' },
  { icone: 'crown-outline', titulo: 'Maturidade', desc: 'Sua fase de plenitude após os 35' },
];

export default function TelaIntroMapaNumerologico() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea} edges={['top']}>
        <View style={estilos.header}>
          <Pressable
            onPress={() => { Hapticos.impactoLeve(); router.back(); }}
            style={estilos.voltar}
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back" size={24} color={Cores.textoClaro} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={estilos.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={estilos.badge}>
              <MaterialCommunityIcons name="crown" size={12} color={Cores.fundoEscuro} />
              <Text style={estilos.badgeTexto}>PREMIUM</Text>
            </View>

            <Text style={estilos.titulo}>Mapa Numerológico Completo</Text>
            <Text style={estilos.subtitulo}>
              Análise pitagórica profunda com os 5 números essenciais do seu mapa e integração interpretativa.
            </Text>

            <LinearGradient
              colors={['rgba(212, 175, 55, 0.18)', 'rgba(75, 0, 130, 0.18)'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={estilos.heroCard}
            >
              <MaterialCommunityIcons name="numeric" size={64} color={Cores.acento} />
              <Text style={estilos.heroTitulo}>Você vai receber:</Text>
            </LinearGradient>

            <View style={estilos.listaBeneficios}>
              {BENEFICIOS.map((b, i) => (
                <Animated.View
                  key={b.titulo}
                  style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + i * 0.15)) }],
                  }}
                >
                  <View style={estilos.itemBeneficio}>
                    <View style={estilos.iconeBeneficio}>
                      <MaterialCommunityIcons name={b.icone as any} size={24} color={Cores.acento} />
                    </View>
                    <View style={estilos.textoBeneficio}>
                      <Text style={estilos.tituloBeneficio}>{b.titulo}</Text>
                      <Text style={estilos.descBeneficio}>{b.desc}</Text>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>

            <View style={estilos.extras}>
              <Text style={estilos.extrasTitulo}>+ Você também recebe:</Text>
              <Text style={estilos.extrasItem}>✨ Cálculos passo a passo (transparência total)</Text>
              <Text style={estilos.extrasItem}>✨ Interpretação individual profunda</Text>
              <Text style={estilos.extrasItem}>✨ Análise integrada (personalidade, amor, carreira, missão)</Text>
              <Text style={estilos.extrasItem}>✨ Padrões e números mestres 11, 22, 33</Text>
            </View>
          </Animated.View>
        </ScrollView>

        <View style={estilos.footer}>
          <Pressable
            onPress={() => { Hapticos.impactoMedio(); router.push('/mapa-numerologico/formulario'); }}
            style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          >
            <LinearGradient
              colors={Cores.gradienteAcento}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={estilos.botao}
            >
              <Text style={estilos.botaoTexto}>Gerar Meu Mapa</Text>
              <Ionicons name="arrow-forward" size={20} color={Cores.fundoEscuro} />
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Espacamento.lg, paddingTop: Espacamento.sm },
  voltar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1, borderColor: Cores.cardBorda,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Espacamento.lg,
    paddingTop: Espacamento.lg,
    paddingBottom: Espacamento.xl,
  },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: Cores.acento,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RaioBorda.full,
    gap: 4,
    marginBottom: Espacamento.md,
  },
  badgeTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 10,
    color: Cores.fundoEscuro,
    letterSpacing: 1,
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 28,
    fontWeight: '700',
    color: Cores.textoClaro,
    lineHeight: 34,
    marginBottom: Espacamento.sm,
  },
  subtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    lineHeight: 21,
    marginBottom: Espacamento.lg,
  },
  heroCard: {
    alignItems: 'center',
    padding: Espacamento.xl,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    marginBottom: Espacamento.lg,
  },
  heroTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 16,
    color: Cores.textoClaro,
    marginTop: Espacamento.sm,
  },
  listaBeneficios: {
    marginBottom: Espacamento.lg,
  },
  itemBeneficio: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  iconeBeneficio: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: Espacamento.md,
  },
  textoBeneficio: { flex: 1 },
  tituloBeneficio: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  descBeneficio: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  extras: {
    backgroundColor: 'rgba(124, 154, 130, 0.08)',
    padding: Espacamento.md,
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: 'rgba(124, 154, 130, 0.2)',
  },
  extrasTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 13,
    color: Cores.primaria,
    marginBottom: Espacamento.sm,
  },
  extrasItem: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoClaro,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Espacamento.lg,
    paddingBottom: Espacamento.md,
    paddingTop: Espacamento.sm,
  },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RaioBorda.full,
    paddingVertical: Espacamento.md,
    gap: 8,
  },
  botaoTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 16,
    color: Cores.fundoEscuro,
  },
});
