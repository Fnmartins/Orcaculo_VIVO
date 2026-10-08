# Compra avulsa por produto — plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixa (`- [ ]`) para marcação.

**Objetivo:** vender uma leitura avulsa de Mapa Astral ou de Vocação a quem não quer assinar, sem tocar no caminho da assinatura.

**Arquitetura:** o crédito avulso vive em tabela própria (`compras_avulsas`), nunca em `perfis` — a coluna `consultas_restantes` é reescrita pelo webhook a cada renovação e engoliria o crédito pago. A decisão de onde descontar é uma função **pura** em `_shared/avulso-regras.ts`, testada pelo Jest do app porque as functions rodam no Deno, fora do `tsc`. O pagamento espelha `criar-checkout-stripe` trocando `mode: 'subscription'` por `'payment'`.

**Stack:** Deno (Edge Functions), Stripe `npm:stripe@^17`, Supabase JS v2, Expo/React Native, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-10-07-compra-avulsa-design.md`

## Restrições globais

- **Dois produtos, só:** `'mapa'` e `'vocacao'`. Numerologia saiu do escopo — é cálculo local, não chama IA, e já é inteiramente grátis; vendê-la seria tirar algo aberto.
- **Validade: 90 dias** a partir do pagamento, para o direito de gerar. A leitura gerada permanece para sempre.
- **Precedência: cota do plano primeiro, avulso depois.**
- **Crédito nunca é consumido quando a resposta vem do cache.**
- **Preço nunca em código.** Mora em `public.precos_avulsos.stripe_price_id`.
- **Idempotência do webhook pelo banco**, via `UNIQUE (stripe_session_id)` — não por verificação no código.
- Todo texto de tela em português do Brasil, tratando por "você".
- Comentário de código explica **por quê**, não o quê. Os arquivos existentes nesta base seguem isso; siga também.

---

### Task 1: A tabela, e o SQL que o dono roda

**Arquivos:**
- Criar: `supabase/compra-avulsa.sql`

**Interfaces:**
- Produz: as tabelas `public.compras_avulsas` e `public.precos_avulsos`, consumidas pelas Tasks 3, 4 e 5.

- [ ] **Passo 1: Escrever o SQL**

```sql
-- ------------------------------------------------------------
-- Compra avulsa: uma leitura de um produto, sem assinatura
-- ------------------------------------------------------------
-- POR QUE TABELA PRÓPRIA, e não uma coluna em `perfis`:
--
-- `perfis.consultas_restantes` é ZERADO e reescrito pelo webhook a cada
-- renovação (`stripe-webhook`, `consultas_restantes: cfg.cota_consultas`).
-- Crédito avulso somado ali sumiria na renovação seguinte, sem erro nenhum —
-- a pessoa pagaria e perderia.
--
-- UMA LINHA POR COMPRA, e não um contador: com validade por compra é preciso
-- saber qual crédito expira primeiro, e um contador perde isso. Também é o que
-- torna a auditoria possível, ligando cada venda à leitura que a gastou.

create table if not exists public.compras_avulsas (
  id                bigint generated always as identity primary key,
  usuario_id        uuid not null references auth.users(id) on delete cascade,
  -- 'mapa' | 'vocacao'. Texto, e não enum, pelo mesmo motivo de `consumo_ia`:
  -- abrir um produto novo não deve pedir migração de tipo.
  oraculo           text not null,
  -- A idempotência do webhook é garantia do BANCO, não do código. O Stripe
  -- repete a entrega, e repetir não pode vender duas vezes.
  stripe_session_id text not null unique,
  pago_em           timestamptz not null default now(),
  expira_em         timestamptz not null,
  consumido_em      timestamptz,
  -- A chave da leitura que gastou este crédito, para auditar venda contra entrega.
  consumido_chave   text
);

-- A consulta quente é "esta pessoa tem crédito deste produto agora?".
create index if not exists compras_avulsas_disponivel_idx
  on public.compras_avulsas (usuario_id, oraculo, expira_em)
  where consumido_em is null;

alter table public.compras_avulsas enable row level security;

-- A pessoa lê as PRÓPRIAS compras: a tela precisa dizer "você tem um Mapa
-- disponível até tal dia". Escrita é só do service_role — crédito que o cliente
-- pudesse inserir seria crédito de graça.
create policy "compras_avulsas: a pessoa le as suas"
  on public.compras_avulsas for select
  using (auth.uid() = usuario_id);

