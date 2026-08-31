-- ============================================================
-- ORÁCULO VIVO — Correção de recursão infinita no RLS (erro 42P17)
-- Rode este bloco no SQL Editor do Supabase (projeto rfdjukdbrtvvulaxbzwb).
--
-- Problema: as políticas de super_admin faziam "select ... from perfis"
-- DENTRO da própria política de perfis, causando recursão infinita.
-- Solução: uma função SECURITY DEFINER que lê perfis sem disparar o RLS.
-- ============================================================

-- 1) Função auxiliar: retorna true se o usuário atual é super_admin.
--    SECURITY DEFINER faz a leitura rodar como dono da função, ignorando o
--    RLS de perfis (quebra a recursão). STABLE + search_path fixo por segurança.
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select p.is_super_admin from public.perfis p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated, anon, service_role;

-- 2) perfis — recriar as políticas sem o subselect recursivo
drop policy if exists "Usuário vê só o próprio perfil" on public.perfis;
create policy "Usuário vê só o próprio perfil"
  on public.perfis for select using (
    auth.uid() = id or public.is_super_admin()
  );

drop policy if exists "Usuário edita só o próprio perfil" on public.perfis;
create policy "Usuário edita só o próprio perfil"
  on public.perfis for update using (
    auth.uid() = id or public.is_super_admin()
  );

-- 3) consultas — super_admin via função
drop policy if exists "Super admin vê todas as consultas" on public.consultas;
create policy "Super admin vê todas as consultas"
  on public.consultas for select using (
    auth.uid() = usuario_id or public.is_super_admin()
  );

drop policy if exists "Super admin deleta qualquer consulta" on public.consultas;
create policy "Super admin deleta qualquer consulta"
  on public.consultas for delete using (
    auth.uid() = usuario_id or public.is_super_admin()
  );

-- 4) assinaturas — super_admin via função
drop policy if exists "Super admin vê todas as assinaturas" on public.assinaturas;
create policy "Super admin vê todas as assinaturas"
  on public.assinaturas for select using (
    auth.uid() = usuario_id or public.is_super_admin()
  );

-- 5) desejos — super_admin via função
drop policy if exists "Super admin vê todos os desejos" on public.desejos;
create policy "Super admin vê todos os desejos"
  on public.desejos for select using (
    auth.uid() = usuario_id or public.is_super_admin()
  );
