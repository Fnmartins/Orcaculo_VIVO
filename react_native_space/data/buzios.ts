// Dados do Jogo de Búzios (Merindilogún simplificado)
// Cada odu é determinado pela quantidade de búzios abertos (boca para cima)

export interface OduBuzios {
  id: number;
  nome: string;
  nomeYoruba: string;
  abertos: number; // quantidade de búzios abertos
  elemento: string;
  regente: string;
  significado: string;
  conselho: string;
  energia: 'positiva' | 'neutra' | 'atencao';
  cor: string;
}

export const ODUS: OduBuzios[] = [
  {
    id: 1,
    nome: 'Okaran',
    nomeYoruba: 'Okan\u00e1n',
    abertos: 1,
    elemento: 'Fogo',
    regente: 'Ex\u00fa',
    significado: 'Momento de aten\u00e7\u00e3o e cuidado. As energias pedem cautela em suas decis\u00f5es. N\u00e3o \u00e9 hora de grandes mudan\u00e7as, mas sim de reflex\u00e3o profunda.',
    conselho: 'Fa\u00e7a oferendas e limpezas espirituais. Evite conflitos e seja prudente em neg\u00f3cios.',
    energia: 'atencao',
    cor: '#E74C3C',
  },
  {
    id: 2,
    nome: 'Ejioko',
    nomeYoruba: 'Ej\u00ed Ok\u00f4',
    abertos: 2,
    elemento: 'Terra',
    regente: 'Ibeji',
    significado: 'Dualidade e escolhas. Dois caminhos se apresentam. A sabedoria est\u00e1 em equilibrar raz\u00e3o e emo\u00e7\u00e3o antes de decidir.',
    conselho: 'Busque equil\u00edbrio. Parcerias podem ser ben\u00e9ficas neste momento. Ou\u00e7a ambos os lados.',
    energia: 'neutra',
    cor: '#E67E22',
  },
  {
    id: 3,
    nome: 'Etaogund\u00e1',
    nomeYoruba: 'Et\u00e1 Ogund\u00e1',
    abertos: 3,
    elemento: 'Fogo',
    regente: 'Ogum',
    significado: 'For\u00e7a, coragem e supera\u00e7\u00e3o de obst\u00e1culos. Ogum abre os caminhos com sua espada. \u00c9 hora de agir com determina\u00e7\u00e3o.',
    conselho: 'Avan\u00e7e com coragem. Os obst\u00e1culos ser\u00e3o vencidos com persist\u00eancia e f\u00e9.',
    energia: 'positiva',
    cor: '#2ECC71',
  },
  {
    id: 4,
    nome: 'Iros\u00fan',
    nomeYoruba: 'Iros\u00fan',
    abertos: 4,
    elemento: '\u00c1gua',
    regente: 'Nan\u00e3',
    significado: 'Ancestralidade e sabedoria dos mais velhos. As ra\u00edzes te chamam. Honre sua hist\u00f3ria e os que vieram antes.',
    conselho: 'Busque a sabedoria dos ancestrais. Medite, fa\u00e7a ora\u00e7\u00f5es e conecte-se com suas ra\u00edzes.',
    energia: 'positiva',
    cor: '#9B59B6',
  },
  {
    id: 5,
    nome: 'Ox\u00ea',
    nomeYoruba: 'Ox\u00ea',
    abertos: 5,
    elemento: '\u00c1gua',
    regente: 'Oxum',
    significado: 'Amor, fertilidade e prosperidade. Oxum derrama suas \u00e1guas doces trazendo abund\u00e2ncia emocional e material.',
    conselho: 'Abra-se para o amor. Cuide da sua vida afetiva e financeira com carinho e aten\u00e7\u00e3o.',
    energia: 'positiva',
    cor: '#F1C40F',
  },
  {
    id: 6,
    nome: 'Obar\u00e1',
    nomeYoruba: 'Obar\u00e1',
    abertos: 6,
    elemento: 'Fogo',
    regente: 'Xang\u00f4',
    significado: 'Justi\u00e7a, poder e equil\u00edbrio. Xang\u00f4 traz a balan\u00e7a da justi\u00e7a. A verdade prevalecer\u00e1.',
    conselho: 'Aja com justi\u00e7a e honestidade. Decis\u00f5es importantes devem ser tomadas com sabedoria.',
    energia: 'positiva',
    cor: '#C0392B',
  },
  {
    id: 7,
    nome: 'Od\u00ed',
    nomeYoruba: 'Od\u00ed',
    abertos: 7,
    elemento: 'Terra',
    regente: 'Oxossi / Yemanj\u00e1',
    significado: 'Transforma\u00e7\u00e3o profunda e renascimento. As portas do passado se fecham para que novas se abram.',
    conselho: 'Aceite as mudan\u00e7as. Liberte-se do que n\u00e3o serve mais e confie no novo ciclo.',
    energia: 'neutra',
    cor: '#3498DB',
  },
  {
    id: 8,
    nome: 'Ej\u00ed Onile',
    nomeYoruba: 'Ej\u00ed On\u00edl\u00ea',
    abertos: 8,
    elemento: 'Terra',
    regente: 'Oxagui\u00e3',
    significado: 'Conquista, vit\u00f3ria e realiza\u00e7\u00e3o. As energias est\u00e3o alinhadas para grandes conquistas. O universo conspira a seu favor.',
    conselho: 'Aproveite este momento favor\u00e1vel. Inicie projetos, tome decis\u00f5es e celebre.',
    energia: 'positiva',
    cor: '#27AE60',
  },
  {
    id: 9,
    nome: 'Oss\u00e1',
    nomeYoruba: 'Oss\u00e1',
    abertos: 9,
    elemento: 'Ar',
    regente: 'Ians\u00e3',
    significado: 'Mudan\u00e7a de ventos e transforma\u00e7\u00e3o r\u00e1pida. Ians\u00e3 sopra ventos de renova\u00e7\u00e3o. Prepare-se para mudan\u00e7as intensas.',
    conselho: 'Seja flex\u00edvel. As mudan\u00e7as podem ser repentinas, mas trazem evolu\u00e7\u00e3o.',
    energia: 'neutra',
    cor: '#E91E63',
  },
  {
    id: 10,
    nome: 'Of\u00fan',
    nomeYoruba: 'Of\u00fan',
    abertos: 10,
    elemento: '\u00c1gua',
    regente: 'Oxal\u00e1',
    significado: 'Paz, harmonia e b\u00ean\u00e7\u00e3os. Oxal\u00e1 derrama sua paz sobre voc\u00ea. \u00c9 tempo de gratid\u00e3o e serenidade.',
    conselho: 'Agradeça. Mantenha a paz interior e espalhe harmonia ao seu redor.',
    energia: 'positiva',
    cor: '#ECF0F1',
  },
  {
    id: 11,
    nome: 'Ow\u00f4nrin',
    nomeYoruba: 'Ow\u00f4nrin',
    abertos: 11,
    elemento: 'Ar',
    regente: 'Ians\u00e3 / Eg\u00fan',
    significado: 'Conex\u00e3o espiritual profunda. O v\u00e9u entre os mundos est\u00e1 fino. Mensagens espirituais est\u00e3o chegando.',
    conselho: 'Preste aten\u00e7\u00e3o aos sonhos e intui\u00e7\u00f5es. O mundo espiritual quer se comunicar.',
    energia: 'neutra',
    cor: '#8E44AD',
  },
  {
    id: 12,
    nome: 'Ej\u00ed L\u00e1shebor\u00e1',
    nomeYoruba: 'Ej\u00ed L\u00e1shebor\u00e1',
    abertos: 12,
    elemento: 'Fogo',
    regente: 'Xang\u00f4',
    significado: 'Grande poder e sabedoria. Todas as for\u00e7as est\u00e3o alinhadas. Um momento raro de plenitude espiritual.',
    conselho: 'Este \u00e9 um odu de grande poder. Use-o com sabedoria e generosidade.',
    energia: 'positiva',
    cor: '#D4AF37',
  },
];

export interface ResultadoBuzios {
  buzios: boolean[]; // true = aberto, false = fechado
  odu: OduBuzios;
}

// Jogar 12 b\u00fazios e determinar o odu
export function jogarBuzios(): ResultadoBuzios {
  // Gerar 12 b\u00fazios aleat\u00f3rios (true = aberto)
  const buzios = Array.from({ length: 12 }, () => Math.random() > 0.5);
  const abertos = buzios.filter(b => b).length;

  // Se 0 abertos, considerar como 12 (todos fechados = odu especial)
  const numAbertos = abertos === 0 ? 12 : abertos;

  const odu = ODUS.find(o => o.abertos === numAbertos) ?? ODUS[0];

  return { buzios, odu };
}
