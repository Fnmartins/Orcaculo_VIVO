import { Platform } from 'react-native';

// Wrapper para haptics com fallback web
export const Hapticos = {
  async impactoLeve() {
    if (Platform.OS === 'web') return;
    try {
      const Haptics = await import('expo-haptics');
      await Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Light);
    } catch {}
  },
  async impactoMedio() {
    if (Platform.OS === 'web') return;
    try {
      const Haptics = await import('expo-haptics');
      await Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Medium);
    } catch {}
  },
  async impactoPesado() {
    if (Platform.OS === 'web') return;
    try {
      const Haptics = await import('expo-haptics');
      await Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Heavy);
    } catch {}
  },
  async selecao() {
    if (Platform.OS === 'web') return;
    try {
      const Haptics = await import('expo-haptics');
      await Haptics?.selectionAsync?.();
    } catch {}
  },
};
