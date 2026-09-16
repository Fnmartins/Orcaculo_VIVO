export const MENSAGEM_ITEM_REMOVIDO = 'Este item foi apagado por outro admin. A lista foi recarregada.';

/** A escrita não afetou nenhuma linha, mas quem pediu continua admin: o item sumiu. */
export class ItemRemovidoError extends Error {
  constructor(mensagem: string = MENSAGEM_ITEM_REMOVIDO) {
    super(mensagem);
    this.name = 'ItemRemovidoError';
    Object.setPrototypeOf(this, ItemRemovidoError.prototype);
  }
}

/** Use isto em vez de `instanceof`: não depende de como a classe foi compilada. */
export function ehItemRemovido(e: unknown): boolean {
  return e instanceof ItemRemovidoError || (e as { name?: unknown } | null)?.name === 'ItemRemovidoError';
}
