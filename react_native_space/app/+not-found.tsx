import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Button } from '../components/Button';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';

export default function NaoEncontrado() {
  return (
    <GradientBackground>
      <View style={estilos.container}>
        <Text style={estilos.codigo}>404</Text>
        <Text style={estilos.titulo}>Página não encontrada</Text>
        <Text style={estilos.descricao}>
          Os astros não conseguiram encontrar esta página.
        </Text>
        <Button
          variante="outline"
          label="Voltar ao início"
          icone="arrow-back"
          posicaoIcone="left"
          onPress={() => router.replace('/')}
        />
      </View>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  codigo: {
    fontFamily: Fontes.titulo,
    fontSize: 72,
    fontWeight: '700',
    color: Cores.acento,
    opacity: 0.3,
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 24,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginTop: 8,
    marginBottom: 8,
  },
  descricao: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginBottom: 32,
  },
});
