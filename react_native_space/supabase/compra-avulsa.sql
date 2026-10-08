-- ------------------------------------------------------------
-- Compra avulsa: uma leitura de um produto, sem assinatura
-- ------------------------------------------------------------
-- POR QUE TABELA PRÓPRIA, e não uma coluna em `perfis`:
--
-- `perfis.consultas_restantes` é ZERADO e reescrito pelo webhook a cada
-- renovação (`stripe-webhook`, `consultas_restantes: cfg.cota_consultas`).
-- Crédito avulso somado ali sumiria na renovação seguinte, sem erro nenhum —
-- a pessoa pagaria e perderia.
--
-- UMA LINHA POR COMPRA, e não um contador: com validade por compra é preciso
-- saber qual crédito expira primeiro, e um contador perde isso. Também é o que
-- torna a auditoria possível, ligando cada venda à leitura que a gastou.

create table if not exists public.compras_avulsas (
  id                bigint generated always as identity primary key,
  usuario_id        uuid not null references auth.users(id) on delete cascade,
  -- 'mapa' | 'vocacao'. Texto, e não enum, pelo mesmo motivo de `consumo_ia`:
  -- abrir um produto novo não deve pedir migração de tipo.
  oraculo           text not null,
  -- A idempotência do webhook é garantia do BANCO, não do código. O Stripe
  -- repete a entrega, e repetir não pode vender duas vezes.
  stripe_session_id text not null unique,
  pago_em           timestamptz not null default now(),
  expira_em         timestamptz not null,
  consumido_em      timestamptz,
  -- A chave da leitura que gastou este crédito, para auditar venda contra entrega.
  consumido_chave   text
);

-- A consulta quente é "esta pessoa tem crédito deste produto agora?".
create index if not exists compras_avulsas_disponivel_idx
  on public.compras_avulsas (usuario_id, oraculo, expira_em)
  where consumido_em is null;

alter table public.compras_avulsas enable row level security;

-- A pessoa lê as PRÓPRIAS compras: a tela precisa dizer "você tem um Mapa
-- disponível até tal dia". Escrita é só do service_role — crédito que o cliente
-- pudesse inserir seria crédito de graça.
create policy "compras_avulsas: a pessoa le as suas"
  on public.compras_avulsas for select
  using (auth.uid() = usuario_id);

revoke insert, update, delete on public.compras_avulsas from anon, authenticated;
grant select, insert, update on public.compras_avulsas to service_role;
grant usage, select on sequence public.compras_avulsas_id_seq to service_role;

-- ------------------------------------------------------------
-- O preço de cada produto, fora do código
-- ------------------------------------------------------------
-- Mesmo princípio de `config_planos.stripe_price_id`: trocar preço é operação,
-- não deploy. Tabela separada porque `config_planos` é chaveada por PLANO, e
-- esta é por ORÁCULO.

create table if not exists public.precos_avulsos (
  oraculo         text primary key,
  stripe_price_id text not null,
  -- Permite tirar um produto de venda sem apagar a linha e perder o histórico.
  ativo           boolean not null default true,
  atualizado_em   timestamptz not null default now()
);

alter table public.precos_avulsos enable row level security;
revoke all on public.precos_avulsos from anon, authenticated;
grant select on public.precos_avulsos to service_role;
