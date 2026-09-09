# Painel de Planos (manager super-admin) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma tela `/manager` gated por super-admin onde o operador ajusta preço (4 moedas) e cota por plano; salvar cria/atualiza Product+Price na Stripe e o app passa a ler tudo do banco.

**Architecture:** Fonte de verdade migra de código/env para a tabela `config_planos`. A Edge Function `admin-configurar-plano` (só super-admin) cria o Price novo na Stripe com `currency_options`, grava no banco e arquiva o antigo. `criar-checkout-stripe` e `stripe-webhook` passam a ler Price ID e cota do banco. O cliente lê a config e renderiza `/planos` e `/manager`.

**Tech Stack:** Expo SDK 54 + expo-router + TypeScript (app); Supabase Postgres + RLS; Supabase Edge Functions (Deno) + Stripe SDK via esm.sh; Jest (jest-expo) para o cliente.

## Global Constraints

- **NÃO é Next.js.** É Expo/expo-router SDK 54 — não aplicar regras do AGENTS.md do careertwin aqui.
- **Segredos só nos secrets do Supabase, NUNCA em `.env`/`EXPO_PUBLIC_*`:** o `STRIPE_SECRET_KEY` já existe; nada novo pro cliente. A função admin autoriza pelo **JWT** do request, nunca por campo do body.
- **Preços no banco em centavos (int).** BRL 29,90 = `2990`. Conversão de exibição isolada no cliente.
- **Planos são 3 e fixos:** `iniciante` | `explorador` | `mestre`. Nome/descrição ficam no código.
- **`apiVersion` da Stripe pinada `2024-09-30.acacia`** em toda função nova (igual às existentes). Cliente Stripe no Deno com `Stripe.createFetchHttpClient()`.
- **Edge Functions (Deno) ficam fora do `jest`/`tsconfig`** — gate = revisão + E2E test mode (Task 10). Só o código cliente tem teste unitário.
- Commits frequentes, um por task. Branch: `feat/painel-planos`. **Sem push** (push=deploy prod; go-live é decisão do Fabiano no Task 10).
- Antes de modificar um arquivo existente, **leia o arquivo atual inteiro** — os trechos abaixo descrevem a mudança, não o arquivo todo.

---

### Task 1: Migração `config_planos` (tabela + RLS + seed)

**Files:**
- Create: `react_native_space/supabase/config-planos.sql`

**Interfaces:**
- Produces: tabela `public.config_planos` com colunas `id text pk`, `cota_consultas int`, `preco_brl/usd/eur/cad int` (centavos), `stripe_product_id text null`, `stripe_price_id text null`, `atualizado_em timestamptz`, `atualizado_por uuid null`.

- [ ] **Step 1: Escrever a migração**

```sql
-- config_planos: fonte de verdade de preço/cota/Price ID por plano.
-- Aditiva e idempotente. Preços em CENTAVOS (int). Escrita só via service role.
create table if not exists public.config_planos (
  id                text primary key check (id in ('iniciante','explorador','mestre')),
  cota_consultas    int  not null check (cota_consultas > 0),
  preco_brl         int  not null check (preco_brl > 0),
  preco_usd         int  not null check (preco_usd > 0),
  preco_eur         int  not null check (preco_eur > 0),
  preco_cad         int  not null check (preco_cad > 0),
  stripe_product_id text,
  stripe_price_id   text,
  atualizado_em     timestamptz not null default now(),
  atualizado_por    uuid references auth.users(id) on delete set null
);

alter table public.config_planos enable row level security;

-- Leitura pública (o /planos precisa exibir; preços e Price IDs não são segredo).
drop policy if exists "config_planos leitura publica" on public.config_planos;
create policy "config_planos leitura publica"
  on public.config_planos for select
  to anon, authenticated
  using (true);
-- Sem policy de insert/update/delete → escrita apenas via service role (Edge Function).

-- Seed com os valores atuais de services/stripe-planos.ts (em centavos); stripe_* = null.
insert into public.config_planos
  (id, cota_consultas, preco_brl, preco_usd, preco_eur, preco_cad) values
  ('iniciante',    4,  2990,   690,   690,   890),
  ('explorador', 999,  7990,  1690,  1690,  2190),
  ('mestre',     999, 19990,  3990,  3990,  5490)
on conflict (id) do nothing;
```

