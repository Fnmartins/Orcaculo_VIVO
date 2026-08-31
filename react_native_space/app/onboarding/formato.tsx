import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientBackground } from '../../components/GradientBackground';
import { Button } from '../../components/Button';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { useOnboarding, type FormatoEntrega } from '../../contexts/OnboardingContext';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';

const FORMATOS: { id: FormatoEntrega; titulo: string; descricao: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  {
    id: 'texto',
    titulo: 'Texto',
    descricao: 'Leitura detalhada para ler no seu ritmo.',
    icone: 'document-text-outline',
  },
  {
    id: 'audio',
    titulo: 'Áudio',
    descricao: 'Narração envolvente para ouvir em qualquer momento.',
    icone: 'headset-outline',
  },
  {
    id: 'video',
    titulo: 'Vídeo',
    descricao: 'Experiência visual imersiva com animações.',
    icone: 'videocam-outline',
  },
];

export default function TelaFormato() {
  const { dados, toggleFormato } = useOnboarding();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const podeAvancar = dados.formatos.length > 0;

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          <ScrollView
            contentContainerStyle={estilos.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <ProgressIndicator total={3} atual={2} />
              <Text style={estilos.passo}>Passo 2 de 3</Text>
              <Text style={estilos.titulo}>Como prefere{"\n"}receber suas leituras?</Text>
              <Text style={estilos.subtitulo}>
                Cada leitura será entregue nos formatos escolhidos. Selecione um ou mais.
              </Text>
            </Animated.View>

            <View style={estilos.listaContainer}>
              {FORMATOS.map((formato, index) => {
                const selecionado = dados.formatos.includes(formato.id);
                return (
                  <Animated.View
                    key={formato.id}
                    style={{
                      opacity: fadeAnim,
                      transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + index * 0.2)) }],
                    }}
                  >
                    <Pressable
                      onPress={() => { Hapticos.impactoLeve(); toggleFormato(formato.id); }}
                      style={({ pressed }) => [
                        estilos.linha,
                        selecionado && estilos.linhaSelecionada,
                        { transform: [{ scale: pressed ? 0.98 : 1 }] },
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selecionado }}
                      accessibilityLabel={formato.titulo}
                    >
                      <View style={[estilos.iconeBox, selecionado && estilos.iconeBoxSel]}>
                        <Ionicons
                          name={formato.icone}
                          size={24}
                          color={selecionado ? Cores.acento : Cores.textoClaro}
                        />
                      </View>
                      <View style={estilos.linhaTextos}>
                        <Text style={[estilos.linhaTitulo, selecionado && { color: Cores.acento }]}>
                          {formato.titulo}
                        </Text>
                        <Text style={estilos.linhaDescricao}>{formato.descricao}</Text>
                      </View>
                      <Ionicons
                        name={selecionado ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={selecionado ? Cores.acento : Cores.textoSecundario}
                      />
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>

            <View style={estilos.dicaContainer}>
              <Text style={estilos.dica}>
                💡 Dica: Selecione todos para ter a experiência completa!
              </Text>
            </View>
          </ScrollView>

          <View style={estilos.footer}>
            <View style={estilos.footerBotoes}>
              <Button
                variante="ghost"
                label="Voltar"
                icone="arrow-back"
                posicaoIcone="left"
                onPress={() => router.back()}
              />
              <View style={{ flex: 1, marginLeft: Espacamento.sm }}>
                <Button
                  variante="primary"
                  label="Próximo"
                  icone="arrow-forward"
                  posicaoIcone="right"
                  larguraTotal
                  disabled={!podeAvancar}
                  onPress={() => router.push('/onboarding/intencao')}
                />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Espacamento.lg },
  scrollContent: { paddingBottom: Espacamento.md },
  header: { paddingTop: Espacamento.md, paddingBottom: Espacamento.lg },
  passo: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.acento,
    textAlign: 'center',
    marginTop: Espacamento.md,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 26,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
    marginTop: Espacamento.sm,
    lineHeight: 34,
  },
  subtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginTop: Espacamento.sm,
    lineHeight: 20,
  },
  listaContainer: { gap: Espacamento.sm },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
  },
  linhaSelecionada: {
    borderColor: Cores.acento,
    borderWidth: 2,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
  iconeBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(88, 117, 101, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Espacamento.md,
  },
  iconeBoxSel: { backgroundColor: 'rgba(212, 175, 55, 0.12)' },
  linhaTextos: { flex: 1 },
  linhaTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  linhaDescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    marginTop: 2,
    lineHeight: 16,
  },
  dicaContainer: { paddingVertical: Espacamento.md },
  dica: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.acento,
    textAlign: 'center',
    opacity: 0.7,
  },
  footer: { paddingVertical: Espacamento.md, paddingBottom: Espacamento.lg },
  footerBotoes: { flexDirection: 'row', alignItems: 'center' },
});
