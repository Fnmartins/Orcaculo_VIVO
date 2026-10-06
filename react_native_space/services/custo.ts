import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';
import type { ConsumoMedido, ConsumoPorOraculo, PrecoDeclarado } from '../utils/custoIA';

const FUNCAO = 'admin-custo';

export interface AuditoriaDeCusto {
  /** Primeiro dia da janela, 'YYYY-MM-DD'. */
  desde: string;
  dias: number;
  /**
   * Primeiro dia em que houve consumo MEDIDO (token ou caractere acima de zero).
   *
   * Nulo quando nada foi medido ainda. Antes de 29/09/2026 as colunas de consumo
   * não existiam, então há chamada registrada com token zero — e a tela precisa
   * dizer isso, senão custo baixo se lê como economia em vez de falta de dado.
   */
  medidoDesde: string | null;
  consumo: ConsumoMedido[];
  pessoasAtivas: Record<string, number>;
  assinantes: Record<string, number>;
  /**
   * O mesmo consumo cortado por PRODUTO, de `consumo_ia`.
   *
   * Vazio é resposta legítima e tem dois significados que a tela precisa separar:
   * ninguém usou IA no período, ou a leitura da tabela falhou — a function deixa
   * esse corte cair sem derrubar o resto, porque o custo por plano é a auditoria
   * principal.
   */
  porOraculo: ConsumoPorOraculo[];
  precos: PrecoDeclarado[];
}

/**
 * O consumo medido e os preços declarados, para o Painel montar a auditoria.
 *
 * A conta não acontece aqui nem no servidor: `utils/custoIA.ts` faz a
 * multiplicação, e é ela que tem teste. Aqui só a ida à rede.
 */
export async function lerAuditoriaDeCusto(dias = 30): Promise<AuditoriaDeCusto> {
  const { data, error } = await supabase.functions.invoke(FUNCAO, { body: { dias } });
  if (error) throw await erroDaFuncao(error);

  const corpo = (data ?? {}) as Partial<AuditoriaDeCusto>;
  return {
    desde: corpo.desde ?? '',
    dias: corpo.dias ?? dias,
    medidoDesde: corpo.medidoDesde ?? null,
    consumo: corpo.consumo ?? [],
    pessoasAtivas: corpo.pessoasAtivas ?? {},
    assinantes: corpo.assinantes ?? {},
    porOraculo: corpo.porOraculo ?? [],
    precos: corpo.precos ?? [],
  };
}
