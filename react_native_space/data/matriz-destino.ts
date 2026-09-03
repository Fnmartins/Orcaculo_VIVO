// A Matriz do Destino — Arcanus
// Sistema baseado em numerologia + 22 Arcanos Maiores do Tarô + chakras
// Usa apenas a data de nascimento

export interface Arcano {
  numero: number;
  nome: string;
  titulo: string;
  palavraChave: string;
  positivo: string;
  desafio: string;
  descricao: string;
  cor: string;
}

// Os 22 Arcanos Maiores
export const ARCANOS: Arcano[] = [
  {
    numero: 1, nome: 'O Mago', titulo: 'O Iniciador',
    palavraChave: 'Manifestação',
    positivo: 'Poder pessoal, iniciativa, comunicação, capacidade de manifestar desejos em realidade.',
    desafio: 'Manipulação, dispersão de energia, uso indevido do poder, falta de foco.',
    descricao: 'A energia do Mago traz o dom de transformar ideias em realidade. Você tem recursos internos para criar sua própria vida e influenciar o mundo ao redor.',
    cor: '#E74C3C',
  },
  {
    numero: 2, nome: 'A Sacerdotisa', titulo: 'A Intuitiva',
    palavraChave: 'Sabedoria Interior',
    positivo: 'Intuição profunda, sabedoria, mistério, conexão com o inconsciente e o sagrado feminino.',
    desafio: 'Isolamento, segredos que adoecem, medo de se expor, intuição bloqueada.',
    descricao: 'A Sacerdotisa revela o poder da intuição e do conhecimento oculto. Você acessa verdades que estão além da lógica.',
    cor: '#9B59B6',
  },
  {
    numero: 3, nome: 'A Imperatriz', titulo: 'A Criadora',
    palavraChave: 'Abundância',
    positivo: 'Criatividade, fertilidade, abundância, prazer, beleza e cuidado maternal.',
    desafio: 'Excesso, dependência afetiva, superproteção, dificuldade de gerar frutos.',
    descricao: 'A Imperatriz é a energia da criação e da abundância. Você tem o dom de nutrir, criar beleza e gerar prosperidade.',
    cor: '#2ECC71',
  },
  {
    numero: 4, nome: 'O Imperador', titulo: 'O Estruturador',
    palavraChave: 'Estrutura',
    positivo: 'Liderança, estabilidade, ordem, autoridade, capacidade de construir bases sólidas.',
    desafio: 'Rigidez, autoritarismo, controle excessivo, dificuldade de flexibilizar.',
    descricao: 'O Imperador traz a energia da estrutura e da liderança. Você é capaz de organizar, proteger e construir fundações duradouras.',
    cor: '#E67E22',
  },
  {
    numero: 5, nome: 'O Papa', titulo: 'O Mentor',
    palavraChave: 'Sabedoria',
    positivo: 'Ensino, espiritualidade, tradição, orientação, ponte entre o material e o divino.',
    desafio: 'Dogmatismo, apego a regras, moralismo, dificuldade de pensar por si mesmo.',
    descricao: 'O Papa representa o mestre interior. Você tem o dom de ensinar, aconselhar e conectar pessoas ao sagrado.',
    cor: '#3498DB',
  },
  {
    numero: 6, nome: 'Os Enamorados', titulo: 'O Escolhedor',
    palavraChave: 'União',
    positivo: 'Amor, escolhas conscientes, harmonia, relacionamentos, integração de opostos.',
    desafio: 'Indecisão, dependência afetiva, medo do compromisso, escolhas por medo.',
    descricao: 'Os Enamorados trazem o tema das escolhas do coração e das uniões. Você aprende a amar e a decidir com consciência.',
    cor: '#E91E63',
  },
  {
    numero: 7, nome: 'O Carro', titulo: 'O Vencedor',
    palavraChave: 'Vitória',
    positivo: 'Determinação, autocontrole, conquista, avanço, domínio sobre forças opostas.',
    desafio: 'Descontrole, agressividade, pressa, dificuldade de manter direção.',
    descricao: 'O Carro é a energia da vitória através do foco. Você tem força para vencer desafios e seguir em frente com determinação.',
    cor: '#1ABC9C',
  },
  {
    numero: 8, nome: 'A Justiça', titulo: 'A Equilibradora',
    palavraChave: 'Equilíbrio',
    positivo: 'Justiça, equilíbrio, verdade, responsabilidade, karma e causa-efeito.',
    desafio: 'Rigidez, julgamento, frieza, dificuldade de perdoar, desequilíbrio.',
    descricao: 'A Justiça revela a lei do equilíbrio e da responsabilidade. Você colhe o que planta e busca a verdade em tudo.',
    cor: '#34495E',
  },
  {
    numero: 9, nome: 'O Eremita', titulo: 'O Sábio',
    palavraChave: 'Introspecção',
    positivo: 'Sabedoria interior, busca espiritual, autoconhecimento, prudência, luz que guia.',
    desafio: 'Isolamento excessivo, solidão, melancolia, fuga do mundo.',
    descricao: 'O Eremita traz o dom da introspecção e da sabedoria conquistada. Você ilumina o caminho de outros com sua luz interior.',
    cor: '#7F8C8D',
  },
  {
    numero: 10, nome: 'A Roda da Fortuna', titulo: 'O Ciclo',
    palavraChave: 'Destino',
    positivo: 'Ciclos, sorte, mudanças, oportunidades, movimento da vida a seu favor.',
    desafio: 'Resistência a mudanças, apego, sensação de estar à mercê do destino.',
    descricao: 'A Roda da Fortuna representa os ciclos e as viradas do destino. Você aprende a fluir com as mudanças e aproveitar oportunidades.',
    cor: '#F39C12',
  },
  {
    numero: 11, nome: 'A Força', titulo: 'A Corajosa',
    palavraChave: 'Coragem',
    positivo: 'Força interior, coragem suave, domínio das paixões, compaixão e paciência.',
    desafio: 'Impulsividade, raiva reprimida, força bruta, falta de autocontrole.',
    descricao: 'A Força é a energia da coragem gentil. Você domina seus instintos com amor e transforma o selvagem em aliado.',
    cor: '#D35400',
  },
  {
    numero: 12, nome: 'O Enforcado', titulo: 'O Rendido',
    palavraChave: 'Entrega',
    positivo: 'Nova perspectiva, entrega, sacrifício consciente, sabedoria através da pausa.',
    desafio: 'Vitimização, estagnação, sacrifício inútil, medo de agir.',
    descricao: 'O Enforcado ensina o poder da entrega e da mudança de perspectiva. Você encontra sabedoria ao ver o mundo de outro ângulo.',
    cor: '#16A085',
  },
  {
    numero: 13, nome: 'A Morte', titulo: 'O Transformador',
    palavraChave: 'Transformação',
    positivo: 'Transformação profunda, renascimento, fim de ciclos, libertação do que não serve.',
    desafio: 'Medo de mudanças, apego ao passado, resistência ao fim natural das coisas.',
    descricao: 'A Morte é a energia da grande transformação. Você tem o poder de renascer, deixando ir o velho para dar espaço ao novo.',
    cor: '#2C3E50',
  },
  {
    numero: 14, nome: 'A Temperança', titulo: 'A Alquimista',
    palavraChave: 'Harmonia',
    positivo: 'Equilíbrio, moderação, cura, paciência, capacidade de harmonizar opostos.',
    desafio: 'Impaciência, excessos, dificuldade de encontrar o meio-termo.',
    descricao: 'A Temperança traz o dom da alquimia interior. Você harmoniza energias e encontra o equilíbrio perfeito em tudo.',
    cor: '#3498DB',
  },
  {
    numero: 15, nome: 'O Diabo', titulo: 'O Libertador',
    palavraChave: 'Sombra',
    positivo: 'Vitalidade, prazer, magnetismo, poder material, confronto com a sombra.',
    desafio: 'Vícios, apegos, materialismo, escravidão a desejos, manipulação.',
    descricao: 'O Diabo revela suas sombras e apegos. Ao encará-los com consciência, você se liberta e transforma desejo em poder criativo.',
    cor: '#8E44AD',
  },
  {
    numero: 16, nome: 'A Torre', titulo: 'O Despertar',
    palavraChave: 'Ruptura',
    positivo: 'Libertação súbita, despertar, quebra de estruturas falsas, revelação da verdade.',
    desafio: 'Crises, colapsos, resistência à mudança inevitável, caos.',
    descricao: 'A Torre representa rupturas que libertam. Estruturas falsas caem para que uma verdade mais sólida possa se erguer.',
    cor: '#C0392B',
  },
  {
    numero: 17, nome: 'A Estrela', titulo: 'A Esperança',
    palavraChave: 'Esperança',
    positivo: 'Esperança, inspiração, cura, fé, conexão com o propósito e o cosmos.',
    desafio: 'Ilusão, expectativas irreais, perda de fé, desânimo.',
    descricao: 'A Estrela traz esperança e inspiração divina. Você é um farol de fé e cura, conectado ao seu propósito maior.',
    cor: '#1ABC9C',
  },
  {
    numero: 18, nome: 'A Lua', titulo: 'A Vidente',
    palavraChave: 'Intuição',
    positivo: 'Intuição, imaginação, sonhos, sensibilidade, conexão com o mundo oculto.',
    desafio: 'Ilusões, medos, confusão, ansiedade, engano.',
    descricao: 'A Lua governa o mundo dos sonhos e da intuição. Você navega entre luz e sombra, acessando verdades profundas do inconsciente.',
    cor: '#5DADE2',
  },
  {
    numero: 19, nome: 'O Sol', titulo: 'O Radiante',
    palavraChave: 'Alegria',
    positivo: 'Sucesso, vitalidade, alegria, clareza, realização e brilho pessoal.',
    desafio: 'Ego inflado, arrogância, ofuscamento, dificuldade de brilhar autenticamente.',
    descricao: 'O Sol é a energia da alegria e do sucesso. Você irradia luz, vitalidade e traz clareza a tudo que toca.',
    cor: '#F1C40F',
  },
  {
    numero: 20, nome: 'O Julgamento', titulo: 'O Renascido',
    palavraChave: 'Renascimento',
    positivo: 'Despertar espiritual, renovação, chamado interior, perdão e libertação.',
    desafio: 'Autocrítica severa, culpa, dificuldade de perdoar, chamado ignorado.',
    descricao: 'O Julgamento representa o despertar da consciência. Você ouve um chamado para renascer e cumprir seu propósito maior.',
    cor: '#E67E22',
  },
  {
    numero: 21, nome: 'O Mundo', titulo: 'O Realizado',
    palavraChave: 'Realização',
    positivo: 'Realização plena, integração, sucesso, conclusão de ciclos, plenitude.',
    desafio: 'Medo de concluir, apego a metas, dificuldade de celebrar conquistas.',
    descricao: 'O Mundo é a energia da realização completa. Você integra todas as partes de si e alcança a plenitude e o sucesso merecidos.',
    cor: '#27AE60',
  },
  {
    numero: 22, nome: 'O Louco', titulo: 'O Livre',
    palavraChave: 'Potencial Infinito',
    positivo: 'Liberdade, potencial puro, novos começos, fé, espontaneidade e aventura.',
    desafio: 'Irresponsabilidade, impulsividade, ingenuidade, falta de direção.',
    descricao: 'O Louco é o potencial infinito e a liberdade absoluta. Você carrega a coragem de recomeçar e confiar no fluxo da vida.',
    cor: '#9B59B6',
  },
];

