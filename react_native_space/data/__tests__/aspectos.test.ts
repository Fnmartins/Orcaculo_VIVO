import {
  ASPECTOS, calcularAspectos, entradasDoMapa, separacao,
  type EntradaAspecto,
} from '../aspectos';
import type { PosicaoCorpo } from '../efemerides';

/**
 * Aspecto é conta simples, e é exatamente por isso que erra em silêncio: um
 * sinal trocado ou a volta do círculo esquecida produzem uma lista plausível e
 * errada. Os testes abaixo conferem as invariantes que denunciam isso.
 */

const em = (ponto: string, longitude: number): EntradaAspecto =>
  ({ ponto: ponto as EntradaAspecto['ponto'], longitude });

describe('separação', () => {
  it('vai pelo lado curto do círculo', () => {
    // Sem isto, 350° e 10° apareceriam a 340° e nenhuma conjunção seria achada
    // perto do zero de Áries.
    expect(separacao(350, 10)).toBeCloseTo(20, 9);
    expect(separacao(10, 350)).toBeCloseTo(20, 9);
    expect(separacao(0, 180)).toBeCloseTo(180, 9);
  });

  it('nunca passa de 180 graus', () => {
    for (const [a, b] of [[0, 359], [45, 300], [120, 121], [270, 5]]) {
      expect(separacao(a, b)).toBeLessThanOrEqual(180);
    }
  });

  it('aguenta grau fora da volta', () => {
    expect(separacao(370, 10)).toBeCloseTo(0, 9);
    expect(separacao(-10, 350)).toBeCloseTo(0, 9);
  });
});

describe('calcularAspectos', () => {
  it('acha a conjunção exata e dá força máxima', () => {
    const [a] = calcularAspectos([em('sol', 100), em('marte', 100)]);
    expect(a.tipo).toBe('conjuncao');
    expect(a.orbe).toBeCloseTo(0, 9);
    expect(a.forca).toBeCloseTo(1, 9);
  });

  it('reconhece os cinco ângulos', () => {
    const achados = ASPECTOS.map((def) =>
      calcularAspectos([em('marte', 0), em('saturno', def.angulo)])[0]?.tipo);
    expect(achados).toEqual(['conjuncao', 'oposicao', 'trigono', 'quadratura', 'sextil']);
  });

  it('respeita o orbe: dentro entra, fora não', () => {
    // Quadratura entre dois planetas aceita 7 graus de folga.
    expect(calcularAspectos([em('marte', 0), em('saturno', 96.9)])).toHaveLength(1);
    expect(calcularAspectos([em('marte', 0), em('saturno', 97.1)])).toHaveLength(0);
  });

  it('luminar ganha folga maior que planeta', () => {
    // O mesmo ângulo: com o Sol é aspecto, entre dois planetas não é.
    expect(calcularAspectos([em('sol', 0), em('saturno', 97.5)])).toHaveLength(1);
    expect(calcularAspectos([em('marte', 0), em('saturno', 97.5)])).toHaveLength(0);
  });

  it('cada par aparece uma vez só', () => {
    // Aspecto é relação: Sol–Lua e Lua–Sol são a mesma conversa.
    const lista = calcularAspectos([em('sol', 0), em('lua', 120), em('marte', 240)]);
    const pares = lista.map((x) => [x.a, x.b].sort().join('-'));
    expect(new Set(pares).size).toBe(pares.length);
  });

  it('não aspecta um ponto com ele mesmo', () => {
    const lista = calcularAspectos([em('sol', 10), em('lua', 10)]);
    expect(lista.every((x) => x.a !== x.b)).toBe(true);
  });

  it('um par não produz dois aspectos', () => {
    const lista = calcularAspectos([em('sol', 0), em('marte', 90)]);
    expect(lista).toHaveLength(1);
  });

  it('vem do mais exato para o mais frouxo', () => {
    const lista = calcularAspectos([
      em('sol', 0),
      em('marte', 90),      // quadratura exata
      em('saturno', 186),   // oposição com 6 graus de orbe
    ]);
    for (let i = 1; i < lista.length; i += 1) {
      expect(lista[i - 1].forca).toBeGreaterThanOrEqual(lista[i].forca);
    }
  });

  it('acha aspecto atravessando o zero de Áries', () => {
    // 355° e 5° estão a 10 graus: é conjunção. Sem a volta do círculo, a conta
    // veria 350 e não acharia nada.
    const lista = calcularAspectos([em('sol', 355), em('venus', 5)]);
    expect(lista[0]?.tipo).toBe('conjuncao');
  });

  it('marca tenso e harmônico, que a tela precisa distinguir', () => {
    expect(calcularAspectos([em('marte', 0), em('saturno', 90)])[0].natureza).toBe('tenso');
    expect(calcularAspectos([em('marte', 0), em('saturno', 120)])[0].natureza).toBe('harmonico');
    expect(calcularAspectos([em('marte', 0), em('saturno', 0)])[0].natureza).toBe('neutro');
  });

  it('sem pontos, devolve lista vazia em vez de estourar', () => {
    expect(calcularAspectos([])).toEqual([]);
    expect(calcularAspectos([em('sol', 10)])).toEqual([]);
  });
});

describe('entradasDoMapa', () => {
  const posicoes = [
    { corpo: 'sol', longitude: 100 },
    { corpo: 'lua', longitude: 200 },
  ] as PosicaoCorpo[];

  it('inclui os ângulos quando há hora de nascimento', () => {
    const entradas = entradasDoMapa(posicoes, { ascendente: 10, meioCeu: 280 });
    expect(entradas.map((e) => e.ponto)).toEqual(['sol', 'lua', 'ascendente', 'meioCeu']);
  });

  it('sem hora, não inventa aspecto a ângulo que não existe', () => {
    // Sem hora de nascimento não há ascendente nem meio do céu. Um aspecto a
    // eles seria invenção com cara de cálculo.
    const entradas = entradasDoMapa(posicoes, null);
    expect(entradas.map((e) => e.ponto)).toEqual(['sol', 'lua']);
  });
});
