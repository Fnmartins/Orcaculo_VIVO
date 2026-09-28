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

/**
 * Regras que só valem na impressão.
 *
 * Sem elas o PDF sai com **uma página só**: o app vive dentro de uma área
 * rolável (a `ScrollView` do React Native Web vira um `div` com rolagem), e o
 * navegador imprime o que cabe na tela, não o que existe no documento. Mandar
 * altura automática e transbordo visível faz o conteúdo fluir e paginar.
 *
 * Os botões saem do papel: "Ouvir a leitura" e "Compartilhar" não fazem
 * sentido impressos. E `break-inside: avoid` evita cortar um card no meio da
 * virada de página.
 */
const ID_ESTILO = 'arcanus-impressao';

const REGRAS = `@media print {
  html, body, #root, #root > div, #root > div > div {
    height: auto !important;
    max-height: none !important;
    min-height: 0 !important;
    overflow: visible !important;
    position: static !important;
  }
  div { overflow: visible !important; }
  [role="button"] { display: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { margin: 12mm; }
}`;

function garantirEstiloDeImpressao(): void {
  const doc = (globalThis as unknown as { document?: Document }).document;
  if (!doc || doc.getElementById(ID_ESTILO)) return;
  const estilo = doc.createElement('style');
  estilo.id = ID_ESTILO;
  estilo.textContent = REGRAS;
  doc.head.appendChild(estilo);
}

export function imprimirPagina(): boolean {
  if (!podeImprimir()) return false;
  const g = globalThis as unknown as { print: () => void };
  try {
    garantirEstiloDeImpressao();
    g.print();
    return true;
  } catch {
    return false;
  }
}
