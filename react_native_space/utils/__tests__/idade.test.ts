import { idadeEm, maiorDeIdade, montarDataISO, IDADE_MINIMA } from '../idade';

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

describe('montarDataISO', () => {
  it('monta a data quando ela existe no calendário', () => {
    expect(montarDataISO(13, 7, 1985, hoje)).toBe('1985-07-13');
    expect(montarDataISO(29, 2, 2000, hoje)).toBe('2000-02-29');
  });

  it('recusa data que não existe', () => {
    expect(montarDataISO(31, 2, 1990, hoje)).toBeNull();
    expect(montarDataISO(29, 2, 1999, hoje)).toBeNull();
    expect(montarDataISO(0, 7, 1985, hoje)).toBeNull();
    expect(montarDataISO(13, 13, 1985, hoje)).toBeNull();
  });

  it('recusa futuro e ano fora de faixa', () => {
    expect(montarDataISO(1, 1, 2030, hoje)).toBeNull();
    expect(montarDataISO(27, 12, 2026, hoje)).toBeNull();
    expect(montarDataISO(1, 1, 1800, hoje)).toBeNull();
  });

  it('recusa campo vazio, que chega como NaN', () => {
    expect(montarDataISO(Number.NaN, 7, 1985, hoje)).toBeNull();
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
