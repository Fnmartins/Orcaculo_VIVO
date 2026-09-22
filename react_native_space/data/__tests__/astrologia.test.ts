import { lerSignoSolar, signoSolar } from '../astrologia';

describe('signoSolar', () => {
  it.each([
    [21, 3, 'aries'],
    [19, 4, 'aries'],
    [20, 4, 'touro'],
    [23, 7, 'leao'],
    [25, 12, 'capricornio'],
    [10, 1, 'capricornio'],
    [20, 1, 'aquario'],
    [19, 2, 'peixes'],
  ])('%i/%i é %s', (dia, mes, id) => {
    expect(signoSolar(dia, mes).id).toBe(id);
  });
});

describe('lerSignoSolar', () => {
  it('traz o signo solar com elemento, modalidade e regente', () => {
    const leitura = lerSignoSolar(21, 3);
    expect(leitura.signo.id).toBe('aries');
    expect(leitura.texto).toContain('Áries');
    expect(leitura.sintese).toContain('Fogo');
    expect(leitura.sintese).toContain('cardinal');
    expect(leitura.sintese).toContain('regido por Marte');
  });

  it('usa o artigo certo para os regentes Lua e Sol', () => {
    expect(lerSignoSolar(10, 7).sintese).toContain('regido pela Lua');
    expect(lerSignoSolar(10, 8).sintese).toContain('regido pelo Sol');
  });

  // Até 21/09/2026 a tela mostrava Lua, ascendente, casas e graus inventados.
  // Sem cálculo astronômico, nenhuma leitura pode voltar a afirmá-los.
  it('não afirma nada que dependa de hora ou local de nascimento', () => {
    for (let mes = 1; mes <= 12; mes++) {
      const { texto, sintese } = lerSignoSolar(15, mes);
      expect(`${texto} ${sintese}`).not.toMatch(/Lua em|[Aa]scendente|Casa \d|°/);
    }
  });
});
