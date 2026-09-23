export type StatusDecisao = 'aberta' | 'decidida';
export type PosicaoManifestacao = 'aprovo' | 'nao_aprovo' | 'comentario';

export interface Decisao {
  id: string;
  titulo: string;
  contexto: string | null;
  link: string | null;
  /** Identificador do desenho mostrado junto da decisão (ver components/previas). */
  previa: string | null;
  status: StatusDecisao;
  decidido_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Manifestacao {
  id: string;
  decisao_id: string;
  autor_nome: string;
  posicao: PosicaoManifestacao;
  texto: string;
  criado_em: string;
}

export const ROTULO_STATUS: Record<StatusDecisao, string> = {
  aberta: 'Aberta',
  decidida: 'Decidida',
};

export const ROTULO_POSICAO: Record<PosicaoManifestacao, string> = {
  aprovo: 'Aprovo',
  nao_aprovo: 'Não aprovo',
  comentario: 'Comentário',
};

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

/** Data e hora locais, no formato que o Brasil lê: 22/09/2026 14:35. */
export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const data = `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${data} ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

/** Só a data, para a linha de fechamento. */
export function formatarData(iso: string): string {
  return formatarDataHora(iso).split(' ')[0];
}

export function ordenarManifestacoes(lista: Manifestacao[]): Manifestacao[] {
  return [...lista].sort((a, b) => a.criado_em.localeCompare(b.criado_em));
}

/**
 * Monta o texto do botão "Copiar tudo": é o que o Fabiano cola na conversa para
 * que a decisão vire execução, sem precisar redigitar o que foi conversado.
 */
export function montarTextoDecisao(decisao: Decisao, manifestacoes: Manifestacao[]): string {
  const linhas: string[] = [
    `Decisão: ${decisao.titulo}`,
    `Status: ${ROTULO_STATUS[decisao.status]}`,
  ];

  if (decisao.status === 'decidida' && decisao.decidido_em) {
    linhas.push(`Fechada em ${formatarData(decisao.decidido_em)}`);
  }

  if (decisao.contexto?.trim()) {
    linhas.push('', 'Contexto:', decisao.contexto.trim());
  }

  if (decisao.link?.trim()) {
    linhas.push('', `Link: ${decisao.link.trim()}`);
  }

  linhas.push('', 'Manifestações:');

  const ordenadas = ordenarManifestacoes(manifestacoes);
  if (ordenadas.length === 0) {
    linhas.push('Nenhuma manifestação registrada.');
    return linhas.join('\n');
  }

  ordenadas.forEach((m, i) => {
    linhas.push(
      '',
      `${i + 1}. ${m.autor_nome} — ${formatarDataHora(m.criado_em)} — ${ROTULO_POSICAO[m.posicao]}`,
      m.texto.trim(),
    );
  });

  return linhas.join('\n');
}
