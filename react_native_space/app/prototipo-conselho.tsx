import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Fontes } from '../constants/typography';

const P = {
  fundo: '#F7F3EA', superficie: '#FFFCF6', verdeSuave: '#E6EEE5',
  tinta: '#24312D', texto: '#59665F', verde: '#587565', verdeEscuro: '#365247',
  terracota: '#B86F55', dourado: '#B58B46', azul: '#6E8390', borda: '#DED9CC', branco: '#FFFFFF',
};

const intencoes = [
  ['clareza', 'Clareza', 'sunny-outline'], ['amor', 'Amor', 'heart-outline'],
  ['trabalho', 'Trabalho', 'briefcase-outline'], ['eu', 'Eu mesmo', 'sparkles-outline'],
] as const;

const oraculos = [
  ['Búzios', 'Tradição e caminhos', 'grain', P.verde, 'material', '/consulta/buzios-preparo'],
  ['Tarot', 'Símbolos para refletir', 'cards-outline', P.terracota, 'material', '/consulta'],
  ['Numerologia', 'Ciclos e significados', 'calculator-outline', P.azul, 'ion', '/numerologia'],
  ['Mapa Astral', 'Leitura do seu céu', 'planet-outline', P.dourado, 'ion', '/mapa-astral'],
] as const;

const decisoes = [
  ['eye-outline', 'Menos peso visual', 'Fundo claro e superfícies opacas substituem o excesso de gradientes escuros.'],
  ['navigate-outline', 'Caminho mais curto', 'A intenção escolhida gera uma recomendação antes da lista completa.'],
  ['accessibility-outline', 'Acesso mais fácil', 'Contraste, toques amplos e ações escritas de forma direta.'],
  ['leaf-outline', 'Mística com calma', 'A identidade permanece nos símbolos, sem competir com o conteúdo.'],
] as const;

