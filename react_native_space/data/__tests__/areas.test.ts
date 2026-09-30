import { AREAS, areasDaVida, type EntradaAreas } from '../areas';
import type { Aspecto } from '../aspectos';
import { CASAS, SIGNOS } from '../astrologia';
import type { Corpo, PosicaoCorpo } from '../efemerides';
import { corpoPorNome, signoDoGrau } from '../efemerides';

/**
 * As áreas existem para tirar a leitura do genérico. Estes testes cuidam de que
 * ela não volte para lá em silêncio — e o jeito mais provável de isso acontecer
 * é uma peça sumir sem erro nenhum aparecer.
 *
 * Nenhuma posição aqui é de pessoa real: são longitudes escolhidas para cair em
 * signo conhecido.
 */

const corpo = (id: string, longitude: number, retrogrado = false): PosicaoCorpo => ({
  corpo: id as Corpo,
  nome: id,
  longitude,
  signo: signoDoGrau(longitude),
  grau: longitude % 30,
  retrogrado,
});

const aspecto = (
  a: string, b: string, forca: number,
  natureza: Aspecto['natureza'] = 'tenso',
): Aspecto => ({
  a: a as Aspecto['a'], b: b as Aspecto['b'],
  tipo: 'quadratura', natureza, orbe: 1.25, forca,
});

/** Cúspides de 30 em 30 a partir de Áries: a casa N começa no signo N. */
const CUSPIDES_REDONDAS = Array.from({ length: 12 }, (_, i) => i * 30);

const base: EntradaAreas = {
  posicoes: [
    corpo('sol', 125),          // Leão
    corpo('lua', 5),            // Áries
    corpo('venus', 65),         // Gêmeos
    corpo('marte', 275),        // Capricórnio
    corpo('jupiter', 185),      // Libra
    corpo('saturno', 95, true), // Câncer, retrógrado
  ],
  cuspides: CUSPIDES_REDONDAS,
  casaDoCorpo: {
    sol: 5, lua: 1, venus: 3, marte: 10, jupiter: 7, saturno: 4,
  } as Record<Corpo, number>,
  aspectos: [],
  nomeDoPonto: (p) => String(p),
};

describe('AREAS, a tabela de convenção', () => {
  it('são as quatro da tela, na ordem da tela', () => {
    expect(AREAS.map((a) => a.id)).toEqual(['amor', 'trabalho', 'dinheiro', 'caminho']);
  });

  it('todo corpo declarado é um dos dez que o mapa calcula', () => {
    // O erro que isto pega: escrever 'venús' ou 'jupter' na tabela. A peça
    // simplesmente não apareceria, sem erro nenhum — foi esse o risco do
    // regente no item 42.
    for (const area of AREAS) {
      for (const id of area.corpos) {
        expect(corpoPorNome(id)).not.toBeNull();
      }
    }
  });

  it('toda casa declarada existe, de 1 a 12', () => {
    for (const area of AREAS) {
      for (const numero of area.casas) {
        expect(CASAS.some((c) => c.numero === numero)).toBe(true);
      }
    }
  });

  it('cada área explica por que é aquela casa e aquele planeta', () => {
    // O "porque" vai para a tela. Vazio ali é uma área que aparece sem dizer de
    // onde saiu — exatamente o que a gente está deixando de fazer.
    for (const area of AREAS) {
      expect(area.porque.trim().length).toBeGreaterThan(20);
      expect(area.casas.length).toBeGreaterThan(0);
      expect(area.corpos.length).toBeGreaterThan(0);
    }
  });
});

