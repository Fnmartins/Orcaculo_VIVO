import { cidadePorId } from '../cidades';
import { alturaDoGrau, ascendentePorBusca, normalizar } from '../efemerides';
import { montarMapaAstral, type DadosNascimento } from '../mapaAstral';
import { ASPECTOS, separacao } from '../aspectos';

/**
 * A bateria: o motor inteiro, sobre vinte céus diferentes.
 *
 * Os outros testes olham uma peça de cada vez, com entrada sintética. Este
 * roda a montagem completa — efemérides, fuso, ângulos, casas, aspectos — em
 * mapas de verdade, espalhados por latitude, hemisfério, estação, virada de
 * ano, horário de verão, meia-noite e dia bissexto.
 *
 * **O que ele NÃO é.** Não é comparação com software profissional; não há
 * referência externa aqui dentro. O que ele prova é consistência: que o motor
 * não se contradiz e não devolve número impossível em nenhum destes céus. A
 * conferência contra efeméride profissional é passo humano, e
 * `scripts/relatorio-mapas.js` existe para torná-la barata.
 *
 * Nenhum destes nascimentos é de pessoa real.
 */

const nascimento = (
  cidadeId: string, ano: number, mes: number, dia: number,
  hora: number | null, minuto: number | null,
): DadosNascimento => {
  const cidade = cidadePorId(cidadeId);
  if (!cidade) throw new Error(`cidade de teste ausente: ${cidadeId}`);
  return { ano, mes, dia, hora, minuto, cidade };
};

const BATERIA: { nome: string; dados: DadosNascimento }[] = [
  { nome: 'São Paulo, tarde', dados: nascimento('sao-paulo-sp', 1985, 7, 13, 18, 30) },
  { nome: 'São Paulo, horário de verão', dados: nascimento('sao-paulo-sp', 1988, 1, 15, 10, 0) },
  { nome: 'Porto Alegre, madrugada', dados: nascimento('porto-alegre-rs', 1978, 3, 14, 4, 20) },
  { nome: 'Boa Vista, quase no equador', dados: nascimento('boa-vista-rr', 2001, 6, 21, 12, 0) },
  { nome: 'Manaus, quase meia-noite', dados: nascimento('manaus-am', 1995, 11, 3, 23, 55) },
  { nome: 'Londres, 51 graus norte', dados: nascimento('londres-gb', 1969, 7, 20, 20, 17) },
  { nome: 'Nova York, virada de ano', dados: nascimento('nova-york-us', 1990, 12, 31, 23, 59) },
  { nome: 'Tóquio, dia bissexto', dados: nascimento('toquio-jp', 2000, 2, 29, 6, 0) },
  { nome: 'Buenos Aires, outono', dados: nascimento('buenos-aires-ar', 1982, 4, 2, 15, 30) },
  { nome: 'Toronto, equinócio à meia-noite', dados: nascimento('toronto-ca', 1975, 9, 23, 0, 0) },
  { nome: 'Lisboa, manhã', dados: nascimento('lisboa-pt', 1964, 5, 5, 11, 11) },
  { nome: 'Paris, verão', dados: nascimento('paris-fr', 2010, 8, 8, 8, 8) },
  { nome: 'Miami, primeiro minuto do ano', dados: nascimento('miami-us', 1999, 1, 1, 0, 1) },
  { nome: 'Montreal, solstício de inverno', dados: nascimento('montreal-ca', 1988, 12, 21, 18, 45) },
  { nome: 'Madri, outono', dados: nascimento('madri-es', 1972, 10, 10, 10, 10) },
  { nome: 'Recife, equinócio de madrugada', dados: nascimento('recife-pe', 2005, 3, 20, 3, 3) },
  { nome: 'Curitiba, noite de inverno', dados: nascimento('curitiba-pr', 1993, 6, 30, 21, 0) },
  { nome: 'Salvador, tarde', dados: nascimento('salvador-ba', 1968, 2, 14, 14, 14) },
  { nome: 'Boston, manhã de novembro', dados: nascimento('boston-us', 2015, 11, 8, 7, 30) },
  { nome: 'São Paulo, sem hora conhecida', dados: nascimento('sao-paulo-sp', 1985, 7, 13, null, null) },
];