- [ ] **Step 2: Sanidade de sintaxe**

Não há Postgres local garantido; validar por leitura: cada `create policy` tem `drop policy if exists` antes (idempotente), os checks batem com o seed, e o seed usa `on conflict do nothing` (re-rodar é seguro). A migração real roda no Task 10 (SQL Editor).

- [ ] **Step 3: Commit**

```bash
git add react_native_space/supabase/config-planos.sql
git commit -m "feat(planos): migração config_planos (tabela, RLS, seed)"
```

---

### Task 2: Helpers compartilhados das Edge Functions (Deno)

**Files:**
- Modify: `react_native_space/supabase/functions/_shared/planos.ts`
- Create: `react_native_space/supabase/functions/_shared/config-planos.ts`

**Interfaces:**
- Produces:
  - `PLANO_IDS: readonly ['iniciante','explorador','mestre']` e `type PlanoId = 'iniciante'|'explorador'|'mestre'`
  - `NOMES_PLANOS: Record<PlanoId, string>` (nome do Product na Stripe)
  - `MOEDAS: readonly ['brl','usd','eur','cad']` e `type Moeda = 'brl'|'usd'|'eur'|'cad'`
  - `interface ConfigPlanoRow { id: PlanoId; cota_consultas: number; preco_brl: number; preco_usd: number; preco_eur: number; preco_cad: number; stripe_product_id: string|null; stripe_price_id: string|null }`
  - `async function lerConfigPlano(admin: SupabaseClient, planoId: PlanoId): Promise<ConfigPlanoRow|null>`

- [ ] **Step 1: Reescrever `_shared/planos.ts`**

Ler o atual (hoje tem `{ [id]: { priceEnv, cotaConsultas } }`). Substituir por:

```ts
export const PLANO_IDS = ['iniciante', 'explorador', 'mestre'] as const;
export type PlanoId = (typeof PLANO_IDS)[number];

export const NOMES_PLANOS: Record<PlanoId, string> = {
  iniciante: 'Arcanus Iniciante',
  explorador: 'Arcanus Explorador',
  mestre: 'Arcanus Mestre',
};

export const MOEDAS = ['brl', 'usd', 'eur', 'cad'] as const;
export type Moeda = (typeof MOEDAS)[number];

export function ehPlanoValido(v: unknown): v is PlanoId {
  return typeof v === 'string' && (PLANO_IDS as readonly string[]).includes(v);
}
```

- [ ] **Step 2: Criar `_shared/config-planos.ts`**

```ts
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { PlanoId } from './planos.ts';

export interface ConfigPlanoRow {
  id: PlanoId;
  cota_consultas: number;
  preco_brl: number;
  preco_usd: number;
  preco_eur: number;
  preco_cad: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}

// Lê a linha de config_planos com service role (bypassa RLS).
export async function lerConfigPlano(
  admin: SupabaseClient,
  planoId: PlanoId,
): Promise<ConfigPlanoRow | null> {
  const { data, error } = await admin
    .from('config_planos')
    .select('id, cota_consultas, preco_brl, preco_usd, preco_eur, preco_cad, stripe_product_id, stripe_price_id')
    .eq('id', planoId)
    .maybeSingle();
  if (error) throw error;
  return (data as ConfigPlanoRow | null) ?? null;
}
```

- [ ] **Step 3: Verificar que nada mais importa o formato antigo**

Run: `grep -rn "priceEnv\|cotaConsultas" react_native_space/supabase/functions`
Expected: só aparece em `criar-checkout-stripe` e `stripe-webhook` (corrigidos nas Tasks 4 e 5). Se aparecer em outro lugar, tratar lá.

- [ ] **Step 4: Commit**

