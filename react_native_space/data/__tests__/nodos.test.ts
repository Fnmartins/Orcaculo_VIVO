import { nodosLunares, normalizar } from '../efemerides';

/**
 * Os nodos não têm como ser conferidos "no olho": é um número que ou está certo
 * ou está plausivelmente errado, e errado em silêncio.
 *
 * O oráculo aqui é o **nodo médio**, pela fórmula de Meeus (*Astronomical
 * Algorithms*, cap. 47). Ele é independente de tudo que o app usa — não passa
 * pela `astronomy-engine`, não passa pelos nossos vetores, é polinômio puro no
 * tempo. Se o nosso nodo verdadeiro acompanhar o médio dentro da oscilação que a
 * literatura descreve (±1,5°, com folga até 1,7°), as duas contas estão certas
 * por caminhos diferentes. Se a nossa tivesse sinal trocado, eixo trocado ou
 * moldura errada, ela se afastaria do médio em dezenas de graus.
 *
 * O que isto NÃO prova: que o verdadeiro está certo no centésimo de grau. Para
 * isso seria preciso uma efeméride de referência, e a diferença não muda signo
 * nem casa.
 */

/** Nodo médio, Meeus cap. 47. Só o tempo entra; nada do app. */
function nodoMedio(momento: Date): number {
  const jd = momento.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  return normalizar(
    125.0445479
    - 1934.1362891 * t
    + 0.0020754 * t * t
    + (t * t * t) / 467441
    - (t * t * t * t) / 60616000,
  );
}

/** Diferença entre dois ângulos, de -180 a 180: a volta em 0° não inverte sinal. */
function diferenca(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180;
}

const DATAS = [
  '1980-03-15T12:00:00Z',
  '1995-07-01T00:00:00Z',
  '2000-01-01T12:00:00Z',
  '2010-11-20T06:00:00Z',
  '2026-10-05T12:00:00Z',
  '2040-02-02T18:00:00Z',
];

describe('o nodo verdadeiro acompanha o médio', () => {
  it.each(DATAS)('em %s a diferença cabe na oscilação conhecida', (iso) => {
    const momento = new Date(iso);
    const distancia = Math.abs(diferenca(nodosLunares(momento).norte, nodoMedio(momento)));
    // 1,7° dá folga sobre o ±1,5° da literatura sem deixar passar erro de eixo:
    // sinal trocado ou moldura errada erram por dezenas de graus, não por dois.
    expect(distancia).toBeLessThan(1.7);
  });

  it('a fórmula de referência bate com a própria constante em J2000', () => {
    // Guarda do oráculo, não do código testado: se a conversão de dia juliano do
    // teste estivesse errada, ele aprovaria um nodo errado com toda a confiança.
    expect(nodoMedio(new Date('2000-01-01T12:00:00Z'))).toBeCloseTo(125.0445, 3);
  });
});

describe('o movimento é retrógrado', () => {
  it('o nodo anda para trás cerca de 19 graus por ano', () => {
    // Os nodos retrocedem, e o ciclo completo leva ~18,6 anos — daí ~19,3°/ano.
    // O verdadeiro oscila em volta disso, então a faixa é larga de propósito.
    const base = new Date('2026-10-05T12:00:00Z');
    const umAno = new Date(base.getTime() + 365.25 * 86400000);
    const avanco = diferenca(nodosLunares(umAno).norte, nodosLunares(base).norte);
    expect(avanco).toBeLessThan(-18);
    expect(avanco).toBeGreaterThan(-21);
  });
});

describe('os dois nodos são um eixo, não dois pontos soltos', () => {
  it.each(DATAS)('em %s o sul é exatamente oposto ao norte', (iso) => {
    const { norte, sul } = nodosLunares(new Date(iso));
    expect(normalizar(sul - norte)).toBeCloseTo(180, 9);
  });

  it.each(DATAS)('em %s as duas longitudes ficam entre 0 e 360', (iso) => {
    const { norte, sul } = nodosLunares(new Date(iso));
    for (const valor of [norte, sul]) {
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(360);
    }
  });
});
