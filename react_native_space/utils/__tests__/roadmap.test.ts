import {
  agruparPorFase, calcularProgresso, proximaOrdem,
  type ItemRoadmap,
} from '../roadmap';

function item(parcial: Partial<ItemRoadmap> & Pick<ItemRoadmap, 'id' | 'fase' | 'ordem'>): ItemRoadmap {
  return {
    titulo: parcial.id,
    descricao: null,
    status: 'todo',
    criado_em: '2026-09-15T00:00:00Z',
    atualizado_em: '2026-09-15T00:00:00Z',
    ...parcial,
  };
}

describe('agruparPorFase', () => {
  it('ordena fases pela menor ordem e itens por ordem', () => {
    const grupos = agruparPorFase([
      item({ id: 'b2', fase: 'B', ordem: 5 }),
      item({ id: 'a1', fase: 'A', ordem: 1 }),
      item({ id: 'b1', fase: 'B', ordem: 3 }),
      item({ id: 'a2', fase: 'A', ordem: 2 }),
    ]);
    expect(grupos.map((g) => g.fase)).toEqual(['A', 'B']);
    expect(grupos[1].itens.map((i) => i.id)).toEqual(['b1', 'b2']);
  });

  it('ordem repetida entre fases não embaralha as fases', () => {
    const grupos = agruparPorFase([
      item({ id: 'a1', fase: 'A', ordem: 1 }),
      item({ id: 'b1', fase: 'B', ordem: 2 }),
      item({ id: 'a-novo', fase: 'A', ordem: 2, criado_em: '2026-09-16T00:00:00Z' }),
    ]);
    expect(grupos.map((g) => g.fase)).toEqual(['A', 'B']);
    expect(grupos[0].itens.map((i) => i.id)).toEqual(['a1', 'a-novo']);
  });

  it('empate de ordem na mesma fase desempata pela criação', () => {
    const [grupo] = agruparPorFase([
      item({ id: 'depois', fase: 'A', ordem: 1, criado_em: '2026-09-16T00:00:00Z' }),
      item({ id: 'antes', fase: 'A', ordem: 1, criado_em: '2026-09-15T00:00:00Z' }),
    ]);
    expect(grupo.itens.map((i) => i.id)).toEqual(['antes', 'depois']);
  });

  it('lista vazia vira nenhum grupo', () => {
    expect(agruparPorFase([])).toEqual([]);
  });
});

describe('calcularProgresso', () => {
  it('conta só os concluídos', () => {
    expect(calcularProgresso([])).toEqual({ concluidos: 0, total: 0 });
    expect(calcularProgresso([
      item({ id: '1', fase: 'A', ordem: 1, status: 'ok' }),
      item({ id: '2', fase: 'A', ordem: 2, status: 'run' }),
      item({ id: '3', fase: 'A', ordem: 3, status: 'block' }),
    ])).toEqual({ concluidos: 1, total: 3 });
  });
});

describe('proximaOrdem', () => {
  const itens = [
    item({ id: 'a1', fase: 'A', ordem: 1 }),
    item({ id: 'a2', fase: 'A', ordem: 2 }),
    item({ id: 'b1', fase: 'B', ordem: 7 }),
  ];

  it('fase existente: maior ordem da fase + 1', () => {
    expect(proximaOrdem(itens, 'A')).toBe(3);
  });

  it('fase nova: maior ordem geral + 1 (vai para o fim)', () => {
    expect(proximaOrdem(itens, 'Nova')).toBe(8);
  });

  it('roadmap vazio começa em 1', () => {
    expect(proximaOrdem([], 'A')).toBe(1);
  });
});