```bash
git add react_native_space/supabase/functions/_shared/planos.ts react_native_space/supabase/functions/_shared/config-planos.ts
git commit -m "refactor(planos): _shared vira nomes+moedas + helper lerConfigPlano"
```

---

### Task 3: Edge Function `admin-configurar-plano`

**Files:**
- Create: `react_native_space/supabase/functions/admin-configurar-plano/index.ts`
- Modify: `react_native_space/supabase/config.toml` (declarar a função, `verify_jwt` default true)

**Interfaces:**
- Consumes: `PLANO_IDS`, `NOMES_PLANOS`, `MOEDAS`, `ehPlanoValido`, `PlanoId`, `Moeda` (Task 2); `lerConfigPlano` (Task 2); tabela `config_planos` (Task 1).
- Produces: endpoint `POST /functions/v1/admin-configurar-plano` com body `{ planoId, cotaConsultas: number, precos: Record<Moeda, number> /* centavos */ }` → 200 `{ plano: ConfigPlanoRow }` | 400 | 401 | 403 | 502.

- [ ] **Step 1: Escrever a função**

```ts
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { NOMES_PLANOS, MOEDAS, ehPlanoValido, type Moeda, type PlanoId } from '../_shared/planos.ts';
import { lerConfigPlano } from '../_shared/config-planos.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-09-30.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey);

  // 1) Autorização pelo JWT do request (nunca pelo body).
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return json({ erro: 'Sem sessão' }, 401);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ erro: 'Sem sessão' }, 401);
  const userId = userData.user.id;
  const { data: perfil } = await admin
    .from('perfis').select('is_super_admin').eq('id', userId).maybeSingle();
  if (!perfil?.is_super_admin) return json({ erro: 'Acesso negado' }, 403);

  // 2) Validar input.
  let body: { planoId?: unknown; cotaConsultas?: unknown; precos?: Record<string, unknown> };
  try { body = await req.json(); } catch { return json({ erro: 'JSON inválido' }, 400); }
  if (!ehPlanoValido(body.planoId)) return json({ erro: 'planoId inválido' }, 400);
  const planoId = body.planoId;
  const cota = Number(body.cotaConsultas);
  if (!Number.isInteger(cota) || cota <= 0) return json({ erro: 'cotaConsultas inválida' }, 400);
  const precos = body.precos ?? {};
  const valores: Record<Moeda, number> = {} as Record<Moeda, number>;
  for (const m of MOEDAS) {
    const v = Number((precos as Record<string, unknown>)[m]);
    if (!Number.isInteger(v) || v <= 0) return json({ erro: `preço ${m} inválido` }, 400);
    valores[m] = v;
  }

  // 3) No-op guard: cota + 4 preços iguais e já existe price → não cria Price duplicado.
  const atual = await lerConfigPlano(admin, planoId);
  const inalterado = atual && atual.stripe_price_id &&
    atual.cota_consultas === cota &&
    atual.preco_brl === valores.brl && atual.preco_usd === valores.usd &&
    atual.preco_eur === valores.eur && atual.preco_cad === valores.cad;
  if (inalterado) return json({ plano: atual });

  try {
    // 4) Product (cria se faltar).
    let productId = atual?.stripe_product_id ?? null;
    if (!productId) {
      const prod = await stripe.products.create({ name: NOMES_PLANOS[planoId as PlanoId] });
      productId = prod.id;
    }
    // 5) Price novo com currency_options das 4 moedas (base = brl).
    const price = await stripe.prices.create({
      product: productId,
      currency: 'brl',
      unit_amount: valores.brl,
      recurring: { interval: 'month' },
      currency_options: {
        usd: { unit_amount: valores.usd },
        eur: { unit_amount: valores.eur },
        cad: { unit_amount: valores.cad },
      },
    });
    // 6) Gravar no banco ANTES de arquivar o antigo.
    const { data: salvo, error: upErr } = await admin
      .from('config_planos')
      .update({
        cota_consultas: cota,
        preco_brl: valores.brl, preco_usd: valores.usd,
        preco_eur: valores.eur, preco_cad: valores.cad,
        stripe_product_id: productId,
        stripe_price_id: price.id,
        atualizado_em: new Date().toISOString(),
        atualizado_por: userId,
      })
      .eq('id', planoId)
      .select()
      .single();
    if (upErr) {
      console.error('falha ao gravar config_planos', upErr);
      return json({ erro: 'Falha ao salvar no banco' }, 502);
    }
    // 7) Arquivar o Price antigo (falha aqui não derruba a resposta).
    if (atual?.stripe_price_id) {
      try { await stripe.prices.update(atual.stripe_price_id, { active: false }); }
      catch (e) { console.error('falha ao arquivar price antigo', e); }
    }
    return json({ plano: salvo });
  } catch (e) {
    console.error('falha na Stripe', e);
    return json({ erro: 'Falha ao configurar o plano na Stripe' }, 502);
  }
});
```

