import { supabase } from './supabase';

export interface ConsultaSalvar {
  usuario_id: string;
  tipo: 'tarot' | 'buzios' | 'numerologia' | 'mapa_astral' | 'matriz_destino' | 'cafe' | 'quiromancia' | 'lei_atracao';
  pergunta?: string;
  resultado: object;
  resumo?: string;
}

export interface Consulta extends ConsultaSalvar {
  id: string;
  favorita: boolean;
  criado_em: string;
}

export const DatabaseServico = {
  // ── CONSULTAS ──────────────────────────────────────────────
  async salvarConsulta(dados: ConsultaSalvar): Promise<Consulta> {
    const { data, error } = await supabase
      .from('consultas')
      .insert(dados)
      .select()
      .single();
    if (error) throw error;
    return data as Consulta;
  },

  async listarConsultas(usuarioId: string, limite = 20): Promise<Consulta[]> {
    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('criado_em', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return (data ?? []) as Consulta[];
  },

  async listarConsultasPorTipo(usuarioId: string, tipo: ConsultaSalvar['tipo']): Promise<Consulta[]> {
    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('tipo', tipo)
      .order('criado_em', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Consulta[];
  },

  async alternarFavorito(consultaId: string, favorita: boolean): Promise<void> {
    const { error } = await supabase
      .from('consultas')
      .update({ favorita })
      .eq('id', consultaId);
    if (error) throw error;
  },

  async deletarConsulta(consultaId: string): Promise<void> {
    const { error } = await supabase
      .from('consultas')
      .delete()
      .eq('id', consultaId);
    if (error) throw error;
  },

  async consultaHoje(usuarioId: string, tipo: ConsultaSalvar['tipo']): Promise<Consulta | null> {
    const hoje = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('consultas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('tipo', tipo)
      .gte('criado_em', `${hoje}T00:00:00`)
      .limit(1)
      .single();
    return data as Consulta | null;
  },

  // ── ASSINATURAS ────────────────────────────────────────────
  async criarAssinatura(dados: {
    usuario_id: string;
    plano: string;
    valor: number;
    periodo: string;
    mp_preference_id?: string;
  }) {
    const { data, error } = await supabase
      .from('assinaturas')
      .insert({ ...dados, status: 'pendente' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async confirmarAssinatura(assinaturaId: string, mpPaymentId: string, plano: string, usuarioId: string) {
    const agora = new Date();
    const expiracao = new Date(agora);
    expiracao.setMonth(expiracao.getMonth() + 1);

    await supabase
      .from('assinaturas')
      .update({
        status: 'ativo',
        mp_payment_id: mpPaymentId,
        inicio_em: agora.toISOString(),
        expira_em: expiracao.toISOString(),
      })
      .eq('id', assinaturaId);

    const consultasMap: Record<string, number> = {
      iniciante: 4,
      explorador: 999,
      mestre: 999,
    };

    await supabase
      .from('perfis')
      .update({
        plano,
        plano_valido_ate: expiracao.toISOString(),
        consultas_restantes: consultasMap[plano] ?? 1,
      })
      .eq('id', usuarioId);
  },

  // ── XP / NÍVEL ─────────────────────────────────────────────
  async adicionarXP(usuarioId: string, xpGanho: number) {
    const { data: perfil } = await supabase
      .from('perfis')
      .select('xp, nivel')
      .eq('id', usuarioId)
      .single();

    if (!perfil) return;

    const novoXP = (perfil.xp ?? 0) + xpGanho;
    const xpParaNivel = (perfil.nivel ?? 1) * 100;
    const novoNivel = novoXP >= xpParaNivel ? (perfil.nivel ?? 1) + 1 : (perfil.nivel ?? 1);
    const xpFinal = novoXP >= xpParaNivel ? novoXP - xpParaNivel : novoXP;

    await supabase
      .from('perfis')
      .update({ xp: xpFinal, nivel: novoNivel, ultima_consulta_em: new Date().toISOString().split('T')[0] })
      .eq('id', usuarioId);
  },

  // ── DESEJOS (Lei da Atração) ───────────────────────────────
  async salvarDesejo(dados: { usuario_id: string; titulo: string; descricao?: string; categoria?: string; afirmacoes?: string[] }) {
    const { data, error } = await supabase.from('desejos').insert(dados).select().single();
    if (error) throw error;
    return data;
  },

  async listarDesejos(usuarioId: string) {
    const { data } = await supabase
      .from('desejos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('status', 'ativo')
      .order('criado_em', { ascending: false });
    return data ?? [];
  },
};
