import { anguloNaRoda, distanciaAngular, meiosDasCasas, niveisDosMarcadores } from '../roda';

describe('ângulo na roda', () => {
  it('põe o ascendente na esquerda', () => {
    expect(anguloNaRoda(123.4, 123.4)).toBeCloseTo(180, 9);
  });

  it('corre anti-horário: um quarto de volta adiante do ascendente desce', () => {
    // Noventa graus depois do ascendente é o fundo do céu, e no desenho de
    // astrólogo o fundo do céu fica embaixo. No SVG o y cresce para baixo, então
    // "embaixo" é 90 graus de tela.
    expect(anguloNaRoda(90, 0)).toBeCloseTo(90, 9);
    // E um quarto antes é o meio do céu, em cima.
    expect(anguloNaRoda(270, 0)).toBeCloseTo(270, 9);
  });

  it('sem ascendente, Áries começa na esquerda', () => {
    expect(anguloNaRoda(0, 0)).toBeCloseTo(180, 9);
  });

  it('sempre devolve de 0 a 360, mesmo com volta dando a volta', () => {
    for (const longitude of [-30, 0, 45, 359.9, 400, 720]) {
      const angulo = anguloNaRoda(longitude, 200);
      expect(angulo).toBeGreaterThanOrEqual(0);
      expect(angulo).toBeLessThan(360);
    }
  });
});

describe('distância angular', () => {
  it('vai pelo lado curto do círculo', () => {
    expect(distanciaAngular(10, 350)).toBeCloseTo(20, 9);
    expect(distanciaAngular(0, 180)).toBeCloseTo(180, 9);
    expect(distanciaAngular(359, 1)).toBeCloseTo(2, 9);
  });
});

describe('níveis dos marcadores', () => {
  it('corpos espalhados ficam todos no nível de fora', () => {
    expect(niveisDosMarcadores([0, 60, 120, 180, 240, 300], 9, 3)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('corpos no mesmo grau se separam', () => {
    const niveis = niveisDosMarcadores([100, 101, 102], 9, 3);
    expect(new Set(niveis).size).toBe(3);
  });

  it('a virada de 360 também conta como vizinhança', () => {
    // Sem isso, um corpo a 359 e outro a 1 grau cairiam um sobre o outro: a
    // conta os veria a 358 graus de distância.
    const niveis = niveisDosMarcadores([359, 1], 9, 3);
    expect(niveis[0]).not.toBe(niveis[1]);
  });

  it('nunca passa do último nível, nem com quatro planetas juntos', () => {
    const niveis = niveisDosMarcadores([10, 11, 12, 13, 14], 9, 3);
    for (const nivel of niveis) {
      expect(nivel).toBeGreaterThanOrEqual(0);
      expect(nivel).toBeLessThan(3);
    }
  });

  it('devolve na ordem em que recebeu, não na ordem do zodíaco', () => {
    const niveis = niveisDosMarcadores([200, 5, 201], 9, 3);
    expect(niveis).toHaveLength(3);
    expect(niveis[1]).toBe(0); // o de 5 graus está sozinho
    expect(niveis[0]).not.toBe(niveis[2]); // 200 e 201 se separam
  });
});

describe('meios das casas', () => {
  it('acha o meio mesmo com casas de tamanhos diferentes', () => {
    // Placidus não dá doze fatias de trinta graus: o meio não é cúspide + 15.
    const meios = meiosDasCasas([0, 20, 50, 90, 140, 180, 200, 230, 260, 290, 320, 350]);
    expect(meios[0]).toBeCloseTo(10, 9); // casa de 20 graus
    expect(meios[1]).toBeCloseTo(35, 9); // casa de 30 graus
    expect(meios[3]).toBeCloseTo(115, 9); // casa de 50 graus
    expect(meios[11]).toBeCloseTo(355, 9);
  });

  it('a última casa fecha passando pelo zero', () => {
    const meios = meiosDasCasas([350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320]);
    expect(meios[0]).toBeCloseTo(5, 9); // entre 350 e 20
  });
});
