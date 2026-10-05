import type { Corpo, PosicaoCorpo } from './efemerides';

/**
 * Os aspectos: as conversas entre os corpos do mapa.
 *
 * Até aqui o mapa dizia onde cada planeta está, e nada sobre como eles se
 * falam. É a lacuna que fazia a leitura sair genérica — "Mercúrio é como você
 * pensa" serve para qualquer pessoa; "o seu Mercúrio em quadratura com Saturno"
 * só serve para uma.
 *
 * **Os orbes aqui são convenção, não fato.** Escolas divergem, e não existe
 * medida certa: orbe é quanto de folga se aceita antes de dizer que dois
 * planetas ainda estão conversando. Estão todos numa tabela só, declarados como
 * escolha, para um astrólogo revisar sem caçar número espalhado pelo código.
 */

const VOLTA = 360;

export type TipoAspecto = 'conjuncao' | 'sextil' | 'quadratura' | 'trigono' | 'oposicao';

/** Os pontos que também entram: não são corpos, mas recebem aspecto. */
export type PontoAspectavel = Corpo | 'ascendente' | 'meioCeu';

export interface DefinicaoAspecto {
  tipo: TipoAspecto;
  /** O ângulo exato, em graus. */
  angulo: number;
  /** Folga aceita. A segunda, maior, vale quando Sol ou Lua está envolvido. */
  orbe: number;
  orbeLuminar: number;
  /**
   * Harmônico corre solto, tenso empurra. Nenhum dos dois é bom ou ruim — e o
   * texto da tela precisa dizer isso, porque "tenso" assusta quem lê.
   */
  natureza: 'harmonico' | 'tenso' | 'neutro';
}

export const ASPECTOS: DefinicaoAspecto[] = [
  { tipo: 'conjuncao', angulo: 0, orbe: 8, orbeLuminar: 10, natureza: 'neutro' },
  { tipo: 'oposicao', angulo: 180, orbe: 8, orbeLuminar: 10, natureza: 'tenso' },
  { tipo: 'trigono', angulo: 120, orbe: 7, orbeLuminar: 8, natureza: 'harmonico' },
  { tipo: 'quadratura', angulo: 90, orbe: 7, orbeLuminar: 8, natureza: 'tenso' },
  { tipo: 'sextil', angulo: 60, orbe: 5, orbeLuminar: 6, natureza: 'harmonico' },
];

export const ROTULO_ASPECTO: Record<TipoAspecto, string> = {
  conjuncao: 'conjunção',
  sextil: 'sextil',
  quadratura: 'quadratura',
  trigono: 'trígono',
  oposicao: 'oposição',
};

export const SIMBOLO_ASPECTO: Record<TipoAspecto, string> = {
  conjuncao: '☌',
  sextil: '⚹',
  quadratura: '□',
  trigono: '△',
  oposicao: '☍',
};

export interface Aspecto {
  a: PontoAspectavel;
  b: PontoAspectavel;
  tipo: TipoAspecto;
  natureza: DefinicaoAspecto['natureza'];
  /** Quanto o ângulo real se afasta do exato, em graus. Zero é exato. */
  orbe: number;
  /**
   * De 0 a 1, sendo 1 o aspecto exato.
   *
   * Existe para a tela poder mostrar só o que importa: um mapa com dez corpos
   * produz dezenas de aspectos, e listar todos é o mesmo que não listar nenhum.
   */
  forca: number;
}

const LUMINARES: PontoAspectavel[] = ['sol', 'lua'];

/** Separação pelo lado curto do círculo: 350° e 10° estão a 20°, não a 340°. */
export function separacao(a: number, b: number): number {
  const normalizar = (g: number) => ((g % VOLTA) + VOLTA) % VOLTA;
  const bruta = Math.abs(normalizar(a) - normalizar(b));
  return Math.min(bruta, VOLTA - bruta);
}

function orbeAceito(def: DefinicaoAspecto, a: PontoAspectavel, b: PontoAspectavel): number {
  // Sol e Lua ganham folga maior porque são os corpos mais visíveis do mapa, e
  // é a convenção mais difundida. Está aqui, e não espalhado, de propósito.
  const temLuminar = LUMINARES.includes(a) || LUMINARES.includes(b);
  return temLuminar ? def.orbeLuminar : def.orbe;
}

