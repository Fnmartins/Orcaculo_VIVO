export const MENSAGEM_ACESSO_NEGADO = 'Seu acesso de admin foi removido.';

/** O servidor recusou por falta de permissão de super-admin. */
export class AcessoNegadoError extends Error {
  constructor(mensagem: string = MENSAGEM_ACESSO_NEGADO) {
    super(mensagem);
    this.name = 'AcessoNegadoError';
    Object.setPrototypeOf(this, AcessoNegadoError.prototype);
  }
}

/** Use isto em vez de `instanceof`: não depende de como a classe foi compilada. */
export function ehAcessoNegado(e: unknown): boolean {
  return e instanceof AcessoNegadoError || (e as { name?: unknown } | null)?.name === 'AcessoNegadoError';
}
