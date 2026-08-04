// Mapa Numerológico Completo — Cálculo Pitagórico com passos preservados

export type NumeroNumerologico = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33;

export interface PassoCalculo {
  descricao: string;
  detalhe: string;
  resultado: string;
}

export interface CalculoDetalhado {
  numeroFinal: NumeroNumerologico;
  ehMestre: boolean;
  passos: PassoCalculo[];
}

export interface MapaNumerologicoCompleto {
  nome: string;
  dataNascimento: string; // dd/mm/aaaa
  caminhoVida: CalculoDetalhado;
  expressao: CalculoDetalhado;
  alma: CalculoDetalhado;
  personalidade: CalculoDetalhado;
  maturidade: CalculoDetalhado;
}

// Tabela Pitagórica
export const TABELA_PITAGORICA: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9,
};

const VOGAIS = new Set(['A', 'E', 'I', 'O', 'U']);

export function normalizarNome(nome: string): string {
  return nome
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z ]/g, '')
    .trim();
}

// Reduz preservando mestres 11, 22, 33
function reduzirComPassos(n: number, passos: string[]): number {
  if (n === 11 || n === 22 || n === 33) return n;
  while (n > 9) {
    const digitos = String(n).split('');
    const soma = digitos.reduce((s, d) => s + parseInt(d, 10), 0);
    passos.push(`${digitos.join(' + ')} = ${soma}`);
    n = soma;
    if (n === 11 || n === 22 || n === 33) return n;
  }
  return n;
}

// ═══════════════════════════════════════════════════════
// CAMINHO DE VIDA (Life Path) — Soma de dia + mês + ano
// ═══════════════════════════════════════════════════════
export function calcularCaminhoVida(dia: number, mes: number, ano: number): CalculoDetalhado {
  const passos: PassoCalculo[] = [];

  // Dia
  const passosDia: string[] = [];
  const somaDia = reduzirComPassos(dia, passosDia);
  passos.push({
    descricao: 'Redução do DIA',
    detalhe: passosDia.length ? passosDia.join(' → ') : `${dia} já é um dígito`,
    resultado: String(somaDia),
  });

  // Mês
  const passosMes: string[] = [];
  const somaMes = reduzirComPassos(mes, passosMes);
  passos.push({
    descricao: 'Redução do MÊS',
    detalhe: passosMes.length ? passosMes.join(' → ') : `${mes} já é um dígito`,
    resultado: String(somaMes),
  });

  // Ano
  const passosAno: string[] = [];
  const somaAno = reduzirComPassos(ano, passosAno);
  passos.push({
    descricao: 'Redução do ANO',
    detalhe: passosAno.length ? passosAno.join(' → ') : `${ano} já é um dígito`,
    resultado: String(somaAno),
  });

  // Soma final
  const somaTotal = somaDia + somaMes + somaAno;
  const passosFinal: string[] = [`${somaDia} + ${somaMes} + ${somaAno} = ${somaTotal}`];
  const numeroFinal = reduzirComPassos(somaTotal, passosFinal) as NumeroNumerologico;
  passos.push({
    descricao: 'Soma final e redução',
    detalhe: passosFinal.join(' → '),
    resultado: String(numeroFinal),
  });

  return {
    numeroFinal,
    ehMestre: numeroFinal === 11 || numeroFinal === 22 || numeroFinal === 33,
    passos,
  };
}

// ═══════════════════════════════════════════════════════
// EXPRESSÃO (Destiny) — Soma de TODAS as letras
// ═══════════════════════════════════════════════════════
export function calcularExpressao(nome: string): CalculoDetalhado {
  const passos: PassoCalculo[] = [];
  const nomeNormalizado = normalizarNome(nome);
  const palavras = nomeNormalizado.split(' ').filter(Boolean);

  const detalhePorPalavra: string[] = [];
  let somaTotal = 0;

  for (const palavra of palavras) {
    const letras = palavra.split('');
    const valores = letras.map(l => TABELA_PITAGORICA[l] ?? 0);
    const somaPalavra = valores.reduce((s, v) => s + v, 0);
    somaTotal += somaPalavra;
    detalhePorPalavra.push(
      `${palavra}: ${letras.map((l, i) => `${l}(${valores[i]})`).join(' + ')} = ${somaPalavra}`
    );
  }

  passos.push({
    descricao: 'Valores de cada letra',
    detalhe: detalhePorPalavra.join('\n'),
    resultado: `Soma total = ${somaTotal}`,
  });

  const passosReducao: string[] = [];
  const numeroFinal = reduzirComPassos(somaTotal, passosReducao) as NumeroNumerologico;
  passos.push({
    descricao: 'Redução',
    detalhe: passosReducao.length ? passosReducao.join(' → ') : `${somaTotal} já é um dígito`,
    resultado: String(numeroFinal),
  });

  return {
    numeroFinal,
    ehMestre: numeroFinal === 11 || numeroFinal === 22 || numeroFinal === 33,
    passos,
  };
}

