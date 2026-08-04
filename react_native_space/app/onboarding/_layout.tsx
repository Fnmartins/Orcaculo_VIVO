import React from 'react';
import { Stack } from 'expo-router';
import { OnboardingProvider } from '../../contexts/OnboardingContext';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#1A1A2E' },
        }}
      />
    </OnboardingProvider>
  );
}
