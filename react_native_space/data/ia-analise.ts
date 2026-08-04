// Dados e lógica para análise por IA (simulação local)

export type TipoAnalise = 'cafe' | 'quiromancia';

export interface AnaliseIA {
  tipo: TipoAnalise;
  titulo: string;
  resumo: string;
  detalhes: { secao: string; texto: string }[];
  energia: 'positiva' | 'neutra' | 'atencao';
  cor: string;
}

const ANALISES_CAFE: AnaliseIA[] = [
  {
    tipo: 'cafe',
    titulo: 'Caminhos que se Abrem',
    resumo: 'A borra revela caminhos novos surgindo em sua vida. As formas indicam movimento e transforma\u00e7\u00e3o positiva.',
    detalhes: [
      {
        secao: 'Formas Identificadas',
        texto: 'A IA identificou formas que se assemelham a p\u00e1ssaros e caminhos ramificados. P\u00e1ssaros na borra representam not\u00edcias chegando e liberdade. Os caminhos indicam escolhas importantes \u00e0 sua frente.',
      },
      {
        secao: 'Interpreta\u00e7\u00e3o Espiritual',
        texto: 'As energias mostram que voc\u00ea est\u00e1 em um momento de transi\u00e7\u00e3o. Novos come\u00e7os est\u00e3o se formando, especialmente na \u00e1rea profissional e afetiva. Confie no fluxo natural dos acontecimentos.',
      },
      {
        secao: 'Conselho',
        texto: 'Mantenha-se aberto \u00e0s novas possibilidades. Uma oportunidade inesperada pode surgir nos pr\u00f3ximos dias. Preste aten\u00e7\u00e3o aos sinais do universo.',
      },
    ],
    energia: 'positiva',
    cor: '#8B4513',
  },
  {
    tipo: 'cafe',
    titulo: 'Prote\u00e7\u00e3o e For\u00e7a Interior',
    resumo: 'Os padr\u00f5es na borra indicam prote\u00e7\u00e3o espiritual forte ao seu redor. Voc\u00ea est\u00e1 sendo guiado por for\u00e7as ben\u00e9ficas.',
    detalhes: [
      {
        secao: 'Formas Identificadas',
        texto: 'A IA detectou formas circulares e um padr\u00e3o que lembra um escudo ou \u00e1rvore. C\u00edrculos representam prote\u00e7\u00e3o divina e completude. A \u00e1rvore simboliza ra\u00edzes fortes e crescimento.',
      },
      {
        secao: 'Interpreta\u00e7\u00e3o Espiritual',
        texto: 'Sua aura est\u00e1 fortalecida neste momento. Os ancestrais est\u00e3o presentes e atuantes em sua vida. H\u00e1 uma energia de cura fluindo, especialmente para quest\u00f5es emocionais antigas.',
      },
      {
        secao: 'Conselho',
        texto: 'Aproveite este per\u00edodo de prote\u00e7\u00e3o para resolver pend\u00eancias. \u00c9 um bom momento para iniciar projetos que exigem coragem.',
      },
    ],
    energia: 'positiva',
    cor: '#6B4226',
  },
  {
    tipo: 'cafe',
    titulo: 'Reflex\u00e3o e Pausa',
    resumo: 'A borra indica um momento de introspec\u00e7\u00e3o necess\u00e1ria. N\u00e3o force situa\u00e7\u00f5es, permita-se parar.',
    detalhes: [
      {
        secao: 'Formas Identificadas',
        texto: 'Formas nebulosas e difusas foram identificadas, junto com o que parece ser uma lua ou meia-lua. A nebulosidade sugere incertezas, e a lua convida \u00e0 introspec\u00e7\u00e3o e ao mundo interior.',
      },
      {
        secao: 'Interpreta\u00e7\u00e3o Espiritual',
        texto: 'O universo pede que voc\u00ea desacelere. H\u00e1 respostas que s\u00f3 vir\u00e3o no sil\u00eancio. Medita\u00e7\u00e3o e momentos de solid\u00e3o ser\u00e3o seus maiores aliados agora.',
      },
      {
        secao: 'Conselho',
        texto: 'Evite tomar decis\u00f5es importantes nos pr\u00f3ximos dias. Reserve tempo para si, cuide do corpo e da mente. A clareza vir\u00e1 naturalmente.',
      },
    ],
    energia: 'neutra',
    cor: '#5D4037',
  },
];

const ANALISES_QUIROMANCIA: AnaliseIA[] = [
  {
    tipo: 'quiromancia',
    titulo: 'M\u00e3os que Criam Destinos',
    resumo: 'As linhas da sua m\u00e3o revelam uma pessoa criativa e determinada, com grande potencial de realiza\u00e7\u00e3o.',
    detalhes: [
      {
        secao: 'Linha da Vida',
        texto: 'Longa e bem definida, indicando vitalidade e energia abundante. Sua sa\u00fade tende a ser boa, mas \u00e9 importante manter h\u00e1bitos saud\u00e1veis. H\u00e1 indica\u00e7\u00e3o de uma grande mudan\u00e7a positiva na fase atual.',
      },
      {
        secao: 'Linha do Cora\u00e7\u00e3o',
        texto: 'Profunda e curvada, revelando intensidade emocional e capacidade de amar profundamente. Relacionamentos significativos est\u00e3o presentes ou se aproximando.',
      },
      {
        secao: 'Linha da Cabe\u00e7a',
        texto: 'Clara e estendida, mostrando intelig\u00eancia anal\u00edtica e criatividade. Voc\u00ea tem facilidade para resolver problemas complexos e pensar fora da caixa.',
      },
      {
        secao: 'Conselho',
        texto: 'Use seus talentos naturais com confian\u00e7a. O momento \u00e9 favor\u00e1vel para investir em educa\u00e7\u00e3o e projetos criativos.',
      },
    ],
    energia: 'positiva',
    cor: '#E74C3C',
  },
  {
    tipo: 'quiromancia',
    titulo: 'Sabedoria nas M\u00e3os',
    resumo: 'Suas linhas indicam maturidade espiritual e uma conex\u00e3o forte com a intui\u00e7\u00e3o.',
    detalhes: [
      {
        secao: 'Linha da Vida',
        texto: 'Apresenta ramifica\u00e7\u00f5es que indicam viagens e experi\u00eancias transformadoras. Mudan\u00e7as de ambiente ser\u00e3o ben\u00e9ficas para seu crescimento.',
      },
      {
        secao: 'Linha do Destino',
        texto: 'Bem marcada, sugerindo que voc\u00ea tem um prop\u00f3sito claro na vida. Mesmo com obst\u00e1culos, a dire\u00e7\u00e3o \u00e9 ascendente e favor\u00e1vel.',
      },
      {
        secao: 'Monte de J\u00fapiter',
        texto: 'Proeminente, indicando lideran\u00e7a natural e ambi\u00e7\u00e3o saud\u00e1vel. Voc\u00ea tem o poder de influenciar positivamente as pessoas ao redor.',
      },
      {
        secao: 'Conselho',
        texto: 'Confie na sua intui\u00e7\u00e3o. Ela \u00e9 mais certeira do que voc\u00ea imagina. Abra-se para novas experi\u00eancias sem medo.',
      },
    ],
    energia: 'positiva',
    cor: '#D35400',
  },
];

// Simular an\u00e1lise de IA (futuramente ser\u00e1 integrado com API real)
export function analisarImagem(tipo: TipoAnalise): AnaliseIA {
  const pool = tipo === 'cafe' ? ANALISES_CAFE : ANALISES_QUIROMANCIA;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
