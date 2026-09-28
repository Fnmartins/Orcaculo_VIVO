import { angulos, normalizar, obliquidade, tempoSideralLocal } from './efemerides';

/**
 * As doze casas pelo sistema Placidus — o mais usado no Brasil, e o que o
 * conselho de 21/09 pediu.
 *
 * A ideia: cada grau do zodíaco leva um tempo para ir do horizonte ao meio do
 * céu. Placidus divide esse percurso em três partes iguais, e os pontos de
 * divisão são as cúspides das casas 11 e 12. Abaixo do horizonte, a mesma
 * divisão do arco noturno dá as casas 2 e 3. As outras seis são os pontos
 * opostos — isso é definição do sistema, não atalho.
 *
 * **Não tem solução fechada.** O semi-arco de um grau depende da declinação
 * dele, que depende de onde ele está; a conta se resolve iterando até parar de
 * mudar. É o que a documentação de Placidus descreve.
 *
 * Acima do círculo polar o sistema não existe: há graus que nunca nascem nem
 * se põem, e o arco diurno fica indefinido. Ali devolvemos nulo, em vez de
 * número inventado.
 */

const GRAUS = Math.PI / 180;
const rad = (g: number) => g * GRAUS;
const deg = (r: number) => r / GRAUS;

/** Acima disto, parte do zodíaco não nasce nem se põe, e Placidus se desfaz. */
export const LATITUDE_MAXIMA = 66;

export interface Casas {
  /** Doze cúspides em longitude eclíptica, da casa 1 à 12. */
  cuspides: number[];
}

/**
 * Semi-arco diurno de um ponto da eclíptica, pela sua ascensão reta.
 *
 * Para um ponto sobre a eclíptica vale `tan δ = sin(RA) · tan ε`, então o
 * semi-arco `arccos(−tan φ · tan δ)` vira `arccos(−sin(RA) · tan φ · tan ε)`.
 * Nulo quando aquele grau não nasce nem se põe naquela latitude.
 */
function semiArcoDiurno(ra: number, latitude: number, obliq: number): number | null {
  const valor = -Math.sin(rad(ra)) * Math.tan(rad(latitude)) * Math.tan(rad(obliq));
  if (valor <= -1 || valor >= 1) return null;
  return deg(Math.acos(valor));
}

/** Ascensão reta → longitude eclíptica, para um ponto sobre a eclíptica. */
function longitudeDaAscensaoReta(ra: number, obliq: number): number {
  const e = rad(obliq);
  const a = rad(ra);
  return normalizar(deg(Math.atan2(Math.sin(a), Math.cos(a) * Math.cos(e))));
}

/**
 * Converge na ascensão reta de uma cúspide.
 *
 * `fracao` é quanto do semi-arco separa a cúspide do meio do céu (casas 11 e
 * 12) ou do fundo do céu (casas 3 e 2): um terço para as primeiras de cada
 * par, dois terços para as segundas.
 */
function convergir(
  ramc: number,
  latitude: number,
  obliq: number,
  fracao: number,
  noturno: boolean,
): number | null {
  // Primeiro palpite: casas iguais, 30 graus cada.
  let ra = noturno ? ramc + 180 - fracao * 90 : ramc + fracao * 90;

  // A iteração contrai (o semi-arco muda menos que o palpite), então converge
  // rápido; o teto é generoso de propósito, porque uma volta a mais custa
  // nada e uma a menos deixaria erro de 1e-5 grau no pior caso.
  for (let i = 0; i < 100; i += 1) {
    const diurno = semiArcoDiurno(ra, latitude, obliq);
    if (diurno === null) return null;
    const arco = noturno ? 180 - diurno : diurno;
    const proximo = noturno ? ramc + 180 - fracao * arco : ramc + fracao * arco;
    if (Math.abs(proximo - ra) < 1e-9) return proximo;
    ra = proximo;
  }
  return ra;
}

export function casasPlacidus(
  momento: Date,
  latitude: number,
  longitude: number,
): Casas | null {
  if (Math.abs(latitude) > LATITUDE_MAXIMA) return null;

  const obliq = obliquidade(momento);
  const ramc = tempoSideralLocal(momento, longitude) * 15;
  const { ascendente, meioCeu } = angulos(momento, latitude, longitude);

  const ra11 = convergir(ramc, latitude, obliq, 1 / 3, false);
  const ra12 = convergir(ramc, latitude, obliq, 2 / 3, false);
  const ra3 = convergir(ramc, latitude, obliq, 1 / 3, true);
  const ra2 = convergir(ramc, latitude, obliq, 2 / 3, true);
  if (ra11 === null || ra12 === null || ra2 === null || ra3 === null) return null;

  const c11 = longitudeDaAscensaoReta(ra11, obliq);
  const c12 = longitudeDaAscensaoReta(ra12, obliq);
  const c3 = longitudeDaAscensaoReta(ra3, obliq);
  const c2 = longitudeDaAscensaoReta(ra2, obliq);

  return {
    cuspides: [
      ascendente,
      c2,
      c3,
      normalizar(meioCeu + 180),
      normalizar(c11 + 180),
      normalizar(c12 + 180),
      normalizar(ascendente + 180),
      normalizar(c2 + 180),
      normalizar(c3 + 180),
      meioCeu,
      c11,
      c12,
    ],
  };
}

/**
 * Em qual casa cai um grau do zodíaco, de 1 a 12.
 *
 * As casas têm tamanhos diferentes em Placidus — é o ponto do sistema — então
 * não dá para dividir por trinta: é preciso ver entre quais cúspides o grau
 * está.
 */
export function casaDoGrau(longitude: number, casas: Casas): number {
  const alvo = normalizar(longitude);
  for (let i = 0; i < 12; i += 1) {
    const inicio = casas.cuspides[i];
    const fim = casas.cuspides[(i + 1) % 12];
    const tamanho = normalizar(fim - inicio);
    const distancia = normalizar(alvo - inicio);
    if (distancia < tamanho) return i + 1;
  }
  // As doze fatias cobrem o círculo inteiro, então um grau sempre cai em uma
  // delas; esta linha existe só para o TypeScript ver um retorno.
  return 1;
}
