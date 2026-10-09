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

    // `checkoutUrl`, e não `url`: é o nome que `criar-checkout-stripe:146` já usa
    // e que `services/stripe.ts:34,37` lê. Duas functions que fazem a mesma coisa
    // com nomes diferentes fazem quem copiar o serviço existente falhar sem erro
    // de compilação — o campo vem `undefined` e ninguém vê.
    return resposta({ checkoutUrl: session.url });
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
- Consome: `decidirCobranca` (Task 2); de `_shared/avulso.ts` (Task 3), `creditoDisponivel(cliente, usuarioId, oraculo): Promise<BuscaDeCredito>` onde `BuscaDeCredito = { estado: 'tem'; id: number } | { estado: 'nao_tem' } | { estado: 'erro' }`, `reivindicarCredito(cliente, compraId, chave): Promise<boolean>` e `devolverCredito(cliente, compraId): Promise<void>`.

> **Emenda de 08/10/2026.** A revisão do lote 1-3 derrubou o contrato que esta tarefa
> consumiria. `gastarCredito` **não existe mais**. Gastar o crédito DEPOIS de gerar era
> verificar-depois-agir: dois cliques simultâneos liam o mesmo crédito disponível, os dois
> geravam, e a guarda só impedia o segundo `update` — duas leituras por uma compra, e a
> Anthropic paga duas vezes. Agora o crédito é **reivindicado antes de gerar**, e devolvido se
> a geração falhar.

> **Segunda emenda de 08/10/2026.** A revisão desta tarefa achou que a proteção que o
> plano descrevia não existia para o público do avulso. O plano dizia que `desligado`
> continuaria barrando, mas `decidirUso` (`_shared/limites.ts:71-76`) devolve `vencido`
> **antes** de avaliar `ligado(tipo, config)`: para quem cancelou ou nunca assinou — ou
> seja, exatamente quem compra avulso — o motivo é sempre `vencido`, que o crédito
> contorna. O interruptor do dono era contornável por quem pagasse.
>
> Daí quatro mudanças que o texto abaixo não previa:
>
> 1. `Veredito` ganhou `recursoLigado: boolean`, calculado uma vez no topo de
>    `decidirUso` e presente em todos os retornos. A **ordem** de `decidirUso` ficou
>    intacta: `vencido` vem antes de `desligado` de propósito, tem teste, e existe para
>    quem venceu ler a mensagem certa. O campo novo é informação a mais, não reordenação.
> 2. O crédito só contorna o teto do dia quando a cota do plano **também** acabou
>    (`tetoDoDiaContornavel`). Sem isso, um assinante com cota sobrando queimava o
>    crédito comprado num limite que passa à meia-noite de graça.
> 3. O portão **lista o que o crédito contorna**, em vez de listar o que ele não
>    contorna. Um quinto motivo que alguém acrescente a `decidirUso` nasce barrado.
> 4. A devolução no `finally` ficou em `try/catch`: um throw ali substituiria o 502 ou
>    422 já montado por um 500 cru, sem CORS, e o app mostraria falha de rede.
>
> **Guarda operacional que nasce daqui:** `recursoLigado` vale para o plano da pessoa, e
> o crédito é por produto. Hoje `configuracao_ia` tem `interpretacao_ligada = true` para
> `gratuito` (`supabase/perguntas.sql:92-96`), então o produto funciona. Mas desligar
> `interpretacao` no plano `gratuito` pelo Painel barraria **todo** comprador avulso, e a
> mensagem que ele leria não explicaria por que o que ele comprou não funciona. Não
> desligue esse interruptor enquanto a venda avulsa estiver no ar.

- [ ] **Passo 1: Escrever o teste de fonte que falha**

```ts
describe('o credito avulso entra na interpretacao sem furar o cache', () => {
  const interp = funcoes.find((f) => f.nome === 'ia-interpretacao')!.fonte;

  it('o credito é lido ANTES da decisão de cobrança', () => {
    expect(interp).toContain('creditoDisponivel(');
    expect(interp).toContain('decidirCobranca(');
    expect(interp.indexOf('creditoDisponivel(')).toBeLessThan(interp.indexOf('decidirCobranca('));
  });

  it('o credito é reivindicado ANTES de gerar, e nao depois', () => {
    // Depois seria verificar-depois-agir: dois cliques simultâneos gerariam os
    // dois, e só o segundo `update` falharia — duas leituras por uma compra.
    expect(interp.indexOf('reivindicarCredito('))
      .toBeLessThan(interp.indexOf('anthropic.messages.create'));
  });

  it('o retorno do cache não passa por reivindicarCredito', () => {
    // Os dois `return` de cache estão acima do ponto de reivindicação. Se a
    // reivindicação subisse para antes deles, uma releitura comeria a compra.
    expect(interp.indexOf('reivindicarCredito(')).toBeGreaterThan(interp.indexOf('doCache: true'));
  });

  it('a geração que falha devolve o crédito', () => {
    // Sem isto, um 502 da Anthropic faria a pessoa perder o que pagou.
    expect(interp).toContain('devolverCredito(');
  });

  it('falha ao LER o crédito não vira "sem acesso"', () => {
    // `erro` e `nao_tem` são estados diferentes: tratar os dois igual mandaria
    // quem já comprou comprar de novo, e nada impede a segunda compra.
    expect(interp).toContain("estado === 'erro'");
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

```bash
npx jest __tests__/validade-nas-functions.test.ts
```

Esperado: FAIL nos cinco.

- [ ] **Passo 3: Ler o crédito e decidir**

Depois do bloco que lê `perfil` e calcula `restantes` e `semLimite`, e **antes** do `if (oraculo === 'vocacao')`:

```ts
  // O crédito avulso é lido só para os dois produtos vendáveis: tarô e búzios
  // não estão à venda avulsa, e uma consulta a mais por leitura deles seria
  // custo sem uso.
  const busca = (oraculo === 'mapa' || oraculo === 'vocacao')
    ? await creditoDisponivel(supabaseAdmin, usuarioId, oraculo)
    : { estado: 'nao_tem' as const };

  const cobranca = decidirCobranca({
    semLimite,
    restantesDoPlano: restantes,
    temCreditoAvulso: busca.estado === 'tem',
  });
