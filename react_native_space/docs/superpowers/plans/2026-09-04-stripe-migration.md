# Migração de pagamento Mercado Pago → Stripe — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o Mercado Pago pela Stripe como provedor de pagamento do Arcanus, com assinatura recorrente mensal multi-moeda via Checkout hospedado + Billing Portal.

**Architecture:** O app abre uma URL de Checkout hospedada pela Stripe (nenhum dado de cartão nem chave secreta no cliente). Três Edge Functions no Supabase (Deno) cuidam de criar o checkout, processar webhooks de assinatura e abrir o Billing Portal. O webhook é a fonte da verdade que libera/renova/rebaixa o plano em `perfis`/`assinaturas`.

**Tech Stack:** Expo SDK 54 + expo-router (React Native / web), Supabase (auth + Postgres + Edge Functions Deno), Stripe (`npm:stripe@^17`), Jest (jest-expo) para testes de unidade do cliente.

Spec de referência: `docs/superpowers/specs/2026-09-04-stripe-migration-design.md`.

## Global Constraints

Toda tarefa herda implicitamente estas regras:

- **Este projeto é Expo/expo-router (SDK 54), NÃO Next.js.** Não aplicar as regras do `AGENTS.md` do careertwin aqui.
- **Segredos só nos secrets do Supabase, NUNCA em `.env`/`EXPO_PUBLIC_*`:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_INICIANTE`, `STRIPE_PRICE_EXPLORADOR`, `STRIPE_PRICE_MESTRE`, `APP_BASE_URL`. Checkout hospedado NÃO usa chave publishable no cliente.
- **Deno (Edge Functions):** verificar webhook com `stripe.webhooks.constructEventAsync(...)` + `Stripe.createSubtleCryptoProvider()` (a versão síncrona quebra no Deno); ler o corpo do webhook como texto cru (`await request.text()`) antes de qualquer parse; inicializar Stripe com `{ httpClient: Stripe.createFetchHttpClient() }`.
- **Deploy das functions:** `criar-checkout-stripe` e `criar-portal-stripe` = deploy padrão (verify-jwt ON, e ainda revalidam o JWT); `stripe-webhook` = `--no-verify-jwt` (a Stripe não envia JWT do Supabase).
- **`tsconfig.json` exclui `supabase/functions`** → `yarn typecheck` e `yarn test` NÃO cobrem as Edge Functions. O gate delas é revisão de código + E2E em test mode (ação do Fabiano).
- **Preços de exibição multi-moeda:** os valores não-BRL em `services/stripe-planos.ts` são **PROVISÓRIOS** e DEVEM ser iguais aos `currency_options` configurados na Stripe. BRL conhecido: 29,90 / 79,90 / 199,90.
- **Cotas de consulta por plano:** `iniciante = 4`, `explorador = 999`, `mestre = 999`.
- **`push` neste repo dispara deploy de produção na Vercel** (Root Directory = `react_native_space`). Todo o trabalho fica na branch `feat/stripe-migration`; commits são LOCAIS; NÃO fazer `git push` — go-live/deploy é decisão do Fabiano após validação em test mode.
- **Test mode primeiro.** Nada em live sem confirmação explícita.

---

## Estrutura de arquivos

**Novos**
- `services/stripe-planos.ts` — puro (tipos, planos de exibição, `moedaPadrao`, `formatarPreco`). Sem imports de RN/supabase → testável no Jest.
- `services/__tests__/stripe-planos.test.ts` — testes de unidade dos helpers.
- `services/stripe.ts` — cliente: reexporta de `stripe-planos` + `criarCheckout` / `abrirPortalAssinatura` (chamam `supabase.functions.invoke`).
- `supabase/functions/_shared/planos.ts` — (Deno) mapa servidor `planoId → { priceEnv, cotaConsultas }` + moedas.
- `supabase/functions/criar-checkout-stripe/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/criar-portal-stripe/index.ts`
- `app/pagamento/sucesso.tsx`, `app/pagamento/cancelado.tsx`
- `supabase/stripe-migration.sql`

**Alterados**
- `app/planos.tsx` (import Stripe + seletor de moeda + gerenciar assinatura)
- `supabase/README.md` (runbook Stripe)

**Removidos**
- `services/mercadopago.ts`
- `supabase/functions/criar-preferencia/`, `supabase/functions/mercadopago-webhook/`

---

## Task 1: Migração SQL (colunas Stripe)

**Files:**
- Create: `supabase/stripe-migration.sql`

**Interfaces:**
- Produces: colunas `perfis.stripe_customer_id`; `assinaturas.stripe_subscription_id`, `assinaturas.stripe_customer_id`, `assinaturas.stripe_checkout_session_id`, `assinaturas.moeda`; `assinaturas.valor` passa a aceitar NULL; tabela `webhook_eventos(id text pk, criado_em timestamptz)`.

- [ ] **Step 1: Escrever o arquivo de migração**

```sql
-- supabase/stripe-migration.sql
-- Migração aditiva e idempotente para a Stripe. Rodar no SQL Editor do
-- projeto Supabase rfdjukdbrtvvulaxbzwb. Seguro rodar mais de uma vez.

