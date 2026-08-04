import React, { useRef, useCallback } from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  Animated,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Cores } from '../constants/colors';
import { RaioBorda, Espacamento } from '../constants/spacing';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: Props) {
  const escalaAnim = useRef(new Animated.Value(1)).current;

  const aoPresionar = useCallback(() => {
    if (!onPress) return;
    Animated.spring(escalaAnim, {
      toValue: 0.98,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [onPress, escalaAnim]);

  const aoSoltar = useCallback(() => {
    Animated.spring(escalaAnim, {
      toValue: 1,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [escalaAnim]);

  const conteudo = (
    <View style={[estilos.container, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: escalaAnim }] }}>
        <Pressable
          onPressIn={aoPresionar}
          onPressOut={aoSoltar}
          onPress={onPress}
          accessibilityRole="button"
        >
          {conteudo}
        </Pressable>
      </Animated.View>
    );
  }

  return conteudo;
}

const estilos = StyleSheet.create({
  container: {
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.lg - 4, // 20px
    ...Platform.select({
      ios: {
        shadowColor: Cores.acento,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      default: {
        shadowColor: Cores.acento,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
    }),
  },
});
