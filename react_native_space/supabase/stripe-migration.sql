-- supabase/stripe-migration.sql
-- Migração aditiva e idempotente para a Stripe. Rodar no SQL Editor do
-- projeto Supabase rfdjukdbrtvvulaxbzwb. Seguro rodar mais de uma vez.

alter table perfis      add column if not exists stripe_customer_id text;

alter table assinaturas add column if not exists stripe_subscription_id text;
alter table assinaturas add column if not exists stripe_customer_id text;
alter table assinaturas add column if not exists stripe_checkout_session_id text;
alter table assinaturas add column if not exists moeda text;

-- O valor agora vive na Stripe (currency_options). Deixa de ser obrigatório.
alter table assinaturas alter column valor drop not null;

-- Dedupe idempotente de eventos de webhook.
create table if not exists webhook_eventos (
  id         text primary key,
  criado_em  timestamptz not null default now()
);
alter table webhook_eventos enable row level security;
-- Sem policies: apenas o service role (webhook) acessa; anon fica bloqueado.

-- Índices dos lookups do webhook/checkout (idempotentes): o webhook localiza a
-- assinatura por session/subscription e o checkout/portal buscam o customer.
create index if not exists idx_assinaturas_stripe_subscription_id
  on assinaturas (stripe_subscription_id);
create index if not exists idx_assinaturas_stripe_checkout_session_id
  on assinaturas (stripe_checkout_session_id);
create index if not exists idx_perfis_stripe_customer_id
  on perfis (stripe_customer_id);