export function HomeAurora({ mostrarConselho = false }: { mostrarConselho?: boolean }) {
  const [intencao, setIntencao] = useState('clareza');
  const largo = useWindowDimensions().width >= 720;

  return (
    <View style={s.pagina}>
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={[s.conteudo, largo && s.conteudoLargo]}>
            {mostrarConselho && <View style={s.barraPrototipo}>
              <View style={s.aviso}><View style={s.ponto} /><Text style={s.avisoTexto}>PROTÓTIPO DO CONSELHO</Text></View>
              <Pressable onPress={() => router.replace('/(tabs)')} accessibilityRole="button" style={s.verAtual}>
                <Ionicons name="swap-horizontal-outline" size={15} color={P.verdeEscuro} />
                <Text style={s.verAtualTexto}>Ver versão atual</Text>
              </Pressable>
            </View>}

            <View style={s.header}>
              <View><Text style={s.saudacao}>Um espaço para respirar e perceber</Text><Text style={s.marca}>Arcanus</Text></View>
              <View style={s.avatar}><Ionicons name="person-outline" size={21} color={P.verdeEscuro} /></View>
            </View>

            <View style={[s.hero, largo && s.heroLargo]}>
              <View style={s.heroTexto}>
                <Text style={s.eyebrow}>SUA PAUSA DE HOJE</Text>
                <Text style={s.heroTitulo}>O que você deseja compreender agora?</Text>
                <Text style={s.heroApoio}>Escolha uma intenção. Nós sugerimos uma experiência simples para começar.</Text>
                <View style={s.chips}>
                  {intencoes.map(([id, label, icon]) => {
                    const ativa = intencao === id;
                    return <Pressable key={id} onPress={() => setIntencao(id)} accessibilityRole="button" accessibilityState={{ selected: ativa }} style={({ pressed }) => [s.chip, ativa && s.chipAtiva, pressed && s.pressed]}>
                      <Ionicons name={icon} size={16} color={ativa ? P.branco : P.verdeEscuro} />
                      <Text style={[s.chipTexto, ativa && s.chipTextoAtivo]}>{label}</Text>
                    </Pressable>;
                  })}
                </View>
                <Pressable onPress={() => router.push(intencao === 'eu' ? '/leitura-do-dia' : '/consulta')} accessibilityRole="button" style={({ pressed }) => [s.cta, pressed && s.pressed]}>
                  <View><Text style={s.ctaLabel}>RECOMENDAÇÃO PARA VOCÊ</Text><Text style={s.ctaTitulo}>{intencao === 'eu' ? 'Mensagem do dia' : 'Leitura breve de Tarot'}</Text></View>
                  <View style={s.ctaSeta}><Ionicons name="arrow-forward" size={20} color={P.verdeEscuro} /></View>
                </Pressable>
              </View>
              <View style={s.imagem}>
                <Image source={require('../assets/mesa-buzios.jpg')} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                <View style={s.filtro} />
                <View style={s.legenda}><Text style={s.legendaTitulo}>Símbolos com significado</Text><Text style={s.legendaTexto}>Com contexto, cuidado e respeito.</Text></View>
              </View>
            </View>

            <View style={s.secaoHeader}><View><Text style={s.secaoTitulo}>Escolha seu oráculo</Text><Text style={s.secaoApoio}>Cada método tem linguagem e propósito próprios.</Text></View><Pressable onPress={() => router.push('/(tabs)/consultas')} accessibilityRole="button"><Text style={s.verTodos}>Ver todos</Text></Pressable></View>
            <View style={s.grid}>
              {oraculos.map(([titulo, apoio, icon, cor, lib, rota]) => {
                const Icon = lib === 'material' ? MaterialCommunityIcons : Ionicons;
                return <Pressable key={titulo} onPress={() => router.push(rota)} accessibilityRole="button" style={({ pressed }) => [s.card, { width: largo ? '48.7%' : '48%' }, pressed && s.pressed]}>
                  <View style={[s.cardIcone, { backgroundColor: `${cor}18` }]}><Icon name={icon as never} size={27} color={cor} /></View>
                  <Text style={s.cardTitulo}>{titulo}</Text><Text style={s.cardApoio}>{apoio}</Text>
                  <Ionicons name="arrow-forward-circle-outline" size={21} color={cor} style={s.cardSeta} />
                </Pressable>;
              })}
            </View>

            <Pressable onPress={() => router.push('/rituais/meditacao')} accessibilityRole="button" style={({ pressed }) => [s.ritual, pressed && s.pressed]}>
              <View style={s.ritualIcone}><Ionicons name="leaf-outline" size={26} color={P.verdeEscuro} /></View>
              <View style={s.ritualTexto}><Text style={s.ritualEyebrow}>RITUAL GUIADO · 10 MIN</Text><Text style={s.ritualTitulo}>Chegue com calma à sua leitura</Text><Text style={s.ritualApoio}>Respiração e intenção em um percurso curto.</Text></View>
              <Ionicons name="chevron-forward" size={22} color={P.verdeEscuro} />
            </Pressable>

            {mostrarConselho && <View style={s.conselho}>
              <Text style={s.eyebrow}>SÍNTESE DO CONSELHO</Text><Text style={s.conselhoTitulo}>Por que esta proposta parece mais leve?</Text>
              <View style={s.decisoes}>{decisoes.map(([icon, titulo, apoio]) => <View key={titulo} style={[s.decisao, largo && s.decisaoLarga]}>
                <Ionicons name={icon as never} size={21} color={P.terracota} /><View style={s.decisaoTexto}><Text style={s.decisaoTitulo}>{titulo}</Text><Text style={s.decisaoApoio}>{apoio}</Text></View>
              </View>)}</View>
              <Text style={s.paletaTitulo}>PALETA “AURORA SERENA”</Text><View style={s.paleta}>{[P.fundo, P.verde, P.verdeEscuro, P.terracota, P.dourado, P.azul].map(cor => <View key={cor} style={[s.amostra, { backgroundColor: cor }]} />)}</View>
              <Text style={s.nota}>Conselho conceitual inspirado em princípios públicos de usabilidade, inclusão e design de produto. Não representa participação ou endosso das referências citadas.</Text>
            </View>}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default function PrototipoConselho() {
  return <HomeAurora mostrarConselho />;
}

const s = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: P.fundo }, safe: { flex: 1 }, scroll: { paddingBottom: 48 },
  conteudo: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20 }, conteudoLargo: { maxWidth: 920, paddingHorizontal: 32 },
  barraPrototipo: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 8 }, aviso: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 }, ponto: { width: 7, height: 7, borderRadius: 4, backgroundColor: P.terracota }, avisoTexto: { fontFamily: Fontes.corpoNegrito, fontSize: 9, letterSpacing: 1, color: P.texto }, verAtual: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, borderRadius: 19, backgroundColor: P.superficie, borderWidth: 1, borderColor: P.borda }, verAtualTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 10, color: P.verdeEscuro },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 }, saudacao: { fontFamily: Fontes.corpo, fontSize: 12, color: P.texto }, marca: { fontFamily: Fontes.titulo, fontSize: 27, color: P.tinta }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: P.verdeSuave, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 28, overflow: 'hidden', backgroundColor: P.superficie, borderWidth: 1, borderColor: P.borda, marginBottom: 32 }, heroLargo: { flexDirection: 'row' }, heroTexto: { flex: 1.25, padding: 24 },
  eyebrow: { fontFamily: Fontes.corpoNegrito, fontSize: 10, letterSpacing: 1.5, color: P.terracota, marginBottom: 9 }, heroTitulo: { fontFamily: Fontes.titulo, fontSize: 28, lineHeight: 35, color: P.tinta }, heroApoio: { fontFamily: Fontes.corpo, fontSize: 14, lineHeight: 21, color: P.texto, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 }, chip: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: P.borda, backgroundColor: P.branco }, chipAtiva: { backgroundColor: P.verdeEscuro, borderColor: P.verdeEscuro }, chipTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 12, color: P.verdeEscuro }, chipTextoAtivo: { color: P.branco }, pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  cta: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, padding: 14, paddingLeft: 16, borderRadius: 18, backgroundColor: '#DDE9DC' }, ctaLabel: { fontFamily: Fontes.corpoNegrito, fontSize: 8, letterSpacing: 1.1, color: P.verde }, ctaTitulo: { fontFamily: Fontes.corpoNegrito, fontSize: 15, color: P.tinta, marginTop: 3 }, ctaSeta: { width: 38, height: 38, borderRadius: 19, backgroundColor: P.branco, alignItems: 'center', justifyContent: 'center' },
  imagem: { minHeight: 230, flex: 0.9, justifyContent: 'flex-end' }, filtro: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,43,37,0.20)' }, legenda: { margin: 16, padding: 14, borderRadius: 15, backgroundColor: 'rgba(255,252,246,0.92)' }, legendaTitulo: { fontFamily: Fontes.corpoNegrito, fontSize: 13, color: P.tinta }, legendaTexto: { fontFamily: Fontes.corpo, fontSize: 11, color: P.texto, marginTop: 2 },
  secaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }, secaoTitulo: { fontFamily: Fontes.titulo, fontSize: 22, color: P.tinta }, secaoApoio: { fontFamily: Fontes.corpo, fontSize: 12, color: P.texto, marginTop: 3 }, verTodos: { fontFamily: Fontes.corpoNegrito, fontSize: 11, color: P.verde },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }, card: { minHeight: 166, padding: 16, borderRadius: 20, backgroundColor: P.superficie, borderWidth: 1, borderColor: P.borda }, cardIcone: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, cardTitulo: { fontFamily: Fontes.titulo, fontSize: 18, color: P.tinta }, cardApoio: { fontFamily: Fontes.corpo, fontSize: 11, color: P.texto, marginTop: 3 }, cardSeta: { position: 'absolute', right: 13, bottom: 13 },
  ritual: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24, padding: 18, borderRadius: 22, backgroundColor: P.verdeSuave }, ritualIcone: { width: 50, height: 50, borderRadius: 25, backgroundColor: P.superficie, alignItems: 'center', justifyContent: 'center' }, ritualTexto: { flex: 1 }, ritualEyebrow: { fontFamily: Fontes.corpoNegrito, fontSize: 8, letterSpacing: 1.1, color: P.verde }, ritualTitulo: { fontFamily: Fontes.corpoNegrito, fontSize: 14, color: P.tinta, marginTop: 3 }, ritualApoio: { fontFamily: Fontes.corpo, fontSize: 11, color: P.texto, marginTop: 2 },
  conselho: { marginTop: 32, padding: 22, borderRadius: 26, backgroundColor: '#F1E7DB' }, conselhoTitulo: { fontFamily: Fontes.titulo, fontSize: 22, color: P.tinta, marginBottom: 18 }, decisoes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 }, decisao: { width: '100%', flexDirection: 'row', gap: 11 }, decisaoLarga: { width: '48%' }, decisaoTexto: { flex: 1 }, decisaoTitulo: { fontFamily: Fontes.corpoNegrito, fontSize: 13, color: P.tinta }, decisaoApoio: { fontFamily: Fontes.corpo, fontSize: 11, lineHeight: 16, color: P.texto, marginTop: 2 },
  paletaTitulo: { fontFamily: Fontes.corpoNegrito, fontSize: 9, letterSpacing: 1.2, color: P.texto, marginTop: 22, marginBottom: 9 }, paleta: { flexDirection: 'row', gap: 8 }, amostra: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(36,49,45,0.12)' }, nota: { fontFamily: Fontes.corpo, fontSize: 9, lineHeight: 14, color: P.texto, marginTop: 16 },
});
