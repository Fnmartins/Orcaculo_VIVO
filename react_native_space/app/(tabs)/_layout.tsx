import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Cores.acento,
        tabBarInactiveTintColor: 'rgba(245, 240, 232, 0.4)',
        tabBarStyle: {
          backgroundColor: 'rgba(26, 26, 46, 0.95)',
          borderTopColor: 'rgba(212, 175, 55, 0.15)',
          borderTopWidth: 1,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
            },
            android: { elevation: 12 },
            default: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
            },
          }),
        },
        tabBarLabelStyle: {
          fontFamily: Fontes.corpo,
          fontSize: 11,
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          tabBarButtonTestID: 'tab-home',
        }}
      />
      <Tabs.Screen
        name="consultas"
        options={{
          title: 'Consultas',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="crystal-ball" size={size} color={color} />
          ),
          tabBarButtonTestID: 'tab-consultas',
        }}
      />
      <Tabs.Screen
        name="jornada"
        options={{
          title: 'Jornada',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
          tabBarButtonTestID: 'tab-jornada',
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          tabBarButtonTestID: 'tab-perfil',
        }}
      />
    </Tabs>
  );
}
