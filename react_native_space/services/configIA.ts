import { supabase } from './supabase';
import { AcessoNegadoError } from './acessoNegado';
import { SessaoExpiradaError } from './sessaoExpirada';

/**
 * O interruptor de IA por plano.
 *
 * `services/usoIA.ts` lê esta mesma tabela para desenhar o semáforo do usuário;
 * aqui é o outro lado, o do Painel, que **muda** o que cada plano pode usar.
 *
 * Vale insistir num ponto que o SQL já diz e a tela vai repetir: desligar um
 * recurso aqui desliga **no servidor**. A Edge Function lê esta linha com a
 * service role antes de chamar modelo nenhum, então isto não é preferência de
 * interface — é o limite de verdade.
 */

const TABELA = 'configuracao_ia';
// Numa linha só de propósito: o supabase-js infere o tipo do retorno a partir
// deste literal, e string concatenada faz a inferência desabar.
const COLUNAS = 'plano, imagem_ligada, interpretacao_ligada, pergunta_ligada, voz_ligada, limite_dia, atualizado_em';
const PERMISSAO_NEGADA = '42501';
const JWT_VENCIDO = 'PGRST301';

export type PlanoIA = 'gratuito' | 'iniciante' | 'explorador' | 'mestre';

/** Ordem de exibição: do mais barato ao mais caro, não alfabética. */
export const ORDEM_PLANOS: PlanoIA[] = ['gratuito', 'iniciante', 'explorador', 'mestre'];

export const ROTULO_PLANO: Record<PlanoIA, string> = {
  gratuito: 'Gratuito',
  iniciante: 'Iniciante',
  explorador: 'Explorador',
  mestre: 'Mestre',
};

export interface ConfiguracaoIA {
  plano: PlanoIA;
  imagem_ligada: boolean;
  interpretacao_ligada: boolean;
  pergunta_ligada: boolean;
  voz_ligada: boolean;
  /** Zero quer dizer sem limite diário — a mesma leitura de `usoIA.ts`. */
  limite_dia: number;
  atualizado_em: string | null;
}

/** O que a tela pode mudar. `plano` é chave primária e não se edita. */
export type MudancaConfigIA = Partial<
  Pick<ConfiguracaoIA, 'imagem_ligada' | 'interpretacao_ligada' | 'pergunta_ligada' | 'voz_ligada' | 'limite_dia'>
>;

function traduzirErro(error: { code?: string; message?: string }): Error {
  if (error.code === JWT_VENCIDO || /jwt expired/i.test(error.message ?? '')) {
    return new SessaoExpiradaError();
  }
  if (error.code === PERMISSAO_NEGADA) return new AcessoNegadoError();
  return new Error(error.message || 'Falha ao acessar a configuração de IA.');
}

export async function listarConfiguracaoIA(): Promise<ConfiguracaoIA[]> {
  const { data, error } = await supabase.from(TABELA).select(COLUNAS);
  if (error) throw traduzirErro(error);

  const porPlano = new Map((data ?? []).map((linha) => [linha.plano, linha]));
  // Percorre a ordem dos planos, e não o que veio do banco: assim a tela sai
  // sempre na mesma sequência, e um plano sem linha aparece como falta em vez
  // de sumir da lista sem ninguém notar.
  return ORDEM_PLANOS.flatMap((plano) => {
    const linha = porPlano.get(plano);
    if (!linha) return [];
    return [{
      plano,
      imagem_ligada: linha.imagem_ligada === true,
      interpretacao_ligada: linha.interpretacao_ligada === true,
      pergunta_ligada: linha.pergunta_ligada === true,
      voz_ligada: linha.voz_ligada === true,
      limite_dia: typeof linha.limite_dia === 'number' ? linha.limite_dia : 0,
      atualizado_em: linha.atualizado_em ?? null,
    }];
  });
}

/** Planos que a tabela deveria ter e não tem. */
export function planosFaltando(config: ConfiguracaoIA[]): PlanoIA[] {
  const tem = new Set(config.map((c) => c.plano));
  return ORDEM_PLANOS.filter((p) => !tem.has(p));
}

export async function salvarConfiguracaoIA(
  plano: PlanoIA,
  mudanca: MudancaConfigIA,
): Promise<void> {
  const limite = mudanca.limite_dia;
  if (limite !== undefined && (!Number.isInteger(limite) || limite < 0)) {
    // O banco tem o mesmo check; parar aqui evita uma ida ao servidor para
    // voltar com uma violação de constraint, que não diz nada a quem está na
    // tela.
    throw new Error('O limite por dia tem de ser um número inteiro, zero ou mais.');
  }

  // `atualizado_em` entra explícito: o default da coluna só vale na inserção, e
  // sem isto a data ficaria parada na criação da linha.
  const { error } = await supabase
    .from(TABELA)
    .update({ ...mudanca, atualizado_em: new Date().toISOString() })
    .eq('plano', plano);
  if (error) throw traduzirErro(error);
}