- [ ] **Step 2: Declarar no `config.toml`**

Ler o `config.toml` atual (já tem `[functions.stripe-webhook] verify_jwt=false`). Adicionar, junto às outras entradas de function:

```toml
[functions.admin-configurar-plano]
verify_jwt = true
```

- [ ] **Step 3: Revisão (sem teste unitário — Deno fora do jest)**

Conferir: autoriza por JWT (não body); no-op guard evita Price duplicado; ordem cria-Price → grava-banco → arquiva-antigo; erros retornam 4xx/502 sem estado inconsistente.

- [ ] **Step 4: Commit**

```bash
git add react_native_space/supabase/functions/admin-configurar-plano/index.ts react_native_space/supabase/config.toml
git commit -m "feat(planos): Edge Function admin-configurar-plano (super-admin cria/atualiza Price)"
```

---

### Task 4: `criar-checkout-stripe` lê o Price ID do banco

**Files:**
- Modify: `react_native_space/supabase/functions/criar-checkout-stripe/index.ts`

**Interfaces:**
- Consumes: `lerConfigPlano` (Task 2), tabela `config_planos` (Task 1).

- [ ] **Step 1: Trocar a fonte do Price ID**

Ler o arquivo atual. Hoje faz (linha ~45):
```ts
const priceId = Deno.env.get(PLANOS[planoId].priceEnv);
if (!priceId) return resposta({ erro: 'Pagamento temporariamente indisponível' }, 503);
```
Substituir por leitura do banco (o `admin`/service-role client já existe na função; se não, criar como nas outras):
```ts
import { lerConfigPlano } from '../_shared/config-planos.ts';
// ...
const cfg = await lerConfigPlano(admin, planoId);
const priceId = cfg?.stripe_price_id ?? null;
if (!priceId) return resposta({ erro: 'Pagamento temporariamente indisponível' }, 503);
```
Remover o import/uso de `PLANOS[planoId].priceEnv`. Manter a validação de `planoId` (usar `ehPlanoValido`).

- [ ] **Step 2: Revisão**

Confirmar que `line_items: [{ price: priceId, quantity: 1 }]` segue igual e que nada mais lê `priceEnv`.

- [ ] **Step 3: Commit**

```bash
git add react_native_space/supabase/functions/criar-checkout-stripe/index.ts
git commit -m "refactor(planos): checkout lê stripe_price_id de config_planos"
```

---

### Task 5: `stripe-webhook` lê a cota do banco

**Files:**
- Modify: `react_native_space/supabase/functions/stripe-webhook/index.ts`

**Interfaces:**
- Consumes: `lerConfigPlano` (Task 2), tabela `config_planos` (Task 1).

- [ ] **Step 1: Trocar a fonte da cota**

