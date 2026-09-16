import { supabase } from './supabase';
import { AcessoNegadoError } from './acessoNegado';
import type { ItemRoadmap, StatusRoadmap } from '../utils/roadmap';

export interface DadosItemRoadmap {
  fase: string;
  titulo: string;
  descricao: string | null;
  status: StatusRoadmap;
  ordem: number;
}

const TABELA = 'roadmap_itens';
const COLUNAS = 'id, fase, titulo, descricao, status, ordem, criado_em, atualizado_em';
const PERMISSAO_NEGADA = '42501';

function traduzirErro(error: { code?: string; message?: string }): Error {
  if (error.code === PERMISSAO_NEGADA) return new AcessoNegadoError();
  return new Error(error.message || 'Falha ao acessar o roadmap.');
}

export async function listarRoadmap(): Promise<ItemRoadmap[]> {
  const { data, error } = await supabase.from(TABELA).select(COLUNAS).order('ordem', { ascending: true });
  if (error) throw traduzirErro(error);
  return (data ?? []) as ItemRoadmap[];
}

export async function criarItemRoadmap(dados: DadosItemRoadmap): Promise<ItemRoadmap> {
  const { data, error } = await supabase.from(TABELA).insert(dados).select(COLUNAS).single();
  if (error) throw traduzirErro(error);
  return data as ItemRoadmap;
}

// Sem permissão, a RLS não devolve erro no update/delete: só não afeta linha.
// Por isso pedimos as linhas de volta e tratamos "nenhuma" como acesso negado.
export async function atualizarItemRoadmap(
  id: string,
  dados: Partial<DadosItemRoadmap>,
): Promise<ItemRoadmap> {
  const { data, error } = await supabase.from(TABELA).update(dados).eq('id', id).select(COLUNAS);
  if (error) throw traduzirErro(error);
  const linhas = (data ?? []) as ItemRoadmap[];
  if (linhas.length === 0) throw new AcessoNegadoError();
  return linhas[0];
}

export async function excluirItemRoadmap(id: string): Promise<void> {
  const { data, error } = await supabase.from(TABELA).delete().eq('id', id).select('id');
  if (error) throw traduzirErro(error);
  if ((data ?? []).length === 0) throw new AcessoNegadoError();
}
