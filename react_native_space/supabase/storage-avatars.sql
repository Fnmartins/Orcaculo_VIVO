-- ============================================================
-- Arcanus — bucket das fotos de perfil
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
-- ============================================================
--
-- Descoberto em 24/09: o bucket nunca existiu. A tela de perfil tentava enviar
-- desde sempre e o app respondia "não foi possível, tente novamente", sem dizer
-- que o destino não estava lá. Trocar a foto nunca funcionou em produção.
--
-- Este arquivo existe para o bucket e as permissões não viverem apenas na mão
-- de quem rodou o SQL uma vez.

-- Público na leitura: a tela mostra o avatar por URL pública (getPublicUrl).
-- Fechar o bucket exigiria o app passar a gerar URL assinada.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- O arquivo é `avatar_<id do usuário>.<extensão>`, na raiz do bucket. As regras
-- abaixo amarram o nome ao dono: ninguém sobrescreve a foto de outra pessoa.
drop policy if exists "avatars dono envia" on storage.objects;
create policy "avatars dono envia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and starts_with(name, 'avatar_' || auth.uid()::text || '.')
  );

-- `upsert` vira UPDATE quando o arquivo já existe — trocar a foto pela segunda
-- vez depende desta.
drop policy if exists "avatars dono substitui" on storage.objects;
create policy "avatars dono substitui"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and starts_with(name, 'avatar_' || auth.uid()::text || '.')
  )
  with check (
    bucket_id = 'avatars'
    and starts_with(name, 'avatar_' || auth.uid()::text || '.')
  );

-- Sem esta, o envio grava e mesmo assim volta como erro: a API lê o registro do
-- arquivo depois de gravar, e a leitura barrada derruba a resposta inteira.
-- Foi exatamente o que aconteceu em 24/09, depois de o bucket já existir.
drop policy if exists "avatars leitura autenticada" on storage.objects;
create policy "avatars leitura autenticada"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

-- Apagar não é concedido a ninguém no cliente: a exclusão de conta remove o
-- avatar pela Edge Function `excluir-conta`, com service role, que passa por
-- cima da RLS.

-- Conferência depois de rodar:
--   select id, public from storage.buckets where id = 'avatars';
--   select policyname from pg_policies
--    where tablename = 'objects' and policyname like 'avatars%';
