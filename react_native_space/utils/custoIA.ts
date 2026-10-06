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

/**
 * O que foi consumido, sem dizer de quem nem de quê.
 *
 * Separado porque a mesma multiplicação serve a dois cortes — por plano e por
 * oráculo — e duplicar a fórmula seria o jeito mais rápido de elas divergirem.
 */
export interface UnidadesConsumidas {
  tokensEntrada: number;
  tokensSaida: number;
  caracteres: number;
}

/** Uma linha de consumo medido, agregada por plano e tipo. */
export interface ConsumoMedido extends UnidadesConsumidas {
  plano: string;
  tipo: TipoUso;
  chamadas: number;
}

/**
 * Consumo agregado por PRODUTO, e não por plano.
 *
 * `tipo` responde "o que a cota cobrou"; `oraculo` responde "o que a pessoa
 * abriu". Quatro produtos diferentes caem em `interpretacao` e custam valores
 * bem diferentes — é esse corte que permite pensar em preço avulso por item,
 * e vem da tabela `consumo_ia` (ver `supabase/consumo-por-oraculo.sql`).
 */
export interface ConsumoPorOraculo extends UnidadesConsumidas {
  oraculo: string;
  chamadas: number;
}

/** Preços em dólares por milhão de unidades, como vêm de `precos_ia`. */
export interface PrecosIA {
  modeloEntrada: number;
  modeloSaida: number;
  /**
   * Dólares por milhão de caracteres sintetizados — preço **cheio**, sem franquia.
   *
   * A voz do app é `pt-BR-Chirp3-HD-Sadaltager`, do Chirp 3 HD, que dá 1 milhão de
   * caracteres grátis por mês. A uns 350 caracteres por leitura, isso é perto de 2.900
   * leituras faladas mensais que não custam nada — então, enquanto o volume for
   * pequeno, esta conta cobra o que a fatura não cobrou.
   *
   * **É de propósito, e descontar a franquia aqui seria um erro.** A pergunta que a aba
   * Custo responde é "o plano se paga?", e a franquia desaparece exatamente no volume em
   * que a resposta importa. Preço cheio erra para o lado seguro; franquia modelada
   * acertaria o mês fraco e mentiria no mês que decide preço — além de pedir reset
   * mensal e rateio entre vozes, que é estado que esta função pura não tem e não deve
   * ter. Os preços do modelo não têm franquia nenhuma, então a assimetria é só daqui.
   *
   * **Se a voz mudar em `supabase/functions/ia-voz/index.ts`, este preço muda com ela.**
   * Os tiers do Google vão de US$ 4 (Standard, WaveNet) a US$ 160 (Studio) por milhão;
   * o Chirp 3 HD está em US$ 30. Trocar a voz sem trocar o preço não dá erro em lugar
   * nenhum — só uma conta errada de que ninguém desconfia. Em 05/10/2026 esta chave
   * estava em US$ 10, que não é tier de ninguém, e subestimava a voz em 3×.
   */
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
export function custoDaLinha(linha: UnidadesConsumidas, precos: PrecosIA): number {
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

export interface CustoDoOraculo {
  oraculo: string;
  chamadas: number;
  dolares: number;
  /** O número que decide preço avulso: quanto custa UMA leitura deste produto. */
  porChamada: number;
}

/**
 * O custo de cada produto, do mais caro por chamada para o mais barato.
 *
 * **Ordena por `porChamada`, e não pelo total.** Total alto só diz que o produto
 * foi muito usado; para decidir o preço de uma unidade o que importa é o custo de
 * uma unidade. Um oráculo caríssimo usado duas vezes tem total baixo e é
 * exatamente o que não se pode vender barato.
 *
 * Produto sem chamada nenhuma não aparece: diferente dos planos, onde "não gastou"
 * é resposta sobre um plano que existe, aqui a lista é dos produtos que rodaram no
 * período — e inventar linha zerada para cada oráculo possível encheria a tela de
 * nada.
 */
export function custoPorOraculo(
  linhas: ConsumoPorOraculo[],
  precos: PrecosIA,
): CustoDoOraculo[] {
  const porOraculo = new Map<string, CustoDoOraculo>();

  // Lista ausente não derruba a aba.
  //
  // A function deixa o corte por oráculo cair sem derrubar o resto, e o serviço
  // põe `[]` no lugar — mas o único jeito de a tela de auditoria sumir inteira por
  // causa de um extra é este `for`. Custou nove testes vermelhos para aparecer, e
  // em produção custaria a tela do dono numa versão fora de passo com o servidor.
  if (!Array.isArray(linhas)) return [];

  for (const linha of linhas) {
    const atual = porOraculo.get(linha.oraculo)
      ?? { oraculo: linha.oraculo, chamadas: 0, dolares: 0, porChamada: 0 };
    atual.chamadas += numero(linha.chamadas);
    atual.dolares += custoDaLinha(linha, precos);
    porOraculo.set(linha.oraculo, atual);
  }

  for (const item of porOraculo.values()) {
    item.porChamada = item.chamadas > 0 ? item.dolares / item.chamadas : 0;
  }

  // Empate pelo nome, para a ordem não dançar entre aberturas da tela.
  return [...porOraculo.values()]
    .sort((a, b) => b.porChamada - a.porChamada || a.oraculo.localeCompare(b.oraculo));
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
