# E-mails de autenticação brandados — Oráculo Vivo

Templates PT-BR com a identidade do Oráculo Vivo para os e-mails que o Supabase
envia (projeto **`rfdjukdbrtvvulaxbzwb`**). Trocam o visual genérico "Confirm your
email address / powered by Supabase" pela marca do app.

## Arquivos

| Arquivo | Template do Supabase | Assunto sugerido |
|---|---|---|
| `confirmacao-cadastro.html` | **Confirm signup** | `Confirme seu e-mail e desperte o Oráculo Vivo ✦` |
| `recuperar-senha.html` | **Reset Password** | `Redefinir sua senha do Oráculo Vivo` |
| `boas-vindas.html` | *(não é template nativo — ver seção Boas-vindas)* | `Bem-vindo(a) ao Oráculo Vivo 🌙` |

> O app usa e-mail/senha (cadastro + "esqueceu a senha"), então os dois primeiros
> são os que realmente disparam hoje. Se um dia ativar Magic Link / troca de e-mail,
> os templates `Magic Link` e `Change Email Address` podem ser brandados do mesmo jeito.

---

## 1. Colar os templates (corpo dos e-mails)

1. Supabase Dashboard → projeto **Oraculo Vivo** (`rfdjukdbrtvvulaxbzwb`).
2. Menu **Authentication** → **Emails** → aba **Templates**.
3. Selecione **Confirm signup**:
   - Em **Subject**, cole o assunto da tabela acima.
   - Em **Message body**, apague o HTML padrão e cole TODO o conteúdo de
     `confirmacao-cadastro.html`.
   - **Save**.
4. Repita para **Reset Password** com `recuperar-senha.html`.

⚠️ Não renomeie as variáveis `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}` —
o Supabase as substitui no envio.

## 2. Conferir as URLs de redirecionamento (importante p/ a web)

Para o link de confirmação voltar pro app (e não dar 404):

1. **Authentication** → **URL Configuration**.
2. **Site URL**: `https://oraculovivo.vercel.app`
3. **Redirect URLs**: adicione (uma por linha):
   - `https://oraculovivo.vercel.app/**`
   - `oraculovivo://**` (deep-link do app mobile)
4. **Save**. (O rewrite SPA no `vercel.json` já garante que rotas profundas na web
   não dão 404.)

## 3. Custom SMTP — trocar o remetente (deixar de ser `@mail.app.supabase.io`)

Sem SMTP próprio o Supabase envia por `noreply@mail.app.supabase.io`, com selo
"powered by Supabase" e um **limite baixo de e-mails/hora** (bom só p/ testes).
Para o remetente virar a marca do Oráculo Vivo e liberar volume:

1. Tenha um provedor de e-mail transacional. Opções comuns:
   - **Resend** (recomendado, integra fácil e tem plano grátis)
   - **SendGrid**, **Amazon SES**, **Brevo**, ou o **SMTP do seu domínio**.
2. No provedor: verifique o **domínio remetente** (DNS: SPF + DKIM). Sem isso os
   e-mails caem em spam. → gera host, porta, usuário e senha SMTP.
3. Supabase → **Authentication** → **Emails** → **SMTP Settings** →
   **Enable Custom SMTP** e preencha:
   - **Sender email**: ex. `contato@seudominio.com` (ou o remetente verificado)
   - **Sender name**: `Oráculo Vivo`
   - **Host / Port / Username / Password**: os dados do provedor.
4. **Save** e mande um e-mail de teste.

> 🔒 **Credenciais SMTP são você quem preenche** — eu (assistente) não insiro
> senhas/tokens em formulários. Me avise o provedor escolhido que eu te passo o
> passo-a-passo específico (ex.: no Resend, criar API key e usar `resend` como
> usuário SMTP).

## 4. Boas-vindas (pós-confirmação)

O Supabase **não** manda um e-mail de boas-vindas por conta própria. O
`confirmacao-cadastro.html` já foi escrito com tom de boas-vindas e cobre esse
papel hoje. Se quiser um e-mail **separado**, disparado só depois da conta
confirmada, dá pra ligar `boas-vindas.html` via:

- **Auth Hook "Send Email"** (Beta) no Supabase, ou
- uma **Edge Function / Database Webhook** no evento de novo usuário, enviando
  pelo SMTP/Resend.

Isso é um passo extra — me avise se quiser que eu monte.

## 5. Testar

1. Crie uma conta nova no app (web: acessar `/welcome`).
2. Confira o e-mail recebido: remetente, assunto e visual da marca.
3. Clique em **Confirmar meu e-mail** → deve abrir o app já confirmado.
4. Teste "esqueci a senha" no login e confira o e-mail de redefinição.
