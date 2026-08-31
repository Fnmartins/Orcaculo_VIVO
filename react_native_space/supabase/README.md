# Pagamentos seguros

As credenciais privadas do Mercado Pago pertencem exclusivamente às Edge Functions.
Nunca adicione `MERCADOPAGO_ACCESS_TOKEN` ao `.env` do Expo ou a variáveis `EXPO_PUBLIC_*`.

## Implantação

```sh
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=SEU_NOVO_TOKEN
supabase functions deploy criar-preferencia
supabase functions deploy mercadopago-webhook --no-verify-jwt
```

No painel do Mercado Pago, configure a URL de notificações para:

```text
https://SEU_PROJECT_REF.supabase.co/functions/v1/mercadopago-webhook
```

Eventos aprovados são consultados novamente na API do Mercado Pago. O webhook
valida assinatura, usuário, plano e valor antes de atualizar `assinaturas` e
`perfis`. Reenvios do mesmo evento são idempotentes.

## Antes de publicar

1. Revogue e gere novamente qualquer token que já tenha existido no histórico Git.
2. Remova `MERCADOPAGO_ACCESS_TOKEN` do `.env` local do aplicativo.
3. Faça uma compra de teste e confirme a transição `pendente` → `ativo`.
4. Teste eventos recusados e pendentes; eles não podem liberar o plano.

## IA remota

O envio de imagens e textos a provedores externos está desativado. As leituras
locais continuam funcionando sem transmissão desses dados. Uma futura reativação
exige política de privacidade, consentimento explícito antes do upload, proxy
autenticado, limites de uso e validação das respostas. Não use chaves de IA em
variáveis `EXPO_PUBLIC_*`.