alter table perfis      add column if not exists stripe_customer_id text;

alter table assinaturas add column if not exists stripe_subscription_id text;
alter table assinaturas add column if not exists stripe_customer_id text;
alter table assinaturas add column if not exists stripe_checkout_session_id text;
alter table assinaturas add column if not exists moeda text;

-- O valor agora vive na Stripe (currency_options). Deixa de ser obrigatório.
alter table assinaturas alter column valor drop not null;

-- Dedupe idempotente de eventos de webhook.
create table if not exists webhook_eventos (
  id         text primary key,
  criado_em  timestamptz not null default now()
);
alter table webhook_eventos enable row level security;
-- Sem policies: apenas o service role (webhook) acessa; anon fica bloqueado.
```

- [ ] **Step 2: Verificação (revisão, sem runner)**

O arquivo é aplicado pelo Fabiano no SQL Editor (não há runner de migração no repo). Conferir: todos os `add column` têm `if not exists`; `webhook_eventos` tem PK em `id`; RLS habilitado sem policy.

- [ ] **Step 3: Commit**

```bash
git add supabase/stripe-migration.sql
git commit -m "feat(pagamento): SQL de migração para colunas Stripe"
```

---

## Task 2: Helpers puros do cliente + testes (TDD)

**Files:**
- Create: `services/stripe-planos.ts`
- Test: `services/__tests__/stripe-planos.test.ts`

**Interfaces:**
- Produces:
  - `type MoedaSuportada = 'brl'|'usd'|'eur'|'cad'`
  - `const MOEDAS_SUPORTADAS: MoedaSuportada[]`
  - `type PlanoIdStripe = 'iniciante'|'explorador'|'mestre'`
  - `interface PlanoStripe { id: PlanoIdStripe; nome: string; cotaConsultas: number; precos: Record<MoedaSuportada, number> }`
  - `const PLANOS_STRIPE: PlanoStripe[]`
  - `function moedaPadrao(locale?: string): MoedaSuportada`
  - `function formatarPreco(valor: number, moeda: MoedaSuportada): string`

- [ ] **Step 1: Escrever os testes que falham**

```ts
// services/__tests__/stripe-planos.test.ts
import {
  moedaPadrao, formatarPreco, PLANOS_STRIPE, MOEDAS_SUPORTADAS,
} from '../stripe-planos';

describe('moedaPadrao', () => {
  it('retorna brl para locale pt-BR', () => {
    expect(moedaPadrao('pt-BR')).toBe('brl');
  });
  it('retorna cad para en-CA', () => {
    expect(moedaPadrao('en-CA')).toBe('cad');
  });
  it('retorna usd para en-US', () => {
    expect(moedaPadrao('en-US')).toBe('usd');
  });
  it('retorna eur para de-DE', () => {
    expect(moedaPadrao('de-DE')).toBe('eur');
  });
  it('cai em brl para locale desconhecido', () => {
    expect(moedaPadrao('xx-YY')).toBe('brl');
  });
});

describe('formatarPreco', () => {
  it('usa R$ e vírgula para brl', () => {
    expect(formatarPreco(29.9, 'brl')).toBe('R$ 29,90');
  });
  it('usa US$ e ponto para usd', () => {
    expect(formatarPreco(6.9, 'usd')).toBe('US$ 6.90');
  });
  it('usa € e vírgula para eur', () => {
    expect(formatarPreco(16.9, 'eur')).toBe('€ 16,90');
  });
});

