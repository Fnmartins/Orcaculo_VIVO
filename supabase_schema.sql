-- ============================================================
-- ORÁCULO VIVO — Schema do Banco de Dados (Supabase/PostgreSQL)
-- Execute este SQL no painel do Supabase: SQL Editor > New Query
-- ============================================================

-- Habilitar extensão para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- TIPO ENUM para roles
-- ============================================================
create type public.role_usuario as enum (
  'usuario',
  'moderador',
  'editor',
  'admin',
  'super_admin'
);

-- ============================================================
-- TABELA: perfis
-- Criada automaticamente após o cadastro via trigger
-- ============================================================
create table public.perfis (
  id uuid references auth.users on delete cascade not null primary key,
  nome text,
  email text,
  avatar_url text,
  data_nascimento date,
  signo text,
  caminho_espiritual text,
  intencao text,
  plano text not null default 'gratuito', -- 'gratuito' | 'iniciante' | 'explorador' | 'mestre'
  plano_valido_ate timestamptz,
  consultas_restantes int not null default 1,
  nivel int not null default 1,
  xp int not null default 0,
  streak int not null default 0,
  ultima_consulta_em date,
  role public.role_usuario not null default 'usuario',
  is_super_admin boolean not null default false,
  permissions text[] default array[]::text[],
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Função auxiliar: true se o usuário atual é super_admin.
-- SECURITY DEFINER lê perfis sem disparar o RLS (evita recursão infinita 42P17).
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

-- RLS para perfis: usuário vê/edita o próprio perfil;
-- super_admin vê e edita todos os perfis
alter table public.perfis enable row level security;

create policy "Usuário vê só o próprio perfil"
  on public.perfis for select using (
    auth.uid() = id
    or public.is_super_admin()
  );

create policy "Usuário edita só o próprio perfil"
  on public.perfis for update using (
    auth.uid() = id
    or public.is_super_admin()
  );

-- Trigger para criar perfil automaticamente ao cadastrar
create or replace function public.criar_perfil_novo_usuario()
returns trigger as $$
begin
  insert into public.perfis (id, email, nome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute procedure public.criar_perfil_novo_usuario();

-- ============================================================
-- TABELA: consultas
-- Histórico de todas as consultas realizadas
-- ============================================================
create table public.consultas (
  id uuid default uuid_generate_v4() primary key,
  usuario_id uuid references public.perfis(id) on delete cascade not null,
  tipo text not null, -- 'tarot' | 'buzios' | 'numerologia' | 'mapa_astral' | 'matriz_destino' | 'cafe' | 'quiromancia' | 'lei_atracao'
  pergunta text,
  resultado jsonb not null,
  resumo text,
  favorita boolean default false,
  criado_em timestamptz default now()
);

alter table public.consultas enable row level security;

create policy "Usuário vê só as próprias consultas"
  on public.consultas for select using (auth.uid() = usuario_id);

create policy "Usuário insere as próprias consultas"
  on public.consultas for insert with check (auth.uid() = usuario_id);

create policy "Usuário edita as próprias consultas"
  on public.consultas for update using (auth.uid() = usuario_id);

create policy "Usuário deleta as próprias consultas"
  on public.consultas for delete using (auth.uid() = usuario_id);

-- ============================================================
-- TABELA: assinaturas
-- Registro de pagamentos e assinaturas
-- ============================================================
create table public.assinaturas (
  id uuid default uuid_generate_v4() primary key,
  usuario_id uuid references public.perfis(id) on delete cascade not null,
  plano text not null, -- 'iniciante' | 'explorador' | 'mestre'
  status text not null default 'pendente', -- 'pendente' | 'ativo' | 'cancelado' | 'expirado'
  mp_preference_id text, -- ID da preferência do Mercado Pago
  mp_payment_id text,    -- ID do pagamento confirmado
  valor numeric(10,2) not null,
  periodo text not null default 'mensal', -- 'mensal' | 'anual'
  inicio_em timestamptz,
  expira_em timestamptz,
  criado_em timestamptz default now()
);

alter table public.assinaturas enable row level security;

create policy "Usuário vê só as próprias assinaturas"
  on public.assinaturas for select using (auth.uid() = usuario_id);

create policy "Usuário insere as próprias assinaturas"
  on public.assinaturas for insert with check (auth.uid() = usuario_id);

-- ============================================================
-- TABELA: desejos_lei_atracao
-- Lista de desejos da Lei da Atração por usuário
-- ============================================================
create table public.desejos (
  id uuid default uuid_generate_v4() primary key,
  usuario_id uuid references public.perfis(id) on delete cascade not null,
  titulo text not null,
  descricao text,
  categoria text, -- 'amor' | 'trabalho' | 'saude' | 'espiritualidade' | 'financas'
  status text default 'ativo', -- 'ativo' | 'manifestado' | 'arquivado'
  afirmacoes text[],
  criado_em timestamptz default now(),
  manifestado_em timestamptz
);

alter table public.desejos enable row level security;

create policy "Usuário vê só os próprios desejos"
  on public.desejos for all using (auth.uid() = usuario_id);

-- ============================================================
-- FUNÇÃO: atualizar campo atualizado_em automaticamente
-- ============================================================
create or replace function public.set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger perfis_atualizado_em
  before update on public.perfis
  for each row execute procedure public.set_atualizado_em();

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
create index consultas_usuario_id_idx on public.consultas(usuario_id);
create index consultas_tipo_idx on public.consultas(tipo);
create index consultas_criado_em_idx on public.consultas(criado_em desc);
create index assinaturas_usuario_id_idx on public.assinaturas(usuario_id);
create index assinaturas_status_idx on public.assinaturas(status);
create index perfis_role_idx on public.perfis(role);
create index perfis_is_super_admin_idx on public.perfis(is_super_admin);

-- ============================================================
-- SUPER ADMIN: RLS — super_admin vê todos os dados de qualquer tabela
-- ============================================================

-- Consultas: super_admin pode ver/editar/deletar qualquer consulta
create policy "Super admin vê todas as consultas"
  on public.consultas for select using (
    auth.uid() = usuario_id
    or public.is_super_admin()
  );

create policy "Super admin deleta qualquer consulta"
  on public.consultas for delete using (
    auth.uid() = usuario_id
    or public.is_super_admin()
  );

-- Assinaturas: super_admin vê todas
create policy "Super admin vê todas as assinaturas"
  on public.assinaturas for select using (
    auth.uid() = usuario_id
    or public.is_super_admin()
  );

-- Desejos: super_admin vê todos
create policy "Super admin vê todos os desejos"
  on public.desejos for select using (
    auth.uid() = usuario_id
    or public.is_super_admin()
  );

-- ============================================================
-- MIGRAÇÃO (rodar em banco existente sem as colunas novas)
-- ============================================================
-- Se o banco já existe, rode ESTE bloco separadamente no SQL Editor:
--
-- ALTER TABLE public.perfis
--   ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'usuario',
--   ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false,
--   ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT array[]::text[];
--
-- CREATE INDEX IF NOT EXISTS perfis_role_idx ON public.perfis(role);
-- CREATE INDEX IF NOT EXISTS perfis_is_super_admin_idx ON public.perfis(is_super_admin);
--
-- Depois, DROP e RE-CREATE as policies de RLS conforme acima.

-- ============================================================
-- SEED: Criar contas de Super Admin com acesso Pro (mestre)
-- ============================================================
-- PASSO 1: Crie os usuários no Supabase Auth (Dashboard > Authentication > Users)
--         com as senhas desejadas. NÃO use SQL para criar em auth.users
--         pois o Supabase gerencia isso via Dashboard ou API.
--
-- PASSO 2: Após criar os usuários, rode este SQL para promover a super_admin:
--
-- UPDATE public.perfis
-- SET
--   role = 'super_admin',
--   is_super_admin = true,
--   plano = 'mestre',
--   plano_valido_ate = '2099-12-31T23:59:59+00:00',
--   consultas_restantes = 999999,
--   permissions = array[
--     'read:*', 'edit:*', 'delete:*', 'manage:*',
--     'read:consultas', 'edit:consultas', 'delete:consultas',
--     'read:usuarios', 'edit:usuarios', 'delete:usuarios',
--     'read:pagamentos', 'manage:pagamentos',
--     'read:assinaturas', 'manage:assinaturas',
--     'read:analytics', 'manage:staff'
--   ]
-- WHERE email IN (
--   'fabiano.n.martins@gmail.com',
--   'marciogayerdacosta@gmail.com'
-- );
