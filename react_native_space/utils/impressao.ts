import { Platform } from 'react-native';

/**
 * Salvar a leitura em PDF.
 *
 * Na web, quem gera o PDF é o próprio navegador: a caixa de impressão traz
 * "Salvar como PDF" no computador, e no iPhone o caminho é Compartilhar →
 * Imprimir → Salvar em Arquivos. Não entra biblioteca nenhuma no pacote, e o
 * PDF sai com o texto selecionável — um gerador de imagem entregaria uma foto
 * da tela, que não dá para copiar nem ler com leitor de tela.
 *
 * O dia em que for preciso um PDF com capa e marca própria, aí sim vale um
 * gerador; até lá, isto resolve e não custa nada.
 */
export function podeImprimir(): boolean {
  if (Platform.OS !== 'web') return false;
  const g = globalThis as unknown as { print?: () => void };
  return typeof g.print === 'function';
}

export function imprimirPagina(): boolean {
  if (!podeImprimir()) return false;
  const g = globalThis as unknown as { print: () => void };
  try {
    g.print();
    return true;
  } catch {
    return false;
  }
}
