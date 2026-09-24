/**
 * Nome e tipo do avatar no bucket `avatars`.
 *
 * Isto morava dentro da tela de perfil, como `uri.split('.').pop()`. Na web a
 * URI que o seletor devolve é `data:image/png;base64,...`, que não tem ponto
 * nenhum: a "extensão" virava a imagem inteira, o nome do objeto ficava
 * impossível e o tipo saía como `image/data:image/png;base64,...`. Nenhuma foto
 * subia, em nenhum formato. Por isso a regra saiu da tela e ganhou teste.
 *
 * O tipo passa a vir do próprio seletor (`asset.mimeType`), que é quem sabe.
 */
export interface DestinoAvatar {
  fileName: string;
  tipo: string;
}

const TIPO_PADRAO = 'image/jpeg';

export function destinoDoAvatar(usuarioId: string, mimeType?: string | null): DestinoAvatar {
  const tipo = mimeType?.trim() || TIPO_PADRAO;
  // `image/svg+xml` vira `svg`; `image/png` vira `png`.
  const ext = (tipo.split('/')[1] ?? 'jpg').split('+')[0] || 'jpg';
  return { fileName: `avatar_${usuarioId}.${ext}`, tipo };
}
