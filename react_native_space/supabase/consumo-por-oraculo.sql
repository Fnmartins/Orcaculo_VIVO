-- ------------------------------------------------------------
-- Consumo de IA por ORÁCULO, para medir custo por produto
-- ------------------------------------------------------------
-- A aba Custo já sabe dizer quanto custa uma "interpretação". O que ela não sabe é
-- quanto custa uma Cruz Celta contra um Mapa dos Arcanos — e a diferença é grande,
-- porque uma manda dez cartas com material e a outra manda uma data reduzida a
-- números. Sem esse corte não dá para pensar em preço avulso por item.
--
-- POR QUE UMA TABELA NOVA, e não uma coluna em `uso_ia`:
--
-- `uso_ia` é a tabela da COTA. `conferirUso` a lê com `maybeSingle()` na chave
-- (usuário, dia, tipo). Acrescentar o oráculo mudaria a granularidade: onde hoje
-- existe uma linha passariam a existir várias, e aquela leitura veria só uma —
-- afrouxando o limite diário em silêncio, sem erro em lugar nenhum. Medição não pode
-- pôr em risco o caminho que decide acesso pago.
--
-- Esta tabela é append-only e serve só para somar depois. Se a gravação falhar, a
-- leitura que a pessoa já tem na tela não pode cair por causa dela — é a mesma
-- escolha que `registrarUso` já faz com a contagem da cota.

create table if not exists public.consumo_ia (
  id             bigint generated always as identity primary key,
  usuario_id     uuid not null references auth.users(id) on delete cascade,
  dia            date not null,
  -- O tipo que a cota cobra: 'imagem', 'interpretacao', 'pergunta', 'voz'.
  tipo           text not null,
  -- O PRODUTO que gerou a chamada: 'tarot', 'buzios', 'mapa', 'vocacao', 'imagem',
  -- 'pergunta', 'voz'. É o corte que `uso_ia` não tem.
  oraculo        text not null,
  tokens_entrada bigint not null default 0 check (tokens_entrada >= 0),
  tokens_saida   bigint not null default 0 check (tokens_saida >= 0),
  caracteres     bigint not null default 0 check (caracteres >= 0),
  criado_em      timestamptz not null default now()
);

-- A consulta da aba Custo é sempre "um período, agrupado por oráculo".
create index if not exists consumo_ia_dia_oraculo_idx
  on public.consumo_ia (dia, oraculo);

alter table public.consumo_ia enable row level security;

-- Ninguém lê isto pelo app: a aba Custo é do Painel e roda com service_role, e
-- nenhuma pessoa precisa ver o consumo de outra. Sem policy, o RLS nega tudo para
-- anon e authenticated, que é o que se quer.
revoke all on public.consumo_ia from anon, authenticated;
grant select, insert on public.consumo_ia to service_role;
grant usage, select on sequence public.consumo_ia_id_seq to service_role;
