// Dados astrológicos do Arcanus

export interface Signo {
  id: string;
  nome: string;
  simbolo: string;
  elemento: 'Fogo' | 'Terra' | 'Ar' | 'Água';
  qualidade: 'Cardinal' | 'Fixo' | 'Mutável';
  regente: string;
  dataInicio: string;
  dataFim: string;
  cor: string;
  descricao: string;
  palavrasChave: string[];
}

export interface Planeta {
  id: string;
  nome: string;
  simbolo: string;
  significado: string;
  cor: string;
}

export interface CasaAstrologica {
  numero: number;
  nome: string;
  area: string;
  descricao: string;
}

export interface MapaAstralResultado {
  sol: { signo: Signo; grau: number; casa: number; interpretacao: string };
  lua: { signo: Signo; grau: number; casa: number; interpretacao: string };
  ascendente: { signo: Signo; grau: number; interpretacao: string };
  planetas: Array<{ planeta: Planeta; signo: Signo; casa: number; grau: number; interpretacao: string }>;
  casas: Array<{ casa: CasaAstrologica; signo: Signo }>;
  resumo: string;
}

export const SIGNOS: Signo[] = [
  {
    id: 'aries', nome: 'Áries', simbolo: '♈', elemento: 'Fogo', qualidade: 'Cardinal',
    regente: 'Marte', dataInicio: '21/03', dataFim: '19/04', cor: '#E74C3C',
    descricao: 'Pioneiro e corajoso, Áries lidera com paixão e determinação.',
    palavrasChave: ['Coragem', 'Iniciativa', 'Energia', 'Liderança'],
  },
  {
    id: 'touro', nome: 'Touro', simbolo: '♉', elemento: 'Terra', qualidade: 'Fixo',
    regente: 'Vênus', dataInicio: '20/04', dataFim: '20/05', cor: '#27AE60',
    descricao: 'Estável e sensual, Touro busca segurança e prazer nos sentidos.',
    palavrasChave: ['Estabilidade', 'Sensualidade', 'Persistência', 'Lealdade'],
  },
  {
    id: 'gemeos', nome: 'Gêmeos', simbolo: '♊', elemento: 'Ar', qualidade: 'Mutável',
    regente: 'Mercúrio', dataInicio: '21/05', dataFim: '20/06', cor: '#F1C40F',
    descricao: 'Versátil e comunicativo, Gêmeos conecta ideias e pessoas.',
    palavrasChave: ['Comunicação', 'Versatilidade', 'Curiosidade', 'Adaptação'],
  },
  {
    id: 'cancer', nome: 'Câncer', simbolo: '♋', elemento: 'Água', qualidade: 'Cardinal',
    regente: 'Lua', dataInicio: '21/06', dataFim: '22/07', cor: '#BDC3C7',
    descricao: 'Protetor e intuitivo, Câncer nutre com profundidade emocional.',
    palavrasChave: ['Intuição', 'Proteção', 'Emoção', 'Família'],
  },
  {
    id: 'leao', nome: 'Leão', simbolo: '♌', elemento: 'Fogo', qualidade: 'Fixo',
    regente: 'Sol', dataInicio: '23/07', dataFim: '22/08', cor: '#F39C12',
    descricao: 'Magnético e generoso, Leão brilha com criatividade e paixão.',
    palavrasChave: ['Criatividade', 'Generosidade', 'Carisma', 'Autoexpressão'],
  },
  {
    id: 'virgem', nome: 'Virgem', simbolo: '♍', elemento: 'Terra', qualidade: 'Mutável',
    regente: 'Mercúrio', dataInicio: '23/08', dataFim: '22/09', cor: '#8E6B47',
    descricao: 'Analítico e dedicado, Virgem busca perfeição e serviço aos outros.',
    palavrasChave: ['Análise', 'Dedicação', 'Cuidado', 'Organização'],
  },
  {
    id: 'libra', nome: 'Libra', simbolo: '♎', elemento: 'Ar', qualidade: 'Cardinal',
    regente: 'Vênus', dataInicio: '23/09', dataFim: '22/10', cor: '#E91E90',
    descricao: 'Harmonioso e diplomático, Libra busca equilíbrio e beleza.',
    palavrasChave: ['Harmonia', 'Equilíbrio', 'Diplomacia', 'Beleza'],
  },
  {
    id: 'escorpiao', nome: 'Escorpião', simbolo: '♏', elemento: 'Água', qualidade: 'Fixo',
    regente: 'Plutão', dataInicio: '23/10', dataFim: '21/11', cor: '#8E44AD',
    descricao: 'Intenso e transformador, Escorpião mergulha nas profundezas da alma.',
    palavrasChave: ['Transformação', 'Intensidade', 'Mistério', 'Poder'],
  },
  {
    id: 'sagitario', nome: 'Sagitário', simbolo: '♐', elemento: 'Fogo', qualidade: 'Mutável',
    regente: 'Júpiter', dataInicio: '22/11', dataFim: '21/12', cor: '#9B59B6',
    descricao: 'Aventureiro e filosófico, Sagitário busca a verdade e a expansão.',
    palavrasChave: ['Aventura', 'Sabedoria', 'Otimismo', 'Expansão'],
  },
  {
    id: 'capricornio', nome: 'Capricórnio', simbolo: '♑', elemento: 'Terra', qualidade: 'Cardinal',
    regente: 'Saturno', dataInicio: '22/12', dataFim: '19/01', cor: '#34495E',
    descricao: 'Disciplinado e ambicioso, Capricórnio constrói com paciência e determinação.',
    palavrasChave: ['Disciplina', 'Ambição', 'Responsabilidade', 'Persistência'],
  },
  {
    id: 'aquario', nome: 'Aquário', simbolo: '♒', elemento: 'Ar', qualidade: 'Fixo',
    regente: 'Urano', dataInicio: '20/01', dataFim: '18/02', cor: '#00BCD4',
    descricao: 'Visionário e humanitário, Aquário inova e conecta para o coletivo.',
    palavrasChave: ['Inovação', 'Liberdade', 'Originalidade', 'Humanitarismo'],
  },
  {
    id: 'peixes', nome: 'Peixes', simbolo: '♓', elemento: 'Água', qualidade: 'Mutável',
    regente: 'Netuno', dataInicio: '19/02', dataFim: '20/03', cor: '#5DADE2',
    descricao: 'Sensível e espiritual, Peixes navega entre o real e o transcendente.',
    palavrasChave: ['Espiritualidade', 'Compaixão', 'Imaginação', 'Sensibilidade'],
  },
];

