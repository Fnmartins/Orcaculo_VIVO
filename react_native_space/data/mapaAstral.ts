import { casaDoGrau, casasPlacidus, type Casas } from './casas';
import { type Cidade } from './cidades';
import {
  angulos as calcularAngulos,
  grauNoSigno,
  posicoes as calcularPosicoes,
  signoDoGrau,
  type Angulos,
  type Corpo,
  type PosicaoCorpo,
} from './efemerides';
import { type Signo } from './astrologia';
import { paraUTC } from '../utils/fuso';

/**
 * O mapa natal montado: posições reais, ângulos reais, e a síntese.
 *
 * Substitui `gerarMapaAstral` de `data/astrologia.ts`, que derivava tudo de uma
 * semente aritmética. Aqui cada número tem de onde vir, e o que não dá para
 * saber aparece como não sabido — não como número bonito.
 *
 * Duas honestidades embutidas:
 *
 * - **Sem hora de nascimento** não existe ascendente nem casa. O mapa sai com
 *   `semHora`, calculado ao meio-dia local, e a Lua ganha `luaIncerta` quando
 *   está perto da virada de signo — ela anda 13 graus por dia, então meio dia de
 *   incerteza pode trocar o signo dela.
 * - **Fuso aproximado** quando o ambiente não sabe horário de verão histórico;
 *   aí o ascendente pode estar uma hora fora, e a tela precisa dizer isso.
 */

export interface DadosNascimento {
  ano: number;
  mes: number;
  dia: number;
  /** Nulo quando a pessoa não sabe a hora. */
  hora: number | null;
  minuto: number | null;
  /**
   * A cidade já resolvida, com coordenada e fuso.
   *
   * Recebia só o identificador e procurava na lista local de 53 capitais. Com
   * a base no banco isso quebrou em silêncio: quem escolhesse Santo Ângelo
   * caía em "cidade não encontrada", porque ela não está — nem deve estar — na
   * lista embutida no app.
   */
  cidade: Cidade;
}

export interface Sintese {
  elementos: Record<string, number>;
  qualidades: Record<string, number>;
  elementoDominante: string;
  qualidadeDominante: string;
  /** Elemento sem nenhum planeta — diz tanto quanto o dominante. */
  elementoAusente: string | null;
  /** Regente do signo do ascendente. Nulo sem hora de nascimento. */
  regenteDoMapa: { planeta: string; signo: string } | null;
}

export interface MapaAstral {
  cidade: Cidade;
  momentoUTC: Date;
  offsetMinutos: number;
  fusoAproximado: boolean;
  semHora: boolean;
  luaIncerta: boolean;
  posicoes: PosicaoCorpo[];
  /** Nulo sem hora de nascimento: sem hora não há horizonte. */
  angulos: Angulos | null;
  signoAscendente: Signo | null;
  grauAscendente: number | null;
  /**
   * As doze cúspides, por Placidus.
   *
   * Nulo em dois casos, por motivos diferentes: sem hora de nascimento não há
   * horizonte, então não há casa; e acima do círculo polar o próprio sistema se
   * desfaz (`data/casas.ts`). A tela precisa distinguir os dois na hora de
   * explicar a ausência.
   */
  casas: Casas | null;
  /** Em que casa cai cada corpo, de 1 a 12. Nulo quando não há casas. */
  casaDoCorpo: Record<Corpo, number> | null;
  sintese: Sintese;
}

/** Quanto a Lua anda em um dia, em graus. */
const PASSO_DA_LUA = 13.2;

/**
 * O que o plano gratuito mostra (decisão M7): Sol, Lua e ascendente, com a
 * síntese. O resto — os outros oito corpos, casas e aspectos — é dos planos
 * pagos. O gratuito não perde nada de real: o que ele mostrava antes disso eram
 * números inventados, tirados da tela em 23/09.
 */
export const CORPOS_NO_GRATUITO: Corpo[] = ['sol', 'lua'];

export function visivelNoGratuito(corpo: Corpo): boolean {
  return CORPOS_NO_GRATUITO.includes(corpo);
}

function contar(chaves: string[]): Record<string, number> {
  const conta: Record<string, number> = {};
  for (const chave of chaves) conta[chave] = (conta[chave] ?? 0) + 1;
  return conta;
}

function maisFrequente(conta: Record<string, number>, ordem: string[]): string {
  let melhor = ordem[0];
  for (const chave of ordem) {
    if ((conta[chave] ?? 0) > (conta[melhor] ?? 0)) melhor = chave;
  }
  return melhor;
}

