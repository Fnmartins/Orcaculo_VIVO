# E-mail de boas-vindas pós-confirmação — Oráculo Vivo

O Supabase **não** manda e-mail de boas-vindas nativamente. Este pacote adiciona
um, disparado **uma vez**, no momento em que o usuário confirma a conta.

Peças:
- `../functions/enviar-boas-vindas/index.ts` — Edge Function que envia via **Resend**.
- `setup.sql` — trigger em `auth.users` que chama a função só na confirmação, +
  coluna `perfis.boas_vindas_enviada` (idempotência).
- O visual é o mesmo de `../email-templates/boas-vindas.html`.

> ⚠️ **Depende do Resend** (mesmo passo do Custom SMTP). Enquanto os secrets abaixo
> não estiverem setados, a função responde `503` e **nada é enviado** — ou seja,
> é seguro deixar tudo isto no repositório inerte até você querer ativar.

## Ativação (fazer só quando o Resend estiver pronto)

1. **Escolha um segredo** forte para o hook (ex.: gere com um gerenciador de senhas).
   Ele será usado em dois lugares: no `setup.sql` e nos secrets.

2. **Secrets da função** (o token do Resend vai SÓ aqui, nunca no `.env`):
   ```sh
   supabase secrets set \
     RESEND_API_KEY=re_xxx \
     WELCOME_HOOK_SECRET=o_mesmo_segredo_do_sql \
     REMETENTE_EMAIL=contato@seudominio.com \
     REMETENTE_NOME="Oráculo Vivo"
   ```
   `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados automaticamente.

3. **Deploy da função** (sem verificação de JWT — quem chama é o trigger):
   ```sh
   supabase functions deploy enviar-boas-vindas --no-verify-jwt
   ```

4. **Rodar o SQL**: abra `setup.sql`, troque `<<PROJECT_REF>>` por
   `rfdjukdbrtvvulaxbzwb` e `<<WELCOME_HOOK_SECRET>>` pelo mesmo segredo do passo 1,
   e execute no **SQL Editor**.

5. **Testar**: crie uma conta nova, confirme pelo e-mail e verifique que o e-mail
   de boas-vindas chega (uma única vez). Confirmar de novo não reenvia.

## Como funciona / segurança

- O trigger só dispara em `email_confirmed_at NULL -> preenchido` (não em logins).
- A função só aceita chamadas com o header `x-webhook-secret` correto.
- `perfis.boas_vindas_enviada` garante que, mesmo com um disparo repetido, o
  e-mail sai no máximo uma vez.
