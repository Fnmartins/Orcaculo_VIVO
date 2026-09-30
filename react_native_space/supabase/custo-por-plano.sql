-- ============================================================
-- Arcanus — custo de IA por plano, medido em vez de estimado
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
-- ============================================================
--
-- Item 31 do roadmap.
--
-- ## O que faltava
--
-- `uso_ia` conta CHAMADAS: (usuario_id, dia, tipo, quantidade). Chamada nao e
-- custo — uma interpretacao de mapa gasta muito mais que uma pergunta curta, e
-- duas interpretacoes do mesmo tipo podem diferir em varias vezes. As functions
-- ja recebiam `usage.input_tokens` e `usage.output_tokens` da Anthropic, e faziam
-- duas coisas com eles: logar no console e devolver ao cliente. Nada guardava.
--
-- Entao qualquer auditoria hoje seria estimativa sobre media inventada. Depois
-- disto ela e medida.
--
-- ## Por que somar no dia, e nao guardar cada chamada
--
-- Custo e linear em tokens: somar por (usuario, dia, tipo) nao perde nenhuma
-- informacao de custo, e mantem a tabela do tamanho que ja tem. Guardar linha por
-- chamada serviria para estudar distribuicao — outra pergunta, outro dia.

-- ------------------------------------------------------------
-- 1) O consumo passa a ser guardado
-- ------------------------------------------------------------
-- `bigint` porque token soma rapido, e estouro de `integer` seria silencioso.
alter table public.uso_ia
  add column if not exists tokens_entrada bigint not null default 0
    check (tokens_entrada >= 0);
alter table public.uso_ia
  add column if not exists tokens_saida bigint not null default 0
    check (tokens_saida >= 0);
-- A voz nao usa token: a Google cobra por caractere sintetizado.
alter table public.uso_ia
  add column if not exists caracteres bigint not null default 0
    check (caracteres >= 0);

-- ------------------------------------------------------------
-- 2) A contagem vira atomica
-- ------------------------------------------------------------
-- Antes, `registrarUso` lia quanto a pessoa havia usado e gravava esse numero
-- mais um. Duas chamadas ao mesmo tempo liam 3 e gravavam 4 — uma chamada
-- desaparecia da conta, e com ela o limite diario ficava mais frouxo do que o
-- plano diz. Isto e dinheiro, nao estatistica.
--
-- Aqui o banco soma, com `on conflict do update`, e a corrida deixa de existir.
-- `p_dia` vem de fora, e nao de `current_date`, de proposito. Quem LE o contador
-- para decidir o limite e o TypeScript, com o dia dele; se o banco escolhesse o
-- dia aqui e os dois discordassem de fuso, a leitura olharia uma linha e a
-- gravacao outra — o limite diario ficaria frouxo, e em silencio. Um dia, uma
-- fonte.
create or replace function public.contar_uso_ia(
  p_usuario    uuid,
  p_dia        date,
  p_tipo       text,
  p_entrada    bigint default 0,
  p_saida      bigint default 0,
  p_caracteres bigint default 0
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.uso_ia (usuario_id, dia, tipo, quantidade,
                             tokens_entrada, tokens_saida, caracteres)
  values (p_usuario, p_dia, p_tipo, 1,
          greatest(coalesce(p_entrada, 0), 0),
          greatest(coalesce(p_saida, 0), 0),
          greatest(coalesce(p_caracteres, 0), 0))
  on conflict (usuario_id, dia, tipo) do update
     set quantidade     = public.uso_ia.quantidade     + 1,
         tokens_entrada = public.uso_ia.tokens_entrada + excluded.tokens_entrada,
         tokens_saida   = public.uso_ia.tokens_saida   + excluded.tokens_saida,
         caracteres     = public.uso_ia.caracteres     + excluded.caracteres;
$$;

-- Quem conta uso e a Edge Function, com a chave de servico. Ninguem logado no app
-- pode inflar o proprio contador nem o de outra pessoa.
revoke execute on function public.contar_uso_ia(uuid, date, text, bigint, bigint, bigint) from public;
revoke execute on function public.contar_uso_ia(uuid, date, text, bigint, bigint, bigint) from anon, authenticated;
grant execute on function public.contar_uso_ia(uuid, date, text, bigint, bigint, bigint) to service_role;

-- ------------------------------------------------------------
-- 3) Os precos, declarados e editaveis
-- ------------------------------------------------------------
-- Preco de fornecedor muda, e nenhum deles avisa este repositorio. Numero de
-- preco dentro do codigo envelhece em silencio e faz a auditoria mentir com
-- confianca. Aqui ele e DADO: tem data de confirmacao e fonte, e corrigir custa um
-- `update`, nao um deploy.
create table if not exists public.precos_ia (
  chave            text primary key,
  descricao        text not null,
  dolar_por_milhao numeric not null check (dolar_por_milhao >= 0),
  confirmado_em    date not null,
  fonte            text
);

insert into public.precos_ia (chave, descricao, dolar_por_milhao, confirmado_em, fonte)
values
  ('modelo-entrada', 'Tokens de entrada do claude-opus-5, por milhao',
   5.00, '2026-09-29', 'Tabela de precos da Anthropic'),
  ('modelo-saida', 'Tokens de saida do claude-opus-5, por milhao',
   25.00, '2026-09-29', 'Tabela de precos da Anthropic'),
  ('voz-caractere', 'Caracteres sintetizados no Chirp 3 HD, por milhao',
   10.00, '2026-09-29', 'https://cloud.google.com/text-to-speech/pricing — CONFERIR: a pagina veio truncada na leitura automatica')
on conflict (chave) do nothing;

alter table public.precos_ia enable row level security;
-- Quem le e a Edge Function, com a chave de servico, que ignora RLS. O app nao
-- precisa destes numeros, e preco de custo nao e assunto de quem assina.
revoke all on public.precos_ia from anon, authenticated;

-- ------------------------------------------------------------
-- 4) Conferencia depois de rodar
-- ------------------------------------------------------------
--   select column_name, data_type from information_schema.columns
--    where table_schema = 'public' and table_name = 'uso_ia'
--    order by ordinal_position;
--   -- esperado: as tres colunas novas, todas bigint
--
--   select chave, dolar_por_milhao, confirmado_em from public.precos_ia order by chave;
--   -- esperado: tres linhas
--
--   select has_function_privilege('authenticated',
--            'public.contar_uso_ia(uuid, date, text, bigint, bigint, bigint)', 'EXECUTE') as logado_conta;
--   -- esperado: FALSE
--
-- O historico continua de pe: as colunas novas nascem em zero, entao o custo
-- MEDIDO comeca hoje, e a tela precisa dizer isso em vez de mostrar zero como se
-- fosse consumo zero.
--   select tipo, sum(quantidade) as chamadas, sum(tokens_entrada) as entrada
--     from public.uso_ia group by tipo order by 2 desc;
