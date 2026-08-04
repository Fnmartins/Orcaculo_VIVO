// Dados de Numerologia do Oráculo Vivo

export interface NumeroSignificado {
  numero: number;
  titulo: string;
  essencia: string;
  descricao: string;
  qualidades: string[];
  desafios: string[];
  cor: string;
  planeta: string;
  elemento: string;
}

export interface ResultadoNumerologia {
  caminhoVida: NumeroSignificado;
  expressao: NumeroSignificado;
  almico: NumeroSignificado;
  personalidade: NumeroSignificado;
  anosPessoais: NumeroSignificado;
  resumo: string;
}

export const NUMEROS: NumeroSignificado[] = [
  {
    numero: 1,
    titulo: 'O Líder',
    essencia: 'Independência e Originalidade',
    descricao: 'Você é um pioneiro nato, com forte impulso para criar e liderar. Sua energia é de início, inovação e autoconfiança. Você veio para abrir caminhos e inspirar outros com sua determinação.',
    qualidades: ['Liderança', 'Criatividade', 'Determinação', 'Independência'],
    desafios: ['Impaciência', 'Individualismo', 'Autoritarismo'],
    cor: '#E74C3C', planeta: 'Sol', elemento: 'Fogo',
  },
  {
    numero: 2,
    titulo: 'O Diplomata',
    essencia: 'Cooperação e Sensibilidade',
    descricao: 'Você tem o dom da diplomacia e da parceria. Sua energia é de união, equilíbrio e receptividade. Você veio para harmonizar relações e trazer paz onde há conflito.',
    qualidades: ['Diplomacia', 'Sensibilidade', 'Cooperação', 'Intuição'],
    desafios: ['Indecisão', 'Dependência', 'Hipersensibilidade'],
    cor: '#F39C12', planeta: 'Lua', elemento: 'Água',
  },
  {
    numero: 3,
    titulo: 'O Comunicador',
    essencia: 'Expressão e Criatividade',
    descricao: 'Você nasceu para se expressar e criar. Sua energia é de alegria, comunicação e inspiração artística. Você veio para trazer beleza e entusiasmo ao mundo.',
    qualidades: ['Comunicação', 'Otimismo', 'Criatividade', 'Sociabilidade'],
    desafios: ['Dispersão', 'Superficialidade', 'Exagero'],
    cor: '#F1C40F', planeta: 'Júpiter', elemento: 'Fogo',
  },
  {
    numero: 4,
    titulo: 'O Construtor',
    essencia: 'Estabilidade e Organização',
    descricao: 'Você é o alicerce, o construtor de bases sólidas. Sua energia é de ordem, trabalho e dedicação. Você veio para materializar ideias e criar estruturas duradouras.',
    qualidades: ['Disciplina', 'Organização', 'Lealdade', 'Praticidade'],
    desafios: ['Rigidez', 'Teimosia', 'Excesso de controle'],
    cor: '#27AE60', planeta: 'Urano', elemento: 'Terra',
  },
  {
    numero: 5,
    titulo: 'O Aventureiro',
    essencia: 'Liberdade e Mudança',
    descricao: 'Você é movido pela liberdade e pela experiência. Sua energia é de aventura, versatilidade e transformação. Você veio para explorar a vida em toda sua diversidade.',
    qualidades: ['Versatilidade', 'Aventura', 'Adaptabilidade', 'Dinamismo'],
    desafios: ['Instabilidade', 'Impulsividade', 'Inquietude'],
    cor: '#00BCD4', planeta: 'Mercúrio', elemento: 'Ar',
  },
  {
    numero: 6,
    titulo: 'O Cuidador',
    essencia: 'Amor e Responsabilidade',
    descricao: 'Você é o guardião do amor e da família. Sua energia é de cuidado, harmonia e beleza. Você veio para nutrir, proteger e criar ambientes de paz e acolhimento.',
    qualidades: ['Amor', 'Responsabilidade', 'Harmonia', 'Generosidade'],
    desafios: ['Perfeccionismo', 'Sacrifício excessivo', 'Controle emocional'],
    cor: '#E91E90', planeta: 'Vênus', elemento: 'Água',
  },
  {
    numero: 7,
    titulo: 'O Místico',
    essencia: 'Sabedoria e Espiritualidade',
    descricao: 'Você é o buscador da verdade interior. Sua energia é de análise, introspecção e conexão espiritual. Você veio para desvendar os mistérios da vida e compartilhar sabedoria.',
    qualidades: ['Sabedoria', 'Introspecção', 'Espiritualidade', 'Análise'],
    desafios: ['Isolamento', 'Desconfiança', 'Frieza emocional'],
    cor: '#9B59B6', planeta: 'Netuno', elemento: 'Água',
  },
  {
    numero: 8,
    titulo: 'O Realizador',
    essencia: 'Poder e Abundância',
    descricao: 'Você nasceu para realizar e prosperar. Sua energia é de poder, ambição e capacidade de materializar sonhos. Você veio para administrar recursos e gerar abundância.',
    qualidades: ['Ambição', 'Poder', 'Visão estratégica', 'Resiliência'],
    desafios: ['Materialismo', 'Autoritarismo', 'Workaholic'],
    cor: '#34495E', planeta: 'Saturno', elemento: 'Terra',
  },
  {
    numero: 9,
    titulo: 'O Humanitário',
    essencia: 'Compaixão e Universalidade',
    descricao: 'Você é a alma compassiva, o servo do coletivo. Sua energia é de amor universal, generosidade e idealismo. Você veio para inspirar, curar e servir à humanidade.',
    qualidades: ['Compaixão', 'Idealismo', 'Generosidade', 'Sabedoria'],
    desafios: ['Utopismo', 'Autossacrifício', 'Dificuldade em soltar'],
    cor: '#8E44AD', planeta: 'Marte', elemento: 'Fogo',
  },
  {
    numero: 11,
    titulo: 'O Iluminado',
    essencia: 'Inspiração e Visão Espiritual',
    descricao: 'Número mestre! Você carrega uma vibração elevada de inspiração e intuição. Sua missão é iluminar caminhos e trazer mensagens do plano superior para o mundo material.',
    qualidades: ['Intuição elevada', 'Inspiração', 'Carisma espiritual', 'Sensibilidade'],
    desafios: ['Ansiedade', 'Hipersensibilidade', 'Pressão interna'],
    cor: '#D4AF37', planeta: 'Plutão', elemento: 'Ar',
  },
  {
    numero: 22,
    titulo: 'O Mestre Construtor',
    essencia: 'Visão e Realização Global',
    descricao: 'Número mestre supremo! Você tem o poder de transformar sonhos em realidade em escala grandiosa. Sua energia combina visão espiritual com capacidade prática extraordinária.',
    qualidades: ['Visão grandiosa', 'Poder de realização', 'Liderança mundial', 'Praticidade elevada'],
    desafios: ['Pressão extrema', 'Perfeccionismo', 'Dificuldade em delegar'],
    cor: '#C49B30', planeta: 'Sol/Urano', elemento: 'Terra',
  },
];

