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

## 4.1 Atualização de 14/09 — decisões tomadas e estado conferido

Conferido ao vivo (curl nos domínios, `/planos` em produção, Vercel CLI, histórico das sessões):

- **B1 ✅** portal do cliente com cancelamento ligado (salvo em 11/09, 18h25).
- **B2 1/3:** `/planos` em produção mostra só o **Iniciante** — a tela só lista plano com `stripe_price_id`,
  então Explorador e Mestre ainda não foram salvos no `/manager`.
- **O repo `Fnmartins/Orcaculo_VIVO` é público.** Nenhum `.env` nem chave está versionado (conferido), mas
  tudo que entra no git é visível. As senhas do roadmap passaram a ser guardadas só como hash.
- **DNS no registro.br** (`a.sec.dns.br`/`b.sec.dns.br`); `arcanus.com.br` e `www` já apontam pra Vercel.

**D1 decidido — site × app:** site institucional em `arcanus.com.br`/`www`, app em `app.arcanus.com.br`.
Motivo: é o desenho que o site já assume (CTAs apontam pro `app.`), o app praticamente não tem usuário real
ainda, e mudar **antes** do go-live evita gravar os secrets live e os preços com o domínio errado.
O redirecionamento de senha usa `window.location.origin` (`services/auth.ts`), então o app não precisa de
mudança de código — só Vercel, DNS, URL Configuration e `APP_BASE_URL`. Passo a passo em `site/README.md`.

**Acesso do Marcio decidido:** `marciogayerdacosta@gmail.com` vira super-admin completo. A conta já existe
no Arcanus (criada em 08/09, `is_super_admin = false` na consulta de 10/09) e era a intenção original do
`supabase_schema.sql`. Vale saber: a flag libera o `/manager` (cria/arquiva preços na Stripe, checado no
servidor pela `admin-configurar-plano`) **e** todo recurso premium sem cota (`hooks/usePlano.ts`). Não
existe papel intermediário. Rever antes do go-live se ele deve manter o acesso ao painel em live mode.

```sql
update public.perfis
   set role = 'super_admin', is_super_admin = true
 where id = (select id from auth.users where email = 'marciogayerdacosta@gmail.com');
```

**✅ Aplicado em 20/09.** Na mesma passada, o `role` do `fmcabr@gmail.com` foi normalizado para
`super_admin` (estava `usuario` com `is_super_admin = true`, porque a linha foi feita na mão antes do
painel existir; o painel grava os dois campos). Hoje quem decide acesso é **só** a coluna
`is_super_admin` — `public.is_super_admin()`, `admin-acessos`, `admin-configurar-plano` e o
`useIsSuperAdmin` do `app/manager.tsx` leem só ela; `useRole`/`useIsAdmin` não têm consumidor. A
normalização é defesa contra alguém passar a checar `role` um dia.

**Falha de UPDATE em `perfis` — corrigida em produção em 15/09.** Qualquer usuário logado podia gravar
`is_super_admin`, `plano` e `stripe_customer_id` na própria linha (policy sem limite de coluna + grant de
UPDATE na tabela inteira). Aplicado no SQL Editor:

```sql
revoke insert, update, delete, truncate, references, trigger on public.perfis from anon, authenticated;
grant update (nome, avatar_url, data_nascimento, signo, caminho_espiritual, intencao, xp, nivel, ultima_consulta_em)
  on public.perfis to authenticated;
```

Conferido: `has_column_privilege('authenticated','public.perfis','is_super_admin','UPDATE')` = false e
`nome` = true; simulação como `authenticated` gravando `nome` devolveu a linha. Nenhum abuso encontrado
(só `fmcabr@gmail.com` e `marciogayerdacosta@gmail.com` são admin; ninguém com plano pago ou Stripe).
**Não rodar `grant update on public.perfis to authenticated`** — foi o que reabriu a falha uma vez no
mesmo dia. Colunas novas de perfil (ex.: perfil rico) precisam de `grant update (coluna)` explícito.
Design completo do painel: `docs/superpowers/specs/2026-09-14-painel-unificado-design.md`.

