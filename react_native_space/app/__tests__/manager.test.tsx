import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react-native';

const mockSetParams = jest.fn();
const mockReplace = jest.fn();
const mockRecarregarPerfil = jest.fn().mockResolvedValue(undefined);
const mockMostrarAlerta = jest.fn();
let mockParams: { aba?: string } = {};
let mockIsSuper = true;

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: (...args: unknown[]) => mockReplace(...args),
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
  useAuth: () => ({ recarregarPerfil: mockRecarregarPerfil }),
}));
jest.mock('../../utils/alerta', () => ({ mostrarAlerta: (...args: unknown[]) => mockMostrarAlerta(...args) }));
jest.mock('../../components/manager/AbaPlanos', () => {
  const { Text } = require('react-native');
  return { AbaPlanos: () => <Text>conteudo-planos</Text> };
});
jest.mock('../../components/manager/AbaRoadmap', () => {
  const { Text, Pressable } = require('react-native');
  return {
    AbaRoadmap: (props: { aoPerderAcesso: () => void }) => (
      <>
        <Text>conteudo-roadmap</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="perder-acesso"
          onPress={() => props.aoPerderAcesso()}
        >
          <Text>perder-acesso</Text>
        </Pressable>
      </>
    ),
  };
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
  mockReplace.mockClear();
  mockRecarregarPerfil.mockClear();
  mockMostrarAlerta.mockClear();
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

  it('ao perder acesso, avisa, recarrega o perfil e volta para o Perfil', async () => {
    mockParams = { aba: 'roadmap' };
    render(<Manager />);

    fireEvent.press(screen.getByRole('button', { name: 'perder-acesso' }));

    expect(mockMostrarAlerta).toHaveBeenCalledWith(
      'Acesso removido',
      'Seu acesso de admin foi removido.',
    );
    expect(mockRecarregarPerfil).toHaveBeenCalled();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/perfil'));
  });
});
