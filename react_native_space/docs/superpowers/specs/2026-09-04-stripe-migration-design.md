# Migração de pagamento: Mercado Pago → Stripe (Arcanus)

**Data:** 2026-09-04
**Projeto:** Arcanus (`oraculo_vivo/react_native_space`, Expo SDK 54 + expo-router, Supabase, deploy web na Vercel)
**Status:** design aprovado (aguardando revisão do spec antes do plano de implementação)

## 1. Contexto e objetivo

Trocar (não adicionar) o Mercado Pago pela Stripe como provedor de pagamento. Motivo: a Stripe cobre EUA + Brasil + Canadá + Europa (o MP só atende Brasil/LatAm) e casa com o lançamento internacional. Não há assinantes reais no MP (pré-lançamento), então o cutover é limpo — não é preciso migrar assinaturas existentes.

## 2. Modelo atual (Mercado Pago) — a substituir

- **Cliente** `services/mercadopago.ts` → `supabase.functions.invoke('criar-preferencia', { planoId })` → recebe `checkoutUrl` → `Linking.openURL()`.
- **Edge Function `criar-preferencia`**: valida JWT; preços fixados no servidor (só BRL); grava linha em `assinaturas` (status `pendente`); cria preferência no MP; devolve `{ preferenceId, checkoutUrl }`.
- **Edge Function `mercadopago-webhook`**: recebe `paymentId`; reconsulta o pagamento na origem (`/v1/payments/:id`); valida `status=approved` + metadata + valor; ativa `assinaturas` e atualiza `perfis` (`plano`, `plano_valido_ate` = +1 mês, `consultas_restantes`).
- **Planos** (`app/planos.tsx`, `services/mercadopago.ts`, `hooks/usePlano.ts`): Iniciante R$ 29,90 / Explorador R$ 79,90 / Mestre R$ 199,90 — todos mensais.
- **Detalhe crítico**: o modelo atual **não é recorrente**. É pagamento avulso que libera 1 mês (`expira_em` +1 mês, `consultas_restantes` resetadas) e exige nova compra manual. A UI já promete "Cancele quando quiser", que só faz sentido com assinatura de verdade.

### Modelo de dados relevante (inferido do código do webhook)

- `perfis`: `id`, `plano`, `plano_valido_ate`, `consultas_restantes`, `is_super_admin`, `boas_vindas_enviada`, `email` (colunas conhecidas; schema roda direto no SQL Editor do Supabase, não versionado).
- `assinaturas`: `id`, `usuario_id`, `plano`, `status` (`pendente`/`ativo`/`cancelado`), `valor`, `periodo`, `mp_preference_id`, `mp_payment_id`, `inicio_em`, `expira_em`.
- Cotas de consulta por plano (do webhook): `iniciante = 4`, `explorador = 999`, `mestre = 999` (999 ≈ ilimitado).

## 3. Decisões travadas (2026-09-04)

1. **Assinatura recorrente** (`mode: subscription`, auto-renova). Cancelamento via Billing Portal da Stripe.
2. **Multi-moeda desde o lançamento**: BRL, USD, EUR, CAD.
3. **Produtos/preços ainda não criados** na Stripe — o plano inclui criá-los; o código lê os Price IDs por variável de ambiente.
4. **Modelagem de preço**: 1 Price recorrente mensal **multi-moeda** por plano (`currency_options`), em vez de 12 Prices avulsos. 3 Price IDs no total.

## 4. Abordagem: Stripe Checkout hospedado + Billing Portal

Espelha o fluxo atual (menor risco): o app abre uma URL hospedada pela Stripe. Nenhum dado de cartão passa pelo app; nenhuma chave secreta sai do servidor. **Checkout hospedado não exige chave publishable no cliente** — só a `STRIPE_SECRET_KEY` no servidor. O cancelamento/troca de cartão usa o **Billing Portal** hospedado (satisfaz "cancele quando quiser" sem construir tela de cancelamento).

## 5. Componentes

### 5.1 Preços na Stripe (ação externa — dashboard ou sessão MCP interativa)
3 produtos: **Iniciante**, **Explorador**, **Mestre**. Cada um com **1 Price recorrente mensal** com `currency_options` para BRL/USD/EUR/CAD. Os valores por moeda são decisão comercial do Fabiano ("Europa, valor melhor"). Os 3 Price IDs entram como secrets do Supabase.