// ═══════════════════════════════════════════════════════
// ALMA (Soul Urge) — Soma apenas VOGAIS
// ═══════════════════════════════════════════════════════
export function calcularAlma(nome: string): CalculoDetalhado {
  const passos: PassoCalculo[] = [];
  const nomeNormalizado = normalizarNome(nome);
  const letras = nomeNormalizado.replace(/ /g, '').split('');
  const vogais = letras.filter(l => VOGAIS.has(l));
  const valores = vogais.map(v => TABELA_PITAGORICA[v] ?? 0);
  const somaTotal = valores.reduce((s, v) => s + v, 0);

  passos.push({
    descricao: 'Vogais do nome',
    detalhe: vogais.length
      ? vogais.map((v, i) => `${v}(${valores[i]})`).join(' + ') + ` = ${somaTotal}`
      : 'Nenhuma vogal encontrada',
    resultado: String(somaTotal),
  });

  const passosReducao: string[] = [];
  const numeroFinal = reduzirComPassos(somaTotal, passosReducao) as NumeroNumerologico;
  passos.push({
    descricao: 'Redução',
    detalhe: passosReducao.length ? passosReducao.join(' → ') : `${somaTotal} já é um dígito`,
    resultado: String(numeroFinal),
  });

  return {
    numeroFinal,
    ehMestre: numeroFinal === 11 || numeroFinal === 22 || numeroFinal === 33,
    passos,
  };
}

// ═══════════════════════════════════════════════════════
// PERSONALIDADE — Soma apenas CONSOANTES
// ═══════════════════════════════════════════════════════
export function calcularPersonalidade(nome: string): CalculoDetalhado {
  const passos: PassoCalculo[] = [];
  const nomeNormalizado = normalizarNome(nome);
  const letras = nomeNormalizado.replace(/ /g, '').split('');
  const consoantes = letras.filter(l => !VOGAIS.has(l) && TABELA_PITAGORICA[l]);
  const valores = consoantes.map(c => TABELA_PITAGORICA[c] ?? 0);
  const somaTotal = valores.reduce((s, v) => s + v, 0);

  passos.push({
    descricao: 'Consoantes do nome',
    detalhe: consoantes.length
      ? consoantes.map((c, i) => `${c}(${valores[i]})`).join(' + ') + ` = ${somaTotal}`
      : 'Nenhuma consoante encontrada',
    resultado: String(somaTotal),
  });

  const passosReducao: string[] = [];
  const numeroFinal = reduzirComPassos(somaTotal, passosReducao) as NumeroNumerologico;
  passos.push({
    descricao: 'Redução',
    detalhe: passosReducao.length ? passosReducao.join(' → ') : `${somaTotal} já é um dígito`,
    resultado: String(numeroFinal),
  });

  return {
    numeroFinal,
    ehMestre: numeroFinal === 11 || numeroFinal === 22 || numeroFinal === 33,
    passos,
  };
}

// ═══════════════════════════════════════════════════════
// MATURIDADE — Caminho de Vida + Expressão
// ═══════════════════════════════════════════════════════
export function calcularMaturidade(caminhoVida: number, expressao: number): CalculoDetalhado {
  const passos: PassoCalculo[] = [];
  const soma = caminhoVida + expressao;

  passos.push({
    descricao: 'Caminho de Vida + Expressão',
    detalhe: `${caminhoVida} + ${expressao} = ${soma}`,
    resultado: String(soma),
  });

  const passosReducao: string[] = [];
  const numeroFinal = reduzirComPassos(soma, passosReducao) as NumeroNumerologico;
  passos.push({
    descricao: 'Redução',
    detalhe: passosReducao.length ? passosReducao.join(' → ') : `${soma} já é um dígito`,
    resultado: String(numeroFinal),
  });

  return {
    numeroFinal,
    ehMestre: numeroFinal === 11 || numeroFinal === 22 || numeroFinal === 33,
    passos,
  };
}

