-- ============================================================
-- Arcanus — roadmap interno (aba Roadmap do /manager)
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
-- Só super-admin lê e grava (RLS via public.is_super_admin()).
-- Substitui o site/roadmap.html (senha no cliente, conteúdo público no GitHub).
-- ============================================================

create table if not exists public.roadmap_itens (
  id             uuid primary key default gen_random_uuid(),
  fase           text not null check (length(trim(fase)) > 0),
  titulo         text not null check (length(trim(titulo)) > 0),
  descricao      text,
  status         text not null default 'todo' check (status in ('todo', 'run', 'ok', 'block')),
  ordem          int  not null default 0,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null
);

alter table public.roadmap_itens enable row level security;

-- O Supabase dá todos os privilégios (inclusive TRUNCATE, que ignora a RLS) a anon e
-- authenticated em tabelas novas do schema public. Padrão fechado: tira tudo e devolve
-- só o que o app usa.
revoke all on public.roadmap_itens from anon, authenticated;
grant select, insert, update, delete on public.roadmap_itens to authenticated;

drop policy if exists "roadmap super admin le" on public.roadmap_itens;
create policy "roadmap super admin le"
  on public.roadmap_itens for select to authenticated
  using (public.is_super_admin());

drop policy if exists "roadmap super admin cria" on public.roadmap_itens;
create policy "roadmap super admin cria"
  on public.roadmap_itens for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists "roadmap super admin edita" on public.roadmap_itens;
create policy "roadmap super admin edita"
  on public.roadmap_itens for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "roadmap super admin exclui" on public.roadmap_itens;
create policy "roadmap super admin exclui"
  on public.roadmap_itens for delete to authenticated
  using (public.is_super_admin());

-- Carimbo de quem/quando, preenchido pelo banco (o cliente não forja).
create or replace function public.roadmap_carimbar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  new.atualizado_por = auth.uid();
  return new;
end;
$$;

drop trigger if exists roadmap_itens_carimbar on public.roadmap_itens;
create trigger roadmap_itens_carimbar
  before insert or update on public.roadmap_itens
  for each row execute procedure public.roadmap_carimbar();

-- Carga inicial: os 20 itens do site/roadmap.html (versão de 14/09). Só se vazia.
insert into public.roadmap_itens (fase, titulo, descricao, status, ordem)
select v.fase, v.titulo, v.descricao, v.status, v.ordem
from (values
  ('Marca & Produto', 'Rebrand Oráculo Vivo → Arcanus', 'Nome, telas, scheme e e-mails trocados em todo o app e deployados.', 'ok', 1),
  ('Marca & Produto', '6 oráculos no app', 'Tarô, búzios, numerologia, mapa astral, lei da atração e leitura de imagem.', 'ok', 2),
  ('Marca & Produto', 'Identidade visual do site', 'Landing e roadmap na paleta e nas fontes da marca.', 'ok', 3),
  ('Infra & Backend', 'Supabase próprio (auth + banco)', 'Conta do Fabiano, RLS corrigido, cadastro ponta a ponta funcionando.', 'ok', 4),
  ('Infra & Backend', 'Deploy web (Vercel + Expo)', 'App no ar; build no servidor, root directory corrigido.', 'ok', 5),
  ('Infra & Backend', 'Recuperação de senha na web', 'Tela de nova senha e URLs de retorno do Supabase corrigidas (11/09).', 'ok', 6),
  ('Pagamento (Stripe)', 'Migração para Stripe', 'Assinatura recorrente multi-moeda BRL/USD/EUR/CAD, webhook endurecido. No ar desde 10/09.', 'ok', 7),
  ('Pagamento (Stripe)', 'Painel de planos (/manager)', 'Super-admin cria e atualiza preços na Stripe sem mexer em código.', 'ok', 8),
  ('Pagamento (Stripe)', 'Teste em test mode', 'Portal do cliente pronto; 1 de 3 planos cadastrado. Faltam Explorador, Mestre e o roteiro de compra, renovação e cancelamento.', 'run', 9),
  ('Pagamento (Stripe)', 'Go-live', 'Chaves live, planos recadastrados em live, 1 compra e 1 renovação reais.', 'todo', 10),
  ('E-mail & Domínio', 'Site e app no domínio', 'Site em arcanus.com.br, app em app.arcanus.com.br. Migração em andamento.', 'run', 11),
  ('E-mail & Domínio', 'Resend + SMTP + templates', 'Domínio verificado, remetente contato@arcanus.com.br, e-mails com a marca.', 'ok', 12),
  ('E-mail & Domínio', 'E-mail de boas-vindas', 'Ligar a função que envia o e-mail no cadastro.', 'todo', 13),
  ('E-mail & Domínio', 'Receber contato@arcanus.com.br', 'Encaminhar para o Gmail; o endereço já aparece nos Termos.', 'todo', 14),
  ('Site & Marketing', 'Landing institucional', 'Pronta; publicação junto com a migração do domínio.', 'run', 15),
  ('Site & Marketing', 'Estratégia de marketing', 'Personas, posicionamento, copy, canais e playbook de lançamento.', 'ok', 16),
  ('Site & Marketing', 'Campanha de lançamento', 'Depois do go-live do pagamento, com oferta de fundador.', 'todo', 17),
  ('App / Web — polimento', 'Perfil rico', 'Nome completo, hora e local de nascimento num lugar só, pré-preenchendo as ferramentas.', 'todo', 18),
  ('App / Web — polimento', 'SEO / Open Graph', 'Título, descrição e imagem de compartilhamento do app.', 'todo', 19),
  ('App / Web — polimento', 'Exclusão de conta real', 'Implementar o fluxo de deleção (LGPD/lojas).', 'todo', 20)
) as v(fase, titulo, descricao, status, ordem)
where not exists (select 1 from public.roadmap_itens);
