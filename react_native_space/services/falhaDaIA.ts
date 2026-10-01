/**
 * Como uma chamada de IA que falhou deve aparecer na tela.
 *
 * Mora aqui, e não em `services/ia.ts`, pelo mesmo motivo que `mensagemDoLimite` saiu
 * de `uso.ts`: aquele módulo cria o cliente do Supabase no import, e decisão pura
 * trancada atrás de rede fica fora do alcance do Jest.
 *
 * O defeito que isto corrige: as telas de tarô e búzios guardavam o erro num booleano
 * e escreviam sempre "Falha ao conectar. Tocar para tentar novamente." O servidor
 * sempre soube o motivo — "Seu acesso terminou em 28/09", "Suas consultas deste
 * período acabaram" — e a tela trocava os dois por um erro de conexão que não
 * aconteceu, convidando a insistir num caminho que não ia abrir.
 */

/** O `name` que `services/ia` carimba no erro quando o servidor responde 402. */
export const NOME_SEM_CONSULTAS = 'SemConsultasError';

/** A frase para quando não há motivo nenhum a dizer. */
export const FALHA_SEM_MOTIVO = 'Falha ao conectar. Tocar para tentar novamente.';

/** A cota do período acabou, ou o acesso venceu — é recusa de plano, não falha de serviço. */
export function ehSemConsultas(e: unknown): boolean {
  return (e as { name?: unknown } | null)?.name === NOME_SEM_CONSULTAS;
}

export interface FalhaDaIA {
  /** O que mostrar: a frase do servidor quando ela existe. */
  texto: string;
  /**
   * Oferecer nova tentativa? Recusa de plano não muda por insistência, e convidar a
   * tocar de novo ali é prometer uma saída que não existe.
   */
  tentarDeNovo: boolean;
}

export function falhaDaIA(e: unknown): FalhaDaIA {
  // `instanceof Error` e não checagem de `.message` solta: um objeto qualquer com
  // `message` pode vir de origem nenhuma confiável, e texto desconhecido na tela é
  // pior que a frase genérica.
  const texto = e instanceof Error ? e.message.trim() : '';
  // Error sem mensagem existe — `new Error()` e algumas rejeições de rede — e aí não
  // há motivo a mostrar, só o aviso de sempre.
  if (!texto) return { texto: FALHA_SEM_MOTIVO, tentarDeNovo: true };
  return { texto, tentarDeNovo: !ehSemConsultas(e) };
}
