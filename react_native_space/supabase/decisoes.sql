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

-- Desenho mostrado junto da decisão, resolvido por components/previas/index.tsx.
-- Guarda identificador ('mesa-buzios'), não conteúdo: o desenho vive no código,
-- versionado junto com o app. Identificador desconhecido não mostra nada.
alter table public.decisoes add column if not exists previa text;

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

-- ============================================================
-- 24/09 — o que o conselho apontou na revisão da própria aba
-- ============================================================

-- 1) Fechar sem dizer o que ficou combinado tornava o registro inútil: o status
-- virava "decidida" e a decisão em si não existia em lugar nenhum. Agora o
-- banco recusa. NOT VALID não mexe em linhas já fechadas antes desta regra.
alter table public.decisoes add column if not exists decisao_final text;
alter table public.decisoes add column if not exists decidido_por_nome text;

alter table public.decisoes drop constraint if exists decisoes_decidida_tem_texto;
alter table public.decisoes add constraint decisoes_decidida_tem_texto
  check (
    status <> 'decidida'
    or (decisao_final is not null and length(trim(decisao_final)) > 0)
  ) not valid;

-- 2) Depois de fechada, nada muda. `using` olha a linha antiga e `with check` a
-- nova: fechar continua possível (aberta -> decidida), reescrever o título
-- depois do "aprovo" deixa de ser.
drop policy if exists "decisoes super admin edita" on public.decisoes;
create policy "decisoes super admin edita"
  on public.decisoes for update to authenticated
  using (public.is_super_admin() and status = 'aberta')
  with check (public.is_super_admin());

-- 3) Apagar decisão levava o fio junto, por causa do on delete cascade. A tela
-- nunca ofereceu isso; a permissão existia à toa.
revoke delete on public.decisoes from authenticated;
drop policy if exists "decisoes super admin exclui" on public.decisoes;

-- 4) Quem fechou e quando passam a ser carimbados pelo banco, com o nome
-- resolvido no perfil — o cliente não escolhe autoria.
create or replace function public.decisoes_carimbar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.atualizado_em = now();
  if (tg_op = 'INSERT') then
    new.criado_por = coalesce(new.criado_por, auth.uid());
  end if;
  if (tg_op = 'UPDATE' and new.status = 'decidida' and old.status is distinct from 'decidida') then
    new.decidido_por = auth.uid();
    new.decidido_em = coalesce(new.decidido_em, now());
    new.decidido_por_nome = coalesce(
      (select nullif(trim(p.nome), '') from public.perfis p where p.id = auth.uid()),
      'Admin'
    );
  end if;
  return new;
end;
$$;

-- 5) A manifestação é imutável, mas a assinatura vinha do cliente: um
-- super-admin podia gravar manifestação em nome do outro. Imutabilidade sem
-- autoria carimbada é imutabilidade de conteúdo não confiável.
create or replace function public.manifestacoes_carimbar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.autor_id = auth.uid();
  new.autor_nome = coalesce(
    (select nullif(trim(p.nome), '') from public.perfis p where p.id = auth.uid()),
    (select nullif(trim(p.email), '') from public.perfis p where p.id = auth.uid()),
    'Admin'
  );
  new.criado_em = now();
  return new;
end;
$$;

drop trigger if exists manifestacoes_carimbar on public.decisao_manifestacoes;
create trigger manifestacoes_carimbar
  before insert on public.decisao_manifestacoes
  for each row execute procedure public.manifestacoes_carimbar();

-- Conferência depois de rodar:
--   select column_name from information_schema.columns
--    where table_name = 'decisoes' and column_name in ('decisao_final','decidido_por_nome');
