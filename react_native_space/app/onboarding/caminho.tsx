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
import { useOnboarding, type CaminhoEspiritual } from '../../contexts/OnboardingContext';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';

const CAMINHOS: { id: CaminhoEspiritual; titulo: string; descricao: string; icone: string; iconeLib: 'ionicons' | 'material' }[] = [
  {
    id: 'buzios',
    titulo: 'Búzios',
    descricao: 'Sabedoria ancestral africana',
    icone: 'grain',
    iconeLib: 'material',
  },
  {
    id: 'tarot',
    titulo: 'Tarot',
    descricao: 'Cartas revelam seu caminho',
    icone: 'cards-outline',
    iconeLib: 'material',
  },
  {
    id: 'numerologia',
    titulo: 'Numerologia',
    descricao: 'O poder dos números',
    icone: 'calculator-outline',
    iconeLib: 'ionicons',
  },
  {
    id: 'mapa_astral',
    titulo: 'Mapa Astral',
    descricao: 'Estrelas guiam seu destino',
    icone: 'planet-outline',
    iconeLib: 'ionicons',
  },
  {
    id: 'cafe',
    titulo: 'Borra de Café',
    descricao: 'Leitura por IA de imagem',
    icone: 'cafe-outline',
    iconeLib: 'ionicons',
  },
  {
    id: 'quiromancia',
    titulo: 'Quiromancia',
    descricao: 'Linhas da mão reveladas',
    icone: 'hand-left-outline',
    iconeLib: 'ionicons',
  },
  {
    id: 'matriz_destino',
    titulo: 'Matriz do Destino',
    descricao: '22 arcanos do seu mapa',
    icone: 'star-david',
    iconeLib: 'material',
  },
  {
    id: 'lei_atracao',
    titulo: 'Lei da Atração',
    descricao: 'Manifeste seus desejos',
    icone: 'star-four-points',
    iconeLib: 'material',
  },
];

export default function TelaCaminho() {
  const { dados, toggleCaminho } = useOnboarding();
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

  const podeAvancar = dados.caminhos.length > 0;

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          {/* Header */}
          <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <ProgressIndicator total={3} atual={1} />
            <Text style={estilos.passo}>Passo 1 de 3</Text>
            <Text style={estilos.titulo}>Escolha seu{"\n"}caminho espiritual</Text>
            <Text style={estilos.subtitulo}>
              Selecione um ou mais métodos que deseja explorar.
              Você poderá alterar depois.
            </Text>
          </Animated.View>

          {/* Grid de opções */}
          <ScrollView
            style={estilos.scrollArea}
            contentContainerStyle={estilos.grid}
            showsVerticalScrollIndicator={false}
          >
            {CAMINHOS.map((caminho, index) => (
              <Animated.View
                key={caminho.id}
                style={[estilos.gridItem, {
                  opacity: fadeAnim,
                  transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + index * 0.15)) }],
                }]}
              >
                <SelectionCard
                  titulo={caminho.titulo}
                  descricao={caminho.descricao}
                  icone={caminho.icone}
                  iconeLib={caminho.iconeLib}
                  selecionado={dados.caminhos.includes(caminho.id)}
                  onPress={() => toggleCaminho(caminho.id)}
                />
              </Animated.View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={estilos.footer}>
            <Text style={estilos.selecaoInfo}>
              {dados.caminhos.length === 0
                ? 'Selecione pelo menos 1 caminho'
                : `${dados.caminhos.length} selecionado${dados.caminhos.length > 1 ? 's' : ''}`}
            </Text>
            <Button
              variante="primary"
              label="Próximo"
              icone="arrow-forward"
              posicaoIcone="right"
              larguraTotal
              disabled={!podeAvancar}
              onPress={() => router.push('/onboarding/formato')}
            />
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
});