// Reduz um número para o intervalo 1-22 (0 vira 22 — O Louco)
export function reduzir(n: number): number {
  let num = n;
  while (num > 22) {
    num = String(num)
      .split('')
      .reduce((acc, d) => acc + parseInt(d, 10), 0);
  }
  return num === 0 ? 22 : num;
}

// Soma os dígitos de um número (usado para o ano)
function somarDigitos(n: number): number {
  return String(n)
    .split('')
    .reduce((acc, d) => acc + parseInt(d, 10), 0);
}

export interface Chakra {
  nome: string;
  nomeSanscrito: string;
  cor: string;
  significado: string;
  corpo: number; // arcano físico/energia
  energia: number; // arcano energético
  emocoes: number; // arcano emocional
}

export interface PropositoNivel {
  nome: string;
  descricao: string;
  arcano: number;
}

export interface ResultadoMatriz {
  // Pontos cardinais (quadrado pessoal)
  oeste: number; // dia — qualidades pessoais / retrato
  norte: number; // mês — talento
  leste: number; // ano — herança
  sul: number; // missão / karma
  centro: number; // essência / zona de conforto
  // Cantos diagonais (quadrado ancestral)
  noroeste: number;
  nordeste: number;
  sudoeste: number;
  sudeste: number;
  // Linhas especiais
  linhaDinheiro: number;
  linhaAmor: number;
  linhaPaterna: number;
  linhaMaterna: number;
  caudaCarmica: number;
  // Chakras
  chakras: Chakra[];
  // Propósitos
  propositos: PropositoNivel[];
  // Data original
  dia: number;
  mes: number;
  ano: number;
}