describe('areasDaVida', () => {
  it('devolve sempre as quatro, mesmo quando falta dado', () => {
    // Área que aparece num mapa e não no outro faz a pessoa achar que perdeu
    // algo. Some a peça, nunca a área.
    const vazio = areasDaVida({ ...base, posicoes: [], cuspides: null, casaDoCorpo: null });
    expect(vazio).toHaveLength(4);
    expect(vazio.map((a) => a.id)).toEqual(['amor', 'trabalho', 'dinheiro', 'caminho']);
  });

  it('a área do amor sai da casa 7, da casa 5, de Vênus e de Marte', () => {
    const amor = areasDaVida(base)[0];
    expect(amor.pecas.map((p) => p.rotulo)).toEqual([
      'Casa 7 — Relacionamentos',
      'Casa 5 — Expressão',
      'Vênus',
      'Marte',
    ]);
    expect(amor.comCasas).toBe(true);
  });

  it('a casa diz o signo, quem mora dentro e onde está o regente', () => {
    // Casa 7 começa em Libra (180°), regida por Vênus, que está na casa 3;
    // Júpiter mora na casa 7.
    const amor = areasDaVida(base)[0];
    expect(amor.pecas[0].valor).toBe(
      'começa em Libra, com Júpiter dentro; regida por Vênus, que está na casa 3',
    );
  });

  it('casa vazia diz isso em voz alta, e continua ligada pelo regente', () => {
    // Num mapa de dez corpos e doze casas a maioria está vazia. Silêncio ali
    // parece defeito; a frase é informação — e a casa vazia não está sem
    // assunto, o assunto dela está onde mora o regente. A casa 2 deste céu
    // começa em Touro, regida por Vênus, que está na casa 3.
    const dinheiro = areasDaVida(base)[2];
    expect(dinheiro.pecas[0].valor).toBe(
      'começa em Touro, sem planeta dentro; regida por Vênus, que está na casa 3',
    );
  });

  it('o planeta traz signo, grau, casa e retrogradação', () => {
    const trabalho = areasDaVida(base)[1];
    expect(trabalho.pecas.find((p) => p.rotulo === 'Saturno')?.valor)
      .toBe('Câncer 5°, casa 4 (retrógrado)');
  });

  it('sem hora de nascimento a área existe, sem casa, e avisa', () => {
    const semHora = areasDaVida({ ...base, cuspides: null, casaDoCorpo: null });
    for (const area of semHora) {
      expect(area.comCasas).toBe(false);
      expect(area.pecas.every((p) => !p.rotulo.startsWith('Casa '))).toBe(true);
      expect(area.pecas.every((p) => !p.valor.includes('casa'))).toBe(true);
      // Os planetas continuam lá: é a versão básica, não o vazio.
      expect(area.pecas.length).toBeGreaterThan(0);
    }
  });

  it('o aspecto entra só na área a que ele pertence', () => {
    // Vênus é do amor e do dinheiro; Saturno é do trabalho. O mesmo aspecto não
    // pode aparecer nas quatro, senão a área volta a ser o mapa inteiro.
    const com = areasDaVida({ ...base, aspectos: [aspecto('venus', 'netuno', 0.8)] });
    expect(com.map((a) => a.pecas.some((p) => p.rotulo.includes('venus'))))
      .toEqual([true, false, true, false]);
  });

  it('o aspecto ao regente da casa também conta', () => {
    // A casa 10 começa em Capricórnio, regida por Saturno: um aspecto a Saturno
    // é assunto de trabalho mesmo sem citar a casa.
    const com = areasDaVida({ ...base, aspectos: [aspecto('saturno', 'urano', 0.7)] });
    expect(com[1].pecas.some((p) => p.rotulo.includes('saturno'))).toBe(true);
  });

  it('o ângulo entra na área da casa que ele encabeça', () => {
    // Meio do céu é a cúspide da 10: trabalho. Ascendente é a da 1: caminho.
    const com = areasDaVida({
      ...base,
      aspectos: [aspecto('meioCeu', 'plutao', 0.9), aspecto('ascendente', 'netuno', 0.6)],
    });
    expect(com[1].pecas.some((p) => p.rotulo.includes('meioCeu'))).toBe(true);
    expect(com[3].pecas.some((p) => p.rotulo.includes('ascendente'))).toBe(true);
    // E não se misturam: o ascendente não é assunto de trabalho.
    expect(com[1].pecas.some((p) => p.rotulo.includes('ascendente'))).toBe(false);
  });

  it('sem casas, aspecto a ângulo não entra — o ângulo não existe', () => {
    const semHora = areasDaVida({
      ...base,
      cuspides: null,
      casaDoCorpo: null,
      aspectos: [aspecto('meioCeu', 'plutao', 0.9)],
    });
    expect(semHora.every((a) => a.pecas.every((p) => !p.rotulo.includes('meioCeu')))).toBe(true);
  });

  it('no máximo dois aspectos por área, os mais exatos primeiro', () => {
    const muitos = areasDaVida({
      ...base,
      aspectos: [
        aspecto('venus', 'plutao', 0.9),
        aspecto('venus', 'netuno', 0.8),
        aspecto('marte', 'urano', 0.7),
      ],
    });
    const doAmor = muitos[0].pecas.filter((p) => p.valor.includes('do exato'));
    expect(doAmor).toHaveLength(2);
    expect(doAmor[0].rotulo).toContain('plutao');
  });

  it('nenhuma peça sai com rótulo ou valor vazio', () => {
    // Peça vazia é o defeito silencioso desta tela: rende uma linha em branco
    // que ninguém reporta como erro.
    for (const entrada of [base, { ...base, cuspides: null, casaDoCorpo: null }]) {
      for (const area of areasDaVida(entrada)) {
        for (const peca of area.pecas) {
          expect(peca.rotulo.trim()).not.toBe('');
          expect(peca.valor.trim()).not.toBe('');
        }
      }
    }
  });

  it('os doze regentes de signo atravessam a ponte do nome', () => {
    // Se um regente não virar corpo, a casa dele perde o "regida por" sem erro.
    for (const signo of SIGNOS) {
      expect(corpoPorNome(signo.regente)).not.toBeNull();
    }
  });
});
