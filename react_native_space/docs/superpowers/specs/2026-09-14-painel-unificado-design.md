# Painel unificado (Planos + Roadmap + Acessos) — design

- **Data:** 2026-09-14
- **Branch:** `feat/painel-unificado` (de `main`)
- **Status:** aprovado no brainstorming, aguardando plano de implementação

## Contexto e objetivo

Hoje o Arcanus tem quatro peças soltas, cada uma com sua porta:

| Peça | Onde vive | Como entra |
|---|---|---|
| Site (landing) | `site/index.html` (ainda sem deploy) | público |
| Aplicação | Expo, `app.arcanus.com.br` / `www` | login Supabase |
| Manager | `app/manager.tsx` — só o painel de planos | `perfis.is_super_admin` |
| Roadmap | `site/roadmap.html` | senha própria no cliente; conteúdo público no GitHub |

`services/admin.ts` (listar usuários, promover/rebaixar) e `hooks/useAdmin.ts` existem, mas nenhuma tela
os usa — por isso dar acesso ao Marcio exige SQL manual.

Objetivo: **uma porta, um login.** O site continua como vitrine pública; dentro do app, o `/manager` vira
um painel único com três abas — **Planos**, **Roadmap** (editável) e **Acessos** (usuários e admins) —
todas atrás do mesmo login do Supabase. A página `site/roadmap.html` deixa de existir.

## Achado de segurança que vira pré-requisito

Pelos SQL do repo (`supabase_schema.sql` + `supabase_fix_rls_recursion.sql`), a única regra de UPDATE
em `perfis` é:

```sql
create policy "Usuário edita só o próprio perfil"
  on public.perfis for update using (auth.uid() = id or public.is_super_admin());
```

Sem restrição de coluna, sem `with check`, sem gatilho de proteção, e com os grants padrão do Supabase
(`authenticated` pode `UPDATE` na tabela toda). Consequência: qualquer usuário logado, com a anon key
pública do app, grava na **própria linha** `is_super_admin = true` (abre o `/manager` e passa no check da
`admin-configurar-plano`, que confere essa coluna), `plano`/`plano_valido_ate` (acesso pago sem pagar) e
`stripe_customer_id` (o portal de pagamento abriria o cliente de outra pessoa).

**Confirmado em produção em 14/09** (consultas só leitura no SQL Editor):

- `pg_policies`: UPDATE `((auth.uid() = id) OR is_super_admin())` com `with_check` nulo; SELECT igual.
  Não há policy de INSERT nem de DELETE (a RLS nega os dois).
- `role_table_grants`: `anon` e `authenticated` com `DELETE, INSERT, REFERENCES, SELECT, TRIGGER,
  TRUNCATE, UPDATE` na tabela inteira (padrão do Supabase).
- Único gatilho: `perfis_atualizado_em` (só carimba a data).

O que é explorável pela API pública: **UPDATE da própria linha, qualquer coluna, por usuário logado.**
INSERT/DELETE são barrados pela RLS; TRUNCATE não é exposto pelo PostgREST; `anon` não casa com nenhuma
linha. Uma aba de Acessos não faz sentido enquanto qualquer um pode se promover, então a correção é a
Fase 1 deste trabalho — e pode ser antecipada sozinha, porque não depende de nenhuma tela.

Edge Functions conferidas: `stripe-webhook`, `criar-checkout-stripe`, `criar-portal-stripe`,
`admin-configurar-plano` e `enviar-boas-vindas` leem/gravam `perfis` com service role (não são afetadas
pelos grants); `ia-oraculo` não toca `perfis`.

## Decisões travadas (brainstorming 2026-09-14)

1. **Uma porta, um login** — site público separado; Planos, Roadmap e Acessos dentro do app.
2. **Roadmap editável no painel**, conteúdo no banco (sai do GitHub público).
3. **Acessos v1 = listar usuários + dar/tirar super-admin.** Plano cortesia fica fora; o plano de cada
   pessoa continua sendo definido só pela Stripe.
