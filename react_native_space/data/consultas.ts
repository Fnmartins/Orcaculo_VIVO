// Dados de consultas e oraculistas do Arcanus

export interface Oraculista {
  id: string;
  nome: string;
  titulo: string;
  avatar: string; // emoji placeholder
  especialidades: string[];
  avaliacao: number;
  totalConsultas: number;
  precoConsulta: number;
  bio: string;
  disponivel: boolean;
  cor: string;
}

export interface HorarioDisponivel {
  hora: string;
  disponivel: boolean;
}

export interface ConsultaAgendada {
  id: string;
  oraculista: Oraculista;
  data: string;
  hora: string;
  tipo: string;
  status: 'agendada' | 'concluida' | 'cancelada';
  formato: 'video' | 'chat' | 'audio';
}

export const ORACULISTAS: Oraculista[] = [
  {
    id: 'mae_celina',
    nome: 'Mãe Celina',
    titulo: 'Ialorixá · Búzios & Oráculo de Ifá',
    avatar: '🧙‍♀️',
    especialidades: ['Búzios', 'Ifá', 'Ebós', 'Orixás'],
    avaliacao: 4.9,
    totalConsultas: 2340,
    precoConsulta: 150,
    bio: 'Ialorixá há 25 anos, iniciada na tradição Ketu. Especialista em jogo de búzios e consultas com Orixás.',
    disponivel: true,
    cor: '#7C9A82',
  },
  {
    id: 'mestre_rafael',
    nome: 'Mestre Rafael',
    titulo: 'Tarot Clínico · Astrologia',
    avatar: '🧙‍♂️',
    especialidades: ['Tarot', 'Astrologia', 'Numerologia'],
    avaliacao: 4.8,
    totalConsultas: 1850,
    precoConsulta: 120,
    bio: 'Tarólogo clínico com 15 anos de experiência. Une Tarot, Astrologia e abordagem terapêutica.',
    disponivel: true,
    cor: '#9B59B6',
  },
  {
    id: 'dona_flora',
    nome: 'Dona Flora',
    titulo: 'Leitura de Borra · Quiromancia',
    avatar: '🔮',
    especialidades: ['Borra de Café', 'Quiromancia', 'Cartomancia'],
    avaliacao: 4.7,
    totalConsultas: 980,
    precoConsulta: 90,
    bio: 'Tradição familiar de 3 gerações em leitura de borra e quiromancia. Abordagem acolhedora e direta.',
    disponivel: true,
    cor: '#8B4513',
  },
  {
    id: 'lucas_estrela',
    nome: 'Lucas Estrela',
    titulo: 'Astrologia Védica · Mapa Astral',
    avatar: '⭐',
    especialidades: ['Astrologia Védica', 'Mapa Astral', 'Trânsitos'],
    avaliacao: 4.9,
    totalConsultas: 1420,
    precoConsulta: 180,
    bio: 'Astrólogo védico formado na Índia. Especialista em mapas natais, trânsitos e previsões.',
    disponivel: false,
    cor: '#E67E22',
  },
  {
    id: 'nina_luz',
    nome: 'Nina Luz',
    titulo: 'Numerologia · Terapia Holística',
    avatar: '🌟',
    especialidades: ['Numerologia', 'Cristais', 'Reiki'],
    avaliacao: 4.6,
    totalConsultas: 760,
    precoConsulta: 100,
    bio: 'Numeróloga e terapeuta holística. Combina números, cristais e energia para guiar sua jornada.',
    disponivel: true,
    cor: '#3498DB',
  },
];

export function gerarHorarios(data: Date): HorarioDisponivel[] {
  const horarios: HorarioDisponivel[] = [];
  const hoje = new Date();
  const ehHoje = data.toDateString() === hoje.toDateString();
  const horaAtual = hoje.getHours();

  for (let h = 8; h <= 20; h++) {
    const disponivel = ehHoje ? h > horaAtual + 1 : true;
    // Simular alguns horários ocupados
    const ocupado = (h === 10 || h === 14 || h === 18) && data.getDay() !== 0;
    horarios.push({
      hora: `${h.toString().padStart(2, '0')}:00`,
      disponivel: disponivel && !ocupado,
    });
    if (h < 20) {
      const dispMeia = ehHoje ? h > horaAtual + 1 : true;
      const ocupadoMeia = (h === 11 || h === 15) && data.getDay() !== 0;
      horarios.push({
        hora: `${h.toString().padStart(2, '0')}:30`,
        disponivel: dispMeia && !ocupadoMeia,
      });
    }
  }
  return horarios;
}

// Consultas de demonstração
export const CONSULTAS_DEMO: ConsultaAgendada[] = [
  {
    id: 'c1',
    oraculista: ORACULISTAS[0],
    data: '28/06/2026',
    hora: '14:00',
    tipo: 'Búzios',
    status: 'agendada',
    formato: 'video',
  },
  {
    id: 'c2',
    oraculista: ORACULISTAS[1],
    data: '15/06/2026',
    hora: '10:30',
    tipo: 'Tarot',
    status: 'concluida',
    formato: 'video',
  },
];
