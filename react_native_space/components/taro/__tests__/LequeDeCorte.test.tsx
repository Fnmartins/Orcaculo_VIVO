import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { LequeDeCorte, geometriaDoLeque, MEIA_ABERTURA } from '../LequeDeCorte';

describe('LequeDeCorte', () => {
  it('abre uma lâmina por carta', () => {
    render(<LequeDeCorte quantidade={22} aoCortar={jest.fn()} />);
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(22);
  });

  it('tocar numa lâmina entrega o índice dela', () => {
    // O índice é o contrato com `cortar`: errar aqui corta no lugar errado e nada
    // quebra — a pessoa só recebe outra tiragem, sem jeito de perceber.
    const aoCortar = jest.fn();
    render(<LequeDeCorte quantidade={22} aoCortar={aoCortar} />);
    fireEvent.press(screen.getByLabelText('Cortar aqui, carta 7 de 22'));
    expect(aoCortar).toHaveBeenCalledWith(6);
  });

  it('desligado, não corta', () => {
    const aoCortar = jest.fn();
    render(<LequeDeCorte quantidade={22} aoCortar={aoCortar} desligado />);
    fireEvent.press(screen.getByLabelText('Cortar aqui, carta 7 de 22'));
    expect(aoCortar).not.toHaveBeenCalled();
  });

  it('com uma carta só, ainda abre uma lâmina', () => {
    // O passo do arco é `(abertura * 2) / (quantidade - 1)`: com uma carta isso divide
    // por zero e a rotação sai `NaNdeg`. O leque chega a esse estado no fim de uma
    // sequência longa de cortes.
    render(<LequeDeCorte quantidade={1} aoCortar={jest.fn()} />);
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(1);
  });

  it('cada lâmina gira em torno de um pivô ABAIXO dela, não do próprio centro', () => {
    // Este é o defeito que foi para produção na Fase 1 e que nenhum teste pegou.
    //
    // No React Native não existe `transform-origin`: `rotate` gira a view em torno do
    // centro DELA. O protótipo era CSS, onde o pivô é configurável — traduzido direto,
    // as 22 lâminas giraram cada uma sobre si mesma, empilhadas no mesmo ponto, e o
    // leque virou um borrão de 60 pixels no meio da tela. A contagem de lâminas e os
    // rótulos continuavam certos, então os testes passaram.
    //
    // O pivô distante se faz compondo: desce `raio`, gira, sobe `raio`.
    render(<LequeDeCorte quantidade={22} aoCortar={jest.fn()} />);
    const laminas = screen.getAllByLabelText(/Cortar aqui/);

    for (const lamina of laminas) {
      const [desce, gira, sobe] = acharTransform(lamina);
      expect(Object.keys(desce)).toEqual(['translateY']);
      expect(Object.keys(gira)).toEqual(['rotate']);
      expect(Object.keys(sobe)).toEqual(['translateY']);
      // Descer e subir o mesmo tanto é o que põe o pivô longe do centro da lâmina.
      expect(desce.translateY).toBe(-(sobe.translateY as number));
      expect(desce.translateY as number).toBeGreaterThan(120);
    }
  });

  it('as lâminas das pontas abrem a abertura inteira', () => {
    render(<LequeDeCorte quantidade={22} aoCortar={jest.fn()} />);
    const laminas = screen.getAllByLabelText(/Cortar aqui/);
    const angulo = (lamina: (typeof laminas)[number]) =>
      parseFloat(String((acharTransform(lamina)[1] as { rotate: string }).rotate));

    expect(angulo(laminas[0])).toBeCloseTo(-MEIA_ABERTURA, 1);
    expect(angulo(laminas[laminas.length - 1])).toBeCloseTo(MEIA_ABERTURA, 1);
  });
});

describe('geometriaDoLeque', () => {
  it('o arco cabe na tela, do celular estreito ao navegador largo', () => {
    // A outra metade do mesmo defeito: raio fixo abre um arco mais largo que a tela no
    // celular, e um arco pequeno demais no navegador.
    for (const largura of [320, 375, 414, 768, 1800]) {
      const { meiaLargura } = geometriaDoLeque(largura, 22);
      expect(meiaLargura * 2).toBeLessThanOrEqual(largura);
      expect(meiaLargura).toBeGreaterThan(60);
    }
  });

  it('a mesa é alta o bastante para a queda das pontas', () => {
    // Com altura fixa a borda corta o arco — defeito que já apareceu no protótipo.
    const { altura, queda } = geometriaDoLeque(375, 22);
    expect(altura).toBeGreaterThan(queda);
  });

  it('com uma carta só, o passo é zero e nada vira NaN', () => {
    const { passo, raio, queda } = geometriaDoLeque(375, 1);
    for (const n of [passo, raio, queda]) expect(Number.isFinite(n)).toBe(true);
    expect(passo).toBe(0);
  });
});

/**
 * O `transform` da lâmina, procurando do nó rotulado para cima.
 *
 * O rótulo está no `Pressable`; quem gira é o invólucro em volta dele. Procurar só no
 * próprio nó devolve lista vazia e o teste passaria sem olhar nada.
 */
function acharTransform(no: unknown): Record<string, number | string>[] {
  let atual = no as { props?: { style?: unknown }; parent?: unknown } | null;
  while (atual) {
    const estilos = [atual.props?.style].flat(5).filter(Boolean) as Record<string, unknown>[];
    const comTransform = estilos.find((e) => Array.isArray(e?.transform));
    if (comTransform) return comTransform.transform as Record<string, number | string>[];
    atual = atual.parent as typeof atual;
  }
  throw new Error('nenhum ancestral da lâmina tem transform');
}
