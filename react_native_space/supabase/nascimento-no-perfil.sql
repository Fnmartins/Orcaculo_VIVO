-- ============================================================
-- Arcanus — os dados de nascimento moram no perfil
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
-- ============================================================
--
-- Decisao do dono em 28/09: o mapa e da CONTA, nao um formulario livre.
-- Guardar data, hora e cidade no perfil resolve duas coisas de uma vez:
--
-- 1. A pessoa para de redigitar tudo a cada visita — hoje o formulario nasce
--    vazio e ela preenche de novo toda vez.
-- 2. Fecha a porta de trocar os dados a cada geracao e tirar leitura para
--    terceiros. O mapa passa a ser o dela, vinculado a conta.
--
-- Consequencia conhecida e aceita: ninguem gera o mapa do filho ou do
-- parceiro. Sinastria, um dia, reabre isso de forma declarada — com dois mapas
-- assumidos, nao com um formulario que aceita qualquer coisa.

-- `data_nascimento` ja existe (a porta de idade da caixa de pergunta grava
-- nela). Faltam a hora e o lugar.
alter table public.perfis
  add column if not exists nascimento_hora text;

alter table public.perfis drop constraint if exists perfis_nascimento_hora_check;
alter table public.perfis add constraint perfis_nascimento_hora_check
  check (nascimento_hora is null or nascimento_hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- Nao saber a hora e uma RESPOSTA, nao um campo em branco.
--
-- Sem esta coluna, "ainda nao preencheu" e "nasceu e ninguem anotou a hora"
-- ficariam identicos — os dois com `nascimento_hora` nulo — e a tela
-- perguntaria de novo, para sempre, a quem ja respondeu que nao sabe.
alter table public.perfis
  add column if not exists nascimento_sem_hora boolean not null default false;

-- A cidade inteira, e nao so o identificador.
--
-- A base tem 36 mil cidades e cresce; guardar so o id faria a leitura depender
-- de a linha continuar existindo e com as mesmas coordenadas. O mapa e uma
-- fotografia de um instante num lugar: o lugar tem de vir junto, congelado.
-- Formato: {"id","nome","regiao","pais","lat","lon","fuso"}.
alter table public.perfis
  add column if not exists nascimento_cidade jsonb;

-- O grant e por coluna: sem acrescentar as tres aqui, a tela salvaria o resto
-- e perderia estas em silencio.
grant update (nome, avatar_url, data_nascimento, signo, caminho_espiritual,
              intencao, xp, nivel, ultima_consulta_em,
              nascimento_hora, nascimento_sem_hora, nascimento_cidade)
  on public.perfis to authenticated;

-- ------------------------------------------------------------
-- Conferencia depois de rodar
-- ------------------------------------------------------------
--   select column_name, data_type from information_schema.columns
--    where table_schema = 'public' and table_name = 'perfis'
--      and column_name like 'nascimento%';
--
--   select has_column_privilege('authenticated', 'public.perfis',
--                               'nascimento_cidade', 'UPDATE') as pode_salvar;