// ═══════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════
export function gerarMapaCompleto(
  nome: string,
  dia: number,
  mes: number,
  ano: number
): MapaNumerologicoCompleto {
  const caminhoVida = calcularCaminhoVida(dia, mes, ano);
  const expressao = calcularExpressao(nome);
  const alma = calcularAlma(nome);
  const personalidade = calcularPersonalidade(nome);
  const maturidade = calcularMaturidade(caminhoVida.numeroFinal, expressao.numeroFinal);

  const dataFmt = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;

  return {
    nome: nome.trim(),
    dataNascimento: dataFmt,
    caminhoVida,
    expressao,
    alma,
    personalidade,
    maturidade,
  };
}

// ═══════════════════════════════════════════════════════
// INTERPRETAÇÕES — cada número em cada posição
// ═══════════════════════════════════════════════════════

export interface Interpretacao {
  titulo: string;
  essencia: string;
  descricao: string;
  pontosFortes: string[];
  desafios: string[];
}

type MapaInterpretacoes = Record<NumeroNumerologico, Interpretacao>;

export const INTERPRETACOES_CAMINHO_VIDA: MapaInterpretacoes = {
  1: {
    titulo: 'O Pioneiro',
    essencia: 'Liderança e Independência',
    descricao: 'Sua missão é abrir caminhos, liderar com originalidade e desenvolver a autoconfiança. Você veio para ser referência, iniciar movimentos e transformar sonhos em ação. A vida vai testar sua coragem de trilhar sozinho quando necessário.',
    pontosFortes: ['Iniciativa', 'Coragem', 'Autoconfiança', 'Originalidade'],
    desafios: ['Impaciência', 'Ego', 'Solidão', 'Autoritarismo'],
  },
  2: {
    titulo: 'O Pacificador',
    essencia: 'Cooperação e Sensibilidade',
    descricao: 'Sua jornada é sobre parcerias, diplomacia e desenvolvimento da paciência. Você veio para ensinar harmonia e sentir profundamente. Aprender a se posicionar sem perder a gentileza é seu grande trabalho.',
    pontosFortes: ['Diplomacia', 'Empatia', 'Intuição', 'Colaboração'],
    desafios: ['Indecisão', 'Dependência emocional', 'Passividade'],
  },
  3: {
    titulo: 'O Comunicador',
    essencia: 'Expressão Criativa e Alegria',
    descricao: 'Sua missão é inspirar através da palavra, arte e criatividade. Você veio para trazer luz, humor e beleza ao mundo. O desafio é focar sua energia e não se dispersar em muitos interesses.',
    pontosFortes: ['Criatividade', 'Comunicação', 'Otimismo', 'Carisma'],
    desafios: ['Dispersão', 'Superficialidade', 'Drama'],
  },
  4: {
    titulo: 'O Construtor',
    essencia: 'Estrutura e Trabalho Sólido',
    descricao: 'Sua jornada é construir bases duradouras através da disciplina e do esforço. Você veio para materializar, organizar e criar segurança. Aprender a fluir sem perder a solidez é seu equilíbrio.',
    pontosFortes: ['Disciplina', 'Lealdade', 'Praticidade', 'Perseverança'],
    desafios: ['Rigidez', 'Teimosia', 'Excesso de trabalho'],
  },
  5: {
    titulo: 'O Aventureiro',
    essencia: 'Liberdade e Mudança',
    descricao: 'Sua missão é experimentar a vida em toda sua diversidade e ensinar sobre liberdade. Você veio para se transformar constantemente. O desafio é canalizar a inquietude em direção construtiva.',
    pontosFortes: ['Versatilidade', 'Adaptabilidade', 'Curiosidade', 'Magnetismo'],
    desafios: ['Instabilidade', 'Impulsividade', 'Excessos'],
  },
  6: {
    titulo: 'O Cuidador',
    essencia: 'Amor e Responsabilidade',
    descricao: 'Sua jornada envolve família, serviço e responsabilidade com os outros. Você veio para nutrir, harmonizar e criar beleza. Cuidar sem se anular é sua grande lição.',
    pontosFortes: ['Amor', 'Serviço', 'Harmonia', 'Compromisso'],
    desafios: ['Perfeccionismo', 'Autossacrifício', 'Controle'],
  },
  7: {
    titulo: 'O Buscador',
    essencia: 'Sabedoria e Introspecção',
    descricao: 'Sua missão é buscar a verdade interior e desenvolver conhecimento profundo. Você veio para questionar, pesquisar e conectar-se ao espiritual. Confiar sem isolar-se é seu grande trabalho.',
    pontosFortes: ['Sabedoria', 'Análise', 'Espiritualidade', 'Profundidade'],
    desafios: ['Isolamento', 'Ceticismo', 'Frieza'],
  },
  8: {
    titulo: 'O Realizador',
    essencia: 'Poder Material e Abundância',
    descricao: 'Sua jornada é sobre poder pessoal, sucesso e maestria material. Você veio para administrar recursos, liderar empresas e gerar prosperidade. Equilibrar dinheiro com valores é sua lição.',
    pontosFortes: ['Ambição', 'Estratégia', 'Autoridade', 'Resiliência'],
    desafios: ['Materialismo', 'Controle', 'Workaholismo'],
  },
  9: {
    titulo: 'O Humanitário',
    essencia: 'Compaixão Universal',
    descricao: 'Sua missão é servir à humanidade com amor incondicional. Você veio para curar, inspirar e completar ciclos. Aprender a soltar e a receber é seu grande desafio.',
    pontosFortes: ['Compaixão', 'Idealismo', 'Generosidade', 'Visão global'],
    desafios: ['Autossacrifício', 'Melancolia', 'Idealismo excessivo'],
  },
  11: {
    titulo: 'O Iluminador ✨',
    essencia: 'Intuição Mestra e Inspiração Espiritual',
    descricao: 'Número mestre. Sua missão é iluminar caminhos através da intuição elevada e canalização espiritual. Você veio para inspirar multidões. A pressão interna e a hipersensibilidade são partes do caminho.',
    pontosFortes: ['Intuição elevada', 'Carisma espiritual', 'Visão profética', 'Inspiração'],
    desafios: ['Ansiedade', 'Hipersensibilidade', 'Pressão psíquica'],
  },
  22: {
    titulo: 'O Mestre Construtor ✨',
    essencia: 'Realização Grandiosa',
    descricao: 'Número mestre supremo. Sua missão é materializar visões espirituais em obras de impacto global. Você combina praticidade com visão elevada. O peso da missão pode assustar — mas você tem o poder.',
    pontosFortes: ['Visão grandiosa', 'Poder de realização', 'Praticidade elevada', 'Liderança global'],
    desafios: ['Pressão extrema', 'Perfeccionismo', 'Autoexigência'],
  },
  33: {
    titulo: 'O Mestre Curador ✨',
    essencia: 'Amor Cristificado',
    descricao: 'Número mestre raro. Sua missão é servir com amor incondicional em nível global. Você veio como professor da alma. Requer equilíbrio profundo entre serviço e autocuidado.',
    pontosFortes: ['Amor incondicional', 'Cura', 'Ensino espiritual', 'Sabedoria'],
    desafios: ['Autossacrifício extremo', 'Peso da missão', 'Solidão espiritual'],
  },
};

