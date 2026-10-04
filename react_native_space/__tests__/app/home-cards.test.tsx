import { oraculosDaHome } from '../../app/prototipo-conselho';

describe('cards da home', () => {
  it('a vocação tem card próprio, com rota', () => {
    const card = oraculosDaHome.find((o) => o.rota === '/vocacao');
    expect(card).toBeDefined();
    expect(card?.titulo).toBe('Vocação');
  });

  it('a vocação declara parte grátis, senão o cadeado tranca tudo', () => {
    // Sem `parteGratis`, o vencimento trata o card como inteiramente pago — e o meio
    // do céu, que é a vitrine, some para quem venceu.
    const card = oraculosDaHome.find((o) => o.rota === '/vocacao');
    expect(card?.parteGratis).toMatch(/plano ativo/);
    expect(card?.soIA).toBeUndefined();
  });
});
