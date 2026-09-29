import type { Aspecto, PontoAspectavel } from './aspectos';
import { ROTULO_ASPECTO } from './aspectos';
import type { Corpo, PosicaoCorpo } from './efemerides';

/**
 * A assinatura do mapa: os poucos fatores que mais marcam ESTE céu.
 *
 * Substitui a "Síntese do seu Sol", que explicava o signo solar — texto que
 * serve igual para todo mundo nascido no mesmo mês. Aqui cada fator sai de uma
 * conta sobre o mapa inteiro: quem mais conversa, onde a energia se junta, o
 * que falta.
 *
 * Nada aqui é opinião astrológica nova. São as mesmas peças que já estavam
 * calculadas — aspectos, casas, elementos — lidas juntas em vez de uma a uma.
 */

export interface FatorDaAssinatura {
  /** Rótulo curto: "Quem mais conversa". */
  rotulo: string;
  /** O achado: "Saturno, em quatro conexões". */
  valor: string;
  /** Uma frase de por que isso marca o mapa. */
  porque: string;
}

/** No máximo isto. Lista longa deixa de ser assinatura e vira catálogo. */
const LIMITE = 6;

/** O que cada casa governa, em uma palavra. Espelha `data/astrologia.ts`. */
const AREAS: Record<number, string> = {
  1: 'identidade', 2: 'recursos', 3: 'mente', 4: 'raízes',
  5: 'expressão', 6: 'rotina', 7: 'parcerias', 8: 'transformação',
  9: 'horizonte', 10: 'carreira', 11: 'coletivo', 12: 'interior',
};

export interface EntradaAssinatura {
  posicoes: PosicaoCorpo[];
  aspectos: Aspecto[];
  casaDoCorpo: Record<Corpo, number> | null;
  elementoDominante: string;
  elementoAusente: string | null;
  qualidadeDominante: string;
  regenteDoMapa: { planeta: string; signo: string } | null;
  nomeDoPonto: (ponto: PontoAspectavel) => string;
}

/**
 * Quem mais conversa no mapa.
 *
 * Conta por soma de força, não por quantidade: um planeta com três aspectos
 * frouxos participa menos que outro com dois quase exatos. Empate desempata
 * por quantidade e depois por nome, para a ordem não mudar entre aberturas.
 */
function planetaDominante(
  aspectos: Aspecto[],
  nomeDoPonto: EntradaAssinatura['nomeDoPonto'],
): FatorDaAssinatura | null {
  if (aspectos.length === 0) return null;

  const peso = new Map<PontoAspectavel, { forca: number; quantos: number }>();
  for (const a of aspectos) {
    for (const ponto of [a.a, a.b]) {
      const atual = peso.get(ponto) ?? { forca: 0, quantos: 0 };
      atual.forca += a.forca;
      atual.quantos += 1;
      peso.set(ponto, atual);
    }
  }

  const ordenado = [...peso.entries()].sort((x, y) =>
    y[1].forca - x[1].forca
    || y[1].quantos - x[1].quantos
    || String(x[0]).localeCompare(String(y[0])));

  const [ponto, dados] = ordenado[0];
  return {
    rotulo: 'Quem mais conversa',
    valor: `${nomeDoPonto(ponto)}, em ${dados.quantos === 1 ? 'uma conexão' : `${dados.quantos} conexões`}`,
    porque: 'É o ponto do mapa mais ligado aos outros — o que aparece em mais partes da sua história.',
  };
}