4. **Segurança por padrão fechado (abordagem A):** o app só grava colunas explicitamente liberadas;
   mudar papel passa por Edge Function; roadmap protegido por RLS. Rejeitada a abordagem B (gatilho
   listando colunas proibidas), porque toda coluna sensível nova ficaria aberta até alguém lembrar dela.
5. **Só super-admin vê o painel.** Não há papel intermediário (ex.: "só leitura") nesta versão.

## Arquitetura

```
arcanus.com.br (site estático) ──CTAs──▶ app.arcanus.com.br (Expo)
                                              │
                                   Perfil ─ "Painel" (só super-admin)
                                              ▼
                                   /manager?aba=planos|roadmap|acessos
                                     │            │               │
                          admin-configurar-   roadmap_itens    admin-acessos
                          plano (existente)   (RLS super-admin)  (Edge Function)
```

### 1. Segurança da tabela `perfis`

Arquivo novo `supabase/painel-seguranca-perfis.sql` (idempotente, rodado no SQL Editor, como os demais
SQL deste diretório):

```sql
revoke insert, update, delete, truncate, references, trigger on public.perfis from anon, authenticated;
grant update (nome, avatar_url, data_nascimento, signo, caminho_espiritual, intencao,
              xp, nivel, ultima_consulta_em)
  on public.perfis to authenticated;
```

- `select` continua como está (RLS: próprio perfil ou super-admin).
- A linha do perfil continua sendo criada pelo gatilho `ao_criar_usuario` (security definer), então o
  `revoke insert` não afeta o cadastro.
- Colunas fora da lista — `role`, `is_super_admin`, `permissions`, `plano`, `plano_valido_ate`,
  `consultas_restantes`, `stripe_customer_id`, `email`, `streak`, `id` e **qualquer coluna futura** — só
  mudam via service role (Edge Functions). Webhook Stripe e `admin-configurar-plano` já usam service role.
- Colunas liberadas conferidas no código em 14/09: o app grava `nome` e `avatar_url`
  (`app/(tabs)/perfil.tsx`) e `xp`, `nivel`, `ultima_consulta_em` (`DatabaseServico.adicionarXP`).
  `data_nascimento`, `signo`, `caminho_espiritual` e `intencao` são dados do próprio usuário, liberados
  já para o perfil rico. **Colunas novas do perfil rico precisam de `grant update` explícito na migração
  delas.**
- Rollback documentado no próprio arquivo: `grant update on public.perfis to authenticated;`.
- `services/admin.ts` é **removido** (nunca usado; grava papel direto do cliente, o que passa a falhar).
  `hooks/useAdmin.ts` fica (é leitura).

### 2. Edge Function `admin-acessos`

`supabase/functions/admin-acessos/index.ts`, mesmo esqueleto da `admin-configurar-plano` (CORS,
`resposta()`, service role, autorização pelo JWT do header e nunca pelo body, `is_super_admin` conferido
no perfil → 403). Entrada em `supabase/config.toml` com `verify_jwt = true`.

Corpo `POST`:

- `{ "acao": "listar" }` → `200 { usuarios: [{ id, nome, email, criado_em, plano, is_super_admin }] }`,
  ordenado por `criado_em` desc (lido de `perfis`).
- `{ "acao": "definir-admin", "usuarioId": "<uuid>", "admin": true|false }` →
  - `admin: true` → `role = 'super_admin'`, `is_super_admin = true`;
  - `admin: false` → `role = 'usuario'`, `is_super_admin = false`, `permissions = '{}'`;
  - `200 { usuario: {...} }`, `400` input inválido, `404` usuário não existe, `409` violou uma trava.

**Travas**, em módulo puro `supabase/functions/_shared/regras-acessos.ts` (sem imports Deno/`npm:`, para
o Jest importar):

```ts
validarMudancaAdmin({ solicitanteId, alvoId, tornarAdmin, alvoEhAdmin, totalAdmins })
  // → { ok: true } | { ok: false, erro: string }
```

- ninguém remove o próprio acesso (`!tornarAdmin && alvoId === solicitanteId`);
- nunca zerar super-admins (`!tornarAdmin && alvoEhAdmin && totalAdmins <= 1`);
- promover quem já é admin / rebaixar quem não é → `ok` (idempotente, sem erro).

