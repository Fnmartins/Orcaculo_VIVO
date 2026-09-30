import {
  custoDaLinha, custoPorPlano, custoTotal, formatarDolar, lerPrecos,
  type ConsumoMedido, type EntradaCusto, type PrecosIA,
} from '../custoIA';

/**
 * Esta é a conta que decide se um plano se paga. Errar aqui não quebra tela
 * nenhuma — faz o dono tomar decisão de preço sobre número errado, que é pior.
 *
 * Os preços abaixo são os reais de 29/09/2026 (US$ 5 e US$ 25 por milhão de tokens
 * do claude-opus-5; US$ 10 por milhão de caracteres no Chirp 3 HD), e os consumos
 * são inventados em números redondos, para a conta poder ser feita de cabeça e o
 * teste dizer alguma coisa.
 */

const PRECOS: PrecosIA = { modeloEntrada: 5, modeloSaida: 25, vozCaractere: 10 };

const linha = (campos: Partial<ConsumoMedido>): ConsumoMedido => ({
  plano: 'mestre', tipo: 'interpretacao', chamadas: 1,
  tokensEntrada: 0, tokensSaida: 0, caracteres: 0,
  ...campos,
});

const entrada = (campos: Partial<EntradaCusto>): EntradaCusto => ({
  consumo: [], pessoasAtivas: {}, assinantes: {}, precos: PRECOS, ...campos,
});

describe('custoDaLinha', () => {
  it('um milhão de tokens de entrada custa o preço de entrada', () => {
    expect(custoDaLinha(linha({ tokensEntrada: 1_000_000 }), PRECOS)).toBeCloseTo(5, 10);
  });

  it('um milhão de tokens de saída custa cinco vezes mais que de entrada', () => {
    // Não é detalhe: é por isso que resposta longa pesa muito mais que prompt
    // longo, e por isso o teto de tokens da leitura existe.
    expect(custoDaLinha(linha({ tokensSaida: 1_000_000 }), PRECOS)).toBeCloseTo(25, 10);
  });

  it('entrada e saída somam', () => {
    expect(custoDaLinha(linha({ tokensEntrada: 200_000, tokensSaida: 40_000 }), PRECOS))
      .toBeCloseTo(2, 10);
  });

  it('a voz é cobrada por caractere, não por token', () => {
    expect(custoDaLinha(linha({ tipo: 'voz', caracteres: 3_000 }), PRECOS))
      .toBeCloseTo(0.03, 10);
  });

  it('consumo zero custa zero, e não NaN', () => {
    expect(custoDaLinha(linha({}), PRECOS)).toBe(0);
  });

  it('número que chega como texto do banco ainda conta', () => {
    // O driver devolve `bigint` como string. Tratar isso como zero faria a
    // auditoria mostrar consumo alto e custo zero, sem erro nenhum.
    const doBanco = { ...linha({}), tokensEntrada: '1000000' as unknown as number };
    expect(custoDaLinha(doBanco, PRECOS)).toBeCloseTo(5, 10);
  });

  it('nulo e lixo valem zero, sem explodir', () => {
    const sujo = {
      ...linha({}),
      tokensEntrada: null as unknown as number,
      tokensSaida: 'abc' as unknown as number,
      caracteres: NaN,
    };
    expect(custoDaLinha(sujo, PRECOS)).toBe(0);
  });
});

