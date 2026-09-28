/**
 * A geometria da roda do mapa, separada do desenho.
 *
 * Está aqui, e não dentro do componente, porque é conta — e conta de mapa é o
 * tipo de coisa que erra um sinal em silêncio. Assim dá para testar o número
 * sem renderizar tela.
 */

const VOLTA = 360;

function normalizar(graus: number): number {
  return ((graus % VOLTA) + VOLTA) % VOLTA;
}

/** Menor distância entre dois graus, indo pelo lado curto do círculo. */
export function distanciaAngular(a: number, b: number): number {
  const bruta = Math.abs(normalizar(a) - normalizar(b));
  return Math.min(bruta, VOLTA - bruta);
}

/**
 * Onde um grau do zodíaco cai na roda, em graus de tela.
 *
 * Convenção de astrólogo: a `referencia` — o ascendente — fica na esquerda, às
 * nove horas, e o zodíaco corre no sentido anti-horário a partir dela. Como no
 * SVG o eixo y aponta para baixo, anti-horário na tela é ângulo diminuindo,
 * e daí o sinal negativo.
 *
 * Sem hora de nascimento não há ascendente; aí entra 0 (o começo de Áries) na
 * esquerda, mantendo uma convenção só em vez de duas.
 */
export function anguloNaRoda(longitude: number, referencia: number): number {
  return normalizar(180 - (longitude - referencia));
}

/**
 * Em que nível de profundidade desenhar cada marcador, para dois corpos no
 * mesmo grau não virarem um borrão só.
 *
 * Cada marcador pega o nível mais raso que nenhum vizinho próximo esteja
 * usando. Quando mais corpos se juntam do que há níveis — acontece em
 * conjunções de três ou quatro planetas — os níveis se repetem, porque
 * empilhar para dentro sem limite acabaria furando o centro da roda.
 */
export function niveisDosMarcadores(
  longitudes: number[],
  juntosAte: number,
  niveis: number,
): number[] {
  const ordem = longitudes
    .map((longitude, indice) => ({ longitude, indice }))
    .sort((a, b) => a.longitude - b.longitude);

  const resultado = new Array<number>(longitudes.length).fill(0);
  const colocados: { longitude: number; nivel: number }[] = [];

  for (const item of ordem) {
    const vizinhos = colocados.filter(
      (c) => distanciaAngular(c.longitude, item.longitude) < juntosAte,
    );
    const ocupados = new Set(vizinhos.map((v) => v.nivel));
    let nivel = 0;
    while (nivel < niveis && ocupados.has(nivel)) nivel += 1;
    if (nivel === niveis) nivel = vizinhos.length % niveis;

    resultado[item.indice] = nivel;
    colocados.push({ longitude: item.longitude, nivel });
  }

  return resultado;
}

/**
 * O meio de cada casa, para escrever o número dela no lugar certo.
 *
 * Em Placidus as casas têm tamanhos diferentes, então o meio não é a cúspide
 * mais quinze graus.
 */
export function meiosDasCasas(cuspides: number[]): number[] {
  return cuspides.map((cuspide, i) => {
    const tamanho = normalizar(cuspides[(i + 1) % cuspides.length] - cuspide);
    return normalizar(cuspide + tamanho / 2);
  });
}
