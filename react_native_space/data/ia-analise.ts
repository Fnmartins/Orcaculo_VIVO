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
    resumo: 'As formas da borra lembram caminhos e podem inspirar uma reflex\u00e3o sobre movimento, escolhas e transforma\u00e7\u00e3o.',
    detalhes: [
      {
        secao: 'Formas Identificadas',
        texto: 'A IA identificou formas que se assemelham a p\u00e1ssaros e caminhos ramificados. P\u00e1ssaros na borra representam not\u00edcias chegando e liberdade. Os caminhos indicam escolhas importantes \u00e0 sua frente.',
      },
      {
        secao: 'Interpreta\u00e7\u00e3o Espiritual',
        texto: 'Esses s\u00edmbolos convidam a observar poss\u00edveis transi\u00e7\u00f5es nas \u00e1reas profissional e afetiva. Considere quais novos come\u00e7os fazem sentido para voc\u00ea.',
      },
      {
        secao: 'Conselho',
        texto: 'Mantenha-se aberto a novas possibilidades e observe oportunidades concretas ao seu redor antes de escolher como agir.',
      },
    ],
    energia: 'positiva',
    cor: '#8B4513',
  },
  {
    tipo: 'cafe',
    titulo: 'Prote\u00e7\u00e3o e For\u00e7a Interior',
    resumo: 'Os padr\u00f5es circulares podem simbolizar prote\u00e7\u00e3o, apoio e a for\u00e7a das suas pr\u00f3prias ra\u00edzes.',
    detalhes: [
      {
        secao: 'Formas Identificadas',
        texto: 'A IA detectou formas circulares e um padr\u00e3o que lembra um escudo ou \u00e1rvore. C\u00edrculos representam prote\u00e7\u00e3o divina e completude. A \u00e1rvore simboliza ra\u00edzes fortes e crescimento.',
      },
      {
        secao: 'Interpreta\u00e7\u00e3o Espiritual',
        texto: 'A imagem pode ser lida como um convite para reconhecer suas ra\u00edzes, redes de apoio e recursos internos ao lidar com quest\u00f5es emocionais antigas.',
      },
      {
        secao: 'Conselho',
        texto: 'Reflita sobre quais pend\u00eancias merecem aten\u00e7\u00e3o e avalie, com calma, projetos que pedem coragem.',
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
        texto: 'A leitura sugere uma pausa para observar pensamentos e sentimentos. Sil\u00eancio, descanso ou medita\u00e7\u00e3o podem apoiar essa reflex\u00e3o, se fizerem sentido para voc\u00ea.',
      },
      {
        secao: 'Conselho',
        texto: 'Antes de decis\u00f5es importantes, reserve tempo para organizar informa\u00e7\u00f5es e considerar as consequ\u00eancias. Cuide de si e busque apoio qualificado quando necess\u00e1rio.',
      },
    ],
    energia: 'neutra',
    cor: '#5D4037',
  },
];

const ANALISES_QUIROMANCIA: AnaliseIA[] = [
  {
    tipo: 'quiromancia',
    titulo: 'M\u00e3os, Escolhas e Caminhos',
    resumo: 'As linhas da m\u00e3o oferecem s\u00edmbolos para refletir sobre criatividade, determina\u00e7\u00e3o e possibilidades de realiza\u00e7\u00e3o.',
    detalhes: [
      {
        secao: 'Linha da Vida',
        texto: 'Longa e bem definida, tradicionalmente associada a vitalidade e persist\u00eancia. Essa leitura \u00e9 simb\u00f3lica e n\u00e3o permite avaliar sa\u00fade, longevidade ou prever mudan\u00e7as.',
      },
      {
        secao: 'Linha do Cora\u00e7\u00e3o',
        texto: 'Profunda e curvada, tradicionalmente associada a intensidade emocional. Use o s\u00edmbolo para refletir sobre como voc\u00ea vive e comunica seus afetos.',
      },
      {
        secao: 'Linha da Cabe\u00e7a',
        texto: 'Clara e estendida, simbolicamente ligada a pensamento anal\u00edtico e criatividade. Considere em quais situa\u00e7\u00f5es essas qualidades aparecem para voc\u00ea.',
      },
      {
        secao: 'Conselho',
        texto: 'Observe seus talentos com curiosidade e avalie, conforme sua realidade, como desenvolver estudos ou projetos criativos.',
      },
    ],
    energia: 'positiva',
    cor: '#E74C3C',
  },
  {
    tipo: 'quiromancia',
    titulo: 'Sabedoria nas M\u00e3os',
    resumo: 'As linhas podem inspirar uma reflex\u00e3o sobre maturidade, experi\u00eancias vividas e a forma como voc\u00ea escuta sua intui\u00e7\u00e3o.',
    detalhes: [
      {
        secao: 'Linha da Vida',
        texto: 'As ramifica\u00e7\u00f5es s\u00e3o tradicionalmente associadas a movimento e mudan\u00e7a. Elas n\u00e3o preveem viagens, mas podem ajudar a pensar sobre sua abertura a novas experi\u00eancias.',
      },
      {
        secao: 'Linha do Destino',
        texto: 'Bem marcada, simbolicamente associada a prop\u00f3sito e continuidade. Reflita sobre as dire\u00e7\u00f5es que voc\u00ea deseja construir diante dos obst\u00e1culos.',
      },
      {
        secao: 'Monte de J\u00fapiter',
        texto: 'Proeminente, tradicionalmente associado a lideran\u00e7a e ambi\u00e7\u00e3o. Considere como exercer influ\u00eancia com responsabilidade e escuta.',
      },
      {
        secao: 'Conselho',
        texto: 'Escute sua intui\u00e7\u00e3o sem abandonar fatos, limites e consequ\u00eancias. Abra-se a novas experi\u00eancias no seu pr\u00f3prio ritmo.',
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
