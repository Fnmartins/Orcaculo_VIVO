import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { Button } from '../../components/Button';
import { SelectionCard } from '../../components/SelectionCard';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { useOnboarding, type IntencaoUsuario } from '../../contexts/OnboardingContext';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';

const INTENCOES: { id: IntencaoUsuario; titulo: string; descricao: string; icone: string; iconeLib: 'ionicons' | 'material' }[] = [
  {
    id: 'amor',
    titulo: 'Amor',
    descricao: 'Relacionamentos e vida afetiva',
    icone: 'heart-outline',
    iconeLib: 'ionicons',
  },
  {
    id: 'trabalho',
    titulo: 'Trabalho',
    descricao: 'Carreira e realizações profissionais',
    icone: 'briefcase-outline',
    iconeLib: 'ionicons',
  },
  {
    id: 'saude',
    titulo: 'Saúde',
    descricao: 'Bem-estar físico e mental',
    icone: 'fitness-outline',
    iconeLib: 'ionicons',
  },
  {
    id: 'autoconhecimento',
    titulo: 'Autoconhecimento',
    descricao: 'Evolução pessoal e espiritual',
    icone: 'eye-outline',
    iconeLib: 'ionicons',
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro',
    descricao: 'Prosperidade e abundância',
    icone: 'cash-outline',
    iconeLib: 'ionicons',
  },
  {
    id: 'espiritualidade',
    titulo: 'Espiritualidade',
    descricao: 'Conexão com o sagrado',
    icone: 'sparkles-outline',
    iconeLib: 'ionicons',
  },
];

export default function TelaIntencao() {
  const { dados, toggleIntencao } = useOnboarding();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const podeAvancar = dados.intencoes.length > 0;

  const aoConcluir = () => {
    Hapticos.impactoPesado();
    router.replace('/(tabs)');
  };

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          {/* Header */}
          <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <ProgressIndicator total={3} atual={3} />
            <Text style={estilos.passo}>Passo 3 de 3</Text>
            <Text style={estilos.titulo}>Defina sua{"\n"}intenção</Text>
            <Text style={estilos.subtitulo}>
              O que busca neste momento da sua vida?
              Suas leituras serão personalizadas.
            </Text>
          </Animated.View>

          {/* Grid de opções */}
          <ScrollView
            style={estilos.scrollArea}
            contentContainerStyle={estilos.grid}
            showsVerticalScrollIndicator={false}
          >
            {INTENCOES.map((intencao, index) => (
              <Animated.View
                key={intencao.id}
                style={[estilos.gridItem, {
                  opacity: fadeAnim,
                  transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + index * 0.15)) }],
                }]}
              >
                <SelectionCard
                  titulo={intencao.titulo}
                  descricao={intencao.descricao}
                  icone={intencao.icone}
                  iconeLib={intencao.iconeLib}
                  selecionado={dados.intencoes.includes(intencao.id)}
                  onPress={() => toggleIntencao(intencao.id)}
                />
              </Animated.View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={estilos.footer}>
            <Text style={estilos.selecaoInfo}>
              {dados.intencoes.length === 0
                ? 'Selecione pelo menos 1 intenção'
                : `${dados.intencoes.length} selecionada${dados.intencoes.length > 1 ? 's' : ''}`}
            </Text>
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
                  label="Concluir ✨"
                  larguraTotal
                  disabled={!podeAvancar}
                  onPress={aoConcluir}
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
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Espacamento.lg,
  },
  header: {
    paddingTop: Espacamento.md,
    paddingBottom: Espacamento.md,
  },
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
    fontSize: 28,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
    marginTop: Espacamento.sm,
    lineHeight: 36,
  },
  subtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginTop: Espacamento.sm,
    lineHeight: 20,
  },
  scrollArea: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: Espacamento.md,
  },
  gridItem: {
    width: '48%',
    marginBottom: Espacamento.md,
  },
  footer: {
    paddingVertical: Espacamento.md,
    paddingBottom: Espacamento.lg,
  },
  selecaoInfo: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginBottom: Espacamento.sm,
  },
  footerBotoes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
