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
  anoPessoal: CalculoDetalhado;
  anoReferencia: number;
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

// ANO PESSOAL — dia + mês de nascimento + ano de referência
export function calcularAnoPessoal(
  dia: number,
  mes: number,
  anoReferencia = new Date().getFullYear()
): CalculoDetalhado {
  const passos: PassoCalculo[] = [];
  const parcelas = [dia, mes, ...String(anoReferencia).split('').map(Number)];
  const soma = parcelas.reduce((total, valor) => total + valor, 0);

  passos.push({
    descricao: 'Dia + mês + ano de referência',
    detalhe: `${parcelas.join(' + ')} = ${soma}`,
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
  ano: number,
  anoReferencia = new Date().getFullYear()
): MapaNumerologicoCompleto {
  const caminhoVida = calcularCaminhoVida(dia, mes, ano);
  const expressao = calcularExpressao(nome);
  const alma = calcularAlma(nome);
  const personalidade = calcularPersonalidade(nome);
  const maturidade = calcularMaturidade(caminhoVida.numeroFinal, expressao.numeroFinal);
  const anoPessoal = calcularAnoPessoal(dia, mes, anoReferencia);

  const dataFmt = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;

  return {
    nome: nome.trim(),
    dataNascimento: dataFmt,
    caminhoVida,
    expressao,
    alma,
    personalidade,
    maturidade,
    anoPessoal,
    anoReferencia,
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
    descricao: 'A tradição associa este caminho a iniciativa, originalidade e autonomia. Reflita sobre onde liderar pode ser útil e onde colaboração e escuta são necessárias.',
    pontosFortes: ['Iniciativa', 'Coragem', 'Autoconfiança', 'Originalidade'],
    desafios: ['Impaciência', 'Ego', 'Solidão', 'Autoritarismo'],
  },
  2: {
    titulo: 'O Pacificador',
    essencia: 'Cooperação e Sensibilidade',
    descricao: 'A tradição associa este caminho a parceria, diplomacia e paciência. Reflita sobre como se posicionar com clareza sem abandonar a gentileza.',
    pontosFortes: ['Diplomacia', 'Empatia', 'Intuição', 'Colaboração'],
    desafios: ['Indecisão', 'Dependência emocional', 'Passividade'],
  },
  3: {
    titulo: 'O Comunicador',
    essencia: 'Expressão Criativa e Alegria',
    descricao: 'A tradição associa este caminho a comunicação, arte e criatividade. Observe quais formas de expressão fazem sentido no seu contexto e como evitar dispersão.',
    pontosFortes: ['Criatividade', 'Comunicação', 'Otimismo', 'Carisma'],
    desafios: ['Dispersão', 'Superficialidade', 'Drama'],
  },
  4: {
    titulo: 'O Construtor',
    essencia: 'Estrutura e Trabalho Sólido',
    descricao: 'A tradição associa este caminho a estrutura, disciplina e consistência. Reflita sobre como criar segurança sem transformar organização em rigidez.',
    pontosFortes: ['Disciplina', 'Lealdade', 'Praticidade', 'Perseverança'],
    desafios: ['Rigidez', 'Teimosia', 'Excesso de trabalho'],
  },
  5: {
    titulo: 'O Aventureiro',
    essencia: 'Liberdade e Mudança',
    descricao: 'A tradição associa este caminho a mudança, curiosidade e liberdade. Reflita sobre como experimentar com responsabilidade e preservar compromissos importantes.',
    pontosFortes: ['Versatilidade', 'Adaptabilidade', 'Curiosidade', 'Magnetismo'],
    desafios: ['Instabilidade', 'Impulsividade', 'Excessos'],
  },
  6: {
    titulo: 'O Cuidador',
    essencia: 'Amor e Responsabilidade',
    descricao: 'A tradição associa este caminho a cuidado, vínculos e responsabilidade. Reflita sobre como apoiar outras pessoas sem se anular ou tentar controlá-las.',
    pontosFortes: ['Amor', 'Serviço', 'Harmonia', 'Compromisso'],
    desafios: ['Perfeccionismo', 'Autossacrifício', 'Controle'],
  },
  7: {
    titulo: 'O Buscador',
    essencia: 'Sabedoria e Introspecção',
    descricao: 'A tradição associa este caminho a investigação, introspecção e busca de conhecimento. Reflita sem se afastar de evidências, diálogo e pessoas de confiança.',
    pontosFortes: ['Sabedoria', 'Análise', 'Espiritualidade', 'Profundidade'],
    desafios: ['Isolamento', 'Ceticismo', 'Frieza'],
  },
  8: {
    titulo: 'O Realizador',
    essencia: 'Poder Material e Abundância',
    descricao: 'A tradição associa este caminho à gestão de recursos, liderança e responsabilidade material. Use a leitura para refletir sobre ambição, valores e limites, sem tratá-la como previsão financeira.',
    pontosFortes: ['Ambição', 'Estratégia', 'Autoridade', 'Resiliência'],
    desafios: ['Materialismo', 'Controle', 'Workaholismo'],
  },
  9: {
    titulo: 'O Humanitário',
    essencia: 'Compaixão Universal',
    descricao: 'A tradição associa este caminho a serviço, compaixão e encerramento de ciclos. Reflita sobre como contribuir sem assumir responsabilidades que pertencem aos outros.',
    pontosFortes: ['Compaixão', 'Idealismo', 'Generosidade', 'Visão global'],
    desafios: ['Autossacrifício', 'Melancolia', 'Idealismo excessivo'],
  },
  11: {
    titulo: 'O Iluminador ✨',
    essencia: 'Intuição Mestra e Inspiração Espiritual',
    descricao: 'Algumas escolas preservam o 11 como número mestre e o associam a sensibilidade e inspiração. Use essa associação como linguagem simbólica, não como prova de poderes ou destino especial.',
    pontosFortes: ['Sensibilidade', 'Criatividade', 'Inspiração', 'Percepção'],
    desafios: ['Idealização', 'Sobrecarga', 'Autoexigência'],
  },
  22: {
    titulo: 'O Mestre Construtor ✨',
    essencia: 'Realização Grandiosa',
    descricao: 'Algumas escolas preservam o 22 e o associam à combinação entre visão e execução. Use essa leitura para pensar em etapas realistas, colaboração e limites.',
    pontosFortes: ['Visão grandiosa', 'Poder de realização', 'Praticidade elevada', 'Liderança global'],
    desafios: ['Pressão extrema', 'Perfeccionismo', 'Autoexigência'],
  },
  33: {
    titulo: 'O Mestre Curador ✨',
    essencia: 'Amor Cristificado',
    descricao: 'Algumas escolas preservam o 33 e o associam a cuidado e ensino. Use essa leitura para refletir sobre serviço responsável, reciprocidade e autocuidado.',
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
  8: { titulo: 'Talentos Executivos', essencia: 'Gestão e estratégia', descricao: 'A tradição relaciona este número a administração, negociação e execução. Experiência e contexto continuam essenciais para avaliar competências reais.', pontosFortes: ['Administração', 'Estratégia', 'Liderança'], desafios: ['Excesso de trabalho'] },
  9: { titulo: 'Talentos Humanitários', essencia: 'Manifesta compaixão', descricao: 'Você expressa dons em causas maiores, artes com propósito e trabalho de impacto social.', pontosFortes: ['Compaixão', 'Visão universal', 'Inspiração'], desafios: ['Desapego difícil'] },
  11: { titulo: 'Talentos Inspiracionais ✨', essencia: 'Canaliza inspiração', descricao: 'Seus dons são canalizadores. Você expressa mensagens que inspiram e elevam pessoas. Grande potencial em áreas espirituais e artísticas.', pontosFortes: ['Inspiração', 'Intuição', 'Carisma'], desafios: ['Pressão interna'] },
  22: { titulo: 'Talentos Grandiosos ✨', essencia: 'Manifesta em grande escala', descricao: 'Você tem talentos raros para criar obras de grande impacto — organizações, movimentos, legados duradouros.', pontosFortes: ['Visão prática', 'Realização', 'Impacto'], desafios: ['Peso da responsabilidade'] },
  33: { titulo: 'Talentos de Cuidado ✨', essencia: 'Cuidado e ensino', descricao: 'Algumas escolas associam este número ao cuidado e ao ensino. Ele não indica capacidade médica ou terapêutica.', pontosFortes: ['Cuidado', 'Ensino', 'Acolhimento'], desafios: ['Autossacrifício'] },
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
  11: { titulo: 'Alma Inspirada ✨', essencia: 'Desejo de significado', descricao: 'Algumas escolas associam o 11 a sensibilidade e busca de significado. Trate essa leitura como símbolo, não como evidência de percepção sobrenatural.', pontosFortes: ['Sensibilidade', 'Inspiração'], desafios: ['Idealização'] },
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
  33: { titulo: 'Persona Acolhedora ✨', essencia: 'Aparência cuidadosa', descricao: 'Algumas escolas associam o 33 a uma imagem acolhedora e responsável. Isso não indica capacidade médica ou terapêutica.', pontosFortes: ['Acolhimento', 'Escuta'], desafios: ['Sobrecarga emocional'] },
};

export const INTERPRETACOES_MATURIDADE: MapaInterpretacoes = {
  1: { titulo: 'Maturidade de Líder', essencia: 'Após os 35-40 anos', descricao: 'Na segunda metade da vida você desenvolve independência plena, iniciando novos projetos e liderando.', pontosFortes: ['Autoliderança', 'Autoconfiança madura'], desafios: ['Solidão'] },
  2: { titulo: 'Maturidade de Parceria', essencia: 'Após os 35-40 anos', descricao: 'Você amadurece em parcerias profundas, diplomacia e trabalho colaborativo.', pontosFortes: ['Sabedoria relacional'], desafios: ['Dependência tardia'] },
  3: { titulo: 'Maturidade Criativa', essencia: 'Após os 35-40 anos', descricao: 'Sua fase madura floresce em criatividade, expressão artística e alegria de viver.', pontosFortes: ['Criatividade refinada'], desafios: ['Dispersão'] },
  4: { titulo: 'Maturidade Construtora', essencia: 'Após os 35-40 anos', descricao: 'Você constrói bases sólidas e colhe frutos do trabalho disciplinado.', pontosFortes: ['Estabilidade'], desafios: ['Rigidez'] },
  5: { titulo: 'Maturidade Livre', essencia: 'Após os 35-40 anos', descricao: 'Sua maturidade traz liberdade, viagens e transformações prazerosas.', pontosFortes: ['Liberdade conquistada'], desafios: ['Inquietude'] },
  6: { titulo: 'Maturidade Amorosa', essencia: 'Após os 35-40 anos', descricao: 'Você amadurece em amor, família e responsabilidade harmoniosa.', pontosFortes: ['Amor maduro'], desafios: ['Autossacrifício'] },
  7: { titulo: 'Maturidade Sábia', essencia: 'Após os 35-40 anos', descricao: 'Sua fase madura é de sabedoria profunda, espiritualidade e ensino.', pontosFortes: ['Sabedoria'], desafios: ['Isolamento'] },
  8: { titulo: 'Maturidade Estratégica', essencia: 'Associação tradicional da maturidade', descricao: 'A tradição associa esta combinação ao amadurecimento na gestão de recursos e responsabilidades.', pontosFortes: ['Estratégia'], desafios: ['Materialismo'] },
  9: { titulo: 'Maturidade Humanitária', essencia: 'Após os 35-40 anos', descricao: 'Sua fase madura se dedica a causas maiores e legado transformador.', pontosFortes: ['Legado'], desafios: ['Autossacrifício'] },
  11: { titulo: 'Maturidade Inspiradora ✨', essencia: 'Associação tradicional da maturidade', descricao: 'A tradição associa esta combinação ao amadurecimento da sensibilidade e da expressão criativa.', pontosFortes: ['Inspiração'], desafios: ['Autoexigência'] },
  22: { titulo: 'Maturidade Grandiosa ✨', essencia: 'Após os 35-40 anos', descricao: 'Materializa obras de grande impacto na segunda metade da vida.', pontosFortes: ['Legado épico'], desafios: ['Peso'] },
  33: { titulo: 'Maturidade de Cuidado ✨', essencia: 'Associação tradicional da maturidade', descricao: 'A tradição associa esta combinação ao amadurecimento do cuidado, do ensino e dos limites pessoais.', pontosFortes: ['Cuidado responsável'], desafios: ['Autoentrega'] },
};

export const INTERPRETACOES_ANO_PESSOAL: MapaInterpretacoes = {
  1: { titulo: 'Ciclo de Inícios', essencia: 'Iniciativa e autonomia', descricao: 'A tradição associa este ciclo a começos e decisões autorais. Reflita sobre o que deseja iniciar e quais recursos reais já possui.', pontosFortes: ['Iniciativa', 'Clareza de intenção'], desafios: ['Pressa', 'Isolamento'] },
  2: { titulo: 'Ciclo de Cooperação', essencia: 'Paciência e parceria', descricao: 'A tradição associa este ciclo a acordos, escuta e amadurecimento gradual. Observe onde colaborar pode ser mais útil do que acelerar.', pontosFortes: ['Escuta', 'Diplomacia'], desafios: ['Indecisão', 'Passividade'] },
  3: { titulo: 'Ciclo de Expressão', essencia: 'Comunicação e criatividade', descricao: 'A tradição associa este ciclo à expressão de ideias e vínculos sociais. Escolha canais concretos para comunicar e criar.', pontosFortes: ['Criatividade', 'Comunicação'], desafios: ['Dispersão', 'Exagero'] },
  4: { titulo: 'Ciclo de Estrutura', essencia: 'Organização e consistência', descricao: 'A tradição associa este ciclo à construção de bases. Revise rotinas, limites e prioridades antes de assumir novas obrigações.', pontosFortes: ['Disciplina', 'Planejamento'], desafios: ['Rigidez', 'Sobrecarga'] },
  5: { titulo: 'Ciclo de Mudança', essencia: 'Adaptação e movimento', descricao: 'A tradição associa este ciclo a mudanças e experimentação. Explore alternativas sem abandonar critérios, segurança e compromissos importantes.', pontosFortes: ['Adaptabilidade', 'Curiosidade'], desafios: ['Impulsividade', 'Instabilidade'] },
  6: { titulo: 'Ciclo de Cuidado', essencia: 'Responsabilidade e vínculos', descricao: 'A tradição associa este ciclo ao cuidado com relações e espaços compartilhados. Equilibre presença para os outros com autocuidado.', pontosFortes: ['Responsabilidade', 'Acolhimento'], desafios: ['Controle', 'Autossacrifício'] },
  7: { titulo: 'Ciclo de Investigação', essencia: 'Estudo e interiorização', descricao: 'A tradição associa este ciclo a estudo, avaliação e silêncio produtivo. Use reflexão como apoio, sem se afastar de fatos e pessoas de confiança.', pontosFortes: ['Análise', 'Profundidade'], desafios: ['Isolamento', 'Excesso de dúvida'] },
  8: { titulo: 'Ciclo de Realização', essencia: 'Recursos e responsabilidade', descricao: 'A tradição associa este ciclo à gestão de recursos e resultados. Planeje com dados concretos e não use esta leitura como orientação financeira.', pontosFortes: ['Estratégia', 'Execução'], desafios: ['Controle', 'Excesso de trabalho'] },
  9: { titulo: 'Ciclo de Conclusão', essencia: 'Síntese e desapego', descricao: 'A tradição associa este ciclo ao encerramento e à revisão de aprendizados. Diferencie o que precisa terminar do que apenas precisa ser ajustado.', pontosFortes: ['Síntese', 'Compaixão'], desafios: ['Melancolia', 'Dificuldade de encerrar'] },
  11: { titulo: 'Ciclo Mestre 11', essencia: 'Sensibilidade e inspiração', descricao: 'Algumas escolas preservam o 11 neste cálculo. Use-o como convite simbólico à percepção e à expressão, sem atribuir poderes ou previsões.', pontosFortes: ['Sensibilidade', 'Inspiração'], desafios: ['Ansiedade', 'Idealização'] },
  22: { titulo: 'Ciclo Mestre 22', essencia: 'Visão e construção', descricao: 'Algumas escolas preservam o 22 neste cálculo. Use-o como convite simbólico para transformar uma visão em etapas realistas e verificáveis.', pontosFortes: ['Planejamento', 'Realização'], desafios: ['Autoexigência', 'Sobrecarga'] },
  33: { titulo: 'Ciclo Mestre 33', essencia: 'Cuidado e serviço', descricao: 'Algumas escolas preservam o 33 neste cálculo. Use-o como convite simbólico para cuidar com limites e responsabilidade.', pontosFortes: ['Cuidado', 'Ensino'], desafios: ['Autossacrifício', 'Idealização'] },
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

  // Padrões — repetições são destacadas como associação simbólica
  const todos = [cv, exp, alma, pers, mat];
  const contagem = todos.reduce<Record<number, number>>((acc, n) => {
    acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {});
  const repetidos = Object.entries(contagem).filter(([, c]) => c > 1);
  const numerosMestre = todos.filter(n => n === 11 || n === 22 || n === 33);

  let padroes = '';
  if (repetidos.length > 0) {
    padroes = `Os números ${repetidos.map(([n, c]) => `${n} (${c}x)`).join(', ')} aparecem mais de uma vez. A tradição costuma destacar essas repetições; use-as apenas como temas para reflexão.`;
  } else {
    padroes = 'Seus números formam uma composição diversa, indicando um perfil multifacetado com várias energias ativas — versatilidade é seu traço marcante.';
  }
  if (numerosMestre.length > 0) {
    padroes += ` O cálculo preservou ${numerosMestre.length} número(s) mestre (${numerosMestre.join(', ')}), conforme a metodologia adotada. Isso é uma convenção numerológica, não uma medida de potencial ou superioridade.`;
  }

  return {
    personalidadeGeral: `Você é essencialmente ${iCV.titulo.toLowerCase()} (${iCV.essencia}). Externamente aparenta ser ${iPers.titulo.toLowerCase()}, mas internamente sua alma vibra como ${iAlma.titulo.toLowerCase()}. Essa combinação entre imagem externa (Personalidade ${pers}) e desejo interno (Alma ${alma}) revela ${alma === pers ? 'uma bela integração entre quem você é por dentro e por fora' : 'uma dualidade fascinante: o mundo te percebe de um jeito, mas por dentro você é diferente'}.`,

    talentosMissao: `Sua Expressão ${exp} (${iExp.titulo}) revela seus talentos naturais: ${iExp.pontosFortes.join(', ').toLowerCase()}. Combinada ao Caminho ${cv}, sua missão é usar esses dons para ${iCV.essencia.toLowerCase()}. Você tem os recursos internos para cumprir esse chamado.`,

    desafiosConflitos: `Os principais desafios do seu mapa são: ${iCV.desafios[0]?.toLowerCase()}, ${iExp.desafios[0]?.toLowerCase()} e ${iAlma.desafios[0]?.toLowerCase()}. ${alma !== pers ? `Existe um conflito interessante entre sua alma (${alma}) e sua personalidade (${pers}) — o que você deseja profundamente nem sempre é o que mostra ao mundo. Reconhecer essa distância é parte da maturidade.` : `Sua alma e personalidade estão alinhadas — o que sente é o que mostra. Isso te dá autenticidade rara.`}`,

    amorRelacionamentos: `Nos relacionamentos, sua alma ${alma} busca ${iAlma.essencia.toLowerCase()}, mas sua personalidade ${pers} projeta ${iPers.essencia.toLowerCase()}. ${alma === 2 || alma === 6 ? 'Você tem uma alma naturalmente amorosa e parceira.' : alma === 1 || alma === 5 ? 'Você valoriza sua liberdade e independência afetiva.' : 'Você busca conexões profundas e significativas.'} Cuidado com o padrão ${iAlma.desafios[0]?.toLowerCase()}.`,

    carreiraProposito: `Como reflexão profissional, a Expressão ${exp} pode convidar você a observar atividades ligadas a ${iExp.essencia.toLowerCase()}. O Caminho ${cv} acrescenta o tema simbólico de ${iCV.essencia.toLowerCase()}. Compare essas associações com suas competências demonstradas, interesses, contexto e oportunidades reais.`,

    espiritualidade: `Como reflexão espiritual, ${numerosMestre.length > 0 ? `a metodologia preservou os números ${numerosMestre.join(', ')}, tradicionalmente associados a sensibilidade e responsabilidade` : `o Caminho ${cv} oferece uma associação simbólica para observar valores, significado e práticas pessoais`}. A Maturidade ${mat} acrescenta esta leitura: ${iMat.descricao.toLowerCase()}`,

    padroesRecorrentes: padroes,
  };
}
