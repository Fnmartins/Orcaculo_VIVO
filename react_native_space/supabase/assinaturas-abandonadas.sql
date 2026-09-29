-- ============================================================
-- Arcanus — checkout desistido deixa de virar linha orfa
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
-- ============================================================
--
-- Item 33 do roadmap, parte "linhas pendentes orfas".
--
-- Cada checkout iniciado insere uma linha `pendente` em `assinaturas`. Quem
-- desiste no meio deixa essa linha para sempre: o webhook so mexe na linha da
-- sessao que foi paga, ninguem mais le pendente, e ninguem limpa. O acumulado nao
-- quebra nada hoje — e mente na hora de contar quantas compras houve, que e
-- exatamente o que o item 31 (auditoria de custo por plano) vai perguntar.
--
-- A solucao nao apaga nada. Compra desistida e informacao: marca `abandonado`.

-- ------------------------------------------------------------
-- 1. Antes de mudar: ver o que existe hoje
-- ------------------------------------------------------------
-- Rode isto primeiro, para saber o tamanho do acumulado:
--
--   select status, count(*) from public.assinaturas group by status order by 2 desc;
--
-- E para ver a restricao atual de status, se houver:
--
--   select conname, pg_get_constraintdef(oid)
--     from pg_constraint
--    where conrelid = 'public.assinaturas'::regclass and contype = 'c';

-- ------------------------------------------------------------
-- 2. O status novo passa a ser aceito
-- ------------------------------------------------------------
-- A tabela nasceu antes deste repositorio e pode ou nao ter `check` no status.
-- Recriar com a lista inteira funciona nos dois casos: se nao havia, passa a
-- haver; se havia, ganha o valor novo. Os quatro valores sao os que o codigo usa
-- hoje — `pendente` e `abandonado` no checkout, `ativo` e `cancelado` no webhook.
alter table public.assinaturas drop constraint if exists assinaturas_status_check;
alter table public.assinaturas add constraint assinaturas_status_check
  check (status in ('pendente', 'abandonado', 'ativo', 'cancelado'));

-- ------------------------------------------------------------
-- 3. O acumulado
-- ------------------------------------------------------------
-- Uma pendente por pessoa fica de pe: e a mais recente, que pode estar sendo paga
-- agora. Todas as anteriores da mesma pessoa viram abandonadas.
--
-- `criado_em` esta no filtro pelo nome. Se a coluna tiver outro nome nesta tabela,
-- este comando falha dizendo qual — e melhor falhar do que marcar a linha errada.
-- Os passos 2 e 4 nao dependem dele.
with mais_recente as (
  select distinct on (usuario_id) id
    from public.assinaturas
   where status = 'pendente'
   order by usuario_id, criado_em desc
)
update public.assinaturas
   set status = 'abandonado'
 where status = 'pendente'
   and id not in (select id from mais_recente);

-- ------------------------------------------------------------
-- 4. Para a arrumacao do checkout continuar barata
-- ------------------------------------------------------------
-- O checkout passa a marcar as pendentes da pessoa a cada compra nova, e esse
-- filtro e (usuario_id, status).
create index if not exists idx_assinaturas_usuario_status
  on public.assinaturas (usuario_id, status);

-- ------------------------------------------------------------
-- Conferencia depois de rodar
-- ------------------------------------------------------------
--   select status, count(*) from public.assinaturas group by status order by 2 desc;
--
-- Esperado: no maximo uma `pendente` por pessoa, e as antigas em `abandonado`.
