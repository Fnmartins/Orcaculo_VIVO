-- ============================================================
-- Arcanus — colunas graváveis de public.perfis (padrão fechado)
-- APLICADO EM PRODUÇÃO EM 15/09/2026 (SQL Editor, projeto rfdjukdbrtvvulaxbzwb).
-- Idempotente: rodar de novo não muda nada.
--
-- Problema corrigido: a policy "Usuário edita só o próprio perfil" não limita
-- colunas e o Supabase dá UPDATE na tabela inteira a anon/authenticated. Qualquer
-- usuário logado gravava is_super_admin, plano e stripe_customer_id na própria linha.
--
-- Regra: o app só grava as colunas listadas no GRANT. Todo o resto — e qualquer
-- coluna criada no futuro — só muda por service role (Edge Functions).
-- Coluna nova de perfil que o usuário edita (ex.: perfil rico) precisa de
-- "grant update (coluna) on public.perfis to authenticated" na migração dela.
--
-- A ordem importa: revogar o privilégio da TABELA também apaga os de COLUNA,
-- então o revoke vem antes do grant.
-- ============================================================

revoke insert, update, delete, truncate, references, trigger
  on public.perfis from anon, authenticated;

grant update (nome, avatar_url, data_nascimento, signo, caminho_espiritual,
              intencao, xp, nivel, ultima_consulta_em)
  on public.perfis to authenticated;

-- Conferência (deve voltar FECHADA e true):
-- select case when has_column_privilege('authenticated', 'public.perfis', 'is_super_admin', 'UPDATE')
--             then 'ABERTA' else 'FECHADA' end as falha,
--        has_column_privilege('authenticated', 'public.perfis', 'nome', 'UPDATE') as nome_editavel;

-- ROLLBACK (reabre a falha — só em emergência, e corrigir em seguida):
-- grant update on public.perfis to authenticated;
