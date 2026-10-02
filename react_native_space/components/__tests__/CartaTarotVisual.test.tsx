import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ARCANOS_MAIORES } from '../../data/tarot';
import { ARTE_POR_ID } from '../../data/arteDoTaro';
import { CartaTarotVisual } from '../CartaTarotVisual';

describe('CartaTarotVisual', () => {
  it('toda carta tem arte: nenhuma volta a ser ícone', () => {
    // O defeito que isto pega: acrescentar carta ao baralho e esquecer a imagem.
    // Ela apareceria em branco na tiragem, sem erro em lugar nenhum. É o risco que a
    // Fase 3 traz, quando entrarem os 56 Menores.
    for (const carta of ARCANOS_MAIORES) {
      expect(ARTE_POR_ID[carta.id]).toBeDefined();
    }
  });

  it('não sobra arte sem carta', () => {
    // O contrapeso: imagem órfã é arquivo no bundle que ninguém mostra.
    expect(Object.keys(ARTE_POR_ID)).toHaveLength(ARCANOS_MAIORES.length);
  });

  it('mostra a cena, com o nome como rótulo acessível', () => {
    render(<CartaTarotVisual cartaId={16} nome="XVI - A Torre" />);
    expect(screen.getByLabelText('XVI - A Torre')).toBeTruthy();
  });

  it('invertida, o leitor de tela também sabe', () => {
    // A prop entra agora, usada na Fase 2, para a tela não mudar de forma depois.
    render(<CartaTarotVisual cartaId={16} nome="XVI - A Torre" invertida />);
    expect(screen.getByLabelText('XVI - A Torre, invertida')).toBeTruthy();
  });
});
