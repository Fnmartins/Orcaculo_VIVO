import { idadeEm, maiorDeIdade, IDADE_MINIMA } from '../idade';

const hoje = new Date(2026, 8, 26); // 26/09/2026, hora local

describe('idadeEm', () => {
  it('conta os anos completos', () => {
    expect(idadeEm('1990-05-10', hoje)).toBe(36);
  });

  it('quem faz aniversário amanhã ainda não fez', () => {
    expect(idadeEm('2008-09-27', hoje)).toBe(17);
    expect(idadeEm('2008-09-26', hoje)).toBe(18);
  });

  it('data ausente ou estragada devolve nulo', () => {
    expect(idadeEm(null, hoje)).toBeNull();
    expect(idadeEm('', hoje)).toBeNull();
    expect(idadeEm('10/05/1990', hoje)).toBeNull();
    expect(idadeEm('1990-13-10', hoje)).toBeNull();
  });
});

describe('maiorDeIdade', () => {
  it(`fecha a porta abaixo de ${IDADE_MINIMA}`, () => {
    expect(maiorDeIdade('2010-01-01', hoje)).toBe(false);
  });

  it('abre para quem tem idade', () => {
    expect(maiorDeIdade('1990-05-10', hoje)).toBe(true);
  });

  it('sem data, a porta fica fechada — não saber não é poder', () => {
    expect(maiorDeIdade(null, hoje)).toBe(false);
    expect(maiorDeIdade(undefined, hoje)).toBe(false);
  });
});
