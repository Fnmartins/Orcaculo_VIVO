-- ============================================================
-- Arcanus — amostras de voz e votação, dentro do Painel
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
-- ============================================================
--
-- Por que existe: a comparação das vozes candidatas morava numa página fora da
-- plataforma, que exigia conta de outro serviço para abrir. O sócio teria de
-- receber acesso a uma conta pessoal só para dar uma nota — o que na prática
-- significa que ele não vota.
--
-- É a mesma lição que `components/previas/index.tsx` já registrava sobre a
-- prévia da mesa de búzios: decidir por link que o outro não abre é o mesmo que
-- não mostrar nada. Agora o áudio e o voto moram aqui.

-- ------------------------------------------------------------
-- 1. Bucket das amostras
-- ------------------------------------------------------------
-- Público na leitura: o app toca o mp3 por URL pública (expo-av, como
-- `services/somMistico.ts` já faz). Fechar o bucket obrigaria a gerar URL
-- assinada para cada uma das 41 amostras, a cada abertura da tela.
-- São amostras de texto-para-voz lendo um trecho de exemplo: não há dado de
-- ninguém dentro delas.
insert into storage.buckets (id, name, public)
values ('vozes', 'vozes', true)
on conflict (id) do update set public = true;

-- A URL pública dispensa RLS, mas LISTAR o bucket pela API passa por ela — e é
-- listando que a tela descobre quais vozes existem. Sem esta policy a tela abre
-- vazia, sem erro nenhum.
drop policy if exists "vozes admin lista" on storage.objects;
create policy "vozes admin lista"
  on storage.objects for select to authenticated
  using (bucket_id = 'vozes' and public.is_super_admin());

-- Enviar e substituir amostra e do super-admin. Pelo painel do Supabase o envio
-- usa service role e passa por cima disto; a policy existe para um envio pelo
-- app ou por script com o token de um admin tambem funcionar.
drop policy if exists "vozes admin envia" on storage.objects;
create policy "vozes admin envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'vozes' and public.is_super_admin());

drop policy if exists "vozes admin substitui" on storage.objects;
create policy "vozes admin substitui"
  on storage.objects for update to authenticated
  using (bucket_id = 'vozes' and public.is_super_admin())
  with check (bucket_id = 'vozes' and public.is_super_admin());

-- ------------------------------------------------------------
-- 2. Votos
-- ------------------------------------------------------------
-- Uma linha por pessoa por voz. A chave composta e o que garante que votar de
-- novo corrige a propria nota em vez de empilhar uma segunda.
create table if not exists public.voz_votos (
  voz           text not null check (length(trim(voz)) > 0),
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  nota          smallint not null check (nota between 1 and 5),
  atualizado_em timestamptz not null default now(),
  primary key (voz, usuario_id)
);

-- A tela ordena o podio por media; sem indice ela varreria a tabela a cada
-- abertura. Sao poucas linhas hoje, mas o indice custa nada.
create index if not exists idx_voz_votos_voz on public.voz_votos (voz);

-- O nome de quem votou, gravado junto com o voto.
--
-- Mesmo padrao de `decisao_manifestacoes.autor_nome`, e pelo mesmo motivo: o
-- registro nao muda se a pessoa trocar o nome depois. Acrescentado em 28/09,
-- depois de a tela mostrar so o numero da nota do outro, sem dizer de quem era
-- — o que fazia "nao gostou" (nota 1) parecer igual a "nem ouviu" (em branco).
--
-- Anulavel de proposito: os votos que ja existiam nao tem como saber o nome, e
-- a tela chama essa pessoa de "o outro" ate ela votar de novo. Inventar um nome
-- seria pior que nao ter.
alter table public.voz_votos add column if not exists autor_nome text;

alter table public.voz_votos enable row level security;

-- O Supabase da todos os privilegios (inclusive TRUNCATE, que ignora a RLS) a
-- anon e authenticated em tabela nova. Padrao fechado: tira tudo e devolve so o
-- necessario.
revoke all on public.voz_votos from anon, authenticated;
grant select, insert, update, delete on public.voz_votos to authenticated;

-- Quem decide voz e quem entra no Painel, e o Painel inteiro e de super-admin.
-- Todos leem todos os votos: a graca e ver a nota do outro ao lado da sua.
drop policy if exists "voz votos admin le" on public.voz_votos;
create policy "voz votos admin le"
  on public.voz_votos for select to authenticated
  using (public.is_super_admin());

-- Escrever, so a propria linha. Sem o `usuario_id = auth.uid()` um admin
-- poderia gravar nota no nome do outro — e a votacao perderia o sentido.
drop policy if exists "voz votos dono cria" on public.voz_votos;
create policy "voz votos dono cria"
  on public.voz_votos for insert to authenticated
  with check (public.is_super_admin() and usuario_id = auth.uid());

drop policy if exists "voz votos dono muda" on public.voz_votos;
create policy "voz votos dono muda"
  on public.voz_votos for update to authenticated
  using (public.is_super_admin() and usuario_id = auth.uid())
  with check (public.is_super_admin() and usuario_id = auth.uid());

drop policy if exists "voz votos dono apaga" on public.voz_votos;
create policy "voz votos dono apaga"
  on public.voz_votos for delete to authenticated
  using (public.is_super_admin() and usuario_id = auth.uid());

-- ------------------------------------------------------------
-- 3. Ligar a decisao a tela
-- ------------------------------------------------------------
-- `decisoes.previa` guarda um identificador que o app resolve para um
-- componente (components/previas/index.tsx). Identificador desconhecido nao
-- mostra nada, entao esta linha so tem efeito depois do deploy que registra
-- 'vozes' la.
update public.decisoes
   set previa = 'vozes'
 where titulo = 'Qual voz o Arcanus vai ter';

-- ------------------------------------------------------------
-- 4. Conferencia depois de rodar
-- ------------------------------------------------------------
--   select id, public from storage.buckets where id = 'vozes';
--   select policyname from pg_policies
--    where tablename = 'objects' and policyname like 'vozes%';
--   select policyname from pg_policies where tablename = 'voz_votos';
--   select titulo, previa from public.decisoes
--    where titulo = 'Qual voz o Arcanus vai ter';