function aspectoMaisForte(
  aspectos: Aspecto[],
  nomeDoPonto: EntradaAssinatura['nomeDoPonto'],
): FatorDaAssinatura | null {
  // A lista já vem do mais exato para o mais frouxo.
  const a = aspectos[0];
  if (!a) return null;
  return {
    rotulo: 'A conexão mais exata',
    valor: `${nomeDoPonto(a.a)} ${ROTULO_ASPECTO[a.tipo]} ${nomeDoPonto(a.b)}`,
    porque: a.natureza === 'tenso'
      ? 'Duas partes suas que puxam para lados diferentes, e por isso se fazem notar.'
      : a.natureza === 'harmonico'
        ? 'Duas partes suas que correm juntas, tão naturalmente que você talvez nem perceba.'
        : 'Duas partes suas tão próximas que agem como uma só.',
  };
}

/**
 * Onde a energia se junta.
 *
 * Só conta quando há concentração de verdade: três corpos ou mais numa casa
 * são notáveis, dois são acaso num mapa de dez.
 */
function casaMaisPovoada(
  casaDoCorpo: Record<Corpo, number> | null,
  posicoes: PosicaoCorpo[],
): FatorDaAssinatura | null {
  if (!casaDoCorpo) return null;

  const conta = new Map<number, number>();
  for (const p of posicoes) {
    const casa = casaDoCorpo[p.corpo];
    if (casa) conta.set(casa, (conta.get(casa) ?? 0) + 1);
  }
  const ordenado = [...conta.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0]);
  const primeiro = ordenado[0];
  if (!primeiro || primeiro[1] < 3) return null;

  const [casa, quantos] = primeiro;
  return {
    rotulo: 'Onde a energia se junta',
    valor: `Casa ${casa} — ${AREAS[casa] ?? 'área da vida'}, com ${quantos} corpos`,
    porque: 'Uma área da vida que concentra mais que as outras, e costuma pesar nas escolhas.',
  };
}

function retrogrados(posicoes: PosicaoCorpo[]): FatorDaAssinatura | null {
  const lista = posicoes.filter((p) => p.retrogrado);
  // Um ou dois retrógrados é o comum; de três em diante vira marca do mapa.
  if (lista.length < 3) return null;
  return {
    rotulo: 'Movimento para dentro',
    valor: `${lista.length} corpos retrógrados`,
    porque: 'Retrógrado não é atraso: é energia que se resolve por dentro antes de aparecer fora.',
  };
}

/**
 * Os fatores que marcam este mapa, do mais específico para o mais geral.
 *
 * A ordem é deliberada: o que só existe neste mapa vem antes do que existe em
 * muitos. Elemento dominante é verdade sobre um quarto das pessoas; a conexão
 * mais exata é verdade sobre uma.
 */
export function assinaturaDoMapa(entrada: EntradaAssinatura): FatorDaAssinatura[] {
  const candidatos: (FatorDaAssinatura | null)[] = [
    aspectoMaisForte(entrada.aspectos, entrada.nomeDoPonto),
    planetaDominante(entrada.aspectos, entrada.nomeDoPonto),
    casaMaisPovoada(entrada.casaDoCorpo, entrada.posicoes),
    retrogrados(entrada.posicoes),
    {
      rotulo: 'Elemento que domina',
      valor: entrada.elementoDominante,
      porque: 'O clima de fundo do mapa — como a maior parte dele responde ao mundo.',
    },
    entrada.elementoAusente
      ? {
        rotulo: 'Elemento ausente',
        valor: entrada.elementoAusente,
        porque: 'Nenhum corpo aqui. Não é falta: é a parte que você aprende, em vez de já trazer.',
      }
      : null,
    {
      rotulo: 'Modalidade',
      valor: entrada.qualidadeDominante,
      porque: 'Como este mapa se move: começando, sustentando ou mudando.',
    },
    entrada.regenteDoMapa
      ? {
        rotulo: 'Regente do mapa',
        valor: `${entrada.regenteDoMapa.planeta}, em ${entrada.regenteDoMapa.signo}`,
        porque: 'O planeta que rege o seu ascendente, e por isso dá o tom de como você chega.',
      }
      : null,
  ];

  return candidatos.filter((f): f is FatorDaAssinatura => f !== null).slice(0, LIMITE);
}
