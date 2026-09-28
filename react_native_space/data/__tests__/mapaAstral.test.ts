import { cidadePorId } from '../cidades';
import {
  CORPOS_NO_GRATUITO,
  escreverGrau,
  montarMapaAstral,
  ordemDeLeitura,
  visivelNoGratuito,
} from '../mapaAstral';

// A cidade chega resolvida, como vem do banco desde 28/09. Antes o motor
// recebia só o identificador e procurava na lista local — o que quebrava para
// qualquer cidade fora das 53 embutidas no app.
const saoPaulo = cidadePorId('sao-paulo-sp')!;
const manaus = cidadePorId('manaus-am')!;

const emSaoPaulo = {
  ano: 1985, mes: 7, dia: 13, hora: 18, minuto: 30, cidade: saoPaulo,
};

describe('montarMapaAstral', () => {
  it('monta com os dez corpos, o ascendente e o meio do céu', () => {
    const mapa = montarMapaAstral(emSaoPaulo);
    expect(mapa.posicoes).toHaveLength(10);
    expect(mapa.angulos).not.toBeNull();
    expect(mapa.signoAscendente).not.toBeNull();
    expect(mapa.grauAscendente).toBeGreaterThanOrEqual(0);
    expect(mapa.grauAscendente).toBeLessThan(30);
    expect(mapa.semHora).toBe(false);
    expect(mapa.fusoAproximado).toBe(false);
  });

  it('aplica o fuso do lugar: 18:30 em São Paulo em julho é 21:30 UTC', () => {
    const mapa = montarMapaAstral(emSaoPaulo);
    expect(mapa.momentoUTC.toISOString()).toBe('1985-07-13T21:30:00.000Z');
    expect(mapa.offsetMinutos).toBe(-180);
  });

  it('nasceu no horário de verão: janeiro de 1988 em São Paulo entra como UTC−2', () => {
    const mapa = montarMapaAstral({
      ...emSaoPaulo, ano: 1988, mes: 1, dia: 15, hora: 10, minuto: 0,
    });
    expect(mapa.offsetMinutos).toBe(-120);
    expect(mapa.momentoUTC.toISOString()).toBe('1988-01-15T12:00:00.000Z');
  });

  it('a mesma hora em duas cidades dá ascendentes diferentes', () => {
    const sp = montarMapaAstral(emSaoPaulo);
    const noNorte = montarMapaAstral({ ...emSaoPaulo, cidade: manaus });
    expect(sp.angulos?.ascendente).not.toBeCloseTo(noNorte.angulos?.ascendente as number, 1);
  });

  it('sem hora, não inventa ascendente', () => {
    const mapa = montarMapaAstral({ ...emSaoPaulo, hora: null, minuto: null });
    expect(mapa.semHora).toBe(true);
    expect(mapa.angulos).toBeNull();
    expect(mapa.signoAscendente).toBeNull();
    expect(mapa.grauAscendente).toBeNull();
    expect(mapa.sintese.regenteDoMapa).toBeNull();
    // Os planetas continuam: eles não dependem da hora para o signo.
    expect(mapa.posicoes).toHaveLength(10);
  });

  it('sem hora, avisa quando a Lua pode trocar de signo', () => {
    // A Lua anda 13° por dia: perto da borda do signo, meio dia de incerteza
    // muda a resposta. O teste percorre dias até achar os dois casos.
    let achouIncerta = false;
    let achouCerta = false;
    for (let dia = 1; dia <= 28 && !(achouIncerta && achouCerta); dia += 1) {
      const mapa = montarMapaAstral({
        ...emSaoPaulo, mes: 3, dia, hora: null, minuto: null,
      });
      if (mapa.luaIncerta) achouIncerta = true;
      else achouCerta = true;
    }
    expect(achouIncerta).toBe(true);
    expect(achouCerta).toBe(true);
  });

  it('com hora, a Lua nunca é marcada como incerta', () => {
    for (let dia = 1; dia <= 28; dia += 7) {
      expect(montarMapaAstral({ ...emSaoPaulo, mes: 3, dia }).luaIncerta).toBe(false);
    }
  });

  it('cidade sem coordenada é erro, não mapa silencioso', () => {
    expect(() => montarMapaAstral({
      ...emSaoPaulo,
      cidade: { ...saoPaulo, fuso: '' },
    })).toThrow('Cidade de nascimento não encontrada.');
  });
});