export const INTERPRETACOES_EXPRESSAO: MapaInterpretacoes = {
  1: { titulo: 'Talentos de Líder', essencia: 'Manifesta pioneirismo', descricao: 'Seus talentos naturais estão na iniciativa, liderança e capacidade de criar do zero. Você expressa originalidade e determinação em tudo que faz.', pontosFortes: ['Liderança', 'Iniciativa', 'Foco'], desafios: ['Impaciência com outros'] },
  2: { titulo: 'Talentos Diplomáticos', essencia: 'Manifesta harmonia', descricao: 'Você expressa seus talentos através da colaboração, escuta e mediação. Tem dom natural para trabalhos em equipe e relacionamentos.', pontosFortes: ['Diplomacia', 'Empatia', 'Mediação'], desafios: ['Evitar conflitos necessários'] },
  3: { titulo: 'Talentos Criativos', essencia: 'Manifesta expressão', descricao: 'Seus dons são artísticos, comunicativos e sociais. Você brilha ao escrever, falar em público, criar e entreter.', pontosFortes: ['Criatividade', 'Comunicação', 'Charme'], desafios: ['Falta de foco'] },
  4: { titulo: 'Talentos de Construtor', essencia: 'Manifesta estrutura', descricao: 'Você expressa capacidade de organizar, planejar e executar com precisão. É o profissional de confiança em qualquer equipe.', pontosFortes: ['Organização', 'Confiabilidade', 'Método'], desafios: ['Aversão à mudança'] },
  5: { titulo: 'Talentos Versáteis', essencia: 'Manifesta versatilidade', descricao: 'Seus talentos são múltiplos e adaptáveis. Você aprende rápido, comunica-se bem e ama diversidade.', pontosFortes: ['Versatilidade', 'Adaptabilidade', 'Persuasão'], desafios: ['Dispersão'] },
  6: { titulo: 'Talentos de Cuidado', essencia: 'Manifesta amor', descricao: 'Você expressa dons em relacionamentos, cuidado, educação e criação de ambientes harmoniosos.', pontosFortes: ['Cuidado', 'Ensino', 'Estética'], desafios: ['Assumir problemas alheios'] },
  7: { titulo: 'Talentos Analíticos', essencia: 'Manifesta profundidade', descricao: 'Você expressa capacidade de análise, pesquisa e insight. É bom em áreas que exigem estudo e reflexão.', pontosFortes: ['Análise', 'Pesquisa', 'Insight'], desafios: ['Comunicação emocional'] },
  8: { titulo: 'Talentos Executivos', essencia: 'Manifesta poder', descricao: 'Seus dons estão em administrar, liderar negócios e materializar visões. Você tem faro para poder e prosperidade.', pontosFortes: ['Administração', 'Estratégia', 'Liderança'], desafios: ['Excesso de trabalho'] },
  9: { titulo: 'Talentos Humanitários', essencia: 'Manifesta compaixão', descricao: 'Você expressa dons em causas maiores, artes com propósito e trabalho de impacto social.', pontosFortes: ['Compaixão', 'Visão universal', 'Inspiração'], desafios: ['Desapego difícil'] },
  11: { titulo: 'Talentos Inspiracionais ✨', essencia: 'Canaliza inspiração', descricao: 'Seus dons são canalizadores. Você expressa mensagens que inspiram e elevam pessoas. Grande potencial em áreas espirituais e artísticas.', pontosFortes: ['Inspiração', 'Intuição', 'Carisma'], desafios: ['Pressão interna'] },
  22: { titulo: 'Talentos Grandiosos ✨', essencia: 'Manifesta em grande escala', descricao: 'Você tem talentos raros para criar obras de grande impacto — organizações, movimentos, legados duradouros.', pontosFortes: ['Visão prática', 'Realização', 'Impacto'], desafios: ['Peso da responsabilidade'] },
  33: { titulo: 'Talentos de Cura ✨', essencia: 'Manifesta amor divino', descricao: 'Dons raros de cura, ensino espiritual e serviço amoroso. Você inspira transformação nas pessoas.', pontosFortes: ['Cura', 'Ensino', 'Amor'], desafios: ['Autossacrifício'] },
};

