import React from 'react';
import { Stack } from 'expo-router';

export default function MapaAstralLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#1A1A2E' },
      }}
    />
  );
}
