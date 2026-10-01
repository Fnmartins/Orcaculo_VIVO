// supabase/functions/_shared/limites.ts
//
// A decisão de deixar ou não gastar uma chamada paga de IA.
//
// Puro e sem dependência, como escritas.ts e regras-acessos.ts, por dois
// motivos: o Jest do app testa (services/__tests__/limites.test.ts) e o tsc
// não engasga com import de Deno. A leitura das tabelas fica em quem chama.

export type TipoUso = 'imagem' | 'interpretacao' | 'pergunta' | 'voz';

/** Uma linha de public.configuracao_ia. */
export interface ConfiguracaoIA {
  imagem_ligada: boolean;
  interpretacao_ligada: boolean;
  pergunta_ligada: boolean;
  voz_ligada: boolean;
  /** Zero quer dizer sem limite diário. */
  limite_dia: number;
}

export interface Veredito {
  permitido: boolean;
  /** Por que não passou — a tela diz coisas diferentes para cada caso. */
  motivo?: 'desligado' | 'limite_dia' | 'vencido';
  usadoHoje: number;
  /** Nulo quer dizer sem limite: super-admin, ou plano com limite_dia = 0. */
  limiteDia: number | null;
  /**
   * Quando o acesso venceu, para a mensagem dizer a data. **Nula mesmo com
   * `motivo: 'vencido'`**: validade ausente ou ilegível barra sem ter data para
   * mostrar, e é o caso comum de quem cancelou. Quem consome tem de tratar o nulo.
   */
  venceuEm?: string | null;
}

const CAMPO: Record<TipoUso, keyof ConfiguracaoIA> = {
  imagem: 'imagem_ligada',
  interpretacao: 'interpretacao_ligada',
  pergunta: 'pergunta_ligada',
  voz: 'voz_ligada',
};

export function ligado(tipo: TipoUso, config: ConfiguracaoIA): boolean {
  return config[CAMPO[tipo]] === true;
}

/**
 * `config` nulo é escolha deliberada de deixar passar: se a tabela ainda não
 * existe ou o plano não tem linha, a leitura por imagem e o aprofundamento —
 * que funcionavam antes deste controle existir — continuam funcionando. Um
 * controle novo não pode derrubar o que já estava no ar.
 *
 * **Mas só depois da validade.** Essa tolerância vale para falha NOSSA (tabela
 * ausente, leitura com erro), e vencimento não é falha nossa: é um fato sobre a
 * pessoa. Por isso `config` nulo nunca passa quem venceu — o acesso é conferido antes,
 * e `motivo: 'vencido'` sai mesmo sem configuração nenhuma.
 */
export function decidirUso(
  tipo: TipoUso,
  config: ConfiguracaoIA | null,
  usadoHoje: number,
  semLimite: boolean,
  acesso: AcessoDoPlano,
): Veredito {
  const usado = Number.isFinite(usadoHoje) && usadoHoje > 0 ? Math.floor(usadoHoje) : 0;
  if (semLimite) {
    return { permitido: true, usadoHoje: usado, limiteDia: null };
  }
  // Vencido vem ANTES de desligado: quem venceu e lê "não disponível no seu plano"
  // vai procurar um plano que ela já tinha.
  if (!acesso.liberado) {
    return {
      permitido: false, motivo: 'vencido', usadoHoje: usado,
      limiteDia: null, venceuEm: acesso.venceuEm,
    };
  }
  // Configuração ausente continua deixando passar — tabela nova ou leitura com erro
  // não pode derrubar recurso que já estava no ar. Mas isso vale para falha NOSSA, e
  // vencimento não é falha nossa: é um fato sobre a pessoa. Por isso esta tolerância
  // fica depois da checagem de validade, e não junto dela.
  if (!config) {
    return { permitido: true, usadoHoje: usado, limiteDia: null };
  }
  if (!ligado(tipo, config)) {
    return { permitido: false, motivo: 'desligado', usadoHoje: usado, limiteDia: null };
  }
  const limite = Number.isFinite(config.limite_dia) ? Math.floor(config.limite_dia) : 0;
  if (limite <= 0) {
    return { permitido: true, usadoHoje: usado, limiteDia: null };
  }
  if (usado >= limite) {
    return { permitido: false, motivo: 'limite_dia', usadoHoje: usado, limiteDia: limite };
  }
  return { permitido: true, usadoHoje: usado, limiteDia: limite };
}

/** Quanto ainda cabe hoje. Nulo quando não há limite diário. */
export function restanteHoje(veredito: Veredito): number | null {
  if (veredito.limiteDia === null) return null;
  return Math.max(0, veredito.limiteDia - veredito.usadoHoje);
}