const ELEMENTOS = ['Fogo', 'Terra', 'Ar', 'Água'];
const QUALIDADES = ['Cardinal', 'Fixo', 'Mutável'];

function montarSintese(posicoes: PosicaoCorpo[], signoAscendente: Signo | null): Sintese {
  // Conta os dez corpos. O ascendente fica fora da contagem de propósito: ele é
  // ponto, não corpo, e somá-lo mistura duas coisas diferentes.
  const elementos = contar(posicoes.map((p) => p.signo.elemento));
  const qualidades = contar(posicoes.map((p) => p.signo.qualidade));
  for (const e of ELEMENTOS) elementos[e] = elementos[e] ?? 0;
  for (const q of QUALIDADES) qualidades[q] = qualidades[q] ?? 0;

  return {
    elementos,
    qualidades,
    elementoDominante: maisFrequente(elementos, ELEMENTOS),
    qualidadeDominante: maisFrequente(qualidades, QUALIDADES),
    elementoAusente: ELEMENTOS.find((e) => elementos[e] === 0) ?? null,
    regenteDoMapa: signoAscendente
      ? { planeta: signoAscendente.regente, signo: signoAscendente.nome }
      : null,
  };
}

export function montarMapaAstral(dados: DadosNascimento): MapaAstral {
  const { cidade } = dados;
  if (!cidade?.fuso || !Number.isFinite(cidade.lat) || !Number.isFinite(cidade.lon)) {
    throw new Error('Cidade de nascimento não encontrada.');
  }

  const semHora = dados.hora === null;
  // Sem hora, o meio-dia local é a convenção: erra no máximo doze horas para
  // qualquer lado, em vez de errar doze para um só.
  const { momento, offsetMinutos, aproximado } = paraUTC({
    ano: dados.ano,
    mes: dados.mes,
    dia: dados.dia,
    hora: semHora ? 12 : (dados.hora as number),
    minuto: semHora ? 0 : (dados.minuto ?? 0),
    fuso: cidade.fuso,
    offsetPadrao: cidade.offsetPadrao,
  });

  const posicoes = calcularPosicoes(momento);
  const lua = posicoes.find((p) => p.corpo === 'lua');
  const grauDaLua = lua ? grauNoSigno(lua.longitude) : 0;
  // Meio dia de incerteza move a Lua até meio passo dela para cada lado.
  const margem = PASSO_DA_LUA / 2;
  const luaIncerta = semHora && (grauDaLua < margem || grauDaLua > 30 - margem);

  const angulos = semHora ? null : calcularAngulos(momento, cidade.lat, cidade.lon);
  const signoAscendente = angulos ? signoDoGrau(angulos.ascendente) : null;

  const casas = semHora ? null : casasPlacidus(momento, cidade.lat, cidade.lon);
  const casaDoCorpo = casas
    ? (Object.fromEntries(
        posicoes.map((p) => [p.corpo, casaDoGrau(p.longitude, casas)]),
      ) as Record<Corpo, number>)
    : null;

  return {
    cidade,
    momentoUTC: momento,
    offsetMinutos,
    fusoAproximado: aproximado,
    semHora,
    luaIncerta,
    posicoes,
    angulos,
    signoAscendente,
    grauAscendente: angulos ? grauNoSigno(angulos.ascendente) : null,
    casas,
    casaDoCorpo,
    sintese: montarSintese(posicoes, signoAscendente),
  };
}

/** '23° 41′ de Escorpião' — como astrólogo escreve, e como a tela mostra. */
export function escreverGrau(longitude: number): string {
  const signo = signoDoGrau(longitude);
  const grau = grauNoSigno(longitude);
  const inteiro = Math.floor(grau);
  const minutos = Math.round((grau - inteiro) * 60);
  // 60 minutos arredondados viram o grau seguinte, senão sai "12° 60′".
  const grauFinal = minutos === 60 ? inteiro + 1 : inteiro;
  const minutoFinal = minutos === 60 ? 0 : minutos;
  return `${grauFinal}° ${String(minutoFinal).padStart(2, '0')}′ de ${signo.nome}`;
}

/** Ordem de leitura: os dois luminares, depois os planetas por distância. */
export function ordemDeLeitura(posicoes: PosicaoCorpo[]): PosicaoCorpo[] {
  const ordem: Corpo[] = [
    'sol', 'lua', 'mercurio', 'venus', 'marte',
    'jupiter', 'saturno', 'urano', 'netuno', 'plutao',
  ];
  return [...posicoes].sort((a, b) => ordem.indexOf(a.corpo) - ordem.indexOf(b.corpo));
}
