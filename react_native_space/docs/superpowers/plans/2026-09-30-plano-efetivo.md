# Plano efetivo por validade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer `perfis.plano_valido_ate` valer — hoje ela é gravada e nunca conferida, então acesso pago sobrevive ao vencimento em silêncio.

**Architecture:** Uma função pura (`acessoDoPlano`) em `supabase/functions/_shared/limites.ts`, onde as decisões testáveis já moram. As quatro Edge Functions de IA passam a lê-la antes de gastar chamada paga; a tela lê a mesma função para desenhar cadeado. Uma regra, dois lados.

**Tech Stack:** TypeScript estrito · Deno (Edge Functions) · React Native / Expo · Jest (`jest-expo`) + `@testing-library/react-native` · Supabase (Postgres + RLS)

**Spec:** `docs/superpowers/specs/2026-09-30-plano-efetivo-design.md`

## Global Constraints

- **Português nos nomes e nos textos.** Identificadores, comentários e mensagens de tela em pt-BR, como todo o projeto.
- **Comentário explica POR QUE, não o que.** Convenção do repositório inteiro.
- **`tsc` NÃO cobre `supabase/functions/`** — elas rodam no Deno, fora do `tsconfig`. A rede delas é `node scripts/conferir-functions.js` (sintaxe) mais os testes do Jest sobre os módulos puros de `_shared/`.
- **Módulo em `_shared/` que carregue lógica tem de ser puro e sem dependência**, para o Jest do app poder testá-lo — é o padrão de `limites.ts`, `escritas.ts`, `regras-acessos.ts` e `agregarUso.ts`.
- **Data ilegível barra o acesso**, nunca libera. Dado estragado não pode virar permissão.
- **Super-admin (`is_super_admin`) passa por cima de tudo**, como já passa por cima da cota.
- **Conferência antes de qualquer PR:** `npx tsc --noEmit`, `npx jest`, `node scripts/conferir-functions.js`. Olhar a linha `Test Suites:`, não só a de testes: suíte que morre no carregamento conta zero falhas.
- **Antes de empurrar:** `git fetch origin && git merge-base --is-ancestor HEAD origin/main` — se sair com 0, o commit já está na main e a branch está fechada.

---

### Task 1: A função `acessoDoPlano`

**Files:**
- Modify: `supabase/functions/_shared/limites.ts` (acrescenta tipo e função; nada existente muda)
- Test: `services/__tests__/limites.test.ts` (já existe; acrescenta um `describe`)

**Interfaces:**
- Consumes: nada.
- Produces: `interface AcessoDoPlano { liberado: boolean; venceuEm: string | null }` e
  `acessoDoPlano(validoAte: string | null | undefined, agora: Date, semLimite: boolean): AcessoDoPlano`.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao fim de `services/__tests__/limites.test.ts`, e `acessoDoPlano` à lista de imports do topo:

```ts
describe('acessoDoPlano', () => {
  const AGORA = new Date('2026-10-15T12:00:00Z');

  it('data no futuro libera', () => {
    expect(acessoDoPlano('2026-10-20T00:00:00Z', AGORA, false))
      .toEqual({ liberado: true, venceuEm: null });
  });

  it('data no passado barra e diz quando venceu', () => {
    expect(acessoDoPlano('2026-10-10T00:00:00Z', AGORA, false))
      .toEqual({ liberado: false, venceuEm: '2026-10-10T00:00:00Z' });
  });

  it('o instante do vencimento é o fim, não um segundo extra', () => {
    expect(acessoDoPlano(AGORA.toISOString(), AGORA, false).liberado).toBe(false);
  });

  it('data ausente NÃO é permissão', () => {
    // Nula, undefined e vazia significam "sem validade" — logo sem acesso.
    for (const valor of [null, undefined, '', '   ']) {
      expect(acessoDoPlano(valor, AGORA, false))
        .toEqual({ liberado: false, venceuEm: null });
    }
  });

  it('data ilegível barra, em vez de liberar', () => {
    // Dado estragado virando acesso é o erro que ninguém descobre.
    expect(acessoDoPlano('ontem', AGORA, false))
      .toEqual({ liberado: false, venceuEm: null });
  });

  it('super-admin passa por cima de tudo', () => {
    for (const valor of [null, 'ontem', '2026-01-01T00:00:00Z']) {
      expect(acessoDoPlano(valor, AGORA, true).liberado).toBe(true);
    }
  });

  it('fuso não muda a decisão', () => {
    // A comparação é entre INSTANTES, não entre dias — então a mesma hora escrita em
    // fusos diferentes tem de decidir igual. A spec pedia um caso de virada; este é
    // ele, e ele mostra por que o problema não existe aqui: quem conta DIA é o
    // contador de uso, não a validade.
    expect(acessoDoPlano('2026-10-15T09:00:00-03:00', AGORA, false).liberado).toBe(false);
    expect(acessoDoPlano('2026-10-15T10:00:00-03:00', AGORA, false).liberado).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest services/__tests__/limites.test.ts`
