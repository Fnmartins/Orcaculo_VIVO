// supabase/functions/_shared/limites.ts
//
// A decisão de deixar ou não gastar uma chamada paga de IA.
//
// Puro e sem dependência, como escritas.ts e regras-acessos.ts, por dois
// motivos: o Jest do app testa (services/__tests__/limites.test.ts) e o tsc
// não engasga com import de Deno. A leitura das tabelas fica em quem chama.

export type TipoUso = 'imagem' | 'interpretacao' | 'pergunta';

/** Uma linha de public.configuracao_ia. */
export interface ConfiguracaoIA {
  imagem_ligada: boolean;
  interpretacao_ligada: boolean;
  pergunta_ligada: boolean;
  /** Zero quer dizer sem limite diário. */
  limite_dia: number;
}

export interface Veredito {
  permitido: boolean;
  /** Por que não passou — a tela diz coisas diferentes para cada caso. */
  motivo?: 'desligado' | 'limite_dia';
  usadoHoje: number;
  /** Nulo quer dizer sem limite: super-admin, ou plano com limite_dia = 0. */
  limiteDia: number | null;
}

const CAMPO: Record<TipoUso, keyof ConfiguracaoIA> = {
  imagem: 'imagem_ligada',
  interpretacao: 'interpretacao_ligada',
  pergunta: 'pergunta_ligada',
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
): Veredito {
  const usado = Number.isFinite(usadoHoje) && usadoHoje > 0 ? Math.floor(usadoHoje) : 0;
  if (semLimite || !config) {
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
