import {
  alturaDoGrau,
  angulos,
  ascendentePorBusca,
  CORPOS,
  estaRetrogrado,
  grauNoSigno,
  longitudeEcliptica,
  normalizar,
  obliquidade,
  posicoes,
  signoDoGrau,
  tempoSideralLocal,
} from '../efemerides';

/** Diferença entre dois graus, sempre de 0 a 180 — 359,9 e 0,1 distam 0,2. */
function distancia(a: number, b: number): number {
  const d = Math.abs(normalizar(a) - normalizar(b)) % 360;
  return d > 180 ? 360 - d : d;
}

describe('grau e signo', () => {
  it('normalizar traz qualquer ângulo para 0..360', () => {
    expect(normalizar(-1)).toBeCloseTo(359);
    expect(normalizar(720.5)).toBeCloseTo(0.5);
  });

  it('o zodíaco começa em Áries e cada signo tem 30 graus', () => {
    expect(signoDoGrau(0).nome).toBe('Áries');
    expect(signoDoGrau(29.99).nome).toBe('Áries');
    expect(signoDoGrau(30).nome).toBe('Touro');
    expect(signoDoGrau(330).nome).toBe('Peixes');
    expect(grauNoSigno(45.5)).toBeCloseTo(15.5);
  });
});

describe('posições do céu', () => {
  it('no equinócio de março o Sol está em 0° de Áries', () => {
    // Equinócio de 20/03/2000, 07:35 UTC.
    const sol = longitudeEcliptica('sol', new Date('2000-03-20T07:35:00Z'));
    expect(distancia(sol, 0)).toBeLessThan(0.05);
  });

  it('no solstício de junho o Sol está em 0° de Câncer', () => {
    // Solstício de 21/06/2000, 01:48 UTC.
    const sol = longitudeEcliptica('sol', new Date('2000-06-21T01:48:00Z'));
    expect(distancia(sol, 90)).toBeLessThan(0.05);
  });

  it('no eclipse total de 11/08/1999 o Sol e a Lua estão no mesmo grau', () => {
    // Em eclipse solar a conjunção é exata: é o teste mais direto que existe
    // para dizer que Sol e Lua saem do mesmo céu.
    const momento = new Date('1999-08-11T11:03:00Z');
    const sol = longitudeEcliptica('sol', momento);
    const lua = longitudeEcliptica('lua', momento);
    expect(distancia(sol, lua)).toBeLessThan(0.5);
    expect(signoDoGrau(sol).nome).toBe('Leão');
  });

  it('a obliquidade em 2000 é 23,4393° e diminui com o tempo', () => {
    const em2000 = obliquidade(new Date('2000-01-01T12:00:00Z'));
    expect(em2000).toBeCloseTo(23.4393, 3);
    expect(obliquidade(new Date('2100-01-01T12:00:00Z'))).toBeLessThan(em2000);
  });

  it('devolve os dez corpos, cada um com signo e grau dentro da faixa', () => {
    const lista = posicoes(new Date('1985-07-13T18:30:00Z'));
    expect(lista).toHaveLength(CORPOS.length);
    for (const p of lista) {
      expect(p.longitude).toBeGreaterThanOrEqual(0);
      expect(p.longitude).toBeLessThan(360);
      expect(p.grau).toBeGreaterThanOrEqual(0);
      expect(p.grau).toBeLessThan(30);
      expect(p.signo.nome).toBeTruthy();
    }
  });

  it('Sol e Lua nunca são retrógrados', () => {
    const momento = new Date('2026-09-26T12:00:00Z');
    expect(estaRetrogrado('sol', momento)).toBe(false);
    expect(estaRetrogrado('lua', momento)).toBe(false);
  });

  it('Mercúrio retrógrado aparece e passa', () => {
    // Retrogradação de Mercúrio de 2000: de 15/02 a 09/03. Um dia dentro dela e
    // um dia claramente fora.
    expect(estaRetrogrado('mercurio', new Date('2000-02-25T12:00:00Z'))).toBe(true);
    expect(estaRetrogrado('mercurio', new Date('2000-04-20T12:00:00Z'))).toBe(false);
  });
});

describe('tempo sideral', () => {
  it('fica entre 0 e 24 horas, e a longitude leste adianta', () => {
    const momento = new Date('2026-09-26T03:00:00Z');
    const greenwich = tempoSideralLocal(momento, 0);
    const saoPaulo = tempoSideralLocal(momento, -46.63);
    expect(greenwich).toBeGreaterThanOrEqual(0);
    expect(greenwich).toBeLessThan(24);
    // 46,63° a oeste = 3,109 horas atrás.
    expect((greenwich - saoPaulo + 24) % 24).toBeCloseTo(46.63 / 15, 3);
  });
});