Risco aceito: dois admins rebaixando um ao outro no mesmo instante podem passar pela contagem juntos.
Com duas pessoas operando, não compensa lock/transação nesta versão.

### 3. Moldura do painel (`/manager`)

- `app/manager.tsx` vira só a moldura: porta de super-admin (comportamento atual), cabeçalho "Painel",
  seta de voltar (lógica atual de `router.canGoBack()`), abas **Planos · Roadmap · Acessos**.
- Aba ativa em query param: `/manager?aba=planos|roadmap|acessos` (padrão `planos`; valor inválido cai
  em `planos`).
- Cada aba em `components/manager/`: `AbaPlanos.tsx` (conteúdo atual do manager + `CardPlano`, movido
  **sem mudança de comportamento**), `AbaRoadmap.tsx`, `AbaAcessos.tsx`.
- Perfil (`app/(tabs)/perfil.tsx`): o link "Painel de planos" passa a se chamar **"Painel"**.

### 4. Roadmap

Arquivo novo `supabase/roadmap.sql`:

```sql
create table if not exists public.roadmap_itens (
  id             uuid primary key default gen_random_uuid(),
  fase           text not null check (length(trim(fase)) > 0),
  titulo         text not null check (length(trim(titulo)) > 0),
  descricao      text,
  status         text not null default 'todo' check (status in ('todo','run','ok','block')),
  ordem          int  not null default 0,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null
);
```

- RLS ligado; policies de `select`/`insert`/`update`/`delete` com `public.is_super_admin()`
  (em `using` e `with check`). Grants para `authenticated`; nada para `anon`.
- Gatilho `before insert or update` preenche `atualizado_em = now()` e `atualizado_por = auth.uid()`.
- Seed com os 20 itens do `site/roadmap.html` (versão de 14/09, 6 fases), `ordem` 1..20 na sequência
  atual, só se a tabela estiver vazia.
- Status na UI: `todo` "A fazer", `run` "Em andamento", `ok` "Concluído", `block` "Bloqueado" (rótulos e
  cores da página atual).

Cliente:

- `services/roadmap.ts`: `listar()`, `criar(item)`, `atualizar(id, campos)`, `excluir(id)` via supabase
  client (a RLS é a trava).
- `utils/roadmap.ts` (puro): `agruparPorFase(itens)` e `calcularProgresso(itens)` → `{ concluidos, total }`.
  Ordem: as fases seguem a **menor `ordem`** entre seus itens; dentro da fase, itens por `ordem`
  (empate por `criado_em`). Assim `ordem` repetida entre fases diferentes não embaralha nada.
- Tela: barra "N de M concluídos"; itens agrupados por fase com etiqueta de status; tocar abre edição
  (título, descrição, fase — escolher existente ou digitar nova —, status) com **Salvar** e **Excluir**
  (confirmação); **"+ Novo item"** cria no fim da fase (`ordem = maior da fase + 1`; em fase nova,
  `maior ordem geral + 1`, o que a coloca por último).
- Fora da v1: arrastar para reordenar, histórico de mudanças, nome de quem editou.

### 5. Acessos

- `services/acessos.ts`: `listarUsuarios()` e `definirAdmin(usuarioId, admin)` via
  `supabase.functions.invoke('admin-acessos', ...)`.
- `utils/acessos.ts` (puro): `filtrarUsuarios(usuarios, termo)` — busca sem acento e sem caixa em nome e
  e-mail; termo vazio devolve todos.
