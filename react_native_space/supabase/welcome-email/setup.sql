-- ============================================================
-- ARCANUS — E-mail de boas-vindas pos-confirmacao
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
--
-- NAO HA PLACEHOLDER NESTE ARQUIVO. Rode como esta, do comeco ao fim.
-- ============================================================
--
-- ## Por que a versao anterior foi jogada fora
--
-- Ela pedia para substituir `<<PROJECT_REF>>` e `<<WELCOME_HOOK_SECRET>>` a mao
-- antes de rodar. Quem esquecesse criava um trigger que chama a function com o
-- segredo literal `<<WELCOME_HOOK_SECRET>>`: a function responde 401, ninguem
-- recebe e-mail, o cadastro continua funcionando e NAO APARECE ERRO EM LUGAR
-- NENHUM. Placeholder que roda e defeito com data marcada.
--
-- ## Um valor, um lugar
--
-- O segredo nasce aqui dentro, fica no Vault, e a Edge Function passou a busca-lo
-- de la por RPC em vez de ler variavel de ambiente. Isso elimina a segunda copia
-- — antes o mesmo valor tinha de existir tambem em `supabase secrets`, e duas
-- copias que precisam ser iguais divergem um dia. Divergir agora e impossivel,
-- nao improvavel.
--
-- Consequencia: ninguem precisa ver o segredo. Nem voce, nem eu, nem o
-- clipboard. Ele e sorteado pelo banco e lido so por quem tem a chave de servico.

-- ------------------------------------------------------------
-- 0) O Vault precisa existir
-- ------------------------------------------------------------
-- Falha com instrucao, em vez de continuar e quebrar tres passos adiante.
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'vault') then
    raise exception 'O Vault nao esta habilitado neste projeto. Ative a extensao "supabase_vault" em Database > Extensions e rode este arquivo de novo.';
  end if;
end $$;

-- ------------------------------------------------------------
-- 1) Extensao para o Postgres fazer chamada HTTP
-- ------------------------------------------------------------
-- Se der erro de permissao, habilite pg_net em Database > Extensions.
create extension if not exists pg_net;

-- ------------------------------------------------------------
-- 2) Idempotencia do envio
-- ------------------------------------------------------------
-- Sem esta coluna, um reenvio do trigger mandaria o e-mail duas vezes.
alter table public.perfis
  add column if not exists boas_vindas_enviada boolean not null default false;

-- ------------------------------------------------------------
-- 3) O segredo, sorteado pelo banco
-- ------------------------------------------------------------
-- Dois UUID v4 sem hifen: 64 caracteres hexadecimais, ~244 bits de entropia, e
-- `gen_random_uuid()` e nativo do Postgres 13+ — nenhuma extensao a mais para
-- depender.
--
-- So cria se ainda nao existe. Rodar este arquivo de novo NAO troca o segredo:
-- trocar sem querer derrubaria o envio sem aviso.
do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'welcome_hook_secret'
  ) then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'welcome_hook_secret',
      'Segredo compartilhado entre o trigger ao_confirmar_email e a Edge Function enviar-boas-vindas'
    );
  end if;
end $$;

-- ------------------------------------------------------------
-- 4) Como a Edge Function le o segredo
-- ------------------------------------------------------------
-- `security definer` porque `vault.decrypted_secrets` e restrita ao dono; o
-- `search_path` vazio obriga a qualificar tudo, para ninguem conseguir plantar um
-- `decrypted_secrets` falso num schema que venha antes no caminho.
create or replace function public.segredo_boas_vindas()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  valor text;
begin
  select decrypted_secret into valor
    from vault.decrypted_secrets
   where name = 'welcome_hook_secret';
  return valor;
end;
$$;

-- O `create function` do Postgres da EXECUTE a PUBLIC por padrao — e aqui isso
-- significaria qualquer pessoa logada no app lendo o segredo. Tira de todos e
-- devolve so para a chave de servico, que e quem a function usa.
revoke execute on function public.segredo_boas_vindas() from public;
revoke execute on function public.segredo_boas_vindas() from anon, authenticated;
grant execute on function public.segredo_boas_vindas() to service_role;

-- ------------------------------------------------------------
-- 5) O trigger
-- ------------------------------------------------------------
-- Le o segredo direto do Vault (esta dentro do banco, nao precisa de RPC) e
-- chama a function passando id, e-mail e nome.
create or replace function public.disparar_boas_vindas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  segredo text;
begin
  select decrypted_secret into segredo
    from vault.decrypted_secrets
   where name = 'welcome_hook_secret';

  -- Segredo ausente NAO derruba a confirmacao de e-mail: se este trigger
  -- lancasse excecao, a pessoa nao conseguiria confirmar a conta. Avisa no log e
  -- segue — o cadastro importa mais que o e-mail de boas-vindas.
  if segredo is null or length(trim(segredo)) = 0 then
    raise warning 'boas-vindas: segredo welcome_hook_secret ausente no Vault; nada enviado para %', new.id;
    return new;
  end if;

  perform net.http_post(
    url     := 'https://rfdjukdbrtvvulaxbzwb.supabase.co/functions/v1/enviar-boas-vindas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', segredo
    ),
    body := jsonb_build_object(
      'id', new.id,
      'email', new.email,
      'nome', (select p.nome from public.perfis p where p.id = new.id)
    )
  );
  return new;
end;
$$;

-- So na transicao de confirmacao: nao dispara em login nem em outro update.
drop trigger if exists ao_confirmar_email on auth.users;
create trigger ao_confirmar_email
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.disparar_boas_vindas();

-- ------------------------------------------------------------
-- Conferencia depois de rodar
-- ------------------------------------------------------------
-- Nenhuma destas linhas mostra o segredo. A primeira confirma que ele existe e
-- tem o tamanho esperado; as outras, que as pecas estao no lugar.
--
--   select name, length(decrypted_secret) as tamanho, created_at
--     from vault.decrypted_secrets where name = 'welcome_hook_secret';
--   -- esperado: uma linha, tamanho 64
--
--   select tgname, tgenabled from pg_trigger
--    where tgrelid = 'auth.users'::regclass and tgname = 'ao_confirmar_email';
--   -- esperado: uma linha, tgenabled = 'O' (habilitado)
--
--   select has_function_privilege('service_role', 'public.segredo_boas_vindas()', 'EXECUTE') as servico_le,
--          has_function_privilege('authenticated', 'public.segredo_boas_vindas()', 'EXECUTE') as logado_le;
--   -- esperado: servico_le = true, logado_le = FALSE