### 5.2 Edge Function `criar-checkout-stripe` (substitui `criar-preferencia`)
- Valida JWT (mesmo padrão da função atual: `supabaseAdmin.auth.getUser(jwt)`).
- Entrada: `{ planoId: 'iniciante'|'explorador'|'mestre', moeda: 'brl'|'usd'|'eur'|'cad' }`.
- Resolve o Stripe Customer: se `perfis.stripe_customer_id` existe, reutiliza; senão cria (`email`, `metadata.supabase_user_id`) e persiste em `perfis`.
- Mapeia `planoId` → Price ID (env `STRIPE_PRICE_INICIANTE` / `_EXPLORADOR` / `_MESTRE`).
- Cria Checkout Session: `mode: 'subscription'`, `customer`, `line_items: [{ price, quantity: 1 }]`, `currency: <moeda>` (seleciona o `currency_option`), `success_url`/`cancel_url` (https — ver 5.6), `client_reference_id: usuario.id`, `metadata` e `subscription_data.metadata` = `{ usuario_id, plano_id }`, `allow_promotion_codes: true` (opcional).
- Grava `assinaturas` (status `pendente`, `stripe_checkout_session_id`, `moeda`, `plano`, `periodo: 'mensal'`).
- Devolve `{ checkoutUrl: session.url }`.
- Sem os secrets configurados, responde 503 ("Pagamento temporariamente indisponível") — seguro deixar inerte no repo.

### 5.3 Edge Function `stripe-webhook` (substitui `mercadopago-webhook`)
- **Lê o corpo cru** (`await request.text()`) e verifica a assinatura com `stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET, undefined, Stripe.createSubtleCryptoProvider())` — a versão **async + SubtleCryptoProvider** é obrigatória no Deno (não há crypto síncrono). Deploy com `--no-verify-jwt` (a Stripe não manda JWT do Supabase).
- Eventos tratados:
  - **`checkout.session.completed`**: pega `subscription`, `customer`, `metadata`. Recupera a subscription (`stripe.subscriptions.retrieve`) para obter `current_period_end` e `status`. Ativa `assinaturas` (status `ativo`, `stripe_subscription_id`, `stripe_customer_id`, `inicio_em`, `expira_em = current_period_end`) e atualiza `perfis` (`plano`, `plano_valido_ate = current_period_end`, `consultas_restantes = cota do plano`). Idempotente: só ativa se ainda não estiver `ativo`.
  - **`invoice.paid`**: renovação recorrente. Estende `perfis.plano_valido_ate` e `assinaturas.expira_em` para o novo `current_period_end` e reseta `consultas_restantes`. Seguro rodar em retries (idempotente por natureza — grava o mesmo valor final).
  - **`customer.subscription.deleted`**: rebaixa `perfis.plano` para `gratuito` e marca `assinaturas.status = 'cancelado'`. **Regra de rebaixamento (sem ambiguidade)**: o rebaixamento acontece SÓ neste evento. Quando o usuário cancela no Billing Portal com `cancel_at_period_end`, a Stripe mantém a subscription ativa até o fim do período pago e só então dispara `deleted` — ou seja, o usuário mantém o acesso que pagou. `customer.subscription.updated` é usado apenas para *sincronizar* `assinaturas.status`/datas (nunca rebaixa o plano antecipadamente).
- **Fonte da verdade**: sempre relê a subscription/invoice da Stripe; nunca confia em valores do payload além do `event.type`/IDs (a verificação de assinatura já garante autenticidade).
- **Dedupe** (endurecimento opcional): tabela `webhook_eventos (id text primary key, criado_em timestamptz)` — insere `event.id` e ignora se já existir.
- Responde 200 rápido; erros retornáveis → status 5xx para a Stripe reenviar.

### 5.4 Edge Function `criar-portal-stripe` (nova)
- Valida JWT → lê `perfis.stripe_customer_id` → `stripe.billingPortal.sessions.create({ customer, return_url })` → devolve `{ portalUrl }`. O app abre a URL para o usuário cancelar/gerenciar.

### 5.5 Cliente `services/stripe.ts` (substitui `mercadopago.ts`)
- `criarCheckout(planoId, moeda)` → `invoke('criar-checkout-stripe', { body: { planoId, moeda } })` → retorna `checkoutUrl`.
- `abrirPortal()` → `invoke('criar-portal-stripe')` → retorna `portalUrl`.
- Detecção de moeda: helper `moedaPadrao()` a partir do locale (web: `navigator.language`; nativo: `expo-localization` se disponível), com fallback `brl`. `app/planos.tsx` pode expor um seletor simples de moeda (v1 pode ser só auto-detecção).

### 5.6 Rotas web de retorno
Stripe exige `success_url`/`cancel_url` **https** — o esquema `arcanus://` do MP não serve. Criar `app/pagamento/sucesso.tsx` e `app/pagamento/cancelado.tsx` (expo-router). `success_url = ${APP_BASE_URL}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}` e `cancel_url = ${APP_BASE_URL}/planos`. `APP_BASE_URL` vem de env (interim `https://oraculovivo.vercel.app`, depois `https://arcanus.com.br`). A tela de sucesso mostra confirmação e volta ao app (o webhook é quem realmente libera o plano; a tela não deve confiar só no redirect).

