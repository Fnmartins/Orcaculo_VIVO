// Dados de Numerologia do Arcanus

import {
  calcularAlma as calcularAlmaDetalhado,
  calcularAnoPessoal as calcularAnoPessoalDetalhado,
  calcularCaminhoVida as calcularCaminhoVidaDetalhado,
  calcularExpressao as calcularExpressaoDetalhado,
  calcularPersonalidade as calcularPersonalidadeDetalhado,
} from './mapa-numerologico';

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
    essencia: 'Gestão e Realização',
    descricao: 'A tradição associa este número a gestão, ambição e responsabilidade material. Use a leitura como reflexão, não como previsão de prosperidade.',
    qualidades: ['Ambição', 'Poder', 'Visão estratégica', 'Resiliência'],
    desafios: ['Materialismo', 'Autoritarismo', 'Workaholic'],
    cor: '#34495E', planeta: 'Saturno', elemento: 'Terra',
  },
  {
    numero: 9,
    titulo: 'O Humanitário',
    essencia: 'Compaixão e Universalidade',
    descricao: 'A tradição associa este número a compaixão, generosidade e visão coletiva. Reflita sobre contribuição e limites sem atribuir capacidade de cura.',
    qualidades: ['Compaixão', 'Idealismo', 'Generosidade', 'Sabedoria'],
    desafios: ['Utopismo', 'Autossacrifício', 'Dificuldade em soltar'],
    cor: '#8E44AD', planeta: 'Marte', elemento: 'Fogo',
  },
  {
    numero: 11,
    titulo: 'O Inspirador',
    essencia: 'Inspiração e Sensibilidade',
    descricao: 'Algumas escolas preservam o 11 e o associam a inspiração e sensibilidade. Isso é uma convenção simbólica, não evidência de poderes especiais.',
    qualidades: ['Percepção', 'Inspiração', 'Criatividade', 'Sensibilidade'],
    desafios: ['Ansiedade', 'Hipersensibilidade', 'Pressão interna'],
    cor: '#D4AF37', planeta: 'Plutão', elemento: 'Ar',
  },
  {
    numero: 22,
    titulo: 'O Mestre Construtor',
    essencia: 'Visão e Construção',
    descricao: 'Algumas escolas preservam o 22 e o associam à combinação entre visão e execução. Use a leitura para refletir sobre planejamento, colaboração e limites.',
    qualidades: ['Visão', 'Realização', 'Coordenação', 'Praticidade'],
    desafios: ['Pressão extrema', 'Perfeccionismo', 'Dificuldade em delegar'],
    cor: '#C49B30', planeta: 'Sol/Urano', elemento: 'Terra',
  },
  {
    numero: 33,
    titulo: 'O Cuidador Mestre',
    essencia: 'Cuidado e Ensino',
    descricao: 'Algumas escolas preservam o 33 e o associam a cuidado e ensino. Isso não indica capacidade médica ou terapêutica.',
    qualidades: ['Cuidado', 'Ensino', 'Escuta', 'Responsabilidade'],
    desafios: ['Autossacrifício', 'Idealização', 'Sobrecarga'],
    cor: '#B58C45', planeta: 'Vênus/Netuno', elemento: 'Água',
  },
];

function obterSignificado(n: number): NumeroSignificado {
  return NUMEROS.find(num => num.numero === n) ?? NUMEROS[n > 9 ? 0 : n - 1] ?? NUMEROS[0];
}

// Caminho de Vida: soma de dia + mês + ano
export function calcularCaminhoVida(dia: number, mes: number, ano: number): number {
  return calcularCaminhoVidaDetalhado(dia, mes, ano).numeroFinal;
}

// Expressão: soma de todas as letras do nome completo
export function calcularExpressao(nome: string): number {
  return calcularExpressaoDetalhado(nome).numeroFinal;
}

// Número da Alma (Almico): soma das vogais
export function calcularAlmico(nome: string): number {
  return calcularAlmaDetalhado(nome).numeroFinal;
}

// Personalidade: soma das consoantes
export function calcularPersonalidade(nome: string): number {
  return calcularPersonalidadeDetalhado(nome).numeroFinal;
}

// Ano Pessoal
export function calcularAnoPessoal(dia: number, mes: number): number {
  return calcularAnoPessoalDetalhado(dia, mes).numeroFinal;
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

  const resumo = `Na tradição adotada, o Caminho de Vida ${cv} (${caminhoVida.titulo}) é associado a ${caminhoVida.essencia.toLowerCase()}. ` +
    `A Expressão ${exp} (${expressao.titulo}) convida a observar ${expressao.qualidades[0].toLowerCase()} e ${expressao.qualidades[1].toLowerCase()}. ` +
    `O Número da Alma ${alm} (${almico.titulo}) simboliza ${almico.essencia.toLowerCase()}, ` +
    `enquanto a Personalidade ${pers} (${personalidade.titulo}) é tradicionalmente relacionada a ${personalidade.qualidades[0].toLowerCase()} e ${personalidade.qualidades[2].toLowerCase()}. ` +
    `Em ${new Date().getFullYear()}, o Ano Pessoal ${ap} oferece o tema simbólico de ${anosPessoais.essencia.toLowerCase()}.`;

  return { caminhoVida, expressao, almico, personalidade, anosPessoais, resumo };
}
