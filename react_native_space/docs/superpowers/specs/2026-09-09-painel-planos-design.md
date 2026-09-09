# Painel de Planos (manager super-admin) — design

- **Data:** 2026-09-09
- **Branch:** `feat/painel-planos` (de `main`, com a migração Stripe já mergeada)
- **Status:** aprovado no brainstorming, aguardando plano de implementação

## Contexto e objetivo

Depois da migração para Stripe (mergeada em `main`, commit `c9d6031e`), os planos
estão espalhados em três lugares estáticos:

- **preços de exibição** — `services/stripe-planos.ts` (mudar = redeploy do app);
- **Price IDs** — env secrets `STRIPE_PRICE_INICIANTE/EXPLORADOR/MESTRE`, lidos pela
  Edge Function `criar-checkout-stripe` via `_shared/planos.ts`;
- **cotas de consulta** — hardcoded em `_shared/planos.ts` (usado por checkout e webhook).

Objetivo: uma **tela de manager gated por super-admin** onde o operador ajusta, por
plano, o **preço (4 moedas)** e a **cota de consultas**. O painel é a **fonte de
verdade**: ao salvar, uma função no servidor cria/atualiza o Product e o Price na
Stripe, e o app passa a ler tudo do banco. Como o Price da Stripe é **imutável**,
"ajustar preço" significa **criar um Price novo** e arquivar o antigo — automatizado
pela função, invisível para o operador.

## Decisões travadas (brainstorming 2026-09-09)

1. **Muda o preço de verdade:** salvar cria o Price novo na Stripe e sincroniza. Novos
   checkouts usam o novo Price; assinantes atuais seguem no antigo (padrão Stripe).
2. **Painel cria tudo:** também cria os Products/Prices iniciais — o operador não toca
   no dashboard da Stripe. Substitui o passo 1 do Task 10.
3. **Escopo editável:** apenas **preço (4 moedas) + cota**. Nome/descrição e o conjunto
   de 3 planos permanecem no código.
4. Fonte de verdade migra para uma tabela no banco (`config_planos`). Os secrets
   `STRIPE_PRICE_*` deixam de ser necessários.

## Arquitetura

Componentes (novos salvo indicação):

- **`config_planos`** (tabela nova) — fonte de verdade de preço/cota/Price ID por plano.
- **`admin-configurar-plano`** (Edge Function nova) — escreve a Stripe + a tabela; só
  super-admin.
- **`criar-checkout-stripe`** (existente, alterada) — lê o `stripe_price_id` da tabela.
- **`stripe-webhook`** (existente, alterada) — lê a cota da tabela ao liberar/renovar.
- **`services/configPlanos.ts`** (novo) — cliente: carrega config (merge tabela+código)
  e chama a função admin.
- **`services/stripe-planos.ts`** (existente, refatorada) — mantém só o estático
  (nome, moeda, formatação); preço/cota saem daqui.
- **`app/manager.tsx`** (tela nova) — UI gated por super-admin.
- **`supabase/config-planos.sql`** (migração nova) — cria a tabela, RLS e seed.

### Fluxo — editar preço (operador)

```
/manager (super-admin)
  → edita preços/cota → Salvar
  → services/configPlanos.salvarPlano(planoId, {cota, precos})
  → invoke admin-configurar-plano  (JWT do super-admin)
      → verifica is_super_admin (403 se não)
      → cria Product se faltar; cria Price novo (currency_options 4 moedas)
      → UPDATE config_planos (novo price_id, product_id, preços, cota, auditoria)
      → arquiva o Price antigo (active:false)
      → responde { plano atualizado }
  → tela recarrega e mostra o Price ID novo + "atualizado em"
```

### Fluxo — comprar (usuário)

```
/planos → configPlanos.carregarConfigPlanos()  (leitura pública)
  → mostra só planos com stripe_price_id != null (senão "em breve")
  → checkout → criar-checkout-stripe lê stripe_price_id da tabela → Stripe Checkout
webhook (compra/renovação) → lê cota_consultas da tabela → grava consultas_restantes
```

## Modelo de dados: `config_planos`

Migração **aditiva e idempotente** (`create table if not exists`, seed com `on conflict do nothing`).

| coluna | tipo | nota |
|---|---|---|
| `id` | `text` PK | `iniciante` \| `explorador` \| `mestre` |
| `cota_consultas` | `int not null` | 4 / 999 / 999 no seed |
| `preco_brl` | `int not null` | **centavos** (BRL 29,90 = `2990`) |
| `preco_usd` | `int not null` | centavos |
| `preco_eur` | `int not null` | centavos |
| `preco_cad` | `int not null` | centavos |
| `stripe_product_id` | `text` null | preenchido no 1º save |
| `stripe_price_id` | `text` null | Price ativo atual (o que o checkout usa) |
| `atualizado_em` | `timestamptz default now()` | auditoria |
| `atualizado_por` | `uuid` null (fk `auth.users`) | quem salvou |

