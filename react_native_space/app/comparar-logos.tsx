import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientBackground } from '../components/GradientBackground';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';

const OPCOES = [
  {
    id: 'mago',
    nome: 'Mago + Bola',
    desc: 'Mago encapuzado segurando a bola de cristal. Premium e dramático.',
    img: require('../assets/logo-mago.png'),
    tags: ['Dramático', 'Místico', 'Premium'],
  },
  {
    id: 'v1',
    nome: 'Bola Flutuante',
    desc: 'Minimalista, beige cremoso, constelação dourada por dentro.',
    img: require('../assets/logo-bola-v1.png'),
    tags: ['Clean', 'Ícone', 'Minimal'],
  },
  {
    id: 'v2',
    nome: 'Mãos com Bola',
    desc: 'Mãos elegantes segurando a bola, vibe sage/wellness.',
    img: require('../assets/logo-bola-v2.png'),
    tags: ['Wellness', 'Editorial', 'Verde'],
  },
  {
    id: 'v3',
    nome: 'Aquarela Celestial',
    desc: 'Aquarela azul/bege, estrela central, fumaça espiralada.',
    img: require('../assets/logo-bola-v3.png'),
    tags: ['Etéreo', 'Splash', 'Aquarela'],
  },
];

export default function CompararLogos() {
  return (
    <GradientBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.back} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={Cores.textoClaro} />
          </Pressable>
          <Text style={s.titulo}>Comparar Logos</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.intro}>
            Veja cada opção em tamanhos diferentes (ícone, médio e splash).
            Me diga depois qual prefere — eu aplico no app.
          </Text>

          {OPCOES.map((opc) => (
            <View key={opc.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardNome}>{opc.nome}</Text>
                <View style={s.tags}>
                  {opc.tags.map((t) => (
                    <View key={t} style={s.tag}><Text style={s.tagTxt}>{t}</Text></View>
                  ))}
                </View>
              </View>
              <Text style={s.cardDesc}>{opc.desc}</Text>

              {/* Tamanho splash/hero */}
              <View style={s.previewBig}>
                <Image source={opc.img} style={s.imgBig} resizeMode="contain" />
              </View>

              {/* Tamanhos médio + ícone lado a lado */}
              <View style={s.row}>
                <View style={s.previewMed}>
                  <Image source={opc.img} style={s.imgMed} resizeMode="contain" />
                  <Text style={s.legenda}>Médio (120px)</Text>
                </View>
                <View style={s.previewIcon}>
                  <View style={s.iconWrap}>
                    <Image source={opc.img} style={s.imgIcon} resizeMode="cover" />
                  </View>
                  <Text style={s.legenda}>Ícone (64px)</Text>
                </View>
              </View>

              <Text style={s.codigo}>ID: {opc.id}</Text>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Espacamento.lg,
    paddingVertical: Espacamento.md,
  },
  back: { width: 32, height: 32, justifyContent: 'center' },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 18,
    fontWeight: '700',
    color: Cores.textoClaro,
  },
  scroll: { paddingHorizontal: Espacamento.lg, paddingBottom: Espacamento.lg },
  intro: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginBottom: Espacamento.lg,
    lineHeight: 19,
  },
  card: {
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginBottom: Espacamento.lg,
  },
  cardHeader: { marginBottom: 6 },
  cardNome: {
    fontFamily: Fontes.titulo,
    fontSize: 17,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginBottom: 6,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RaioBorda.full,
  },
  tagTxt: {
    fontFamily: Fontes.corpo,
    fontSize: 10,
    color: Cores.acento,
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginTop: 4,
    marginBottom: Espacamento.md,
    lineHeight: 18,
  },
  previewBig: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: RaioBorda.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: Espacamento.md,
  },
  imgBig: { width: '100%', height: '100%' },
  row: { flexDirection: 'row', gap: Espacamento.md, alignItems: 'center' },
  previewMed: { flex: 1, alignItems: 'center' },
  imgMed: {
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  previewIcon: { flex: 1, alignItems: 'center' },
  iconWrap: {
    width: 64, height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  imgIcon: { width: '100%', height: '100%' },
  legenda: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    marginTop: 6,
  },
  codigo: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.acento,
    marginTop: Espacamento.sm,
    textAlign: 'right',
    opacity: 0.7,
  },
});
