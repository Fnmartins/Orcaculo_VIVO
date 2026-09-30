# E-mail de boas-vindas pós-confirmação — Arcanus

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

**Você não escolhe nem vê o segredo do hook.** Ele é sorteado pelo banco e fica no
Vault; ninguém precisa copiá-lo para lugar nenhum. Nenhum passo tem placeholder:

1. **Rodar `setup.sql`** no **SQL Editor** do projeto `rfdjukdbrtvvulaxbzwb`, como
   está. Ele confere o Vault, cria a coluna de idempotência, sorteia o segredo (só
   se ainda não existir), cria a RPC que a função usa para lê-lo e instala o
   trigger. As consultas de conferência estão comentadas no fim do arquivo — e
   nenhuma mostra o segredo, só o tamanho dele.

2. **Secrets da função** — o token do Resend vai SÓ aqui, nunca no `.env`:
   ```sh
   npx supabase secrets set RESEND_API_KEY=re_xxx REMETENTE_EMAIL=contato@arcanus.com.br REMETENTE_NOME=Arcanus --project-ref rfdjukdbrtvvulaxbzwb
   ```
   `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados automaticamente.

3. **Deploy da função**, sem verificação de JWT — quem chama é o trigger, que não
   tem JWT de usuário:
   ```sh
   npx supabase functions deploy enviar-boas-vindas --no-verify-jwt --project-ref rfdjukdbrtvvulaxbzwb
   ```

4. **Testar**: crie uma conta nova, confirme pelo e-mail e veja o de boas-vindas
   chegar uma única vez. Confirmar de novo não reenvia.

O `REMETENTE_EMAIL` precisa ser um remetente **verificado no Resend**, o que é o
mesmo trabalho de DNS do item 14 do roadmap (receber `contato@arcanus.com.br`).
Fazer os dois na mesma sessão de DNS economiza uma ida.

## Como funciona / segurança

- O trigger só dispara em `email_confirmed_at NULL -> preenchido` (não em logins).
- A função só aceita chamadas com o header `x-webhook-secret` correto, comparado em
  tempo constante, e o valor esperado vem do Vault pela RPC `segredo_boas_vindas` —
  que é `security definer` com `EXECUTE` revogado de `anon` e `authenticated` e
  concedido só a `service_role`.
- **Um valor, um lugar.** A versão anterior mantinha o mesmo segredo em dois
  lugares (secrets da função e trigger SQL) e pedia para substituir placeholders à
  mão. Se divergissem — ou se alguém rodasse o SQL sem trocar o placeholder — a
  função responderia 401, ninguém receberia e-mail, o cadastro continuaria
  funcionando e não apareceria erro em lugar nenhum.
- Segredo ausente no Vault **não derruba a confirmação de conta**: o trigger
  registra um `warning` no log do Postgres e segue. Cadastro importa mais que
  e-mail de boas-vindas.
- `perfis.boas_vindas_enviada` garante que, mesmo com um disparo repetido, o e-mail
  sai no máximo uma vez.
