import { supabase } from './supabase';
import { AcessoNegadoError } from './acessoNegado';
import { SessaoExpiradaError } from './sessaoExpirada';

/**
 * As amostras de voz candidatas e os votos sobre elas.
 *
 * O catálogo **não** é uma tabela: é o próprio bucket. Uma tabela de catálogo
 * ao lado dos arquivos daria duas fontes para a mesma verdade, e elas
 * divergiriam no primeiro envio feito pelo painel do Supabase sem o insert
 * correspondente. Listando o bucket, subir um arquivo é tudo o que existe para
 * fazer.
 *
 * O nome do arquivo carrega a informação: `google-Aoede.mp3` é a voz Aoede do
 * Google. É a mesma convenção que `scripts/amostras-voz.js` escreve.
 */

const BUCKET = 'vozes';
const TABELA_VOTOS = 'voz_votos';
// Numa linha só: o supabase-js infere o tipo do retorno a partir deste literal,
// e string concatenada faz a inferência desabar.
const COLUNAS_VOTO = 'voz, usuario_id, nota, atualizado_em';
const PERMISSAO_NEGADA = '42501';
const JWT_VENCIDO = 'PGRST301';

export interface AmostraVoz {
  /** Nome do arquivo sem extensão, e chave do voto: `google-Aoede`. */
  id: string;
  marca: string;
  nome: string;
  url: string;
}

export interface VotoVoz {
  voz: string;
  usuario_id: string;
  nota: number;
}

function traduzirErro(error: { code?: string; message?: string }): Error {
  if (error.code === JWT_VENCIDO || /jwt expired/i.test(error.message ?? '')) {
    return new SessaoExpiradaError();
  }
  if (error.code === PERMISSAO_NEGADA) return new AcessoNegadoError();
  return new Error(error.message || 'Falha ao acessar as amostras de voz.');
}

/** `google-Aoede.mp3` → marca "Google", nome "Aoede". */
export function lerNomeDoArquivo(
  arquivo: string,
): { id: string; marca: string; nome: string } | null {
  if (!arquivo.toLowerCase().endsWith('.mp3')) return null;
  const id = arquivo.slice(0, -4);
  const corte = id.indexOf('-');
  if (corte <= 0 || corte === id.length - 1) return null;
  const marcaBruta = id.slice(0, corte);
  const marca = marcaBruta === 'google' ? 'Google'
    : marcaBruta === 'openai' ? 'OpenAI'
      : marcaBruta;
  return { id, marca, nome: id.slice(corte + 1) };
}

export async function listarAmostras(): Promise<AmostraVoz[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 200 });
  if (error) throw traduzirErro(error as { code?: string; message?: string });

  return (data ?? [])
    .flatMap((arquivo) => {
      const partes = lerNomeDoArquivo(arquivo.name);
      if (!partes) return [];
      const { data: publico } = supabase.storage.from(BUCKET).getPublicUrl(arquivo.name);
      return [{ ...partes, url: publico.publicUrl }];
    })
    // Agrupa por marca e ordena por nome dentro dela: a lista fica estável
    // entre aberturas, e duas vozes da mesma marca ficam perto para comparar.
    .sort((a, b) => a.marca.localeCompare(b.marca) || a.nome.localeCompare(b.nome));
}

export async function listarVotos(): Promise<VotoVoz[]> {
  const { data, error } = await supabase.from(TABELA_VOTOS).select(COLUNAS_VOTO);
  if (error) throw traduzirErro(error);
  return (data ?? []).map((v) => ({
    voz: v.voz,
    usuario_id: v.usuario_id,
    nota: typeof v.nota === 'number' ? v.nota : 0,
  }));
}

export async function salvarVoto(voz: string, usuarioId: string, nota: number): Promise<void> {
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    throw new Error('A nota tem de ser um número inteiro de 1 a 5.');
  }
  // `upsert` na chave composta: votar de novo corrige a própria nota em vez de
  // empilhar uma segunda linha.
  const { error } = await supabase
    .from(TABELA_VOTOS)
    .upsert(
      { voz, usuario_id: usuarioId, nota, atualizado_em: new Date().toISOString() },
      { onConflict: 'voz,usuario_id' },
    );
  if (error) throw traduzirErro(error);
}

/** Tirar a nota é apagar a linha — não existe nota zero. */
export async function apagarVoto(voz: string, usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from(TABELA_VOTOS)
    .delete()
    .eq('voz', voz)
    .eq('usuario_id', usuarioId);
  if (error) throw traduzirErro(error);
}

export interface ResumoVoz {
  voz: string;
  media: number;
  quantos: number;
}

/**
 * O pódio: média por voz, da maior para a menor.
 *
 * Empate de média desempata por quantidade — quatro estrelas com dois votos
 * valem mais que quatro estrelas com um.
 */
export function resumirVotos(votos: VotoVoz[]): ResumoVoz[] {
  const porVoz = new Map<string, number[]>();
  for (const voto of votos) {
    const lista = porVoz.get(voto.voz) ?? [];
    lista.push(voto.nota);
    porVoz.set(voto.voz, lista);
  }
  return [...porVoz.entries()]
    .map(([voz, notas]) => ({
      voz,
      media: notas.reduce((a, b) => a + b, 0) / notas.length,
      quantos: notas.length,
    }))
    .sort((a, b) => b.media - a.media || b.quantos - a.quantos || a.voz.localeCompare(b.voz));
}
