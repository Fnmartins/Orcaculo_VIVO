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
  /** O que ficou combinado. O banco recusa fechar sem isto. */
  decisao_final: string | null;
  decidido_em: string | null;
  /** Nome de quem fechou, resolvido pelo banco no perfil — não vem do cliente. */
  decidido_por_nome: string | null;
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

/**
 * Nome legível de cada prévia. Fica aqui, e não em components/previas, porque o
 * texto do "Copiar tudo" precisa dele e utils não importa componente.
 */
export const ROTULO_PREVIA: Record<string, string> = {
  'mesa-buzios': 'Mesa de búzios — a peneira de hoje e a proposta do conselho',
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
    const porQuem = decisao.decidido_por_nome?.trim();
    linhas.push(
      `Fechada em ${formatarData(decisao.decidido_em)}${porQuem ? ` por ${porQuem}` : ''}`,
    );
  }

  if (decisao.contexto?.trim()) {
    linhas.push('', 'Contexto:', decisao.contexto.trim());
  }

  // Sem isto, quem recebe o texto vê "Decidida" e tem de adivinhar o quê.
  // O rótulo não é "Decisão:" porque a primeira linha já usa isso para o título.
  if (decisao.decisao_final?.trim()) {
    linhas.push('', 'O que ficou combinado:', decisao.decisao_final.trim());
  }

  // A prévia é um desenho na tela e não sobrevive ao copiar e colar; ao menos o
  // nome dela vai junto, para quem for executar saber do que se trata.
  if (decisao.previa) {
    linhas.push('', `Proposta na tela: ${ROTULO_PREVIA[decisao.previa] ?? decisao.previa}`);
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
