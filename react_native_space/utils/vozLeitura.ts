import { Platform } from 'react-native';

/**
 * Ouvir a leitura, com a voz do próprio aparelho.
 *
 * O Arcanus roda na web, e todo navegador moderno — inclusive o Safari do
 * iPhone — já traz síntese de voz em português. Isso faz a etiqueta "Áudio"
 * das telas de resultado deixar de ser promessa, sem custo por leitura e sem
 * servidor no meio.
 *
 * Não é a voz encantada de um app de oráculo: é a voz do sistema. A voz
 * natural, comprada de um serviço de síntese, continua fazendo sentido como
 * benefício de plano — e este arquivo não atrapalha isso, porque quem chama
 * pede "fale este texto" e não sabe de onde a voz vem.
 *
 * O texto falado é montado por `montarRoteiro`, que é função pura e testada:
 * ler "21° 24′" em voz alta como "vinte e um grau vinte e quatro linha" seria
 * pior que não ler.
 */

interface SinteseDeVoz {
  speaking: boolean;
  speak: (fala: unknown) => void;
  cancel: () => void;
  getVoices: () => { lang: string; name: string }[];
}

function sintese(): SinteseDeVoz | null {
  if (Platform.OS !== 'web') return null;
  const g = globalThis as unknown as { speechSynthesis?: SinteseDeVoz };
  return g.speechSynthesis ?? null;
}

export function vozDisponivel(): boolean {
  return sintese() !== null;
}

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

/** A voz em português, se o aparelho tiver uma. Senão, a que o sistema escolher. */
function vozEmPortugues(motor: SinteseDeVoz): { lang: string; name: string } | null {
  try {
    const vozes = motor.getVoices() ?? [];
    return vozes.find((v) => /^pt[-_]BR/i.test(v.lang))
      ?? vozes.find((v) => /^pt/i.test(v.lang))
      ?? null;
  } catch {
    return null;
  }
}

/**
 * O Safari do iPhone para de falar sozinho depois de alguns segundos de fala
 * contínua — é limitação conhecida dele, não do texto. A volta é picar o
 * roteiro em pedaços curtos e enfileirar: cada pedaço é uma fala nova, e o
 * relógio interno reinicia.
 *
 * Corta em fim de frase; se a frase for longa demais, corta no último espaço
 * antes do limite, nunca no meio de uma palavra.
 */
export function dividirEmPartes(texto: string, limite = 180): string[] {
  const partes: string[] = [];
  let resto = texto.trim();

  while (resto.length > limite) {
    const janela = resto.slice(0, limite);
    let corte = Math.max(
      janela.lastIndexOf('. '), janela.lastIndexOf('! '),
      janela.lastIndexOf('? '), janela.lastIndexOf('\n'),
    );
    if (corte > limite * 0.4) corte += 1;
    else {
      corte = janela.lastIndexOf(' ');
      if (corte <= 0) corte = limite;
    }
    partes.push(resto.slice(0, corte).trim());
    resto = resto.slice(corte).trim();
  }

  if (resto) partes.push(resto);
  return partes.filter(Boolean);
}

export interface OpcoesDeFala {
  aoTerminar?: () => void;
  aoFalhar?: () => void;
}

/**
 * Fala o texto. Precisa ser chamada **dentro** do toque do usuário: o Safari
 * do iPhone recusa fala que não venha de um gesto.
 */
export function falar(texto: string, opcoes: OpcoesDeFala = {}): boolean {
  const motor = sintese();
  const g = globalThis as unknown as {
    SpeechSynthesisUtterance?: new (t: string) => Record<string, unknown>;
  };
  if (!motor || !g.SpeechSynthesisUtterance || !texto.trim()) {
    opcoes.aoFalhar?.();
    return false;
  }

  // Cancelar antes de falar: sem isto, tocar duas vezes enfileira duas leituras.
  motor.cancel();

  const voz = vozEmPortugues(motor);
  const pedacos = dividirEmPartes(texto);
  const Fala = g.SpeechSynthesisUtterance;

  pedacos.forEach((pedaco, i) => {
    const fala = new Fala(pedaco);
    if (voz) fala.voice = voz;
    fala.lang = voz?.lang ?? 'pt-BR';
    // Um pouco abaixo do normal: leitura de oráculo lida depressa vira locução.
    fala.rate = 0.95;
    fala.pitch = 1;
    // Só o último pedaço avisa que terminou; os do meio são passagem.
    if (i === pedacos.length - 1) fala.onend = () => opcoes.aoTerminar?.();
    fala.onerror = () => opcoes.aoFalhar?.();
    motor.speak(fala);
  });

  return pedacos.length > 0;
}

export function pararDeFalar(): void {
  sintese()?.cancel();
}

export function estaFalando(): boolean {
  return sintese()?.speaking === true;
}