function obterSignificado(n: number): NumeroSignificado {
  return NUMEROS.find(num => num.numero === n) ?? NUMEROS[n > 9 ? 0 : n - 1] ?? NUMEROS[0];
}

// Reduz número a um dígito (preservando mestres 11, 22)
function reduzir(n: number): number {
  if (n === 11 || n === 22) return n;
  while (n > 9) {
    n = String(n).split('').reduce((s, d) => s + parseInt(d, 10), 0);
    if (n === 11 || n === 22) return n;
  }
  return n;
}

// Tabela pitagórica: letras → números
const TABELA: Record<string, number> = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
  j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
  s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
};

const VOGAIS = new Set(['a', 'e', 'i', 'o', 'u']);

function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

// Caminho de Vida: soma de dia + mês + ano
export function calcularCaminhoVida(dia: number, mes: number, ano: number): number {
  const somaD = reduzir(dia);
  const somaM = reduzir(mes);
  const somaA = reduzir(ano);
  return reduzir(somaD + somaM + somaA);
}

// Expressão: soma de todas as letras do nome completo
export function calcularExpressao(nome: string): number {
  const letras = normalizarNome(nome);
  const soma = letras.split('').reduce((s, c) => s + (TABELA[c] ?? 0), 0);
  return reduzir(soma);
}

// Número da Alma (Almico): soma das vogais
export function calcularAlmico(nome: string): number {
  const letras = normalizarNome(nome);
  const soma = letras.split('').filter(c => VOGAIS.has(c)).reduce((s, c) => s + (TABELA[c] ?? 0), 0);
  return reduzir(soma);
}

// Personalidade: soma das consoantes
export function calcularPersonalidade(nome: string): number {
  const letras = normalizarNome(nome);
  const soma = letras.split('').filter(c => !VOGAIS.has(c) && TABELA[c]).reduce((s, c) => s + (TABELA[c] ?? 0), 0);
  return reduzir(soma);
}

// Ano Pessoal
export function calcularAnoPessoal(dia: number, mes: number): number {
  const anoAtual = new Date().getFullYear();
  const soma = reduzir(dia) + reduzir(mes) + reduzir(anoAtual);
  return reduzir(soma);
}

export function gerarNumerologiaCompleta(nome: string, dia: number, mes: number, ano: number): ResultadoNumerologia {
  const cv = calcularCaminhoVida(dia, mes, ano);
  const exp = calcularExpressao(nome);
  const alm = calcularAlmico(nome);
  const pers = calcularPersonalidade(nome);
  const ap = calcularAnoPessoal(dia, mes);

  const caminhoVida = obterSignificado(cv);
  const expressao = obterSignificado(exp);
  const almico = obterSignificado(alm);
  const personalidade = obterSignificado(pers);
  const anosPessoais = obterSignificado(ap);

  const resumo = `Seu Caminho de Vida ${cv} (${caminhoVida.titulo}) revela sua missão principal: ${caminhoVida.essencia.toLowerCase()}. ` +
    `Com a Expressão ${exp} (${expressao.titulo}), você manifesta seus talentos através de ${expressao.qualidades[0].toLowerCase()} e ${expressao.qualidades[1].toLowerCase()}. ` +
    `Seu Número da Alma ${alm} (${almico.titulo}) mostra que interiormente busca ${almico.essencia.toLowerCase()}, ` +
    `enquanto sua Personalidade ${pers} (${personalidade.titulo}) é percebida pelos outros como ${personalidade.qualidades[0].toLowerCase()} e ${personalidade.qualidades[2].toLowerCase()}. ` +
    `Em ${new Date().getFullYear()}, seu Ano Pessoal ${ap} traz energia de ${anosPessoais.essencia.toLowerCase()}.`;

  return { caminhoVida, expressao, almico, personalidade, anosPessoais, resumo };
}
