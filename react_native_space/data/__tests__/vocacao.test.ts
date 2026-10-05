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
  corpo('mercurio', 200), // Libra
  corpo('venus', 65),     // Gêmeos
  corpo('marte', 275),    // Capricórnio
  corpo('jupiter', 185),  // Libra
  corpo('saturno', 95),   // Câncer
];

const ASPECTOS: Aspecto[] = [];

const comHora: EntradaVocacao = {
  semHora: false,
  posicoes: POSICOES,
  cuspides: CUSPIDES_REDONDAS,
  casaDoCorpo: { saturno: 6, marte: 10 } as EntradaVocacao['casaDoCorpo'],
  aspectos: ASPECTOS,
  nomeDoPonto: (ponto) => String(ponto),
  meioCeu: 275.5,         // Capricórnio, grau 5
};

const semHora: EntradaVocacao = {
  ...comHora, semHora: true, cuspides: null, casaDoCorpo: null, meioCeu: null,
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

/**
 * Os planetas do ofício e a casa 2.
 *
 * A comparação com as fontes mostrou que o modelo tinha herdado da área Trabalho uma
 * lista com Marte e Saturno e nunca tinha decidido deixar Mercúrio e Vênus de fora —
 * em Ptolomeu os planetas do ofício são exatamente Mercúrio, Vênus e Marte. A casa 2
 * é a terceira casa vocacional de toda escola moderna, e entra só aqui: na área
 * compartilhada ela apareceria duas vezes, porque já é da área Dinheiro.
 */
describe('montarVocacao traz os planetas do ofício e a casa 2', () => {
  const rotulos = (entrada: EntradaVocacao) =>
    montarVocacao(entrada).trabalho.pecas.map((p) => p.rotulo);

  it('com hora, a casa 2 entra junto da 10 e da 6', () => {
    const lista = rotulos(comHora);
    expect(lista).toEqual(expect.arrayContaining([
      expect.stringMatching(/^Casa 10/),
      expect.stringMatching(/^Casa 6/),
      expect.stringMatching(/^Casa 2/),
    ]));
  });

  it('Mercúrio e Vênus chegam, com hora e sem hora', () => {
    // Sem hora é onde isto mais pesa: antes a leitura saía com dois planetas, porque
    // as casas desapareciam. Agora sai com quatro.
    for (const entrada of [comHora, semHora]) {
      const lista = rotulos(entrada);
      expect(lista).toContain('Mercúrio');
      expect(lista).toContain('Vênus');
      expect(lista).toContain('Saturno');
      expect(lista).toContain('Marte');
    }
  });

  it('as casas vêm antes dos planetas, e a ordem é a da leitura', () => {
    // A ordem é o que a tela e o prompt leem: casas, depois planetas. Remontar a lista
    // em `montarVocacao` existe para isto — acrescentar no fim daria outra ordem.
    const lista = rotulos(comHora);
    const ultimaCasa = lista.map((r) => r.startsWith('Casa ')).lastIndexOf(true);
    const primeiroPlaneta = lista.indexOf('Mercúrio');
    expect(ultimaCasa).toBeLessThan(primeiroPlaneta);
  });

  it('sem hora não entra casa nenhuma, nem a 2', () => {
    // Sem cúspides não há casa. Inventar a 2 seria o mesmo defeito do meio do céu do
    // meio-dia, que esta entrega já corrigiu uma vez.
    expect(rotulos(semHora).filter((r) => r.startsWith('Casa '))).toEqual([]);
  });
});

/**
 * A Lua num mapa sem hora.
 *
 * Sem hora o mapa é levantado ao meio-dia. Aspecto entre planetas sobrevive a isso,
 * porque depende do ângulo de um planeta ao outro e não do relógio — a Lua é a
 * exceção, e a doutrina a trata como ponto cego. A conta: ela anda ~13,2°/dia (até
 * ~15,4° no perigeu), e os nossos orbes de luminar vão de 6° a 10°.
 */
describe('sem hora, a Lua sai dos aspectos', () => {
  const comAspectos = (lista: Aspecto[], semHora: boolean): string[] =>
    montarVocacao({ ...comHora, semHora, aspectos: lista })
      .trabalho.pecas.map((p) => p.rotulo);

  const aspecto = (a: string, b: string, forca: number): Aspecto => ({
    a: a as Aspecto['a'], b: b as Aspecto['b'],
    tipo: 'trigono', natureza: 'harmonico', orbe: 1, forca,
  });

  it('com hora, um aspecto da Lua continua valendo', () => {
    // O contrapeso: a regra é da hora desconhecida, não da Lua.
    expect(comAspectos([aspecto('lua', 'saturno', 1)], false))
      .toContain('lua trígono saturno');
  });

  it('sem hora, o mesmo aspecto sai', () => {
    expect(comAspectos([aspecto('lua', 'saturno', 1)], true))
      .not.toContain('lua trígono saturno');
  });

  it('sai pelas DUAS pontas', () => {
    // "Saturno trígono Lua" entra na área de carreira pelo Saturno. Olhar só uma
    // ponta deixaria passar metade dos casos.
    expect(comAspectos([aspecto('saturno', 'lua', 1)], true))
      .not.toContain('saturno trígono lua');
  });

  it('a Lua sai ANTES do corte dos dois mais exatos, e o verdadeiro ocupa a vaga', () => {
    // Este é o defeito que o conselho pegou: filtrar DEPOIS do corte deixaria a área
    // com um aspecto ou nenhum. E tem um ganho que não é só de honestidade — a Lua
    // hoje rouba a vaga de um aspecto de Saturno ou Marte realmente exato.
    const lista = [
      aspecto('lua', 'saturno', 0.99),
      aspecto('lua', 'marte', 0.98),
      aspecto('saturno', 'marte', 0.5),
    ];
    expect(comAspectos(lista, true)).toContain('saturno trígono marte');
  });

  it('não usa `luaIncerta` como porta: o gatilho é a hora desconhecida', () => {
    // `luaIncerta` marca risco de troca de SIGNO, e é falso quando a Lua está no meio
    // do signo — onde os aspectos dela são igualmente incertos. `montarVocacao` nem
    // recebe esse campo: se um dia receber, este teste morre junto e alguém relê isto.
    expect(Object.keys(comHora)).not.toContain('luaIncerta');
  });
});

/**
 * A frase que explica o modelo.
 *
 * Visto numa leitura real em produção: a tela mostrava a frase da área Trabalho, que
 * nomeia só Saturno e Marte, logo abaixo de um texto que falava de Mercúrio, de Vênus
 * e do que a pessoa tem a oferecer. A tela prometia menos do que entregava.
 */
describe('a vocação explica o modelo que ela usa', () => {
  it('nomeia as peças que entraram, e não só Saturno e Marte', () => {
    const { porque } = montarVocacao(comHora);
    for (const peca of ['Mercúrio', 'Vênus', 'casa 2', 'meio do céu']) {
      expect(porque).toContain(peca);
    }
  });

  it('não é a frase da área Trabalho', () => {
    // O defeito que isto pega é a volta ao `trabalho.porque` numa limpeza futura: as
    // duas frases se parecem, e a da área continua certa na tela do mapa astral.
    const vocacao = montarVocacao(comHora);
    expect(vocacao.porque).not.toBe(vocacao.trabalho.porque);
    expect(vocacao.trabalho.porque).not.toContain('Mercúrio');
  });

  it('a frase não muda com o mapa: é texto de tela, não leitura', () => {
    expect(montarVocacao(semHora).porque).toBe(montarVocacao(comHora).porque);
  });
});
