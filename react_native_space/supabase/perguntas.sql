-- ============================================================
-- Arcanus — caixa de pergunta, denúncia de conteúdo de IA e uso por plano
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
--
-- RODAR ISTO ANTES de publicar a function ia-pergunta e antes do deploy do
-- app. Em 23/09 a aba Decisões quebrou porque o app pediu uma coluna que
-- ainda não existia; a ordem é banco primeiro, sempre.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Consentimento para guardar a pergunta
-- ------------------------------------------------------------
-- Fica no perfil, não no aparelho: precisa valer em qualquer aparelho e
-- precisa poder ser revogado. Desligado por padrão — quem não disse nada
-- não autorizou nada.
alter table public.perfis
  add column if not exists consentimento_perguntas boolean not null default false;

-- Coluna nova de perfil precisa de grant explícito. Nunca rodar
-- `grant update on public.perfis to authenticated`: foi o que reabriu a
-- falha de escrita em 15/09.
grant update (consentimento_perguntas) on public.perfis to authenticated;

-- ------------------------------------------------------------
-- 2. As perguntas guardadas — sem dono
-- ------------------------------------------------------------
-- Não existe coluna de usuário aqui, e é o ponto todo da tabela. A data é
-- `date`, não `timestamptz`: com hora e segundo daria para cruzar esta linha
-- com o contador de uso e descobrir quem perguntou. Sem a hora, não dá.
create table if not exists public.perguntas_anonimas (
  id        uuid primary key default gen_random_uuid(),
  oraculo   text not null check (oraculo in ('tarot', 'buzios')),
  -- Só o símbolo que saiu (odu ou cartas), nunca nome, intenção ou perfil.
  contexto  text check (contexto is null or length(contexto) <= 200),
  pergunta  text not null check (length(trim(pergunta)) > 0 and length(pergunta) <= 400),
  dia       date not null default current_date
);

create index if not exists idx_perguntas_dia
  on public.perguntas_anonimas (dia, oraculo);

-- ------------------------------------------------------------
-- 3. Denúncia de conteúdo gerado por IA
-- ------------------------------------------------------------
-- Exigência de loja, e antes disso é o único caminho de volta quando o
-- modelo escreve algo que não devia. Aqui o autor **fica**: denúncia sem
-- remetente não pode ser respondida.
create table if not exists public.denuncias_ia (
  id        uuid primary key default gen_random_uuid(),
  origem    text not null check (origem in ('pergunta', 'interpretacao', 'imagem')),
  oraculo   text check (oraculo is null or length(oraculo) <= 40),
  -- O texto como a pessoa leu: sem ele não há o que investigar.
  conteudo  text not null check (length(trim(conteudo)) > 0 and length(conteudo) <= 4000),
  motivo    text check (motivo is null or length(motivo) <= 500),
  autor_id  uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  resolvida boolean not null default false
);

create index if not exists idx_denuncias_abertas
  on public.denuncias_ia (resolvida, criado_em desc);

-- ------------------------------------------------------------
-- 4. Contador de uso por dia
-- ------------------------------------------------------------
-- Uma linha por pessoa, dia e tipo. É o que o semáforo lê para dizer quanto
-- resta, e o que as functions leem antes de gastar chamada paga.
create table if not exists public.uso_ia (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  dia        date not null default current_date,
  tipo       text not null check (tipo in ('imagem', 'interpretacao', 'pergunta')),
  quantidade integer not null default 0 check (quantidade >= 0),
  primary key (usuario_id, dia, tipo)
);

-- ------------------------------------------------------------
-- 5. O interruptor por plano
-- ------------------------------------------------------------
-- `limite_dia = 0` quer dizer sem limite diário (o limite do período continua
-- sendo perfis.consultas_restantes). Desligar um recurso aqui desliga no
-- servidor, não só na tela — é o que faz disso um interruptor de verdade.
create table if not exists public.configuracao_ia (
  plano                text primary key
                         check (plano in ('gratuito', 'iniciante', 'explorador', 'mestre')),
  imagem_ligada        boolean not null default false,
  interpretacao_ligada boolean not null default true,
  pergunta_ligada      boolean not null default true,
  limite_dia           integer not null default 0 check (limite_dia >= 0),
  atualizado_em        timestamptz not null default now()
);

