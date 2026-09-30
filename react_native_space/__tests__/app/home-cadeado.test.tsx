import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();

// Só o necessário para a tela montar sob Jest. Os ícones viram nada de propósito: as
// asserções abaixo olham o rótulo e o texto do botão, nunca o ícone, e o componente
// real de ícone é o que gera aviso de "not wrapped in act(...)".
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), replace: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

interface PerfilFalso {
  plano: string;
  is_super_admin: boolean;
  plano_valido_ate: string | null;
}

// `let` e não `const`: um teste precisa de perfil nulo (o app ainda não o carregou ou
// a pessoa está deslogada), e o mock lê o valor no momento da chamada.
let mockPerfil: PerfilFalso | null = null;
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ perfil: mockPerfil, sessao: { user: { id: 'u1' } }, carregando: false }),
}));

import { HomeAurora } from '../../app/prototipo-conselho';

// Uma data fixa no passado, ao meio-dia de Brasília, para o dia do calendário não
// mudar com o fuso. Nunca usar uma data que dependa de quando a suíte roda: no dia
// em que ela deixasse de ser futuro (ou passado), o teste mudaria de sentido sozinho.
const VENCIDO = '2025-10-10T15:00:00Z';

const comValidade = (validoAte: string | null) => {
  mockPerfil = { plano: 'gratuito', is_super_admin: false, plano_valido_ate: validoAte };
};

beforeEach(() => {
  mockPush.mockClear();
  comValidade(null);
});

describe('cadeado na home', () => {
  it('Leitura por imagem tranca quando o acesso venceu', () => {
    comValidade(VENCIDO);
    render(<HomeAurora />);
    expect(screen.getByLabelText('Leitura por imagem, trancada')).toBeTruthy();
  });

  it('os outros cinco NUNCA trancam', () => {
    // A regressão mais provável desta entrega é o cadeado no card errado.
    // Numerologia e Lei da Atração não custam nada; Búzios, Tarot e Mapa Astral têm
    // conteúdo local grátis, e o cadeado deles mora no botão (Task 5).
    comValidade(VENCIDO);
    render(<HomeAurora />);
    for (const titulo of ['Búzios', 'Tarot', 'Numerologia', 'Mapa Astral', 'Lei da Atração']) {
      expect(screen.queryByLabelText(`${titulo}, trancada`)).toBeNull();
      // Pelo texto visível, não pelo rótulo: o card livre não leva rótulo próprio, para
      // o leitor de tela continuar lendo o título e o apoio. Um rótulo só com o título
      // os calaria, então a ausência dele também é afirmada.
      expect(screen.queryByLabelText(titulo)).toBeNull();
      expect(screen.getByText(titulo)).toBeTruthy();
    }
  });

  it('com acesso válido, nenhum card tranca', () => {
    comValidade('2099-01-01T00:00:00Z');
    render(<HomeAurora />);
    expect(screen.queryByLabelText(/trancada/)).toBeNull();
  });

  it('não tranca nada enquanto o perfil não chegou', () => {
    // Um cadeado que aparece e desaparece na home acusa de vencido quem está pagando.
    mockPerfil = null;
    render(<HomeAurora />);
    expect(screen.queryByLabelText(/trancada/)).toBeNull();
  });

  it('tocar no card trancado leva para os planos', () => {
    comValidade(VENCIDO);
    render(<HomeAurora />);
    fireEvent.press(screen.getByLabelText('Leitura por imagem, trancada'));
    expect(mockPush).toHaveBeenCalledWith('/planos');
  });

  it('tocar num card livre leva para a rota dele', () => {
    // O contrapeso: prova que o desvio para /planos é do cadeado, não de todo toque.
    comValidade(VENCIDO);
    render(<HomeAurora />);
    fireEvent.press(screen.getByText('Numerologia'));
    expect(mockPush).toHaveBeenCalledWith('/numerologia');
  });
});