**DNS do `app` (15/09):** publicado → `909972bdddff1054.vercel-dns-017.com.`; `https://app.arcanus.com.br`
= 200. Lição: no registro.br, trocar o valor de um CNAME exige dois salvamentos (remover, depois criar), e
uma linha cinza no painel não garante publicação — conferir o serial do SOA (`nslookup -type=SOA
arcanus.com.br a.sec.dns.br`), que muda a cada publicação.

**Painel unificado em produção (16/09).** `/manager` com abas Planos, Roadmap e Acessos
(spec `docs/superpowers/specs/2026-09-14-painel-unificado-design.md`, plano
`docs/superpowers/plans/2026-09-15-painel-unificado.md`). Produção feita na ordem do plano:
`supabase/roadmap.sql` rodado (20 itens, 4 policies, sem acesso de `anon` nem TRUNCATE de `authenticated`),
trava de `perfis` conferida `FECHADA`, função `admin-acessos` publicada (401 sem login), push
`62d05f09..5fa45121` e deploy Vercel com o bundle novo conferido. Roteiro manual do Fabiano: **tudo ok**
(Perfil sem login, modal de nome, conta comum barrada, `/manager` sem login com botão Entrar, Planos com
**Explorador e Mestre salvos — B2 concluído**, Roadmap, Acessos e link `?aba=`). O `roadmap.html` com senha
saiu do site; o roadmap agora é editado no Painel. Abrir `app.arcanus.com.br` sem login cai na Início de
propósito (modo livre): login só é pedido pra Perfil, planos e Painel.

**Site institucional no domínio (17/09).** `arcanus.com.br` e `www.arcanus.com.br` servem a landing
(projeto Vercel `arcanus-site`); o app ficou só em `app.arcanus.com.br` (projeto `oraculo_vivo`). Antes
da troca: Site URL do Supabase trocada pra `https://app.arcanus.com.br` e `APP_BASE_URL` já no `app`.
As duas pendências pequenas foram fechadas no mesmo dia: o `arcanus-site` foi ligado ao GitHub
(`Fnmartins/Orcaculo_VIVO`, branch `main`, Root Directory `site`, Ignored Build Step
`git diff --quiet HEAD^ HEAD ./`), então um `git push` que toca `site/` publica a landing; e o 308
`arcanus.com.br` → `www` foi recriado no `arcanus-site` pela API, porque o Save do painel não habilitava.
Detalhes, o comando exato e a ordem correta de mover o `www` estão em `site/README.md`.

**Lista de espera:** fora por enquanto (ver `site/README.md`).

**Ordem daqui pra frente (revisada em 20/09):** (1) E2E 7.0–7.6 em test mode, com o 7.0 já conferido ·
(2) go-live (secrets live, novo `whsec_`, preços EUR/USD revisados, recadastrar os 3 planos em live,
1 compra + 1 renovação reais) · (3) boas-vindas, `contato@`, perfil rico, Mapa de Vocação.
Já saíram da fila desde 14/09: painel unificado em produção (16/09), Explorador e Mestre salvos (B2), a
migração do domínio (17/09) e o acesso do Marcio (20/09).

## 5. O que falta, em ordem

### Bloco A — destravar o acesso ✅ FEITO 11/09
(Site URL e Redirect URLs arcanus + `app.arcanus.com.br/**` salvos e testados; `APP_BASE_URL`
= `https://www.arcanus.com.br`; redefinição de senha do `fmcabr@gmail.com` funcionou.)
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
- **B1 ✅ (11/09):** Customer Portal ativado na sandbox, com cancelamento permitido.
- **B2 ✅ (16/09):** os 3 planos salvos pelo `/manager` — Iniciante em 11/09, Explorador e Mestre no roteiro
  do painel unificado. Preços não-BRL ainda são provisórios.
- **B3 ← é aqui que estamos:** E2E 7.0–7.6 (compra 4242, renovação, cancelamento, recusado 4000…0002,
  idempotência, troca de preço). Roteiro e queries em `docs/superpowers/task-10-stripe-execution.md` §7.
