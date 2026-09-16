export type StatusRoadmap = 'todo' | 'run' | 'ok' | 'block';

export const STATUS_ROADMAP: readonly StatusRoadmap[] = ['todo', 'run', 'ok', 'block'];

export const ROTULO_STATUS: Record<StatusRoadmap, string> = {
  todo: 'A fazer',
  run: 'Em andamento',
  ok: 'Concluído',
  block: 'Bloqueado',
};

export interface ItemRoadmap {
  id: string;
  fase: string;
  titulo: string;
  descricao: string | null;
  status: StatusRoadmap;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

export interface GrupoRoadmap {
  fase: string;
  itens: ItemRoadmap[];
}

function compararItens(a: ItemRoadmap, b: ItemRoadmap): number {
  return a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em);
}

/** Fases na ordem da menor `ordem` de cada uma; itens por `ordem`, empate pela criação. */
export function agruparPorFase(itens: ItemRoadmap[]): GrupoRoadmap[] {
  const porFase = new Map<string, ItemRoadmap[]>();
  for (const i of itens) {
    const lista = porFase.get(i.fase) ?? [];
    lista.push(i);
    porFase.set(i.fase, lista);
  }
  return [...porFase.entries()]
    .map(([fase, lista]) => ({ fase, itens: [...lista].sort(compararItens) }))
    .sort((a, b) => compararItens(a.itens[0], b.itens[0]));
}

export function calcularProgresso(itens: ItemRoadmap[]): { concluidos: number; total: number } {
  return { concluidos: itens.filter((i) => i.status === 'ok').length, total: itens.length };
}

/** Ordem de um item novo: fim da fase, ou fim do roadmap se a fase é nova. */
export function proximaOrdem(itens: ItemRoadmap[], fase: string): number {
  const daFase = itens.filter((i) => i.fase === fase);
  const referencia = daFase.length > 0 ? daFase : itens;
  return referencia.reduce((maior, i) => Math.max(maior, i.ordem), 0) + 1;
}
