import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';

/**
 * A leitura falada, gerada no servidor.
 *
 * Até 28/09 quem falava era o `speechSynthesis` do navegador — de graça, mas
 * robotizado, como o teste no iPhone deixou claro. A decisão fechada na aba
 * Decisões trocou pela voz `pt-BR-Chirp3-HD-Sadaltager` do Google.
 *
 * A chave do Google não passa por aqui: quem chama o Google é a function
 * `ia-voz`, com a chave em `supabase secrets`. O que volta é URL assinada de
 * curta duração para um bucket privado — o áudio é a leitura da pessoa falada
 * em voz alta, e não fica em endereço permanente.
 */

const FUNCAO = 'ia-voz';

export interface LeituraFalada {
  /** URL assinada, válida por cerca de uma hora. */
  url: string;
  /** Veio do cache: não gastou chamada paga nem cota do dia. */
  doCache: boolean;
  /** A leitura passou do teto e foi cortada no fim de uma frase. */
  cortado: boolean;
}

export async function gerarLeituraFalada(texto: string): Promise<LeituraFalada> {
  const { data, error } = await supabase.functions.invoke(FUNCAO, { body: { texto } });
  if (error) throw await erroDaFuncao(error);

  const corpo = data as Partial<LeituraFalada> | null;
  if (!corpo?.url) {
    // A function respondeu, mas sem áudio. Melhor falhar alto aqui do que
    // entregar um player apontando para lugar nenhum.
    throw new Error('A leitura falada voltou sem áudio.');
  }
  return {
    url: corpo.url,
    doCache: corpo.doCache === true,
    cortado: corpo.cortado === true,
  };
}
