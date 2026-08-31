import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TelaFormularioMapa from '../formulario';
import TelaResultadoMapa from '../resultado';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    back: jest.fn(),
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('../../../components/GradientBackground', () => {
  const { View } = require('react-native');
  return { GradientBackground: View };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = require('react-native');
  return function Icone() { return <Text>ícone</Text>; };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { Text } = require('react-native');
  return function Icone() { return <Text>ícone</Text>; };
});

jest.mock('../../../utils/haptics', () => ({
  Hapticos: {
    impactoLeve: jest.fn(),
    impactoMedio: jest.fn(),
  },
}));

describe('Jornada Numerológica Guiada', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it('rejeita uma data inexistente antes de navegar', () => {
    render(<TelaFormularioMapa />);

    fireEvent.changeText(screen.getByPlaceholderText('Ex: Maria da Silva Santos'), 'Ana da Silva');
    fireEvent.changeText(screen.getByPlaceholderText('DD'), '31');
    fireEvent.changeText(screen.getByPlaceholderText('MM'), '02');
    fireEvent.changeText(screen.getByPlaceholderText('AAAA'), '2000');
    fireEvent.press(screen.getByText('Calcular Meu Mapa'));

    expect(screen.getByText('Digite uma data de nascimento válida.')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('não envia o nome atual quando ele está vazio', () => {
    render(<TelaFormularioMapa />);

    fireEvent.changeText(screen.getByPlaceholderText('Ex: Maria da Silva Santos'), 'Ana da Silva');
    fireEvent.changeText(screen.getByPlaceholderText('DD'), '01');
    fireEvent.changeText(screen.getByPlaceholderText('MM'), '01');
    fireEvent.changeText(screen.getByPlaceholderText('AAAA'), '2000');
    fireEvent.press(screen.getByText('Calcular Meu Mapa'));

    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({
      params: expect.objectContaining({ nome: 'Ana da Silva', nomeAtual: undefined }),
    }));
  });

  it('exibe a comparação somente quando há um segundo nome válido', () => {
    mockParams = {
      nome: 'Ana da Silva',
      nomeAtual: 'Ana de Souza',
      dia: '1',
      mes: '1',
      ano: '2000',
    };
    render(<TelaResultadoMapa />);

    fireEvent.press(screen.getByText('Comparar nomes'));

    expect(screen.getByText('Comparação simbólica')).toBeTruthy();
    expect(screen.getAllByText('Ana da Silva').length).toBeGreaterThan(0);
    expect(screen.getByText('Ana de Souza')).toBeTruthy();
    expect(screen.getByText(/não recomenda alterar documentos/i)).toBeTruthy();
  });

  it('mantém a comparação oculta quando não há segundo nome', () => {
    mockParams = { nome: 'Ana da Silva', dia: '1', mes: '1', ano: '2000' };
    render(<TelaResultadoMapa />);

    expect(screen.queryByText('Comparar nomes')).toBeNull();
    expect(screen.getByText('Meu plano')).toBeTruthy();
  });
});