export interface EntradaAspecto {
  ponto: PontoAspectavel;
  longitude: number;
}

/**
 * Todos os aspectos entre os pontos dados, do mais exato para o mais frouxo.
 *
 * Cada par aparece uma vez só: aspecto é relação, e listar Sol–Lua e Lua–Sol
 * seria contar a mesma conversa duas vezes.
 */
export function calcularAspectos(entradas: EntradaAspecto[]): Aspecto[] {
  const achados: Aspecto[] = [];

  for (let i = 0; i < entradas.length; i += 1) {
    for (let j = i + 1; j < entradas.length; j += 1) {
      const a = entradas[i];
      const b = entradas[j];
      const distancia = separacao(a.longitude, b.longitude);

      for (const def of ASPECTOS) {
        const orbe = Math.abs(distancia - def.angulo);
        const limite = orbeAceito(def, a.ponto, b.ponto);
        if (orbe > limite) continue;

        achados.push({
          a: a.ponto,
          b: b.ponto,
          tipo: def.tipo,
          natureza: def.natureza,
          orbe,
          forca: 1 - orbe / limite,
        });
        // Um par não faz dois aspectos: os ângulos estão longe o bastante uns
        // dos outros para que o primeiro que couber seja o único.
        break;
      }
    }
  }

  return achados.sort((x, y) => y.forca - x.forca);
}

/** As entradas de um mapa montado: os dez corpos, mais os dois ângulos. */
export function entradasDoMapa(
  posicoes: PosicaoCorpo[],
  angulos: { ascendente: number; meioCeu: number } | null,
): EntradaAspecto[] {
  const entradas: EntradaAspecto[] = posicoes.map((p) => ({
    ponto: p.corpo,
    longitude: p.longitude,
  }));
  // Sem hora de nascimento não há ascendente nem meio do céu, e aspecto a um
  // ângulo que não existe seria invenção.
  if (angulos) {
    entradas.push({ ponto: 'ascendente', longitude: angulos.ascendente });
    entradas.push({ ponto: 'meioCeu', longitude: angulos.meioCeu });
  }
  return entradas;
}

/**
 * Os aspectos que sobrevivem a um mapa sem hora de nascimento.
 *
 * Sem hora o mapa é levantado ao meio-dia, que é a convenção. Isso não estraga os
 * aspectos entre planetas: eles dependem do ângulo de um planeta ao outro, não do
 * relógio. A Lua é a exceção, e a doutrina a trata como ponto cego — o que depende
 * dela se põe de lado.
 *
 * A conta explica por quê. A Lua anda ~13,2° por dia, então meio dia de incerteza a
 * move até ±6,6°; no perigeu ela chega a ~15,4°/dia, ou ±7,7°. Os nossos orbes para
 * luminar são 10° (conjunção e oposição), 8° (trígono e quadratura) e 6° (sextil).
 * Ou seja: um sextil da Lua NUNCA é confiável sem hora, e um trígono só sobreviveria
 * a menos de 1,4° do exato — e mesmo esse corte vaza justamente nos dias em que ela
 * corre mais. Guardar "os robustos" seria precisão falsa.
 *
 * Isto NÃO usa `luaIncerta`: aquele sinaliza risco de a Lua trocar de SIGNO, e só é
 * verdadeiro quando ela está nos 6,6° de ponta do signo — em pouco mais de 40% dos
 * casos. Uma Lua no meio do signo tem o signo seguro e os aspectos igualmente
 * incertos. O gatilho certo é a hora ser desconhecida, e nada mais.
 *
 * Também não usa "não há cúspides": acima do círculo polar as casas se desfazem com
 * a hora conhecida, e ali a Lua está perfeitamente boa.
 */
export function aspectosSemALua(aspectos: Aspecto[], semHora: boolean): Aspecto[] {
  if (!semHora) return aspectos;
  // As duas pontas: "Saturno trígono Lua" entra na área de carreira pelo Saturno, e
  // olhar só uma ponta o deixaria passar.
  return aspectos.filter((a) => a.a !== 'lua' && a.b !== 'lua');
}
