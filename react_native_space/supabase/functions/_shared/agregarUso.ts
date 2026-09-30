// supabase/functions/_shared/agregarUso.ts
// A agregacao do consumo de IA: linhas de `uso_ia` viram totais por plano e tipo.
//
// Pura e sem dependencia, para ser testada pelo Jest do app
// (services/__tests__/agregarUso.test.ts), como `escritas.ts` e
// `regras-acessos.ts`.
//
// Existe por causa de um defeito real: a primeira versao do `admin-custo` pedia o
// plano por encaixe do PostgREST (`perfis!inner(plano)`), e isso NAO funciona —
// `uso_ia.usuario_id` referencia `auth.users(id)`, nao `public.perfis(id)`, e sem
// chave estrangeira entre as duas tabelas nao ha encaixe. A function respondia 502 e
// a tela dizia "nao foi possivel carregar o custo".
//
// O `conferir-functions` nao pega isso (ele ve sintaxe) e a function nao tinha
// teste. Tirar a conta de dentro dela e o que torna a conta testavel.

/** Uma linha de `uso_ia` como o driver entrega — numeros podem vir como texto. */
export interface LinhaUso {
  usuario_id?: string | null;
  dia?: string | null;
  tipo?: string | null;
  quantidade?: number | string | null;
  tokens_entrada?: number | string | null;
  tokens_saida?: number | string | null;
  caracteres?: number | string | null;
}

export interface ConsumoAgregado {
  plano: string;
  tipo: string;
  chamadas: number;
  tokensEntrada: number;
  tokensSaida: number;
  caracteres: number;
}

export interface Agregado {
  consumo: ConsumoAgregado[];
  /** Pessoas DISTINTAS por plano: a mesma pessoa em cinco dias conta uma. */
  pessoasAtivas: Record<string, number>;
  /**
   * Primeiro dia com consumo medido de verdade (token ou caractere acima de zero).
   *
   * Nao e o primeiro dia com chamada: antes de 29/09/2026 as colunas de consumo nao
   * existiam, e ha linha com chamada e token zero. Misturar as duas datas faria a
   * tela dizer que mede desde antes de medir.
   */
  medidoDesde: string | null;
}

/**
 * Plano de quem usou IA mas nao tem linha em `perfis`.
 *
 * Nao deveria acontecer — apagar a conta cascateia `uso_ia` —, mas se acontecer o
 * consumo aparece sob este rotulo em vez de desaparecer da soma. Consumo que some
 * faz o total mentir para baixo.
 */
export const SEM_PLANO = 'sem plano';

/** Numero utilizavel, ou zero. `bigint` chega como string no driver. */
function numero(valor: unknown): number {
  const n = typeof valor === 'string' ? Number(valor) : valor;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
}

export function agregarConsumo(
  linhas: LinhaUso[],
  planoPorUsuario: Record<string, string>,
): Agregado {
  const porChave = new Map<string, ConsumoAgregado>();
  const pessoas = new Map<string, Set<string>>();
  let medidoDesde: string | null = null;

  for (const linha of linhas) {
    const usuario = String(linha.usuario_id ?? '');
    const tipo = String(linha.tipo ?? '');
    if (!usuario || !tipo) continue;

    const plano = planoPorUsuario[usuario] ?? SEM_PLANO;
    const chave = `${plano}|${tipo}`;
    const atual = porChave.get(chave) ?? {
      plano, tipo, chamadas: 0, tokensEntrada: 0, tokensSaida: 0, caracteres: 0,
    };

    const entrada = numero(linha.tokens_entrada);
    const saida = numero(linha.tokens_saida);
    const caracteres = numero(linha.caracteres);

    atual.chamadas += numero(linha.quantidade);
    atual.tokensEntrada += entrada;
    atual.tokensSaida += saida;
    atual.caracteres += caracteres;
    porChave.set(chave, atual);

    const doPlano = pessoas.get(plano) ?? new Set<string>();
    doPlano.add(usuario);
    pessoas.set(plano, doPlano);

    const dia = String(linha.dia ?? '');
    if (entrada + saida + caracteres > 0 && dia
        && (medidoDesde === null || dia < medidoDesde)) {
      medidoDesde = dia;
    }
  }

  return {
    consumo: [...porChave.values()],
    pessoasAtivas: Object.fromEntries(
      [...pessoas.entries()].map(([plano, conjunto]) => [plano, conjunto.size]),
    ),
    medidoDesde,
  };
}
