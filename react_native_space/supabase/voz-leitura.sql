-- ============================================================
-- Arcanus — leitura falada (Google Chirp 3 HD, voz Sadaltager)
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
-- ============================================================
--
-- Decisao fechada em 28/09 na aba Decisoes: a voz do app passa a ser
-- `pt-BR-Chirp3-HD-Sadaltager`, no lugar do `speechSynthesis` do navegador, que
-- o teste no iPhone descreveu como robotizado.
--
-- Vale para as tres telas que tem o botao Ouvir: buzios, consulta e mapa
-- astral. ElevenLabs ficou anotado para o futuro, quando houver base de
-- usuarios que pague a diferenca.

-- ------------------------------------------------------------
-- 1. `voz` entra como quarto tipo de uso
-- ------------------------------------------------------------
-- Em vez de contador proprio, a voz usa o mesmo caminho de imagem,
-- interpretacao e pergunta: `uso_ia` conta, `configuracao_ia` liga e limita. O
-- interruptor por plano do Painel passa a controlar a voz junto.
alter table public.uso_ia drop constraint if exists uso_ia_tipo_check;
alter table public.uso_ia add constraint uso_ia_tipo_check
  check (tipo in ('imagem', 'interpretacao', 'pergunta', 'voz'));

-- Ligada por padrao: o botao Ouvir ja existia e funcionava (mal, mas
-- funcionava). Um controle novo nao pode derrubar o que estava no ar — mesmo
-- principio do `config` nulo em `_shared/limites.ts`.
alter table public.configuracao_ia
  add column if not exists voz_ligada boolean not null default true;

-- O grant de update e por coluna; sem acrescentar `voz_ligada` aqui, o
-- interruptor do Painel salvaria tudo menos a voz, em silencio.
grant update (imagem_ligada, interpretacao_ligada, pergunta_ligada, voz_ligada, limite_dia, atualizado_em)
  on public.configuracao_ia to authenticated;

-- ------------------------------------------------------------
-- 2. Onde o audio gerado mora
-- ------------------------------------------------------------
-- **Privado**, ao contrario do bucket `vozes` das amostras. O audio de uma
-- leitura e a leitura da pessoa falada em voz alta: e conteudo dela. Nome por
-- hash seria dificil de adivinhar, mas "dificil" nao e o padrao que o resto do
-- projeto usa para dado pessoal. A function devolve URL assinada de curta
-- duracao, e so.
insert into storage.buckets (id, name, public)
values ('leituras-faladas', 'leituras-faladas', false)
on conflict (id) do update set public = false;

-- Nenhuma policy para `authenticated`: quem escreve e le e a Edge Function, com
-- service role, que passa por cima da RLS. Sem policy, ninguem mais alcanca.

-- ------------------------------------------------------------
-- 3. O cache
-- ------------------------------------------------------------
-- Chave: SHA-256 do texto junto com o nome da voz. Mesmo texto e mesma voz dao
-- o mesmo audio, entao ouvir de novo nao gasta chamada paga nem cota — e o
-- "gera uma vez e guarda" da regra comercial.
--
-- A tabela nao guarda o texto nem de quem e: so o hash. Duas leituras iguais de
-- pessoas diferentes compartilham o arquivo, e ninguem consegue voltar do hash
-- para o conteudo. Mesmo desenho do cache de interpretacao do mapa.
create table if not exists public.voz_cache (
  hash       text primary key,
  voz        text not null,
  arquivo    text not null,
  caracteres integer not null check (caracteres > 0),
  usos       integer not null default 1 check (usos > 0),
  criado_em  timestamptz not null default now(),
  ultimo_uso timestamptz not null default now()
);

create index if not exists idx_voz_cache_ultimo_uso
  on public.voz_cache (ultimo_uso desc);

alter table public.voz_cache enable row level security;

-- O Supabase da todos os privilegios (inclusive TRUNCATE, que ignora RLS) a
-- anon e authenticated em tabela nova. Aqui ninguem do app precisa de nada: a
-- function fala com a tabela pela service role. Padrao fechado, sem excecao.
revoke all on public.voz_cache from anon, authenticated;

-- ------------------------------------------------------------
-- 4. Conferencia depois de rodar
-- ------------------------------------------------------------
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'public.uso_ia'::regclass and conname = 'uso_ia_tipo_check';
--   select plano, voz_ligada, limite_dia from public.configuracao_ia order by plano;
--   select id, public from storage.buckets where id = 'leituras-faladas';
--   select count(*) from public.voz_cache;