Expected: FAIL — `acessoDoPlano is not a function` (ou erro de import).

- [ ] **Step 3: Implementar**

Acrescentar a `supabase/functions/_shared/limites.ts`, depois de `ligado`:

```ts
export interface AcessoDoPlano {
  liberado: boolean;
  /** A data que venceu, para a tela dizer quando. Nula quando nunca houve validade. */
  venceuEm: string | null;
}

/**
 * O acesso vale hoje?
 *
 * Existe porque `perfis.plano_valido_ate` era gravada e nunca conferida: quem
 * decidia acesso era `perfis.plano`, sozinho. Se um webhook da Stripe falhasse, a
 * data passava e o acesso continuava — para sempre, sem erro em lugar nenhum.
 *
 * **Data ausente não é permissão.** Nulo significa sem validade, logo sem acesso.
 * Isso acerta de graça o cancelamento: quem cancela fica com plano `gratuito` e
 * data nula, e passa a ficar corretamente sem IA, sem código novo para isso.
 *
 * Não recebe o nome do plano de propósito: acesso depende da data, não do rótulo. O
 * nome continua servindo para achar a linha de `configuracao_ia` — outra pergunta,
 * outro parâmetro.
 */
export function acessoDoPlano(
  validoAte: string | null | undefined,
  agora: Date,
  semLimite: boolean,
): AcessoDoPlano {
  if (semLimite) return { liberado: true, venceuEm: null };

  const bruto = typeof validoAte === 'string' ? validoAte.trim() : '';
  if (!bruto) return { liberado: false, venceuEm: null };

  const quando = new Date(bruto).getTime();
  // Data ilegível barra: `new Date('ontem')` devolve NaN, e NaN em comparação
  // sempre dá falso — o que liberaria por acidente se a checagem fosse ao contrário.
  if (!Number.isFinite(quando)) return { liberado: false, venceuEm: null };

  return quando > agora.getTime()
    ? { liberado: true, venceuEm: null }
    : { liberado: false, venceuEm: bruto };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest services/__tests__/limites.test.ts`
Expected: PASS, todos.

- [ ] **Step 5: Commit**

```bash
git add services/__tests__/limites.test.ts supabase/functions/_shared/limites.ts
git commit -m "feat(limites): a validade do plano passa a ser uma regra"
```

---

### Task 2: `decidirUso` ganha o motivo `vencido`

**Files:**
- Modify: `supabase/functions/_shared/limites.ts` (`Veredito`, assinatura e corpo de `decidirUso`)
- Test: `services/__tests__/limites.test.ts`

**Interfaces:**
- Consumes: `acessoDoPlano`, `AcessoDoPlano` da Task 1.
- Produces: `decidirUso(tipo: TipoUso, config: ConfiguracaoIA | null, usadoHoje: number, semLimite: boolean, acesso: AcessoDoPlano): Veredito`, com `Veredito.motivo` aceitando `'desligado' | 'limite_dia' | 'vencido'` e `Veredito.venceuEm?: string | null`.

**Atenção:** `decidirUso` ganha um **quinto parâmetro obrigatório**. O único chamador interno é `conferirUso` em `_shared/uso.ts`, que muda na Task 4; os testes existentes de `decidirUso` passam a precisar do quinto argumento.

- [ ] **Step 1: Escrever o teste que falha**

