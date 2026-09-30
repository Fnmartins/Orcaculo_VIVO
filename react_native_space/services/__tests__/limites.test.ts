import {
  acessoDoPlano,
  decidirUso,
  restanteHoje,
  type ConfiguracaoIA,
} from '../../supabase/functions/_shared/limites';

const gratuito: ConfiguracaoIA = {
  imagem_ligada: false,
  interpretacao_ligada: true,
  pergunta_ligada: true,
  voz_ligada: true,
  limite_dia: 2,
};

const mestre: ConfiguracaoIA = {
  imagem_ligada: true,
  interpretacao_ligada: true,
  pergunta_ligada: true,
  voz_ligada: true,
  limite_dia: 0,
};

const semVoz: ConfiguracaoIA = { ...gratuito, voz_ligada: false };

describe('decidirUso', () => {
  it('deixa passar quem ainda não bateu no limite do dia', () => {
    expect(decidirUso('pergunta', gratuito, 1, false)).toEqual({
      permitido: true, usadoHoje: 1, limiteDia: 2,
    });
  });

  it('barra no limite, e diz que foi o limite', () => {
    const v = decidirUso('pergunta', gratuito, 2, false);
    expect(v.permitido).toBe(false);
    expect(v.motivo).toBe('limite_dia');
    expect(restanteHoje(v)).toBe(0);
  });

  it('recurso desligado no plano nem chega a olhar o contador', () => {
    const v = decidirUso('imagem', gratuito, 0, false);
    expect(v.permitido).toBe(false);
    expect(v.motivo).toBe('desligado');
  });

  it('limite_dia zero quer dizer sem limite diário', () => {
    const v = decidirUso('imagem', mestre, 900, false);
    expect(v.permitido).toBe(true);
    expect(v.limiteDia).toBeNull();
    expect(restanteHoje(v)).toBeNull();
  });

  it('super-admin passa mesmo com o recurso desligado no plano', () => {
    const v = decidirUso('imagem', gratuito, 50, true);
    expect(v.permitido).toBe(true);
    expect(v.limiteDia).toBeNull();
  });

  it('sem linha de configuração, deixa passar — controle novo não derruba o que já rodava', () => {
    expect(decidirUso('interpretacao', null, 10, false).permitido).toBe(true);
  });

  it('a voz entra no mesmo controle dos outros recursos', () => {
    // Decidido em 28/09: em vez de contador proprio, a leitura falada usa o
    // caminho que ja existia. O interruptor do Painel passa a valer para ela.
    expect(decidirUso('voz', gratuito, 1, false).permitido).toBe(true);
    expect(decidirUso('voz', gratuito, 2, false).motivo).toBe('limite_dia');
  });

  it('voz desligada no plano barra antes de olhar o contador', () => {
    const v = decidirUso('voz', semVoz, 0, false);
    expect(v.permitido).toBe(false);
    expect(v.motivo).toBe('desligado');
  });

  it('cada tipo tem contador proprio: voz no teto nao barra pergunta', () => {
    // `limite_dia` e um numero so, mas `uso_ia` conta por tipo. Sem este teste,
    // alguem poderia "simplificar" o contador para um so e ninguem veria.
    expect(decidirUso('voz', gratuito, 2, false).permitido).toBe(false);
    expect(decidirUso('pergunta', gratuito, 0, false).permitido).toBe(true);
  });

  it('contador sujo (negativo, NaN) conta como zero', () => {
    expect(decidirUso('pergunta', gratuito, -5, false).usadoHoje).toBe(0);
    expect(decidirUso('pergunta', gratuito, Number.NaN, false).usadoHoje).toBe(0);
  });
});

describe('acessoDoPlano', () => {
  const AGORA = new Date('2026-10-15T12:00:00Z');

  it('data no futuro libera', () => {
    expect(acessoDoPlano('2026-10-20T00:00:00Z', AGORA, false))
      .toEqual({ liberado: true, venceuEm: null });
  });

  it('data no passado barra e diz quando venceu', () => {
    expect(acessoDoPlano('2026-10-10T00:00:00Z', AGORA, false))
      .toEqual({ liberado: false, venceuEm: '2026-10-10T00:00:00Z' });
  });

  it('o instante do vencimento é o fim, não um segundo extra', () => {
    expect(acessoDoPlano(AGORA.toISOString(), AGORA, false).liberado).toBe(false);
  });

  it('data ausente NÃO é permissão', () => {
    // Nula, undefined e vazia significam "sem validade" — logo sem acesso.
    for (const valor of [null, undefined, '', '   ']) {
      expect(acessoDoPlano(valor, AGORA, false))
        .toEqual({ liberado: false, venceuEm: null });
    }
  });

  it('data ilegível barra, em vez de liberar', () => {
    // Dado estragado virando acesso é o erro que ninguém descobre.
    expect(acessoDoPlano('ontem', AGORA, false))
      .toEqual({ liberado: false, venceuEm: null });
  });

  it('super-admin passa por cima de tudo', () => {
    for (const valor of [null, 'ontem', '2026-01-01T00:00:00Z']) {
      expect(acessoDoPlano(valor, AGORA, true).liberado).toBe(true);
    }
  });

  it('fuso não muda a decisão', () => {
    // A comparação é entre INSTANTES, não entre dias — então a mesma hora escrita em
    // fusos diferentes tem de decidir igual. A spec pedia um caso de virada; este é
    // ele, e ele mostra por que o problema não existe aqui: quem conta DIA é o
    // contador de uso, não a validade.
    expect(acessoDoPlano('2026-10-15T09:00:00-03:00', AGORA, false).liberado).toBe(false);
    expect(acessoDoPlano('2026-10-15T10:00:00-03:00', AGORA, false).liberado).toBe(true);
  });
});