export function calcularMatriz(dia: number, mes: number, ano: number): ResultadoMatriz {
  // === QUADRADO PESSOAL (pontos cardinais) ===
  const oeste = reduzir(dia); // Dia — qualidades pessoais / Retrato
  const norte = reduzir(mes); // Mês — talento
  const leste = reduzir(somarDigitos(ano)); // Ano (dígitos somados) — herança
  const sul = reduzir(oeste + norte + leste); // Missão / Karma
  const centro = reduzir(oeste + norte + leste + sul); // Essência / Zona de Conforto

  // === QUADRADO ANCESTRAL (cantos diagonais) ===
  const noroeste = reduzir(oeste + norte); // Linha materna superior
  const nordeste = reduzir(norte + leste); // Linha paterna superior
  const sudeste = reduzir(leste + sul); // Linha paterna inferior
  const sudoeste = reduzir(sul + oeste); // Linha materna inferior

  // === LINHAS ESPECIAIS ===
  const linhaPaterna = reduzir(nordeste + sudeste); // diagonal paterna
  const linhaMaterna = reduzir(noroeste + sudoeste); // diagonal materna
  const linhaDinheiro = reduzir(leste + centro); // canal do dinheiro (leste→centro)
  const linhaAmor = reduzir(sul + centro); // canal do amor (sul→centro)
  const caudaCarmica = reduzir(noroeste + nordeste + sudeste + sudoeste); // karma acumulado

  // === CHAKRAS (7) ===
  // Cada chakra recebe 3 energias (Corpo/Físico, Energia, Emoções)
  const chakrasBase: Omit<Chakra, 'corpo' | 'energia' | 'emocoes'>[] = [
    { nome: 'Coroa', nomeSanscrito: 'Sahasrara', cor: '#9B59B6', significado: 'Conexão espiritual, propósito, iluminação e ligação com o divino.' },
    { nome: 'Terceiro Olho', nomeSanscrito: 'Ajna', cor: '#5B4B8A', significado: 'Intuição, visão interior, sabedoria e percepção além do físico.' },
    { nome: 'Garganta', nomeSanscrito: 'Vishuddha', cor: '#3498DB', significado: 'Comunicação, expressão da verdade e criatividade.' },
    { nome: 'Coração', nomeSanscrito: 'Anahata', cor: '#2ECC71', significado: 'Amor, compaixão, relacionamentos e equilíbrio emocional.' },
    { nome: 'Plexo Solar', nomeSanscrito: 'Manipura', cor: '#F1C40F', significado: 'Poder pessoal, autoestima, vontade e ação no mundo.' },
    { nome: 'Sacro', nomeSanscrito: 'Svadhisthana', cor: '#E67E22', significado: 'Prazer, criatividade, sexualidade e emoções.' },
    { nome: 'Raiz', nomeSanscrito: 'Muladhara', cor: '#E74C3C', significado: 'Sobrevivência, segurança, estabilidade e ligação com a matéria.' },
  ];

  // Deriva energias de cada chakra a partir dos pontos principais
  const pontos = [oeste, norte, leste, sul, centro, noroeste, nordeste];
  const chakras: Chakra[] = chakrasBase.map((c, i) => {
    const base = pontos[i % pontos.length];
    const corpo = reduzir(base + i + 1);
    const energia = reduzir(base + norte);
    const emocoes = reduzir(base + sul);
    return { ...c, corpo, energia, emocoes };
  });

  // === PROPÓSITOS (4 níveis) ===
  const propPessoal = reduzir(oeste + norte);
  const propSocial = reduzir(leste + sul);
  const propEspiritual = reduzir(propPessoal + propSocial);
  const propPlanetario = reduzir(centro + propEspiritual);

  const propositos: PropositoNivel[] = [
    { nome: 'Propósito Pessoal', descricao: 'Sua missão individual até os 40 anos — o que veio desenvolver em si mesmo.', arcano: propPessoal },
    { nome: 'Propósito Social', descricao: 'Sua contribuição à sociedade dos 40 aos 60 anos — como impacta o coletivo.', arcano: propSocial },
    { nome: 'Propósito Espiritual', descricao: 'A união dos propósitos pessoal e social — sua missão de alma completa.', arcano: propEspiritual },
    { nome: 'Propósito Planetário', descricao: 'Sua conexão com o todo — a maior expressão do seu papel no mundo.', arcano: propPlanetario },
  ];

  return {
    oeste, norte, leste, sul, centro,
    noroeste, nordeste, sudoeste, sudeste,
    linhaDinheiro, linhaAmor, linhaPaterna, linhaMaterna, caudaCarmica,
    chakras, propositos,
    dia, mes, ano,
  };
}

export function obterArcano(numero: number): Arcano {
  return ARCANOS.find((a) => a.numero === numero) ?? ARCANOS[0];
}
