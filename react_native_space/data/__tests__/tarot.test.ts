import { ARCANOS_MAIORES, sortearCartas } from '../tarot';

describe('sortearCartas', () => {
  it('devolve a quantidade pedida, sem repetir', () => {
    const tres = sortearCartas(3);
    expect(tres).toHaveLength(3);
    expect(new Set(tres.map((c) => c.id)).size).toBe(3);
  });

  it('ao longo de muitas tiragens, toda carta aparece', () => {
    // Com um embaralhamento enviesado isto fica instável: cartas presas perto de onde
    // começaram quase não chegam às três primeiras posições.
    const vistas = new Set<number>();
    for (let r = 0; r < 1500; r++) sortearCartas(3).forEach((c) => vistas.add(c.id));
    expect(vistas.size).toBe(ARCANOS_MAIORES.length);
  });

  it('não gasta o baralho entre tiragens', () => {
    // `sortearCartas` trabalha sobre uma cópia. Se mexesse na lista original, a
    // segunda consulta do dia sairia de um baralho menor — sem erro em lugar nenhum.
    const antes = ARCANOS_MAIORES.length;
    sortearCartas(3);
    expect(ARCANOS_MAIORES).toHaveLength(antes);
  });
});