**Seed** (valores atuais de `stripe-planos.ts`, em centavos; `stripe_*_id` = null):
iniciante `cota 4 / 2990 / 690 / 690 / 890`; explorador `999 / 7990 / 1690 / 1690 / 2190`;
mestre `999 / 19990 / 3990 / 3990 / 5490`.

**RLS:**
- `SELECT` liberado para `anon` + `authenticated` (o `/planos` precisa ler). Preços e
  Price IDs não são segredo.
- Sem policy de `INSERT`/`UPDATE`/`DELETE` para o cliente → escrita **só via service
  role** (a Edge Function). O painel nunca escreve direto no banco pelo cliente.

## Edge Function: `admin-configurar-plano`

`verify_jwt = true` (em `config.toml`) — precisa do JWT do usuário para autorizar.

**Contrato:**
```
POST /functions/v1/admin-configurar-plano
body: { planoId: 'iniciante'|'explorador'|'mestre',
        cotaConsultas: number,           // > 0
        precos: { brl:number, usd:number, eur:number, cad:number } }  // centavos, > 0
resp: 200 { plano: {id, cota_consultas, precos, stripe_price_id, stripe_product_id, atualizado_em} }
      | 400 input inválido | 401 sem sessão | 403 não super-admin | 502 falha na Stripe
```

**Autorização:** ler o JWT (client supabase com o Authorization do request), pegar o
`user.id`, consultar `perfis.is_super_admin`. Se != true → 403. (Não confiar em nada
do body para autorizar.)

**Lógica (ordem importa — a Stripe primeiro, arquivar por último):**
1. Validar input (planoId conhecido; cota e as 4 moedas inteiras e > 0).
2. Ler a linha atual de `config_planos`.
3. **No-op guard:** se cota e as 4 moedas forem iguais às atuais **e** já houver
   `stripe_price_id`, retornar 200 sem criar Price (evita Price duplicado em salvamentos
   repetidos).
4. Se `stripe_product_id` for null → `stripe.products.create({ name })` (nome vem de uma
   constante compartilhada por planoId) e guardar o id.
5. `stripe.prices.create({ product, currency:'brl', unit_amount: preco_brl,
   recurring:{interval:'month'}, currency_options: { usd:{unit_amount:preco_usd},
   eur:{unit_amount:preco_eur}, cad:{unit_amount:preco_cad} } })`.
6. `UPDATE config_planos` (service role): novo `stripe_price_id`, `stripe_product_id`,
   4 preços, `cota_consultas`, `atualizado_em=now()`, `atualizado_por=user.id`.
7. Se o UPDATE falhar → 502 e **não** arquivar o antigo (Price novo fica órfão, inofensivo;
   o antigo segue ativo; nada quebra).
8. Se havia `stripe_price_id` anterior → `stripe.prices.update(antigo, {active:false})`.
   Falha ao arquivar é logada mas **não** derruba a resposta (o banco já aponta pro novo).

**Segredo:** `STRIPE_SECRET_KEY` (mesma chave do checkout). `apiVersion` pinada igual às
outras funções (`2024-09-30.acacia`). Cliente Stripe no Deno via esm.sh +
`Stripe.createFetchHttpClient()`.

## Mudanças em funções existentes

- **`criar-checkout-stripe`**: em vez de `Deno.env.get(PLANOS[planoId].priceEnv)`, faz
  `select stripe_price_id from config_planos where id = planoId` (service role). Se null →
  503 "Pagamento temporariamente indisponível" (mesmo comportamento de hoje quando o env
  faltava).
- **`stripe-webhook`**: a cota usada ao gravar `consultas_restantes` (na compra e na
  renovação `invoice.paid`) passa a vir de `select cota_consultas from config_planos`
  em vez de `_shared/planos.ts`. O mapeamento planoId→cota some do `_shared/planos.ts`.
- **`_shared/planos.ts`**: perde `priceEnv` e `cotaConsultas`; se sobrar só a lista de
  ids, vira uma constante simples (ou é removido e os ids ficam num enum). Decisão de
  detalhe fica pro plano.

## Cliente

