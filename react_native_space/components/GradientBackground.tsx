import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Cores } from '../constants/colors';

interface Props {
  children: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
}

export function GradientBackground({ children, colors, style }: Props) {
  const coresGradiente = colors ?? Cores.gradienteFundo;

  return (
    <LinearGradient
      colors={coresGradiente}
      style={[estilos.container, style]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
  },
});