Ler o arquivo atual. Onde ele hoje resolve a cota do plano (via `_shared/planos.ts` `cotaConsultas`) ao gravar `consultas_restantes` (na compra `checkout.session.completed` e na renovação `invoice.paid`), substituir por leitura do banco:
```ts
import { lerConfigPlano } from '../_shared/config-planos.ts';
// ... onde precisa da cota do planoId resolvido do evento:
const cfg = await lerConfigPlano(admin, planoId);
const cota = cfg?.cota_consultas ?? 0;   // fallback seguro: 0 (não libera consultas indevidas)
// usar `cota` onde antes usava PLANOS[planoId].cotaConsultas
```
Remover o uso de `cotaConsultas` do `_shared/planos.ts`.

- [ ] **Step 2: Revisão**

Confirmar que o `planoId` continua sendo derivado do metadata/price do evento como já era, e que só a origem da cota mudou.

- [ ] **Step 3: Commit**

```bash
git add react_native_space/supabase/functions/stripe-webhook/index.ts
git commit -m "refactor(planos): webhook lê cota_consultas de config_planos"
```

---

### Task 6: Serviço cliente `configPlanos` + refactor de `stripe-planos.ts` (TDD)

**Files:**
- Modify: `react_native_space/services/stripe-planos.ts`
- Create: `react_native_space/services/configPlanos.ts`
- Test: `react_native_space/services/__tests__/configPlanos.test.ts`

**Interfaces:**
- Consumes: `supabase` de `services/supabase.ts`; `MoedaSuportada`, `PlanoIdStripe`, `formatarPreco` de `stripe-planos.ts`.
- Produces:
  - `interface PlanoStripe { id: PlanoIdStripe; nome: string; cotaConsultas: number; precos: Record<MoedaSuportada, number> /* unidades maiores */; stripePriceId: string | null }`
  - `centavosParaNumero(c: number): number` e `numeroParaCentavos(n: number): number`
  - `carregarConfigPlanos(opts?: { incluirNaoConfigurados?: boolean }): Promise<PlanoStripe[]>`
  - `salvarPlano(planoId: PlanoIdStripe, dados: { cotaConsultas: number; precos: Record<MoedaSuportada, number> }): Promise<PlanoStripe>`

- [ ] **Step 1: Refatorar `stripe-planos.ts`** (ler o atual primeiro)

Manter `MoedaSuportada`, `MOEDAS_SUPORTADAS`, `PlanoIdStripe`, `moedaPadrao`, `formatarPreco`, `SIMBOLO`. **Remover** `PLANOS_STRIPE` (preço/cota saem daqui) e adicionar só os nomes estáticos:
```ts
export const NOMES_PLANOS: Record<PlanoIdStripe, string> = {
  iniciante: 'Iniciante',
  explorador: 'Explorador',
  mestre: 'Mestre',
};
```
Se algo importava `PLANOS_STRIPE`, será religado na Task 7.

- [ ] **Step 2: Escrever o teste que falha**

```ts
import { centavosParaNumero, numeroParaCentavos } from '../configPlanos';

describe('conversão de centavos', () => {
  it('centavos → número de exibição', () => {
    expect(centavosParaNumero(2990)).toBe(29.9);
    expect(centavosParaNumero(690)).toBe(6.9);
  });
  it('número → centavos (arredonda)', () => {
    expect(numeroParaCentavos(29.9)).toBe(2990);
    expect(numeroParaCentavos(16.9)).toBe(1690);
    expect(numeroParaCentavos(29.905)).toBe(2991);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `yarn test configPlanos`
Expected: FAIL (`configPlanos` não existe).

- [ ] **Step 4: Implementar `configPlanos.ts`**

```ts
import { supabase } from './supabase';
import {
  MOEDAS_SUPORTADAS, NOMES_PLANOS,
  type MoedaSuportada, type PlanoIdStripe,
} from './stripe-planos';

export interface PlanoStripe {
  id: PlanoIdStripe;
  nome: string;
  cotaConsultas: number;
  precos: Record<MoedaSuportada, number>;
  stripePriceId: string | null;
}

interface ConfigPlanoRow {
  id: PlanoIdStripe;
  cota_consultas: number;
  preco_brl: number; preco_usd: number; preco_eur: number; preco_cad: number;
  stripe_price_id: string | null;
}

