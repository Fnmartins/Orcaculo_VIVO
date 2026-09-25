import { escala, LADO_MAXIMO, normalizarImagem } from '../imagemWeb';

describe('escala', () => {
  it('reduz a foto de celular até o lado maior caber', () => {
    // Retrato típico de celular: 3024 x 4032.
    const fator = escala(3024, 4032);
    expect(Math.round(4032 * fator)).toBe(LADO_MAXIMO);
    expect(Math.round(3024 * fator)).toBeLessThan(LADO_MAXIMO);
  });

  it('não aumenta imagem pequena', () => {
    expect(escala(400, 300)).toBe(1);
    expect(escala(LADO_MAXIMO, 900)).toBe(1);
  });

  it('olha o maior lado, seja largura ou altura', () => {
    expect(escala(4000, 100)).toBeCloseTo(escala(100, 4000));
  });

  it('dimensão inválida não quebra nem vira divisão por zero', () => {
    expect(escala(0, 0)).toBe(1);
    expect(escala(-10, -10)).toBe(1);
  });
});

describe('normalizarImagem', () => {
  // No Jest não há DOM de navegador, e o caminho tem de devolver nulo em vez de
  // explodir — é essa queda que mantém funcionando o que já funciona.
  it('sem navegador, devolve nulo e quem chamou segue com a original', async () => {
    await expect(normalizarImagem('data:image/png;base64,AAAA')).resolves.toBeNull();
  });
});
