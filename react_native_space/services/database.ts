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
