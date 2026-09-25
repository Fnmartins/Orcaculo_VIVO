import { Platform } from 'react-native';

/**
 * Converte a foto para JPEG e limita o tamanho, no próprio aparelho.
 *
 * Três motivos, todos vividos:
 *
 * 1. O iPhone fotografa em HEIC, e o modelo aceita só JPEG, PNG, GIF e WebP.
 *    HEIC chegava lá e voltava recusado como erro genérico.
 * 2. Foto de celular tem vários megabytes. Cada byte é enviado e pago, e a
 *    função recusa acima de 4 MB.
 * 3. Resolução alta não melhora a leitura: o modelo reduz a imagem de qualquer
 *    forma antes de olhar.
 *
 * Só roda na web, que é onde o app está. No nativo o seletor já entrega JPEG.
 * Falhando, devolve `null` e quem chamou segue com a imagem original — o
 * caminho que hoje funciona não pode quebrar por causa desta melhoria.
 */
export const LADO_MAXIMO = 1600;
export const QUALIDADE = 0.85;

export interface ImagemNormalizada {
  uri: string;
  base64: string;
}

/** Quanto encolher para o maior lado caber no limite. Nunca aumenta. */
export function escala(largura: number, altura: number, ladoMaximo = LADO_MAXIMO): number {
  const maior = Math.max(largura, altura);
  if (maior <= 0) return 1;
  return Math.min(1, ladoMaximo / maior);
}

export async function normalizarImagem(uri: string): Promise<ImagemNormalizada | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const elemento = new Image();
      elemento.onload = () => resolve(elemento);
      elemento.onerror = () => reject(new Error('não foi possível decodificar a imagem'));
      elemento.src = uri;
    });

    const fator = escala(img.naturalWidth, img.naturalHeight);
    const largura = Math.round(img.naturalWidth * fator);
    const altura = Math.round(img.naturalHeight * fator);
    if (largura < 1 || altura < 1) return null;

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext('2d');
    if (!contexto) return null;
    contexto.drawImage(img, 0, 0, largura, altura);

    const dataUrl = canvas.toDataURL('image/jpeg', QUALIDADE);
    const base64 = dataUrl.split(',')[1];
    if (!base64) return null;
    return { uri: dataUrl, base64 };
  } catch {
    // HEIC em navegador que não decodifica, imagem corrompida, canvas sujo por
    // origem cruzada: em todos, seguir com a original é melhor que falhar.
    return null;
  }
}