```ts
describe('decidirUso com validade', () => {
  const LIBERADO = { liberado: true, venceuEm: null };
  const VENCIDO = { liberado: false, venceuEm: '2026-10-10T00:00:00Z' };
  const CONFIG = {
    imagem_ligada: true, interpretacao_ligada: true,
    pergunta_ligada: true, voz_ligada: true, limite_dia: 3,
  };

  it('vencido barra, com o motivo e a data', () => {
    expect(decidirUso('interpretacao', CONFIG, 0, false, VENCIDO)).toMatchObject({
      permitido: false, motivo: 'vencido', venceuEm: '2026-10-10T00:00:00Z',
    });
  });

  it('vencido vence sobre DESLIGADO', () => {
    // Dizer "não disponível no seu plano" a quem venceu manda a pessoa procurar um
    // plano que ela já tinha.
    const desligado = { ...CONFIG, interpretacao_ligada: false };
    expect(decidirUso('interpretacao', desligado, 0, false, VENCIDO).motivo).toBe('vencido');
  });

  it('vencido vence sobre o limite do dia', () => {
    expect(decidirUso('interpretacao', CONFIG, 99, false, VENCIDO).motivo).toBe('vencido');
  });

  it('super-admin passa por cima de vencido', () => {
    expect(decidirUso('interpretacao', CONFIG, 99, true, VENCIDO).permitido).toBe(true);
  });

  it('liberado se comporta como antes', () => {
    expect(decidirUso('interpretacao', CONFIG, 0, false, LIBERADO).permitido).toBe(true);
    expect(decidirUso('interpretacao', CONFIG, 3, false, LIBERADO).motivo).toBe('limite_dia');
  });
});
```

