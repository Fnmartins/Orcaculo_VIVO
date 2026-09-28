-- ============================================================
-- Arcanus — base de cidades de nascimento
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
--
-- Por que existe: a lista curada em data/cidades.ts tem 53 cidades, e o
-- Arcanus atende Brasil, Estados Unidos, Canadá e Europa. Santo Ângelo (RS)
-- não estava lá, e não havia como estar: lista escrita à mão não cobre
-- continente. Era o item M2 do conselho de 21/09 — a base do GeoNames.
--
-- A tabela é dado de referência público: todo mundo logado lê, ninguém do app
-- escreve. A carga entra pela service role, fora do app.
-- ============================================================

create table if not exists public.cidades (
  -- geonameid, o identificador do GeoNames. Texto porque é o que vem no
  -- arquivo, e porque não fazemos aritmética com ele.
  id         text primary key,
  nome       text not null,
  -- Sem acento e em minúsculas: é por esta coluna que a busca corre, para
  -- "santo angelo" achar "Santo Ângelo" sem depender de collation.
  nome_busca text not null,
  -- Estado, província ou região: 'RS', 'CA', 'Lisboa'.
  regiao     text,
  -- ISO de dois caracteres: 'BR', 'US', 'CA', 'PT'.
  pais       text not null,
  lat        double precision not null check (lat between -90 and 90),
  lon        double precision not null check (lon between -180 and 180),
  -- Nome IANA, que é o que permite saber o horário de verão da época.
  fuso       text not null,
  populacao  integer not null default 0
);

-- A busca é "começa com" e "contém", ordenada por população: quem digita
-- "santo" quer Santo André antes de Santo Antônio do Içá.
create index if not exists idx_cidades_busca on public.cidades (nome_busca text_pattern_ops);
create index if not exists idx_cidades_populacao on public.cidades (populacao desc);
create index if not exists idx_cidades_pais on public.cidades (pais, nome_busca text_pattern_ops);

alter table public.cidades enable row level security;

-- O Supabase dá todos os privilégios a anon e authenticated em tabela nova.
-- Aqui só leitura interessa; a carga entra pela service role.
revoke all on public.cidades from anon, authenticated;
grant select on public.cidades to authenticated;

drop policy if exists "cidades todos leem" on public.cidades;
create policy "cidades todos leem"
  on public.cidades for select to authenticated
  using (true);

-- ------------------------------------------------------------
-- Conferência, depois da carga
-- ------------------------------------------------------------
-- select count(*) from public.cidades;
-- select nome, regiao, pais, fuso from public.cidades where nome_busca like 'santo angelo%';
-- Esperado: false — o app não escreve cidade.
-- select has_table_privilege('authenticated', 'public.cidades', 'INSERT');

notify pgrst, 'reload schema';
