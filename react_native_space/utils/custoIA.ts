/**
 * O custo de IA por plano — a conta, separada da tela e do banco.
 *
 * Item 31 do roadmap. Aqui não há acesso a rede nem a banco: entram o consumo
 * medido e os preços declarados, sai dinheiro. É o único lugar onde a
 * multiplicação acontece, e é o que o Jest pode conferir.
 *
 * **Consumo é fato, preço é declaração.** Os tokens e os caracteres vêm medidos da
 * resposta do fornecedor; os preços vêm da tabela `precos_ia`, com data de
 * confirmação. Juntar as duas coisas produz uma estimativa honesta — e a tela
 * precisa mostrar de quando é o preço, senão a estimativa vira afirmação.
 */

export const TIPOS_USO = ['imagem', 'interpretacao', 'pergunta', 'voz'] as const;
export type TipoUso = (typeof TIPOS_USO)[number];

export const ROTULO_TIPO: Record<TipoUso, string> = {
  imagem: 'Leitura de imagem',
  interpretacao: 'Aprofundamento',
  pergunta: 'Perguntas',
  voz: 'Leitura falada',
};

/** Uma linha de consumo medido, agregada por plano e tipo. */
export interface ConsumoMedido {
  plano: string;
  tipo: TipoUso;
  chamadas: number;
  tokensEntrada: number;
  tokensSaida: number;
  caracteres: number;
}

/** Preços em dólares por milhão de unidades, como vêm de `precos_ia`. */
export interface PrecosIA {
  modeloEntrada: number;
  modeloSaida: number;
  vozCaractere: number;
}

export interface CustoDoTipo {
  tipo: TipoUso;
  chamadas: number;
  dolares: number;
  /** Quanto custou cada chamada deste tipo, em média. Zero chamadas → zero. */
  porChamada: number;
}

export interface CustoDoPlano {
  plano: string;
  chamadas: number;
  dolares: number;
  /** Quantas pessoas do plano usaram IA no período. */
  pessoasAtivas: number;
  /** Quantas pessoas assinam o plano, usem ou não. */
  assinantes: number;
  /**
   * Custo dividido pelos ASSINANTES, não pelos ativos.
   *
   * É este número que responde "o plano se paga?": quem assina e não usa também é
   * receita, e dividir só pelos ativos faria o plano parecer mais caro do que é.
   * Zero assinantes devolve zero, e não infinito.
   */
  porAssinante: number;
  porTipo: CustoDoTipo[];
}

const UM_MILHAO = 1_000_000;

