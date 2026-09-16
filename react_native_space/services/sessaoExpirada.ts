export const MENSAGEM_SESSAO_EXPIRADA = 'Sua sessão expirou. Entre de novo para continuar.';

/** O servidor respondeu 401: a sessão acabou, o papel de admin não mudou. */
export class SessaoExpiradaError extends Error {
  constructor(mensagem: string = MENSAGEM_SESSAO_EXPIRADA) {
    super(mensagem);
    this.name = 'SessaoExpiradaError';
    Object.setPrototypeOf(this, SessaoExpiradaError.prototype);
  }
}

/** Use isto em vez de `instanceof`: não depende de como a classe foi compilada. */
export function ehSessaoExpirada(e: unknown): boolean {
  return e instanceof SessaoExpiradaError || (e as { name?: unknown } | null)?.name === 'SessaoExpiradaError';
}
