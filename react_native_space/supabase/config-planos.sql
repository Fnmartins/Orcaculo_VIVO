-- config_planos: fonte de verdade de preço/cota/Price ID por plano.
-- Aditiva e idempotente. Preços em CENTAVOS (int). Escrita só via service role.
create table if not exists public.config_planos (
  id                text primary key check (id in ('iniciante','explorador','mestre')),
  cota_consultas    int  not null check (cota_consultas > 0),
  preco_brl         int  not null check (preco_brl > 0),
  preco_usd         int  not null check (preco_usd > 0),
  preco_eur         int  not null check (preco_eur > 0),
  preco_cad         int  not null check (preco_cad > 0),
  stripe_product_id text,
  stripe_price_id   text,
  atualizado_em     timestamptz not null default now(),
  atualizado_por    uuid references auth.users(id) on delete set null
);

alter table public.config_planos enable row level security;

-- Leitura pública (o /planos precisa exibir; preços e Price IDs não são segredo).
drop policy if exists "config_planos leitura publica" on public.config_planos;
create policy "config_planos leitura publica"
  on public.config_planos for select
  to anon, authenticated
  using (true);
-- Sem policy de insert/update/delete → escrita apenas via service role (Edge Function).

-- Seed com os valores atuais de services/stripe-planos.ts (em centavos); stripe_* = null.
insert into public.config_planos
  (id, cota_consultas, preco_brl, preco_usd, preco_eur, preco_cad) values
  ('iniciante',    4,  2990,   690,   690,   890),
  ('explorador', 999,  7990,  1690,  1690,  2190),
  ('mestre',     999, 19990,  3990,  3990,  5490)
on conflict (id) do nothing;