export const INTERPRETACOES_ALMA: MapaInterpretacoes = {
  1: { titulo: 'Alma Pioneira', essencia: 'Desejo de independência', descricao: 'No fundo, sua alma anseia por liberdade, protagonismo e conquistas próprias. Quer ser reconhecida por sua originalidade.', pontosFortes: ['Autoconfiança interna', 'Ambição pura'], desafios: ['Solidão desejada'] },
  2: { titulo: 'Alma Sensível', essencia: 'Desejo de união', descricao: 'Interiormente você busca paz, parcerias profundas e conexão emocional. Sua alma valoriza harmonia acima de tudo.', pontosFortes: ['Empatia genuína', 'Amor profundo'], desafios: ['Medo de solidão'] },
  3: { titulo: 'Alma Alegre', essencia: 'Desejo de expressão', descricao: 'Sua alma quer se expressar, criar, brilhar e alegrar os outros. Ela precisa de espaços de criatividade e celebração.', pontosFortes: ['Alegria interior', 'Criatividade'], desafios: ['Necessidade de aprovação'] },
  4: { titulo: 'Alma Estruturada', essencia: 'Desejo de segurança', descricao: 'Interiormente você busca ordem, estabilidade e propósito claro. Sua alma valoriza construção duradoura.', pontosFortes: ['Lealdade', 'Compromisso'], desafios: ['Medo de mudança'] },
  5: { titulo: 'Alma Livre', essencia: 'Desejo de liberdade', descricao: 'Sua alma anseia por aventura, novas experiências e liberdade total. Não suporta gaiolas de nenhum tipo.', pontosFortes: ['Coragem de mudar', 'Curiosidade'], desafios: ['Inquietude constante'] },
  6: { titulo: 'Alma Amorosa', essencia: 'Desejo de servir', descricao: 'Interiormente você quer amar, cuidar e criar lares. Sua alma se realiza no serviço amoroso.', pontosFortes: ['Amor incondicional', 'Devoção'], desafios: ['Ceder demais'] },
  7: { titulo: 'Alma Mística', essencia: 'Desejo de verdade', descricao: 'Sua alma busca sabedoria profunda, mistérios espirituais e verdade interior. Precisa de silêncio e reflexão.', pontosFortes: ['Sabedoria interior', 'Intuição'], desafios: ['Isolamento'] },
  8: { titulo: 'Alma Ambiciosa', essencia: 'Desejo de poder', descricao: 'Interiormente você quer poder, sucesso material e reconhecimento. Sua alma tem sede de conquistas.', pontosFortes: ['Determinação', 'Visão de futuro'], desafios: ['Obsessão por resultados'] },
  9: { titulo: 'Alma Universal', essencia: 'Desejo de servir o todo', descricao: 'Sua alma quer transformar o mundo, servir causas maiores e amar sem limites.', pontosFortes: ['Compaixão profunda', 'Idealismo'], desafios: ['Peso do mundo'] },
  11: { titulo: 'Alma Iluminada ✨', essencia: 'Desejo de despertar', descricao: 'Sua alma vibra em frequência elevada. Quer despertar a si e aos outros para verdades espirituais.', pontosFortes: ['Sensibilidade psíquica', 'Missão elevada'], desafios: ['Sobrecarga energética'] },
  22: { titulo: 'Alma Construtora ✨', essencia: 'Desejo de criar legado', descricao: 'Interiormente você quer construir algo que mude o mundo. Sua alma sente o chamado de missão grandiosa.', pontosFortes: ['Visão épica', 'Poder criativo'], desafios: ['Autoexigência'] },
  33: { titulo: 'Alma Cristificada ✨', essencia: 'Desejo de amar tudo', descricao: 'Alma raríssima. Anseia por amor incondicional e serviço divino sem apego.', pontosFortes: ['Amor sem limites', 'Sabedoria'], desafios: ['Peso espiritual'] },
};

