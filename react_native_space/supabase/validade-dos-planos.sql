-- ============================================================
-- Arcanus — a validade dos planos passa a valer
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
-- ============================================================
--
-- A partir desta entrega, `plano_valido_ate` nula significa SEM ACESSO a IA.
-- Antes ela era gravada e nunca conferida, entao havia contas com nulo — todas no
-- gratuito, nenhuma pagante. Sem este update, elas perderiam acesso no instante do
-- deploy.
--
-- **Rodar ANTES do deploy das functions.** Na ordem inversa, as contas existentes
-- ficariam sem acesso pelos minutos entre uma coisa e outra.
--
-- Dez dias espelham o teste que o item 2 do conselho vai implantar.
update public.perfis
   set plano_valido_ate = now() + interval '10 days'
 where plano_valido_ate is null
returning id, plano, plano_valido_ate;

-- Conferencia: nenhuma linha deve sobrar com nulo.
--   select count(*) as sem_validade from public.perfis where plano_valido_ate is null;
--   -- esperado: 0

-- ============================================================
-- Passo 2 — a proxima conta tambem nasce com validade
-- ============================================================
--
-- Sem isto, o passo 1 conserta so as linhas que existem AGORA, e o proximo cadastro
-- volta ao estado de data nula: zero IA, mais a frase "Seu acesso terminou", que e
-- falsa para quem acabou de se cadastrar. Os dez dias sao os que o conselho decidiu
-- para o teste, os mesmos do passo 1.
--
-- Isto e uma ponte, nao o item 2: quando a jornada do teste existir, ela passa a
-- escolher as datas e este default pode sair.
alter table public.perfis
  alter column plano_valido_ate set default (now() + interval '10 days');

-- Conferencia: o default tem de aparecer aqui.
--   select column_default from information_schema.columns
--    where table_name = 'perfis' and column_name = 'plano_valido_ate';
