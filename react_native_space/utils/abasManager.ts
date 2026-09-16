export const ABAS_MANAGER = ['planos', 'roadmap', 'acessos'] as const;
export type AbaManager = (typeof ABAS_MANAGER)[number];

export const ROTULO_ABA: Record<AbaManager, string> = {
  planos: 'Planos',
  roadmap: 'Roadmap',
  acessos: 'Acessos',
};

/** Lê o ?aba= da URL. Valor ausente ou inválido abre Planos. */
export function resolverAba(valor: string | string[] | undefined): AbaManager {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  return (ABAS_MANAGER as readonly string[]).includes(bruto ?? '') ? (bruto as AbaManager) : 'planos';
}