```

- [ ] **Passo 4: Deixar `cobranca.permitido` ser quem barra, e separar erro de ausência**

Leia o código existente que barra por cota e por validade **antes de mexer**: a ordem entre a conferência de validade e a de cota é garantida por um teste já existente nesta mesma suíte (`vencimentoAntesDaCota`), e invertê-la quebra esse teste. Mantenha a ordem; troque apenas o critério de cota por `cobranca.permitido`.

E, antes de devolver "sem acesso", trate o erro de leitura:

```ts
  // Falha ao LER o crédito não pode virar "compre": a pessoa pode já ter
  // comprado, e o `UNIQUE` é por sessão do Stripe, não por pessoa — nada
  // impediria a segunda compra. Só importa para quem seria barrado; quem tem
  // cota do plano passa de qualquer jeito.
  if (!cobranca.permitido && busca.estado === 'erro') {
    return resposta({ erro: 'Não foi possível conferir seu acesso agora. Tente de novo.' }, 503);
  }
```

- [ ] **Passo 5: Reivindicar ANTES de gerar**

Imediatamente antes do `try` que chama a Anthropic — e portanto **depois** dos dois `return` de cache:

```ts
  // Reivindicar antes de gerar, e não depois: quem perde a corrida para aqui,
  // sem gastar chamada de IA. Os dois `return` de cache estão acima, então uma
  // releitura nunca chega a este ponto e nunca come a compra.
  if (cobranca.fonte === 'avulso' && busca.estado === 'tem') {
    const ganhou = await reivindicarCredito(supabaseAdmin, busca.id, chave);
    if (!ganhou) {
      return resposta({ erro: 'Esta leitura já está sendo gerada. Aguarde um instante.' }, 409);
    }
  }
```

- [ ] **Passo 6: Descontar do plano, e devolver o crédito se a geração falhar**

No bloco que hoje desconta `consultas_restantes`, depois de a leitura existir — o avulso **já foi** cobrado no passo anterior:

```ts
    // O avulso já foi reivindicado antes de gerar; aqui só resta o plano.
    if (cobranca.fonte === 'plano') {
      exigirEscrita('perfis.consultas_restantes', await supabaseAdmin
        .from('perfis').update({ consultas_restantes: restantes - 1 }).eq('id', usuarioId));
    }
```

E no `catch` que hoje devolve 502:

```ts
    // A leitura não saiu, e o crédito já estava reivindicado. Sem devolver, a
    // pessoa perderia o que pagou por uma falha nossa.
    if (cobranca.fonte === 'avulso' && busca.estado === 'tem') {
      await devolverCredito(supabaseAdmin, busca.id);
    }
```

- [ ] **Passo 7: Acrescentar os imports**

```ts
import { decidirCobranca } from '../_shared/avulso-regras.ts';
import { creditoDisponivel, devolverCredito, reivindicarCredito } from '../_shared/avulso.ts';
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
- Criar: `services/__tests__/avulso-cliente.test.ts`
- Criar: `hooks/useCreditoAvulso.ts`
- Modificar: `app/vocacao/index.tsx`, no bloco da leitura (hoje linhas 282-331)
- Modificar: `app/mapa-astral/resultado.tsx`, no bloco "O que isso forma junto" (hoje linhas 612-685)

**Interfaces:**
- Consome: a function `criar-checkout-avulso` (Task 4) e a tabela `compras_avulsas` (Task 1).
- Produz: `creditosDaPessoa(): Promise<Record<string, number>>` e `comprarAvulso(oraculo: 'mapa' | 'vocacao', moeda?: string): Promise<string>` em `services/avulso.ts`; `useCreditoAvulso(oraculo): { credito: number }` em `hooks/useCreditoAvulso.ts`.

> **Emenda de 08/10/2026.** O texto original mandava pôr o botão de compra "ao
> lado do 'Ver os planos' que já existe no bloco trancado". Li as duas telas e
> isso erra em dois pontos, os dois conferidos no código, não deduzidos:
>
> 1. **O crédito de vocação seria ingastável.** `app/vocacao/index.tsx:293` só
>    renderiza o botão da leitura quando `temMapaCompleto`, que é
>    `temAcesso('mapa_completo')` — consulta à tabela `ACESSO` de
>    `hooks/usePlano.ts:17-22`, onde `gratuito` tem apenas `consulta_basica`.
>    Quem compra volta da Stripe sem plano, o portão continua fechado, e a tela
>    oferece uma segunda compra que também não dá para gastar. É a mesma forma
>    do defeito que a revisão pegou no servidor, onde `conferirUso` barrava
>    justamente o público do avulso. O portão passa a aceitar o crédito.
> 2. **No mapa, aquele lugar vende o produto errado.** Os dois "Ver os planos"
>    do mapa (`resultado.tsx:724` e `:747`) trancam os outros oito planetas e as
>    doze casas — conteúdo de PLANO, que o crédito não libera. O crédito paga
>    exatamente uma chamada de `ia-interpretacao`. A oferta vai no bloco da
>    leitura, que é o que ela entrega.
> 3. **O arquivo de teste colidia com um que já existe.** O texto original mandava
>    criar `services/__tests__/avulso.test.ts`. Esse nome está ocupado desde a
>    Task 3 por 163 linhas e 12 testes de `supabase/functions/_shared/avulso.ts`
>    — o módulo do servidor. Ele vive em `services/__tests__/` porque o Jest do
>    app é o que testa os módulos compartilhados das Edge Functions, que rodam no
>    Deno e ficam fora do `tsc`. Escrever por cima apagaria a prova de que o
>    crédito não é reivindicado duas vezes nem devolvido indevidamente. O teste
>    desta tarefa passa a se chamar `services/__tests__/avulso-cliente.test.ts`;
>    `services/avulso.ts` mantém o nome, e o `jest.mock('../supabase', ...)`
>    continua valendo porque o caminho relativo é o mesmo.
>
>    O scan de pré-voo não pegou isto porque o plano **nunca nomeou** o teste da
>    Task 3 — quem o criou foi o implementador, por conta própria e com razão. A
>    lição: a tabela de conflitos lida do texto do plano não vê arquivos que as
>    tarefas criaram além do que o plano pediu. Antes de despachar uma tarefa que
>    *cria* arquivo, olhar o disco, e não só o plano.

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
npx jest services/__tests__/avulso-cliente.test.ts
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
  // `checkoutUrl` é o nome que as duas functions de checkout devolvem, e o que
  // `services/stripe.ts` já lê. Ler `url` aqui daria `undefined` em silêncio.
  const url = (data as { checkoutUrl?: string } | null)?.checkoutUrl;
  if (!url) throw new Error('O pagamento não abriu. Tente de novo.');
  return url;
}
```

- [ ] **Passo 4: Rodar e ver passar**

```bash
npx jest services/__tests__/avulso-cliente.test.ts
```

Esperado: PASS, 2 testes.

- [ ] **Passo 5: O hook que relê ao voltar da Stripe**

Um hook, e não um `useEffect` em cada tela, porque as duas telas querem a mesma
coisa e `hooks/` já é o lugar disso nesta base (`usePlano`, `useAdmin`).

```ts
// hooks/useCreditoAvulso.ts
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { creditosDaPessoa } from '../services/avulso';