- **`services/configPlanos.ts`** (novo):
  - `carregarConfigPlanos(): Promise<PlanoStripe[]>` — lê `config_planos`, junta com o
    estático (nome) por id, converte centavos→número de exibição, e retorna só os planos
    com `stripe_price_id != null` para o `/planos` (com um flag/variante para o manager
    ver todos, inclusive não configurados).
  - `salvarPlano(planoId, { cotaConsultas, precos })` — converte para centavos e faz
    `supabase.functions.invoke('admin-configurar-plano', ...)`.
- **`services/stripe-planos.ts`** (refatorada): mantém `MoedaSuportada`,
  `MOEDAS_SUPORTADAS`, `PlanoIdStripe`, `moedaPadrao`, `formatarPreco`, e um mapa estático
  só de **nome** por plano. Sai o `precos`/`cotaConsultas` estático (agora vem do banco).
- **`app/planos.tsx`**: passa a montar a lista via `carregarConfigPlanos()` (com loading e
  estado "em breve" quando nenhum plano estiver configurado) em vez de importar
  `PLANOS_STRIPE`.

## Tela: `app/manager.tsx`

- **Gate:** `useIsSuperAdmin()`. Não-super-admin vê bloqueio/redirect (padrão do app).
  Link para `/manager` só aparece no `perfil.tsx` quando `is_super_admin` (+ acesso direto
  por URL). Web-first, como o resto do app.
- **UI:** os 3 planos; por plano, 4 inputs de moeda (com `formatarPreco` de referência) +
  input de cota + botão **Salvar**. Mostra `stripe_price_id` atual e `atualizado_em`.
  Salvar chama `salvarPlano`, mostra sucesso/erro (usando `mostrarAlerta` do
  `utils/alerta.ts`, web-safe) e recarrega. Estado de "criando Price…" enquanto a função roda.
- Validação no cliente antes de enviar (valores > 0), com a validação real repetida no servidor.

## Tratamento de erros (consolidado)

| onde | caso | comportamento |
|---|---|---|
| função admin | não super-admin | 403, sem tocar Stripe/banco |
| função admin | input inválido | 400 |
| função admin | Stripe falha ao criar Price | 502, banco intocado |
| função admin | banco falha após criar Price | 502, não arquiva o antigo (Price novo órfão inofensivo) |
| checkout | `stripe_price_id` null | 503 "indisponível" |
| /planos | nenhum plano configurado | mostra "em breve", sem checkout quebrado |
| /manager | usuário não super-admin | bloqueio/redirect |

## Impacto no Task 10 (revisado)

- ❌ Sai o passo 1 (criar produtos/preços no dashboard) — feito pelo `/manager`.
- ❌ Saem os secrets `STRIPE_PRICE_INICIANTE/EXPLORADOR/MESTRE`.
- ✅ Fica: setar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_BASE_URL`; criar o
  webhook endpoint; ativar Billing Portal; rodar as migrações (`stripe-migration.sql` +
  `config-planos.sql`); deploy das funções — agora incluindo `admin-configurar-plano`;
  **abrir o `/manager` e cadastrar os 3 planos**; então o E2E test mode (4242, renovação,
  cancelamento, recusa, idempotência). O guia `task-10-stripe-execution.md` é atualizado
  para refletir isso.

## Fora de escopo (v1 — YAGNI)

- Migrar assinantes atuais quando o preço muda (pré-lançamento, sem assinantes; Stripe
  mantém o antigo).
- Editar nome/descrição, ativar/desativar plano, ou criar planos novos pelo painel.
- Histórico de preços próprio (os Prices arquivados na Stripe já são o histórico).
- Controle de concorrência/lock (um único super-admin editando).

## Testes

- **Jest (cliente):** `services/configPlanos` — merge tabela+estático por id, conversão
  centavos↔exibição, validação de input, e o filtro "só planos com price_id" no `/planos`.
- **Edge Functions (Deno):** fora do `jest`/`typecheck` (excluídas no `tsconfig`), como as
  demais funções Stripe. Gate = revisão de código + E2E test mode do Task 10 (incluindo um
  passo novo: "salvar um plano no /manager cria o Price na Stripe e o /planos passa a
  exibi-lo").
- Os 19 testes atuais seguem verdes; `yarn typecheck` limpo.

## Riscos / notas

- **Chave secreta numa função de escrita:** `admin-configurar-plano` cria recursos na
  Stripe — por isso o gate de super-admin é obrigatório e verificado pelo JWT, nunca pelo
  body. Test mode primeiro.
- **Centavos:** armazenar em centavos evita erro de float e casa com o `unit_amount` da
  Stripe. Toda conversão de exibição fica isolada no `configPlanos`/`formatarPreco`.
- **Reconciliação de moeda:** deixa de ser um risco manual — o painel escreve o mesmo
  número na Stripe e no banco, então exibição e cobrança não divergem.