describe('a síntese', () => {
  it('conta os dez corpos entre os quatro elementos e as três qualidades', () => {
    const { sintese } = montarMapaAstral(emSaoPaulo);
    const somaElementos = Object.values(sintese.elementos).reduce((a, b) => a + b, 0);
    const somaQualidades = Object.values(sintese.qualidades).reduce((a, b) => a + b, 0);
    expect(somaElementos).toBe(10);
    expect(somaQualidades).toBe(10);
    expect(['Fogo', 'Terra', 'Ar', 'Água']).toContain(sintese.elementoDominante);
    expect(['Cardinal', 'Fixo', 'Mutável']).toContain(sintese.qualidadeDominante);
  });

  it('o regente do mapa é o regente do signo do ascendente', () => {
    const mapa = montarMapaAstral(emSaoPaulo);
    expect(mapa.sintese.regenteDoMapa?.signo).toBe(mapa.signoAscendente?.nome);
    expect(mapa.sintese.regenteDoMapa?.planeta).toBe(mapa.signoAscendente?.regente);
  });

  it('elemento sem nenhum planeta aparece como ausente', () => {
    const { sintese } = montarMapaAstral(emSaoPaulo);
    if (sintese.elementoAusente) {
      expect(sintese.elementos[sintese.elementoAusente]).toBe(0);
    } else {
      expect(Object.values(sintese.elementos).every((n) => n > 0)).toBe(true);
    }
  });
});

describe('o corte do plano gratuito (M7)', () => {
  it('gratuito vê Sol e Lua; o resto é pago', () => {
    expect(CORPOS_NO_GRATUITO).toEqual(['sol', 'lua']);
    expect(visivelNoGratuito('sol')).toBe(true);
    expect(visivelNoGratuito('lua')).toBe(true);
    expect(visivelNoGratuito('saturno')).toBe(false);
    expect(visivelNoGratuito('plutao')).toBe(false);
  });
});

describe('escrita e ordem', () => {
  it('escreve grau e minuto do jeito que astrólogo lê', () => {
    expect(escreverGrau(0)).toBe('0° 00′ de Áries');
    expect(escreverGrau(45.5)).toBe('15° 30′ de Touro');
    expect(escreverGrau(233.6833)).toBe('23° 41′ de Escorpião');
  });

  it('não escreve 60 minutos', () => {
    // 29,9999° arredondaria para "29° 60′" sem o ajuste.
    expect(escreverGrau(29.99999)).toBe('30° 00′ de Áries');
  });

  it('ordena pelos luminares primeiro', () => {
    const mapa = montarMapaAstral(emSaoPaulo);
    const ordenado = ordemDeLeitura(mapa.posicoes);
    expect(ordenado[0].corpo).toBe('sol');
    expect(ordenado[1].corpo).toBe('lua');
    expect(ordenado[9].corpo).toBe('plutao');
  });
});

describe('casas no mapa montado', () => {
  it('com hora, cada corpo cai em uma casa, e o ascendente abre a primeira', () => {
    const mapa = montarMapaAstral(emSaoPaulo);
    expect(mapa.casas).not.toBeNull();
    expect(mapa.casas!.cuspides[0]).toBeCloseTo(mapa.angulos!.ascendente, 9);
    expect(mapa.casaDoCorpo).not.toBeNull();
    for (const posicao of mapa.posicoes) {
      const casa = mapa.casaDoCorpo![posicao.corpo];
      expect(casa).toBeGreaterThanOrEqual(1);
      expect(casa).toBeLessThanOrEqual(12);
    }
  });

  it('sem hora, não há casas — e o campo diz isso em vez de chutar', () => {
    // O mesmo motivo do ascendente: sem hora não há horizonte. Um número aqui
    // seria pior que nenhum, porque a pessoa acreditaria nele.
    const mapa = montarMapaAstral({ ...emSaoPaulo, hora: null, minuto: null });
    expect(mapa.casas).toBeNull();
    expect(mapa.casaDoCorpo).toBeNull();
  });
});
