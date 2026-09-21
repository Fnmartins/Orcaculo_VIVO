# Task 10 — Execução do gate Stripe (test mode → go-live), via painel de planos

Guia turnkey para o **gate manual** da Stripe. Tudo aqui é ação sua (dashboard
Stripe/Supabase + secrets + o painel `/manager`). Faça **test mode primeiro**; só
vá pra live no fim, com tudo verde.

**Mudou:** os produtos/preços NÃO são mais criados no dashboard nem via secrets
`STRIPE_PRICE_*`. Quem cria/atualiza os Products e Prices na Stripe é o **painel
`/manager`** (função `admin-configurar-plano`, só super-admin). A fonte de verdade
é a tabela `config_planos`.

- Projeto Supabase: `rfdjukdbrtvvulaxbzwb`
- Functions: `criar-checkout-stripe`, `criar-portal-stripe`, `stripe-webhook`, `admin-configurar-plano`
- CLI: `npx supabase` (já logado como você nesta máquina)
- Cartões de teste: `4242 4242 4242 4242` (aprova) · `4000 0000 0000 0002` (recusa)
- Cotas por plano (editáveis no painel; seed): iniciante = 4 · explorador = 999 · mestre = 999
- Preços seed (editáveis no painel): BRL 29,90 / 79,90 / 199,90 · não-BRL provisórios

---

## 1. Deployar o código do painel

O painel vive na branch **`feat/painel-planos`** (checkout/webhook lendo do banco +
tela `/manager` + função admin). Para exercitar em test mode:
- **Local (recomendado p/ test mode):** `npm run dev` na `:3000` e usar o app local; ou
- **Produção:** mergear `feat/painel-planos` → `main` e `git push` (dispara o deploy Vercel).
  ⚠️ Enquanto os planos não forem cadastrados no painel, o `/planos` mostra "Planos em
  breve" (sem checkout quebrado) — seguro deployar antes de configurar.

## 2. Rodar as migrações SQL

No **SQL Editor** do projeto, colar e rodar (aditivas e idempotentes):
- `react_native_space/supabase/stripe-migration.sql` (colunas Stripe, `webhook_eventos`, índices)
- `react_native_space/supabase/config-planos.sql` (tabela `config_planos` + RLS + seed dos 3 planos)

## 3. Stripe dashboard (test mode — toggle "Test mode" ON)

**Não crie produtos/preços aqui** — o painel faz isso no passo 6. Aqui só:
1. **Webhook endpoint** (Developers → Webhooks → Add endpoint):
   - URL: `https://rfdjukdbrtvvulaxbzwb.supabase.co/functions/v1/stripe-webhook`
   - Eventos: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
   - Anotar o **signing secret** (`whsec_...`).
2. **Billing Portal**: Settings → Billing → Customer portal → ativar (permitir cancelamento).

## 4. Secrets (test mode)

```sh
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...        # do passo 3.1
npx supabase secrets set APP_BASE_URL=https://oraculovivo.vercel.app
```
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem nos secrets das functions.
Não há mais `STRIPE_PRICE_*` (o Price ID vive em `config_planos`, gravado pelo painel).

## 5. Deploy das 4 functions

```sh
npx supabase functions deploy criar-checkout-stripe
npx supabase functions deploy criar-portal-stripe
npx supabase functions deploy admin-configurar-plano
npx supabase functions deploy stripe-webhook --no-verify-jwt
```
(`stripe-webhook` sem JWT porque a Stripe não manda JWT do Supabase; as outras usam o
padrão `verify_jwt = true`, já declarado em `supabase/config.toml`.)

## 6. Cadastrar os 3 planos pelo painel `/manager`

Logado como **super-admin**, abrir `/manager` (link "Painel de planos" no Perfil, ou
a URL direta). Por plano: conferir os 4 preços (BRL/USD/EUR/CAD) e a cota, e clicar
**Salvar**. Isso cria o Product + Price recorrente multi-moeda na Stripe e grava o
`stripe_price_id` no banco. Repetir para os 3. Depois disso, `/planos` passa a exibir
os planos e o checkout fica ativo.
- ⚠️ Ajuste os preços **não-BRL** (você mencionou "Europa, valor melhor") — o painel
  grava o mesmo número na Stripe e no app, então exibição e cobrança não divergem.

## 7. E2E em test mode — ✅ executado em 20/09/2026 (resultado no fim da seção)

Use uma conta de teste no app (`/planos`). Depois de cada passo, rode a query trocando
`<EMAIL>` pelo e-mail da conta.

**Query base de verificação:**
```sql
select p.plano, p.plano_valido_ate, p.consultas_restantes, p.stripe_customer_id,
       a.status, a.plano as a_plano, a.moeda, a.stripe_subscription_id, a.expira_em
from perfis p
left join assinaturas a on a.usuario_id = p.id
where p.id = (select id from auth.users where email = '<EMAIL>')
order by a.criado_em desc;
```

