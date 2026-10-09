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
- Criar: `services/__tests__/avulso.test.ts`
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
  // `checkoutUrl` é o nome que as duas functions de checkout devolvem, e o que
  // `services/stripe.ts` já lê. Ler `url` aqui daria `undefined` em silêncio.
  const url = (data as { checkoutUrl?: string } | null)?.checkoutUrl;
  if (!url) throw new Error('O pagamento não abriu. Tente de novo.');
  return url;
}
```

- [ ] **Passo 4: Rodar e ver passar**

```bash
npx jest services/__tests__/avulso.test.ts
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
git add services/avulso.ts services/__tests__/avulso.test.ts hooks/useCreditoAvulso.ts app/mapa-astral/resultado.tsx app/vocacao/index.tsx
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

- [ ] **Passo 4: Rodar**

```bash
npx tsc --noEmit && npx jest
```

- [ ] **Passo 5: Commit**

```bash
git add app/legal/termos.tsx app/legal/privacidade.tsx
git commit -m "docs(legal): o que a compra avulsa entrega, e quem processa o pagamento"
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

**Consistência de tipos** *(reescrito em 08/10/2026 — o texto original descrevia contratos que as revisões derrubaram).* `decidirCobranca` recebe `EstadoDeCobranca` e devolve `DecisaoDeCobranca` nas Tasks 2 e 6. De `_shared/avulso.ts`, `creditoDisponivel` devolve `BuscaDeCredito` — `{ estado: 'tem'; id: number } | { estado: 'nao_tem' } | { estado: 'erro' }`, e não `number | null`, porque tratar erro de leitura e ausência de crédito como a mesma coisa mandaria quem já comprou comprar de novo; `reivindicarCredito(cliente, compraId, chave)` devolve `boolean` e é chamada **antes** de gerar; `devolverCredito(cliente, compraId)` zera sem condição, e por isso só pode ser chamada onde esta execução reivindicou. `gastarCredito` **não existe**. `Veredito` ganhou `recursoLigado: boolean` obrigatório, consumido pelo portão da Task 6 e presente no literal de `components/SemaforoUso.tsx`. `comprarAvulso` aceita `'mapa' | 'vocacao'`, a mesma lista fechada de `VENDAVEIS` na Task 4, e devolve a URL lida de `checkoutUrl` — o nome que as duas functions de checkout usam.
