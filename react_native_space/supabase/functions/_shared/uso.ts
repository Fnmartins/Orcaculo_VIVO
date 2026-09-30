// supabase/functions/_shared/uso.ts
//
// O contador diário de uso de IA: lê a configuração do plano, lê quanto a
// pessoa já usou hoje e devolve o veredito.
//
// Separado de limites.ts porque este toca banco. Lá ficou só a decisão, pura,
// para o Jest do app poder testá-la sem subir nada.
import { decidirUso, type ConfiguracaoIA, type TipoUso, type Veredito } from './limites.ts';

/**
 * O cliente do supabase-js tipado de leve: este arquivo roda no Deno e não
 * entra no tsc do app, e amarrar os tipos do query builder aqui só daria
 * trabalho sem ganhar nada.
 */
// deno-lint-ignore no-explicit-any
type Cliente = { from: (tabela: string) => any; rpc: (nome: string, args: unknown) => any };

/**
 * O que uma chamada consumiu de verdade.
 *
 * Contar chamadas nao e medir custo: uma interpretacao de mapa gasta muito mais
 * que uma pergunta curta. Estes numeros vem da resposta do fornecedor — `usage`
 * da Anthropic, tamanho do texto na voz — e sao o que torna a auditoria do item 31
 * medida em vez de estimada.
 *
 * Todos opcionais: um tipo de uso que nao gaste token nao precisa fingir que
 * gasta.
 */
export interface ConsumoIA {
  entrada?: number | null;
  saida?: number | null;
  /** Caracteres sintetizados. A Google cobra a voz por caractere, nao por token. */
  caracteres?: number | null;
}

/** Inteiro nao-negativo, ou zero. Protege o banco de `null`, de NaN e de fracao. */
function inteiroSeguro(valor: number | null | undefined): number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0
    ? Math.round(valor)
    : 0;
}

export function hojeISO(hoje: Date = new Date()): string {
  return hoje.toISOString().slice(0, 10);
}

const COLUNAS_CONFIG = 'imagem_ligada, interpretacao_ligada, pergunta_ligada, voz_ligada, limite_dia';

/**
 * Erro de leitura não barra ninguém: `decidirUso` com configuração nula deixa
 * passar. Tabela nova não pode derrubar recurso que já estava no ar — o que
 * sobra é o log, para a falha não ficar invisível.
 */
export async function conferirUso(
  cliente: Cliente,
  usuarioId: string,
  plano: string,
  semLimite: boolean,
  tipo: TipoUso,
): Promise<Veredito> {
  let config: ConfiguracaoIA | null = null;
  const { data: linha, error } = await cliente
    .from('configuracao_ia').select(COLUNAS_CONFIG).eq('plano', plano).maybeSingle();
  if (error) console.error('falha ao ler configuracao_ia', error.message);
  else if (linha) config = linha as ConfiguracaoIA;

  const { data: uso, error: erroUso } = await cliente
    .from('uso_ia').select('quantidade')
    .eq('usuario_id', usuarioId).eq('dia', hojeISO()).eq('tipo', tipo).maybeSingle();
  if (erroUso) console.error('falha ao ler uso_ia', erroUso.message);
  const usado = typeof uso?.quantidade === 'number' ? uso.quantidade : 0;

  return decidirUso(tipo, config, usado, semLimite);
}

/**
 * Conta a chamada e guarda o que ela consumiu.
 *
 * Chamar só depois que a leitura existe: ninguém paga por falha nossa.
 *
 * A soma acontece no banco (`contar_uso_ia`), e não aqui. Antes isto lia quanto a
 * pessoa havia usado e gravava esse número mais um — duas chamadas ao mesmo tempo
 * liam 3 e gravavam 4, e uma chamada desaparecia da conta. Com ela, o limite
 * diário do plano ficava mais frouxo do que o plano diz, o que é dinheiro.
 *
 * O dia vai de `hojeISO()`, a mesma fonte que `conferirUso` usa para LER o
 * contador: se o banco escolhesse o dia por conta dele, a leitura e a gravação
 * poderiam cair em linhas diferentes na virada.
 */
export async function registrarUso(
  cliente: Cliente,
  usuarioId: string,
  tipo: TipoUso,
  consumo: ConsumoIA = {},
): Promise<void> {
  const { error } = await cliente.rpc('contar_uso_ia', {
    p_usuario: usuarioId,
    p_dia: hojeISO(),
    p_tipo: tipo,
    p_entrada: inteiroSeguro(consumo.entrada),
    p_saida: inteiroSeguro(consumo.saida),
    p_caracteres: inteiroSeguro(consumo.caracteres),
  });
  if (error) console.error('falha ao contar uso', error.message);
}

// `mensagemDoLimite` mudou para `limites.ts`: ela é decisão pura sobre um veredito,
// e aqui ficava num módulo que toca banco, fora do alcance do Jest. A
// re-exportação evita mexer nos quatro importadores só por causa do caminho.
export { mensagemDoLimite } from './limites.ts';
