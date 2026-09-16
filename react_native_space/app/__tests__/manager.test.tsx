import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockSetParams = jest.fn();
let mockParams: { aba?: string } = {};
let mockIsSuper = true;

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => false,
    setParams: (...args: unknown[]) => mockSetParams(...args),
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/GradientBackground', () => {
  const { View } = require('react-native');
  return { GradientBackground: View };
});
jest.mock('../../hooks/useAdmin', () => ({ useIsSuperAdmin: () => mockIsSuper }));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ recarregarPerfil: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('../../utils/alerta', () => ({ mostrarAlerta: jest.fn() }));
jest.mock('../../components/manager/AbaPlanos', () => {
  const { Text } = require('react-native');
  return { AbaPlanos: () => <Text>conteudo-planos</Text> };
});
jest.mock('../../components/manager/AbaRoadmap', () => {
  const { Text } = require('react-native');
  return { AbaRoadmap: () => <Text>conteudo-roadmap</Text> };
});
jest.mock('../../components/manager/AbaAcessos', () => {
  const { Text } = require('react-native');
  return { AbaAcessos: () => <Text>conteudo-acessos</Text> };
});

import Manager from '../manager';

beforeEach(() => {
  mockParams = {};
  mockIsSuper = true;
  mockSetParams.mockClear();
});

describe('Painel (/manager)', () => {
  it('quem não é super-admin vê acesso restrito e nenhuma aba', () => {
    mockIsSuper = false;
    render(<Manager />);
    expect(screen.getByText('Acesso restrito.')).toBeTruthy();
    expect(screen.queryByText('conteudo-planos')).toBeNull();
  });

  it('abre em Planos sem ?aba=', () => {
    render(<Manager />);
    expect(screen.getByText('conteudo-planos')).toBeTruthy();
  });

  it('abre a aba do ?aba=', () => {
    mockParams = { aba: 'acessos' };
    render(<Manager />);
    expect(screen.getByText('conteudo-acessos')).toBeTruthy();
  });

  it('trocar de aba grava o ?aba= na URL', () => {
    render(<Manager />);
    fireEvent.press(screen.getByRole('tab', { name: 'Roadmap' }));
    expect(mockSetParams).toHaveBeenCalledWith({ aba: 'roadmap' });
  });
});
