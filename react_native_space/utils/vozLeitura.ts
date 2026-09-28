/**
 * O texto que vai ser falado.
 *
 * Este arquivo já foi o motor de voz inteiro, com a síntese do próprio
 * navegador. Em 28/09 a voz passou a vir do servidor (`services/voz.ts` →
 * function `ia-voz`, Google Chirp 3 HD), e o que sobrou aqui é a parte que
 * continua valendo: preparar o texto.
 *
 * Preparar não é detalhe. Ler "21° 24′" em voz alta como "vinte e um grau
 * vinte e quatro linha" seria pior que não ler — e agora que cada leitura
 * custa por caractere, mandar emoji para o sintetizador seria pagar por
 * silêncio.
 *
 * O que saiu junto com o motor antigo: `falar`, `pararDeFalar`,
 * `vozDisponivel` e `dividirEmPartes`. Esta última picava o roteiro em pedaços
 * curtos porque o Safari do iPhone interrompe fala contínua depois de alguns
 * segundos; com um arquivo de áudio tocando, o problema deixou de existir.
 */

export interface ParteDaLeitura {
  /** Título da seção, falado antes do texto. Opcional. */
  rotulo?: string;
  texto: string;
}

const SIMBOLOS: [RegExp, string][] = [
  // Grau e minuto de arco: sem isto a voz lê o símbolo, não a medida.
  [/(\d+)\s*°\s*(\d+)\s*′/g, '$1 graus e $2 minutos'],
  [/(\d+)\s*°/g, '$1 graus'],
  [/℞/g, ', retrógrado,'],
  [/☀/g, 'Sol'],
  [/☾/g, 'Lua'],
  [/↑/g, 'Ascendente'],
  // Emoji decorativo não vira palavra nenhuma.
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' '],
];

/**
 * Monta o texto que vai ser falado.
 *
 * Junta as partes com pausa de ponto final — a síntese usa a pontuação para
 * respirar — troca símbolo por palavra e tira o que não se fala.
 */
export function montarRoteiro(partes: ParteDaLeitura[]): string {
  const pedacos: string[] = [];
  for (const parte of partes) {
    const texto = (parte.texto ?? '').trim();
    if (!texto) continue;
    const rotulo = parte.rotulo?.trim();
    pedacos.push(rotulo ? `${rotulo}. ${texto}` : texto);
  }

  let roteiro = pedacos.join('\n\n');
  for (const [de, para] of SIMBOLOS) roteiro = roteiro.replace(de, para);
  return roteiro
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\.\s*\./g, '.')
    .trim();
}
