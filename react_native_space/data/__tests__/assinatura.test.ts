import { assinaturaDoMapa, type EntradaAssinatura } from '../assinatura';
import type { Aspecto } from '../aspectos';
import type { Corpo, PosicaoCorpo } from '../efemerides';

/**
 * A assinatura existe para substituir um texto que servia para qualquer
 * pessoa. Os testes abaixo cuidam de que ela não vire outro: ordem estável,
 * fator só quando há achado de verdade, e nada inventado quando falta dado.
 */

const corpo = (nome: string, retrogrado = false): PosicaoCorpo =>
  ({ corpo: nome as Corpo, retrogrado } as PosicaoCorpo);

const aspecto = (
  a: string, b: string, forca: number,
  natureza: Aspecto['natureza'] = 'tenso',
): Aspecto => ({
  a: a as Aspecto['a'], b: b as Aspecto['b'],
  tipo: 'quadratura', natureza, orbe: 1, forca,
});

const base: EntradaAssinatura = {
  posicoes: [corpo('sol'), corpo('lua'), corpo('marte')],
  aspectos: [],
  casaDoCorpo: null,
  elementoDominante: 'Água',
  elementoAusente: 'Fogo',
  qualidadeDominante: 'Fixo',
  regenteDoMapa: { planeta: 'Plutão', signo: 'Escorpião' },
  nomeDoPonto: (p) => String(p),
};

describe('assinaturaDoMapa', () => {
  it('nunca passa de seis fatores', () => {
    // Lista longa deixa de ser assinatura e vira o catálogo que a gente está
    // tentando deixar de ser.
    const cheio = assinaturaDoMapa({
      ...base,
      posicoes: [corpo('sol', true), corpo('lua', true), corpo('marte', true), corpo('venus')],
      aspectos: [aspecto('sol', 'marte', 0.9), aspecto('lua', 'marte', 0.5)],
      casaDoCorpo: { sol: 5, lua: 5, marte: 5, venus: 1 } as Record<Corpo, number>,
    });
    expect(cheio.length).toBeLessThanOrEqual(6);
  });

  it('o que só existe neste mapa vem antes do que existe em muitos', () => {
    const fatores = assinaturaDoMapa({ ...base, aspectos: [aspecto('sol', 'marte', 0.9)] });
    expect(fatores[0].rotulo).toBe('A conexão mais exata');
    // Elemento dominante é verdade sobre um quarto das pessoas; vem depois.
    const posicaoElemento = fatores.findIndex((f) => f.rotulo === 'Elemento que domina');
    expect(posicaoElemento).toBeGreaterThan(0);
  });

  it('quem mais conversa conta por força, não por quantidade', () => {
    // Saturno tem duas conexões quase exatas; Vênus tem três frouxas.
    const fatores = assinaturaDoMapa({
      ...base,
      aspectos: [
        aspecto('saturno', 'sol', 0.95),
        aspecto('saturno', 'lua', 0.9),
        aspecto('venus', 'sol', 0.2),
        aspecto('venus', 'lua', 0.2),
        aspecto('venus', 'marte', 0.2),
      ],
    });
    const quem = fatores.find((f) => f.rotulo === 'Quem mais conversa');
    expect(quem?.valor).toMatch(/^saturno/);
  });

  it('sem aspecto nenhum, não inventa conexão', () => {
    const fatores = assinaturaDoMapa(base);
    expect(fatores.find((f) => f.rotulo === 'A conexão mais exata')).toBeUndefined();
    expect(fatores.find((f) => f.rotulo === 'Quem mais conversa')).toBeUndefined();
  });

  it('concentração só conta a partir de três corpos na mesma casa', () => {
    // Dois na mesma casa é acaso num mapa de dez.
    const doisJuntos = assinaturaDoMapa({
      ...base,
      casaDoCorpo: { sol: 5, lua: 5, marte: 9 } as Record<Corpo, number>,
    });
    expect(doisJuntos.find((f) => f.rotulo === 'Onde a energia se junta')).toBeUndefined();

    const tresJuntos = assinaturaDoMapa({
      ...base,
      casaDoCorpo: { sol: 5, lua: 5, marte: 5 } as Record<Corpo, number>,
    });
    expect(tresJuntos.find((f) => f.rotulo === 'Onde a energia se junta')?.valor)
      .toMatch(/Casa 5/);
  });

  it('sem hora de nascimento não há casa, e o fator some em vez de mentir', () => {
    const fatores = assinaturaDoMapa({ ...base, casaDoCorpo: null });
    expect(fatores.find((f) => f.rotulo === 'Onde a energia se junta')).toBeUndefined();
  });

  it('retrógrados só viram marca a partir de três', () => {
    const dois = assinaturaDoMapa({
      ...base, posicoes: [corpo('sol', true), corpo('lua', true), corpo('marte')],
    });
    expect(dois.find((f) => f.rotulo === 'Movimento para dentro')).toBeUndefined();

    const tres = assinaturaDoMapa({
      ...base, posicoes: [corpo('sol', true), corpo('lua', true), corpo('marte', true)],
    });
    expect(tres.find((f) => f.rotulo === 'Movimento para dentro')?.valor)
      .toBe('3 corpos retrógrados');
  });

  it('sem elemento ausente, não força o fator', () => {
    const fatores = assinaturaDoMapa({ ...base, elementoAusente: null });
    expect(fatores.find((f) => f.rotulo === 'Elemento ausente')).toBeUndefined();
  });

  it('sem ascendente não há regente, e o fator some', () => {
    const fatores = assinaturaDoMapa({ ...base, regenteDoMapa: null });
    expect(fatores.find((f) => f.rotulo === 'Regente do mapa')).toBeUndefined();
  });

  it('a ordem é estável entre chamadas iguais', () => {
    // Sem isso, dois empates poderiam trocar de lugar e a tela mudaria sozinha
    // entre aberturas.
    const entrada = {
      ...base,
      aspectos: [aspecto('sol', 'marte', 0.5), aspecto('lua', 'venus', 0.5)],
    };
    const a = assinaturaDoMapa(entrada).map((f) => f.valor);
    const b = assinaturaDoMapa(entrada).map((f) => f.valor);
    expect(a).toEqual(b);
  });

  it('todo fator vem com o porquê, não só com o achado', () => {
    for (const f of assinaturaDoMapa({ ...base, aspectos: [aspecto('sol', 'marte', 0.9)] })) {
      expect(f.porque.length).toBeGreaterThan(20);
    }
  });
});
