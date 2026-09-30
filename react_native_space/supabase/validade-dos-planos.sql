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