describe('custoPorPlano', () => {
  it('soma por plano e ordena do mais caro para o mais barato', () => {
    const planos = custoPorPlano(entrada({
      consumo: [
        linha({ plano: 'gratuito', tokensSaida: 40_000 }),   // US$ 1,00
        linha({ plano: 'mestre', tokensSaida: 400_000 }),    // US$ 10,00
      ],
    }));
    expect(planos.map((p) => p.plano)).toEqual(['mestre', 'gratuito']);
    expect(planos[0].dolares).toBeCloseTo(10, 10);
    expect(planos[1].dolares).toBeCloseTo(1, 10);
  });

  it('divide pelos ASSINANTES, não pelos que usaram', () => {
    // Quem assina e não usa também é receita. Dividir só pelos ativos faria o plano
    // parecer mais caro do que é, e é justamente a conta que decide preço.
    const planos = custoPorPlano(entrada({
      consumo: [linha({ plano: 'mestre', tokensSaida: 400_000 })],
      pessoasAtivas: { mestre: 2 },
      assinantes: { mestre: 10 },
    }));
    expect(planos[0].porAssinante).toBeCloseTo(1, 10);
    expect(planos[0].pessoasAtivas).toBe(2);
  });

  it('plano sem assinante não devolve infinito', () => {
    const planos = custoPorPlano(entrada({
      consumo: [linha({ plano: 'gratuito', tokensSaida: 40_000 })],
      assinantes: { gratuito: 0 },
    }));
    expect(planos[0].porAssinante).toBe(0);
    expect(Number.isFinite(planos[0].porAssinante)).toBe(true);
  });

  it('plano que não gastou nada continua na lista', () => {
    // Plano que desaparece faz quem lê achar que perdeu dado. "Não gastou" é
    // resposta.
    const planos = custoPorPlano(entrada({
      consumo: [linha({ plano: 'mestre', tokensSaida: 40_000 })],
      assinantes: { mestre: 1, iniciante: 7 },
    }));
    expect(planos.map((p) => p.plano)).toEqual(['mestre', 'iniciante']);
    expect(planos[1].dolares).toBe(0);
    expect(planos[1].assinantes).toBe(7);
  });

  it('separa por tipo e mostra o custo médio por chamada', () => {
    const planos = custoPorPlano(entrada({
      consumo: [
        linha({ plano: 'mestre', tipo: 'interpretacao', chamadas: 4, tokensSaida: 400_000 }),
        linha({ plano: 'mestre', tipo: 'voz', chamadas: 10, caracteres: 30_000 }),
      ],
    }));
    const porTipo = planos[0].porTipo;
    const aprofundamento = porTipo.find((t) => t.tipo === 'interpretacao')!;
    const voz = porTipo.find((t) => t.tipo === 'voz')!;

    expect(aprofundamento.porChamada).toBeCloseTo(2.5, 10);
    expect(voz.porChamada).toBeCloseTo(0.03, 10);
    // O aprofundamento custa dezenas de vezes a leitura falada. É o tipo de
    // diferença que só aparece quando se mede, em vez de contar chamada.
    expect(aprofundamento.porChamada / voz.porChamada).toBeGreaterThan(50);
  });

  it('tipo sem uso não entra na lista do plano', () => {
    const planos = custoPorPlano(entrada({
      consumo: [linha({ plano: 'mestre', tipo: 'voz', caracteres: 1_000 })],
    }));
    expect(planos[0].porTipo.map((t) => t.tipo)).toEqual(['voz']);
  });

  it('dois dias do mesmo plano e tipo somam', () => {
    // A tabela guarda uma linha por dia; a auditoria olha o período inteiro.
    const planos = custoPorPlano(entrada({
      consumo: [
        linha({ plano: 'mestre', chamadas: 1, tokensSaida: 40_000 }),
        linha({ plano: 'mestre', chamadas: 2, tokensSaida: 40_000 }),
      ],
    }));
    expect(planos[0].chamadas).toBe(3);
    expect(planos[0].dolares).toBeCloseTo(2, 10);
  });
});

describe('custoTotal', () => {
  it('soma todos os planos', () => {
    const planos = custoPorPlano(entrada({
      consumo: [
        linha({ plano: 'mestre', tokensSaida: 40_000 }),
        linha({ plano: 'gratuito', tokensSaida: 40_000 }),
      ],
    }));
    expect(custoTotal(planos)).toBeCloseTo(2, 10);
  });

  it('lista vazia soma zero', () => {
    expect(custoTotal([])).toBe(0);
  });
});

describe('lerPrecos', () => {
  const doBanco = [
    { chave: 'modelo-entrada', dolar_por_milhao: '5.00', confirmado_em: '2026-09-29' },
    { chave: 'modelo-saida', dolar_por_milhao: 25, confirmado_em: '2026-09-29' },
    { chave: 'voz-caractere', dolar_por_milhao: 10, confirmado_em: '2026-04-01' },
  ];

  it('traduz as três chaves, inclusive preço que vem como texto', () => {
    const lido = lerPrecos(doBanco);
    expect(lido.precos).toEqual({ modeloEntrada: 5, modeloSaida: 25, vozCaractere: 10 });
    expect(lido.faltando).toEqual([]);
  });

  it('a data é a confirmação mais ANTIGA, o elo mais fraco', () => {
    // Mostrar a mais recente daria a impressão de que tudo foi conferido ontem.
    expect(lerPrecos(doBanco).confirmadoEm).toBe('2026-04-01');
  });

  it('preço ausente vale zero E é denunciado', () => {
    // Zero numa tela de custo se lê como "de graça". A auditoria não pode
    // subestimar em silêncio.
    const lido = lerPrecos(doBanco.filter((p) => p.chave !== 'voz-caractere'));
    expect(lido.precos.vozCaractere).toBe(0);
    expect(lido.faltando).toEqual(['voz-caractere']);
  });

  it('banco vazio denuncia as três', () => {
    const lido = lerPrecos([]);
    expect(lido.faltando).toEqual(['modelo-entrada', 'modelo-saida', 'voz-caractere']);
    expect(lido.confirmadoEm).toBeNull();
  });
});

describe('formatarDolar', () => {
  it('escreve centavos com vírgula', () => {
    expect(formatarDolar(10)).toBe('US$ 10,00');
    expect(formatarDolar(2.5)).toBe('US$ 2,50');
  });

  it('valor abaixo de um centavo NÃO vira zero', () => {
    // "US$ 0,00" numa tela de custo se lê como "não gastou nada", e é mentira.
    expect(formatarDolar(0.0003)).toBe('US$ 0,0003');
    expect(formatarDolar(0.009)).toBe('US$ 0,0090');
  });

  it('zero é zero mesmo', () => {
    expect(formatarDolar(0)).toBe('US$ 0,00');
    expect(formatarDolar(NaN)).toBe('US$ 0,00');
  });
});
