import { cortar, embaralhar, recolher, sortearUm } from '../corteDoBaralho';

const BARALHO = Array.from({ length: 22 }, (_, i) => i);

describe('embaralhar', () => {
  it('devolve permutação: nada some, nada repete', () => {
    const saida = embaralhar(BARALHO);
    expect(saida).toHaveLength(BARALHO.length);
    expect([...saida].sort((a, b) => a - b)).toEqual(BARALHO);
  });

  it('não muda a lista original', () => {
    const original = [...BARALHO];
    embaralhar(BARALHO);
    expect(BARALHO).toEqual(original);
  });

  it('toda carta alcança muitas posições diferentes', () => {
    // O defeito que isto pega: `sort(() => Math.random() - 0.5)` não distribui igual,
    // e algumas cartas ficam presas perto de onde começaram.
    const alcance = new Map<number, Set<number>>();
    for (let r = 0; r < 2000; r++) {
      embaralhar(BARALHO).forEach((carta, posicao) => {
        if (!alcance.has(carta)) alcance.set(carta, new Set());
        alcance.get(carta)!.add(posicao);
      });
    }
    for (const carta of BARALHO) expect(alcance.get(carta)!.size).toBeGreaterThan(15);
  });
});

describe('cortar', () => {
  it('tira da ponta até o índice, inclusive', () => {
    expect(cortar([1, 2, 3, 4, 5], 2)).toEqual({ monte: [1, 2, 3], resto: [4, 5] });
  });

  it('nunca leva o leque inteiro: sempre sobra carta para cortar de novo', () => {
    expect(cortar([1, 2, 3], 2)).toEqual({ monte: [1, 2], resto: [3] });
    expect(cortar([1, 2, 3], 99)).toEqual({ monte: [1, 2], resto: [3] });
  });

  it('índice negativo vira o primeiro corte possível', () => {
    expect(cortar([1, 2, 3], -5)).toEqual({ monte: [1], resto: [2, 3] });
  });
});

describe('recolher', () => {
  it('monta na ordem em que os montes saíram, com o leque por cima', () => {
    expect(recolher([[1, 2], [3]], [4, 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it('é função só dos cortes: a mesma sequência dá o mesmo baralho', () => {
    // Prende a regra da spec. Se alguém puser um embaralhamento aqui achando que
    // "recolher" é "embaralhar", este teste fica vermelho.
    const um = cortar(BARALHO, 4);
    const dois = cortar(um.resto, 7);
    const a = recolher([um.monte, dois.monte], dois.resto);
    const b = recolher([um.monte, dois.monte], dois.resto);
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(BARALHO);
  });
});

describe('sortearUm', () => {
  it('ao longo de muitas vezes, alcança todos os itens', () => {
    const vistos = new Set<number>();
    for (let r = 0; r < 2000; r++) vistos.add(sortearUm(BARALHO));
    expect(vistos.size).toBe(BARALHO.length);
  });
});
