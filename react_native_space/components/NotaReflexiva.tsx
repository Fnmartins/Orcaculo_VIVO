import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';

export function NotaReflexiva() {
  return (
    <View style={estilos.container} accessibilityRole="summary">
      <Ionicons name="compass-outline" size={18} color={Cores.acento} />
      <Text style={estilos.texto}>
        Esta é uma leitura simbólica para reflexão e autoconhecimento. Suas escolhas continuam sendo suas.
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Espacamento.sm,
    marginTop: Espacamento.lg,
    padding: Espacamento.md,
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.18)',
    backgroundColor: 'rgba(212, 175, 55, 0.06)',
  },
  texto: {
    flex: 1,
    fontFamily: Fontes.corpo,
    fontSize: 12,
    lineHeight: 18,
    color: Cores.textoSecundario,
  },
});