Acrescentar `LIBERADO` como quinto argumento nas chamadas de `decidirUso` dos testes que já existem no arquivo.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest services/__tests__/limites.test.ts`
Expected: FAIL — `venceuEm` undefined, e `motivo` `'desligado'` onde se espera `'vencido'`.

- [ ] **Step 3: Implementar**

`Veredito` ganha o campo e o motivo:

```ts
export interface Veredito {
  permitido: boolean;
  /** Por que não passou — a tela diz coisas diferentes para cada caso. */
  motivo?: 'desligado' | 'limite_dia' | 'vencido';
  usadoHoje: number;
  /** Nulo quer dizer sem limite: super-admin, ou plano com limite_dia = 0. */
  limiteDia: number | null;
  /** Quando o acesso venceu, para a mensagem dizer a data. */
  venceuEm?: string | null;
}
```

E `decidirUso` ganha o parâmetro e a checagem, **antes** de `ligado`:

```ts
export function decidirUso(
  tipo: TipoUso,
  config: ConfiguracaoIA | null,
  usadoHoje: number,
  semLimite: boolean,
  acesso: AcessoDoPlano,
): Veredito {
  const usado = Number.isFinite(usadoHoje) && usadoHoje > 0 ? Math.floor(usadoHoje) : 0;
  if (semLimite || !config) {
    return { permitido: true, usadoHoje: usado, limiteDia: null };
  }
  // Vencido vem ANTES de desligado: quem venceu e lê "não disponível no seu plano"
  // vai procurar um plano que ela já tinha.
  if (!acesso.liberado) {
    return {
      permitido: false, motivo: 'vencido', usadoHoje: usado,
      limiteDia: null, venceuEm: acesso.venceuEm,
    };
  }
  if (!ligado(tipo, config)) {
    return { permitido: false, motivo: 'desligado', usadoHoje: usado, limiteDia: null };
  }
  const limite = Number.isFinite(config.limite_dia) ? Math.floor(config.limite_dia) : 0;
  if (limite <= 0) {
    return { permitido: true, usadoHoje: usado, limiteDia: null };
  }
  if (usado >= limite) {
    return { permitido: false, motivo: 'limite_dia', usadoHoje: usado, limiteDia: limite };
  }
  return { permitido: true, usadoHoje: usado, limiteDia: limite };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest services/__tests__/limites.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/__tests__/limites.test.ts supabase/functions/_shared/limites.ts
git commit -m "feat(limites): vencido entra na decisao, antes de desligado"
```

---

### Task 3: A mensagem, movida para onde pode ser testada

**Files:**
- Modify: `supabase/functions/_shared/limites.ts` (recebe `NOME` e `mensagemDoLimite`)
- Modify: `supabase/functions/_shared/uso.ts` (remove as duas, re-exporta)
- Test: `services/__tests__/limites.test.ts`

**Interfaces:**
- Consumes: `Veredito` da Task 2.
- Produces: `mensagemDoLimite(veredito: Veredito, tipo: TipoUso): string`, agora exportada de `_shared/limites.ts` e re-exportada por `_shared/uso.ts`.

**Por que mover:** `mensagemDoLimite` é decisão pura sobre um veredito, e vive em `uso.ts`, que toca banco. Em `limites.ts` ela fica testável pelo Jest sem mock nenhum, junto do que descreve.

- [ ] **Step 1: Escrever o teste que falha**

```ts
describe('mensagemDoLimite', () => {
  const base = { permitido: false, usadoHoje: 0, limiteDia: null };

  it('vencido com data escreve a data', () => {
    const texto = mensagemDoLimite(
      { ...base, motivo: 'vencido' as const, venceuEm: '2026-10-10T00:00:00Z' },
      'interpretacao',
    );
    expect(texto).toContain('10/10');
    expect(texto).toContain('plano');
  });

  it('vencido SEM data não escreve "null"', () => {
    // Acontece com quem cancelou: plano gratuito e validade nula.
    const texto = mensagemDoLimite(
      { ...base, motivo: 'vencido' as const, venceuEm: null }, 'voz',
    );
    expect(texto).not.toContain('null');
    expect(texto).not.toContain('NaN');
    expect(texto.length).toBeGreaterThan(10);
  });

  it('data ilegível não vira "Invalid Date" na tela', () => {
    const texto = mensagemDoLimite(
      { ...base, motivo: 'vencido' as const, venceuEm: 'ontem' }, 'voz',
    );
    expect(texto).not.toContain('Invalid');
  });

  it('desligado e limite continuam como eram', () => {
    expect(mensagemDoLimite({ ...base, motivo: 'desligado' as const }, 'imagem'))
      .toContain('não está disponível');
    expect(mensagemDoLimite({ ...base, motivo: 'limite_dia' as const }, 'pergunta'))
      .toContain('limite de hoje');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest services/__tests__/limites.test.ts`
Expected: FAIL — `mensagemDoLimite is not a function` no import de `limites`.

- [ ] **Step 3: Mover e implementar**

Cortar de `_shared/uso.ts` o `const NOME` e a função `mensagemDoLimite`; colar em `_shared/limites.ts` com o caso novo:

```ts
const NOME: Record<TipoUso, string> = {
  imagem: 'A leitura por imagem',
  interpretacao: 'O aprofundamento com IA',
  pergunta: 'As perguntas',
  voz: 'A leitura falada',
};

/** 'YYYY-MM-DD...' → '10/10'. Vazio quando a data não serve. */
function diaEMes(iso: string | null | undefined): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return partes ? `${partes[3]}/${partes[2]}` : '';
}

export function mensagemDoLimite(veredito: Veredito, tipo: TipoUso): string {
  if (veredito.motivo === 'vencido') {
    const quando = diaEMes(veredito.venceuEm);
    // Sem data legível, a frase omite o quando em vez de escrever "null" ou
    // "Invalid Date" na tela de alguém.
    return quando
      ? `Seu acesso terminou em ${quando}. Atualize seu plano para continuar.`
      : 'Seu acesso terminou. Atualize seu plano para continuar.';
  }
  if (veredito.motivo === 'desligado') {
    return `${NOME[tipo]} não está disponível no seu plano.`;
  }
  return 'Você já usou o limite de hoje. Amanhã tem mais.';
}
```

Em `_shared/uso.ts`, no lugar delas:

```ts
// `mensagemDoLimite` mudou para `limites.ts`: ela é decisão pura sobre um veredito,
// e aqui ficava num módulo que toca banco, fora do alcance do Jest. A
// re-exportação evita mexer nos quatro importadores só por causa do caminho.
export { mensagemDoLimite } from './limites.ts';
```

- [ ] **Step 4: Rodar tudo**

Run: `npx jest services/__tests__/limites.test.ts && node scripts/conferir-functions.js`
Expected: PASS e `sintaxe ok`.

- [ ] **Step 5: Commit**

```bash
git add services/__tests__/limites.test.ts supabase/functions/_shared/limites.ts supabase/functions/_shared/uso.ts
git commit -m "feat(limites): a mensagem de vencido, onde ela pode ser testada"
```

---

### Task 4: As quatro Edge Functions respeitam a validade

**Files:**
- Modify: `supabase/functions/_shared/uso.ts` (`conferirUso` recebe e repassa a validade)
- Modify: `supabase/functions/ia-interpretacao/index.ts:356`
- Modify: `supabase/functions/ia-oraculo/index.ts:211`
- Modify: `supabase/functions/ia-pergunta/index.ts:162`
- Modify: `supabase/functions/ia-voz/index.ts:219`
- Test: coberto pelas Tasks 1–3; aqui a rede é `conferir-functions` mais a suíte inteira.

**Interfaces:**
- Consumes: `acessoDoPlano` e `decidirUso` das Tasks 1 e 2.
- Produces: `conferirUso(cliente, usuarioId, plano, semLimite, tipo, validoAte)` — ganha `validoAte: string | null | undefined` como sexto parâmetro.

- [ ] **Step 1: `conferirUso` passa a calcular o acesso**

Em `_shared/uso.ts`, acrescentar `acessoDoPlano` ao import de `'./limites.ts'`, trocar a assinatura e a última linha:

```ts
export async function conferirUso(
  cliente: Cliente,
  usuarioId: string,
  plano: string,
  semLimite: boolean,
  tipo: TipoUso,
  validoAte: string | null | undefined,
): Promise<Veredito> {
  // ... o corpo atual, sem nenhuma mudança, até a última linha:
  return decidirUso(
    tipo, config, usado, semLimite,
    acessoDoPlano(validoAte, new Date(), semLimite),
  );
}
```

- [ ] **Step 2: Cada function lê a coluna e repassa**

Acrescentar `plano_valido_ate` ao `select` de `perfis`:

| arquivo | `select` atual | vira |
|---|---|---|
| `ia-interpretacao/index.ts:356` | `'consultas_restantes, is_super_admin, plano'` | `'consultas_restantes, is_super_admin, plano, plano_valido_ate'` |
| `ia-oraculo/index.ts:211` | `'consultas_restantes, is_super_admin, plano'` | `'consultas_restantes, is_super_admin, plano, plano_valido_ate'` |
| `ia-pergunta/index.ts:162` | `'plano, is_super_admin, consentimento_perguntas'` | `'plano, is_super_admin, consentimento_perguntas, plano_valido_ate'` |
| `ia-voz/index.ts:219` | `'is_super_admin, plano'` | `'is_super_admin, plano, plano_valido_ate'` |

E na chamada de `conferirUso` de cada uma, acrescentar o sexto argumento — trocando o literal do tipo por `'interpretacao'`, `'imagem'`, `'pergunta'` ou `'voz'`, conforme a function:

```ts
const veredito = await conferirUso(
  supabaseAdmin, usuarioId, plano, semLimite, 'interpretacao',
  perfil?.plano_valido_ate as string | null,
);
```

- [ ] **Step 3: Conferir sintaxe, tipos e suíte**

Run: `node scripts/conferir-functions.js && npx tsc --noEmit && npx jest`
Expected: `22 arquivos, sintaxe ok`; `No errors found`; suíte verde com zero suítes falhando.

- [ ] **Step 4: Confirmar que o cache do mapa continua antes da checagem**

Ler `supabase/functions/ia-interpretacao/index.ts` na altura do `if (oraculo === 'mapa')` e confirmar que ele segue **acima** da leitura de `perfis`. Leitura já escrita não custa nada e não deve ser barrada por validade — a pessoa está relendo o que já era dela.

Nenhuma alteração esperada neste passo: ele existe para o implementador não mover o cache por engano.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/uso.ts supabase/functions/ia-interpretacao/index.ts supabase/functions/ia-oraculo/index.ts supabase/functions/ia-pergunta/index.ts supabase/functions/ia-voz/index.ts
git commit -m "feat(ia): as quatro functions param quando o acesso vence"
```

---

### Task 5: O cadeado onde a IA é oferecida

**Files:**
- Modify: `components/SemaforoUso.tsx`
- Test: `components/__tests__/SemaforoUso.test.tsx` (criar)

**Interfaces:**
- Consumes: `acessoDoPlano` da Task 1, `mensagemDoLimite` da Task 3.
- Produces: nada novo — `SemaforoUso` mantém as props `{ tipo, rotulo }`.

**Por que aqui:** `SemaforoUso` já é usado nos **cinco** lugares onde a IA é oferecida — `app/consulta/resultado.tsx`, `app/consulta/buzios-resultado.tsx`, `app/ia/captura.tsx`, `app/mapa-astral/resultado.tsx` e `components/CaixaDePergunta.tsx`. Um arquivo cobre os cinco.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';

const mockPerfil = {
  plano: 'gratuito', is_super_admin: false, plano_valido_ate: null as string | null,
};
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ perfil: mockPerfil, sessao: { user: { id: 'u1' } } }),
}));
jest.mock('../../services/usoIA', () => ({ lerUsoDoDia: async () => null }));