/**
 * Quantos créditos avulsos não gastos a pessoa tem DESTE produto.
 *
 * Relê a cada vez que a tela ganha foco, e não só na montagem: a compra
 * acontece FORA do app, no navegador da Stripe. Quem paga e volta encontraria a
 * tela exatamente como a deixou — trancada, com o crédito recém-comprado
 * invisível, e sem nenhuma pista de que o pagamento funcionou.
 *
 * `useFocusEffect` é o que `app/lei-atracao/index.tsx` já usa para o mesmo fim.
 */
export function useCreditoAvulso(oraculo: 'mapa' | 'vocacao') {
  const [credito, setCredito] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      creditosDaPessoa().then((porOraculo) => {
        if (vivo) setCredito(porOraculo[oraculo] ?? 0);
      });
      return () => { vivo = false; };
    }, [oraculo]),
  );

  return { credito };
}
```

- [ ] **Passo 6: Abrir o portão da vocação, e oferecer no card**

Em `app/vocacao/index.tsx`, acrescente aos imports:

```tsx
import { Linking } from 'react-native';
import { useCreditoAvulso } from '../../hooks/useCreditoAvulso';
import { comprarAvulso } from '../../services/avulso';
import { mostrarAlerta } from '../../utils/alerta';
```

`Linking` entra na linha de import que já existe de `react-native`, não numa
nova. Junto de `const { temAcesso } = usePlano();` (linha 54):

```tsx
  const { credito } = useCreditoAvulso('vocacao');
