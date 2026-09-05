# Pagamentos seguros (Stripe)

As chaves privadas da Stripe pertencem exclusivamente às Edge Functions.
Nunca adicione `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` ao `.env` do Expo
ou a variáveis `EXPO_PUBLIC_*`.

## Pré-requisitos no dashboard da Stripe (test mode primeiro)

1. Criar 3 produtos: Iniciante, Explorador, Mestre.
2. Em cada um, criar 1 **Price recorrente mensal** e adicionar as moedas
   BRL, USD, EUR, CAD (currency_options). Anotar os 3 Price IDs.
3. Criar um endpoint de webhook apontando para:
   `https://rfdjukdbrtvvulaxbzwb.supabase.co/functions/v1/stripe-webhook`
   com os eventos: `checkout.session.completed`, `invoice.paid`,
   `customer.subscription.deleted`. Anotar o signing secret (`whsec_...`).
4. Habilitar o Billing Portal (Settings → Billing → Customer portal).

## Rodar a migração SQL

Aplicar `supabase/stripe-migration.sql` no SQL Editor do projeto.

## Secrets (Supabase)

```sh
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_INICIANTE=price_...
supabase secrets set STRIPE_PRICE_EXPLORADOR=price_...
supabase secrets set STRIPE_PRICE_MESTRE=price_...
supabase secrets set APP_BASE_URL=https://oraculovivo.vercel.app
```
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem nos secrets das functions.

## Deploy das functions

```sh
supabase functions deploy criar-checkout-stripe
supabase functions deploy criar-portal-stripe
supabase functions deploy stripe-webhook --no-verify-jwt
```

## Go-live

Trocar os secrets para chaves/Price IDs **live**, recriar o endpoint de
webhook em live (novo `whsec_...`), atualizar `APP_BASE_URL` para o domínio
final e refazer a validação: **uma compra nova E uma renovação** (avançar o
ciclo em test mode ou aguardar a próxima `invoice.paid`). A renovação entra
na checklist de propósito — é o caminho que falha em silêncio se a versão de
API da Stripe da conta usar período por item; o webhook já lê os dois
formatos (`sub.current_period_end` e `sub.items.data[0].current_period_end`;
`invoice.subscription` e `invoice.parent.subscription_details.subscription`),
mas confirme que `plano_valido_ate` estende e `consultas_restantes` reseta na
renovação.

## IA remota

O envio de imagens e textos a provedores externos está desativado. As leituras
locais continuam funcionando sem transmissão desses dados. Uma futura reativação
exige política de privacidade, consentimento explícito antes do upload, proxy
autenticado, limites de uso e validação das respostas. Não use chaves de IA em
variáveis `EXPO_PUBLIC_*`.
