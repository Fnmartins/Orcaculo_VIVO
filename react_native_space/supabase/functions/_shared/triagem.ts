// supabase/functions/_shared/triagem.ts
//
// A triagem da pergunta, do lado do servidor.
//
// É cópia deliberada de utils/perguntas.ts. O app é código que qualquer pessoa
// lê e edita: se a única barreira de crise vivesse lá, bastaria uma requisição
// feita à mão para passar por cima dela. Aqui é onde a barreira vale.
//
// As duas listas têm de andar juntas — utils/__tests__/perguntas.test.ts lê
// este arquivo e quebra se elas divergirem.

export const LIMITE_PERGUNTA = 400;

export const CVV = '188';

export type Assunto = 'saude' | 'juridico' | 'financeiro';

export type Triagem =
  | { tipo: 'vazia' }
  | { tipo: 'longa' }
  | { tipo: 'crise' }
  | { tipo: 'fora'; assunto: Assunto }
  | { tipo: 'ok' };

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

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
  // Crise antes do tamanho: texto longo com conteúdo de crise voltaria como
  // 'longa' e a pessoa receberia um erro de formulário no lugar do telefone.
  if (FRASES_CRISE.some((frase) => texto.includes(frase))) return { tipo: 'crise' };
  if (bruto.trim().length > LIMITE_PERGUNTA) return { tipo: 'longa' };
  for (const assunto of ['saude', 'juridico', 'financeiro'] as Assunto[]) {
    if (FORA[assunto].some((palavra) => contemPalavra(texto, palavra))) {
      return { tipo: 'fora', assunto };
    }
  }
  return { tipo: 'ok' };
}

export function podeEnviar(triagem: Triagem): boolean {
  return triagem.tipo === 'ok' || triagem.tipo === 'fora';
}

export function podeGuardar(triagem: Triagem): boolean {
  return triagem.tipo === 'ok';
}

export const RESPOSTA_CRISE = [
  'Esta eu não vou responder com símbolos, e não é por falta de cuidado — é por excesso.',
  `O que você escreveu merece uma pessoa do outro lado. Ligue ${CVV} (CVV): é gratuito, funciona 24 horas e quem atende escuta sem julgar. Se houver risco agora, 192 (SAMU) ou 190.`,
  'A leitura continua aqui quando você quiser voltar.',
].join('\n\n');
