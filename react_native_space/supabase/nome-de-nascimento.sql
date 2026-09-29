-- ============================================================
-- Arcanus — o nome de nascimento mora no perfil
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
-- ============================================================
--
-- Item 18 do roadmap: "nome completo, hora e local de nascimento num lugar so,
-- pre-preenchendo as ferramentas". Hora e cidade entraram em 28/09
-- (`nascimento-no-perfil.sql`); falta o nome.
--
-- Por que uma coluna nova, e nao a `nome` que ja existe: sao coisas diferentes.
-- `nome` e como a pessoa quer ser chamada na tela — apelido, primeiro nome, nome
-- social. A numerologia precisa do nome de REGISTRO, com sobrenomes, como esta
-- na certidao: e dele que saem as letras que viram numero. Juntar os dois na
-- mesma coluna forcaria a pessoa a escolher entre ser chamada pelo nome que usa
-- e receber um mapa numerologico correto.
--
-- Fica no grupo `nascimento_*` de proposito: e o nome de nascimento, e essa e a
-- familia de campos que descreve o nascimento.
alter table public.perfis
  add column if not exists nascimento_nome text;

-- Nada de nome de uma letra nem de campo com so espaco. Nulo continua valendo:
-- e "ainda nao preencheu", e a tela pede quando precisar.
alter table public.perfis drop constraint if exists perfis_nascimento_nome_check;
alter table public.perfis add constraint perfis_nascimento_nome_check
  check (nascimento_nome is null or length(trim(nascimento_nome)) >= 3);

-- O grant e por coluna: sem acrescentar a nova aqui, a tela salvaria o resto e
-- perderia esta em silencio. Foi o que quase aconteceu com as tres de 28/09.
grant update (nome, avatar_url, data_nascimento, signo, caminho_espiritual,
              intencao, xp, nivel, ultima_consulta_em,
              nascimento_hora, nascimento_sem_hora, nascimento_cidade,
              nascimento_nome)
  on public.perfis to authenticated;

-- ------------------------------------------------------------
-- Conferencia depois de rodar
-- ------------------------------------------------------------
--   select column_name, data_type from information_schema.columns
--    where table_schema = 'public' and table_name = 'perfis'
--      and column_name like 'nascimento%';
--
--   select has_column_privilege('authenticated', 'public.perfis',
--                               'nascimento_nome', 'UPDATE') as pode_salvar;