```

O portão da linha 293 passa a aceitar o crédito. **Esta é a linha sem a qual o
produto cobra e não entrega:**

```tsx
                ) : (temMapaCompleto || credito > 0) ? (
```

E dentro do `emConstrucaoCard` (hoje linhas 313-331), depois do botão "Ver os
planos", que fica onde está:

```tsx
                    {/* A segunda saída, para quem não quer assinar. A assinatura
                        segue sendo a oferta principal: este botão é secundário na
                        hierarquia, e o texto diz o que se leva, não só que se paga. */}
                    <Pressable
                      onPress={async () => {
                        Hapticos.impactoLeve();
                        try {
                          await Linking.openURL(await comprarAvulso('vocacao'));
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
                    <Text style={estilos.emConstrucaoTexto}>
                      O direito de gerar vale 90 dias. A leitura, depois de gerada, fica para sempre.
                    </Text>
```

Este card só aparece quando `!temMapaCompleto && credito === 0`, então aqui a
oferta não precisa de condição nenhuma: quem já tem crédito nunca vê este card,
vê o botão da leitura.

- [ ] **Passo 7: Oferecer no mapa, no bloco da leitura**

Em `app/mapa-astral/resultado.tsx`, acrescente aos imports o mesmo conjunto do
Passo 6, trocando `'vocacao'` por `'mapa'`. Em vez de `const { temAcesso } = usePlano();` (linha 119):

```tsx
  const { temAcesso, podeFazerConsulta } = usePlano();
  const { credito } = useCreditoAvulso('mapa');
  // Quem decide oferecer é `podeFazerConsulta`, que o app já usa, e não uma
  // conta nova nesta tela: seriam duas verdades sobre acesso, e a que liberasse
  // indevido seria a que ninguém notaria. É o mesmo argumento do comentário de
  // `components/SemaforoUso.tsx:41-42`. Ela já cobre super-admin, plano
  // ilimitado, cota em zero e quem cancelou (o webhook zera a cota no mesmo
  // update). Sem crédito na mão e sem consulta para gastar é exatamente quando
  // a compra avulsa é a resposta.
  const ofertarAvulso = credito === 0 && !podeFazerConsulta();
```

No bloco "O que isso forma junto", no ramo em que ainda não há leitura — depois
de `{erroIA && <Text style={estilos.avisoHonesto}>{erroIA}</Text>}` e antes do
`<Pressable>` de "Ler a minha combinação":

```tsx
                {credito > 0 ? (
                  <Text style={estilos.secaoSubtitulo}>
                    {credito === 1
                      ? 'Você tem uma leitura avulsa deste mapa para usar.'
                      : `Você tem ${credito} leituras avulsas deste mapa para usar.`}
                  </Text>
                ) : null}
```

E depois daquele `<Pressable>`:

```tsx
                {ofertarAvulso ? (
                  <>
                    {/* A segunda saída. A assinatura segue sendo a oferta principal:
                        este botão vem depois e é secundário na hierarquia. Fica AQUI,
                        e não nos dois cards de "Ver os planos" desta tela: aqueles
                        trancam os outros oito planetas e as doze casas, que o crédito
                        não libera. Ele paga esta leitura, e é ao lado dela que se
                        oferece. */}
                    <Pressable
                      onPress={async () => {
                        Hapticos.impactoLeve();
                        try {
                          await Linking.openURL(await comprarAvulso('mapa'));
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
                    <Text style={estilos.notaRodape}>
                      O direito de gerar vale 90 dias. A leitura, depois de gerada, fica para sempre.
                    </Text>
                  </>
                ) : null}
```

Nos dois arquivos, `botaoAvulso` e `botaoAvulsoTexto` copiam o `botaoPlanos` e o
`botaoPlanosTexto` que cada um já tem, trocando o fundo por transparente e
acrescentando `borderWidth: 1` com `borderColor: Cores.acento` — é o que o deixa
visivelmente secundário. `app/vocacao/index.tsx` **não** tem o estilo
`notaRodape`; por isso o Passo 6 usa `emConstrucaoTexto`. Não acrescente
`notaRodape` lá.

- [ ] **Passo 8: Rodar tudo**

```bash
npx tsc --noEmit
npx jest
```

Esperado: sem erro de tipo e suíte inteira verde.

- [ ] **Passo 9: Commit**

```bash
git add services/avulso.ts services/__tests__/avulso-cliente.test.ts hooks/useCreditoAvulso.ts app/mapa-astral/resultado.tsx app/vocacao/index.tsx
git commit -m "feat(avulso): comprar uma leitura sem assinar"
```

---

### Task 8: Os Termos dizem o que foi vendido

**Arquivos:**
- Modificar: `app/legal/termos.tsx`
- Modificar: `app/legal/privacidade.tsx`

> **Emenda de 08/10/2026.** Ao conferir o arquivo antes de despachar, achei um
> erro de fato nos dois documentos legais: eles dizem que o pagamento é
> processado pelo **Mercado Pago**. Não é, e nunca foi nesta base — `grep -rli`
> por "mercado pago" acha exatamente dois arquivos, `app/legal/termos.tsx` e
> `app/legal/privacidade.tsx`, e nenhum código. As quatro functions de pagamento
> são `criar-checkout-stripe`, `criar-portal-stripe`, `stripe-webhook` e
> `criar-checkout-avulso`.
>
> Entra nesta tarefa, e não numa entrega própria, por três motivos: é o mesmo
> arquivo que esta tarefa já abre, no parágrafo imediatamente acima de onde a
> seção nova entra; acrescentar uma verdade ao lado de uma falsidade sobre
> pagamento, na tarefa cujo nome é "os Termos dizem o que foi vendido", seria
> esquisito; e na Política de Privacidade o nome errado não é cosmético — ali se
> declara **quem recebe os dados de pagamento da pessoa**, que é obrigação de
> transparência da LGPD.
>
> A correção é troca de nome de fornecedor, não reescrita: três menções, uma em
> `termos.tsx:45` e duas em `privacidade.tsx:26,39`.

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

- [ ] **Passo 2: Corrigir quem processa o pagamento**

Em `app/legal/termos.tsx:45`, dentro de "Planos, pagamentos e assinaturas":

```
'Os pagamentos são processados pela Stripe. Ao contratar um plano ou comprar um item avulso, você concorda também com os termos do meio de pagamento. O acesso ao que foi pago é liberado após a confirmação do pagamento.',
```

Em `app/legal/privacidade.tsx:26`, em "Dados que coletamos":

```
'Dados de pagamento: quando você contrata um plano ou compra um item avulso, o pagamento é processado pela Stripe. Não coletamos nem armazenamos os dados do seu cartão — recebemos apenas a confirmação e a situação da transação.',
```

Em `app/legal/privacidade.tsx:39`, em "Compartilhamento de dados", troque só o
nome na lista: `Stripe (processamento de pagamentos)` no lugar de
`Mercado Pago (processamento de pagamentos)`. **Não** mexa no resto desse
parágrafo nem acrescente fornecedor nenhum à lista — falta ali o provedor de IA,
e isso é uma lacuna de verdade, mas é decisão jurídica do dono e entrega
própria, não sua.

- [ ] **Passo 3: Atualizar a data nos dois arquivos**

Troque `atualizadoEm="setembro de 2026"` por `atualizadoEm="outubro de 2026"`.
Confira se `privacidade.tsx` também tem essa propriedade; se tiver, atualize as
duas. Se o valor não for exatamente "setembro de 2026", **pare e pergunte** em
vez de adivinhar o que a data deveria ser.

- [ ] **Passo 4: O teste que tranca as duas correções**

*Acrescentado em 08/10/2026, no despacho.* O texto original desta tarefa não pedia
teste nenhum, e isso era falha dele: nada trancaria a correção do processador de
pagamento, que é uma afirmação de **fato** num documento legal — o tipo de coisa que
volta sozinha na próxima edição de texto.

Crie `__tests__/app/legal/documentos.test.tsx` afirmando, sobre as duas telas
renderizadas:

1. **"Mercado Pago" não aparece em nenhuma das duas.** Comente por que o teste existe:
   o nome errado esteve lá, e na Política de Privacidade ele declara quem recebe os
   dados de pagamento da pessoa, o que é transparência de LGPD, não cosmética.
2. **"Stripe" aparece nas duas.**
3. **Os Termos têm a seção "Compra avulsa"**, e o texto dela diz os 90 dias e que a
   leitura gerada permanece.
4. **Os Termos continuam tendo "Cancelamento e reembolso"** com o arrependimento de 7
   dias. Essa seção já existia; o teste existe para a nova não ter comido a antiga.
5. **As duas telas dizem "outubro de 2026"**.

Siga a forma das suítes de tela que já existem — `__tests__/app/home-cadeado.tsx` é um
exemplo — incluindo os mocks que elas usam. Se as telas legais renderizarem sem mock
nenhum, melhor: não acrescente mock que não precisa.

- [ ] **Passo 5: Rodar**

```bash
npx tsc --noEmit && npx jest
```

Antes de dar a tarefa por feita, mute o que importa: devolva "Mercado Pago" a um dos
dois arquivos e veja se acusa; remova a seção "Compra avulsa" e veja se acusa.

- [ ] **Passo 6: Commit**

```bash
git add app/legal/termos.tsx app/legal/privacidade.tsx __tests__/app/legal/documentos.test.tsx
git commit -m "docs(legal): o que a compra avulsa entrega, e quem processa o pagamento"
```

---

### Task 9: Quem pagou alcança o que pagou

**Acrescentada em 08/10/2026**, depois que a re-revisão da Task 6 achou uma dívida
Importante que já existia desde a primeira rodada. Não é refação da Task 6: ela está
aprovada, com 1099 testes verdes, e esta é uma brecha vizinha, independente e testável
sozinha.

**O que está furado.** Na vocação, a leitura guardada é lida **depois** do portão e da
cobrança — decisão deliberada, comentada no código: a chave da vocação é grossa (signos e
graus de poucas peças), o acerto entre pessoas diferentes é comum, e uma leitura guardada
antes do portão iria de graça a quem está com o plano vencido. No mapa é o contrário: a
chave carrega a posição exata de dez corpos, quase não se repete, e o cache fica antes do
portão.

A consequência: o crédito é reivindicado **antes** de gerar. Se a geração der certo, a
leitura for guardada e a resposta se perder no caminho — worker morto, rede do celular
caindo no instante errado — o crédito ficou gasto. Quem tentar de novo, na vocação, leva
402 no portão **antes** de alcançar a leitura que ele pagou e que já está no banco. No
mapa não acontece, porque lá o cache vem primeiro.

Perder o que se pagou é o que a spec já proíbe na linha "crédito nunca é consumido quando
a resposta vem do cache". Este é o caso vizinho: o crédito **foi** consumido, a leitura
existe, e o comprador não alcança.

**O que esta tarefa NÃO cobre, de propósito.** Se o worker morrer **antes** de guardar a
leitura, o crédito fica gasto sem nada no banco, e nem este conserto alcança. Autorizar a
geração nesse caso abriria gerações ilimitadas de graça enquanto a gravação falhasse — uma
chamada paga à Anthropic por tentativa. O caminho aqui **só serve cache, nunca gera**.
Esse subcaso raro fica para o dono resolver à mão, e ele tem o dado para isso:
`compras_avulsas.consumido_chave` guarda exatamente qual leitura gastou qual compra, que é
o motivo pelo qual a coluna existe.

**Arquivos:**
- Modificar: `supabase/functions/_shared/avulso.ts`
- Modificar: `supabase/functions/ia-interpretacao/index.ts`
- Testar: `services/__tests__/avulso.test.ts` (o do servidor, que já existe, com 12 testes — **acrescente**, não substitua)
- Testar: `__tests__/validade-nas-functions.test.ts`

**Interfaces:**
- Consome: a tabela `compras_avulsas` (Task 1) e `chaveDoMapa`, que já vive em `ia-interpretacao/index.ts`.
- Produz: `creditoJaGastoNesta(cliente, usuarioId, oraculo, chave): Promise<boolean>` em `_shared/avulso.ts`.

- [ ] **Passo 1: Escrever os testes que falham**

Em `services/__tests__/avulso.test.ts`, use o `clienteFalso` que já está no arquivo:

```ts
describe('creditoJaGastoNesta', () => {
  it('diz que sim quando existe compra consumida com esta chave', async () => {
    const { cliente } = clienteFalso({ data: [{ id: 7 }], error: null });
    await expect(creditoJaGastoNesta(cliente, 'u1', 'vocacao', 'ch1')).resolves.toBe(true);
  });

  it('diz que nao quando nao ha nenhuma', async () => {
    const { cliente } = clienteFalso({ data: [], error: null });
    await expect(creditoJaGastoNesta(cliente, 'u1', 'vocacao', 'ch1')).resolves.toBe(false);
  });

  it('falha de leitura responde NAO, e nao sim', async () => {
    // Falhar para "sim" entregaria leitura guardada a quem o portao barraria.
    // Falhar para "nao" só mantém a recusa que a pessoa já teria tido.
    const { cliente } = clienteFalso({ data: null, error: { message: 'x' } });
    await expect(creditoJaGastoNesta(cliente, 'u1', 'vocacao', 'ch1')).resolves.toBe(false);
  });

  it('casa pessoa, oraculo E chave, e exige consumo', async () => {
    const { cliente, chamadas } = clienteFalso({ data: [], error: null });
    await creditoJaGastoNesta(cliente, 'u1', 'vocacao', 'ch1');
    const eq = chamadas.filter((c) => c.metodo === 'eq').map((c) => c.args);
    expect(eq).toEqual([['usuario_id', 'u1'], ['oraculo', 'vocacao'], ['consumido_chave', 'ch1']]);
    // Sem isto, um credito ainda NAO gasto daria direito a leitura de graca.
    expect(chamadas.some((c) => c.metodo === 'not')).toBe(true);
  });
});
```

Acrescente `creditoJaGastoNesta` ao `import` no topo do arquivo. O tipo `Metodo` do
`clienteFalso` precisa ganhar `'not'`; se o falso não tiver `not`, acrescente seguindo a
forma dos outros métodos encadeáveis.

Em `__tests__/validade-nas-functions.test.ts`:

```ts
  it('o direito de quem ja pagou e conferido ANTES do portao', () => {
    // Depois do portao nao serve para nada: o 402 ja teria voltado.
    const direito = interp.indexOf('creditoJaGastoNesta(');
    const portao = interp.indexOf('!vereditoContornavel');
    expect(direito).toBeGreaterThan(-1);
    expect(portao).toBeGreaterThan(-1);
    expect(direito).toBeLessThan(portao);
  });

  it('o caminho de quem ja pagou nunca gera, so devolve o guardado', () => {
    // Autorizar geracao ali abriria chamada paga ilimitada enquanto a gravacao
    // falhasse. Entre a conferencia do direito e o seu return nao entra Anthropic.
    const direito = interp.indexOf('creditoJaGastoNesta(');
    const geracao = interp.indexOf('anthropic.messages.create');
    expect(interp.slice(direito, geracao)).not.toContain('anthropic.messages.create');
  });
```

- [ ] **Passo 2: Rodar e ver falhar**

```bash
npx jest services/__tests__/avulso.test.ts __tests__/validade-nas-functions.test.ts
```

Esperado: FAIL nos seis novos. Os 12 que já estavam ali continuam passando.

- [ ] **Passo 3: A pergunta ao banco**

No fim de `supabase/functions/_shared/avulso.ts`:

```ts
/**
 * Esta pessoa já gastou um crédito NESTA leitura exata?
 *
 * Existe por causa de um furo estreito: o crédito é reivindicado antes de gerar, e
 * se a resposta se perder depois de a leitura ser guardada, o comprador de vocação
 * leva 402 no portão antes de alcançar o que pagou — porque na vocação o cache é
 * lido depois do portão, de propósito.
 *
 * Não abre nada para mais ninguém. O direito é da COMPRA, casado com a chave que
 * ela gastou, e a chave sai dos dados de nascimento da própria pessoa.
 *
 * **Falha de leitura responde `false`.** Responder `true` entregaria leitura
 * guardada a quem o portão barraria; responder `false` só mantém a recusa que a
 * pessoa já teria tido de qualquer jeito.
 */
export async function creditoJaGastoNesta(
  cliente: ClienteSupabase,
  usuarioId: string,
  oraculo: string,
  chave: string,
): Promise<boolean> {
  const { data, error } = await cliente
    .from('compras_avulsas')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('oraculo', oraculo)
    .eq('consumido_chave', chave)
    // Gasto, e não apenas comprado: um crédito ainda disponível daria direito a
    // leitura de graça e seguiria valendo, o que é cobrar zero por duas.
    .not('consumido_em', 'is', null)
    .limit(1);
  if (error) {
    console.error('falha ao conferir credito ja gasto', error.message);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}
```

Use o mesmo tipo de cliente que as outras funções deste arquivo já recebem — não
introduza um tipo novo.

- [ ] **Passo 4: Extrair a leitura do guardado**

Hoje `ia-interpretacao/index.ts` lê `interpretacoes_mapa` em dois lugares, com o mesmo
bloco de oito linhas: contar reuso e devolver com `doCache: true`. Esta tarefa
acrescentaria um terceiro. Extraia **uma** função no próprio arquivo, acima do handler, e
faça os dois pontos existentes passarem a usá-la:

```ts
/**
 * A leitura já escrita, se existir, com o contador de reuso somado.
 *
 * Uma função, e não o bloco repetido: eram dois pontos iguais e esta tarefa traria o
 * terceiro. Três cópias de "conta o reuso e devolve" é onde uma delas para de contar
 * sem ninguém notar.
 */
async function lerGuardada(
  cliente: ReturnType<typeof createClient>,
  chave: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await cliente
    .from('interpretacoes_mapa').select('conteudo, usos').eq('chave', chave).maybeSingle();
  if (error) {
    console.error('falha ao ler interpretacao guardada', error.message);
    return null;
  }
  if (!data?.conteudo) return null;
  const usos = typeof data.usos === 'number' ? data.usos : 1;
  const { error: erroContar } = await cliente
    .from('interpretacoes_mapa').update({ usos: usos + 1 }).eq('chave', chave);
  if (erroContar) console.error('falha ao contar reuso', erroContar.message);
  return data.conteudo as Record<string, unknown>;
}
```

Se o tipo do cliente não casar, use o mesmo tipo que `creditoDisponivel` recebe em
`_shared/avulso.ts`. Ao trocar os dois pontos existentes, **não mude o que eles
devolvem**: os dois respondem `resposta({ ...conteudo, oraculo, doCache: true })`, e a
suíte tem teste que depende de `doCache: true` aparecer antes do ponto de reivindicação.

- [ ] **Passo 5: Conferir o direito antes do portão**

Duas mudanças em `ia-interpretacao/index.ts`. Primeiro, suba o cálculo da chave da
vocação para antes do portão — `chaveDoMapa` é hash de texto, calcular mais cedo não muda
nada — e tire a atribuição de dentro do bloco de vocação, que passa a usar a chave já
calculada:

```ts
  // A chave da vocação sai daqui para cima porque o direito de quem já pagou é
  // conferido ANTES do portão. O prefixo entra no TEXTO que vira hash, e não na
  // função: assim as chaves de mapa já guardadas continuam valendo, e uma vocação
  // nunca cai na linha de um mapa.
  if (oraculo === 'vocacao') {
    chave = await chaveDoMapa(`vocacao:${dados}`);
  }
```

Depois, logo antes de `const recusaDoVeredito = ...`, o caminho de quem já pagou:

```ts
  // Quem já gastou um crédito NESTA leitura alcança ela sempre, mesmo barrado pelo
  // portão. Sem isto, o comprador de vocação cuja resposta se perdeu depois de a
  // leitura ser guardada leva 402 antes de chegar ao cache: o crédito foi gasto, a
  // leitura está no banco, e ele não alcança o que pagou.
  //
  // Só serve o guardado, e nunca gera: autorizar geração aqui abriria chamada paga
  // ilimitada enquanto a gravação falhasse. Se não houver leitura guardada, este
  // caminho não faz nada e a requisição segue para o portão normal.
  if (oraculo === 'vocacao'
      && await creditoJaGastoNesta(supabaseAdmin, usuarioId, oraculo, chave)) {
    const guardada = await lerGuardada(supabaseAdmin, chave);
    if (guardada) return resposta({ ...guardada, oraculo, doCache: true });
  }
```

Acrescente `creditoJaGastoNesta` ao `import` de `'../_shared/avulso.ts'` que já existe no
topo. **Não** mexa no portão, na cobrança, na reivindicação nem no `finally`: este caminho
devolve antes de todos eles, e é por isso que ele não precisa de nenhuma guarda a mais lá
embaixo.

- [ ] **Passo 6: Rodar tudo**

```bash
npx jest
npx tsc --noEmit
node scripts/conferir-functions.js
```

Esperado: suíte inteira verde, sem erro de tipo, sintaxe das functions ok. Confira que o
total de testes **subiu** em relação a antes: se algum dos 12 testes antigos de
`avulso.test.ts` desapareceu, você substituiu em vez de acrescentar.

- [ ] **Passo 7: Mutar e ver vermelho**

Antes de dizer que terminou, quebre cada coisa de propósito e confirme que algo acusa:

1. `creditoJaGastoNesta` devolvendo `true` no erro de leitura.
2. A conferência do direito movida para **depois** do portão.
3. O `.not('consumido_em', 'is', null)` removido.
4. O `return` do caminho de quem já pagou trocado por deixar seguir.

Se alguma dessas ficar verde, o teste que faltava é o que você escreve. Relate as quatro
no relatório, com o número de vermelhos de cada.

- [ ] **Passo 8: Commit**

```bash
git add supabase/functions/_shared/avulso.ts supabase/functions/ia-interpretacao/index.ts services/__tests__/avulso.test.ts __tests__/validade-nas-functions.test.ts
git commit -m "fix(avulso): quem pagou alcanca a leitura guardada mesmo barrado"
```

---

### Task 10: A tela de sucesso não pode mentir

**Acrescentada em 08/10/2026**, a partir de um achado da revisão da Task 7 que estava
fora do diff e sem dono em tarefa nenhuma.

**O que está errado.** `app/pagamento/sucesso.tsx` é estático: não lê parâmetro nenhum e
diz, para todo mundo, **"Assinatura confirmada!"** e "Seu plano está sendo liberado".
Quem acabou de comprar uma leitura avulsa não assinou nada e não vai receber plano nenhum.
A última tela do caminho que esta branch cria afirma duas coisas falsas a quem pagou, e o
botão manda para o início em vez de para a leitura que a pessoa comprou.

E o `cancel_url` do checkout avulso aponta para `/planos` — quem desiste da compra avulsa
cai justamente na página de assinatura que ele decidiu não assinar.

**Por que não voltar para a tela do resultado.** `app/mapa-astral/resultado.tsx:117,144`
lê `cidadeId`, `lat`, `lon` de `useLocalSearchParams` e **devolve `null`** sem eles. Esses
dados não atravessam o checkout da Stripe, então mandar de volta para lá renderiza tela
vazia. Por isso o cancelamento volta ao começo do oráculo: `/mapa-astral` e `/vocacao`.

**Arquivos:**
- Modificar: `supabase/functions/criar-checkout-avulso/index.ts`
- Modificar: `app/pagamento/sucesso.tsx`
- Criar: `__tests__/app/pagamento/sucesso.test.tsx`

**Interfaces:**
- Consome: `oraculo` (`'mapa' | 'vocacao'`), que a function já valida contra `VENDAVEIS`.
- Produz: os parâmetros `compra=avulso` e `oraculo=<produto>` na `success_url` da compra avulsa. A `success_url` da assinatura **não muda**, e é o que mantém o texto atual correto para quem assina.

- [ ] **Passo 1: Escrever o teste que falha**

```tsx
// __tests__/app/pagamento/sucesso.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import PagamentoSucesso from '../../../app/pagamento/sucesso';

const mockParams = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams(),
}));

describe('PagamentoSucesso', () => {
  it('quem assinou continua lendo que a assinatura foi confirmada', () => {
    mockParams.mockReturnValue({ session_id: 's1' });
    const { getByText } = render(<PagamentoSucesso />);
    expect(getByText('Assinatura confirmada!')).toBeTruthy();
  });

  it('quem comprou avulso NAO le que assinou', () => {
    // Dizer "Assinatura confirmada" e "seu plano esta sendo liberado" a quem
    // comprou uma leitura e nao assinou nada sao duas afirmacoes falsas na
    // ultima tela do caminho que cobra.
    mockParams.mockReturnValue({ session_id: 's1', compra: 'avulso', oraculo: 'vocacao' });
    const { queryByText } = render(<PagamentoSucesso />);
    expect(queryByText('Assinatura confirmada!')).toBeNull();
    expect(queryByText(/plano está sendo liberado/)).toBeNull();
  });

  it('a compra avulsa diz o que foi comprado e leva para la', () => {
    mockParams.mockReturnValue({ session_id: 's1', compra: 'avulso', oraculo: 'vocacao' });
    const { getByText, getByLabelText } = render(<PagamentoSucesso />);
    expect(getByText(/Pagamento confirmado/)).toBeTruthy();
    expect(getByLabelText('Ler a minha vocação')).toBeTruthy();
  });

  it('oraculo desconhecido nao inventa nome de produto', () => {
    // Parametro vem da URL, logo e da pessoa: nao da para confiar no valor.
    mockParams.mockReturnValue({ session_id: 's1', compra: 'avulso', oraculo: 'xyz' });
    const { getByText } = render(<PagamentoSucesso />);
    expect(getByText(/Pagamento confirmado/)).toBeTruthy();
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

```bash
npx jest __tests__/app/pagamento/sucesso.test.tsx
```

Esperado: FAIL em três dos quatro.

- [ ] **Passo 3: A tela passa a saber o que foi comprado**

Em `app/pagamento/sucesso.tsx`, troque `import { router } from 'expo-router'` por
`import { router, useLocalSearchParams } from 'expo-router'` e, dentro do componente:

```tsx
  const params = useLocalSearchParams<{ compra?: string; oraculo?: string }>();
  // O parâmetro vem da URL, logo vem da pessoa: nada aqui confia no valor. Produto
  // desconhecido cai na versão sem nome, que é verdadeira de qualquer jeito.
  const avulso = params.compra === 'avulso';
  const PRODUTO: Record<string, { nome: string; rota: string; acao: string }> = {
    mapa: { nome: 'a leitura do seu mapa', rota: '/mapa-astral', acao: 'Ler o meu mapa' },
    vocacao: { nome: 'a leitura da sua vocação', rota: '/vocacao', acao: 'Ler a minha vocação' },
  };
  const produto = avulso ? PRODUTO[params.oraculo ?? ''] ?? null : null;
```

O título e o texto passam a depender disso. Quem assina **continua lendo exatamente o que
lia** — é o que o primeiro teste tranca:

```tsx
          <Text style={estilos.titulo}>
            {avulso ? 'Pagamento confirmado!' : 'Assinatura confirmada!'}
          </Text>
          <Text style={estilos.texto}>
            {avulso
              ? produto
                ? `Você já pode gerar ${produto.nome}. O direito de gerar vale 90 dias, e a leitura, depois de gerada, fica para sempre.`
                : 'Você já pode gerar a leitura que comprou. O direito de gerar vale 90 dias, e a leitura, depois de gerada, fica para sempre.'
              : 'Seu plano está sendo liberado. Pode levar alguns segundos para aparecer.'}
          </Text>
          <Button
            variante="primary"
            label={produto ? produto.acao : 'Voltar ao início'}
            larguraTotal
            accessibilityLabel={produto ? produto.acao : 'Voltar ao início'}
            onPress={() => router.replace(produto ? produto.rota : '/')}
          />
```

Se `Button` não aceitar `accessibilityLabel`, use a prop que ele já tem para isso; não
mude a assinatura do componente compartilhado por causa desta tela.

- [ ] **Passo 4: As URLs do checkout avulso**

Em `supabase/functions/criar-checkout-avulso/index.ts:125-126`:

```ts
      // `compra=avulso` existe para a tela de sucesso não dizer "Assinatura
      // confirmada" a quem comprou uma leitura. A `success_url` da assinatura não
      // muda, e é isso que mantém o texto dela correto.
      success_url: `${appBaseUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}&compra=avulso&oraculo=${oraculo}`,
      // Desistir da compra avulsa não pode cair em `/planos`: é a assinatura que a
      // pessoa acabou de decidir não fazer. Volta ao começo do oráculo, e não à tela
      // do resultado, que precisa de `cidadeId`, `lat` e `lon` nos parâmetros e
      // devolve nulo sem eles — e esses dados não atravessam o checkout.
      cancel_url: `${appBaseUrl}/${oraculo === 'mapa' ? 'mapa-astral' : 'vocacao'}`,
```

`oraculo` já está validado contra `VENDAVEIS` acima neste arquivo, então os dois valores
possíveis são conhecidos. **Não** toque em `criar-checkout-stripe`.

- [ ] **Passo 5: Rodar tudo**

```bash
npx jest
npx tsc --noEmit
node scripts/conferir-functions.js
```

- [ ] **Passo 6: Mutar e ver vermelho**

1. `avulso` fixo em `false`.
2. O título da compra avulsa voltando a "Assinatura confirmada!".
3. `PRODUTO[params.oraculo ?? '']` sem o `?? null`, para ver se o produto desconhecido acusa.

Relate quantos vermelhos cada uma deixa.

- [ ] **Passo 7: Commit**

```bash
git add app/pagamento/sucesso.tsx __tests__/app/pagamento/sucesso.test.tsx supabase/functions/criar-checkout-avulso/index.ts
git commit -m "fix(avulso): a tela de sucesso diz o que a pessoa comprou"
```

---

## O que o dono faz, e o plano não

1. **Rodar `supabase/compra-avulsa.sql`** no editor SQL do Supabase.
2. **Criar dois preços na Stripe**, um por produto, em modo *one-time* — não recorrente.
3. **Inserir os `price_id`** em `public.precos_avulsos`, com o valor decidido a partir da aba Custo por produto.
4. **Deployar** `criar-checkout-avulso`, `stripe-webhook` e `ia-interpretacao`.
5. **Decidir o arrependimento depois da leitura gerada.** O texto dos Termos remete ao contato, que é a saída honesta enquanto não houver política.
6. **Revogar as credenciais do Mercado Pago, se forem reais.** A Task 8 corrigiu os documentos legais, que diziam que o pagamento era processado por lá. Mas `react_native_space/.env` (fora do git) ainda tem `MERCADOPAGO_ACCESS_TOKEN` e `EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, e **nenhum código desta base usa nenhuma das duas**. Nem eu nem os implementadores lemos os valores, de propósito. Se o token de acesso for de uma conta real, é credencial viva de um serviço que o app não usa: revogue no painel do Mercado Pago e tire as duas linhas do `.env`. Por causa do prefixo `EXPO_PUBLIC_`, o nome da chave pública aparece em builds antigos em `dist/` — o que vaza é o nome, não o segredo, mas é mais um motivo para limpar.
7. **Decidir se a coluna morta sai.** `supabase_schema.sql:137`, na raiz do repositório, tem `mp_preference_id`, resto da mesma história. Não mexi: é esquema de banco em produção e a decisão de remover coluna é sua.

## Autorrevisão

**Cobertura da spec.** Tabela própria com UNIQUE: Task 1. Precedência: Tasks 2 e 6. Não gastar em cache: Task 6, com teste de ordem. Checkout `mode: payment`: Task 4. Ramificação do webhook: Task 5. Telas de compra: Task 7. Termos: Task 8. Validade de 90 dias: Tasks 1 e 5. Alcançar a leitura já paga quando o crédito já foi gasto nela: Task 9. A tela de sucesso e o cancelamento dizerem a verdade sobre a compra avulsa: Task 10.

**Lacuna conhecida:** a spec cita uma lista de compras no Perfil, e este plano não a implementa. `creditosDaPessoa` já entrega o dado; a listagem é trabalho de tela sem risco e cabe melhor numa entrega própria. Fica registrado em vez de fingir que foi coberto.

**Lacunas que as revisões acharam e que ficam registradas, não consertadas** *(08/10/2026)*:

1. **Crédito gasto com o worker morto ANTES de guardar a leitura.** A Task 9 cobre o caso em que a leitura foi guardada e a resposta se perdeu. Se nada foi guardado, o crédito queima sem entrega, e autorizar a geração nesse caso abriria chamada paga ilimitada enquanto a gravação falhasse. O dono tem o dado para resolver à mão: `compras_avulsas.consumido_chave` casa cada venda com a leitura que a gastou.
2. **`reivindicarCredito` devolve `false` em erro de transporte mesmo se o `UPDATE` gravou**, e quem chama trata como corrida perdida — o crédito queima sem nada gerado. Consertar pede mudar o contrato de `_shared/avulso.ts` para distinguir "perdi a corrida" de "pode ter gravado"; a revisão classificou como Menor.
3. **`decidirAcesso` como função pura.** As decisões de acesso de `ia-interpretacao` continuam em linha no handler, vigiadas por testes que leem o código-fonte como texto. Recusado de propósito durante a execução — refatorar o caminho do dinheiro com tarefas restantes — e o revisor observou o argumento mais forte a favor: a tabela de acesso que ele gerou executando as funções reais só existe como script de scratchpad, e extrair as decisões é o que a transformaria em teste. Vale para depois do merge.
4. **O interruptor do dono barra o comprador com a mensagem errada.** `recursoLigado` vale para o plano da pessoa e o crédito é por produto. Hoje `interpretacao_ligada` é `true` para `gratuito` (`supabase/perguntas.sql:92-96`), então ninguém é afetado. Virou guarda operacional, na segunda emenda da Task 6: não desligar esse interruptor enquanto a venda avulsa estiver no ar.
5. **A Política de Privacidade não declara o provedor de IA** entre quem recebe dados, embora as leituras mandem data de nascimento, perguntas escritas e fotos para lá. É mais grave que o nome do processador de pagamento que a Task 8 conserta, mas é juízo jurídico do dono e entrega própria — transferência internacional, base legal, e se foto de mão conta como dado sensível.

**Sem placeholders.** Todo passo de código traz o código. Os dois lugares que mandam *ler antes de escrever* (Tasks 4 e 6) são instrução, não vaguidão: no primeiro, copiar o bloco de customer de memória duplica cliente na Stripe; no segundo, a ordem entre validade e cota é garantida por teste existente.

**Consistência de tipos** *(reescrito em 08/10/2026 — o texto original descrevia contratos que as revisões derrubaram).* `decidirCobranca` recebe `EstadoDeCobranca` e devolve `DecisaoDeCobranca` nas Tasks 2 e 6. De `_shared/avulso.ts`, `creditoDisponivel` devolve `BuscaDeCredito` — `{ estado: 'tem'; id: number } | { estado: 'nao_tem' } | { estado: 'erro' }`, e não `number | null`, porque tratar erro de leitura e ausência de crédito como a mesma coisa mandaria quem já comprou comprar de novo; `reivindicarCredito(cliente, compraId, chave)` devolve `boolean` e é chamada **antes** de gerar; `devolverCredito(cliente, compraId)` zera sem condição, e por isso só pode ser chamada onde esta execução reivindicou. `gastarCredito` **não existe**. `Veredito` ganhou `recursoLigado: boolean` obrigatório, consumido pelo portão da Task 6 e presente no literal de `components/SemaforoUso.tsx`. `comprarAvulso` aceita `'mapa' | 'vocacao'`, a mesma lista fechada de `VENDAVEIS` na Task 4, e devolve a URL lida de `checkoutUrl` — o nome que as duas functions de checkout usam.
