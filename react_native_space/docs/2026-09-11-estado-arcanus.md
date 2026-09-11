# Arcanus — estado consolidado e retomada (11/09/2026)

> **Fonte única pra retomar o projeto.** Substitui as várias "frases de retomada" espalhadas
> pelas sessões anteriores. Tudo aqui foi conferido no git, em produção e no Supabase em 11/09.

## 1. Onde as coisas vivem

| O quê | Onde |
|---|---|
| Código | `github.com/Fnmartins/Orcaculo_VIVO` → app em `react_native_space/` (Expo SDK 54 + expo-router), site estático em `site/` |
| Deploy do app | Vercel `fnmartins-projects/oraculo_vivo`, Root Directory `react_native_space`. **`git push` na `main` = deploy de produção** |
| Domínio | `www.arcanus.com.br` (principal — `arcanus.com.br` redireciona 308 pra ele). `oraculovivo.vercel.app` serve o mesmo deploy. `app.arcanus.com.br` **não existe** |
| Projeto velho | `oraculo-vivo.vercel.app` (com hífen) é **outro** projeto Vercel antigo ("Oráculo Vivo \| Leitura de Tarô Sensitiva"). Não é o app atual |
| Banco/auth | Supabase `rfdjukdbrtvvulaxbzwb` (São Paulo), conta `fabiano.n.martins@gmail.com` |
| E-mail | Resend com `arcanus.com.br` verificado; SMTP no Supabase, remetente `contato@arcanus.com.br`; templates Arcanus (corpo + assunto) |
| Pagamento | Stripe, projeto "arcanus", **sandbox/test mode**. 4 Edge Functions no ar (`criar-checkout-stripe`, `criar-portal-stripe`, `admin-configurar-plano`, `stripe-webhook`) |
| Super-admin | Só `fmcabr@gmail.com` tem `is_super_admin = true` (é quem abre o `/manager`) |

## 2. As sessões e o que cada uma deixou solto

| Sessão | Período | Entregou | Deixou pendente |
|---|---|---|---|
| Oraculo Vivo project setup | 28–31/08 | Deploy Vercel, fix de fontes, Supabase próprio | — (concluída) |
| Oráculo Vivo — Etapa 2 | 31/08–02/09 | Templates de e-mail, higiene do git, `Alert` na web, Termos/Privacidade | Migrou pro rebrand |
| Mapa do trabalho no Oráculo | 01/09 | Análise do "Mapa de Vocação & Ciclos" (P1 do conselho) | **Decisões da Fase 0 não tomadas; plano não gravado no repo** |
| Rebrand Oráculo Vivo → Arcanus | 02–04/09 | Rebrand no código, decisão Mercado Pago → Stripe | — (concluída) |
| Continua Arcanus: migração Stripe | 04/09 | Spec + plano Stripe | — (executado depois) |
| Plano Stripe Arcanus (+ fork) | 05–09/09 | Código Stripe, domínio (Resend + SMTP), e-mail brandado, spec do perfil rico | Fases C/D/E do domínio, perfil rico, decisão de marca |
| Marketing Skills | 07–09/09 | Skill `marketing-arcanus`, landings, `site/` + roadmap com senha, `lista-espera.sql` | **Site não publicado**, senhas placeholder no roadmap |
| Push do site e decisão do Stripe | 09–10/09 | Stripe + painel de planos mergeados e no ar | — (concluída) |
| Continua Arcanus Task 10 | 10/09 | Functions deployadas, secrets Stripe, webhook, seta do `/manager`, **correção da senha commitada** | **Parou em "posso fazer o push?" — a correção nunca foi pro ar** |

## 3. Por que o link de redefinir senha ia pra Vercel

Eram três problemas somados:

1. **A correção nunca foi publicada.** O commit `08213bc4` (tela `/auth/nova-senha` + leitura do
   token do link na web) ficou só local. Produção ainda mandava `arcanus://recuperar-senha` e não
   lia o token.
2. **A configuração de URLs do Supabase nunca foi feita** (era a "Fase C" do domínio). Site URL
   continua `https://oraculovivo.vercel.app` e a lista de Redirect URLs não tem nenhum endereço
   arcanus. Quando o app pede pra voltar pra um endereço fora da lista, o Supabase descarta e manda
   pro Site URL, ou seja, pra Vercel. Conferido em 11/09 com um token inválido (não envia e-mail).
3. **O secret `APP_BASE_URL` aponta pra Vercel** (`https://oraculovivo.vercel.app`, conferido pelo
   hash no `secrets list`), então o checkout do Stripe também voltaria pra lá.

