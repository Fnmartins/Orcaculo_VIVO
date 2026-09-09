# Pagamentos seguros (Stripe)

As chaves privadas da Stripe pertencem exclusivamente às Edge Functions.
Nunca adicione `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` ao `.env` do Expo
ou a variáveis `EXPO_PUBLIC_*`.

Produtos e Prices são criados/atualizados pelo **painel `/manager`** (super-admin),
não no dashboard. A fonte de verdade é a tabela `config_planos`. Runbook completo:
`docs/superpowers/task-10-stripe-execution.md`.

## Pré-requisitos no dashboard da Stripe (test mode primeiro)

Não crie produtos/preços aqui — o painel faz isso. Só:
1. Criar um endpoint de webhook apontando para:
   `https://rfdjukdbrtvvulaxbzwb.supabase.co/functions/v1/stripe-webhook`
   com os eventos: `checkout.session.completed`, `invoice.paid`,
   `customer.subscription.deleted`. Anotar o signing secret (`whsec_...`).
2. Habilitar o Billing Portal (Settings → Billing → Customer portal).

## Rodar as migrações SQL

Aplicar no SQL Editor do projeto: `supabase/stripe-migration.sql` e
`supabase/config-planos.sql` (tabela `config_planos` + seed dos 3 planos).

## Secrets (Supabase)

```sh
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set APP_BASE_URL=https://oraculovivo.vercel.app
```
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem nos secrets das functions.
Não há mais `STRIPE_PRICE_*` — o Price ID vive em `config_planos`, gravado pelo painel.

## Deploy das functions

```sh
supabase functions deploy criar-checkout-stripe
supabase functions deploy criar-portal-stripe
supabase functions deploy admin-configurar-plano
supabase functions deploy stripe-webhook --no-verify-jwt
```

## Cadastrar os planos

Logado como super-admin, abrir `/manager`, conferir preço (4 moedas) + cota de cada
plano e Salvar — cria os Products/Prices na Stripe e grava em `config_planos`. Só
então `/planos` exibe os planos e o checkout fica ativo.

## Go-live

Trocar os secrets para chaves **live**, recriar o endpoint de webhook em live
(novo `whsec_...`), recadastrar os 3 planos no `/manager` em live mode (cria os
Prices live), atualizar `APP_BASE_URL` para o domínio final e refazer a
validação: **uma compra nova E uma renovação** (avançar o
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