export const PLANETAS: Planeta[] = [
  { id: 'mercurio', nome: 'Mercúrio', simbolo: '☿', significado: 'Comunicação, mente, aprendizado', cor: '#F1C40F' },
  { id: 'venus', nome: 'Vênus', simbolo: '♀', significado: 'Amor, beleza, valores', cor: '#E91E90' },
  { id: 'marte', nome: 'Marte', simbolo: '♂', significado: 'Ação, energia, desejo', cor: '#E74C3C' },
  { id: 'jupiter', nome: 'Júpiter', simbolo: '♃', significado: 'Expansão, sorte, sabedoria', cor: '#9B59B6' },
  { id: 'saturno', nome: 'Saturno', simbolo: '♄', significado: 'Estrutura, disciplina, lições', cor: '#34495E' },
  { id: 'urano', nome: 'Urano', simbolo: '♅', significado: 'Inovação, revolução, liberdade', cor: '#00BCD4' },
  { id: 'netuno', nome: 'Netuno', simbolo: '♆', significado: 'Imaginação, espiritualidade, ilusão', cor: '#5DADE2' },
  { id: 'plutao', nome: 'Plutão', simbolo: '♇', significado: 'Transformação, poder, renascimento', cor: '#8E44AD' },
];

export const CASAS: CasaAstrologica[] = [
  { numero: 1, nome: 'Ascendente', area: 'Identidade', descricao: 'Como você se apresenta ao mundo' },
  { numero: 2, nome: 'Recursos', area: 'Finanças', descricao: 'Valores materiais e autoestima' },
  { numero: 3, nome: 'Comunicação', area: 'Mente', descricao: 'Pensamento, aprendizado e irmãos' },
  { numero: 4, nome: 'Lar', area: 'Família', descricao: 'Raízes, lar e base emocional' },
  { numero: 5, nome: 'Criatividade', area: 'Expressão', descricao: 'Romance, filhos e diversão' },
  { numero: 6, nome: 'Serviço', area: 'Saúde', descricao: 'Rotina, saúde e trabalho diário' },
  { numero: 7, nome: 'Parcerias', area: 'Relacionamentos', descricao: 'Casamento e sociedades' },
  { numero: 8, nome: 'Transformação', area: 'Renascimento', descricao: 'Heranças, sexualidade e crises' },
  { numero: 9, nome: 'Filosofia', area: 'Expansão', descricao: 'Viagens, estudos e crenças' },
  { numero: 10, nome: 'Meio do Céu', area: 'Carreira', descricao: 'Vocação, status e reputação' },
  { numero: 11, nome: 'Amizades', area: 'Coletivo', descricao: 'Amigos, grupos e sonhos' },
  { numero: 12, nome: 'Transcendência', area: 'Espírito', descricao: 'Inconsciente, karma e espiritualidade' },
];

const COR_ELEMENTO: Record<string, string> = {
  'Fogo': '#E74C3C',
  'Terra': '#27AE60',
  'Ar': '#F1C40F',
  'Água': '#5DADE2',
};

export function corElemento(elemento: string): string {
  return COR_ELEMENTO[elemento] ?? '#D4AF37';
}