export const INTERPRETACOES_PERSONALIDADE: MapaInterpretacoes = {
  1: { titulo: 'Persona Confiante', essencia: 'Aparência de líder', descricao: 'As pessoas te veem como forte, independente e confiante. Você transmite autoridade natural.', pontosFortes: ['Presença', 'Autoconfiança visível'], desafios: ['Parecer arrogante'] },
  2: { titulo: 'Persona Gentil', essencia: 'Aparência acolhedora', descricao: 'Você é visto como diplomático, paciente e amigável. Pessoas se sentem confortáveis em sua presença.', pontosFortes: ['Simpatia', 'Escuta'], desafios: ['Parecer inseguro'] },
  3: { titulo: 'Persona Carismática', essencia: 'Aparência brilhante', descricao: 'Os outros te veem como divertido, criativo e sociável. Você tem magnetismo natural.', pontosFortes: ['Charme', 'Humor'], desafios: ['Parecer superficial'] },
  4: { titulo: 'Persona Confiável', essencia: 'Aparência sólida', descricao: 'Você é visto como responsável, prático e confiável. Pessoas te procuram para conselhos sensatos.', pontosFortes: ['Confiança', 'Solidez'], desafios: ['Parecer rígido'] },
  5: { titulo: 'Persona Dinâmica', essencia: 'Aparência magnética', descricao: 'Os outros te veem como interessante, cheio de energia e vida. Você atrai pela versatilidade.', pontosFortes: ['Vitalidade', 'Magnetismo'], desafios: ['Parecer instável'] },
  6: { titulo: 'Persona Acolhedora', essencia: 'Aparência maternal/paternal', descricao: 'Você é visto como cuidadoso, responsável e amoroso. Pessoas confiam em você facilmente.', pontosFortes: ['Acolhimento', 'Confiabilidade'], desafios: ['Parecer controlador'] },
  7: { titulo: 'Persona Enigmática', essencia: 'Aparência profunda', descricao: 'Os outros te veem como misterioso, sábio e reservado. Você desperta curiosidade.', pontosFortes: ['Profundidade', 'Aura'], desafios: ['Parecer distante'] },
  8: { titulo: 'Persona Poderosa', essencia: 'Aparência de autoridade', descricao: 'Você é visto como bem-sucedido, ambicioso e influente. Transmite poder e estabilidade.', pontosFortes: ['Autoridade', 'Presença de comando'], desafios: ['Parecer materialista'] },
  9: { titulo: 'Persona Compassiva', essencia: 'Aparência de sábio', descricao: 'Os outros te veem como generoso, sábio e humanitário. Você inspira confiança e admiração.', pontosFortes: ['Nobreza', 'Sabedoria visível'], desafios: ['Parecer distante do mundano'] },
  11: { titulo: 'Persona Inspiradora ✨', essencia: 'Aparência luminosa', descricao: 'Você é percebido como intuitivo, especial e magnético. Pessoas sentem sua vibração alta.', pontosFortes: ['Aura', 'Inspiração'], desafios: ['Ser mal compreendido'] },
  22: { titulo: 'Persona Imponente ✨', essencia: 'Aparência de mestre', descricao: 'Os outros percebem grandeza em você. Transmite visão e poder de realização raros.', pontosFortes: ['Autoridade natural', 'Visão'], desafios: ['Ser intimidador'] },
  33: { titulo: 'Persona Amorosa ✨', essencia: 'Aparência de curador', descricao: 'Você é percebido como amoroso, sábio e curador. Pessoas se abrem naturalmente com você.', pontosFortes: ['Amor visível', 'Cura'], desafios: ['Sobrecarga emocional'] },
};

