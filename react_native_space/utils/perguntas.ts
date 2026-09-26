/**
 * Triagem da pergunta que a pessoa escreve depois da leitura.
 *
 * O filtro de crise roda **aqui, em código, antes de qualquer chamada ao
 * modelo**. Foi a condição que o conselho colocou para a caixa de pergunta
 * existir: um filtro determinístico não depende de a IA "perceber" nada, não
 * varia entre duas execuções e não desaparece quando a chamada falha.
 *
 * A mesma lista vive em `supabase/functions/_shared/triagem.ts`, porque o app
 * é código que qualquer pessoa edita — o servidor refaz a triagem por conta
 * dele. Há um teste que compara as duas listas e quebra se uma andar sem a
 * outra.
 */

/** Caracteres. Acima disso não é pergunta, é texto colado. */
export const LIMITE_PERGUNTA = 400;

/** Por leitura, não por dia: a pergunta é sobre o que acabou de sair. */
export const PERGUNTAS_POR_LEITURA = 3;

/** Centro de Valorização da Vida: ligação gratuita, 24 horas. */
export const CVV = '188';

export type Assunto = 'saude' | 'juridico' | 'financeiro';

export type Triagem =
  | { tipo: 'vazia' }
  | { tipo: 'longa' }
  | { tipo: 'crise' }
  | { tipo: 'fora'; assunto: Assunto }
  | { tipo: 'ok' };

/** Minúsculas, sem acento, espaços colapsados — o resto da triagem conta com isso. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Frases, não palavras soltas: "matar" sozinho pega "matar a saudade", e a tela
 * de crise apareceria em cima de gente que está bem. Os trechos são curtos de
 * propósito ("suicid" cobre suicídio, suicida, suicidar).
 */
export const FRASES_CRISE = [
  'suicid',
  'me matar',
  'me mato',
  'tirar a minha vida',
  'tirar minha vida',
  'acabar com a minha vida',
  'dar fim a minha vida',
  'nao quero mais viver',
  'nao aguento mais viver',
  'desistir de viver',
  'queria estar morto',
  'queria estar morta',
  'quero morrer',
  'vou me jogar',
  'me enforcar',
  'me cortar',
  'me machucar',
  'me mutilar',
  'automutila',
  'sumir do mundo',
  'acabar com tudo hoje',
];

/**
 * Assunto que o oráculo não decide. Não bloqueia a pergunta — o modelo já tem
 * regra para responder sem diagnosticar, aconselhar juridicamente ou indicar
 * investimento. Serve para **não guardar**: pergunta de saúde não entra no
 * banco, nem anonimizada.
 */
const FORA: Record<Assunto, string[]> = {
  saude: [
    'cancer', 'tumor', 'exame', 'biopsia', 'diagnostico', 'doenca', 'cirurgia',
    'remedio', 'medicamento', 'dosagem', 'gravida', 'gravidez', 'aborto',
    'depressao', 'ansiedade', 'transtorno', 'tratamento', 'quimioterapia',
  ],
  juridico: [
    'processo', 'advogado', 'advogada', 'juiz', 'juiza', 'audiencia', 'crime',
    'delegacia', 'inventario', 'divorcio', 'pensao', 'contrato', 'intimacao',
  ],
  financeiro: [
    'investir', 'investimento', 'investimentos', 'acoes', 'bolsa', 'bitcoin',
    'cripto', 'criptomoeda', 'emprestimo', 'divida', 'dividas', 'financiamento',
    'apostar', 'aposta', 'loteria', 'megasena', 'mega sena',
  ],
};

function contemPalavra(texto: string, palavra: string): boolean {
  const alvo = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${alvo}([^a-z0-9]|$)`).test(texto);
}

export function triar(bruto: string): Triagem {
  const texto = normalizar(bruto);
  if (!texto) return { tipo: 'vazia' };
  // Crise antes do tamanho, de propósito: texto longo com conteúdo de crise
  // voltaria como 'longa' e a tela do CVV não apareceria.
  if (FRASES_CRISE.some((frase) => texto.includes(frase))) return { tipo: 'crise' };
  if (bruto.trim().length > LIMITE_PERGUNTA) return { tipo: 'longa' };
  for (const assunto of ['saude', 'juridico', 'financeiro'] as Assunto[]) {
    if (FORA[assunto].some((palavra) => contemPalavra(texto, palavra))) {
      return { tipo: 'fora', assunto };
    }
  }
  return { tipo: 'ok' };
}

/** Crise não vai para o modelo. Vazia e longa não saem do aparelho. */
export function podeEnviar(triagem: Triagem): boolean {
  return triagem.tipo === 'ok' || triagem.tipo === 'fora';
}

/** Só pergunta comum é guardada. Crise e saúde nunca, nem anonimizadas. */
export function podeGuardar(triagem: Triagem): boolean {
  return triagem.tipo === 'ok';
}

/**
 * A recusa da crise. Sai da voz do oráculo de propósito — aqui símbolo não
 * serve — e ainda devolve alguma coisa: um telefone e a porta aberta para
 * voltar. Este texto nunca é guardado junto de pergunta nenhuma.
 */
export const RESPOSTA_CRISE = [
  'Esta eu não vou responder com símbolos, e não é por falta de cuidado — é por excesso.',
  `O que você escreveu merece uma pessoa do outro lado. Ligue ${CVV} (CVV): é gratuito, funciona 24 horas e quem atende escuta sem julgar. Se houver risco agora, 192 (SAMU) ou 190.`,
  'A leitura continua aqui quando você quiser voltar.',
].join('\n\n');

export const SUGESTOES: Record<'tarot' | 'buzios', string[]> = {
  tarot: [
    'O que essa leitura pede que eu faça primeiro?',
    'Qual das três cartas fala do meu presente?',
    'O que eu venho evitando olhar?',
  ],
  buzios: [
    'O que esse odu pede de mim agora?',
    'Como eu levo esse conselho para esta semana?',
    'O que esse odu diz sobre a minha intenção?',
  ],
};
