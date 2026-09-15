// Travas de dar/tirar super-admin. Módulo puro (sem imports) para ser usado
// pela Edge Function admin-acessos (Deno) e testado pelo Jest do app.

export interface MudancaAdmin {
  solicitanteId: string;
  alvoId: string;
  tornarAdmin: boolean;
  alvoEhAdmin: boolean;
  totalAdmins: number;
}

export type ResultadoValidacao = { ok: true } | { ok: false; erro: string };

export const ERRO_REMOVER_SI_MESMO = 'Você não pode remover o seu próprio acesso de admin.';
export const ERRO_ULTIMO_ADMIN = 'O Arcanus precisa de pelo menos um admin.';

export function validarMudancaAdmin(m: MudancaAdmin): ResultadoValidacao {
  // Promover, ou "rebaixar" quem já não é admin, nunca tranca ninguém para fora.
  if (m.tornarAdmin || !m.alvoEhAdmin) return { ok: true };
  if (m.alvoId === m.solicitanteId) return { ok: false, erro: ERRO_REMOVER_SI_MESMO };
  if (m.totalAdmins <= 1) return { ok: false, erro: ERRO_ULTIMO_ADMIN };
  return { ok: true };
}
