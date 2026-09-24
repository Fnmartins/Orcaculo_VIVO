import { supabase } from './supabase';
import { AcessoNegadoError } from './acessoNegado';
import { ItemRemovidoError } from './itemRemovido';
import { SessaoExpiradaError } from './sessaoExpirada';
import type { Decisao, Manifestacao, PosicaoManifestacao } from '../utils/decisoes';

const TABELA = 'decisoes';
const TABELA_MANIFESTACOES = 'decisao_manifestacoes';
// Numa linha só de propósito: o supabase-js infere o tipo do retorno a partir
// deste literal, e string concatenada faz a inferência desabar.
const COLUNAS = 'id, titulo, contexto, link, previa, status, decisao_final, decidido_em, decidido_por_nome, criado_em, atualizado_em';
const COLUNAS_MANIFESTACAO = 'id, decisao_id, autor_nome, posicao, texto, criado_em';
const PERMISSAO_NEGADA = '42501';
const JWT_VENCIDO = 'PGRST301';

export const MENSAGEM_DECISAO_FECHADA =
  'Esta decisão já foi fechada. Abra uma nova decisão para continuar a conversa.';

/** A decisão está fechada: o banco recusa manifestação nova, não é falta de acesso. */
export class DecisaoFechadaError extends Error {
  constructor(mensagem: string = MENSAGEM_DECISAO_FECHADA) {
    super(mensagem);
    this.name = 'DecisaoFechadaError';
    Object.setPrototypeOf(this, DecisaoFechadaError.prototype);
  }
}

/** Use isto em vez de `instanceof`: não depende de como a classe foi compilada. */
export function ehDecisaoFechada(e: unknown): boolean {
  return e instanceof DecisaoFechadaError
    || (e as { name?: unknown } | null)?.name === 'DecisaoFechadaError';
}

function ehJwtVencido(error: { code?: string; message?: string }): boolean {
  return error.code === JWT_VENCIDO || /jwt expired/i.test(error.message ?? '');
}

function traduzirErro(error: { code?: string; message?: string }): Error {
  if (ehJwtVencido(error)) return new SessaoExpiradaError();
  if (error.code === PERMISSAO_NEGADA) return new AcessoNegadoError();
  return new Error(error.message || 'Falha ao acessar as decisões.');
}

/**
 * A RLS não devolve erro quando nega leitura: só não traz linhas. Perguntar ao
 * banco se quem chama ainda é super-admin separa "perdeu o acesso" de "está vazio".
 */
async function aindaEhAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_super_admin');
  if (error) throw traduzirErro(error);
  return data === true;
}

export async function listarDecisoes(): Promise<Decisao[]> {
  const { data, error } = await supabase
    .from(TABELA).select(COLUNAS).order('criado_em', { ascending: false });
  if (error) throw traduzirErro(error);
  const decisoes = (data ?? []) as Decisao[];
  if (decisoes.length === 0 && !(await aindaEhAdmin())) throw new AcessoNegadoError();
  return decisoes;
}

export async function criarDecisao(dados: {
  titulo: string;
  contexto: string | null;
  link: string | null;
}): Promise<Decisao> {
  const { data, error } = await supabase
    .from(TABELA).insert(dados).select(COLUNAS).single();
  if (error) throw traduzirErro(error);
  return data as Decisao;
}

/**
 * Fecha a decisão registrando o que ficou combinado.
 *
 * Quem fechou e quando são carimbados pelo banco — não vão daqui. O texto é
 * obrigatório também no banco: sem ele a decisão fechada não diria o que foi
 * decidido, que é a única coisa que alguém vai querer saber depois.
 */
export async function fecharDecisao(id: string, decisaoFinal: string): Promise<Decisao> {
  const { data, error } = await supabase
    .from(TABELA)
    .update({ status: 'decidida', decisao_final: decisaoFinal })
    .eq('id', id)
    .select(COLUNAS);
  if (error) throw traduzirErro(error);
  const linhas = (data ?? []) as Decisao[];
  if (linhas.length === 0) throw (await aindaEhAdmin()) ? new ItemRemovidoError() : new AcessoNegadoError();
  return linhas[0];
}

export async function listarManifestacoes(decisaoId: string): Promise<Manifestacao[]> {
  const { data, error } = await supabase
    .from(TABELA_MANIFESTACOES)
    .select(COLUNAS_MANIFESTACAO)
    .eq('decisao_id', decisaoId)
    .order('criado_em', { ascending: true });
  if (error) throw traduzirErro(error);
  return (data ?? []) as Manifestacao[];
}

/**
 * Registra a manifestação. Autor e data são carimbados pelo banco: antes vinham
 * daqui, e um super-admin podia gravar manifestação em nome do outro numa
 * tabela que o projeto tornou imutável de propósito.
 */
export async function registrarManifestacao(dados: {
  decisaoId: string;
  posicao: PosicaoManifestacao;
  texto: string;
}): Promise<Manifestacao> {
  const { data, error } = await supabase
    .from(TABELA_MANIFESTACOES)
    .insert({
      decisao_id: dados.decisaoId,
      posicao: dados.posicao,
      texto: dados.texto,
    })
    .select(COLUNAS_MANIFESTACAO)
    .single();

  if (error) {
    // A policy recusa inserir em decisão fechada e devolve o mesmo código de
    // permissão negada. Se quem chamou ainda é super-admin, o que barrou foi o
    // fechamento — dizer "acesso negado" aqui seria mentira.
    if (error.code === PERMISSAO_NEGADA && (await aindaEhAdmin())) {
      throw new DecisaoFechadaError();
    }
    throw traduzirErro(error);
  }
  return data as Manifestacao;
}
