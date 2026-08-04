import { Platform } from 'react-native';

// Famílias de fontes com fallback por plataforma
const fonteFallbackSerif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, serif',
  default: 'serif',
});

const fonteFallbackSans = Platform.select({
  ios: 'System',
  android: 'Roboto',
  web: 'Arial, sans-serif',
  default: 'System',
});

export const Fontes = {
  titulo: 'PlayfairDisplay_700Bold',
  tituloSemibold: 'PlayfairDisplay_600SemiBold',
  corpo: 'Nunito_400Regular',
  corpoNegrito: 'Nunito_700Bold',
  corpoSemibold: 'Nunito_600SemiBold',
  // Fallbacks
  tituloFallback: fonteFallbackSerif ?? 'serif',
  corpoFallback: fonteFallbackSans ?? 'System',
} as const;

export const EscalaTipo = {
  display: { fontFamily: Fontes.titulo, fontSize: 36, fontWeight: '700' as const },
  h1: { fontFamily: Fontes.titulo, fontSize: 28, fontWeight: '700' as const },
  h2: { fontFamily: Fontes.tituloSemibold, fontSize: 24, fontWeight: '600' as const },
  h3: { fontFamily: Fontes.tituloSemibold, fontSize: 20, fontWeight: '600' as const },
  corpo: { fontFamily: Fontes.corpo, fontSize: 16 },
  corpoPequeno: { fontFamily: Fontes.corpo, fontSize: 14 },
  legenda: { fontFamily: Fontes.corpo, fontSize: 12 },
  botao: { fontFamily: Fontes.corpoNegrito, fontSize: 16, fontWeight: '700' as const },
} as const;
