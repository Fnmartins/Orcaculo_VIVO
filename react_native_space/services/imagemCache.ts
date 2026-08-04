const _cache: Record<string, string> = {};

export function salvarBase64ImagemCache(uri: string, base64: string): void {
  _cache[uri] = base64;
}

export function obterBase64ImagemCache(uri: string): string | null {
  return _cache[uri] ?? null;
}

export function limparImagemCache(uri: string): void {
  delete _cache[uri];
}
