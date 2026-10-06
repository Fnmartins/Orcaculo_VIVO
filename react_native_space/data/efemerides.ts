import {
  Body,
  Ecliptic,
  EclipticGeoMoon,
  GeoMoonState,
  GeoVector,
  SiderealTime,
  SunPosition,
  Vector,
} from 'astronomy-engine';
import { SIGNOS, type Signo } from './astrologia';

/**
 * As posições de verdade do céu, para o Mapa Astral.
 *
 * Substitui o que `data/astrologia.ts` fazia por aritmética: a Lua era
 * `(hora + dia + mês) % 12` e o ascendente era `hora ÷ 2` — números que
 * pareciam um mapa e não eram. O conselho de 21/09 (item M1) pediu motor
 * próprio com a Astronomy Engine, e é o que está aqui.
 *
 * **Roda no aparelho, não no servidor.** O conselho pediu servidor para os
 * dados de nascimento não irem a terceiros; no aparelho eles não vão a lugar
 * nenhum, e ainda dá para testar com o Jest — que é o que a bateria de
 * validação exige.
 *
 * Tudo em longitude eclíptica de data (zodíaco tropical), que é o que a
 * astrologia ocidental usa.
 */

export const CORPOS = [
  'sol', 'lua', 'mercurio', 'venus', 'marte',
  'jupiter', 'saturno', 'urano', 'netuno', 'plutao',
] as const;
export type Corpo = (typeof CORPOS)[number];

export const NOME_CORPO: Record<Corpo, string> = {
  sol: 'Sol',
  lua: 'Lua',
  mercurio: 'Mercúrio',
  venus: 'Vênus',
  marte: 'Marte',
  jupiter: 'Júpiter',
  saturno: 'Saturno',
  urano: 'Urano',
  netuno: 'Netuno',
  plutao: 'Plutão',
};

/** Acentos fora e tudo em minúscula: é só para comparar, nunca para mostrar. */
function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Do nome de volta para o identificador: "Mercúrio" → `mercurio`.
 *
 * Existe porque o regente de um signo é guardado pelo NOME, com acento
 * (`data/astrologia.ts`), e as posições são guardadas pelo identificador, sem.
 * Quem quiser saber onde está o regente de uma casa precisa atravessar essa
 * ponte — e ela já vinha escrita solta dentro da tela. Se a travessia errasse,
 * a resposta simplesmente não apareceria: sem erro, sem aviso, só uma linha a
 * menos. Uma ponte só, com teste, é o que garante que os doze regentes achem o
 * corpo deles.
 */
const CORPO_POR_NOME: Record<string, Corpo> = Object.fromEntries(
  CORPOS.map((corpo) => [semAcento(NOME_CORPO[corpo]), corpo]),
);

/** O corpo com esse nome, ou nulo se não for um dos dez. */
export function corpoPorNome(nome: string): Corpo | null {
  return CORPO_POR_NOME[semAcento(nome)] ?? null;
}

const CORPO_NA_BIBLIOTECA: Record<Exclude<Corpo, 'sol' | 'lua'>, Body> = {
  mercurio: Body.Mercury,
  venus: Body.Venus,
  marte: Body.Mars,
  jupiter: Body.Jupiter,
  saturno: Body.Saturn,
  urano: Body.Uranus,
  netuno: Body.Neptune,
  plutao: Body.Pluto,
};

export interface PosicaoCorpo {
  corpo: Corpo;
  nome: string;
  /** Longitude eclíptica, 0 a 360. */
  longitude: number;
  signo: Signo;
  /** 0 a 30, dentro do signo. */
  grau: number;
  retrogrado: boolean;
}

export interface Angulos {
  /** Grau que está nascendo no horizonte leste. */
  ascendente: number;
  /** Meio do céu: o grau que cruza o meridiano. */
  meioCeu: number;
}

const GRAUS = Math.PI / 180;
const rad = (graus: number) => graus * GRAUS;
const deg = (radianos: number) => radianos / GRAUS;

export function normalizar(graus: number): number {
  const resto = graus % 360;
  return resto < 0 ? resto + 360 : resto;
}

export function signoDoGrau(longitude: number): Signo {
  return SIGNOS[Math.floor(normalizar(longitude) / 30)];
}

export function grauNoSigno(longitude: number): number {
  return normalizar(longitude) % 30;
}

/** Dia juliano a partir do instante — a Date já é UTC por dentro. */
function diaJuliano(momento: Date): number {
  return momento.getTime() / 86400000 + 2440587.5;
}

/**
 * Obliquidade média da eclíptica (IAU 2006), em graus. Sem nutação: ela mexe
 * menos de 10 segundos de arco, o que move o ascendente bem menos de um
 * centésimo de grau — e o mapa mostra grau e minuto.
 */