describe('PLANOS_STRIPE', () => {
  it('tem os 3 planos com preço em todas as moedas suportadas', () => {
    expect(PLANOS_STRIPE.map(p => p.id)).toEqual(['iniciante', 'explorador', 'mestre']);
    for (const plano of PLANOS_STRIPE) {
      for (const moeda of MOEDAS_SUPORTADAS) {
        expect(typeof plano.precos[moeda]).toBe('number');
      }
    }
  });
  it('mantém os preços BRL conhecidos', () => {
    const brl = Object.fromEntries(PLANOS_STRIPE.map(p => [p.id, p.precos.brl]));
    expect(brl).toEqual({ iniciante: 29.9, explorador: 79.9, mestre: 199.9 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `yarn test services/__tests__/stripe-planos.test.ts`
Expected: FAIL — módulo `../stripe-planos` não existe.

- [ ] **Step 3: Implementar o módulo puro**

```ts
// services/stripe-planos.ts
export type MoedaSuportada = 'brl' | 'usd' | 'eur' | 'cad';
export const MOEDAS_SUPORTADAS: MoedaSuportada[] = ['brl', 'usd', 'eur', 'cad'];

export type PlanoIdStripe = 'iniciante' | 'explorador' | 'mestre';

export interface PlanoStripe {
  id: PlanoIdStripe;
  nome: string;
  cotaConsultas: number;
  /** Apenas EXIBIÇÃO. A cobrança real usa o Price da Stripe. */
  precos: Record<MoedaSuportada, number>;
}

// ⚠️ Valores não-BRL são PROVISÓRIOS: devem ser iguais aos currency_options
// configurados na Stripe. Confirmar com o Fabiano antes do go-live.
export const PLANOS_STRIPE: PlanoStripe[] = [
  { id: 'iniciante',  nome: 'Iniciante',  cotaConsultas: 4,
    precos: { brl: 29.9,  usd: 6.9,  eur: 6.9,  cad: 8.9 } },
  { id: 'explorador', nome: 'Explorador', cotaConsultas: 999,
    precos: { brl: 79.9,  usd: 16.9, eur: 16.9, cad: 21.9 } },
  { id: 'mestre',     nome: 'Mestre',     cotaConsultas: 999,
    precos: { brl: 199.9, usd: 39.9, eur: 39.9, cad: 54.9 } },
];

export function moedaPadrao(locale?: string): MoedaSuportada {
  const bruto = locale ?? (typeof navigator !== 'undefined' ? navigator.language : '') ?? '';
  const l = bruto.toLowerCase();
  if (l.includes('-br') || l === 'pt') return 'brl';
  if (l.includes('-ca')) return 'cad';
  if (l.startsWith('en') || l.includes('-us')) return 'usd';
  if (/-(de|fr|es|it|pt|ie|nl|at|be|fi|gr)\b/.test(l) ||
      ['de', 'fr', 'es', 'it', 'nl'].includes(l)) return 'eur';
  return 'brl';
}

const SIMBOLO: Record<MoedaSuportada, string> = {
  brl: 'R$', usd: 'US$', eur: '€', cad: 'C$',
};

export function formatarPreco(valor: number, moeda: MoedaSuportada): string {
  const usaVirgula = moeda === 'brl' || moeda === 'eur';
  const numero = valor.toFixed(2).replace('.', usaVirgula ? ',' : '.');
  return `${SIMBOLO[moeda]} ${numero}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `yarn test services/__tests__/stripe-planos.test.ts`
Expected: PASS (todos os testes verdes).

- [ ] **Step 5: Commit**

```bash
git add services/stripe-planos.ts services/__tests__/stripe-planos.test.ts
git commit -m "feat(pagamento): helpers de plano/moeda do cliente Stripe"
```

---

## Task 3: Cliente `services/stripe.ts` (wrappers de invoke)

**Files:**
- Create: `services/stripe.ts`

**Interfaces:**
- Consumes: tudo de `./stripe-planos`; `supabase` de `./supabase`.
- Produces:
  - `criarCheckout(planoId: PlanoIdStripe, moeda: MoedaSuportada): Promise<string>` (devolve `checkoutUrl`)
  - `abrirPortalAssinatura(): Promise<string>` (devolve `portalUrl`)
  - reexporta `PLANOS_STRIPE`, `MOEDAS_SUPORTADAS`, `moedaPadrao`, `formatarPreco` e os tipos.

- [ ] **Step 1: Implementar o serviço**

```ts
// services/stripe.ts
import { supabase } from './supabase';

export * from './stripe-planos';
import type { PlanoIdStripe, MoedaSuportada } from './stripe-planos';

export async function criarCheckout(
  planoId: PlanoIdStripe,
  moeda: MoedaSuportada,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('criar-checkout-stripe', {
    body: { planoId, moeda },
  });
  if (error) throw new Error('Pagamento temporariamente indisponível. Tente novamente.');
  if (!data?.checkoutUrl) {
    throw new Error(data?.erro ?? 'Resposta inválida do serviço de pagamento.');
  }
  return data.checkoutUrl as string;
}

export async function abrirPortalAssinatura(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('criar-portal-stripe', {
    body: {},
  });
  if (error) throw new Error('Não foi possível abrir o gerenciamento da assinatura.');
  if (!data?.portalUrl) {
    throw new Error(data?.erro ?? 'Resposta inválida do serviço.');
  }
  return data.portalUrl as string;
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `yarn typecheck`
Expected: PASS (sem erros novos). Os wrappers de `invoke` não têm teste de unidade (dependência de rede/Supabase); o gate é typecheck + revisão. O comportamento real é validado no E2E (Task 9).

- [ ] **Step 3: Commit**

```bash
git add services/stripe.ts
git commit -m "feat(pagamento): serviço cliente Stripe (checkout + portal)"
```

---

## Task 4: `_shared/planos.ts` + Edge Function `criar-checkout-stripe`

**Files:**
- Create: `supabase/functions/_shared/planos.ts`
- Create: `supabase/functions/criar-checkout-stripe/index.ts`

**Interfaces:**
- Produces (`_shared/planos.ts`):
  - `type PlanoId = 'iniciante'|'explorador'|'mestre'`
  - `interface PlanoServidor { priceEnv: string; cotaConsultas: number }`
  - `const PLANOS: Record<PlanoId, PlanoServidor>`
  - `const MOEDAS: readonly string[]`
- Produces (function): endpoint POST que recebe `{ planoId, moeda }` e devolve `{ checkoutUrl }`.
- Consumes: `PLANOS`, `MOEDAS` (webhook da Task 5 também consome `_shared/planos.ts`).

- [ ] **Step 1: Escrever `_shared/planos.ts`**

```ts
// supabase/functions/_shared/planos.ts
export type PlanoId = 'iniciante' | 'explorador' | 'mestre';

export interface PlanoServidor {
  /** Nome da env var (secret) que guarda o Price ID recorrente multi-moeda. */
  priceEnv: string;
  /** consultas_restantes ao ativar/renovar. */
  cotaConsultas: number;
}

export const PLANOS: Record<PlanoId, PlanoServidor> = {
  iniciante:  { priceEnv: 'STRIPE_PRICE_INICIANTE',  cotaConsultas: 4 },
  explorador: { priceEnv: 'STRIPE_PRICE_EXPLORADOR', cotaConsultas: 999 },
  mestre:     { priceEnv: 'STRIPE_PRICE_MESTRE',     cotaConsultas: 999 },
};

export const MOEDAS: readonly string[] = ['brl', 'usd', 'eur', 'cad'];
```

- [ ] **Step 2: Escrever a Edge Function**

```ts
// supabase/functions/criar-checkout-stripe/index.ts
import Stripe from 'npm:stripe@^17';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { PLANOS, MOEDAS, type PlanoId } from '../_shared/planos.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function resposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return resposta({ erro: 'Método não permitido' }, 405);

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return resposta({ erro: 'Autenticação necessária' }, 401);

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL');
    if (!secretKey || !supabaseUrl || !serviceRoleKey || !appBaseUrl) {
      return resposta({ erro: 'Pagamento temporariamente indisponível' }, 503);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const jwt = authorization.replace(/^Bearer\s+/i, '');
    const { data: auth, error: erroAuth } = await supabaseAdmin.auth.getUser(jwt);
    if (erroAuth || !auth.user) return resposta({ erro: 'Sessão inválida ou expirada' }, 401);
    const usuario = auth.user;

    const { planoId, moeda } = await request.json() as { planoId?: PlanoId; moeda?: string };
    if (!planoId || !(planoId in PLANOS)) return resposta({ erro: 'Plano inválido' }, 400);
    const moedaFinal = (moeda ?? 'brl').toLowerCase();
    if (!MOEDAS.includes(moedaFinal)) return resposta({ erro: 'Moeda inválida' }, 400);

    const priceId = Deno.env.get(PLANOS[planoId].priceEnv);
    if (!priceId) return resposta({ erro: 'Pagamento temporariamente indisponível' }, 503);

    const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });

    // Customer: reutiliza o salvo em perfis, senão cria e persiste.
    const { data: perfil } = await supabaseAdmin
      .from('perfis').select('stripe_customer_id').eq('id', usuario.id).maybeSingle();
    let customerId = perfil?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: usuario.email ?? undefined,
        metadata: { supabase_user_id: usuario.id },
      });
      customerId = customer.id;
      await supabaseAdmin.from('perfis')
        .update({ stripe_customer_id: customerId }).eq('id', usuario.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      currency: moedaFinal,
      client_reference_id: usuario.id,
      metadata: { usuario_id: usuario.id, plano_id: planoId },
      subscription_data: { metadata: { usuario_id: usuario.id, plano_id: planoId } },
      success_url: `${appBaseUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/planos`,
      allow_promotion_codes: true,
    });

    await supabaseAdmin.from('assinaturas').insert({
      id: crypto.randomUUID(),
      usuario_id: usuario.id,
      plano: planoId,
      status: 'pendente',
      periodo: 'mensal',
      moeda: moedaFinal,
      stripe_customer_id: customerId,
      stripe_checkout_session_id: session.id,
    });

    return resposta({ checkoutUrl: session.url });
  } catch (erro) {
    console.error('Erro ao criar checkout', erro instanceof Error ? erro.message : erro);
    return resposta({ erro: 'Não foi possível iniciar o pagamento' }, 500);
  }
});
```

- [ ] **Step 3: Verificação (revisão — sem runner)**

Não há typecheck local (tsconfig exclui `supabase/functions`; Deno não instalado). Conferir na revisão: usa `_shared/planos.ts`; valida JWT, plano e moeda; 503 sem secrets; grava `assinaturas` com `status: 'pendente'`; `success_url`/`cancel_url` https com `{CHECKOUT_SESSION_ID}`; `mode: 'subscription'` e `currency: moedaFinal`. Validação funcional fica no E2E (Task 9).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/_shared/planos.ts supabase/functions/criar-checkout-stripe/index.ts
git commit -m "feat(pagamento): Edge Function criar-checkout-stripe"
```

