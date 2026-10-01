import {
  acessoDoPlano,
  decidirUso,
  fraseDoVencimento,
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
    // 2026-10-10T00:00:00Z é 21:00 do dia 09 em Brasília, então escreve 09/10
    expect(texto).toContain('09/10');
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
    expect(texto).toBe('Seu acesso terminou. Atualize seu plano para continuar.');
  });

  it('escreve o dia de Brasília, não o dia UTC', () => {
    // 02:00Z do dia 10 é 23h do dia 9 aqui. Dizer "terminou em 10/10" a quem perdeu o
    // acesso no dia 9 é dizer uma data que ainda não chegou.
    const texto = mensagemDoLimite(
      { ...base, motivo: 'vencido' as const, venceuEm: '2026-10-10T02:00:00+00:00' },
      'interpretacao',
    );
    expect(texto).toBe('Seu acesso terminou em 09/10. Atualize seu plano para continuar.');
  });

  it('a grafia que o PostgREST devolve funciona', () => {
    // `timestamptz` chega como '+00:00', não como 'Z'.
    expect(mensagemDoLimite(
      { ...base, motivo: 'vencido' as const, venceuEm: '2026-10-10T12:00:00+00:00' }, 'voz',
    )).toContain('10/10');
  });

  it('string vazia cai no texto sem data', () => {
    expect(mensagemDoLimite(
      { ...base, motivo: 'vencido' as const, venceuEm: '' }, 'voz',
    )).toBe('Seu acesso terminou. Atualize seu plano para continuar.');
  });

  it('desligado e limite continuam como eram, nos quatro tipos', () => {
    // Os quatro chamadores não foram tocados nesta entrega: se o texto derivar, ninguém
    // reclama e a frase errada vai para a tela. Por isso os quatro vão fixados inteiros.
    const desligado = { ...base, motivo: 'desligado' as const };
    expect(mensagemDoLimite(desligado, 'imagem'))
      .toBe('A leitura por imagem não está disponível no seu plano.');
    expect(mensagemDoLimite(desligado, 'interpretacao'))
      .toBe('O aprofundamento com IA não está disponível no seu plano.');
    expect(mensagemDoLimite(desligado, 'pergunta'))
      .toBe('As perguntas não está disponível no seu plano.');
    expect(mensagemDoLimite(desligado, 'voz'))
      .toBe('A leitura falada não está disponível no seu plano.');
    expect(mensagemDoLimite({ ...base, motivo: 'limite_dia' as const }, 'pergunta'))
      .toBe('Você já usou o limite de hoje. Amanhã tem mais.');
  });
});

describe('fraseDoVencimento', () => {
  it('escreve o dia de Brasilia, nao o de UTC', () => {
    // 00:05 UTC do dia 29 ainda e o dia 28 aqui. Ler o dia direto do prefixo da string
    // faria a tela anunciar uma data que ainda nao chegou.
    expect(fraseDoVencimento('2026-09-29T00:05:12+00:00'))
      .toBe('Seu acesso terminou em 28/09.');
  });

  it('sem data legivel, omite o quando em vez de escrever "null"', () => {
    for (const entrada of [null, undefined, '', '   ', 'ontem']) {
      expect(fraseDoVencimento(entrada)).toBe('Seu acesso terminou.');
    }
  });

  it('a mensagem completa continua sendo a frase mais o convite', () => {
    // Prende a composicao: `mensagemDoLimite` passou a montar a partir daqui, e as duas
    // strings de producao nao podem mudar por causa dessa refatoracao.
    const veredito = {
      permitido: false, motivo: 'vencido' as const, usadoHoje: 0,
      limiteDia: null, venceuEm: '2026-09-29T00:05:12+00:00',
    };
    expect(mensagemDoLimite(veredito, 'interpretacao'))
      .toBe('Seu acesso terminou em 28/09. Atualize seu plano para continuar.');
    expect(mensagemDoLimite({ ...veredito, venceuEm: null }, 'interpretacao'))
      .toBe('Seu acesso terminou. Atualize seu plano para continuar.');
  });
});
