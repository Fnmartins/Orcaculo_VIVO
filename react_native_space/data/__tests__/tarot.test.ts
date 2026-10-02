import { ARCANOS_MAIORES, notaDaPosicao, sortearCartas, type CartaTarot } from '../tarot';

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

const TORRE = ARCANOS_MAIORES[16];

describe('notaDaPosicao', () => {
  it('sem posição-chave, não há nota', () => {
    expect(notaDaPosicao(TORRE, undefined)).toBeUndefined();
  });

  it('a nota de obstáculo cai na leitura invertida quando não houver própria', () => {
    // As fontes tratam "revertido" e "posição de obstáculo" como a mesma leitura.
    // Escrever os dois seria escrever duas vezes a mesma coisa, e elas divergiriam.
    const carta: CartaTarot = { ...TORRE, leituraInvertida: 'A mesma força, travada.' };
    expect(notaDaPosicao(carta, 'obstaculo')).toBe('A mesma força, travada.');
  });

  it('a nota própria tem precedência sobre a leitura invertida', () => {
    const carta: CartaTarot = {
      ...TORRE,
      leituraInvertida: 'travada',
      porPosicao: { obstaculo: 'o que trava aqui é outra coisa' },
    };
    expect(notaDaPosicao(carta, 'obstaculo')).toBe('o que trava aqui é outra coisa');
  });

  it('as outras posições não herdam nada da leitura invertida', () => {
    // O defeito que isto pega: fazer `leituraInvertida` valer para qualquer posição.
    // A leitura de futuro sairia com o tom de obstáculo, e ninguém veria o erro no texto.
    const carta: CartaTarot = { ...TORRE, leituraInvertida: 'travada' };
    for (const chave of ['agora', 'passado', 'futuro'] as const) {
      expect(notaDaPosicao(carta, chave)).toBeUndefined();
    }
  });

  it('sem conteúdo nenhum, devolve indefinido e não quebra', () => {
    // Estado de hoje: a estrutura sobe vazia e o conteúdo chega depois.
    for (const carta of ARCANOS_MAIORES) {
      for (const chave of ['agora', 'passado', 'futuro', 'obstaculo'] as const) {
        expect(() => notaDaPosicao(carta, chave)).not.toThrow();
      }
    }
  });
});

describe('camadas da carta', () => {
  it('nenhuma carta declara posição-chave fora das quatro', () => {
    // Uma chave escrita errada ('obstáculo' com acento) viraria nota que nunca é lida.
    const validas = new Set(['agora', 'passado', 'futuro', 'obstaculo']);
    for (const carta of ARCANOS_MAIORES) {
      for (const chave of Object.keys(carta.porPosicao ?? {})) {
        expect(validas.has(chave)).toBe(true);
      }
    }
  });

  it('os 22 Maiores não têm naipe', () => {
    for (const carta of ARCANOS_MAIORES) expect(carta.naipe).toBeUndefined();
  });
});