---

## Task 5: Edge Function `stripe-webhook`

**Files:**
- Create: `supabase/functions/stripe-webhook/index.ts`

**Interfaces:**
- Consumes: `PLANOS`, `PlanoId` de `../_shared/planos.ts`.
- Produces: endpoint POST que verifica assinatura Stripe e trata `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`.

- [ ] **Step 1: Escrever a Edge Function**

```ts
// supabase/functions/stripe-webhook/index.ts
import Stripe from 'npm:stripe@^17';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { PLANOS, type PlanoId } from '../_shared/planos.ts';

function resposta(status = 200) {
  return new Response(JSON.stringify({ recebido: true }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function ativarPlano(
  supabaseAdmin: SupabaseClient,
  usuarioId: string,
  planoId: PlanoId,
  sub: Stripe.Subscription,
  customerId: string,
) {
  const fimPeriodo = new Date(sub.current_period_end * 1000).toISOString();
  const inicio = new Date(sub.current_period_start * 1000).toISOString();

  await supabaseAdmin.from('assinaturas')
    .update({
      status: 'ativo',
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      inicio_em: inicio,
      expira_em: fimPeriodo,
    })
    .eq('usuario_id', usuarioId)
    .in('status', ['pendente', 'ativo']);

  await supabaseAdmin.from('perfis')
    .update({
      plano: planoId,
      plano_valido_ate: fimPeriodo,
      consultas_restantes: PLANOS[planoId].cotaConsultas,
    })
    .eq('id', usuarioId);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return resposta(405);

  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) return resposta(503);

  const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const assinatura = request.headers.get('stripe-signature');
  if (!assinatura) return resposta(400);
  const corpo = await request.text();

  let evento: Stripe.Event;
  try {
    evento = await stripe.webhooks.constructEventAsync(
      corpo, assinatura, webhookSecret, undefined, Stripe.createSubtleCryptoProvider(),
    );
  } catch (erro) {
    console.error('Assinatura de webhook inválida', erro instanceof Error ? erro.message : erro);
    return resposta(400);
  }

  // Dedupe idempotente: se o event.id já existe, já foi processado.
  const { error: erroDedupe } = await supabaseAdmin
    .from('webhook_eventos').insert({ id: evento.id });
  if (erroDedupe) return resposta();

  try {
    switch (evento.type) {
      case 'checkout.session.completed': {
        const session = evento.data.object as Stripe.Checkout.Session;
        const usuarioId = session.metadata?.usuario_id;
        const planoId = session.metadata?.plano_id as PlanoId | undefined;
        if (!usuarioId || !planoId || !(planoId in PLANOS) || !session.subscription) {
          return resposta(400);
        }
        const sub = await stripe.subscriptions.retrieve(String(session.subscription));
        await ativarPlano(supabaseAdmin, usuarioId, planoId, sub, String(session.customer));
        break;
      }
      case 'invoice.paid': {
        const invoice = evento.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;
        const sub = await stripe.subscriptions.retrieve(String(invoice.subscription));
        const usuarioId = sub.metadata?.usuario_id;
        const planoId = sub.metadata?.plano_id as PlanoId | undefined;
        if (!usuarioId || !planoId || !(planoId in PLANOS)) break;
        await ativarPlano(supabaseAdmin, usuarioId, planoId, sub, String(sub.customer));
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = evento.data.object as Stripe.Subscription;
        const usuarioId = sub.metadata?.usuario_id;
        if (!usuarioId) break;
        await supabaseAdmin.from('perfis')
          .update({ plano: 'gratuito', consultas_restantes: 0 }).eq('id', usuarioId);
        await supabaseAdmin.from('assinaturas')
          .update({ status: 'cancelado' }).eq('stripe_subscription_id', sub.id);
        break;
      }
      default:
        break;
    }
    return resposta();
  } catch (erro) {
    console.error('Erro ao processar webhook', evento.type,
      erro instanceof Error ? erro.message : erro);
    // libera o dedupe pra a Stripe reprocessar no retry.
    await supabaseAdmin.from('webhook_eventos').delete().eq('id', evento.id);
    return resposta(500);
  }
});
```

