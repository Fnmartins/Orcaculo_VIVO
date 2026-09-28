import { supabase } from './supabase';
import { buscarCidades as buscarNaListaLocal, type Cidade } from '../data/cidades';

/**
 * Busca de cidade de nascimento no banco.
 *
 * A lista dentro do app tem 53 cidades e o Arcanus atende Brasil, Estados
 * Unidos, Canadá e Europa — Santo Ângelo (RS) não estava lá, e não havia como
 * estar. A base de verdade fica no Postgres (`supabase/cidades.sql`), com o
 * recorte do GeoNames, e a busca corre no servidor: o pacote do app não cresce
 * e qualquer aparelho acha a mesma cidade.
 *
 * **A lista local não morre: vira rede de proteção.** Sem internet, com a
 * tabela ainda vazia ou com o banco fora do ar, o formulário continua achando
 * as capitais em vez de travar quem quer o próprio mapa.
 */

// Numa linha só: o supabase-js infere o tipo do retorno deste literal.
const COLUNAS = 'id, nome, regiao, pais, lat, lon, fuso, populacao';

/** Sem acento e em minúsculas, igual ao que a coluna `nome_busca` guarda. */
export function achatar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * O offset padrão do fuso, usado só como reserva quando o ambiente não sabe
 * fusos nomeados. Derivado do próprio fuso, porque zero seria um palpite ruim
 * para o Brasil — `utils/fuso.ts` só recorre a isto se o `Intl` faltar.
 */
function offsetPadraoDoFuso(fuso: string): number {
  try {
    const formato = new Intl.DateTimeFormat('en-US', {
      timeZone: fuso, hour12: false, year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    // Meio do ano no sul, meio do inverno no norte: nos dois é horário padrão.
    const referencia = new Date('2026-07-15T12:00:00Z');
    const partes: Record<string, string> = {};
    for (const p of formato.formatToParts(referencia)) partes[p.type] = p.value;
    const comoUTC = Date.UTC(
      Number(partes.year), Number(partes.month) - 1, Number(partes.day),
      partes.hour === '24' ? 0 : Number(partes.hour),
      Number(partes.minute), Number(partes.second),
    );
    return (comoUTC - referencia.getTime()) / 60000;
  } catch {
    return 0;
  }
}

interface LinhaCidade {
  id: string;
  nome: string;
  regiao: string | null;
  pais: string;
  lat: number;
  lon: number;
  fuso: string;
  populacao: number;
}

const NOME_DO_PAIS: Record<string, string> = {
  BR: 'Brasil', US: 'Estados Unidos', CA: 'Canadá', PT: 'Portugal',
  ES: 'Espanha', FR: 'França', GB: 'Reino Unido', IE: 'Irlanda',
  IT: 'Itália', DE: 'Alemanha', CH: 'Suíça', NL: 'Países Baixos',
  BE: 'Bélgica', AT: 'Áustria', SE: 'Suécia', NO: 'Noruega',
  DK: 'Dinamarca', FI: 'Finlândia', PL: 'Polônia', AR: 'Argentina',
  UY: 'Uruguai', PY: 'Paraguai', JP: 'Japão', AU: 'Austrália',
};

function paraCidade(linha: LinhaCidade): Cidade {
  return {
    id: linha.id,
    nome: linha.nome,
    uf: linha.pais === 'BR' ? (linha.regiao ?? undefined) : undefined,
    pais: NOME_DO_PAIS[linha.pais] ?? linha.pais,
    lat: linha.lat,
    lon: linha.lon,
    fuso: linha.fuso,
    offsetPadrao: offsetPadraoDoFuso(linha.fuso),
  };
}

/**
 * Procura no banco e, se não der, na lista local. Nunca lança: quem chama está
 * no meio de um formulário, e uma busca que explode trava o cadastro inteiro.
 */
export async function buscarCidades(termo: string, limite = 8): Promise<Cidade[]> {
  const alvo = achatar(termo);
  if (alvo.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('cidades')
      .select(COLUNAS)
      .like('nome_busca', `${alvo}%`)
      .order('populacao', { ascending: false })
      .limit(limite);
    if (error) throw error;

    const achadas = (data ?? []) as LinhaCidade[];
    if (achadas.length > 0) return achadas.map(paraCidade);
  } catch {
    // Banco fora do ar, sem rede, ou tabela ainda não carregada: cai na lista
    // local em vez de deixar a pessoa sem cidade nenhuma.
  }

  return buscarNaListaLocal(termo, limite);
}

export type { Cidade };
