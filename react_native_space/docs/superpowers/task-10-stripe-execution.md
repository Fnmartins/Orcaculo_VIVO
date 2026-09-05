# Task 10 — Execução do gate Stripe (test mode → go-live)

Guia turnkey para o **gate manual** da migração Stripe. Tudo aqui é ação sua
(dashboard Stripe/Supabase + secrets). Faça **test mode primeiro**; só vá pra
live no fim, com tudo verde.

- Projeto Supabase: `rfdjukdbrtvvulaxbzwb`
- Functions: `criar-checkout-stripe`, `criar-portal-stripe`, `stripe-webhook`
- CLI: `npx supabase` (já logado como você nesta máquina)
- Cartões de teste: `4242 4242 4242 4242` (aprova) · `4000 0000 0000 0002` (recusa)
- Cotas por plano: iniciante = 4 · explorador = 999 · mestre = 999

---

## 1. Stripe dashboard (test mode — toggle "Test mode" ON)

1. **3 produtos**: Iniciante, Explorador, Mestre (Products → Add product).
2. Em cada produto, **1 Price recorrente mensal**. No Price, adicionar as moedas
   **BRL, USD, EUR, CAD** em *currency options* (não crie 3 Prices avulsos — é 1
   Price multi-moeda por produto). Anotar os **3 Price IDs** (`price_...`).
3. **Webhook endpoint** (Developers → Webhooks → Add endpoint):
   - URL: `https://rfdjukdbrtvvulaxbzwb.supabase.co/functions/v1/stripe-webhook`
   - Eventos: `checkout.session.completed`, `invoice.paid`,
     `customer.subscription.deleted`
   - Anotar o **signing secret** (`whsec_...`).
4. **Billing Portal**: Settings → Billing → Customer portal → ativar (permitir
   cancelamento).

> ⚠️ **Reconciliação de moeda ANTES do go-live**: os valores não-BRL em
> `react_native_space/services/stripe-planos.ts` (usd/eur/cad) são
> **provisórios**. Ajuste-os para bater exatamente com os *currency options*
> que você configurou nos Prices, senão o app exibe um preço e a Stripe cobra
> outro. BRL conhecido: 29,90 / 79,90 / 199,90.

## 2. Rodar a migração SQL

No **SQL Editor** do projeto: colar e rodar `react_native_space/supabase/stripe-migration.sql`.
(Aditivo e idempotente — seguro rodar mais de uma vez. Cria as colunas Stripe,
`webhook_eventos` e os índices de lookup.)

## 3. Secrets (test mode)

```sh
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...        # do passo 1.3
npx supabase secrets set STRIPE_PRICE_INICIANTE=price_...
npx supabase secrets set STRIPE_PRICE_EXPLORADOR=price_...
npx supabase secrets set STRIPE_PRICE_MESTRE=price_...
npx supabase secrets set APP_BASE_URL=https://oraculovivo.vercel.app
```
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem nos secrets das functions.

## 4. Deploy das 3 functions

```sh
npx supabase functions deploy criar-checkout-stripe
npx supabase functions deploy criar-portal-stripe
npx supabase functions deploy stripe-webhook --no-verify-jwt
```
(`stripe-webhook` sem JWT porque a Stripe não manda JWT do Supabase — isso já
está declarado em `supabase/config.toml` também.)

---

## 5. E2E em test mode

Use uma conta de teste no app (`/planos`). Depois de cada passo, rode a query de
verificação no SQL Editor trocando `<EMAIL>` pelo e-mail da conta.

**Query base de verificação:**
```sql
select p.plano, p.plano_valido_ate, p.consultas_restantes, p.stripe_customer_id,
       a.status, a.plano as a_plano, a.moeda, a.stripe_subscription_id, a.expira_em
from perfis p
left join assinaturas a on a.usuario_id = p.id
where p.id = (select id from auth.users where email = '<EMAIL>')
order by a.criado_em desc;
```

- [ ] **5.1 Compra nova**: escolher um plano + moeda, assinar com `4242 4242 4242 4242`.
      Esperado: `assinaturas.status` vai de `pendente` → `ativo`;
      `perfis.plano` = o plano; `plano_valido_ate` ≈ +1 mês;
      `consultas_restantes` = cota do plano (4 / 999); `moeda` = a escolhida.
- [ ] **5.2 Renovação** *(NÃO pule — é o caminho que as correções de versão de
      API protegem)*: na Stripe test mode, avançar o ciclo da subscription
      (ou disparar a próxima fatura). Esperado: `invoice.paid` estende
      `plano_valido_ate` e **reseta** `consultas_restantes`.
- [ ] **5.3 Cancelamento**: no app, "Gerenciar assinatura" → Billing Portal →
      cancelar. Ao fim do período / no `customer.subscription.deleted`:
      `perfis.plano` = `gratuito`, `consultas_restantes` = `0`,
      `assinaturas.status` = `cancelado`.
- [ ] **5.4 Cartão recusado**: `4000 0000 0000 0002`. Esperado: plano **não**
      é liberado (`perfis.plano` inalterado; sem linha `ativo`).
- [ ] **5.5 Idempotência**: reenviar o MESMO evento pelo dashboard da Stripe
      (Webhooks → evento → Resend). Esperado: nenhum efeito duplicado
      (dedupe via `webhook_eventos`).

Se algo falhar, os **logs da function** ajudam: Supabase → Edge Functions →
`stripe-webhook` → Logs (ou `npx supabase functions logs stripe-webhook`).
Traga o log aqui — **"continua Arcanus: Task 10"** — que eu ajudo a diagnosticar
e ajusto o código conforme o test mode revelar.

---

## 6. Go-live (só com 5.1–5.5 tudo verde)

- [ ] Trocar os secrets para chaves/Price IDs **live** (repetir passos 1 e 3 em
      live mode; novo `whsec_` do endpoint live).
- [ ] `APP_BASE_URL` = domínio final (ex.: `https://arcanus.com.br` quando o
      domínio estiver ligado).
- [ ] Reconferir a reconciliação de moeda (passo 1, ⚠️).
- [ ] `git push` da branch `feat/stripe-migration` — **isso dispara o deploy de
      produção na Vercel**. Fazer só quando decidir o go-live.
- [ ] Validação em live: **1 compra nova E 1 renovação** (não só compra nova).
