import {
  acessoDoPlano,
  decidirUso,
  mensagemDoLimite,
  restanteHoje,
  type AcessoDoPlano,
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

// Acesso válido — plano em ordem, pronto para ser testado.
const LIBERADO: AcessoDoPlano = { liberado: true, venceuEm: null };

describe('decidirUso', () => {
  it('deixa passar quem ainda não bateu no limite do dia', () => {
    expect(decidirUso('pergunta', gratuito, 1, false, LIBERADO)).toEqual({
      permitido: true, usadoHoje: 1, limiteDia: 2,
    });
  });

  it('barra no limite, e diz que foi o limite', () => {
    const v = decidirUso('pergunta', gratuito, 2, false, LIBERADO);
    expect(v.permitido).toBe(false);
    expect(v.motivo).toBe('limite_dia');
    expect(restanteHoje(v)).toBe(0);
  });

  it('recurso desligado no plano nem chega a olhar o contador', () => {
    const v = decidirUso('imagem', gratuito, 0, false, LIBERADO);
    expect(v.permitido).toBe(false);
    expect(v.motivo).toBe('desligado');
  });

  it('limite_dia zero quer dizer sem limite diário', () => {
    const v = decidirUso('imagem', mestre, 900, false, LIBERADO);
    expect(v.permitido).toBe(true);
    expect(v.limiteDia).toBeNull();
    expect(restanteHoje(v)).toBeNull();
  });

  it('super-admin passa mesmo com o recurso desligado no plano', () => {
    const v = decidirUso('imagem', gratuito, 50, true, LIBERADO);
    expect(v.permitido).toBe(true);
    expect(v.limiteDia).toBeNull();
  });

  it('sem linha de configuração, deixa passar — controle novo não derruba o que já rodava', () => {
    expect(decidirUso('interpretacao', null, 10, false, LIBERADO).permitido).toBe(true);
  });

  it('a voz entra no mesmo controle dos outros recursos', () => {
    // Decidido em 28/09: em vez de contador proprio, a leitura falada usa o
    // caminho que ja existia. O interruptor do Painel passa a valer para ela.
    expect(decidirUso('voz', gratuito, 1, false, LIBERADO).permitido).toBe(true);
    expect(decidirUso('voz', gratuito, 2, false, LIBERADO).motivo).toBe('limite_dia');
  });

  it('voz desligada no plano barra antes de olhar o contador', () => {
    const v = decidirUso('voz', semVoz, 0, false, LIBERADO);
    expect(v.permitido).toBe(false);
    expect(v.motivo).toBe('desligado');
  });

  it('cada tipo tem contador proprio: voz no teto nao barra pergunta', () => {
    // `limite_dia` e um numero so, mas `uso_ia` conta por tipo. Sem este teste,
    // alguem poderia "simplificar" o contador para um so e ninguem veria.
    expect(decidirUso('voz', gratuito, 2, false, LIBERADO).permitido).toBe(false);
    expect(decidirUso('pergunta', gratuito, 0, false, LIBERADO).permitido).toBe(true);
  });

  it('contador sujo (negativo, NaN) conta como zero', () => {
    expect(decidirUso('pergunta', gratuito, -5, false, LIBERADO).usadoHoje).toBe(0);
    expect(decidirUso('pergunta', gratuito, Number.NaN, false, LIBERADO).usadoHoje).toBe(0);
  });
});

describe('decidirUso com validade', () => {
  const VENCIDO: AcessoDoPlano = { liberado: false, venceuEm: '2026-10-10T00:00:00Z' };
  const CONFIG = {
    imagem_ligada: true, interpretacao_ligada: true,
    pergunta_ligada: true, voz_ligada: true, limite_dia: 3,
  };

  it('vencido barra, com o motivo e a data', () => {
    expect(decidirUso('interpretacao', CONFIG, 0, false, VENCIDO)).toMatchObject({
      permitido: false, motivo: 'vencido', venceuEm: '2026-10-10T00:00:00Z',
    });
  });

  it('vencido vence sobre DESLIGADO', () => {
    // Dizer "não disponível no seu plano" a quem venceu manda a pessoa procurar um
    // plano que ela já tinha.
    const desligado = { ...CONFIG, interpretacao_ligada: false };
    expect(decidirUso('interpretacao', desligado, 0, false, VENCIDO).motivo).toBe('vencido');
  });

  it('vencido vence sobre o limite do dia', () => {
    expect(decidirUso('interpretacao', CONFIG, 99, false, VENCIDO).motivo).toBe('vencido');
  });

  it('super-admin passa por cima de vencido', () => {
    expect(decidirUso('interpretacao', CONFIG, 99, true, VENCIDO).permitido).toBe(true);
  });

  it('liberado se comporta como antes', () => {
    expect(decidirUso('interpretacao', CONFIG, 0, false, LIBERADO).permitido).toBe(true);
    expect(decidirUso('interpretacao', CONFIG, 3, false, LIBERADO).motivo).toBe('limite_dia');
  });

  it('configuração ausente NÃO cobre quem venceu', () => {
    // A tolerância a `config` nula existe para tabela nova ou leitura com erro — falha
    // nossa. Vencimento é fato sobre a pessoa, e não pode pegar carona nela.
    expect(decidirUso('interpretacao', null, 0, false, VENCIDO)).toMatchObject({
      permitido: false, motivo: 'vencido',
    });
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
    // O offset é respeitado: 09:00-03:00 é 12:00Z, o próprio instante de AGORA, e
    // portanto vencido; 10:00-03:00 é 13:00Z, uma hora à frente, e portanto válido.
    expect(acessoDoPlano('2026-10-15T09:00:00-03:00', AGORA, false).liberado).toBe(false);
    expect(acessoDoPlano('2026-10-15T10:00:00-03:00', AGORA, false).liberado).toBe(true);
  });

  it('o mesmo instante escrito em dois fusos decide igual', () => {
    // A de cima prova que o offset é lido. Esta prova a outra metade: duas grafias do
    // MESMO instante não podem divergir. Juntas, mostram por que a virada de dia não é
    // um problema aqui — a comparação é entre INSTANTES, não entre dias. Quem conta dia
    // é o contador de uso, não a validade.
    const comZ = acessoDoPlano('2026-10-20T00:00:00Z', AGORA, false);
    const comOffset = acessoDoPlano('2026-10-19T21:00:00-03:00', AGORA, false);
    expect(comZ.liberado).toBe(true);
    expect(comOffset.liberado).toBe(comZ.liberado);
  });
});

describe('mensagemDoLimite', () => {
  const base = { permitido: false, usadoHoje: 0, limiteDia: null };

  it('vencido com data escreve a data', () => {
    const texto = mensagemDoLimite(
      { ...base, motivo: 'vencido' as const, venceuEm: '2026-10-10T00:00:00Z' },
      'interpretacao',
    );
    expect(texto).toContain('10/10');
    expect(texto).toContain('plano');
  });

  it('vencido SEM data não escreve "null"', () => {
    // Acontece com quem cancelou: plano gratuito e validade nula.
    const texto = mensagemDoLimite(
      { ...base, motivo: 'vencido' as const, venceuEm: null }, 'voz',
    );
    expect(texto).not.toContain('null');
    expect(texto).not.toContain('NaN');
    expect(texto.length).toBeGreaterThan(10);
  });

  it('data ilegível não vira "Invalid Date" na tela', () => {
    const texto = mensagemDoLimite(
      { ...base, motivo: 'vencido' as const, venceuEm: 'ontem' }, 'voz',
    );
    expect(texto).not.toContain('Invalid');
  });

  it('desligado e limite continuam como eram', () => {
    expect(mensagemDoLimite({ ...base, motivo: 'desligado' as const }, 'imagem'))
      .toContain('não está disponível');
    expect(mensagemDoLimite({ ...base, motivo: 'limite_dia' as const }, 'pergunta'))
      .toContain('limite de hoje');
  });
});
