import type { Aspecto, PontoAspectavel } from './aspectos';
import { ROTULO_ASPECTO } from './aspectos';
import { CASAS } from './astrologia';
import type { Corpo, PosicaoCorpo } from './efemerides';
import { NOME_CORPO, corpoPorNome, signoDoGrau } from './efemerides';

/**
 * As quatro áreas da vida, lidas a partir das casas.
 *
 * A versão que está no ar escreve amor, trabalho, dinheiro e caminho a partir
 * de Sol, Lua e Ascendente — as três peças que todo mapa tem. Funciona, e é
 * genérica: quem nasceu no mesmo dia recebe quase o mesmo texto.
 *
 * O que torna uma área desta pessoa é **onde** ela acontece. Amor não é só
 * Vênus: é a casa 7, o signo em que ela começa, quem mora lá dentro e onde
 * está o planeta que responde por ela. É isso que este módulo reúne.
 *
 * **As atribuições abaixo são convenção, não fato.** Escolas divergem sobre
 * quais casas e quais planetas respondem por cada assunto. Estão todas numa
 * tabela só, declaradas como escolha, para um astrólogo revisar sem caçar
 * número espalhado pelo código — a mesma decisão tomada nos orbes dos aspectos.
 *
 * Nada aqui interpreta. O módulo reúne as peças do mapa que pertencem a cada
 * área; quem escreve o texto é a IA, e quem confere é a pessoa, porque as peças
 * vão para a tela junto do texto.
 */

export type AreaId = 'amor' | 'trabalho' | 'dinheiro' | 'caminho';

export interface DefinicaoArea {
  id: AreaId;
  titulo: string;
  /** As casas que respondem pela área, da principal para a secundária. */
  casas: number[];
  /** Os corpos que respondem pela área. */
  corpos: Corpo[];
  /** Por que estas casas e estes corpos. Vai para a tela, não só para o código. */
  porque: string;
}

export const AREAS: DefinicaoArea[] = [
  {
    id: 'amor',
    titulo: 'Amor',
    casas: [7, 5],
    corpos: ['venus', 'marte'],
    porque: 'A casa 7 é o vínculo a dois; a 5, o romance e o prazer. Vênus diz o que você busca, Marte como você vai atrás.',
  },
  {
    id: 'trabalho',
    titulo: 'Trabalho',
    casas: [10, 6],
    corpos: ['saturno', 'marte'],
    porque: 'A casa 10 é a carreira e o que você constrói à vista; a 6, a rotina de quem faz. Saturno responde pelo esforço e pela autoridade, Marte pela iniciativa.',
  },
  {
    id: 'dinheiro',
    titulo: 'Dinheiro',
    casas: [2, 8],
    corpos: ['venus', 'jupiter'],
    porque: 'A casa 2 é o que você ganha e o valor que se dá; a 8, o que vem de fora e o que se divide. Vênus responde pelo valor, Júpiter pela medida entre guardar e gastar.',
  },
  {
    id: 'caminho',
    titulo: 'Caminho',
    casas: [1, 9],
    corpos: ['sol', 'jupiter'],
    porque: 'A casa 1 é por onde você entra em tudo; a 9, o horizonte que te puxa. O Sol é o que quer se realizar, Júpiter para onde isso se abre.',
  },
];

/** Uma peça do mapa que pertence à área: o que é, e o que ela diz. */
export interface PecaDaArea {
  rotulo: string;
  valor: string;
}

export interface AreaDaVida {
  id: AreaId;
  titulo: string;
  porque: string;
  pecas: PecaDaArea[];
  /**
   * Falso quando o mapa não tem hora de nascimento.
   *
   * Sem hora não há horizonte, sem horizonte não há casa, e a área volta a sair
   * só dos planetas — que é a versão básica. A tela e o prompt precisam saber a
   * diferença para dizer isso em voz alta, em vez de entregar menos sem
   * explicar por quê.
   */
  comCasas: boolean;
}

export interface EntradaAreas {
  posicoes: PosicaoCorpo[];
  /** As doze cúspides, ou nulo quando não há hora de nascimento. */
  cuspides: number[] | null;
  casaDoCorpo: Record<Corpo, number> | null;
  aspectos: Aspecto[];
  nomeDoPonto: (ponto: PontoAspectavel) => string;
}

/** No máximo dois aspectos por área: a lista é apoio, não catálogo. */
const LIMITE_ASPECTOS = 2;

/** O ângulo que é a cúspide destas casas, e recebe aspecto por elas. */
const ANGULO_DA_CASA: Record<number, PontoAspectavel> = {
  1: 'ascendente',
  10: 'meioCeu',
};

