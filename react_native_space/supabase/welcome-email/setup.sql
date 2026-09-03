-- ============================================================
-- ARCANUS — E-mail de boas-vindas pos-confirmacao
-- Roda no SQL Editor do projeto rfdjukdbrtvvulaxbzwb.
--
-- ANTES de rodar, substitua os dois placeholders abaixo:
--   <<PROJECT_REF>>          -> ref do projeto Supabase (ex.: rfdjukdbrtvvulaxbzwb)
--   <<WELCOME_HOOK_SECRET>>  -> um segredo forte, o MESMO que voce vai setar em
--                              supabase secrets set WELCOME_HOOK_SECRET=...
--
-- Este trigger dispara a Edge Function `enviar-boas-vindas` EXATAMENTE uma vez,
-- no instante em que o usuario confirma o e-mail (email_confirmed_at NULL ->
-- preenchido). Nao dispara em logins nem em outros updates.
-- ============================================================

-- 1) Extensao para chamadas HTTP a partir do Postgres.
--    (Se der erro de permissao, habilite pg_net em Database > Extensions.)
create extension if not exists pg_net;

-- 2) Idempotencia: coluna que marca se as boas-vindas ja foram enviadas.
alter table public.perfis
  add column if not exists boas_vindas_enviada boolean not null default false;

-- 3) Funcao do trigger: chama a Edge Function passando id, email e nome.
create or replace function public.disparar_boas_vindas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url     := 'https://<<PROJECT_REF>>.supabase.co/functions/v1/enviar-boas-vindas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '<<WELCOME_HOOK_SECRET>>'
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

-- 4) Trigger: so na transicao de confirmacao do e-mail.
drop trigger if exists ao_confirmar_email on auth.users;
create trigger ao_confirmar_email
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.disparar_boas_vindas();
