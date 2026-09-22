-- ============================================================
-- Arcanus — decisões do produto (aba Decisões do /manager)
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
-- Só super-admin lê e grava (RLS via public.is_super_admin()).
-- ============================================================

create table if not exists public.decisoes (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null check (length(trim(titulo)) > 0),
  contexto      text,
  link          text,
  status        text not null default 'aberta' check (status in ('aberta', 'decidida')),
  decidido_em   timestamptz,
  decidido_por  uuid references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por    uuid references auth.users(id) on delete set null
);

create table if not exists public.decisao_manifestacoes (
  id          uuid primary key default gen_random_uuid(),
  decisao_id  uuid not null references public.decisoes(id) on delete cascade,
  autor_id    uuid references auth.users(id) on delete set null,
  -- Nome gravado junto: o histórico não muda se a pessoa trocar o nome depois.
  autor_nome  text not null,
  posicao     text not null check (posicao in ('aprovo', 'nao_aprovo', 'comentario')),
  texto       text not null check (length(trim(texto)) > 0),
  criado_em   timestamptz not null default now()
);

create index if not exists idx_manifestacoes_decisao
  on public.decisao_manifestacoes (decisao_id, criado_em);

alter table public.decisoes enable row level security;
alter table public.decisao_manifestacoes enable row level security;

-- O Supabase dá todos os privilégios (inclusive TRUNCATE, que ignora a RLS) a anon
-- e authenticated em tabelas novas. Padrão fechado: tira tudo e devolve só o uso.
revoke all on public.decisoes from anon, authenticated;
revoke all on public.decisao_manifestacoes from anon, authenticated;
grant select, insert, update, delete on public.decisoes to authenticated;
-- Manifestação é registro: entra e fica. Sem update, sem delete, nem para admin.
grant select, insert on public.decisao_manifestacoes to authenticated;

drop policy if exists "decisoes super admin le" on public.decisoes;
create policy "decisoes super admin le"
  on public.decisoes for select to authenticated
  using (public.is_super_admin());

drop policy if exists "decisoes super admin cria" on public.decisoes;
create policy "decisoes super admin cria"
  on public.decisoes for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists "decisoes super admin edita" on public.decisoes;
create policy "decisoes super admin edita"
  on public.decisoes for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "decisoes super admin exclui" on public.decisoes;
create policy "decisoes super admin exclui"
  on public.decisoes for delete to authenticated
  using (public.is_super_admin());

drop policy if exists "manifestacoes super admin le" on public.decisao_manifestacoes;
create policy "manifestacoes super admin le"
  on public.decisao_manifestacoes for select to authenticated
  using (public.is_super_admin());

-- Decisão fechada não recebe manifestação nova: a regra é do banco, não da tela.
drop policy if exists "manifestacoes super admin cria em decisao aberta" on public.decisao_manifestacoes;
create policy "manifestacoes super admin cria em decisao aberta"
  on public.decisao_manifestacoes for insert to authenticated
  with check (
    public.is_super_admin()
    and exists (
      select 1 from public.decisoes d
       where d.id = decisao_id and d.status = 'aberta'
    )
  );

-- Carimbo de quando e de quem criou, preenchido pelo banco (o cliente não forja).
create or replace function public.decisoes_carimbar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  if (tg_op = 'INSERT') then
    new.criado_por = coalesce(new.criado_por, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists decisoes_carimbar on public.decisoes;
create trigger decisoes_carimbar
  before insert or update on public.decisoes
  for each row execute procedure public.decisoes_carimbar();

-- Conferência rápida depois de rodar:
--   select tablename, policyname from pg_policies
--    where tablename in ('decisoes', 'decisao_manifestacoes') order by tablename, policyname;