export const centavosParaNumero = (c: number): number => Math.round(c) / 100;
export const numeroParaCentavos = (n: number): number => Math.round(n * 100);

const ORDEM: PlanoIdStripe[] = ['iniciante', 'explorador', 'mestre'];

function linhaParaPlano(r: ConfigPlanoRow): PlanoStripe {
  return {
    id: r.id,
    nome: NOMES_PLANOS[r.id],
    cotaConsultas: r.cota_consultas,
    precos: {
      brl: centavosParaNumero(r.preco_brl),
      usd: centavosParaNumero(r.preco_usd),
      eur: centavosParaNumero(r.preco_eur),
      cad: centavosParaNumero(r.preco_cad),
    },
    stripePriceId: r.stripe_price_id,
  };
}

export async function carregarConfigPlanos(
  opts?: { incluirNaoConfigurados?: boolean },
): Promise<PlanoStripe[]> {
  const { data, error } = await supabase
    .from('config_planos')
    .select('id, cota_consultas, preco_brl, preco_usd, preco_eur, preco_cad, stripe_price_id');
  if (error) throw error;
  const planos = ((data ?? []) as ConfigPlanoRow[]).map(linhaParaPlano);
  const filtrados = opts?.incluirNaoConfigurados
    ? planos
    : planos.filter((p) => p.stripePriceId !== null);
  return filtrados.sort((a, b) => ORDEM.indexOf(a.id) - ORDEM.indexOf(b.id));
}

