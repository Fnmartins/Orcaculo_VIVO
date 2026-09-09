-- ============================================================
-- Arcanus — Lista de espera (pré-lançamento)
-- Rodar no SQL Editor do projeto Supabase rfdjukdbrtvvulaxbzwb.
-- Cria a tabela que a landing de lista de espera grava via REST.
-- ============================================================

create table if not exists public.lista_espera (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  origem     text,                       -- de qual página veio (ex.: 'lista-espera')
  idioma     text,                       -- navigator.language, p/ segmentar BR x internacional
  criado_em  timestamptz not null default now()
);

comment on table public.lista_espera is 'E-mails da lista de espera de fundadores do Arcanus (pré-lançamento).';

-- RLS: qualquer visitante (anon) pode INSERIR o próprio e-mail,
-- mas NINGUÉM lê/edita/apaga a lista pela API pública (sem policy de select).
alter table public.lista_espera enable row level security;

-- Privilégio de tabela (necessário além da policy quando o RLS está ligado).
grant insert on public.lista_espera to anon, authenticated;

drop policy if exists "waitlist_insert_publico" on public.lista_espera;
create policy "waitlist_insert_publico"
  on public.lista_espera
  for insert
  to anon, authenticated
  with check (true);

-- Para LER a lista depois: use o SQL Editor / service role no painel
-- (ex.: select email, idioma, criado_em from public.lista_espera order by criado_em desc;),
-- nunca a anon key no cliente — a policy acima de propósito não permite select público.
