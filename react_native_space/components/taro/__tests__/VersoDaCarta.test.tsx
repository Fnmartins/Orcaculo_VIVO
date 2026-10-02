import React from 'react';
import { render } from '@testing-library/react-native';
import { VersoDaCarta } from '../VersoDaCarta';

describe('VersoDaCarta', () => {
  it('desenha no tamanho grande da vaga', () => {
    const { toJSON } = render(<VersoDaCarta largura={104} altura={164} />);
    expect(JSON.stringify(toJSON())).not.toContain('NaN');
  });

  it('desenha também na lâmina estreita do leque', () => {
    // As margens eram pixels fixos (6 e 11), desenhadas para a carta de 108 de largura.
    // Na lâmina de 38 a borda interna invadia a estrela. Proporcionais, o traço de 108
    // continua idêntico e o de 38 ainda é um verso.
    const { toJSON } = render(<VersoDaCarta largura={38} altura={60} />);
    const desenho = JSON.stringify(toJSON());
    expect(desenho).not.toContain('NaN');
    expect(desenho).not.toContain('-');
  });
});