- [ ] **Step 2: Verificação (revisão — sem runner)**

Conferir na revisão: corpo lido cru antes de `constructEventAsync`; usa `createSubtleCryptoProvider()`; dedupe insere antes e deleta em erro; `checkout.session.completed` e `invoice.paid` chamam `ativarPlano` (idempotente); `customer.subscription.deleted` rebaixa para `gratuito`; `updated` NÃO rebaixa antecipadamente (não tratado de propósito — ver spec §5.3). ⚠️ Confirmar no E2E que `sub.current_period_end`/`current_period_start` existem na versão de API retornada (se a conta usar API 2025+ com período por item, ajustar para `sub.items.data[0].current_period_end`).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat(pagamento): Edge Function stripe-webhook (assinatura recorrente)"
```

---

## Task 6: Edge Function `criar-portal-stripe`

**Files:**
- Create: `supabase/functions/criar-portal-stripe/index.ts`

**Interfaces:**
- Produces: endpoint POST autenticado que devolve `{ portalUrl }`.

- [ ] **Step 1: Escrever a Edge Function**

```ts
// supabase/functions/criar-portal-stripe/index.ts
import Stripe from 'npm:stripe@^17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function resposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return resposta({ erro: 'Método não permitido' }, 405);

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return resposta({ erro: 'Autenticação necessária' }, 401);

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL');
    if (!secretKey || !supabaseUrl || !serviceRoleKey || !appBaseUrl) {
      return resposta({ erro: 'Serviço temporariamente indisponível' }, 503);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const jwt = authorization.replace(/^Bearer\s+/i, '');
    const { data: auth, error: erroAuth } = await supabaseAdmin.auth.getUser(jwt);
    if (erroAuth || !auth.user) return resposta({ erro: 'Sessão inválida ou expirada' }, 401);

    const { data: perfil } = await supabaseAdmin
      .from('perfis').select('stripe_customer_id').eq('id', auth.user.id).maybeSingle();
    const customerId = perfil?.stripe_customer_id as string | undefined;
    if (!customerId) return resposta({ erro: 'Nenhuma assinatura encontrada' }, 400);

    const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appBaseUrl}/planos`,
    });

    return resposta({ portalUrl: session.url });
  } catch (erro) {
    console.error('Erro ao criar portal', erro instanceof Error ? erro.message : erro);
    return resposta({ erro: 'Não foi possível abrir o gerenciamento' }, 500);
  }
});
```