// Determina signo solar pela data de nascimento
export function signoSolar(dia: number, mes: number): Signo {
  const datas: Array<[number, number, string]> = [
    [19, 1, 'capricornio'], [18, 2, 'aquario'], [20, 3, 'peixes'],
    [19, 4, 'aries'], [20, 5, 'touro'], [20, 6, 'gemeos'],
    [22, 7, 'cancer'], [22, 8, 'leao'], [22, 9, 'virgem'],
    [22, 10, 'libra'], [21, 11, 'escorpiao'], [21, 12, 'sagitario'],
    [31, 12, 'capricornio'],
  ];
  for (const [diaFim, mesFim, signoId] of datas) {
    if (mes < mesFim || (mes === mesFim && dia <= diaFim)) {
      return SIGNOS.find(s => s.id === signoId) ?? SIGNOS[0];
    }
  }
  return SIGNOS[9]; // Capricórnio fallback
}

// Simula a geração de um mapa astral completo
export function gerarMapaAstral(dia: number, mes: number, ano: number, hora: number, minuto: number): MapaAstralResultado {
  const sol = signoSolar(dia, mes);
  
  // Simulação: lua baseada no horário
  const luaIndex = (hora + dia + mes) % 12;
  const lua = SIGNOS[luaIndex];
  
  // Simulação: ascendente baseado na hora
  const ascIndex = Math.floor(hora / 2) % 12;
  const asc = SIGNOS[ascIndex];
  
  // Simulação: posições planetárias
  const seed = dia + mes * 31 + ano + hora * 60 + minuto;
  const planetas = PLANETAS.map((planeta, i) => {
    const signoIndex = (seed + i * 3 + dia) % 12;
    const casa = ((seed + i * 5) % 12) + 1;
    const grau = (seed * (i + 1)) % 30;
    const signo = SIGNOS[signoIndex];
    
    const interpretacoes = [
      `${planeta.nome} em ${signo.nome} traz ${signo.palavrasChave[0].toLowerCase()} para a área de ${planeta.significado.split(',')[0].toLowerCase()}.`,
      `Com ${planeta.nome} na Casa ${casa}, você expressa ${signo.palavrasChave[1].toLowerCase()} de forma ${signo.qualidade === 'Cardinal' ? 'ativa' : signo.qualidade === 'Fixo' ? 'constante' : 'adaptável'}.`,
      `A energia ${signo.elemento === 'Fogo' ? 'ardente' : signo.elemento === 'Terra' ? 'estável' : signo.elemento === 'Ar' ? 'mental' : 'emocional'} de ${signo.nome} influencia seu(sua) ${planeta.significado.split(',')[0].toLowerCase()}.`,
    ];
    
    return {
      planeta,
      signo,
      casa,
      grau,
      interpretacao: interpretacoes[i % 3],
    };
  });
  
  // Casas com signos
  const casas = CASAS.map((casa, i) => ({
    casa,
    signo: SIGNOS[(ascIndex + i) % 12],
  }));
  
  const solGrau = (dia + hora) % 30;
  const solCasa = ((seed + 7) % 12) + 1;
  const luaGrau = (minuto + mes) % 30;
  const luaCasa = ((seed + 3) % 12) + 1;
  const ascGrau = (hora * 2 + minuto) % 30;
  
  return {
    sol: {
      signo: sol,
      grau: solGrau,
      casa: solCasa,
      interpretacao: `Com o Sol em ${sol.nome}, sua essência é ${sol.palavrasChave[0].toLowerCase()} e ${sol.palavrasChave[1].toLowerCase()}. ${sol.descricao} Na Casa ${solCasa}, essa energia se manifesta na área de ${CASAS[solCasa - 1].area.toLowerCase()}.`,
    },
    lua: {
      signo: lua,
      grau: luaGrau,
      casa: luaCasa,
      interpretacao: `A Lua em ${lua.nome} revela suas emoções mais profundas: ${lua.palavrasChave[2].toLowerCase()} e ${lua.palavrasChave[3].toLowerCase()}. Na Casa ${luaCasa}, suas necessidades emocionais se conectam com ${CASAS[luaCasa - 1].descricao.toLowerCase()}.`,
    },
    ascendente: {
      signo: asc,
      grau: ascGrau,
      interpretacao: `${asc.nome} ascendente mostra que você se apresenta ao mundo com ${asc.palavrasChave[0].toLowerCase()} e ${asc.palavrasChave[2].toLowerCase()}. As pessoas te percebem como alguém ${asc.elemento === 'Fogo' ? 'energético e inspirador' : asc.elemento === 'Terra' ? 'estável e confiável' : asc.elemento === 'Ar' ? 'comunicativo e sociável' : 'sensível e intuitivo'}.`,
    },
    planetas,
    casas,
    resumo: `Seu mapa revela uma personalidade ${sol.palavrasChave[0].toLowerCase()} (Sol em ${sol.nome}) com mundo emocional ${lua.palavrasChave[0].toLowerCase()} (Lua em ${lua.nome}) e imagem social ${asc.palavrasChave[0].toLowerCase()} (Ascendente ${asc.nome}). O elemento ${sol.elemento} predomina, trazendo energia ${sol.elemento === 'Fogo' ? 'de ação e paixão' : sol.elemento === 'Terra' ? 'de estabilidade e praticidade' : sol.elemento === 'Ar' ? 'de comunicação e raciocínio' : 'de emoção e intuição'} para sua jornada.`,
  };
}
