import type { Aspecto } from '../aspectos';
import type { Corpo, PosicaoCorpo } from '../efemerides';
import { signoDoGrau } from '../efemerides';
import { montarVocacao, type EntradaVocacao } from '../vocacao';

/** Nenhuma posição aqui é de pessoa real: são longitudes escolhidas para cair em signo conhecido. */
const corpo = (id: string, longitude: number): PosicaoCorpo => ({
  corpo: id as Corpo,
  nome: id,
  longitude,
  signo: signoDoGrau(longitude),
  grau: longitude % 30,
  retrogrado: false,
});

/** Cúspides de 30 em 30 a partir de Áries: a casa N começa no signo N. */
const CUSPIDES_REDONDAS = Array.from({ length: 12 }, (_, i) => i * 30);

const POSICOES: PosicaoCorpo[] = [
  corpo('sol', 125),      // Leão
  corpo('lua', 5),        // Áries
  corpo('venus', 65),     // Gêmeos
  corpo('marte', 275),    // Capricórnio
  corpo('jupiter', 185),  // Libra
  corpo('saturno', 95),   // Câncer
];

const ASPECTOS: Aspecto[] = [];

const comHora: EntradaVocacao = {
  posicoes: POSICOES,
  cuspides: CUSPIDES_REDONDAS,
  casaDoCorpo: { saturno: 6, marte: 10 } as EntradaVocacao['casaDoCorpo'],
  aspectos: ASPECTOS,
  nomeDoPonto: (ponto) => String(ponto),
  meioCeu: 275.5,         // Capricórnio, grau 5
};

const semHora: EntradaVocacao = {
  ...comHora, cuspides: null, casaDoCorpo: null, meioCeu: null,
};

describe('montarVocacao', () => {
  it('com hora, entrega o meio do céu em signo e grau', () => {
    // É o meio do céu que a parte GRÁTIS mostra. Se ele vier nulo com hora, o card
    // grátis fica vazio e o produto não tem vitrine — sem erro nenhum aparecer.
    const v = montarVocacao(comHora);
    expect(v.meioDoCeu).toEqual({ signo: 'Capricórnio', grau: 5 });
  });

  it('sem hora, o meio do céu é nulo e comCasas é falso', () => {
    // Sem horizonte não há meridiano. O defeito que isto pega é devolver o meio do
    // céu do meio-dia como se fosse o da pessoa — foi para isso que `semHora` existe.
    const v = montarVocacao(semHora);
    expect(v.meioDoCeu).toBeNull();
    expect(v.comCasas).toBe(false);
  });

  it('com hora, as peças falam das casas 10 e 6', () => {
    // A vocação inteira se apoia nessas duas casas. Se a seleção trocar de área por
    // engano, as peças continuam existindo e falam de outro assunto.
    const rotulos = montarVocacao(comHora).trabalho.pecas.map((p) => p.rotulo).join(' | ');
    expect(rotulos).toMatch(/Casa 10/);
    expect(rotulos).toMatch(/Casa 6/);
  });

  it('sem hora, nenhuma peça fala de casa', () => {
    const rotulos = montarVocacao(semHora).trabalho.pecas.map((p) => p.rotulo).join(' | ');
    expect(rotulos).not.toMatch(/Casa /);
  });

  it('a área escolhida é Trabalho, e não a primeira da lista', () => {
    // `AREAS[0]` é Amor. Trocar o `find` por um índice passaria nos testes acima,
    // porque Amor também tem peças — e a leitura de carreira sairia sobre namoro.
    expect(montarVocacao(comHora).trabalho.id).toBe('trabalho');
  });
});