/** Número utilizável, ou zero. Dado de banco às vezes chega como string ou nulo. */
function numero(valor: unknown): number {
  const n = typeof valor === 'string' ? Number(valor) : valor;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * O custo de uma linha de consumo.
 *
 * Voz e modelo têm unidades diferentes — caractere e token — e cada linha só traz
 * uma delas preenchida. Somar as três fórmulas funciona porque o que não se aplica
 * vale zero, e evita um `if` por tipo que envelheceria a cada tipo novo.
 */
export function custoDaLinha(linha: ConsumoMedido, precos: PrecosIA): number {
  const entrada = (numero(linha.tokensEntrada) / UM_MILHAO) * numero(precos.modeloEntrada);
  const saida = (numero(linha.tokensSaida) / UM_MILHAO) * numero(precos.modeloSaida);
  const voz = (numero(linha.caracteres) / UM_MILHAO) * numero(precos.vozCaractere);
  return entrada + saida + voz;
}

export interface EntradaCusto {
  consumo: ConsumoMedido[];
  /** Pessoas distintas que usaram IA no período, por plano. */
  pessoasAtivas: Record<string, number>;
  /** Assinantes de cada plano, usem IA ou não. */
  assinantes: Record<string, number>;
  precos: PrecosIA;
}

/**
 * O custo de cada plano, do mais caro para o mais barato.
 *
 * Plano sem consumo nenhum aparece do mesmo jeito, com zero: "não gastou" é
 * resposta, e um plano que desaparece da lista faz quem lê achar que perdeu dado.
 */
export function custoPorPlano(entrada: EntradaCusto): CustoDoPlano[] {
  const planos = new Set<string>([
    ...entrada.consumo.map((c) => c.plano),
    ...Object.keys(entrada.pessoasAtivas),
    ...Object.keys(entrada.assinantes),
  ]);

  const resultado = [...planos].map((plano) => {
    const linhas = entrada.consumo.filter((c) => c.plano === plano);

    const porTipo: CustoDoTipo[] = TIPOS_USO.map((tipo) => {
      const doTipo = linhas.filter((l) => l.tipo === tipo);
      const chamadas = doTipo.reduce((soma, l) => soma + numero(l.chamadas), 0);
      const dolares = doTipo.reduce((soma, l) => soma + custoDaLinha(l, entrada.precos), 0);
      return { tipo, chamadas, dolares, porChamada: chamadas > 0 ? dolares / chamadas : 0 };
    }).filter((t) => t.chamadas > 0 || t.dolares > 0);

    const chamadas = porTipo.reduce((soma, t) => soma + t.chamadas, 0);
    const dolares = porTipo.reduce((soma, t) => soma + t.dolares, 0);
    const assinantes = numero(entrada.assinantes[plano]);

    return {
      plano,
      chamadas,
      dolares,
      pessoasAtivas: numero(entrada.pessoasAtivas[plano]),
      assinantes,
      porAssinante: assinantes > 0 ? dolares / assinantes : 0,
      porTipo,
    };
  });

  // Do mais caro para o mais barato; empate pelo nome, para a ordem não dançar
  // entre aberturas da tela.
  return resultado.sort((a, b) => b.dolares - a.dolares || a.plano.localeCompare(b.plano));
}

/** Uma linha de `precos_ia`, como ela chega do banco. */
export interface PrecoDeclarado {
  chave: string;
  dolar_por_milhao: number | string;
  confirmado_em: string;
}

export interface PrecosLidos {
  precos: PrecosIA;
  /** Chaves que o banco não tinha. Preço ausente vale zero, e zero subestima. */
  faltando: string[];
  /** A confirmação mais ANTIGA entre os preços usados — o elo mais fraco. */
  confirmadoEm: string | null;
}

const CHAVES: Record<keyof PrecosIA, string> = {
  modeloEntrada: 'modelo-entrada',
  modeloSaida: 'modelo-saida',
  vozCaractere: 'voz-caractere',
};

/**
 * Traduz as linhas de preço, e diz o que ficou faltando.
 *
 * Preço ausente entra como zero — não há palpite razoável para o preço de um
 * fornecedor. Mas zero significa "de graça" numa tela de custo, então a ausência
 * volta em `faltando` para a tela poder dizer que o número está subestimado. Uma
 * auditoria que subestima em silêncio é pior que nenhuma.
 */
export function lerPrecos(linhas: PrecoDeclarado[]): PrecosLidos {
  const porChave = new Map(linhas.map((l) => [l.chave, l]));
  const faltando: string[] = [];
  const datas: string[] = [];

  const valor = (campo: keyof PrecosIA): number => {
    const linha = porChave.get(CHAVES[campo]);
    if (!linha) {
      faltando.push(CHAVES[campo]);
      return 0;
    }
    if (linha.confirmado_em) datas.push(linha.confirmado_em);
    return numero(linha.dolar_por_milhao);
  };

  const precos: PrecosIA = {
    modeloEntrada: valor('modeloEntrada'),
    modeloSaida: valor('modeloSaida'),
    vozCaractere: valor('vozCaractere'),
  };

  return {
    precos,
    faltando,
    confirmadoEm: datas.length > 0 ? datas.sort()[0] : null,
  };
}

/** O total gasto no período, somando todos os planos. */
export function custoTotal(planos: CustoDoPlano[]): number {
  return planos.reduce((soma, p) => soma + p.dolares, 0);
}

/**
 * Dólares em texto, com centavos suficientes para não sumir.
 *
 * Um centésimo de dólar arredondado para duas casas viraria "US$ 0,00", que numa
 * tela de custo se lê como "não gastou nada". Abaixo de um centavo a conta mostra
 * quatro casas.
 */
export function formatarDolar(valor: number): string {
  const n = numero(valor);
  if (n === 0) return 'US$ 0,00';
  const casas = n < 0.01 ? 4 : 2;
  return `US$ ${n.toFixed(casas).replace('.', ',')}`;
}