- [ ] **Step 2: Verificação (revisão — sem runner)**

Conferir: valida JWT; 400 se não há `stripe_customer_id`; devolve `portalUrl`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/criar-portal-stripe/index.ts
git commit -m "feat(pagamento): Edge Function criar-portal-stripe (Billing Portal)"
```

---

## Task 7: Rotas web de retorno (sucesso / cancelado)

**Files:**
- Create: `app/pagamento/sucesso.tsx`
- Create: `app/pagamento/cancelado.tsx`

**Interfaces:**
- Produces: rotas expo-router `/pagamento/sucesso` e `/pagamento/cancelado`.

- [ ] **Step 1: Escrever `sucesso.tsx`**

```tsx
// app/pagamento/sucesso.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { Button } from '../../components/Button';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';

export default function PagamentoSucesso() {
  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safe}>
        <View style={estilos.conteudo}>
          <Ionicons name="checkmark-circle" size={72} color={Cores.acento} />
          <Text style={estilos.titulo}>Assinatura confirmada!</Text>
          <Text style={estilos.texto}>
            Seu plano está sendo liberado. Pode levar alguns segundos para aparecer.
          </Text>
          <Button variante="primary" label="Voltar ao início" larguraTotal
            onPress={() => router.replace('/')} />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1 },
  conteudo: { flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Espacamento.lg, gap: Espacamento.md },
  titulo: { fontFamily: Fontes.titulo, fontSize: 24, fontWeight: '700',
    color: Cores.textoClaro, textAlign: 'center' },
  texto: { fontFamily: Fontes.corpo, fontSize: 15, color: Cores.textoSecundario,
    textAlign: 'center', marginBottom: Espacamento.md },
});
```

- [ ] **Step 2: Escrever `cancelado.tsx`**

```tsx
// app/pagamento/cancelado.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { Button } from '../../components/Button';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';

export default function PagamentoCancelado() {
  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safe}>
        <View style={estilos.conteudo}>
          <Ionicons name="close-circle" size={72} color={Cores.textoSecundario} />
          <Text style={estilos.titulo}>Pagamento não concluído</Text>
          <Text style={estilos.texto}>
            Nenhuma cobrança foi feita. Você pode tentar de novo quando quiser.
          </Text>
          <Button variante="primary" label="Ver planos" larguraTotal
            onPress={() => router.replace('/planos')} />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1 },
  conteudo: { flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Espacamento.lg, gap: Espacamento.md },
  titulo: { fontFamily: Fontes.titulo, fontSize: 24, fontWeight: '700',
    color: Cores.textoClaro, textAlign: 'center' },
  texto: { fontFamily: Fontes.corpo, fontSize: 15, color: Cores.textoSecundario,
    textAlign: 'center', marginBottom: Espacamento.md },
});
```

- [ ] **Step 3: Verificar typecheck**

Run: `yarn typecheck`
Expected: PASS. Conferir que os imports de `../../components/Button`, `GradientBackground`, `Cores`, `Fontes`, `Espacamento` batem com a assinatura real desses módulos (o `Button` já é usado com `variante`/`label`/`larguraTotal`/`onPress` em `app/planos.tsx`).

- [ ] **Step 4: Commit**

```bash
git add app/pagamento/sucesso.tsx app/pagamento/cancelado.tsx
git commit -m "feat(pagamento): rotas web de retorno do checkout"
```

---

## Task 8: Ligar `app/planos.tsx` à Stripe

**Files:**
- Modify: `app/planos.tsx`

**Interfaces:**
- Consumes: `criarCheckout`, `abrirPortalAssinatura`, `PLANOS_STRIPE`, `MOEDAS_SUPORTADAS`, `moedaPadrao`, `formatarPreco`, tipo `MoedaSuportada` de `../services/stripe`.

- [ ] **Step 1: Trocar o import de pagamento**

Remover:
```ts
import { MercadoPagoServico, PLANOS_MP } from '../services/mercadopago';
```
Adicionar:
```ts
import {
  criarCheckout, abrirPortalAssinatura, moedaPadrao, formatarPreco,
  MOEDAS_SUPORTADAS, type MoedaSuportada,
} from '../services/stripe';
```

- [ ] **Step 2: Estado de moeda**

Logo após `const [processando, setProcessando] = useState(false);` adicionar:
```ts
const [moeda, setMoeda] = useState<MoedaSuportada>(moedaPadrao());
```

- [ ] **Step 3: Preço por moeda nos cards**

No array `PLANOS` local, os preços são fixos em BRL. Trocar o uso de `plano.preco` no JSX por um preço derivado da moeda. Substituir o bloco:
```tsx
<Text style={[estilos.preco, selecionado && estilos.precoSelecionado]}>
  {plano.preco}
