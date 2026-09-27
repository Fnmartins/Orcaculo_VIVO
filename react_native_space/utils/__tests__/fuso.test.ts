import {
  offsetDoFuso,
  paraUTC,
  rotuloDoOffset,
  suportaFusoNomeado,
} from '../fuso';

const SP = { fuso: 'America/Sao_Paulo', offsetPadrao: -180 };

describe('offsetDoFuso', () => {
  it('lê o horário de verão histórico do Brasil, e não uma tabela nossa', () => {
    // Janeiro de 1988 em São Paulo: horário de verão, UTC−2. Junho: UTC−3.
    expect(offsetDoFuso('America/Sao_Paulo', new Date('1988-01-15T12:00:00Z'))).toBe(-120);
    expect(offsetDoFuso('America/Sao_Paulo', new Date('1988-06-15T12:00:00Z'))).toBe(-180);
  });

  it('depois de 2019 não há mais horário de verão', () => {
    expect(offsetDoFuso('America/Sao_Paulo', new Date('2026-01-15T12:00:00Z'))).toBe(-180);
  });

  it('o Nordeste também teve horário de verão — Fortaleza em janeiro de 1988', () => {
    // Este é o caso que eu teria escrito errado de cabeça.
    expect(offsetDoFuso('America/Fortaleza', new Date('1988-01-15T12:00:00Z'))).toBe(-120);
    expect(offsetDoFuso('America/Fortaleza', new Date('2026-01-15T12:00:00Z'))).toBe(-180);
  });

  it('Manaus ficou de fora naquele verão', () => {
    expect(offsetDoFuso('America/Manaus', new Date('1988-01-15T12:00:00Z'))).toBe(-180);
  });
});

describe('paraUTC', () => {
  it('converte hora local em instante, aplicando o horário de verão do dia', () => {
    // 15/01/1988, 10:00 em São Paulo (UTC−2) = 12:00 UTC.
    const verao = paraUTC({ ano: 1988, mes: 1, dia: 15, hora: 10, minuto: 0, ...SP });
    expect(verao.momento.toISOString()).toBe('1988-01-15T12:00:00.000Z');
    expect(verao.offsetMinutos).toBe(-120);
    expect(verao.aproximado).toBe(false);

    // 15/06/1988, 10:00 em São Paulo (UTC−3) = 13:00 UTC.
    const inverno = paraUTC({ ano: 1988, mes: 6, dia: 15, hora: 10, minuto: 0, ...SP });
    expect(inverno.momento.toISOString()).toBe('1988-06-15T13:00:00.000Z');
    expect(inverno.offsetMinutos).toBe(-180);
  });

  it('a mesma hora do mesmo dia, em dois lugares, dá instantes diferentes', () => {
    const emSP = paraUTC({ ano: 2000, mes: 3, dia: 10, hora: 6, minuto: 0, ...SP });
    const emManaus = paraUTC({
      ano: 2000, mes: 3, dia: 10, hora: 6, minuto: 0,
      fuso: 'America/Manaus', offsetPadrao: -240,
    });
    expect(emManaus.momento.getTime()).toBeGreaterThan(emSP.momento.getTime());
  });

  it('guarda os minutos, para fuso que não é hora cheia', () => {
    const emKathmandu = paraUTC({
      ano: 2000, mes: 6, dia: 1, hora: 12, minuto: 0,
      fuso: 'Asia/Kathmandu', offsetPadrao: 345,
    });
    expect(emKathmandu.offsetMinutos).toBe(345);
    expect(emKathmandu.momento.toISOString()).toBe('2000-06-01T06:15:00.000Z');
  });

  it('sem suporte a fuso nomeado, usa o padrão da cidade e se declara aproximado', () => {
    const original = Intl.DateTimeFormat;
    // Simula o ambiente sem banco de fusos (o caso do Hermes no Android).
    (Intl as unknown as { DateTimeFormat: unknown }).DateTimeFormat = function () {
      throw new RangeError('fuso nomeado não suportado');
    };
    try {
      const r = paraUTC({ ano: 1988, mes: 1, dia: 15, hora: 10, minuto: 0, ...SP });
      expect(r.aproximado).toBe(true);
      expect(r.offsetMinutos).toBe(-180);
      // Uma hora fora do correto — e é por isso que a tela tem de avisar.
      expect(r.momento.toISOString()).toBe('1988-01-15T13:00:00.000Z');
    } finally {
      (Intl as unknown as { DateTimeFormat: unknown }).DateTimeFormat = original;
    }
  });

  it('o ambiente dos testes sabe fusos nomeados', () => {
    expect(suportaFusoNomeado()).toBe(true);
  });
});

describe('rotuloDoOffset', () => {
  it('escreve o que foi aplicado', () => {
    expect(rotuloDoOffset(-180)).toBe('UTC−3');
    expect(rotuloDoOffset(-120)).toBe('UTC−2');
    expect(rotuloDoOffset(345)).toBe('UTC+5:45');
    expect(rotuloDoOffset(0)).toBe('UTC+0');
  });
});
