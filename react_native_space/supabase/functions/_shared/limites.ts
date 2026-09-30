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
  /** Quando o acesso venceu, para a mensagem dizer a data. */
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
 */
export function decidirUso(
  tipo: TipoUso,
  config: ConfiguracaoIA | null,
  usadoHoje: number,
  semLimite: boolean,
  acesso: AcessoDoPlano,
): Veredito {
  const usado = Number.isFinite(usadoHoje) && usadoHoje > 0 ? Math.floor(usadoHoje) : 0;
  if (semLimite || !config) {
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
