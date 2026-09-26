import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';
import { LIMITE_PERGUNTA, RESPOSTA_CRISE, triar } from '../utils/perguntas';

/**
 * A pergunta depois da leitura, e as duas coisas que andam com ela:
 * o consentimento para guardá-la e a denúncia do que a IA escreveu.
 *
 * A triagem de crise roda aqui antes da rede — mais rápida, de graça e
 * funciona sem sinal. Ela não substitui a do servidor: requisição feita à mão
 * não passa por este arquivo.
 */

export interface RespostaPergunta {
  resposta: string;
  /** Verdadeiro quando a resposta é o acolhimento, não uma leitura. */
  crise: boolean;
  /** Quantas perguntas ainda cabem hoje. Nulo quando não há limite. */
  restanteHoje: number | null;
}

export type ContextoPergunta =
  | { oraculo: 'tarot'; cartas: { nome: string; posicao: string }[] }
  | {
    oraculo: 'buzios';
    odu: { nome: string; numero: number; descricao: string; orixas: string[] };
  };

export async function perguntar(
  contexto: ContextoPergunta,
  pergunta: string,
): Promise<RespostaPergunta> {
  const triagem = triar(pergunta);
  if (triagem.tipo === 'crise') {
    return { resposta: RESPOSTA_CRISE, crise: true, restanteHoje: null };
  }
  if (triagem.tipo === 'vazia') throw new Error('Escreva a sua pergunta.');
  if (triagem.tipo === 'longa') {
    throw new Error(`A pergunta passou de ${LIMITE_PERGUNTA} caracteres.`);
  }

  const { data, error } = await supabase.functions.invoke('ia-pergunta', {
    body: { ...contexto, pergunta: pergunta.trim() },
  });
  if (error) throw await erroDaFuncao(error);

  const bruto = (data ?? {}) as Partial<RespostaPergunta>;
  if (!bruto.resposta) throw new Error('A resposta voltou vazia. Tente de novo.');
  return {
    resposta: bruto.resposta,
    crise: bruto.crise === true,
    restanteHoje: typeof bruto.restanteHoje === 'number' ? bruto.restanteHoje : null,
  };
}

/**
 * Consentimento para guardar a pergunta, anonimizada.
 *
 * Falha de leitura vira "não consentiu", de propósito: se a coluna ainda não
 * existe no banco, o certo é não guardar nada — nunca o contrário.
 */
export async function lerConsentimentoPerguntas(usuarioId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('perfis').select('consentimento_perguntas').eq('id', usuarioId).maybeSingle();
  if (error) return false;
  return data?.consentimento_perguntas === true;
}

export async function gravarConsentimentoPerguntas(
  usuarioId: string,
  valor: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('perfis').update({ consentimento_perguntas: valor }).eq('id', usuarioId);
  if (error) throw new Error('Não foi possível salvar a sua escolha agora.');
}

export interface Denuncia {
  origem: 'pergunta' | 'interpretacao' | 'imagem';
  /** O texto como a pessoa leu: sem ele não há o que investigar. */
  conteudo: string;
  oraculo?: string;
  motivo?: string;
}

/**
 * Denúncia de conteúdo gerado por IA. A loja exige o botão; antes disso, é o
 * único caminho de volta quando o modelo escreve algo que não devia.
 */
export async function denunciarConteudoIA(denuncia: Denuncia): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const autorId = auth?.user?.id;
  if (!autorId) throw new Error('Entre na sua conta para denunciar.');

  const { error } = await supabase.from('denuncias_ia').insert({
    origem: denuncia.origem,
    oraculo: denuncia.oraculo ?? null,
    conteudo: denuncia.conteudo.slice(0, 4000),
    motivo: denuncia.motivo?.trim().slice(0, 500) || null,
    autor_id: autorId,
  });
  if (error) throw new Error('Não foi possível enviar a denúncia agora. Tente de novo.');
}