describe('ascendente e meio do céu', () => {
  // O ponto todo desta bateria: a fórmula clássica e a busca numérica não têm
  // nada em comum além do céu. Se as duas concordam, o sinal está certo.
  it('a fórmula e a busca numérica chegam no mesmo grau', () => {
    const instantes = [
      '1974-04-02T09:15:00Z', '1985-07-13T18:30:00Z', '2026-09-26T12:00:00Z',
    ].map((iso) => new Date(iso));
    const lugares = [
      { lat: -23.55, lon: -46.63 },  // São Paulo
      { lat: -3.12, lon: -60.02 },   // Manaus
      { lat: 51.51, lon: -0.13 },    // Londres
      { lat: 0, lon: 0 },
      { lat: -33.87, lon: 151.21 },  // Sydney
      { lat: 60.17, lon: 24.94 },    // Helsinque
    ];

    for (const momento of instantes) {
      for (const lugar of lugares) {
        const daFormula = angulos(momento, lugar.lat, lugar.lon).ascendente;
        const daBusca = ascendentePorBusca(momento, lugar.lat, lugar.lon);
        expect(daBusca).not.toBeNull();
        expect(distancia(daFormula, daBusca as number)).toBeLessThan(0.02);
      }
    }
  });

  it('no equador, com 0° de Áries no meio do céu, o ascendente é 0° de Câncer', () => {
    // Caso que dá para conferir de cabeça: no equador o horizonte passa pelos
    // polos, então o ascendente é o ponto da eclíptica com ascensão reta 90°
    // adiante da do meio do céu.
    // O meio do céu em 0° de Áries quer dizer tempo sideral local igual a zero.
    // O sideral adianta 1,0027 hora por hora, então dá para cair no instante em
    // poucos passos — varrer minuto a minuto custava dezenas de segundos.
    let momento = new Date('2000-03-20T00:00:00Z');
    for (let passo = 0; passo < 6; passo += 1) {
      const sideral = tempoSideralLocal(momento, 0);
      const horasAtras = sideral > 12 ? sideral - 24 : sideral;
      momento = new Date(momento.getTime() - (horasAtras / 1.002737909) * 3600 * 1000);
    }
    const { ascendente, meioCeu } = angulos(momento, 0, 0);
    expect(distancia(meioCeu, 0)).toBeLessThan(0.3);
    expect(distancia(ascendente, 90)).toBeLessThan(0.5);
  });

  it('o ascendente está no horizonte e o meio do céu, no meridiano', () => {
    // Os dois ângulos conferidos pelo que significam, não pela fórmula que os
    // produziu: o ascendente tem altura zero, e o meio do céu tem ascensão reta
    // igual ao tempo sideral local — é isso que "cruzar o meridiano" quer dizer.
    //
    // Cuidado que já custou um teste: o meio do céu **não** é o ponto mais alto
    // da eclíptica. O mais alto é o nonagesimal, a 90° do ascendente, e ele fica
    // fora do meridiano.
    const momento = new Date('1985-07-13T18:30:00Z');
    const lat = -23.55;
    const lon = -46.63;
    const { ascendente, meioCeu } = angulos(momento, lat, lon);

    expect(Math.abs(alturaDoGrau(ascendente, momento, lat, lon))).toBeLessThan(0.01);
    expect(alturaDoGrau(meioCeu, momento, lat, lon)).toBeGreaterThan(0);
    // O ponto mais alto da eclíptica é o nonagesimal, no meio do arco visível —
    // que vai de `ascendente - 180` a `ascendente`, porque grau maior que o
    // ascendente ainda não nasceu. Logo, `ascendente - 90`, e ele fica mais alto
    // que o meio do céu. Fica registrado porque eu já testei o contrário disso
    // duas vezes: primeiro achando que o meio do céu era o mais alto, depois
    // somando 90 em vez de subtrair.
    expect(alturaDoGrau(ascendente - 90, momento, lat, lon))
      .toBeGreaterThan(alturaDoGrau(meioCeu, momento, lat, lon));

    const e = (obliquidade(momento) * Math.PI) / 180;
    const l = (meioCeu * Math.PI) / 180;
    const ascensaoReta = (Math.atan2(Math.sin(l) * Math.cos(e), Math.cos(l)) * 180) / Math.PI;
    expect(distancia(ascensaoReta, tempoSideralLocal(momento, lon) * 15)).toBeLessThan(0.01);
  });

  it('em um dia o ascendente dá a volta completa no zodíaco', () => {
    const inicio = new Date('2026-09-26T00:00:00Z');
    const vistos = new Set<string>();
    for (let minuto = 0; minuto < 24 * 60; minuto += 20) {
      const { ascendente } = angulos(new Date(inicio.getTime() + minuto * 60000), -23.55, -46.63);
      vistos.add(signoDoGrau(ascendente).nome);
    }
    expect(vistos.size).toBe(12);
  });
});