</Text>
```
por:
```tsx
<Text style={[estilos.preco, selecionado && estilos.precoSelecionado]}>
  {formatarPreco(plano.precoNum, moeda)}
</Text>
```
(Os `precoNum` do array local já são os valores BRL; para exibição multi-moeda correta, ver Step 4 — o seletor troca `moeda` e o número exibido vem de `PLANOS_STRIPE`. Ajuste: no lugar de `plano.precoNum`, use o preço da moeda vindo de `PLANOS_STRIPE`.)

Para casar os valores por moeda, substituir `plano.precoNum` por uma busca em `PLANOS_STRIPE`:
```tsx
import { PLANOS_STRIPE } from '../services/stripe';
// ...dentro do map, antes do return do card:
const precoMoeda = PLANOS_STRIPE.find(p => p.id === plano.id)?.precos[moeda] ?? plano.precoNum;
// ...no JSX:
<Text style={[estilos.preco, selecionado && estilos.precoSelecionado]}>
  {formatarPreco(precoMoeda, moeda)}
</Text>
```

- [ ] **Step 4: Seletor de moeda (chips) no header**

Abaixo do `headerSubtitulo`, dentro do `Animated.View` do header, adicionar uma linha de chips:
```tsx
<View style={estilos.moedaLinha}>
  {MOEDAS_SUPORTADAS.map((m) => (
    <Pressable
      key={m}
      onPress={() => setMoeda(m)}
      style={[estilos.moedaChip, moeda === m && estilos.moedaChipAtivo]}
      accessibilityLabel={`Moeda ${m.toUpperCase()}`}
    >
      <Text style={[estilos.moedaChipTexto, moeda === m && estilos.moedaChipTextoAtivo]}>
        {m.toUpperCase()}
      </Text>
    </Pressable>
  ))}
</View>
```
E no `StyleSheet`:
```ts
moedaLinha: { flexDirection: 'row', gap: 8, marginTop: Espacamento.sm },
moedaChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: RaioBorda.full,
  borderWidth: 1, borderColor: Cores.cardBorda },