revoke insert, update, delete on public.compras_avulsas from anon, authenticated;
grant select, insert, update on public.compras_avulsas to service_role;
grant usage, select on sequence public.compras_avulsas_id_seq to service_role;

-- ------------------------------------------------------------
-- O preço de cada produto, fora do código
-- ------------------------------------------------------------
-- Mesmo princípio de `config_planos.stripe_price_id`: trocar preço é operação,
-- não deploy. Tabela separada porque `config_planos` é chaveada por PLANO, e
-- esta é por ORÁCULO.

create table if not exists public.precos_avulsos (
  oraculo         text primary key,
  stripe_price_id text not null,
  -- Permite tirar um produto de venda sem apagar a linha e perder o histórico.
  ativo           boolean not null default true,
  atualizado_em   timestamptz not null default now()
);

alter table public.precos_avulsos enable row level security;
revoke all on public.precos_avulsos from anon, authenticated;
grant select on public.precos_avulsos to service_role;
```

- [ ] **Passo 2: Conferir o arquivo lendo-o inteiro**

Não há como rodar daqui: quem roda é o dono, no editor SQL do Supabase. Leia do começo ao fim procurando vírgula faltando, parêntese aberto, e nome de coluna divergente entre a tabela e o índice.

- [ ] **Passo 3: Commit**

```bash
git add supabase/compra-avulsa.sql
git commit -m "feat(avulso): tabela de compras avulsas e de precos por produto"
```

---

### Task 2: A regra de onde descontar, pura e testada

**Arquivos:**
- Criar: `supabase/functions/_shared/avulso-regras.ts`
- Testar: `services/__tests__/avulso-regras.test.ts`

**Interfaces:**
- Produz: `decidirCobranca(estado: EstadoDeCobranca): DecisaoDeCobranca`, consumida pela Task 6.

- [ ] **Passo 1: Escrever o teste que falha**

```ts
import {
  decidirCobranca, type EstadoDeCobranca,
} from '../../supabase/functions/_shared/avulso-regras';

/**
 * A precedência é dinheiro: descontar do avulso enquanto a cota do mês sobra
 * queima o que a pessoa pagou à parte. E liberar sem ter de onde descontar dá
 * leitura paga de graça. As duas falhas são silenciosas.
 *
 * Testada daqui porque a function roda no Deno — fora do `tsc` e fora do Jest.
 */
const estado = (campos: Partial<EstadoDeCobranca> = {}): EstadoDeCobranca => ({
  semLimite: false, restantesDoPlano: 0, temCreditoAvulso: false, ...campos,
});