- [ ] **7.0 Painel cria o Price**: salvar um plano no `/manager` → `config_planos` ganha
      `stripe_price_id` e o Price aparece na Stripe (test mode); `/planos` passa a exibi-lo.
- [ ] **7.1 Compra nova**: escolher plano + moeda, assinar com `4242 4242 4242 4242`.
      Esperado: `assinaturas.status` `pendente` → `ativo`; `perfis.plano` = o plano;
      `plano_valido_ate` ≈ +1 mês; `consultas_restantes` = cota do plano; `moeda` = a escolhida.
- [ ] **7.2 Renovação** *(não pule — caminho que as correções de versão de API protegem)*:
      avançar o ciclo da subscription (test mode). `invoice.paid` estende `plano_valido_ate`
      e **reseta** `consultas_restantes` (agora lido de `config_planos`).
- [ ] **7.3 Cancelamento**: no app, "Gerenciar assinatura" → Billing Portal → cancelar.
      No `customer.subscription.deleted`: `perfis.plano` = `gratuito`,
      `consultas_restantes` = `0`, `assinaturas.status` = `cancelado`.
- [ ] **7.4 Cartão recusado**: `4000 0000 0000 0002` → plano **não** liberado.
- [ ] **7.5 Idempotência**: reenviar o MESMO evento (Webhooks → evento → Resend) → sem
      efeito duplicado (dedupe via `webhook_eventos`).
- [ ] **7.6 Troca de preço**: salvar um preço novo no `/manager` → Price antigo arquivado,
      novo ativo; um novo checkout usa o valor novo (assinantes atuais seguem no antigo).

### Resultado da execução (20/09/2026, conta `efem.adm+teste1@gmail.com`, sandbox `acct_1UC7psE6utR6zjc4`)

| Teste | Status | Evidência |
|---|---|---|
| 7.0 | ✅ | 3 planos com `stripe_price_id`; `/planos` exibindo os três |
| 7.1 | ✅ | `ativo`, `plano=iniciante`, cota 4, `plano_valido_ate` +1 mês, `moeda=brl`, `cus_VITxXIVkJfuZ67` / `sub_1UHt01E6utR6zjc4lirqmsyM` |
| 7.2 | ✅ | 2ª fatura paga (`SGZLTWYF-0002`); cota 1→4, data 22:14→22:48, mesma subscription |
| 7.3 | ✅ | `gratuito`, cota 0, `cancelado` |
| 7.4 | ✅ | `4000 0000 0000 0002` recusado; só linha `pendente` sem subscription |
| 7.5 | ◐ | dedupe ativo (3 linhas em `webhook_eventos`) e comprovado com os dois eventos da compra, que não dobraram cota nem data; **faltou o Resend manual** |
| 7.6 | ✅ | `price_1UEV5P…` → `price_1UHvJ8…`, R$ 34,90 no ar; preço devolvido a 29,90 depois |

Duas ressalvas de método, para quem repetir: a **renovação foi forçada por "Reset billing cycle anchor to now"**
(Update subscription → Immediately), não por passagem natural de tempo — mesmo handler, gatilho diferente;
e o **7.5 não teve reenvio manual** porque o botão *Resend* saiu da página do evento no dashboard novo
(fica no Workbench → Webhooks → entrega). No dashboard novo, "Test clocks" chama-se **Simulations**, e criar
customer por dentro de uma simulação abre um modal "Create an account" que gera conta conectada (`acct_`),
não cliente (`cus_`) — por isso o clock foi abandonado.

Bugs achados durante o E2E: (1) `customer.subscription.deleted` não limpava `plano_valido_ate`, então o
Perfil de uma conta já gratuita exibia "30 dias · Até renovar" — corrigido em 20/09 no `stripe-webhook`;
(2) linhas `pendente` de checkout abandonado/recusado ficam órfãs para sempre — só higiene de tabela,
sem efeito em acesso, não corrigido.

Logs úteis: Supabase → Edge Functions → `stripe-webhook` / `admin-configurar-plano` → Logs
(ou `npx supabase functions logs <fn>`). Traga o log aqui — **"continua Arcanus: Task 10"**.

## 8. Go-live (só com 7.0–7.6 tudo verde)

- [ ] Se ainda não fez: mergear `feat/painel-planos` → `main` e `git push` (deploy Vercel).
- [ ] Trocar os secrets para **live** (`sk_live_...`, novo `whsec_` do endpoint live).
- [ ] `APP_BASE_URL` = domínio final (ex.: `https://arcanus.com.br`).
- [ ] Recadastrar os 3 planos no `/manager` em **live mode** (cria os Prices live).
- [ ] Validação em live: **1 compra nova E 1 renovação**.
