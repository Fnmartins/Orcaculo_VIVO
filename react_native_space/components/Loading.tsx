import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';

interface Props {
  mensagem?: string;
  tamanho?: 'small' | 'large';
}

export function Loading({ mensagem = 'Consultando os astros', tamanho = 'large' }: Props) {
  const escalaAnim = useRef(new Animated.Value(0.9)).current;
  const opacidadeAnim = useRef(new Animated.Value(0.5)).current;
  const [pontos, setPontos] = useState('');
  const [movimentoReduzido, setMovimentoReduzido] = useState(false);

  useEffect(() => {
    const verificar = async () => {
      try {
        const reduzido = await AccessibilityInfo?.isReduceMotionEnabled?.();
        setMovimentoReduzido(reduzido ?? false);
      } catch {
        setMovimentoReduzido(false);
      }
    };
    verificar();
  }, []);

  // Animação de pulsação
  useEffect(() => {
    if (movimentoReduzido) return;
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(escalaAnim, { toValue: 1.1, duration: 750, useNativeDriver: true }),
          Animated.timing(opacidadeAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(escalaAnim, { toValue: 0.9, duration: 750, useNativeDriver: true }),
          Animated.timing(opacidadeAnim, { toValue: 0.5, duration: 750, useNativeDriver: true }),
        ]),
      ])
    );
    animacao.start();
    return () => animacao.stop();
  }, [movimentoReduzido, escalaAnim, opacidadeAnim]);

  // Animação dos pontos
  useEffect(() => {
    const intervalo = setInterval(() => {
      setPontos((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(intervalo);
  }, []);

  const tamanhoIcone = tamanho === 'small' ? 40 : 60;

  return (
    <View
      style={estilos.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`${mensagem}, carregando`}
    >
      <Animated.View
        style={{
          transform: [{ scale: movimentoReduzido ? 1 : escalaAnim }],
          opacity: movimentoReduzido ? 1 : opacidadeAnim,
        }}
      >
        <MaterialCommunityIcons
          name="eye-outline"
          size={tamanhoIcone}
          color={Cores.acento}
        />
      </Animated.View>
      {tamanho === 'large' && (
        <Text style={estilos.texto}>
          {mensagem}{pontos}
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.acento,
    opacity: 0.7,
    marginTop: 16,
  },
});
