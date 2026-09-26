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
type Cliente = { from: (tabela: string) => any };

export function hojeISO(hoje: Date = new Date()): string {
  return hoje.toISOString().slice(0, 10);
}

const COLUNAS_CONFIG = 'imagem_ligada, interpretacao_ligada, pergunta_ligada, limite_dia';

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

/** Chamar só depois que a leitura existe: ninguém paga por falha nossa. */
export async function registrarUso(
  cliente: Cliente,
  usuarioId: string,
  tipo: TipoUso,
  usadoHoje: number,
): Promise<void> {
  const { error } = await cliente.from('uso_ia').upsert({
    usuario_id: usuarioId, dia: hojeISO(), tipo, quantidade: usadoHoje + 1,
  }, { onConflict: 'usuario_id,dia,tipo' });
  if (error) console.error('falha ao contar uso', error.message);
}

const NOME: Record<TipoUso, string> = {
  imagem: 'A leitura por imagem',
  interpretacao: 'O aprofundamento com IA',
  pergunta: 'As perguntas',
};

export function mensagemDoLimite(veredito: Veredito, tipo: TipoUso): string {
  if (veredito.motivo === 'desligado') {
    return `${NOME[tipo]} não está disponível no seu plano.`;
  }
  return 'Você já usou o limite de hoje. Amanhã tem mais.';
}