describe('bateria de vinte mapas', () => {
  it('são vinte, e nenhum repetido', () => {
    // Se alguém duplicar uma entrada, a bateria perde cobertura sem avisar.
    expect(BATERIA).toHaveLength(20);
    const chaves = BATERIA.map((m) => JSON.stringify([
      m.dados.cidade.id, m.dados.ano, m.dados.mes, m.dados.dia, m.dados.hora, m.dados.minuto,
    ]));
    expect(new Set(chaves).size).toBe(20);
  });

  it.each(BATERIA)('$nome: dez corpos, todos em posição válida', ({ dados }) => {
    const mapa = montarMapaAstral(dados);
    expect(mapa.posicoes).toHaveLength(10);
    for (const p of mapa.posicoes) {
      expect(p.longitude).toBeGreaterThanOrEqual(0);
      expect(p.longitude).toBeLessThan(360);
      expect(p.grau).toBeGreaterThanOrEqual(0);
      expect(p.grau).toBeLessThan(30);
    }
  });

  it.each(BATERIA)('$nome: o ascendente bate por dois caminhos', ({ dados }) => {
    // A prova mais forte que existe sem referência externa: a fórmula e a
    // busca numérica chegam ao mesmo grau por caminhos independentes. Foi
    // assim que o ascendente invertido em 180° apareceu.
    const mapa = montarMapaAstral(dados);
    if (!mapa.angulos) return;

    const porBusca = ascendentePorBusca(mapa.momentoUTC, dados.cidade.lat, dados.cidade.lon);
    // A busca devolve nulo quando a eclíptica não cruza o horizonte no dia —
    // caso polar. Nenhuma das vinte cidades passa de 46° de latitude, então
    // nulo aqui seria defeito, não geografia.
    expect(porBusca).not.toBeNull();

    const bruta = Math.abs(mapa.angulos.ascendente - (porBusca as number));
    expect(Math.min(bruta, 360 - bruta)).toBeLessThan(0.01);
  });

  it.each(BATERIA)('$nome: o ascendente está no horizonte', ({ dados }) => {
    const mapa = montarMapaAstral(dados);
    if (!mapa.angulos) return;
    const altura = alturaDoGrau(
      mapa.angulos.ascendente, mapa.momentoUTC, dados.cidade.lat, dados.cidade.lon,
    );
    expect(Math.abs(altura)).toBeLessThan(0.01);
  });

  it.each(BATERIA)('$nome: as doze casas fecham a volta', ({ dados }) => {
    const mapa = montarMapaAstral(dados);
    if (!mapa.casas) {
      // Sem hora não há casas, e isso é resposta, não falha.
      expect(mapa.semHora).toBe(true);
      return;
    }

    const { cuspides } = mapa.casas;
    expect(cuspides).toHaveLength(12);

    let soma = 0;
    for (let i = 0; i < 12; i += 1) {
      const tamanho = normalizar(cuspides[(i + 1) % 12] - cuspides[i]);
      expect(tamanho).toBeGreaterThan(0);
      expect(tamanho).toBeLessThan(180);
      soma += tamanho;
    }
    expect(soma).toBeCloseTo(360, 6);

    for (let i = 0; i < 6; i += 1) {
      expect(normalizar(cuspides[i + 6] - cuspides[i])).toBeCloseTo(180, 9);
    }
    expect(cuspides[0]).toBeCloseTo(mapa.angulos!.ascendente, 9);
    expect(cuspides[9]).toBeCloseTo(mapa.angulos!.meioCeu, 9);
  });

  it.each(BATERIA)('$nome: cada corpo cai numa casa de 1 a 12', ({ dados }) => {
    const mapa = montarMapaAstral(dados);
    if (!mapa.casaDoCorpo) return;
    for (const p of mapa.posicoes) {
      const casa = mapa.casaDoCorpo[p.corpo];
      expect(casa).toBeGreaterThanOrEqual(1);
      expect(casa).toBeLessThanOrEqual(12);
    }
  });

  it.each(BATERIA)('$nome: todo aspecto está dentro do próprio orbe', ({ dados }) => {
    const mapa = montarMapaAstral(dados);
    const porTipo = new Map(ASPECTOS.map((a) => [a.tipo, a]));
    const pares = new Set<string>();

    const posicao = (ponto: string): number => (
      ponto === 'ascendente' ? mapa.angulos!.ascendente
        : ponto === 'meioCeu' ? mapa.angulos!.meioCeu
          : mapa.posicoes.find((p) => p.corpo === ponto)!.longitude);

    for (const a of mapa.aspectos) {
      const def = porTipo.get(a.tipo)!;
      // O orbe declarado tem de bater com a distância real entre os dois.
      const real = Math.abs(separacao(posicao(a.a), posicao(a.b)) - def.angulo);
      expect(real).toBeCloseTo(a.orbe, 9);
      expect(a.orbe).toBeLessThanOrEqual(def.orbeLuminar);

      expect(a.forca).toBeGreaterThan(0);
      expect(a.forca).toBeLessThanOrEqual(1);
      expect(a.a).not.toBe(a.b);

      const par = [a.a, a.b].sort().join('-');
      expect(pares.has(par)).toBe(false);
      pares.add(par);
    }
  });

  it.each(BATERIA)('$nome: sem hora, nada de ascendente, casa ou ângulo', ({ dados }) => {
    if (dados.hora !== null) return;
    const mapa = montarMapaAstral(dados);
    expect(mapa.angulos).toBeNull();
    expect(mapa.casas).toBeNull();
    expect(mapa.casaDoCorpo).toBeNull();
    // E nenhum aspecto pode citar um ângulo que não existe.
    for (const a of mapa.aspectos) {
      expect(['ascendente', 'meioCeu']).not.toContain(a.a);
      expect(['ascendente', 'meioCeu']).not.toContain(a.b);
    }
  });
});