- **B4:** go-live: secrets live, novo `whsec_` live, `APP_BASE_URL=https://app.arcanus.com.br`,
  recadastrar os planos em live, 1 compra + 1 renovação reais.

### Bloco C — domínio e e-mail
- **C1 (Fase D):** e-mail de boas-vindas — secrets `RESEND_API_KEY`/`WELCOME_HOOK_SECRET`/`REMETENTE_EMAIL`,
  `functions deploy enviar-boas-vindas --no-verify-jwt`, rodar `supabase/welcome-email/setup.sql`.
- **C2 (Fase E):** receber `contato@arcanus.com.br` (encaminhamento pro Gmail). Termos/Privacidade citam esse endereço.

### Bloco D — decisões de produto (suas)
- **D1 — site × app:** ✅ decidido em 14/09 (ver seção 4.1): site em `arcanus.com.br`, app em
  `app.arcanus.com.br`. O roadmap saiu do site em 15/09 e está no Painel do app
  (`/manager?aba=roadmap`); a página `roadmap.html` e as senhas dela não existem mais.
- **D2 — marca:** "Oráculo Vivo" some de vez, vira tagline ("Arcanus — seu oráculo vivo") ou outra tagline. Usar a skill `marketing-arcanus`.
- **D3 — perfil rico:** spec pronto em `docs/superpowers/specs/2026-09-09-perfil-rico-design.md`, falta plano + código.
- **D4 — Mapa de Vocação:** escolher efemérides (Moshier recomendado), geocoding (GeoNames offline) e escopo do MVP.

### Bloco E — backlog técnico

**Anotados em 15/09 (pedido do Fabiano: ajustar depois da etapa do painel/domínio):**
- **Modal "Editar Nome" ilegível ✅ resolvido em 16/09** (junto com o painel unificado). O card do modal
  passou a usar os tokens do tema creme (`Cores.superficie`, `Cores.inputFundo`, `Cores.textoPrimario`);
  o `#1E1B2E` fixo não existe mais em `app/` nem em `components/`.
- **Editar nome sem login ✅ resolvido em 16/09.** Sem sessão o lápis nem aparece, e
  `AuthContext.atualizarPerfil` lança `ERRO_SEM_SESSAO` (`contexts/AuthContext.tsx:62`) em vez de retornar
  calado com o modal fechando como se tivesse salvo.
- **Revisar (pedido do Fabiano 11/09):** depois de salvar a nova senha, o usuário entra direto, sem
  pedir login de novo. Hoje é proposital (`app/auth/nova-senha.tsx` usa a sessão de recuperação e vai
  pra `/(tabs)`). Alternativa: `signOut()` após o `updateUser` e mandar pro `/auth/login` com aviso
  "senha alterada, entre com a nova senha". Decidir e ajustar.
- Redefinição de senha no **app nativo**: o deep link `arcanus://auth/nova-senha` ainda não consome o token (web resolvida; só importa quando for pras lojas).
- SEO/Open Graph (`app/+html.tsx`), exclusão de conta real (botão sem ação), teste responsivo do `/planos` (375/768px).
- Bundle IDs `com.abacusai.oraculovivo` (só pra lojas); projeto antigo `oraculo-vivo.vercel.app`.

## 6. Higiene recomendada

- Branches `feat/painel-planos`, `feat/perfil-rico` e `feat/stripe-migration` já estão 100% dentro da `main` → podem ser apagadas.
- Abrir as próximas sessões do Arcanus **na pasta `oraculo_vivo`**, não em `careertwin` (UpRole). Várias
  confusões vieram daí: analogia de "histórico de vagas" do UpRole, hooks e regras de Next.js do careertwin.
- As 10 sessões antigas podem ser arquivadas depois de ler este doc.

## 7. Como retomar

> **"continua Arcanus: ler `react_native_space/docs/2026-09-11-estado-arcanus.md` e seguir do Bloco B3"**

(Blocos A, B1, B2 e D1 estão fechados; B3 = E2E 7.0–7.6 em test mode, com o 7.0 já conferido em 20/09.)