export const INTERPRETACOES_MATURIDADE: MapaInterpretacoes = {
  1: { titulo: 'Maturidade de Líder', essencia: 'Após os 35-40 anos', descricao: 'Na segunda metade da vida você desenvolve independência plena, iniciando novos projetos e liderando.', pontosFortes: ['Autoliderança', 'Autoconfiança madura'], desafios: ['Solidão'] },
  2: { titulo: 'Maturidade de Parceria', essencia: 'Após os 35-40 anos', descricao: 'Você amadurece em parcerias profundas, diplomacia e trabalho colaborativo.', pontosFortes: ['Sabedoria relacional'], desafios: ['Dependência tardia'] },
  3: { titulo: 'Maturidade Criativa', essencia: 'Após os 35-40 anos', descricao: 'Sua fase madura floresce em criatividade, expressão artística e alegria de viver.', pontosFortes: ['Criatividade refinada'], desafios: ['Dispersão'] },
  4: { titulo: 'Maturidade Construtora', essencia: 'Após os 35-40 anos', descricao: 'Você constrói bases sólidas e colhe frutos do trabalho disciplinado.', pontosFortes: ['Estabilidade'], desafios: ['Rigidez'] },
  5: { titulo: 'Maturidade Livre', essencia: 'Após os 35-40 anos', descricao: 'Sua maturidade traz liberdade, viagens e transformações prazerosas.', pontosFortes: ['Liberdade conquistada'], desafios: ['Inquietude'] },
  6: { titulo: 'Maturidade Amorosa', essencia: 'Após os 35-40 anos', descricao: 'Você amadurece em amor, família e responsabilidade harmoniosa.', pontosFortes: ['Amor maduro'], desafios: ['Autossacrifício'] },
  7: { titulo: 'Maturidade Sábia', essencia: 'Após os 35-40 anos', descricao: 'Sua fase madura é de sabedoria profunda, espiritualidade e ensino.', pontosFortes: ['Sabedoria'], desafios: ['Isolamento'] },
  8: { titulo: 'Maturidade Próspera', essencia: 'Após os 35-40 anos', descricao: 'Você colhe poder, prosperidade material e reconhecimento profissional.', pontosFortes: ['Abundância'], desafios: ['Materialismo'] },
  9: { titulo: 'Maturidade Humanitária', essencia: 'Após os 35-40 anos', descricao: 'Sua fase madura se dedica a causas maiores e legado transformador.', pontosFortes: ['Legado'], desafios: ['Autossacrifício'] },
  11: { titulo: 'Maturidade Iluminada ✨', essencia: 'Após os 35-40 anos', descricao: 'Você se torna canal de inspiração espiritual, guia para outros.', pontosFortes: ['Missão espiritual'], desafios: ['Pressão psíquica'] },
  22: { titulo: 'Maturidade Grandiosa ✨', essencia: 'Após os 35-40 anos', descricao: 'Materializa obras de grande impacto na segunda metade da vida.', pontosFortes: ['Legado épico'], desafios: ['Peso'] },
  33: { titulo: 'Maturidade de Cura ✨', essencia: 'Após os 35-40 anos', descricao: 'Você se torna mestre curador, ensinando amor incondicional.', pontosFortes: ['Amor mestre'], desafios: ['Autoentrega'] },
};