export function obliquidade(momento: Date): number {
  const t = (diaJuliano(momento) - 2451545) / 36525;
  return 23.439291111
    - 0.0130041667 * t
    - 1.638889e-7 * t * t
    + 5.036111e-7 * t * t * t;
}

export function longitudeEcliptica(corpo: Corpo, momento: Date): number {
  if (corpo === 'sol') return normalizar(SunPosition(momento).elon);
  if (corpo === 'lua') return normalizar(EclipticGeoMoon(momento).lon);
  const vetor = GeoVector(CORPO_NA_BIBLIOTECA[corpo], momento, true);
  return normalizar(Ecliptic(vetor).elon);
}

/**
 * Retrógrado é aparência, não movimento: o planeta parece andar para trás
 * visto da Terra. Mede-se comparando a longitude meio dia antes e meio dia
 * depois. Sol e Lua nunca retrogradam.
 */
export function estaRetrogrado(corpo: Corpo, momento: Date): boolean {
  if (corpo === 'sol' || corpo === 'lua') return false;
  const meioDia = 12 * 3600 * 1000;
  const antes = longitudeEcliptica(corpo, new Date(momento.getTime() - meioDia));
  const depois = longitudeEcliptica(corpo, new Date(momento.getTime() + meioDia));
  // A diferença passa por zero quando o planeta cruza 0° de Áries; normalizar
  // para -180..180 resolve a virada sem inverter o sinal do movimento.
  const avanco = ((depois - antes + 540) % 360) - 180;
  return avanco < 0;
}

export function posicaoDoCorpo(corpo: Corpo, momento: Date): PosicaoCorpo {
  const longitude = longitudeEcliptica(corpo, momento);
  return {
    corpo,
    nome: NOME_CORPO[corpo],
    longitude,
    signo: signoDoGrau(longitude),
    grau: grauNoSigno(longitude),
    retrogrado: estaRetrogrado(corpo, momento),
  };
}

export function posicoes(momento: Date): PosicaoCorpo[] {
  return CORPOS.map((corpo) => posicaoDoCorpo(corpo, momento));
}

/**
 * Os nodos lunares: onde o plano da órbita da Lua corta a eclíptica.
 *
 * Não são corpos, e por isso não entram em `CORPOS` — são a interseção de dois
 * planos. Manter fora da lista é escolha: `CORPOS` alimenta os aspectos, a
 * iteração de retrogradação e a tabela de posições, e os nodos não pertencem a
 * nenhuma das três (decisão de 05/10/2026: nodos entram por signo e casa, não
 * por aspecto).
 */
export interface Nodos {
  /** Nodo norte, a Cabeça do Dragão. Longitude eclíptica, 0 a 360. */
  norte: number;
  /** Nodo sul, a Cauda do Dragão. Sempre exatamente oposto ao norte. */
  sul: number;
}

/**
 * O nodo **verdadeiro**, e não o médio.
 *
 * Verdadeiro é o nodo do plano orbital instantâneo da Lua; médio é a posição
 * suavizada por fórmula, sem a oscilação. Os dois diferem em até cerca de 1,5°,
 * o bastante para trocar o signo de quem nasceu perto de uma cúspide. Escolhemos
 * o verdadeiro porque é o que a maioria dos apps ocidentais mostra — e cada
 * divergência a mais é uma a explicar para quem compara.
 *
 * O cálculo não precisa procurar o cruzamento: a normal ao plano da órbita é
 * `h = r × v`, e a linha dos nodos é `ẑ × h`, com `ẑ` no polo da eclíptica. Isso
 * dá `(−h.y, h.x, 0)`, de onde a longitude do nodo ascendente sai como
 * `atan2(h.x, −h.y)`. Determinístico, sem busca e sem iteração.
 *
 * Conferido contra a fórmula do nodo médio (Meeus, *Astronomical Algorithms*,
 * cap. 47) em `data/__tests__/nodos.test.ts`: de 1980 a 2040 a diferença fica
 * dentro de ±1,7°, e o movimento anual dá cerca de −19,8°, retrógrado, como a
 * literatura descreve.
 */
export function nodosLunares(momento: Date): Nodos {
  const estado = GeoMoonState(momento);
  const hx = estado.y * estado.vz - estado.z * estado.vy;
  const hy = estado.z * estado.vx - estado.x * estado.vz;
  const hz = estado.x * estado.vy - estado.y * estado.vx;
  // `Ecliptic` espera EQJ e devolve a eclíptica da data — a mesma moldura em que
  // o resto do mapa vive. Vale para direção tanto quanto para posição: é rotação
  // de referencial, não translação.
  const naEcliptica = Ecliptic(new Vector(hx, hy, hz, estado.t)).vec;
  const norte = normalizar((Math.atan2(naEcliptica.x, -naEcliptica.y) * 180) / Math.PI);
  return { norte, sul: normalizar(norte + 180) };
}