### 5.7 Migração SQL (aditiva e idempotente)
```sql
alter table perfis        add column if not exists stripe_customer_id text;
alter table assinaturas    add column if not exists stripe_subscription_id text;
alter table assinaturas    add column if not exists stripe_customer_id text;
alter table assinaturas    add column if not exists stripe_checkout_session_id text;
alter table assinaturas    add column if not exists moeda text;
-- opcional (dedupe de webhook):
create table if not exists webhook_eventos (id text primary key, criado_em timestamptz default now());
```
As colunas `mp_*` ficam como legado (nullable), sem uso.

## 6. Segurança e segredos

Somente nos **secrets do Supabase** (nunca `.env`/`EXPO_PUBLIC_*`):
- `STRIPE_SECRET_KEY` (test → live)
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_INICIANTE`, `STRIPE_PRICE_EXPLORADOR`, `STRIPE_PRICE_MESTRE`
- `APP_BASE_URL`
- (já existentes) `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

Regra: eu nunca digito chave/credencial. Test mode primeiro. Nada em live sem confirmação explícita.

## 7. SDK Stripe no Deno (notas de implementação que evitam bugs)

- `import Stripe from 'npm:stripe@^17'` e `new Stripe(secret, { httpClient: Stripe.createFetchHttpClient() })`.
- Verificação de webhook: **`constructEventAsync`** + `Stripe.createSubtleCryptoProvider()` (a versão síncrona quebra no Deno).
- Ler o corpo do webhook como texto cru **antes** de qualquer parse.

## 8. Moedas

`currency_options` num único Price por plano. No Checkout Session em `mode: subscription`, `currency` seleciona o `currency_option`. Atenção: a moeda do Customer fica "travada" após o primeiro pagamento — irrelevante no pré-lançamento (base zerada). Valores por moeda são definidos por Fabiano no dashboard.

## 9. Cutover e testes

1. **Test mode**: criar produtos/preços de teste, setar secrets de teste, deploy das functions.
2. **E2E (ação do Fabiano em test mode)**: assinar com cartão de teste `4242 4242 4242 4242` (skill `stripe:test-cards`), confirmar `pendente → ativo`, `perfis.plano` atualizado, e `plano_valido_ate` = fim do período. Simular renovação (`invoice.paid`) e cancelamento (Billing Portal → `customer.subscription.deleted` → rebaixa para `gratuito`).
3. **Webhook em test mode**: endpoint na Stripe apontando para `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook` (ou `stripe listen --forward-to` numa sessão interativa).
4. **Go-live**: trocar secrets para chaves live + Price IDs live, reconfigurar o endpoint de webhook em live, e refazer 1 compra real de validação.
5. **Remoção do MP**: apagar `services/mercadopago.ts` e as Edge Functions `criar-preferencia` + `mercadopago-webhook` (é troca, não adição). Atualizar `supabase/README.md` para a Stripe.

## 10. O que NÃO é feito nesta sessão / por mim

- Criar produtos/preços na Stripe, obter o webhook signing secret e setar secrets no Supabase: o MCP da Stripe precisa de OAuth (sessão não-interativa) e os secrets são do Fabiano. **Eu escrevo todo o código + um runbook exato**; o Fabiano (ou uma sessão interativa com o MCP da Stripe) executa a parte do dashboard/secrets e o E2E em test mode.
- Deploy: `git push` neste repo dispara deploy de produção na Vercel (Root Directory = `react_native_space`). A migração fica numa branch dedicada e só vai pra `main` quando estiver validada. Commit/push é decisão do Fabiano.

## 11. Fora de escopo (gaps conhecidos)

- **Retorno para app nativo**: `success_url` https não volta sozinho para `arcanus://`. O lançamento é web-first; o bridge nativo (página https que faz deep-link) fica como follow-up.
- **Impostos/Stripe Tax, cupons avançados, faturas fiscais BR (NF-e)**: fora do escopo do cutover.
- **Provação de moeda por região automática (Adaptive Pricing)**: usamos `currency` explícita, não a detecção automática da Stripe.

## 12. Arquivos afetados (mapa)

**Novos**
- `supabase/functions/criar-checkout-stripe/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/criar-portal-stripe/index.ts`
- `services/stripe.ts`
- `app/pagamento/sucesso.tsx`, `app/pagamento/cancelado.tsx`
- SQL de migração (rodado no SQL Editor; versionar como `supabase/stripe-migration.sql`)

**Alterados**
- `app/planos.tsx` (import + moeda + botão "gerenciar assinatura")
- `supabase/README.md` (runbook Stripe)

**Removidos**
- `services/mercadopago.ts`
- `supabase/functions/criar-preferencia/`, `supabase/functions/mercadopago-webhook/`