// ═══════════════════════════════════════════════════════
// INTEGRAÇÃO — combina os 5 números em narrativa unificada
// ═══════════════════════════════════════════════════════
export function gerarIntegracao(mapa: MapaNumerologicoCompleto): {
  personalidadeGeral: string;
  talentosMissao: string;
  desafiosConflitos: string;
  amorRelacionamentos: string;
  carreiraProposito: string;
  espiritualidade: string;
  padroesRecorrentes: string;
} {
  const cv = mapa.caminhoVida.numeroFinal;
  const exp = mapa.expressao.numeroFinal;
  const alma = mapa.alma.numeroFinal;
  const pers = mapa.personalidade.numeroFinal;
  const mat = mapa.maturidade.numeroFinal;

  const iCV = INTERPRETACOES_CAMINHO_VIDA[cv];
  const iExp = INTERPRETACOES_EXPRESSAO[exp];
  const iAlma = INTERPRETACOES_ALMA[alma];
  const iPers = INTERPRETACOES_PERSONALIDADE[pers];
  const iMat = INTERPRETACOES_MATURIDADE[mat];

  // Padrões — números repetidos indicam energia amplificada
  const todos = [cv, exp, alma, pers, mat];
  const contagem = todos.reduce<Record<number, number>>((acc, n) => {
    acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {});
  const repetidos = Object.entries(contagem).filter(([, c]) => c > 1);
  const numerosMestre = todos.filter(n => n === 11 || n === 22 || n === 33);

  let padroes = '';
  if (repetidos.length > 0) {
    padroes = `Detectamos repetição dos números ${repetidos.map(([n, c]) => `${n} (${c}x)`).join(', ')}, o que amplifica dramaticamente essa energia em sua vida. É um foco importante do seu mapa.`;
  } else {
    padroes = 'Seus números formam uma composição diversa, indicando um perfil multifacetado com várias energias ativas — versatilidade é seu traço marcante.';
  }
  if (numerosMestre.length > 0) {
    padroes += ` Você carrega ${numerosMestre.length} número(s) mestre (${numerosMestre.join(', ')}), o que indica uma alma com missão elevada e potencial acima da média — junto com maior sensibilidade e pressão interna.`;
  }

  return {
    personalidadeGeral: `Você é essencialmente ${iCV.titulo.toLowerCase()} (${iCV.essencia}). Externamente aparenta ser ${iPers.titulo.toLowerCase()}, mas internamente sua alma vibra como ${iAlma.titulo.toLowerCase()}. Essa combinação entre imagem externa (Personalidade ${pers}) e desejo interno (Alma ${alma}) revela ${alma === pers ? 'uma bela integração entre quem você é por dentro e por fora' : 'uma dualidade fascinante: o mundo te percebe de um jeito, mas por dentro você é diferente'}.`,

    talentosMissao: `Sua Expressão ${exp} (${iExp.titulo}) revela seus talentos naturais: ${iExp.pontosFortes.join(', ').toLowerCase()}. Combinada ao Caminho ${cv}, sua missão é usar esses dons para ${iCV.essencia.toLowerCase()}. Você tem os recursos internos para cumprir esse chamado.`,

    desafiosConflitos: `Os principais desafios do seu mapa são: ${iCV.desafios[0]?.toLowerCase()}, ${iExp.desafios[0]?.toLowerCase()} e ${iAlma.desafios[0]?.toLowerCase()}. ${alma !== pers ? `Existe um conflito interessante entre sua alma (${alma}) e sua personalidade (${pers}) — o que você deseja profundamente nem sempre é o que mostra ao mundo. Reconhecer essa distância é parte da maturidade.` : `Sua alma e personalidade estão alinhadas — o que sente é o que mostra. Isso te dá autenticidade rara.`}`,

    amorRelacionamentos: `Nos relacionamentos, sua alma ${alma} busca ${iAlma.essencia.toLowerCase()}, mas sua personalidade ${pers} projeta ${iPers.essencia.toLowerCase()}. ${alma === 2 || alma === 6 ? 'Você tem uma alma naturalmente amorosa e parceira.' : alma === 1 || alma === 5 ? 'Você valoriza sua liberdade e independência afetiva.' : 'Você busca conexões profundas e significativas.'} Cuidado com o padrão ${iAlma.desafios[0]?.toLowerCase()}.`,

    carreiraProposito: `Profissionalmente, seus talentos de Expressão ${exp} combinam bem com trabalhos ligados a ${iExp.essencia.toLowerCase()}. Seu Caminho ${cv} indica que sua realização virá de ${iCV.essencia.toLowerCase()}. Áreas ideais dependem de aplicar ${iExp.pontosFortes[0]?.toLowerCase()} no serviço de ${iCV.pontosFortes[0]?.toLowerCase()}.`,

    espiritualidade: `Espiritualmente, ${numerosMestre.length > 0 ? `você carrega vibrações mestras (${numerosMestre.join(', ')}) que aceleram seu despertar. Sua sensibilidade é maior — cultive práticas de aterramento.` : `seu caminho espiritual é ${cv === 7 || cv === 9 ? 'naturalmente elevado e buscador' : cv === 4 || cv === 8 ? 'prático e integrado ao material' : 'equilibrado entre céu e terra'}.`} Sua Maturidade ${mat} (${iMat.titulo}) mostra que ${iMat.descricao.toLowerCase()}`,

    padroesRecorrentes: padroes,
  };
}
