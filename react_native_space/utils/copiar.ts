import { Platform, Share } from 'react-native';

/**
 * Copia texto sem dependência nova: na web usa a área de transferência do próprio
 * navegador (o Painel é usado no navegador); no app nativo, onde ela não existe,
 * abre o compartilhamento do sistema, que resolve o mesmo problema — levar o texto
 * para outro lugar. Devolve `true` quando copiou de fato.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const area = (globalThis as { navigator?: { clipboard?: { writeText?: (t: string) => Promise<void> } } })
      .navigator?.clipboard;
    if (!area?.writeText) return false;
    try {
      await area.writeText(texto);
      return true;
    } catch {
      return false;
    }
  }

  try {
    await Share.share({ message: texto });
    return true;
  } catch {
    return false;
  }
}
