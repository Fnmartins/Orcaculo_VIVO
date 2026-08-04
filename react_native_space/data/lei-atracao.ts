// Lei da Atração — Manifestação
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CategoriaDesejo = 'amor' | 'prosperidade' | 'saude' | 'carreira' | 'espiritualidade' | 'familia' | 'outro';

export interface Desejo {
  id: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaDesejo;
  prazo?: string;
  criadoEm: string;
  manifestado: boolean;
  manifestadoEm?: string;
  rituaisFeitos: number;
}

export interface CategoriaInfo {
  id: CategoriaDesejo;
  titulo: string;
  icone: string;
  cor: string;
  afirmacoes: string[];
}

export const CATEGORIAS: CategoriaInfo[] = [
  {
    id: 'amor',
    titulo: 'Amor',
    icone: 'heart',
    cor: '#E91E90',
    afirmacoes: [
      'Eu sou digno(a) de amor verdadeiro e profundo.',
      'O amor flui livremente em minha vida.',
      'Eu atraio relacionamentos saudáveis e amorosos.',
      'Meu coração está aberto para dar e receber amor.',
      'Eu me amo e por isso mereço ser amado(a).',
    ],
  },
  {
    id: 'prosperidade',
    titulo: 'Prosperidade',
    icone: 'diamond',
    cor: '#D4AF37',
    afirmacoes: [
      'A abundância flui em minha vida em todas as áreas.',
      'Eu sou um ímã para prosperidade e riqueza.',
      'O dinheiro vem até mim com facilidade e alegria.',
      'Eu mereço toda a prosperidade que desejo.',
      'Oportunidades financeiras aparecem constantemente para mim.',
    ],
  },
  {
    id: 'saude',
    titulo: 'Saúde',
    icone: 'leaf',
    cor: '#7C9A82',
    afirmacoes: [
      'Meu corpo é forte, saudável e vibrante.',
      'Cada célula do meu corpo irradia saúde e vitalidade.',
      'Eu me curo em todos os níveis: físico, mental e espiritual.',
      'A saúde perfeita é meu estado natural.',
      'Eu escuto e honro as necessidades do meu corpo.',
    ],
  },
  {
    id: 'carreira',
    titulo: 'Carreira',
    icone: 'briefcase',
    cor: '#3498DB',
    afirmacoes: [
      'Minha carreira floresce e me traz realização.',
      'Eu atraio oportunidades profissionais alinhadas com meu propósito.',
      'Meu talento é reconhecido e valorizado.',
      'Eu sou próspero(a) no que amo fazer.',
      'O sucesso profissional é natural e fácil para mim.',
    ],
  },
  {
    id: 'espiritualidade',
    titulo: 'Espiritualidade',
    icone: 'infinite',
    cor: '#9B59B6',
    afirmacoes: [
      'Eu estou conectado(a) com o Universo e minha essência divina.',
      'Minha intuição me guia com clareza e sabedoria.',
      'Eu confio no fluxo perfeito da vida.',
      'Sou paz, sou amor, sou luz.',
      'Cada experiência me eleva espiritualmente.',
    ],
  },
  {
    id: 'familia',
    titulo: 'Família',
    icone: 'home',
    cor: '#E67E22',
    afirmacoes: [
      'Minha família vive em harmonia e amor.',
      'Eu cultivo laços saudáveis e amorosos.',
      'Meu lar é um refúgio de paz e felicidade.',
      'A comunicação em minha família é clara e amorosa.',
      'Eu contribuo positivamente para minha família todos os dias.',
    ],
  },
  {
    id: 'outro',
    titulo: 'Outro',
    icone: 'sparkles',
    cor: '#87CEEB',
    afirmacoes: [
      'Eu confio no Universo para manifestar meu desejo.',
      'Tudo que preciso vem até mim no tempo perfeito.',
      'Eu sou o(a) criador(a) da minha realidade.',
      'Meus sonhos já são realidade no plano espiritual.',
      'Eu vibro na frequência do que desejo manifestar.',
    ],
  },
];

export function obterCategoria(id: CategoriaDesejo): CategoriaInfo {
  return CATEGORIAS.find(c => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1];
}

const STORAGE_KEY = '@oraculo_vivo:desejos';

export async function listarDesejos(): Promise<Desejo[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    return JSON.parse(json) as Desejo[];
  } catch {
    return [];
  }
}

export async function salvarDesejos(lista: Desejo[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  } catch {}
}

export async function adicionarDesejo(dados: Omit<Desejo, 'id' | 'criadoEm' | 'manifestado' | 'rituaisFeitos'>): Promise<Desejo> {
  const novo: Desejo = {
    ...dados,
    id: `d_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    criadoEm: new Date().toISOString(),
    manifestado: false,
    rituaisFeitos: 0,
  };
  const atuais = await listarDesejos();
  await salvarDesejos([novo, ...atuais]);
  return novo;
}

export async function atualizarDesejo(id: string, patch: Partial<Desejo>): Promise<void> {
  const atuais = await listarDesejos();
  const novos = atuais.map(d => (d.id === id ? { ...d, ...patch } : d));
  await salvarDesejos(novos);
}

export async function deletarDesejo(id: string): Promise<void> {
  const atuais = await listarDesejos();
  await salvarDesejos(atuais.filter(d => d.id !== id));
}

export async function obterDesejo(id: string): Promise<Desejo | null> {
  const atuais = await listarDesejos();
  return atuais.find(d => d.id === id) || null;
}
