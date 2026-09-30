import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Só o necessário para a tela montar sob Jest. Os ícones viram nada de propósito: as
// asserções abaixo olham o `accessibilityLabel` do botão, nunca o ícone, e o
// componente real de ícone é o que gera aviso de "not wrapped in act(...)".
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

const mockPerfil = {
  plano: 'gratuito', is_super_admin: false, plano_valido_ate: null as string | null,
};
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ perfil: mockPerfil, sessao: { user: { id: 'u1' } }, carregando: false }),
}));

import { HomeAurora } from '../../app/prototipo-conselho';

// Uma data fixa no passado, ao meio-dia de Brasília, para o dia do calendário não
// mudar com o fuso. Nunca usar uma data que dependa de quando a suíte roda: no dia
// em que ela deixasse de ser futuro (ou passado), o teste mudaria de sentido sozinho.
const VENCIDO = '2025-10-10T15:00:00Z';

describe('cadeado na home', () => {
  it('Leitura por imagem tranca quando o acesso venceu', () => {
    mockPerfil.plano_valido_ate = VENCIDO;
    render(<HomeAurora />);
    expect(screen.getByLabelText('Leitura por imagem, trancada')).toBeTruthy();
  });

  it('os outros cinco NUNCA trancam', () => {
    // A regressão mais provável desta entrega é o cadeado no card errado.
    // Numerologia e Lei da Atração não custam nada; Búzios, Tarot e Mapa Astral têm
    // conteúdo local grátis, e o cadeado deles mora no botão (Task 5).
    mockPerfil.plano_valido_ate = VENCIDO;
    render(<HomeAurora />);
    for (const titulo of ['Búzios', 'Tarot', 'Numerologia', 'Mapa Astral', 'Lei da Atração']) {
      expect(screen.queryByLabelText(`${titulo}, trancada`)).toBeNull();
      expect(screen.getByLabelText(titulo)).toBeTruthy();
    }
  });

  it('com acesso válido, nenhum card tranca', () => {
    mockPerfil.plano_valido_ate = '2099-01-01T00:00:00Z';
    render(<HomeAurora />);
    expect(screen.queryByLabelText(/trancada/)).toBeNull();
  });
});