moedaChipAtivo: { backgroundColor: Cores.acento, borderColor: Cores.acento },
moedaChipTexto: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario },
moedaChipTextoAtivo: { color: '#fff', fontFamily: Fontes.corpoNegrito },
```

- [ ] **Step 5: Trocar `aoAssinar` para a Stripe**

Substituir o corpo do `useCallback` `aoAssinar` (que usava `PLANOS_MP`/`MercadoPagoServico`) por:
```ts
const aoAssinar = useCallback(async () => {
  if (!sessao?.user) {
    confirmarAcao('Atenção', 'Faça login para assinar um plano.',
      () => router.push('/auth/login'), { confirmarLabel: 'Entrar' });
    return;
  }
  const planoId = planoSelecionado as 'iniciante' | 'explorador' | 'mestre';
  setProcessando(true);
  Hapticos.impactoMedio();
  try {
    const checkoutUrl = await criarCheckout(planoId, moeda);
    await Linking.openURL(checkoutUrl);
  } catch (e: any) {
    mostrarAlerta('Erro', e?.message ?? 'Erro ao iniciar pagamento. Tente novamente.');
  } finally {
    setProcessando(false);
  }
}, [planoSelecionado, sessao, moeda]);
```

- [ ] **Step 6: Botão "Gerenciar assinatura"**

No footer, abaixo do botão "Assinar", adicionar (só para quem já tem plano pago):
```tsx
{perfil?.plano && perfil.plano !== 'gratuito' && (
  <Pressable onPress={aoGerenciar} style={estilos.pularBotao}>
    <Text style={estilos.pularTexto}>Gerenciar assinatura</Text>
  </Pressable>
)}
```
E o handler:
```ts
const aoGerenciar = useCallback(async () => {
  try {
    const portalUrl = await abrirPortalAssinatura();
    await Linking.openURL(portalUrl);
  } catch (e: any) {
    mostrarAlerta('Erro', e?.message ?? 'Não foi possível abrir o gerenciamento.');
  }
}, []);
```

- [ ] **Step 7: Verificar typecheck e testes**

Run: `yarn typecheck && yarn test`
Expected: PASS. Nenhuma referência restante a `mercadopago`/`PLANOS_MP` em `planos.tsx`.

- [ ] **Step 8: Verificação visual (web)**

Rodar o app (`yarn web` — servidor do Fabiano na :3000/portless) e conferir em `/planos`: os chips de moeda trocam os preços exibidos; botão "Assinar" chama o checkout; "Gerenciar assinatura" aparece só com plano pago. Testar responsivo 375px e 768px (regra do projeto). Não declarar pronto sem ver no navegador.

- [ ] **Step 9: Commit**

```bash
git add app/planos.tsx
git commit -m "feat(pagamento): planos.tsx usa Stripe (checkout + moeda + portal)"
```

---

## Task 9: Remover Mercado Pago + runbook Stripe

**Files:**
- Delete: `services/mercadopago.ts`
- Delete: `supabase/functions/criar-preferencia/` (pasta), `supabase/functions/mercadopago-webhook/` (pasta)
- Modify: `supabase/README.md`

**Interfaces:**
- Produces: repo sem código MP; `supabase/README.md` com o runbook Stripe.

- [ ] **Step 1: Confirmar que nada mais importa o MP**

Run: `grep -rn "mercadopago\|MercadoPago\|PLANOS_MP\|criar-preferencia" services app hooks components --include=*.ts --include=*.tsx`
Expected: nenhum resultado fora de arquivos que serão apagados. Se aparecer algo, corrigir antes de apagar.

- [ ] **Step 2: Apagar os arquivos MP**

```bash
git rm services/mercadopago.ts
git rm -r supabase/functions/criar-preferencia supabase/functions/mercadopago-webhook
```

- [ ] **Step 3: Reescrever `supabase/README.md` para a Stripe**

```markdown
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
final e refazer 1 compra de validação.
```

- [ ] **Step 4: Verificar typecheck e testes**

Run: `yarn typecheck && yarn test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/README.md
git commit -m "chore(pagamento): remove Mercado Pago e documenta runbook Stripe"
```

---

## Task 10: Validação E2E em test mode (gate manual — ação do Fabiano)

Não há código nesta tarefa. É o gate de aceite antes de considerar a migração pronta. Executado numa sessão interativa com o MCP da Stripe ou manualmente pelo Fabiano, em **test mode**.

- [ ] **Step 1:** Rodar `supabase/stripe-migration.sql` no SQL Editor.
- [ ] **Step 2:** Criar produtos/preços de teste (3 planos, Price recorrente multi-moeda), setar os secrets de teste, criar o endpoint de webhook de teste, e fazer o deploy das 3 functions.
- [ ] **Step 3:** No app, ir em `/planos`, escolher um plano e moeda, e assinar com o cartão de teste `4242 4242 4242 4242` (skill `stripe:test-cards`). Confirmar que `assinaturas` vai de `pendente` → `ativo` e `perfis.plano`/`plano_valido_ate`/`consultas_restantes` atualizam.
- [ ] **Step 4:** Simular renovação (`invoice.paid` — na Stripe test mode dá para avançar o ciclo) e confirmar que `plano_valido_ate` estende e `consultas_restantes` reseta.
- [ ] **Step 5:** Cancelar via "Gerenciar assinatura" (Billing Portal) e confirmar que, ao fim do período / no `customer.subscription.deleted`, `perfis.plano` volta para `gratuito`.
- [ ] **Step 6:** Testar cartão recusado (`4000 0000 0000 0002`) e confirmar que o plano NÃO é liberado.
- [ ] **Step 7:** Repetir uma compra e conferir idempotência (reenvio do mesmo evento não duplica efeito — `webhook_eventos`).
- [ ] **Step 8 (go-live):** Só após tudo verde em test mode e confirmação do Fabiano — trocar para chaves live, atualizar `APP_BASE_URL` para o domínio final, e fazer `git push` da branch (dispara deploy).

---

## Self-review (feita pelo autor do plano)

- **Cobertura do spec:** §5.1 → Task 4/README/Task 10; §5.2 checkout → Task 4; §5.3 webhook (3 eventos + dedupe) → Task 5; §5.4 portal → Task 6; §5.5 cliente → Tasks 2/3; §5.6 rotas retorno → Task 7; §5.7 SQL → Task 1; §6 segredos → Global Constraints/README; §7 notas Deno → Global Constraints/Task 5; §8 moedas → Tasks 2/4; §9 cutover/testes → Tasks 9/10; §10 externo → Task 10; §12 mapa de arquivos → Estrutura. Sem lacunas.
- **Placeholders:** nenhum "TODO/TBD"; preços não-BRL marcados como PROVISÓRIOS (decisão comercial), com regra explícita de reconciliação com a Stripe.
- **Consistência de tipos:** `PlanoIdStripe`/`PlanoId`, `MoedaSuportada`/`MOEDAS`, `criarCheckout`/`abrirPortalAssinatura`, `ativarPlano`, `PLANOS[planoId].cotaConsultas`, `PLANOS_STRIPE[].precos[moeda]` batem entre tasks.
