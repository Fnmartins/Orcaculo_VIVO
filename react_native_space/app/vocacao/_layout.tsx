import React from 'react';
import { Stack } from 'expo-router';

export default function VocacaoLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F7F3EA' },
      }}
    />
  );
}
