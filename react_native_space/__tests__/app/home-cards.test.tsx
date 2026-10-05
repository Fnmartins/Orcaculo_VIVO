import { oraculosDaHome } from '../../app/prototipo-conselho';

describe('cards da home', () => {
  it('a vocação tem card próprio, com rota', () => {
    const card = oraculosDaHome.find((o) => o.rota === '/vocacao');
    expect(card).toBeDefined();
    expect(card?.titulo).toBe('Vocação');
  });

  it('a vocação declara parte grátis, que é o que acende o cadeado parcial', () => {
    // O que `parteGratis` compra é a MARCA no card e a folha que explica o que
    // continua aberto. Sem o campo o card NÃO tranca: ele vira um card comum, sem
    // marca e sem folha, e o toque leva direto para /vocacao. Quem tranca o card
    // inteiro é `soIA` — daí a segunda asserção, porque a vocação tem parte grátis
    // e não pode cair no cadeado total.
    const card = oraculosDaHome.find((o) => o.rota === '/vocacao');
    expect(card?.parteGratis).toMatch(/plano ativo/);
    expect(card?.soIA).toBeUndefined();
  });
});
