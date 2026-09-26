import { supabase } from './supabase';
import { AcessoNegadoError } from './acessoNegado';
import { ItemRemovidoError } from './itemRemovido';
import { SessaoExpiradaError } from './sessaoExpirada';

/**
 * As denúncias de conteúdo de IA e as perguntas guardadas.
 *
 * Existe porque um botão de denúncia sem ninguém do outro lado não é
 * moderação, é enfeite — e porque guardar perguntas só se justifica se alguém
 * as lê. As duas tabelas só abrem para super-admin (RLS em
 * supabase/perguntas.sql); a de perguntas não tem autor para ler.
 */

const TABELA_DENUNCIAS = 'denuncias_ia';
const TABELA_PERGUNTAS = 'perguntas_anonimas';
// Numa linha só: o supabase-js infere o tipo do retorno deste literal, e string
// montada faz a inferência desabar.
const COLUNAS_DENUNCIA = 'id, origem, oraculo, conteudo, motivo, criado_em, resolvida';
const COLUNAS_PERGUNTA = 'id, oraculo, contexto, pergunta, dia';
const PERMISSAO_NEGADA = '42501';
const JWT_VENCIDO = 'PGRST301';

export type OrigemDenuncia = 'pergunta' | 'interpretacao' | 'imagem';

export interface DenunciaIA {
  id: string;
  origem: OrigemDenuncia;
  oraculo: string | null;
  conteudo: string;
  motivo: string | null;
  criado_em: string;
  resolvida: boolean;
}

export interface PerguntaAnonima {
  id: string;
  oraculo: 'tarot' | 'buzios';
  contexto: string | null;
  pergunta: string;
  /** Só o dia, sem hora: é assim que a tabela guarda, para não dar para cruzar. */
  dia: string;
}

function ehJwtVencido(error: { code?: string; message?: string }): boolean {
  return error.code === JWT_VENCIDO || /jwt expired/i.test(error.message ?? '');
}

function traduzirErro(error: { code?: string; message?: string }): Error {
  if (ehJwtVencido(error)) return new SessaoExpiradaError();
  if (error.code === PERMISSAO_NEGADA) return new AcessoNegadoError();
  return new Error(error.message || 'Falha ao acessar a moderação.');
}

/**
 * A RLS não devolve erro quando nega leitura: só não traz linhas. Perguntar ao
 * banco se quem chama ainda é super-admin separa "perdeu o acesso" de "não tem
 * denúncia nenhuma" — que é o estado que a gente quer ver todo dia.
 */
async function aindaEhAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_super_admin');
  if (error) throw traduzirErro(error);
  return data === true;
}

/** Abertas primeiro, e dentro de cada grupo a mais recente no topo. */
export async function listarDenuncias(): Promise<DenunciaIA[]> {
  const { data, error } = await supabase
    .from(TABELA_DENUNCIAS).select(COLUNAS_DENUNCIA)
    .order('resolvida', { ascending: true })
    .order('criado_em', { ascending: false });
  if (error) throw traduzirErro(error);
  const denuncias = (data ?? []) as DenunciaIA[];
  if (denuncias.length === 0 && !(await aindaEhAdmin())) throw new AcessoNegadoError();
  return denuncias;
}

export async function resolverDenuncia(id: string, resolvida: boolean): Promise<DenunciaIA> {
  const { data, error } = await supabase
    .from(TABELA_DENUNCIAS).update({ resolvida }).eq('id', id).select(COLUNAS_DENUNCIA);
  if (error) throw traduzirErro(error);
  const linhas = (data ?? []) as DenunciaIA[];
  if (linhas.length === 0) {
    throw (await aindaEhAdmin()) ? new ItemRemovidoError() : new AcessoNegadoError();
  }
  return linhas[0];
}

/**
 * As perguntas guardadas, das mais novas para as mais velhas. Lista vazia é o
 * estado normal no começo: só entra pergunta de quem autorizou, e só pergunta
 * comum — saúde e crise nunca são guardadas.
 */
export async function listarPerguntasAnonimas(limite = 100): Promise<PerguntaAnonima[]> {
  const { data, error } = await supabase
    .from(TABELA_PERGUNTAS).select(COLUNAS_PERGUNTA)
    .order('dia', { ascending: false })
    .limit(limite);
  if (error) throw traduzirErro(error);
  return (data ?? []) as PerguntaAnonima[];
}
