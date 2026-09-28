import { casaDoGrau, casasPlacidus, LATITUDE_MAXIMA } from '../casas';
import { alturaDoGrau, angulos, normalizar, obliquidade, tempoSideralLocal } from '../efemerides';

/**
 * Placidus não tem solução fechada, então não há fórmula de referência para
 * comparar — o mesmo problema que o ascendente tinha. A saída é a mesma: em vez
 * de conferir o número, confere-se o que o número tem de obrigatoriamente ser
 * verdade. Um divisor trocado (2 no lugar de 3), um sentido invertido ou uma
 * troca de hemisfério quebram pelo menos um destes testes.
 */

const LUGARES = [
  { nome: 'Santo Ângelo, RS', lat: -28.3, lon: -54.26 },
  { nome: 'São Paulo, SP', lat: -23.55, lon: -46.63 },
  { nome: 'Nova York', lat: 40.71, lon: -74.01 },
  { nome: 'Lisboa', lat: 38.72, lon: -9.14 },
  { nome: 'Reykjavík', lat: 64.13, lon: -21.9 },
];

/** Um punhado de instantes espalhados pelo ano e pelas horas do dia. */
const MOMENTOS = [
  new Date(Date.UTC(1978, 2, 14, 3, 20)),
  new Date(Date.UTC(1991, 6, 2, 11, 45)),
  new Date(Date.UTC(2004, 10, 27, 18, 5)),
  new Date(Date.UTC(2026, 8, 28, 23, 50)),
];

describe('casas Placidus', () => {
  it('a casa 1 é o ascendente e a 10 é o meio do céu', () => {
    // Não é redundante com o resto: é o fio ligado no lugar certo. Se algum dia
    // alguém trocar a ordem do array, cai aqui.
    for (const lugar of LUGARES) {
      for (const momento of MOMENTOS) {
        const casas = casasPlacidus(momento, lugar.lat, lugar.lon)!;
        const { ascendente, meioCeu } = angulos(momento, lugar.lat, lugar.lon);
        expect(casas.cuspides[0]).toBeCloseTo(ascendente, 9);
        expect(casas.cuspides[9]).toBeCloseTo(meioCeu, 9);
      }
    }
  });

  it('cúspides opostas estão exatamente a 180 graus', () => {
    for (const lugar of LUGARES) {
      for (const momento of MOMENTOS) {
        const { cuspides } = casasPlacidus(momento, lugar.lat, lugar.lon)!;
        for (let i = 0; i < 6; i += 1) {
          const diferenca = normalizar(cuspides[i + 6] - cuspides[i]);
          expect(diferenca).toBeCloseTo(180, 9);
        }
      }
    }
  });

  it('as doze casas seguem em ordem e fecham a volta', () => {
    // Se uma cúspide sair fora de ordem, o vão dela dá a volta inteira e a soma
    // estoura 360. É o teste que pega divisor ou sentido errado.
    for (const lugar of LUGARES) {
      for (const momento of MOMENTOS) {
        const { cuspides } = casasPlacidus(momento, lugar.lat, lugar.lon)!;
        let soma = 0;
        for (let i = 0; i < 12; i += 1) {
          const tamanho = normalizar(cuspides[(i + 1) % 12] - cuspides[i]);
          expect(tamanho).toBeGreaterThan(0);
          expect(tamanho).toBeLessThan(180);
          soma += tamanho;
        }
        expect(soma).toBeCloseTo(360, 6);
      }
    }
  });

  it('as casas 7 a 12 estão acima do horizonte e as de 1 a 6 abaixo', () => {
    // O teste físico: casa é posição no céu, não rótulo. Se os hemisférios
    // trocarem, isto cai — foi assim que o ascendente invertido apareceu.
    for (const lugar of LUGARES) {
      for (const momento of MOMENTOS) {
        const casas = casasPlacidus(momento, lugar.lat, lugar.lon)!;
        for (let grau = 0; grau < 360; grau += 7) {
          const casa = casaDoGrau(grau, casas);
          const altura = alturaDoGrau(grau, momento, lugar.lat, lugar.lon);
          if (Math.abs(altura) < 0.5) continue; // rente ao horizonte, ambíguo
          if (casa >= 7) expect(altura).toBeGreaterThan(0);
          else expect(altura).toBeLessThan(0);
        }
      }
    }
  });

  it('no equador o sistema tem solução fechada, e a iteração chega nela', () => {
    // Com latitude zero todo grau leva o mesmo tempo do horizonte ao meridiano,
    // então as cúspides ficam a 30 graus uma da outra em ascensão reta. É o
    // único caso em que existe resposta independente para comparar.
    const momento = new Date(Date.UTC(2001, 4, 9, 7, 30));
    const lon = -38.5;
    const casas = casasPlacidus(momento, 0, lon)!;
    const e = (obliquidade(momento) * Math.PI) / 180;
    const ramc = tempoSideralLocal(momento, lon) * 15;

    const daAscensaoReta = (ra: number) => {
      const a = (ra * Math.PI) / 180;
      return normalizar((Math.atan2(Math.sin(a), Math.cos(a) * Math.cos(e)) * 180) / Math.PI);
    };

    const esperadas = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2].map((k) =>
      daAscensaoReta(ramc + k * 30),
    );
    casas.cuspides.forEach((cuspide, i) => {
      expect(cuspide).toBeCloseTo(esperadas[i], 7);
    });
  });

  it('acima do círculo polar devolve nulo em vez de inventar cúspide', () => {
    // Lá o zodíaco tem graus que não nascem nem se põem: o arco diurno não
    // existe, e um número ali seria mentira.
    const momento = MOMENTOS[0];
    expect(casasPlacidus(momento, 69.65, 18.96)).toBeNull(); // Tromsø
    expect(casasPlacidus(momento, -70, 0)).toBeNull();
    expect(casasPlacidus(momento, LATITUDE_MAXIMA + 0.1, 0)).toBeNull();
    expect(casasPlacidus(momento, LATITUDE_MAXIMA - 0.1, 0)).not.toBeNull();
  });

  it('cada cúspide cai na própria casa', () => {
    const casas = casasPlacidus(MOMENTOS[1], LUGARES[0].lat, LUGARES[0].lon)!;
    casas.cuspides.forEach((cuspide, i) => {
      expect(casaDoGrau(cuspide, casas)).toBe(i + 1);
    });
  });
});
