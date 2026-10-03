// data/__tests__/proporcao.test.ts
import { proporcaoDeMaiores } from '../proporcao';
import { ARCANOS_MAIORES } from '../tarot';

describe('proporcaoDeMaiores', () => {
  it('sem nenhum Menor em jogo, não há proporção a dizer', () => {
    // Hoje o baralho são só os 22. Dizer "todas Maiores" em toda leitura é ruído que a
    // IA repetiria como se fosse achado.
    expect(proporcaoDeMaiores(ARCANOS_MAIORES.slice(0, 3))).toBeNull();
  });

  it('com os dois tipos em jogo, conta cada um', () => {
    const menor = { ...ARCANOS_MAIORES[0], naipe: 'copas' as const };
    expect(proporcaoDeMaiores([ARCANOS_MAIORES[1], menor, menor])).toEqual({
      maiores: 1, menores: 2,
    });
  });

  it('lista vazia não quebra', () => {
    expect(proporcaoDeMaiores([])).toBeNull();
  });
});
