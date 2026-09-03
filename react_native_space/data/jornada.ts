// Dados da Jornada Espiritual do Arcanus

export type TipoOraculo = 'tarot' | 'buzios' | 'numerologia' | 'mapa_astral' | 'cafe' | 'quiromancia';
export type FormatoEntrega = 'texto' | 'audio' | 'video';

export interface LeituraHistorico {
  id: string;
  tipo: TipoOraculo;
  titulo: string;
  resumo: string;
  data: string; // DD/MM/AAAA
  hora: string;
  formato: FormatoEntrega;
  destaque: string; // carta/odu/número principal
  favorita: boolean;
}

export interface EstatisticasJornada {
  totalLeituras: number;
  diasConsecutivos: number;
  melhorSequencia: number;
  oracularMaisUsado: string;
  leiturasSemana: number;
  leiturasMes: number;
  nivel: string;
  xp: number;
  xpProximoNivel: number;
}

export interface InsightSemanal {
  titulo: string;
  descricao: string;
  icone: string;
}

const NOMES_TIPO: Record<TipoOraculo, string> = {
  tarot: 'Tarot',
  buzios: 'Búzios',
  numerologia: 'Numerologia',
  mapa_astral: 'Mapa Astral',
  cafe: 'Borra de Café',
  quiromancia: 'Quiromancia',
};

const CORES_TIPO: Record<TipoOraculo, string> = {
  tarot: '#9B59B6',
  buzios: '#7C9A82',
  numerologia: '#3498DB',
  mapa_astral: '#E67E22',
  cafe: '#8B4513',
  quiromancia: '#E74C3C',
};

const ICONES_TIPO: Record<TipoOraculo, string> = {
  tarot: 'cards-outline',
  buzios: 'grain',
  numerologia: 'calculator-outline',
  mapa_astral: 'planet-outline',
  cafe: 'cafe-outline',
  quiromancia: 'hand-left-outline',
};

export function nomeTipo(tipo: TipoOraculo): string { return NOMES_TIPO[tipo]; }
export function corTipo(tipo: TipoOraculo): string { return CORES_TIPO[tipo]; }
export function iconeTipo(tipo: TipoOraculo): string { return ICONES_TIPO[tipo]; }

// Demo: histórico de leituras
export const HISTORICO_DEMO: LeituraHistorico[] = [
  {
    id: 'h1', tipo: 'tarot', titulo: 'Leitura de Tarot — 3 Cartas',
    resumo: 'O Mago, A Imperatriz e A Estrela revelaram um ciclo de criação e renovação na sua vida.',
    data: '22/06/2026', hora: '14:30', formato: 'texto',
    destaque: 'O Mago', favorita: true,
  },
  {
    id: 'h2', tipo: 'buzios', titulo: 'Jogo de Búzios',
    resumo: 'Ossé (11 abertos) — Momento de cura e renovação com a proteção de Ossain.',
    data: '21/06/2026', hora: '10:15', formato: 'texto',
    destaque: 'Ossé', favorita: false,
  },
  {
    id: 'h3', tipo: 'numerologia', titulo: 'Numerologia Completa',
    resumo: 'Caminho de Vida 7 — O Místico. Sabedoria, introspecção e busca espiritual.',
    data: '20/06/2026', hora: '19:45', formato: 'texto',
    destaque: 'Número 7', favorita: true,
  },
  {
    id: 'h4', tipo: 'cafe', titulo: 'Análise de Borra de Café',
    resumo: 'Padrões de árvore e montanha indicam crescimento e estabilidade.',
    data: '19/06/2026', hora: '08:20', formato: 'texto',
    destaque: 'Árvore', favorita: false,
  },
  {
    id: 'h5', tipo: 'mapa_astral', titulo: 'Mapa Astral Natal',
    resumo: 'Sol em Gêmeos, Lua em Peixes, Ascendente Áries. Dualidade criativa.',
    data: '18/06/2026', hora: '16:00', formato: 'texto',
    destaque: 'Sol em Gêmeos', favorita: false,
  },
  {
    id: 'h6', tipo: 'tarot', titulo: 'Leitura de Tarot — 3 Cartas',
    resumo: 'A Lua, O Julgamento e O Mundo trouxeram mensagens de encerramento e renascimento.',
    data: '17/06/2026', hora: '21:00', formato: 'texto',
    destaque: 'O Mundo', favorita: false,
  },
  {
    id: 'h7', tipo: 'quiromancia', titulo: 'Leitura de Mão',
    resumo: 'Linha da vida longa e curva, indicando vitalidade e flexibilidade.',
    data: '15/06/2026', hora: '12:30', formato: 'texto',
    destaque: 'Linha da Vida', favorita: true,
  },
  {
    id: 'h8', tipo: 'buzios', titulo: 'Jogo de Búzios',
    resumo: 'Ejionile (8 abertos) — Prosperidade e equilíbrio com Oxóssi.',
    data: '14/06/2026', hora: '09:00', formato: 'texto',
    destaque: 'Ejionile', favorita: false,
  },
];

export const ESTATISTICAS_DEMO: EstatisticasJornada = {
  totalLeituras: 47,
  diasConsecutivos: 5,
  melhorSequencia: 12,
  oracularMaisUsado: 'Tarot',
  leiturasSemana: 6,
  leiturasMes: 18,
  nivel: 'Aprendiz Espiritual',
  xp: 470,
  xpProximoNivel: 600,
};

export const INSIGHTS_DEMO: InsightSemanal[] = [
  {
    titulo: 'Seu oráculo favorito é Tarot',
    descricao: 'Você fez 20 leituras de Tarot este mês. Que tal experimentar Búzios?',
    icone: 'bulb-outline',
  },
  {
    titulo: 'Sequência ativa: 5 dias!',
    descricao: 'Continue sua jornada diária para atingir seu recorde de 12 dias.',
    icone: 'flame-outline',
  },
  {
    titulo: 'Elemento Água em destaque',
    descricao: 'Suas últimas leituras mostram forte influência do elemento Água. Momento de intuição.',
    icone: 'water-outline',
  },
];

// Dados para gráfico de atividade semanal
export const ATIVIDADE_SEMANAL = [
  { dia: 'Seg', leituras: 2 },
  { dia: 'Ter', leituras: 1 },
  { dia: 'Qua', leituras: 3 },
  { dia: 'Qui', leituras: 0 },
  { dia: 'Sex', leituras: 2 },
  { dia: 'Sáb', leituras: 1 },
  { dia: 'Dom', leituras: 0 },
];
