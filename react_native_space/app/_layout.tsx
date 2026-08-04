import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GradientBackground } from '../components/GradientBackground';
import { Loading } from '../components/Loading';
import { AuthProvider } from '../contexts/AuthContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

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
        <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: '#1A1A2E' },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}