function listar(nomes: string[]): string {
  if (nomes.length === 0) return '';
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

/** O regente da cúspide desta casa, já como corpo do mapa. */
function regenteDaCasa(numero: number, cuspides: number[]): Corpo | null {
  return corpoPorNome(signoDoGrau(cuspides[numero - 1]).regente);
}

/** Exportada para `data/vocacao.ts`, que monta um conjunto de casas diferente do das áreas. */
export function pecaDaCasa(numero: number, entrada: EntradaAreas): PecaDaArea | null {
  const { cuspides, casaDoCorpo, posicoes } = entrada;
  if (!cuspides) return null;

  const casa = CASAS.find((c) => c.numero === numero);
  const signo = signoDoGrau(cuspides[numero - 1]);
  const dentro = posicoes
    .filter((p) => casaDoCorpo?.[p.corpo] === numero)
    .map((p) => NOME_CORPO[p.corpo]);

  const regente = regenteDaCasa(numero, cuspides);
  // A casa vazia não está sem assunto: o assunto dela está onde mora o regente.
  // Num mapa de dez corpos e doze casas, a maioria está vazia — sem esta parte,
  // metade das áreas apontaria para o nada.
  const ondeORegente = regente ? casaDoCorpo?.[regente] : undefined;
  const sobreORegente = regente
    ? `; regida por ${NOME_CORPO[regente]}${ondeORegente ? `, que está na casa ${ondeORegente}` : ''}`
    : '';

  return {
    rotulo: `Casa ${numero}${casa ? ` — ${casa.area}` : ''}`,
    valor: `começa em ${signo.nome}${
      dentro.length > 0 ? `, com ${listar(dentro)} dentro` : ', sem planeta dentro'
    }${sobreORegente}`,
  };
}

/** Exportada pelo mesmo motivo que `pecaDaCasa`. */
export function pecaDoCorpo(corpo: Corpo, entrada: EntradaAreas): PecaDaArea | null {
  const posicao = entrada.posicoes.find((p) => p.corpo === corpo);
  if (!posicao) return null;

  const casa = entrada.casaDoCorpo?.[corpo];
  return {
    rotulo: NOME_CORPO[corpo],
    valor: `${posicao.signo.nome} ${Math.floor(posicao.grau)}°${
      casa ? `, casa ${casa}` : ''
    }${posicao.retrogrado ? ' (retrógrado)' : ''}`,
  };
}

/**
 * Os pontos do mapa que pertencem à área: os corpos declarados, os regentes das
 * casas dela, e o ângulo quando a casa é a 1 ou a 10.
 *
 * Os regentes entram porque é por eles que uma casa vazia se liga ao resto do
 * mapa — sem isso, a área de quem tem a casa 7 vazia não teria aspecto nenhum
 * para mostrar.
 */
function pontosDaArea(def: DefinicaoArea, cuspides: number[] | null): Set<PontoAspectavel> {
  const pontos = new Set<PontoAspectavel>(def.corpos);
  if (!cuspides) return pontos;

  for (const numero of def.casas) {
    const angulo = ANGULO_DA_CASA[numero];
    if (angulo) pontos.add(angulo);
    const regente = regenteDaCasa(numero, cuspides);
    if (regente) pontos.add(regente);
  }
  return pontos;
}

/**
 * Exportada para a vocação reusar o filtro COMO ELE É: por Saturno, Marte e os
 * regentes. Alargá-lo para Mercúrio e Vênus faria quase todo aspecto do mapa
 * qualificar, e os dois escolhidos virariam os mais exatos do mapa em vez dos de
 * carreira. As fontes pedem esses planetas como significadores do ofício, não como
 * filtro de aspecto.
 */
export function pecasDosAspectos(def: DefinicaoArea, entrada: EntradaAreas): PecaDaArea[] {
  const pontos = pontosDaArea(def, entrada.cuspides);
  // `aspectos` já chega do mais exato para o mais frouxo (`data/aspectos.ts`),
  // então cortar no começo guarda os que mais pesam.
  return entrada.aspectos
    .filter((a) => pontos.has(a.a) || pontos.has(a.b))
    .slice(0, LIMITE_ASPECTOS)
    .map((a) => ({
      rotulo: `${entrada.nomeDoPonto(a.a)} ${ROTULO_ASPECTO[a.tipo]} ${entrada.nomeDoPonto(a.b)}`,
      valor: `${a.orbe.toFixed(1)}° do exato${
        a.natureza === 'tenso' ? ', tenso' : a.natureza === 'harmonico' ? ', harmônico' : ''
      }`,
    }));
}

/**
 * As quatro áreas com as peças de mapa que pertencem a cada uma.
 *
 * Sempre devolve as quatro, na ordem declarada: uma área que apareceu ontem e
 * não aparece hoje é pior do que uma área magra, porque a pessoa não sabe se
 * perdeu algo ou se o mapa dela não tem aquilo.
 */
export function areasDaVida(entrada: EntradaAreas): AreaDaVida[] {
  const comCasas = entrada.cuspides !== null;

  return AREAS.map((def) => {
    const pecas: PecaDaArea[] = [];
    for (const numero of def.casas) {
      const peca = pecaDaCasa(numero, entrada);
      if (peca) pecas.push(peca);
    }
    for (const corpo of def.corpos) {
      const peca = pecaDoCorpo(corpo, entrada);
      if (peca) pecas.push(peca);
    }
    pecas.push(...pecasDosAspectos(def, entrada));

    return { id: def.id, titulo: def.titulo, porque: def.porque, pecas, comCasas };
  });
}
