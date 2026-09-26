import { supabase } from './supabase';

/**
 * Quanto de IA o plano permite por dia, e quanto já foi usado hoje.
 *
 * Aqui só se **lê**. Quem decide deixar passar é a Edge Function, com a
 * service role — decisão de limite tomada no cliente é sugestão, não limite.
 * Este arquivo existe para a tela poder dizer o número antes de a pessoa
 * gastar, em vez de ela descobrir no erro.
 */

export type TipoUso = 'imagem' | 'interpretacao' | 'pergunta';

export interface UsoDoDia {
  /** O recurso está ligado para este plano. */
  ligado: boolean;
  usadoHoje: number;
  /** Nulo quer dizer sem limite diário. */
  limiteDia: number | null;
}

// Colunas literais, numa linha: o supabase-js analisa esta string em tempo de
// compilação para tipar o retorno, e montá-la com template derruba o tsc.
const COLUNAS = 'imagem_ligada, interpretacao_ligada, pergunta_ligada, limite_dia';

/**
 * O dia em UTC, 'YYYY-MM-DD' — a mesma régua que `_shared/uso.ts` usa para
 * gravar. Cliente e servidor contando dias diferentes seria pior que qualquer
 * fuso: entre 21h e meia-noite de Brasília o app diria "zero usadas" enquanto
 * o servidor já teria contado três.
 *
 * Fuso nomeado ficaria melhor para quem usa, mas `Intl` com `timeZone` não é
 * confiável no Hermes do Android, e a régua tem de ser a mesma nos dois lados.
 * Consequência conhecida: o limite diário vira no fim da tarde no Brasil.
 */
function diaUTC(hoje: Date = new Date()): string {
  return hoje.toISOString().slice(0, 10);
}

/**
 * Devolve nulo quando não há o que mostrar — sem linha de configuração, ou
 * falha de leitura. A tela então não mostra semáforo nenhum, em vez de mostrar
 * um número inventado.
 */
export async function lerUsoDoDia(
  usuarioId: string,
  plano: string,
  tipo: TipoUso,
): Promise<UsoDoDia | null> {
  const { data: config, error: erroConfig } = await supabase
    .from('configuracao_ia')
    .select(COLUNAS)
    .eq('plano', plano)
    .maybeSingle();
  if (erroConfig || !config) return null;

  const ligado = tipo === 'imagem' ? config.imagem_ligada === true
    : tipo === 'interpretacao' ? config.interpretacao_ligada === true
      : config.pergunta_ligada === true;
  const limite = typeof config.limite_dia === 'number' ? config.limite_dia : 0;

  const { data: uso } = await supabase
    .from('uso_ia').select('quantidade')
    .eq('usuario_id', usuarioId).eq('dia', diaUTC()).eq('tipo', tipo)
    .maybeSingle();

  return {
    ligado,
    usadoHoje: typeof uso?.quantidade === 'number' ? uso.quantidade : 0,
    limiteDia: limite > 0 ? limite : null,
  };
}
