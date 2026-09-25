/**
 * Guarda a foto em memória, entre as telas da análise por imagem.
 *
 * Existe porque a foto NÃO pode viajar pelos parâmetros da rota. Na web o
 * expo-router escreve parâmetro na URL, e a foto da câmera é uma imagem inteira
 * em base64 — megabytes. A navegação simplesmente não acontece, sem erro
 * nenhum: foi o que travou o "Analisar Imagem" em 24/09, enquanto a mesma tela
 * funcionava com fotos menores vindas da galeria.
 *
 * Pelas rotas viaja só o identificador. A imagem fica aqui.
 */
export interface ImagemGuardada {
  uri: string;
  base64: string;
}

const _imagens = new Map<string, ImagemGuardada>();

/** Poucas, porque é memória: cada leitura nova empurra a mais antiga para fora. */
const LIMITE = 3;

export function guardarImagem(uri: string, base64: string): string {
  const id = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  _imagens.set(id, { uri, base64 });
  while (_imagens.size > LIMITE) {
    const maisAntiga = _imagens.keys().next().value;
    if (maisAntiga === undefined) break;
    _imagens.delete(maisAntiga);
  }
  return id;
}

export function obterImagem(id: string): ImagemGuardada | null {
  return _imagens.get(id) ?? null;
}

export function descartarImagem(id: string): void {
  _imagens.delete(id);
}
