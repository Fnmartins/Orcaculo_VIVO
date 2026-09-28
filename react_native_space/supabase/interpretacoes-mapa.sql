-- ============================================================
-- Arcanus — leituras de mapa astral já escritas
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
--
-- Por que existe: o mapa é determinístico. Data, hora e cidade de nascimento
-- não mudam, então o céu daquele instante não muda, e a leitura da combinação
-- não precisa ser escrita duas vezes. O custo deixa de ser por leitura e passa
-- a ser por mapa que existe no mundo — quem abrir o próprio mapa dez vezes
-- paga uma.
--
-- **Não há dado de nascimento aqui, e não há dono.** A chave é o resumo
-- (SHA-256) das POSIÇÕES do céu, que a function calcula. Duas pessoas nascidas
-- no mesmo minuto e no mesmo lugar têm o mesmo mapa — astrologicamente é o
-- mesmo céu — e compartilham a mesma linha sem que nada ligue uma à outra.
-- ============================================================

create table if not exists public.interpretacoes_mapa (
  chave     text primary key,
  -- O JSON com titulo, narrativa, forca, tensao e conselho.
  conteudo  jsonb not null,
  -- Quantas vezes esta leitura foi reaproveitada. É a medida de quanto o
  -- cache economiza; sem ela a decisão de manter isto seria no escuro.
  usos      integer not null default 1,
  criado_em timestamptz not null default now()
);

alter table public.interpretacoes_mapa enable row level security;

-- Fechada para o app inteiro: quem lê e escreve é a Edge Function, com a
-- service role, que passa por cima de RLS. Nenhum cliente escreve aqui.
revoke all on public.interpretacoes_mapa from anon, authenticated;

grant select on public.interpretacoes_mapa to authenticated;

drop policy if exists "interpretacoes super admin le" on public.interpretacoes_mapa;
create policy "interpretacoes super admin le"
  on public.interpretacoes_mapa for select to authenticated
  using (public.is_super_admin());

-- ------------------------------------------------------------
-- Conferência
-- ------------------------------------------------------------
-- Quantas leituras existem e quanto o reaproveitamento economizou:
-- select count(*) as leituras, sum(usos) as aberturas,
--        sum(usos) - count(*) as economizadas
--   from public.interpretacoes_mapa;
--
-- Esperado: nenhuma coluna com data, hora, cidade, usuário ou nome.
-- select column_name from information_schema.columns
--  where table_name = 'interpretacoes_mapa' order by ordinal_position;

notify pgrst, 'reload schema';