insert into public.configuracao_ia (plano, imagem_ligada, interpretacao_ligada, pergunta_ligada, limite_dia)
values
  ('gratuito',   false, true, true, 2),
  ('iniciante',  false, true, true, 5),
  ('explorador', true,  true, true, 20),
  ('mestre',     true,  true, true, 50)
on conflict (plano) do nothing;

-- ------------------------------------------------------------
-- 6. RLS e privilégios — fechado por padrão
-- ------------------------------------------------------------
alter table public.perguntas_anonimas enable row level security;
alter table public.denuncias_ia       enable row level security;
alter table public.uso_ia             enable row level security;
alter table public.configuracao_ia    enable row level security;

-- O Supabase dá tudo (inclusive TRUNCATE, que ignora RLS) a anon e
-- authenticated em tabela nova. Tira tudo e devolve só o necessário.
revoke all on public.perguntas_anonimas from anon, authenticated;
revoke all on public.denuncias_ia       from anon, authenticated;
revoke all on public.uso_ia             from anon, authenticated;
revoke all on public.configuracao_ia    from anon, authenticated;

-- Pergunta guardada: ninguém do app lê nem escreve. Quem grava é a function,
-- com a service role, que passa por cima de RLS. Super-admin lê pelo painel.
grant select on public.perguntas_anonimas to authenticated;

-- Denúncia: a pessoa cria a dela e vê a dela. Resolver é do super-admin.
grant select, insert on public.denuncias_ia to authenticated;
grant update (resolvida) on public.denuncias_ia to authenticated;

-- Uso: a pessoa lê o próprio contador (o semáforo). Escrever é da function.
grant select on public.uso_ia to authenticated;

-- Configuração: todo mundo logado lê (a tela precisa saber o que está ligado);
-- mudar é do super-admin.
grant select on public.configuracao_ia to authenticated;
grant update (imagem_ligada, interpretacao_ligada, pergunta_ligada, limite_dia, atualizado_em)
  on public.configuracao_ia to authenticated;

drop policy if exists "perguntas super admin le" on public.perguntas_anonimas;
create policy "perguntas super admin le"
  on public.perguntas_anonimas for select to authenticated
  using (public.is_super_admin());

drop policy if exists "denuncia cria a propria" on public.denuncias_ia;
create policy "denuncia cria a propria"
  on public.denuncias_ia for insert to authenticated
  with check (auth.uid() = autor_id);

drop policy if exists "denuncia le a propria ou tudo se admin" on public.denuncias_ia;
create policy "denuncia le a propria ou tudo se admin"
  on public.denuncias_ia for select to authenticated
  using (auth.uid() = autor_id or public.is_super_admin());

drop policy if exists "denuncia so admin resolve" on public.denuncias_ia;
create policy "denuncia so admin resolve"
  on public.denuncias_ia for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "uso le o proprio" on public.uso_ia;
create policy "uso le o proprio"
  on public.uso_ia for select to authenticated
  using (auth.uid() = usuario_id or public.is_super_admin());

drop policy if exists "configuracao todos leem" on public.configuracao_ia;
create policy "configuracao todos leem"
  on public.configuracao_ia for select to authenticated
  using (true);

drop policy if exists "configuracao so admin muda" on public.configuracao_ia;
create policy "configuracao so admin muda"
  on public.configuracao_ia for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ------------------------------------------------------------
-- 7. Conferência
-- ------------------------------------------------------------
-- Esperado: perguntas_anonimas sem nenhuma coluna com 'usuario' ou 'autor'.
-- select column_name from information_schema.columns
--  where table_name = 'perguntas_anonimas' order by ordinal_position;
--
-- Esperado: false — o cliente não escreve pergunta guardada.
-- select has_table_privilege('authenticated', 'public.perguntas_anonimas', 'INSERT');

notify pgrst, 'reload schema';
