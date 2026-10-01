import React from 'react';
import { StyleSheet } from 'react-native';
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
const VALIDO = '2099-01-01T00:00:00Z';

const comValidade = (validoAte: string | null, superAdmin = false) => {
  mockPerfil = { plano: 'gratuito', is_super_admin: superAdmin, plano_valido_ate: validoAte };
};

// "Sem cadeado" sozinho passaria também se o card sumisse da tela: por isso quem afirma
// a ausência do cadeado afirma junto que o card está lá, com o apoio de sempre.
const cartaoDeImagemNormal = () => {
  expect(screen.getByText('Leitura por imagem')).toBeTruthy();
  expect(screen.getByText('Símbolos em uma foto')).toBeTruthy();
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
    // O texto é o único lugar que explica o cadeado; o rótulo e a dica são o que o
    // leitor de tela ouve no lugar dos filhos.
    expect(screen.getByText('Atualize seu plano')).toBeTruthy();
    expect(screen.getByHintText('Abre os planos')).toBeTruthy();
  });

  it('o card trancado marca a forma, sem baixar a opacidade do texto', () => {
    // Opacidade 0,55 deixava "Atualize seu plano" em 2,36:1 de contraste (AA pede 4,5:1).
    comValidade(VENCIDO);
    render(<HomeAurora />);
    const estilo = StyleSheet.flatten(
      screen.getByLabelText('Leitura por imagem, trancada').props.style,
    );
    expect(estilo.borderStyle).toBe('dashed');
    expect(estilo.opacity).toBeUndefined();
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
    // O `queryByLabelText(titulo)` acima só pega um rótulo IGUAL ao título; um
    // `Abrir Numerologia` passaria. E o `name` de `getByRole` também casa pelo texto dos
    // filhos, não só pelo rótulo — sozinho ele não distingue os dois casos. Por isso, depois
    // de achar o card pelo apoio, afirma-se que ele não leva rótulo nenhum: sem rótulo o
    // leitor de tela lê os filhos, título e apoio.
    const cartaoLivre = screen.getByRole('button', { name: /Ciclos e significados/ });
    expect(cartaoLivre.props.accessibilityLabel ?? cartaoLivre.props['aria-label']).toBeUndefined();
  });

  it('com acesso válido, nenhum card tranca', () => {
    comValidade(VALIDO);
    render(<HomeAurora />);
    expect(screen.queryByLabelText(/trancada/)).toBeNull();
    cartaoDeImagemNormal();
  });

  it('não tranca nada enquanto o perfil não chegou', () => {
    // Um cadeado que aparece e desaparece na home acusa de vencido quem está pagando.
    mockPerfil = null;
    render(<HomeAurora />);
    expect(screen.queryByLabelText(/trancada/)).toBeNull();
    cartaoDeImagemNormal();
  });

  it('super-admin não vê cadeado, mesmo com a validade vencida', () => {
    // "Super-admin passa por cima de tudo": sem este teste, trocar o `semLimite` desta
    // tela por `false` deixaria a suíte inteira verde.
    comValidade(VENCIDO, true);
    render(<HomeAurora />);
    expect(screen.queryByLabelText(/trancada/)).toBeNull();
    cartaoDeImagemNormal();
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

  it('com acesso válido, o card de imagem leva para a leitura', () => {
    // A mutação que isto pega: desviar por `soIA` em vez de por `trancado` mandaria
    // TODO pagante para os planos, e os outros testes não notariam — o Numerologia
    // acima não serve de contrapeso, porque ele nunca tranca.
    comValidade(VALIDO);
    render(<HomeAurora />);
    fireEvent.press(screen.getByText('Leitura por imagem'));
    expect(mockPush).toHaveBeenCalledWith('/ia');
  });

  it('com o perfil ainda nulo, o card de imagem leva para a leitura', () => {
    mockPerfil = null;
    render(<HomeAurora />);
    fireEvent.press(screen.getByText('Leitura por imagem'));
    expect(mockPush).toHaveBeenCalledWith('/ia');
  });
});
