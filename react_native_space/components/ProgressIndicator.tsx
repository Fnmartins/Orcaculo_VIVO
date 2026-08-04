import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Cores } from '../constants/colors';
import { Espacamento } from '../constants/spacing';

interface Props {
  total: number;
  atual: number;
}

export function ProgressIndicator({ total, atual }: Props) {
  return (
    <View style={estilos.container} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: atual }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            estilos.ponto,
            i < atual ? estilos.pontoAtivo : estilos.pontoInativo,
            i < atual - 1 && estilos.pontoConcluido,
          ]}
        />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Espacamento.sm,
  },
  ponto: {
    height: 4,
    borderRadius: 2,
  },
  pontoAtivo: {
    width: 32,
    backgroundColor: Cores.acento,
  },
  pontoInativo: {
    width: 16,
    backgroundColor: 'rgba(245, 240, 232, 0.2)',
  },
  pontoConcluido: {
    backgroundColor: 'rgba(212, 175, 55, 0.5)',
  },
});
