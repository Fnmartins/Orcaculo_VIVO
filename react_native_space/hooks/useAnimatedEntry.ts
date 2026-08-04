import { useRef, useEffect, useState, useCallback } from 'react';
import { Animated, AccessibilityInfo } from 'react-native';

interface OpcoesAnimacao {
  duracao?: number;
  atraso?: number;
  deslocamentoY?: number;
  deslocamentoX?: number;
  escalaInicial?: number;
}

export function useAnimatedEntry(opcoes: OpcoesAnimacao = {}) {
  const {
    duracao = 400,
    atraso = 0,
    deslocamentoY = 20,
    deslocamentoX = 0,
    escalaInicial = 1,
  } = opcoes;

  const opacidade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(deslocamentoY)).current;
  const translateX = useRef(new Animated.Value(deslocamentoX)).current;
  const escala = useRef(new Animated.Value(escalaInicial)).current;
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

  const iniciar = useCallback(() => {
    if (movimentoReduzido) {
      opacidade.setValue(1);
      translateY.setValue(0);
      translateX.setValue(0);
      escala.setValue(1);
      return;
    }

    Animated.parallel([
      Animated.timing(opacidade, {
        toValue: 1,
        duration: duracao,
        delay: atraso,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: duracao,
        delay: atraso,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: duracao,
        delay: atraso,
        useNativeDriver: true,
      }),
      Animated.spring(escala, {
        toValue: 1,
        damping: 12,
        stiffness: 100,
        delay: atraso,
        useNativeDriver: true,
      }),
    ]).start();
  }, [movimentoReduzido, duracao, atraso, opacidade, translateY, translateX, escala]);

  const estiloAnimado = {
    opacity: opacidade,
    transform: [
      { translateY },
      { translateX },
      { scale: escala },
    ],
  };

  return { estiloAnimado, iniciar, movimentoReduzido, opacidade, escala, translateY };
}
