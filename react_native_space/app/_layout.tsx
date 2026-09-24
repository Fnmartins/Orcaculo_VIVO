import React, { useEffect, useState, type ReactNode } from 'react';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GradientBackground } from '../components/GradientBackground';
import { Loading } from '../components/Loading';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { precisaMandarParaLogin } from '../utils/portaDeEntrada';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Trava de entrada. Sem ela, bastava abrir qualquer URL do app para estar
 * dentro: a splash mandava todo mundo para `/(tabs)` sem olhar sessão, e nenhum
 * layout conferia nada. Fica aqui, e não só na splash, porque link direto
 * (`/consulta`, `/manager`) não passa pela splash.
 */
function PortaDeEntrada({ children }: { children: ReactNode }) {
  const { sessao, carregando } = useAuth();
  const segmentos = useSegments();
  const raiz = segmentos[0];

  useEffect(() => {
    if (precisaMandarParaLogin(raiz, Boolean(sessao), carregando)) {
      router.replace('/welcome');
    }
  }, [raiz, sessao, carregando]);

  return <>{children}</>;
}

export default function LayoutRaiz() {
  const [fontesCarregadas, erroFontes] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_600SemiBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const [prontoParaExibir, setProntoParaExibir] = useState(false);

  useEffect(() => {
    if (fontesCarregadas || erroFontes) {
      SplashScreen.hideAsync().catch(() => {});
      setProntoParaExibir(true);
    }
  }, [fontesCarregadas, erroFontes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      setProntoParaExibir(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!prontoParaExibir) {
    return (
      <GradientBackground>
        <Loading mensagem="Carregando" />
      </GradientBackground>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <PortaDeEntrada>
          <StatusBar barStyle="dark-content" backgroundColor="#F7F3EA" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: '#F7F3EA' },
            }}
          />
        </PortaDeEntrada>
      </AuthProvider>
    </ErrorBoundary>
  );
}