import { SemaforoUso } from '../SemaforoUso';

describe('SemaforoUso quando o acesso venceu', () => {
  it('mostra o cadeado e a data', async () => {
    mockPerfil.plano_valido_ate = '2026-10-10T00:00:00Z';
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(await screen.findByLabelText('Acesso vencido')).toBeTruthy();
    expect(screen.getByText(/10\/10/)).toBeTruthy();
  });

  it('validade nula também é vencido, sem escrever "null"', () => {
    mockPerfil.plano_valido_ate = null;
    render(<SemaforoUso tipo="voz" rotulo="Leituras faladas" />);
    expect(screen.getByLabelText('Acesso vencido')).toBeTruthy();
    expect(screen.queryByText(/null/)).toBeNull();
  });

  it('com validade no futuro não mostra cadeado', () => {
    mockPerfil.plano_valido_ate = '2099-01-01T00:00:00Z';
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
  });

  it('super-admin nunca vê cadeado', () => {
    mockPerfil.plano_valido_ate = null;
    mockPerfil.is_super_admin = true;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
    mockPerfil.is_super_admin = false;
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest components/__tests__/SemaforoUso.test.tsx`
Expected: FAIL — `Unable to find an element with accessibility label: Acesso vencido`.

- [ ] **Step 3: Implementar**

Em `components/SemaforoUso.tsx`, acrescentar aos imports:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { acessoDoPlano, mensagemDoLimite } from '../supabase/functions/_shared/limites';
```

Depois de `const semLimite = ...`, antes do `useEffect`:

```tsx
  // A mesma regra do servidor decide o cadeado. Se a tela decidisse por conta
  // própria existiriam duas verdades, e a que desse acesso indevido seria a que
  // ninguém notaria.
  const acesso = acessoDoPlano(perfil?.plano_valido_ate, new Date(), semLimite);
```

E no início do `return`, antes de qualquer outra coisa:

```tsx
  if (!acesso.liberado) {
    return (
      <View style={estilos.trancado} accessibilityLabel="Acesso vencido">
        <Ionicons name="lock-closed" size={16} color={Cores.textoSecundario} />
        <Text style={estilos.trancadoTexto}>
          {mensagemDoLimite({
            permitido: false, motivo: 'vencido', usadoHoje: 0,
            limiteDia: null, venceuEm: acesso.venceuEm,
          }, tipo)}
        </Text>
      </View>
    );
  }
```

Estilos a acrescentar:

```tsx
  trancado: {
    flexDirection: 'row', alignItems: 'center', gap: Espacamento.xs,
    paddingVertical: Espacamento.xs,
  },
  trancadoTexto: {
    flex: 1, fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario,
  },
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest components/__tests__/SemaforoUso.test.tsx && npx tsc --noEmit`
Expected: PASS e `No errors found`.

- [ ] **Step 5: Commit**

```bash
git add components/SemaforoUso.tsx components/__tests__/SemaforoUso.test.tsx
git commit -m "feat(tela): cadeado onde a IA e oferecida, com a data do vencimento"
```

---

### Task 6: O cadeado no card "Leitura por imagem"

**Files:**
- Modify: `app/prototipo-conselho.tsx` (o array `oraculos`, linhas 29–36, e o desenho do card)
- Test: `__tests__/app/home-cadeado.test.tsx` (criar)

**Interfaces:**
- Consumes: `acessoDoPlano` da Task 1.
- Produces: nada.

**Por que só este card:** dos seis, é o único inteiramente IA. Búzios, Tarot e Mapa Astral têm conteúdo local grátis e o cadeado deles mora no botão (Task 5). Numerologia e Lei da Atração não custam nada.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';

const mockPerfil = {
  plano: 'gratuito', is_super_admin: false, plano_valido_ate: null as string | null,
};
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ perfil: mockPerfil, sessao: { user: { id: 'u1' } }, carregando: false }),
}));

