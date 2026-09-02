import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientBackground } from './GradientBackground';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento } from '../constants/spacing';

export interface SecaoLegal {
  titulo: string;
  paragrafos: string[];
}

interface Props {
  titulo: string;
  atualizadoEm: string;
  intro?: string;
  secoes: SecaoLegal[];
}

/**
 * Layout compartilhado das paginas legais (Termos de Uso, Politica de
 * Privacidade). Cabecalho com voltar + conteudo rolavel em secoes numeradas.
 */
export function PaginaLegal({ titulo, atualizadoEm, intro, secoes }: Props) {
  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safe} edges={['top']}>
        <View style={estilos.header}>
          <Pressable
            onPress={voltar}
            style={estilos.iconeVoltar}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back" size={24} color={Cores.textoClaro} />
          </Pressable>
          <Text style={estilos.headerTitulo} numberOfLines={1}>{titulo}</Text>
          <View style={estilos.iconeVoltar} />
        </View>

        <ScrollView
          contentContainerStyle={estilos.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={estilos.h1}>{titulo}</Text>
          <Text style={estilos.atualizado}>Última atualização: {atualizadoEm}</Text>
          {intro ? <Text style={estilos.intro}>{intro}</Text> : null}

          {secoes.map((secao, i) => (
            <View key={i} style={estilos.secao}>
              <Text style={estilos.h2}>{`${i + 1}. ${secao.titulo}`}</Text>
              {secao.paragrafos.map((par, j) => (
                <Text key={j} style={estilos.paragrafo}>{par}</Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Espacamento.md,
    paddingVertical: Espacamento.sm,
  },
  iconeVoltar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitulo: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fontes.corpoSemibold,
    fontSize: 16,
    color: Cores.textoClaro,
  },
  scroll: {
    paddingHorizontal: Espacamento.lg,
    paddingBottom: Espacamento.xxl,
  },
  h1: {
    fontFamily: Fontes.titulo,
    fontSize: 28,
    color: Cores.textoClaro,
    marginTop: Espacamento.sm,
  },
  atualizado: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    marginTop: 4,
    marginBottom: Espacamento.md,
  },
  intro: {
    fontFamily: Fontes.corpo,
    fontSize: 15,
    lineHeight: 23,
    color: Cores.textoClaro,
    marginBottom: Espacamento.lg,
  },
  secao: { marginBottom: Espacamento.lg },
  h2: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 16,
    color: Cores.acento,
    marginBottom: Espacamento.xs,
  },
  paragrafo: {
    fontFamily: Fontes.corpo,
    fontSize: 14.5,
    lineHeight: 23,
    color: Cores.textoSecundario,
    marginBottom: Espacamento.sm,
  },
});