## 4. Feito em 11/09

- Leitura das 10 sessões + conferência do estado real (git, bundle em produção, Supabase, functions).
- Typecheck limpo + 20/20 testes com a correção da senha.
- Push da correção da senha (`08213bc4`) + este documento → deploy Vercel.
- Memória do projeto atualizada.

## 5. O que falta, em ordem

### Bloco A — destravar o acesso (hoje)
- **A1 (você, Supabase):** Authentication → URL Configuration.
  - Site URL: `https://www.arcanus.com.br`
  - Redirect URLs: `https://www.arcanus.com.br/**`, `https://arcanus.com.br/**`, `arcanus://**`
    e manter `https://oraculovivo.vercel.app/**` na transição.
- **A2 (você, terminal):**
  `npx supabase secrets set APP_BASE_URL=https://www.arcanus.com.br --project-ref rfdjukdbrtvvulaxbzwb`
- **A3 (você):** em `https://www.arcanus.com.br`, "Esqueci minha senha" com `fmcabr@gmail.com` →
  link do e-mail → tela "Criar nova senha" → entrar → Perfil mostra o botão "Painel de planos".

### Bloco B — Stripe Task 10 (test mode). Runbook: `docs/superpowers/task-10-stripe-execution.md`
Já feito: migrações (`config-planos.sql`, `stripe-migration.sql`), 4 functions, secrets
`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, webhook endpoint na sandbox.
- **B1:** confirmar que o Customer Portal ficou ativado na sandbox.
- **B2:** `/manager` logado como `fmcabr@gmail.com` → cadastrar os 3 planos (cria Products/Prices).
  Preços não-BRL ainda são provisórios.
- **B3:** E2E 7.0–7.6 (compra 4242, renovação, cancelamento, recusado 4000…0002, idempotência, troca de preço).
- **B4:** go-live: secrets live, novo `whsec_` live, recadastrar planos em live, 1 compra + 1 renovação reais.

### Bloco C — domínio e e-mail
- **C1 (Fase D):** e-mail de boas-vindas — secrets `RESEND_API_KEY`/`WELCOME_HOOK_SECRET`/`REMETENTE_EMAIL`,
  `functions deploy enviar-boas-vindas --no-verify-jwt`, rodar `supabase/welcome-email/setup.sql`.
- **C2 (Fase E):** receber `contato@arcanus.com.br` (encaminhamento pro Gmail). Termos/Privacidade citam esse endereço.

### Bloco D — decisões de produto (suas)
- **D1 — site × app:** hoje `www.arcanus.com.br` é o **app**. O `site/` (landing + roadmap) não está
  publicado. Se o app for pra `app.arcanus.com.br`, Site URL, Redirect URLs e `APP_BASE_URL` mudam
  de novo. Decidir antes de mexer. Confirmar se `lista-espera.sql` foi rodado e trocar as senhas
  placeholder do `roadmap.html`.
- **D2 — marca:** "Oráculo Vivo" some de vez, vira tagline ("Arcanus — seu oráculo vivo") ou outra tagline. Usar a skill `marketing-arcanus`.
- **D3 — perfil rico:** spec pronto em `docs/superpowers/specs/2026-09-09-perfil-rico-design.md`, falta plano + código.
- **D4 — Mapa de Vocação:** escolher efemérides (Moshier recomendado), geocoding (GeoNames offline) e escopo do MVP.

### Bloco E — backlog técnico
- Redefinição de senha no **app nativo**: o deep link `arcanus://auth/nova-senha` ainda não consome o token (web resolvida; só importa quando for pras lojas).
- SEO/Open Graph (`app/+html.tsx`), exclusão de conta real (botão sem ação), teste responsivo do `/planos` (375/768px).
- Bundle IDs `com.abacusai.oraculovivo` (só pra lojas); projeto antigo `oraculo-vivo.vercel.app`.

## 6. Higiene recomendada

- Branches `feat/painel-planos`, `feat/perfil-rico` e `feat/stripe-migration` já estão 100% dentro da `main` → podem ser apagadas.
- Abrir as próximas sessões do Arcanus **na pasta `oraculo_vivo`**, não em `careertwin` (UpRole). Várias
  confusões vieram daí: analogia de "histórico de vagas" do UpRole, hooks e regras de Next.js do careertwin.
- As 10 sessões antigas podem ser arquivadas depois de ler este doc.

## 7. Como retomar

> **"continua Arcanus: ler `react_native_space/docs/2026-09-11-estado-arcanus.md` e seguir do Bloco A"**