/** Tempo sideral local em horas (0 a 24). Longitude positiva a leste. */
export function tempoSideralLocal(momento: Date, longitude: number): number {
  const horas = SiderealTime(momento) + longitude / 15;
  return ((horas % 24) + 24) % 24;
}

/**
 * Ascendente e meio do céu.
 *
 * O meio do céu é o ponto da eclíptica com a ascensão reta do meridiano; o
 * ascendente, o que está subindo no horizonte leste. As duas fórmulas são
 * clássicas, e é fácil errar um sinal nelas sem perceber — por isso existe
 * `ascendentePorBusca` abaixo, que chega no mesmo número por outro caminho, e
 * um teste que compara os dois em centenas de instantes e latitudes.
 *
 * Acima do círculo polar o mapa perde sentido (a eclíptica pode não cruzar o
 * horizonte no dia); a latitude entra limitada para a conta não estourar.
 */
export function angulos(momento: Date, latitude: number, longitude: number): Angulos {
  const e = rad(obliquidade(momento));
  const ramc = rad(tempoSideralLocal(momento, longitude) * 15);
  const phi = rad(Math.max(-89.9, Math.min(89.9, latitude)));

  const meioCeu = normalizar(deg(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(e))));
  const ascendente = normalizar(deg(Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(e) + Math.tan(phi) * Math.sin(e)),
  )));
  return { ascendente, meioCeu };
}

function grauNoHorizonte(
  longitudeEclipticaGrau: number,
  obliquidadeGrau: number,
  tempoSideral: number,
  latitude: number,
): { altura: number; nascendo: boolean } {
  const l = rad(longitudeEclipticaGrau);
  const e = rad(obliquidadeGrau);
  const ra = Math.atan2(Math.sin(l) * Math.cos(e), Math.cos(l));
  const dec = Math.asin(Math.sin(e) * Math.sin(l));
  const h = rad(tempoSideral * 15) - ra;
  const phi = rad(latitude);
  const altura = deg(Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h),
  ));
  // Ângulo horário negativo (ainda não cruzou o meridiano) = lado leste = subindo.
  return { altura, nascendo: Math.sin(h) < 0 };
}

/**
 * O ascendente achado por busca, sem usar a fórmula: varre a eclíptica de grau
 * em grau procurando onde a altura troca de sinal do lado leste, e refina por
 * bisseção. Existe para conferir `angulos` — dois caminhos independentes
 * chegando no mesmo número é a evidência que dá para ter sem uma referência
 * profissional na mão.
 */
export function ascendentePorBusca(
  momento: Date,
  latitude: number,
  longitude: number,
): number | null {
  const e = obliquidade(momento);
  const lst = tempoSideralLocal(momento, longitude);
  const lat = Math.max(-89.9, Math.min(89.9, latitude));
  const em = (grau: number) => grauNoHorizonte(grau, e, lst, lat);

  // Subindo o zodíaco, a altura **cai** ao passar pelo ascendente: o grau
  // seguinte ainda não nasceu. Procurar a subida achava o descendente, 180°
  // fora — foi o que a conferência cruzada pegou na primeira tentativa.
  for (let grau = 0; grau < 360; grau += 1) {
    const aqui = em(grau);
    const proximo = em(grau + 1);
    if (aqui.altura > 0 && proximo.altura < 0 && aqui.nascendo) {
      let dentro = grau;
      let fora = grau + 1;
      for (let i = 0; i < 40; i += 1) {
        const meio = (dentro + fora) / 2;
        if (em(meio).altura > 0) dentro = meio;
        else fora = meio;
      }
      return normalizar((dentro + fora) / 2);
    }
  }
  return null;
}

/**
 * Altura do grau da eclíptica sobre o horizonte, em graus. Exportada porque é
 * com ela que os testes conferem os ângulos: a altura do ascendente tem de ser
 * zero, e a do meio do céu, a maior de todas naquele instante.
 */
export function alturaDoGrau(
  longitudeEclipticaGrau: number,
  momento: Date,
  latitude: number,
  longitude: number,
): number {
  const lat = Math.max(-89.9, Math.min(89.9, latitude));
  return grauNoHorizonte(
    longitudeEclipticaGrau,
    obliquidade(momento),
    tempoSideralLocal(momento, longitude),
    lat,
  ).altura;
}