describe('decidirCobranca', () => {
  it('quem tem cota do plano gasta a cota, mesmo tendo avulso guardado', () => {
    const d = decidirCobranca(estado({ restantesDoPlano: 3, temCreditoAvulso: true }));
    expect(d).toEqual({ permitido: true, fonte: 'plano' });
  });

  it('sem cota e com avulso, gasta o avulso', () => {
    const d = decidirCobranca(estado({ restantesDoPlano: 0, temCreditoAvulso: true }));
    expect(d).toEqual({ permitido: true, fonte: 'avulso' });
  });

  it('sem cota e sem avulso, barra', () => {
    expect(decidirCobranca(estado())).toEqual({ permitido: false, fonte: 'sem_acesso' });
  });

  it('quem é isento não gasta nada de ninguém', () => {
    // `semLimite` é admin e testador. Descontar deles sujaria a medição de custo
    // com consumo que não é de cliente.
    const d = decidirCobranca(estado({ semLimite: true, temCreditoAvulso: true }));
    expect(d).toEqual({ permitido: true, fonte: 'isento' });
  });

  it('cota negativa cai no avulso, e não vira crédito infinito', () => {
    // Defeito possível no banco: decremento concorrente deixando -1. Com
    // `restantes > 0` o caminho é o avulso, que é o certo; com `>= 0` seria
    // leitura de graça para sempre.
    const d = decidirCobranca(estado({ restantesDoPlano: -1, temCreditoAvulso: true }));
    expect(d).toEqual({ permitido: true, fonte: 'avulso' });
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

```bash
npx jest services/__tests__/avulso-regras.test.ts
```

Esperado: FAIL, "Cannot find module '../../supabase/functions/_shared/avulso-regras'".

- [ ] **Passo 3: Escrever a implementação mínima**

```ts
// supabase/functions/_shared/avulso-regras.ts
//
// De onde descontar uma leitura: da cota do plano, de um crédito avulso, ou de
// lugar nenhum.
//
// Pura e sem dependência, para o Jest do app poder testá-la — as functions
// rodam no Deno, fora do `tsc` e fora da suíte. Mesmo motivo de `limites.ts`.

export type FonteDoDesconto = 'isento' | 'plano' | 'avulso' | 'sem_acesso';

export interface EstadoDeCobranca {
  /** Admin e testador: têm acesso e não descontam de nada. */
  semLimite: boolean;
  /** Consultas que sobram no plano. Valor negativo conta como zero. */
  restantesDoPlano: number;
  /** Há crédito avulso não usado e não vencido PARA ESTE oráculo. */
  temCreditoAvulso: boolean;
}

export interface DecisaoDeCobranca {
  permitido: boolean;
  fonte: FonteDoDesconto;
}

/**
 * A ordem importa e é dinheiro.
 *
 * Cota do plano primeiro: o avulso comprado fica guardado para quando ela
 * acabar. O contrário faria o assinante queimar o que pagou à parte enquanto a
 * cota do mês sobrava — e ele não teria como perceber.
 */
export function decidirCobranca(estado: EstadoDeCobranca): DecisaoDeCobranca {
  if (estado.semLimite) return { permitido: true, fonte: 'isento' };
  if (estado.restantesDoPlano > 0) return { permitido: true, fonte: 'plano' };
  if (estado.temCreditoAvulso) return { permitido: true, fonte: 'avulso' };
  return { permitido: false, fonte: 'sem_acesso' };
}
```

- [ ] **Passo 4: Rodar e ver passar**

```bash
npx jest services/__tests__/avulso-regras.test.ts
```

Esperado: PASS, 5 testes.

- [ ] **Passo 5: Commit**

```bash
git add supabase/functions/_shared/avulso-regras.ts services/__tests__/avulso-regras.test.ts
git commit -m "feat(avulso): a regra de onde descontar, pura e testada"
```

---

### Task 3: Ler e gastar crédito no banco

**Arquivos:**
- Criar: `supabase/functions/_shared/avulso.ts`

**Interfaces:**
- Consome: as tabelas da Task 1.
- Produz: `creditoDisponivel(cliente, usuarioId, oraculo): Promise<number | null>` e `gastarCredito(cliente, compraId, chave): Promise<void>`, consumidas pela Task 6.

- [ ] **Passo 1: Escrever a implementação**

```ts
// supabase/functions/_shared/avulso.ts
//
// O crédito avulso no banco. A DECISÃO de usá-lo vive em `avulso-regras.ts`,
// pura e testada; aqui só a ida ao banco, como `uso.ts` faz com `limites.ts`.

// deno-lint-ignore no-explicit-any
type Cliente = { from: (tabela: string) => any };

/**
 * O id do crédito mais VELHO ainda válido para este oráculo, ou nulo.
 *
 * O mais velho primeiro porque é o que vence antes: gastar o mais novo deixaria
 * o outro expirar, e a pessoa teria pago dois e usado um.
 *
 * Erro de leitura devolve nulo — ou seja, "não tem crédito". É o lado seguro:
 * nulo barra quem talvez pudesse passar, e o contrário daria leitura paga de
 * graça. O erro vai para o log para a falha não ficar invisível.
 */
export async function creditoDisponivel(
  cliente: Cliente,
  usuarioId: string,
  oraculo: string,
): Promise<number | null> {
  const { data, error } = await cliente
    .from('compras_avulsas')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('oraculo', oraculo)
    .is('consumido_em', null)
    .gt('expira_em', new Date().toISOString())
    .order('expira_em', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('falha ao ler credito avulso', error.message);
    return null;
  }
  return typeof data?.id === 'number' ? data.id : null;
}

/**
 * Marca o crédito como gasto, amarrando-o à leitura que o gastou.
 *
 * A condição `is('consumido_em', null)` não é decoração: duas chamadas ao mesmo
 * tempo leriam o mesmo crédito disponível, e sem ela a segunda sobrescreveria a
 * primeira — duas leituras por uma compra. Com ela, a segunda não atualiza linha
 * nenhuma, e isso aparece no log em vez de passar calado.
 */
export async function gastarCredito(
  cliente: Cliente,
  compraId: number,
  chave: string,
): Promise<void> {
  const { data, error } = await cliente
    .from('compras_avulsas')
    .update({ consumido_em: new Date().toISOString(), consumido_chave: chave })
    .eq('id', compraId)
    .is('consumido_em', null)
    .select('id');

  if (error) console.error('falha ao gastar credito avulso', error.message);
  else if (!data || data.length === 0) {
    console.error('credito avulso ja estava gasto', String(compraId));
  }
}
```

- [ ] **Passo 2: Conferir a sintaxe**

```bash
node scripts/conferir-functions.js
```

Esperado: "sintaxe ok", com a contagem de arquivos uma a mais que antes.

- [ ] **Passo 3: Commit**

```bash
git add supabase/functions/_shared/avulso.ts
git commit -m "feat(avulso): ler e gastar credito no banco"
```

---

### Task 4: O checkout de pagamento único

**Arquivos:**
- Criar: `supabase/functions/criar-checkout-avulso/index.ts`

**Interfaces:**
- Consome: `public.precos_avulsos` (Task 1).
- Produz: a function `criar-checkout-avulso`, consumida pela Task 7.

- [ ] **Passo 1: Ler o arquivo que serve de molde**

Abra `supabase/functions/criar-checkout-stripe/index.ts` inteiro. Copie dele o cabeçalho, o CORS, a função `resposta`, a autenticação e **o bloco de customer**. Não reescreva de memória: o bloco de customer trata erro de leitura de um jeito específico porque `perfil` nulo por falha e `perfil` nulo por não haver cliente são indistinguíveis, e o segundo caminho cria cliente na Stripe. Perder isso duplica cliente.

- [ ] **Passo 2: Escrever o miolo, no lugar da leitura de plano**

```ts
    // Dois produtos, e a lista é fechada aqui de propósito: um oráculo que
    // chegasse pelo corpo da requisição viraria venda de algo sem preço.
    const VENDAVEIS = ['mapa', 'vocacao'];

    const { oraculo, moeda } = await request.json() as { oraculo?: string; moeda?: string };
    if (typeof oraculo !== 'string' || !VENDAVEIS.includes(oraculo)) {
      return resposta({ erro: 'Produto inválido' }, 400);
    }
    const moedaFinal = (moeda ?? 'brl').toLowerCase();
    if (!ehMoedaValida(moedaFinal)) return resposta({ erro: 'Moeda inválida' }, 400);

    const { data: preco, error: erroPreco } = await supabaseAdmin
      .from('precos_avulsos')
      .select('stripe_price_id, ativo')
      .eq('oraculo', oraculo)
      .maybeSingle();
    if (erroPreco) {
      console.error('falha ao ler preco avulso', erroPreco.message);
      return resposta({ erro: 'Pagamento temporariamente indisponível' }, 503);
    }
    // Preço ausente e produto desativado dão a MESMA resposta de propósito: as
    // duas significam "não está à venda", e distinguir só ajudaria quem sonda.
    if (!preco?.stripe_price_id || preco.ativo !== true) {
      return resposta({ erro: 'Pagamento temporariamente indisponível' }, 503);
    }
```

- [ ] **Passo 3: Escrever a criação da sessão, depois do bloco de customer**

```ts
    const session = await stripe.checkout.sessions.create({
      // `payment`, e não `subscription`: é uma compra, não uma assinatura. O
      // webhook ramifica por este campo.
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: preco.stripe_price_id, quantity: 1 }],
      currency: moedaFinal,
      client_reference_id: usuario.id,
      metadata: { usuario_id: usuario.id, oraculo, tipo: 'avulso' },
      success_url: `${appBaseUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/planos`,
      allow_promotion_codes: true,
    });

    return resposta({ url: session.url });
```

O import de `ehMoedaValida` vem de `'../_shared/planos.ts'`, igual ao molde. `ehPlanoValido` e `lerConfigPlano` **não** são usados aqui — não os importe.

- [ ] **Passo 4: Conferir a sintaxe**

```bash
node scripts/conferir-functions.js
```

Esperado: "sintaxe ok".

- [ ] **Passo 5: Commit**

```bash
git add supabase/functions/criar-checkout-avulso/index.ts
git commit -m "feat(avulso): checkout de pagamento unico por produto"
```

---

### Task 5: O webhook ramifica por modo

**Arquivos:**
- Modificar: `supabase/functions/stripe-webhook/index.ts`, no tratamento de `checkout.session.completed`
- Testar: `__tests__/validade-nas-functions.test.ts`

**Interfaces:**
- Consome: `public.compras_avulsas` (Task 1).

- [ ] **Passo 1: Escrever o teste de fonte que falha**

A function roda no Deno e não há como executá-la daqui; o que se confere é o TEXTO, como essa suíte já faz. Acrescente ao fim do arquivo:

```ts
describe('o webhook separa assinatura de compra avulsa', () => {
  const webhook = funcoes.find((f) => f.nome === 'stripe-webhook')!.fonte;

  it('ramifica por `session.mode` antes de ativar plano', () => {
    // Sem esta ramificação, uma compra avulsa cairia no caminho da assinatura e
    // ativaria um plano que ninguém pagou.
    expect(webhook).toMatch(/session\.mode === 'payment'/);
  });

  it('grava a sessão, que é o que torna o webhook idempotente', () => {
    // O Stripe repete a entrega. A garantia é o UNIQUE no banco, e para ele
    // valer a coluna precisa ser gravada.
    expect(webhook).toContain('stripe_session_id');
  });

  it('grava validade, e não deixa o crédito aberto para sempre', () => {
    expect(webhook).toContain('expira_em');
  });

  it('trata violacao de UNIQUE como reentrega, e nao como defeito', () => {
    // 23505 é unique_violation. Sem esta distinção, toda reentrega do Stripe
    // gritaria no log, e o log de erro deixaria de significar alguma coisa.
    expect(webhook).toContain('23505');
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

```bash
npx jest __tests__/validade-nas-functions.test.ts
```

Esperado: FAIL nos quatro novos.

- [ ] **Passo 3: Implementar a ramificação**

Leia o `case 'checkout.session.completed'` em `stripe-webhook/index.ts`. Acrescente este bloco **antes** do corpo atual, que trata assinatura:

```ts
      // Compra avulsa: uma leitura de um produto, sem assinatura.
      //
      // Vem antes do caminho de assinatura porque uma sessão `payment` que
      // caísse lá ativaria um plano que ninguém pagou.
      if (session.mode === 'payment') {
        const usuarioId = session.metadata?.usuario_id;
        const oraculo = session.metadata?.oraculo;
        if (!usuarioId || !oraculo) {
          console.error('sessao avulsa sem metadata', session.id);
          break;
        }
        const NOVENTA_DIAS = 90 * 24 * 60 * 60 * 1000;
        const { error } = await supabaseAdmin.from('compras_avulsas').insert({
          usuario_id: usuarioId,
          oraculo,
          stripe_session_id: session.id,
          expira_em: new Date(Date.now() + NOVENTA_DIAS).toISOString(),
        });
        // Violação de UNIQUE (23505) é o caso ESPERADO numa reentrega do Stripe,
        // e não um defeito: significa que a compra já foi registrada. Qualquer
        // outro erro é a pessoa ter pago sem receber, e precisa gritar.
        if (error && error.code !== '23505') {
          console.error('falha ao registrar compra avulsa', error.message);
        }
        break;
      }
```

- [ ] **Passo 4: Rodar e ver passar**

```bash
npx jest __tests__/validade-nas-functions.test.ts && node scripts/conferir-functions.js
```

Esperado: PASS em todos, e "sintaxe ok".

- [ ] **Passo 5: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts __tests__/validade-nas-functions.test.ts
git commit -m "feat(avulso): o webhook separa assinatura de compra avulsa"
```

---

### Task 6: O consumo na interpretação

**Arquivos:**
- Modificar: `supabase/functions/ia-interpretacao/index.ts` — a guarda da vocação (perto da linha 570) e o desconto (perto da linha 648)
- Testar: `__tests__/validade-nas-functions.test.ts`

**Interfaces:**
- Consome: `decidirCobranca` (Task 2), `creditoDisponivel` e `gastarCredito` (Task 3).

- [ ] **Passo 1: Escrever o teste de fonte que falha**

```ts
describe('o credito avulso entra na interpretacao sem furar o cache', () => {
  const interp = funcoes.find((f) => f.nome === 'ia-interpretacao')!.fonte;

  it('o credito é lido ANTES da decisão de cobrança', () => {
    expect(interp).toContain('creditoDisponivel(');
    expect(interp).toContain('decidirCobranca(');
    expect(interp.indexOf('creditoDisponivel(')).toBeLessThan(interp.indexOf('decidirCobranca('));
  });

  it('o credito só é gasto DEPOIS de a leitura existir', () => {
    // Gastar antes faria quem recebesse 502 perder o que pagou.
    expect(interp.indexOf('gastarCredito('))
      .toBeGreaterThan(interp.indexOf('anthropic.messages.create'));
  });

  it('o retorno do cache não passa por gastarCredito', () => {
    // Os dois `return` de cache estão acima da chamada à Anthropic. Se
    // `gastarCredito` aparecesse antes deles, uma releitura comeria a compra.
    expect(interp.indexOf('gastarCredito(')).toBeGreaterThan(interp.indexOf('doCache: true'));
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

```bash
npx jest __tests__/validade-nas-functions.test.ts
```

Esperado: FAIL nos três.

- [ ] **Passo 3: Ler o crédito e decidir**

Depois do bloco que lê `perfil` e calcula `restantes` e `semLimite`, e **antes** do `if (oraculo === 'vocacao')`:

```ts
  // O crédito avulso é lido só para os dois produtos vendáveis: tarô e búzios
  // não estão à venda avulsa, e uma consulta a mais por leitura deles seria
  // custo sem uso.
  const idDoCredito = (oraculo === 'mapa' || oraculo === 'vocacao')
    ? await creditoDisponivel(supabaseAdmin, usuarioId, oraculo)
    : null;

  const cobranca = decidirCobranca({
    semLimite,
    restantesDoPlano: restantes,
    temCreditoAvulso: idDoCredito !== null,
  });
```

- [ ] **Passo 4: Deixar `cobranca.permitido` ser quem barra**

Leia o código existente que barra por cota e por validade **antes de mexer**: a ordem entre a conferência de validade e a de cota é garantida por um teste já existente nesta mesma suíte (`vencimentoAntesDaCota`), e invertê-la quebra esse teste. Mantenha a ordem; troque apenas o critério de cota por `cobranca.permitido`, para que quem tem crédito avulso passe mesmo com a cota em zero.

- [ ] **Passo 5: Gastar, junto com o desconto que já existe**

No bloco que hoje desconta `consultas_restantes`, que já roda **depois** de a leitura existir:

```ts
    // Desconta de onde a decisão mandou. O caminho do cache nem chega aqui: os
    // dois `return` de releitura estão acima da chamada à Anthropic, e é isso
    // que impede uma reabertura de comer a compra.
    if (cobranca.fonte === 'plano') {
      exigirEscrita('perfis.consultas_restantes', await supabaseAdmin
        .from('perfis').update({ consultas_restantes: restantes - 1 }).eq('id', usuarioId));
    } else if (cobranca.fonte === 'avulso' && idDoCredito !== null) {
      await gastarCredito(supabaseAdmin, idDoCredito, chave);
    }
```

- [ ] **Passo 6: Acrescentar os imports**

```ts
import { decidirCobranca } from '../_shared/avulso-regras.ts';
import { creditoDisponivel, gastarCredito } from '../_shared/avulso.ts';
```

- [ ] **Passo 7: Rodar tudo**

```bash
npx tsc --noEmit && node scripts/conferir-functions.js && npx jest
```

Esperado: sem erro de tipo, "sintaxe ok", suíte inteira verde.

- [ ] **Passo 8: Commit**

```bash
git add supabase/functions/ia-interpretacao/index.ts __tests__/validade-nas-functions.test.ts
git commit -m "feat(avulso): gastar credito avulso quando a cota do plano acabou"
```

---

### Task 7: Comprar, e ver o que se tem

**Arquivos:**
- Criar: `services/avulso.ts`
- Criar: `services/__tests__/avulso.test.ts`
- Modificar: `app/mapa-astral/resultado.tsx` e `app/vocacao/index.tsx`, no bloco trancado onde hoje está o botão "Ver os planos"

**Interfaces:**
- Consome: a function `criar-checkout-avulso` (Task 4) e a tabela `compras_avulsas` (Task 1).

- [ ] **Passo 1: Escrever o teste que falha**

```ts
import { creditosDaPessoa } from '../avulso';

const mockFrom = jest.fn();
jest.mock('../supabase', () => ({ supabase: { from: (t: string) => mockFrom(t) } }));

describe('creditosDaPessoa', () => {
  it('devolve vazio quando a leitura falha, em vez de explodir', async () => {
    // Isto decora um card. Falhar aqui não pode derrubar a tela da leitura, que
    // é o que a pessoa veio ver.
    mockFrom.mockReturnValue({
      select: () => ({ is: () => ({ gt: () => Promise.resolve({ data: null, error: { message: 'x' } }) }) }),
    });
    await expect(creditosDaPessoa()).resolves.toEqual({});
  });

  it('conta quantos creditos ha de cada produto', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ is: () => ({ gt: () => Promise.resolve({
        data: [{ oraculo: 'mapa' }, { oraculo: 'mapa' }, { oraculo: 'vocacao' }], error: null,
      }) }) }),
    });
    await expect(creditosDaPessoa()).resolves.toEqual({ mapa: 2, vocacao: 1 });
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

```bash
npx jest services/__tests__/avulso.test.ts
```

Esperado: FAIL, módulo não encontrado.

- [ ] **Passo 3: Escrever o serviço**

```ts
// services/avulso.ts
import { supabase } from './supabase';
import { erroDaFuncao } from './erroFuncao';

/** Quantos créditos não usados e não vencidos a pessoa tem, por produto. */
export async function creditosDaPessoa(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('compras_avulsas')
    .select('oraculo')
    .is('consumido_em', null)
    .gt('expira_em', new Date().toISOString());

  // Isto decora um card. Falhar aqui não pode derrubar a tela da leitura, que é
  // o que a pessoa veio ver — então o erro vira "nenhum crédito" e fica no log.
  if (error) {
    console.warn('falha ao ler creditos avulsos', error.message);
    return {};
  }

  const porOraculo: Record<string, number> = {};
  for (const linha of data ?? []) {
    const o = String((linha as { oraculo?: string }).oraculo ?? '');
    if (o) porOraculo[o] = (porOraculo[o] ?? 0) + 1;
  }
  return porOraculo;
}

/** Abre o checkout de compra avulsa e devolve a URL para onde ir. */
export async function comprarAvulso(
  oraculo: 'mapa' | 'vocacao',
  moeda = 'brl',
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('criar-checkout-avulso', {
    body: { oraculo, moeda },
  });
  if (error) throw await erroDaFuncao(error);
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error('O pagamento não abriu. Tente de novo.');
  return url;
}
```

- [ ] **Passo 4: Rodar e ver passar**

```bash
npx jest services/__tests__/avulso.test.ts
```

Esperado: PASS, 2 testes.

- [ ] **Passo 5: Pôr a segunda saída nas duas telas**

Ao lado do botão "Ver os planos" que já existe no bloco trancado de cada tela:

```tsx
            {/* A segunda saída, para quem não quer assinar. A assinatura segue
                sendo a oferta principal: este botão é secundário na hierarquia,
                e o texto diz o que se leva, não só que se paga. */}
            <Pressable
              onPress={async () => {
                Hapticos.impactoLeve();
                try {
                  const url = await comprarAvulso('mapa');
                  await Linking.openURL(url);
                } catch (e) {
                  mostrarAlerta('Não foi possível abrir o pagamento',
                    e instanceof Error ? e.message : 'Tente de novo em instantes.');
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Comprar só esta leitura"
              style={estilos.botaoAvulso}
            >
              <Text style={estilos.botaoAvulsoTexto}>Comprar só esta leitura</Text>
            </Pressable>
```

Em `app/vocacao/index.tsx`, troque `comprarAvulso('mapa')` por `comprarAvulso('vocacao')`. Importe `Linking` de `react-native` e `mostrarAlerta` de `utils/alerta` se a tela ainda não os tiver. Os estilos `botaoAvulso` e `botaoAvulsoTexto` seguem o `botaoPlanos` que já existe em cada arquivo, com fundo transparente e borda — é o que o deixa secundário.

- [ ] **Passo 6: Rodar tudo**

```bash
npx tsc --noEmit && npx jest
```

Esperado: sem erro de tipo e suíte inteira verde.

- [ ] **Passo 7: Commit**

```bash
git add services/avulso.ts services/__tests__/avulso.test.ts app/mapa-astral/resultado.tsx app/vocacao/index.tsx
git commit -m "feat(avulso): comprar uma leitura sem assinar"
```

---

### Task 8: Os Termos dizem o que foi vendido

**Arquivos:**
- Modificar: `app/legal/termos.tsx`

- [ ] **Passo 1: Acrescentar a seção, depois de "Planos, pagamentos e assinaturas"**

```tsx
        {
          titulo: 'Compra avulsa',
          paragrafos: [
            'Além dos planos, alguns conteúdos podem ser comprados individualmente. A compra avulsa dá direito a gerar UMA leitura do item comprado, na sua conta.',
            'O direito de gerar essa leitura vale por 90 (noventa) dias a partir da confirmação do pagamento. A leitura já gerada permanece no seu histórico por tempo indeterminado, independentemente desse prazo.',
            'Se você tiver um plano ativo com consultas disponíveis, elas são usadas antes do crédito avulso — o crédito comprado fica guardado para quando as consultas do plano acabarem.',
            'O direito de arrependimento de 7 (sete) dias previsto no Código de Defesa do Consumidor se aplica à compra avulsa. Caso a leitura já tenha sido gerada, entre em contato para tratarmos o caso.',
          ],
        },
```

- [ ] **Passo 2: Atualizar a data**

Troque `atualizadoEm="setembro de 2026"` por `atualizadoEm="outubro de 2026"`.

- [ ] **Passo 3: Rodar**

```bash
npx tsc --noEmit && npx jest
```

- [ ] **Passo 4: Commit**

```bash
git add app/legal/termos.tsx
git commit -m "docs(legal): os Termos dizem o que a compra avulsa entrega"
```

---

## O que o dono faz, e o plano não

1. **Rodar `supabase/compra-avulsa.sql`** no editor SQL do Supabase.
2. **Criar dois preços na Stripe**, um por produto, em modo *one-time* — não recorrente.
3. **Inserir os `price_id`** em `public.precos_avulsos`, com o valor decidido a partir da aba Custo por produto.
4. **Deployar** `criar-checkout-avulso`, `stripe-webhook` e `ia-interpretacao`.
5. **Decidir o arrependimento depois da leitura gerada.** O texto dos Termos remete ao contato, que é a saída honesta enquanto não houver política.

## Autorrevisão

**Cobertura da spec.** Tabela própria com UNIQUE: Task 1. Precedência: Tasks 2 e 6. Não gastar em cache: Task 6, com teste de ordem. Checkout `mode: payment`: Task 4. Ramificação do webhook: Task 5. Telas de compra: Task 7. Termos: Task 8. Validade de 90 dias: Tasks 1 e 5.

**Lacuna conhecida:** a spec cita uma lista de compras no Perfil, e este plano não a implementa. `creditosDaPessoa` já entrega o dado; a listagem é trabalho de tela sem risco e cabe melhor numa entrega própria. Fica registrado em vez de fingir que foi coberto.

**Sem placeholders.** Todo passo de código traz o código. Os dois lugares que mandam *ler antes de escrever* (Tasks 4 e 6) são instrução, não vaguidão: no primeiro, copiar o bloco de customer de memória duplica cliente na Stripe; no segundo, a ordem entre validade e cota é garantida por teste existente.

**Consistência de tipos.** `decidirCobranca` recebe `EstadoDeCobranca` e devolve `DecisaoDeCobranca` nas Tasks 2 e 6. `creditoDisponivel` devolve `number | null`, `gastarCredito` recebe `number`, e a Task 6 usa `idDoCredito !== null` antes de passar. `comprarAvulso` aceita `'mapa' | 'vocacao'`, a mesma lista fechada de `VENDAVEIS` na Task 4.