- Tela: busca no topo; linhas com nome, e-mail, data de cadastro, plano (só leitura) e selo **Admin**;
  botão **"Tornar admin"** / **"Remover admin"** com confirmação ("pode alterar preços na Stripe e usa
  todos os recursos sem pagar"); na própria linha, botão desativado com a nota "você". Após sucesso,
  recarrega a lista.

## Tratamento de erros

| Situação | Comportamento |
|---|---|
| Falha de rede / 5xx em qualquer aba | mensagem na aba + botão "Tentar de novo"; nada é perdido do formulário aberto |
| `403` da `admin-acessos`, ou RLS negando no roadmap (erro `42501` em insert, ou update/delete que não afeta nenhuma linha) | "Seu acesso de admin foi removido." → `recarregarPerfil()` e volta ao Perfil. O `services/roadmap.ts` pede a linha de volta (`.select()`) para distinguir "nenhuma linha afetada" de sucesso |
| `409` (trava) | mostra a mensagem do servidor; lista não muda |
| Salvar item com título ou fase vazios | validação no cliente antes de enviar (o `check` do banco é a última linha) |
| Perfil com coluna não liberada (ex.: código futuro gravando `plano` do cliente) | erro `permission denied` — é o comportamento desejado; o plano de implementação confere que nenhum fluxo atual cai nisso |

## Testes

Jest (padrão atual: `services/__tests__`, `data/__tests__`):

- `utils/roadmap`: agrupamento preserva ordem de fases e itens; progresso com lista vazia, parcial e total.
- `utils/acessos`: filtro por nome, por e-mail, sem acento/caixa, termo vazio.
- `_shared/regras-acessos`: não remover a si mesmo; não zerar admins; promoção/rebaixamento idempotentes;
  caso válido. (O plano confirma que o Jest encontra o teste; se o `testPathIgnorePatterns` excluir
  `supabase/`, o teste fica em `services/__tests__` importando o módulo por caminho relativo.)
- Typecheck limpo e suíte atual verde (hoje 20/20 + os novos).

Roteiro manual antes do push (registrar resultado no PR/commit):

1. **Conta comum:** edita nome, troca foto e conclui uma leitura (ganha XP) normalmente; tentativa de
   `update perfis set is_super_admin = true` com o token dela é **negada**.
2. **Super-admin:** cria, edita, muda status e exclui item do roadmap.
3. **Super-admin:** promove e rebaixa uma conta de teste; o botão da própria linha está desativado;
   rebaixar o último admin é recusado.
4. **Aba Planos:** salvar um plano continua funcionando (regressão da tela movida).

## Ordem de entrega

1. ~~Conferência do banco real~~ — **feita em 14/09**, bate com o repo (ver "Achado de segurança").
   O `revoke` de tabela precisa vir **antes** do `grant` por coluna: no Postgres, revogar o privilégio da
   tabela também remove os de coluna.
2. **Segurança:** `painel-seguranca-perfis.sql` + `admin-acessos` (function, `config.toml`,
   `_shared/regras-acessos.ts` + testes) + remoção de `services/admin.ts`.
3. **Moldura** do `/manager` com a aba Planos movida + link "Painel" no Perfil.
4. **Roadmap:** `roadmap.sql` (tabela, RLS, gatilho, seed) + serviço, utils, testes e aba.
5. **Acessos:** serviço, utils, testes e aba.
6. **Limpeza:** remover `site/roadmap.html`; em `site/vercel.json` redirecionar `/roadmap` para
   `https://app.arcanus.com.br/manager?aba=roadmap`; atualizar `site/README.md` e o doc de estado.

Passos externos (fora do código, com o Fabiano): rodar os dois SQL, deployar a function
(`npx supabase functions deploy admin-acessos --project-ref rfdjukdbrtvvulaxbzwb`) e `git push`.

## Critérios de sucesso

- Uma conta comum não consegue alterar papel, plano nem `stripe_customer_id` do próprio perfil.
- Fabiano dá acesso de super-admin ao Marcio pela aba Acessos, sem SQL.
- Fabiano e Marcio atualizam o roadmap no painel e veem a mudança um do outro ao recarregar.
- `site/roadmap.html` não existe mais e `/roadmap` no site leva ao painel.
- A aba Planos se comporta exatamente como o manager atual.

## Fora do escopo

- Infra de domínio: recriar o CNAME `app`, publicar o site, mover `arcanus.com.br`/`www`
  (roteiro em `site/README.md`).
- Plano cortesia, papel "só leitura", perfil rico, go-live do Stripe, e-mail de boas-vindas.