export async function salvarPlano(
  planoId: PlanoIdStripe,
  dados: { cotaConsultas: number; precos: Record<MoedaSuportada, number> },
): Promise<PlanoStripe> {
  const precosCentavos: Record<string, number> = {};
  for (const m of MOEDAS_SUPORTADAS) precosCentavos[m] = numeroParaCentavos(dados.precos[m]);
  const { data, error } = await supabase.functions.invoke('admin-configurar-plano', {
    body: { planoId, cotaConsultas: dados.cotaConsultas, precos: precosCentavos },
  });
  if (error) throw error;
  return linhaParaPlano((data as { plano: ConfigPlanoRow }).plano);
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `yarn test configPlanos`
Expected: PASS. Depois `yarn typecheck` limpo.

- [ ] **Step 6: Commit**

```bash
git add react_native_space/services/stripe-planos.ts react_native_space/services/configPlanos.ts react_native_space/services/__tests__/configPlanos.test.ts
git commit -m "feat(planos): serviço configPlanos (carrega/salva) + refactor stripe-planos"
```

---

### Task 7: `/planos` consome `config_planos` (loading + "em breve")

**Files:**
- Modify: `react_native_space/app/planos.tsx`

**Interfaces:**
- Consumes: `carregarConfigPlanos`, `PlanoStripe` (Task 6).

- [ ] **Step 1: Trocar a origem dos planos** (ler o arquivo atual primeiro)

Substituir o import estático de `PLANOS_STRIPE` por estado carregado no `useEffect`:
```tsx
const [planos, setPlanos] = useState<PlanoStripe[] | null>(null);
const [erro, setErro] = useState(false);
useEffect(() => {
  carregarConfigPlanos()
    .then(setPlanos)
    .catch(() => setErro(true));
}, []);
```
Renderização:
- `planos === null && !erro` → estado de carregando (spinner/texto "Carregando planos…").
- `erro` → mensagem de erro amigável.
- `planos.length === 0` → estado **"Planos em breve"** (sem checkout).
- senão → os cards como já eram, iterando `planos` (cota e preços agora vêm do objeto; `formatarPreco(preco, moeda)` segue igual).

Manter o seletor de moeda, o botão de checkout (`criar-checkout-stripe`) e o "Gerenciar assinatura" (Billing Portal) como estão — só a fonte dos dados muda.

- [ ] **Step 2: Verificar tipos e testes existentes**

Run: `yarn typecheck` (limpo) e `yarn test` (19+ verdes).

- [ ] **Step 3: Commit**

```bash
git add react_native_space/app/planos.tsx
git commit -m "feat(planos): /planos lê config do banco com loading e estado 'em breve'"
```

---

### Task 8: Tela `/manager` (gated super-admin) + entrada no perfil

**Files:**
- Create: `react_native_space/app/manager.tsx`
- Modify: `react_native_space/app/(tabs)/perfil.tsx` (link condicional)

**Interfaces:**
- Consumes: `useIsSuperAdmin` (`hooks/useAdmin.ts`), `carregarConfigPlanos`/`salvarPlano`/`PlanoStripe` (Task 6), `MOEDAS_SUPORTADAS`/`formatarPreco`/`SIMBOLO` (`stripe-planos.ts`), `mostrarAlerta` (`utils/alerta.ts`), `router` (expo-router).

- [ ] **Step 1: Criar `app/manager.tsx`**

Componente gated. Padrão: se `!useIsSuperAdmin()` → bloqueio/redirect (ex.: `router.replace('/')` num `useEffect` + retornar null). Carrega com `carregarConfigPlanos({ incluirNaoConfigurados: true })` (mostra os 3, mesmo sem Price). Por plano, inputs controlados (4 moedas + cota) e botão Salvar que chama `salvarPlano`, mostra "criando Price…", em sucesso recarrega e usa `mostrarAlerta('Plano atualizado')`, em erro `mostrarAlerta('Falha ao salvar', ...)`. Exibe `stripePriceId` atual (ou "não configurado"). Inputs de moeda com `keyboardType="decimal-pad"`; validar > 0 antes de enviar.

Esqueleto real:
```tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useIsSuperAdmin } from '../hooks/useAdmin';
import { carregarConfigPlanos, salvarPlano, type PlanoStripe } from '../services/configPlanos';
import { MOEDAS_SUPORTADAS, SIMBOLO, type MoedaSuportada } from '../services/stripe-planos';
import { mostrarAlerta } from '../utils/alerta';

export default function Manager() {
  const isSuper = useIsSuperAdmin();
  const [planos, setPlanos] = useState<PlanoStripe[] | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  useEffect(() => { if (!isSuper) router.replace('/'); }, [isSuper]);
  const recarregar = () =>
    carregarConfigPlanos({ incluirNaoConfigurados: true }).then(setPlanos).catch(() => setPlanos([]));
  useEffect(() => { if (isSuper) recarregar(); }, [isSuper]);

  if (!isSuper) return null;
  if (!planos) return <ActivityIndicator style={{ marginTop: 40 }} />;

  async function onSalvar(p: PlanoStripe, cota: number, precos: Record<MoedaSuportada, number>) {
    if (cota <= 0 || MOEDAS_SUPORTADAS.some((m) => !(precos[m] > 0))) {
      return mostrarAlerta('Valores inválidos', 'Cota e todos os preços devem ser maiores que zero.');
    }
    setSalvando(p.id);
    try { await salvarPlano(p.id, { cotaConsultas: cota, precos }); await recarregar(); mostrarAlerta('Plano atualizado'); }
    catch (e) { mostrarAlerta('Falha ao salvar', String((e as Error).message ?? e)); }
    finally { setSalvando(null); }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Planos</Text>
      {planos.map((p) => (
        <CardPlano key={p.id} plano={p} salvando={salvando === p.id} onSalvar={onSalvar} />
      ))}
    </ScrollView>
  );
}
```
Implementar `CardPlano` (no mesmo arquivo) com estado local dos inputs inicializado de `plano.precos`/`plano.cotaConsultas`, os 4 `TextInput` de moeda (prefixados por `SIMBOLO[m]`) + 1 de cota, o botão Salvar (desabilitado enquanto `salvando`), e a linha "Price atual: {plano.stripePriceId ?? 'não configurado'}". Usar os tokens de cor de `constants/colors.ts` para casar com o app.

- [ ] **Step 2: Link condicional no perfil**

Em `app/(tabs)/perfil.tsx`, adicionar (só quando super-admin) um item que navega pra `/manager`:
```tsx
{useIsSuperAdmin() && (
  <Pressable onPress={() => router.push('/manager')}>
    <Text>Painel de planos</Text>
  </Pressable>
)}
```
(Encaixar no estilo dos itens existentes da tela.)

- [ ] **Step 3: Verificar**

Run: `yarn typecheck` (limpo) e `yarn test` (verdes). Teste visual real fica pro Fabiano/Task 10 (dev server na :3000).

- [ ] **Step 4: Commit**

```bash
git add react_native_space/app/manager.tsx "react_native_space/app/(tabs)/perfil.tsx"
git commit -m "feat(planos): tela /manager gated + link no perfil"
```

---

### Task 9: Atualizar runbook do Task 10 e README

**Files:**
- Modify: `react_native_space/docs/superpowers/task-10-stripe-execution.md`
- Modify: `react_native_space/supabase/README.md`

**Interfaces:** nenhuma (documentação).

- [ ] **Step 1: Atualizar o guia turnkey**

No `task-10-stripe-execution.md`: **remover** o passo 1 (criar produtos/preços no dashboard) e os secrets `STRIPE_PRICE_*`. **Adicionar**: rodar também `config-planos.sql`; `npx supabase functions deploy admin-configurar-plano`; e um passo "abrir o `/manager` (logado como super-admin) e cadastrar os 3 planos → isso cria os Products/Prices na Stripe". No E2E, adicionar o item: "salvar um plano no /manager cria o Price e o /planos passa a exibi-lo".

- [ ] **Step 2: Atualizar `supabase/README.md`**

Refletir a mesma mudança (config vem do banco/painel, não de `STRIPE_PRICE_*`); listar a função nova `admin-configurar-plano` (deploy padrão, `verify_jwt` true) e a migração `config-planos.sql`.

- [ ] **Step 3: Commit**

```bash
git add react_native_space/docs/superpowers/task-10-stripe-execution.md react_native_space/supabase/README.md
git commit -m "docs(planos): Task 10 e README refletem painel de planos (sem STRIPE_PRICE_*)"
```

---

## Self-Review

**Spec coverage:**
- Tabela `config_planos` + RLS + seed → Task 1 ✅
- Função `admin-configurar-plano` (auth JWT, no-op guard, ordem Stripe→banco→arquivar, erros) → Task 3 ✅
- Checkout lê price_id do banco → Task 4 ✅; Webhook lê cota do banco → Task 5 ✅
- Cliente `configPlanos` + refactor `stripe-planos` → Task 6 ✅
- `/planos` com "em breve" → Task 7 ✅
- Tela `/manager` gated + entrada perfil → Task 8 ✅
- Task 10/README atualizados → Task 9 ✅
- Fora de escopo (migração de assinantes, editar nome/ativar, histórico próprio, lock) → não há task, correto.

**Placeholders:** nenhum "TBD/etc"; código real em cada step. Modificações de arquivos existentes pedem leitura prévia porque o texto completo do arquivo não está no plano — mas cada uma traz o trecho novo concreto.

**Type consistency:** `PlanoId`/`PlanoIdStripe` (`iniciante|explorador|mestre`) e `Moeda`/`MoedaSuportada` (`brl|usd|eur|cad`) consistentes entre Deno (`_shared`) e cliente. `ConfigPlanoRow` (snake_case, centavos) no servidor; `PlanoStripe` (camelCase, unidades maiores) no cliente; conversão isolada em `configPlanos`. `stripe_price_id`/`cota_consultas` idênticos em todas as tasks. `carregarConfigPlanos`/`salvarPlano`/`centavosParaNumero`/`numeroParaCentavos` batem entre Tasks 6, 7 e 8.

## Notas de execução
- Edge Functions não têm teste unitário (Deno fora do jest) — Tasks 3/4/5 são gate de revisão + E2E no Task 10.
- Nada é pushado; go-live e deploy das funções são do Fabiano no Task 10.