export interface AcessoDoPlano {
  liberado: boolean;
  /** A data que venceu, para a tela dizer quando. Nula quando nunca houve validade. */
  venceuEm: string | null;
}

/**
 * O acesso vale hoje?
 *
 * Existe porque `perfis.plano_valido_ate` era gravada e nunca conferida: quem
 * decidia acesso era `perfis.plano`, sozinho. Se um webhook da Stripe falhasse, a
 * data passava e o acesso continuava — para sempre, sem erro em lugar nenhum.
 *
 * **Data ausente não é permissão.** Nulo significa sem validade, logo sem acesso.
 * Isso acerta de graça o cancelamento: quem cancela fica com plano `gratuito` e
 * data nula, e passa a ficar corretamente sem IA, sem código novo para isso.
 *
 * Não recebe o nome do plano de propósito: acesso depende da data, não do rótulo. O
 * nome continua servindo para achar a linha de `configuracao_ia` — outra pergunta,
 * outro parâmetro.
 */
export function acessoDoPlano(
  validoAte: string | null | undefined,
  agora: Date,
  semLimite: boolean,
): AcessoDoPlano {
  if (semLimite) return { liberado: true, venceuEm: null };

  const bruto = typeof validoAte === 'string' ? validoAte.trim() : '';
  if (!bruto) return { liberado: false, venceuEm: null };

  const quando = new Date(bruto).getTime();
  // Data ilegível barra: `new Date('ontem')` devolve NaN, e NaN em comparação
  // sempre dá falso — o que liberaria por acidente se a checagem fosse ao contrário.
  if (!Number.isFinite(quando)) return { liberado: false, venceuEm: null };

  return quando > agora.getTime()
    ? { liberado: true, venceuEm: null }
    : { liberado: false, venceuEm: bruto };
}

const NOME: Record<TipoUso, string> = {
  imagem: 'A leitura por imagem',
  interpretacao: 'O aprofundamento com IA',
  pergunta: 'As perguntas',
  voz: 'A leitura falada',
};

/** Três horas a menos que UTC: o horário de Brasília, sem horário de verão desde 2019. */
const FUSO_BRASILIA_MS = 3 * 60 * 60 * 1000;

/**
 * '2026-10-10T02:00:00+00:00' → '09/10'. Vazio quando a data não serve.
 *
 * Converte para o horário de Brasília antes de escolher o dia, em vez de ler o dia
 * direto da string. O PostgREST devolve `timestamptz` em UTC, e as três primeiras horas
 * do dia UTC ainda são o dia anterior aqui — sem isso, quem perdeu o acesso às 23h do
 * dia 9 leria "terminou em 10/10", uma data que ainda não chegou.
 *
 * Brasília, e não o fuso do aparelho: a frase tem de dizer a mesma data para todo mundo,
 * e `Intl` com fuso nomeado não é confiável no Hermes do React Native. O país não tem
 * horário de verão desde 2019, então o deslocamento é constante.
 */
function diaEMes(iso: string | null | undefined): string {
  if (typeof iso !== 'string' || !iso.trim()) return '';
  const instante = new Date(iso.trim()).getTime();
  if (!Number.isFinite(instante)) return '';
  const local = new Date(instante - FUSO_BRASILIA_MS).toISOString();
  return `${local.slice(8, 10)}/${local.slice(5, 7)}`;
}

/**
 * 'Seu acesso terminou em 28/09.' — a constatação, sem o convite.
 *
 * Separada de `mensagemDoLimite` porque há lugar que dá o caminho de volta de outro
 * jeito: a folha do card explica o que continua aberto e põe os planos como uma das
 * escolhas, e ali "Atualize seu plano para continuar" repetiria o que o botão já diz.
 *
 * Sem data legível, a frase omite o quando em vez de escrever "null" ou "Invalid Date"
 * na tela de alguém.
 */
export function fraseDoVencimento(venceuEm: string | null | undefined): string {
  const quando = diaEMes(venceuEm);
  return quando ? `Seu acesso terminou em ${quando}.` : 'Seu acesso terminou.';
}

export function mensagemDoLimite(veredito: Veredito, tipo: TipoUso): string {
  if (veredito.motivo === 'vencido') {
    return `${fraseDoVencimento(veredito.venceuEm)} Atualize seu plano para continuar.`;
  }
  if (veredito.motivo === 'desligado') {
    return `${NOME[tipo]} não está disponível no seu plano.`;
  }
  return 'Você já usou o limite de hoje. Amanhã tem mais.';
}