import { HomeAurora } from '../../app/prototipo-conselho';

describe('cadeado na home', () => {
  it('Leitura por imagem tranca quando o acesso venceu', () => {
    mockPerfil.plano_valido_ate = '2026-10-10T00:00:00Z';
    render(<HomeAurora />);
    expect(screen.getByLabelText('Leitura por imagem, trancada')).toBeTruthy();
  });

  it('os outros cinco NUNCA trancam', () => {
    // A regressão mais provável desta entrega é o cadeado no card errado.
    // Numerologia e Lei da Atração não custam nada; Búzios, Tarot e Mapa Astral têm
    // conteúdo local grátis, e o cadeado deles mora no botão (Task 5).
    mockPerfil.plano_valido_ate = '2026-10-10T00:00:00Z';
    render(<HomeAurora />);
    for (const titulo of ['Búzios', 'Tarot', 'Numerologia', 'Mapa Astral', 'Lei da Atração']) {
      expect(screen.queryByLabelText(`${titulo}, trancada`)).toBeNull();
      expect(screen.getByLabelText(titulo)).toBeTruthy();
    }
  });

  it('com acesso válido, nenhum card tranca', () => {
    mockPerfil.plano_valido_ate = '2099-01-01T00:00:00Z';
    render(<HomeAurora />);
    expect(screen.queryByLabelText(/trancada/)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest __tests__/app/home-cadeado.test.tsx`
Expected: FAIL — label não encontrada.

- [ ] **Step 3: Implementar**

No array `oraculos`, acrescentar um sétimo campo dizendo se o card é inteiramente IA:

```tsx
const oraculos = [
  ['Búzios', 'Tradição e caminhos', 'grain', P.verde, 'material', '/consulta/buzios-preparo', false],
  ['Tarot', 'Símbolos para refletir', 'cards-outline', P.terracota, 'material', '/consulta', false],
  ['Numerologia', 'Ciclos e significados', 'calculator-outline', P.azul, 'ion', '/numerologia', false],
  ['Mapa Astral', 'Leitura do seu céu', 'planet-outline', P.dourado, 'ion', '/mapa-astral', false],
  // O único card inteiramente IA: aqui não existe versão livre, então o cadeado é do
  // card. Nos outros, o conteúdo local é grátis e o cadeado mora no botão.
  ['Leitura por imagem', 'Símbolos em uma foto', 'image-search-outline', P.verdeEscuro, 'material', '/ia', true],
  ['Lei da Atração', 'Desejos e rituais', 'magnet', P.terracota, 'material', '/lei-atracao', false],
] as const;
```

No componente, acrescentar aos imports `useAuth` de `'../contexts/AuthContext'` e
`acessoDoPlano` de `'../supabase/functions/_shared/limites'`, e calcular o acesso uma vez,
junto dos outros hooks:

```tsx
const { perfil } = useAuth();
const acesso = acessoDoPlano(
  perfil?.plano_valido_ate, new Date(), perfil?.is_super_admin === true,
);
```

E trocar o `map` dos cards (linhas 98–105) por este, que é o atual mais o cadeado:

```tsx
              {oraculos.map(([titulo, apoio, icon, cor, lib, rota, soIA]) => {
                const Icon = lib === 'material' ? MaterialCommunityIcons : Ionicons;
                // Só o card inteiramente IA tranca. Nos outros o conteúdo local é
                // grátis, e trancar esconderia o que faz a pessoa voltar.
                const trancado = soIA && !acesso.liberado;
                return <Pressable key={titulo}
                  onPress={() => router.push(trancado ? '/planos' : rota)}
                  accessibilityRole="button"
                  accessibilityLabel={trancado ? `${titulo}, trancada` : titulo}
                  style={({ pressed }) => [s.card, { width: largo ? '48.7%' : '48%' }, trancado && s.cardTrancado, pressed && s.pressed]}>
                  <View style={[s.cardIcone, { backgroundColor: `${cor}18` }]}>
                    {trancado
                      ? <Ionicons name="lock-closed" size={25} color={cor} />
                      : <Icon name={icon as never} size={27} color={cor} />}
                  </View>
                  <Text style={s.cardTitulo}>{titulo}</Text>
                  <Text style={s.cardApoio}>{trancado ? 'Atualize seu plano' : apoio}</Text>
                  <Ionicons name={trancado ? 'lock-closed-outline' : 'arrow-forward-circle-outline'} size={21} color={cor} style={s.cardSeta} />
                </Pressable>;
              })}
```

E acrescentar o estilo, junto de `s.card`:

```tsx
  // Opacidade e não cinza: o card trancado continua legível e reconhecível, para a
  // pessoa saber o que está perdendo em vez de ver um bloco apagado.
  cardTrancado: { opacity: 0.55 },
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest __tests__/app/home-cadeado.test.tsx && npx tsc --noEmit && npx jest`
Expected: PASS em tudo, suíte inteira verde.

- [ ] **Step 5: Commit**

```bash
git add app/prototipo-conselho.tsx __tests__/app/home-cadeado.test.tsx
git commit -m "feat(home): cadeado no card que e inteiramente IA"
```

---

### Task 7: Migração e publicação

**Files:**
- Create: `supabase/validade-dos-planos.sql`

**Interfaces:**
- Consumes: nada.
- Produces: nada — passo operacional.

- [ ] **Step 1: Escrever o SQL**

Criar `supabase/validade-dos-planos.sql`:

```sql
-- ============================================================
-- Arcanus — a validade dos planos passa a valer
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
-- ============================================================
--
-- A partir desta entrega, `plano_valido_ate` nula significa SEM ACESSO a IA.
-- Antes ela era gravada e nunca conferida, entao havia cinco contas com nulo —
-- todas no gratuito, nenhuma pagante. Sem este update, as cinco perderiam acesso no
-- instante do deploy.
--
-- Dez dias espelham o teste que o item 2 do conselho vai implantar.
update public.perfis
   set plano_valido_ate = now() + interval '10 days'
 where plano_valido_ate is null
returning id, plano, plano_valido_ate;

-- Conferencia: nenhuma linha deve sobrar com nulo.
--   select count(*) as sem_validade from public.perfis where plano_valido_ate is null;
--   -- esperado: 0
```

- [ ] **Step 2: Commit**

```bash
git add supabase/validade-dos-planos.sql
git commit -m "chore(sql): validade para as contas que existiam antes da regra"
```

- [ ] **Step 3: Conferência final antes do PR**

Run: `npx tsc --noEmit && npx jest && node scripts/conferir-functions.js`
Expected: `No errors found`; suíte verde com **zero** suítes falhando (olhar a linha `Test Suites:`); `22 arquivos, sintaxe ok`.

- [ ] **Step 4: Conferir que a branch está aberta, e abrir o PR**

```bash
git fetch origin && git merge-base --is-ancestor HEAD origin/main && echo "ORFAO: nao empurre" || echo "OK: branch aberta"
```

Empurrar só com "OK". O corpo do PR vai por `--body-file`: here-string no PowerShell quebra com aspas duplas.

- [ ] **Step 5: A ordem de publicação, entregue ao dono**

Na mensagem de entrega, nesta ordem, cada passo com o rótulo de onde roda:

1. **[SQL]** o `update` do Step 1, **colado na mensagem** — nunca como nome de arquivo.
2. **[PowerShell]** deploy das quatro functions, cada comando com `cd` incluído e `--project-ref rfdjukdbrtvvulaxbzwb`.
3. **[App]** conferir que o cadeado aparece numa conta com validade no passado.

**A ordem importa:** deploy antes do `update` deixaria as cinco contas sem acesso por alguns minutos. E o CLI publica o que está **no disco** — conferir a branch e rodar `git pull` antes de deployar.

---

## Fora deste plano

- **Dar validade a quem se cadastra** — item 2 do conselho.
- **A contagem "faltam 3 dias"** e o botão "garantir minha assinatura" — item 2.
- **Limite por tipo e teto mensal** — item 3.
- **Desabilitar os botões de IA** nas cinco telas. O servidor já barra, e o cadeado da Task 5 aparece ao lado; desabilitar cada botão são cinco arquivos por um ganho pequeno. Fica registrado como acabamento, não como lacuna.
