# Estrutura do tarô — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao código a forma que o modelo do livro pede — carta em camadas, tiragem com geometria e ordem de leitura, e payload de IA com material — sem escrever uma linha de conteúdo novo.

**Architecture:** Todos os campos novos entram **opcionais**, e nenhum texto é escrito. A estrutura sobe primeiro e vazia; o conteúdo chega carta a carta nas Fases 2 e 3, sem migração. O `CruzCelta.tsx`, desenhado à mão, dá lugar a um tabuleiro genérico guiado por coordenada — tiragem passa a ser dado, não código.

**Tech Stack:** TypeScript estrito, React Native / Expo SDK 54, Jest (`jest-expo`) + `@testing-library/react-native`. A Edge Function é Deno e fica fora do `tsc` do app — ela é verificada por testes que leem o texto-fonte (`__tests__/validade-nas-functions.test.ts`) e por `node scripts/conferir-functions.js`.

**Spec:** `docs/superpowers/specs/2026-10-02-taro-estrutura-do-livro-design.md`
**Notas de leitura das fontes:** `docs/referencias/2026-10-02-fontes-de-taro.md`

## Global Constraints

- **Zero conteúdo novo.** Nenhum significado, palavra-chave ou frase de carta é escrito neste plano. Campos ficam vazios ou ausentes.
- **Nada quebra.** `significado` e `conselho` continuam existindo e sendo usados. `icone` e `cor` continuam — `app/consulta/resultado.tsx:215,229` ainda usa `carta.cor`.
- **As quatro posições-chave são, exatamente:** `'agora' | 'passado' | 'futuro' | 'obstaculo'`.
- **Invertida e obstáculo são o mesmo texto.** Quem lê a nota de obstáculo cai no texto de invertida quando não houver nota própria.
- **Toda leitura devolve pergunta, nunca veredito** (`docs/COMPLIANCE-SCOPE.md`).
- Comentários e identificadores em português, como o resto do repo.
- Rodar sempre os três portões: `npx jest`, `npx tsc --noEmit`, `node scripts/conferir-functions.js`.

## Fora deste plano, de propósito

- **Mais de uma carta por posição.** Declarar `quantidade` sem nada que a honre é campo que apodrece. Entra quando a distribuição múltipla for construída.
- **Dois montes (Maior + Menor por casa)** e **leitura por proporção aplicada**: dependem dos 56 Menores existirem (Fase 3). A *conta* da proporção entra aqui (Task 6), inerte até lá.
- **Tiragens em sequência** e **tiragens temáticas novas**: escopo próprio, depois das fases.

## Mapa dos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `data/tarot.ts` | **Modificar.** `CartaTarot` ganha camadas opcionais e o tipo `PosicaoChave`; ganha `notaDaPosicao()`. |
| `data/tiragens.ts` | **Modificar.** `PosicaoDaTiragem` ganha `chave` e `lugar`; `Tiragem` ganha `ordemDeLeitura`; ganha `ordemDasPosicoes()`. |
| `components/taro/Tabuleiro.tsx` | **Criar.** Desenha qualquer tiragem a partir de `lugar`. |
| `components/taro/CruzCelta.tsx` | **Apagar.** Vira caso de dado. |
| `app/consulta/cartas.tsx` | **Modificar.** Usa o tabuleiro; ganha o passo de embaralhar. |
| `services/ia.ts` | **Modificar.** `CartaParaLeitura` carrega material. |
| `app/consulta/resultado.tsx` | **Modificar.** Preenche o material no envio. |
| `supabase/functions/ia-interpretacao/index.ts` | **Modificar.** Escreve o material no `<dados>`; prompt fecha em pergunta. |

---

### Task 1: As camadas da carta

**Files:**
- Modify: `data/tarot.ts` (interface `CartaTarot`, linhas 4-12)
- Test: `data/__tests__/tarot.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `type PosicaoChave = 'agora' | 'passado' | 'futuro' | 'obstaculo'`; `CartaTarot` com `palavrasChave?: string[]`, `frasesChave?: string[]`, `porPosicao?: Partial<Record<PosicaoChave, string>>`, `invertida?: string`, `naipe?`, `elemento?`, `ehCorte?`; `notaDaPosicao(carta: CartaTarot, chave?: PosicaoChave): string | undefined`.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `data/__tests__/tarot.test.ts`:

```ts
import { ARCANOS_MAIORES, notaDaPosicao, type CartaTarot } from '../tarot';

const TORRE = ARCANOS_MAIORES[16];

describe('notaDaPosicao', () => {
  it('sem posição-chave, não há nota', () => {
    expect(notaDaPosicao(TORRE, undefined)).toBeUndefined();
  });

  it('a nota de obstáculo cai no texto de invertida quando não houver própria', () => {
    // As fontes tratam "revertido" e "posição de obstáculo" como a mesma leitura.
    // Escrever os dois seria escrever duas vezes a mesma coisa, e elas divergiriam.
    const carta: CartaTarot = { ...TORRE, invertida: 'A mesma força, travada.' };
    expect(notaDaPosicao(carta, 'obstaculo')).toBe('A mesma força, travada.');
  });

  it('a nota própria tem precedência sobre a de invertida', () => {
    const carta: CartaTarot = {
      ...TORRE,
      invertida: 'travada',
      porPosicao: { obstaculo: 'o que trava aqui é outra coisa' },
    };
    expect(notaDaPosicao(carta, 'obstaculo')).toBe('o que trava aqui é outra coisa');
  });

  it('as outras posições não herdam nada de invertida', () => {
    // O defeito que isto pega: fazer `invertida` valer para qualquer posição. A leitura
    // de futuro sairia com o tom de obstáculo, e ninguém veria o erro no texto.
    const carta: CartaTarot = { ...TORRE, invertida: 'travada' };
    for (const chave of ['agora', 'passado', 'futuro'] as const) {
      expect(notaDaPosicao(carta, chave)).toBeUndefined();
    }
  });

  it('sem conteúdo nenhum, devolve indefinido e não quebra', () => {
    // Estado de hoje: a estrutura sobe vazia e o conteúdo chega depois.
    for (const carta of ARCANOS_MAIORES) {
      for (const chave of ['agora', 'passado', 'futuro', 'obstaculo'] as const) {
        expect(() => notaDaPosicao(carta, chave)).not.toThrow();
      }
    }
  });
});

describe('camadas da carta', () => {
  it('nenhuma carta declara posição-chave fora das quatro', () => {
    // Uma chave escrita errada ('obstáculo' com acento) viraria nota que nunca é lida.
    const validas = new Set(['agora', 'passado', 'futuro', 'obstaculo']);
    for (const carta of ARCANOS_MAIORES) {
      for (const chave of Object.keys(carta.porPosicao ?? {})) {
        expect(validas.has(chave)).toBe(true);
      }
    }
  });

  it('os 22 Maiores não têm naipe', () => {
    for (const carta of ARCANOS_MAIORES) expect(carta.naipe).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest data/__tests__/tarot.test.ts`
Expected: FAIL — `notaDaPosicao` não é exportada.

- [ ] **Step 3: Escrever as camadas**

Em `data/tarot.ts`, substituir a interface e acrescentar a função:

```ts
/** As quatro posições em que a carta lê diferente, segundo as fontes. */
export type PosicaoChave = 'agora' | 'passado' | 'futuro' | 'obstaculo';

export interface CartaTarot {
  id: number;
  nome: string;
  nomeCompleto: string;
  /** A interpretação em prosa. É o que a carta diz quando aparece. */
  significado: string;
  conselho: string;
  icone: string; // Ionicons
  cor: string;

  // ─── Camadas do verbete. Opcionais: a estrutura sobe antes do conteúdo. ───

  /** 3 a 5 palavras. Âncora curta — é o que impede a IA de divagar. */
  palavrasChave?: string[];
  /** 6 a 8 frases curtíssimas. O "sentimento" da carta. */
  frasesChave?: string[];
  /**
   * Nota curta só nas posições em que a carta lê diferente.
   * Parcial de propósito: o livro escreve uma ou duas, não quatro.
   */
  porPosicao?: Partial<Record<PosicaoChave, string>>;
  /** A carta de cabeça para baixo. Serve também à posição `obstaculo`. */
  invertida?: string;

  // ─── Só nos Menores, que chegam na Fase 3. ───
  naipe?: 'espadas' | 'paus' | 'copas' | 'ouros';
  elemento?: 'ar' | 'fogo' | 'agua' | 'terra';
  /** Valete, Cavaleiro, Rainha e Rei: representam gente, não tema. */
  ehCorte?: boolean;
}

/**
 * A nota desta carta para esta posição, se houver.
 *
 * `obstaculo` cai em `invertida` quando não houver nota própria: as fontes tratam
 * "revertido" e "posição de obstáculo" como a mesma leitura, e escrever os dois seria
 * escrever duas vezes a mesma coisa — que depois divergem.
 */
export function notaDaPosicao(
  carta: CartaTarot,
  chave?: PosicaoChave,
): string | undefined {
  if (!chave) return undefined;
  const propria = carta.porPosicao?.[chave];
  if (propria) return propria;
  return chave === 'obstaculo' ? carta.invertida : undefined;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest data/__tests__/tarot.test.ts && npx tsc --noEmit`
Expected: PASS, `tsc` exit 0.

- [ ] **Step 5: Commit**

```bash
git add data/tarot.ts data/__tests__/tarot.test.ts
git commit -m "feat(taro): a carta ganha as camadas do verbete, ainda vazias"
```

---

### Task 2: Geometria e posição-chave na tiragem

**Files:**
- Modify: `data/tiragens.ts`
- Test: `data/__tests__/tiragens.test.ts`

**Interfaces:**
- Consumes: `PosicaoChave` de `data/tarot.ts` (Task 1).
- Produces: `PosicaoDaTiragem` com `chave?: PosicaoChave`, `lugar: { coluna: number; linha: number }`, `deitada?: boolean`; `Tiragem` com `ordemDeLeitura?: (agora: Date) => number[]`.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `data/__tests__/tiragens.test.ts`:

```ts
describe('geometria das tiragens', () => {
  it('toda posição diz onde fica', () => {
    for (const tiragem of TIRAGENS) {
      for (const posicao of tiragem.posicoes) {
        expect(Number.isFinite(posicao.lugar.coluna)).toBe(true);
        expect(Number.isFinite(posicao.lugar.linha)).toBe(true);
      }
    }
  });

  it('duas posições nunca ocupam o mesmo lugar', () => {
    // O defeito que isto pega: duas cartas desenhadas uma sobre a outra, impossíveis
    // de escolher separadamente. Aconteceu com "O que atravessa" e "O que vem".
    for (const tiragem of TIRAGENS) {
      const lugares = tiragem.posicoes.map((p) => `${p.lugar.coluna},${p.lugar.linha}`);
      expect(new Set(lugares).size).toBe(lugares.length);
    }
  });

  it('as três cartas ficam numa linha só', () => {
    const tres = TIRAGENS.find((t) => t.id === 'tres-cartas');
    const linhas = new Set(tres?.posicoes.map((p) => p.lugar.linha));
    expect(linhas.size).toBe(1);
  });

  it('a Cruz Celta tem a cruz à esquerda e o bastão numa coluna à direita', () => {
    const cruz = TIRAGENS.find((t) => t.id === 'cruz-celta');
    const posicoes = cruz?.posicoes ?? [];
    const colunaDoBastao = Math.max(...posicoes.map((p) => p.lugar.coluna));
    const bastao = posicoes.filter((p) => p.lugar.coluna === colunaDoBastao);
    expect(bastao).toHaveLength(4);
    // A carta que atravessa fica ao lado da situação, na mesma linha.
    const situacao = posicoes[0];
    const atravessa = posicoes[1];
    expect(atravessa.lugar.linha).toBe(situacao.lugar.linha);
    expect(atravessa.deitada).toBe(true);
  });

  it('as posições-chave declaradas são das quatro válidas', () => {
    const validas = new Set(['agora', 'passado', 'futuro', 'obstaculo']);
    for (const tiragem of TIRAGENS) {
      for (const posicao of tiragem.posicoes) {
        if (posicao.chave) expect(validas.has(posicao.chave)).toBe(true);
      }
    }
  });

  it('a posição que atravessa é um obstáculo, e o passado é passado', () => {
    // É a chave que liga a posição à nota da carta. Sem ela, a nota nunca é usada.
    const cruz = TIRAGENS.find((t) => t.id === 'cruz-celta');
    expect(cruz?.posicoes[1].chave).toBe('obstaculo');
    const tres = TIRAGENS.find((t) => t.id === 'tres-cartas');
    expect(tres?.posicoes.map((p) => p.chave)).toEqual(['passado', 'agora', 'futuro']);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest data/__tests__/tiragens.test.ts`
Expected: FAIL — `lugar` não existe em `PosicaoDaTiragem`.

- [ ] **Step 3: Escrever a geometria**

Em `data/tiragens.ts`, substituir os tipos:

```ts
import type { PosicaoChave } from './tarot';

export interface PosicaoDaTiragem {
  nome: string;
  /** O que esta posição pergunta. Lida antes da carta, ela explica a tiragem sozinha. */
  regra: string;
  /**
   * Qual das quatro posições-chave esta posição é, quando é alguma.
   * É por ela que a nota da carta para aquela posição é encontrada.
   */
  chave?: PosicaoChave;
  /**
   * Onde a posição fica na mesa, em coordenada de grade.
   *
   * Geometria é dado, não layout: com `lugar`, um componente desenha linha, cruz,
   * círculo ou pirâmide, e acrescentar tiragem passa a ser acrescentar uma entrada.
   */
  lugar: { coluna: number; linha: number };
  /** Girada um quarto de volta, como a carta que atravessa na Cruz Celta. */
  deitada?: boolean;
}

export interface Tiragem {
  id: 'tres-cartas' | 'cruz-celta';
  nome: string;
  /** Uma frase sobre quando esta tiragem serve. */
  quando: string;
  posicoes: PosicaoDaTiragem[];
  /**
   * A ordem em que as posições são LIDAS, quando difere da ordem em que são postas.
   * Existe porque há tiragens assim: "O ano à frente" começa pela carta do mês corrente.
   * Devolve índices de `posicoes`.
   */
  ordemDeLeitura?: (agora: Date) => number[];
}
```

Nas três cartas — mesma linha, colunas em sequência:

```ts
    { nome: 'Passado', regra: 'o que já se consumou e ainda pesa',
      chave: 'passado', lugar: { coluna: 0, linha: 0 } },
    { nome: 'Presente', regra: 'o que está em jogo agora',
      chave: 'agora', lugar: { coluna: 1, linha: 0 } },
    { nome: 'Futuro', regra: 'o que tende a se formar se nada mudar',
      chave: 'futuro', lugar: { coluna: 2, linha: 0 } },
```

Na Cruz Celta — a cruz nas colunas 0 a 3, o bastão na coluna 4:

```ts
    { nome: 'A situação', regra: 'o assunto como ele está',
      chave: 'agora', lugar: { coluna: 1, linha: 1 } },
    { nome: 'O que atravessa', regra: 'o que ajuda ou atrapalha, de lado',
      chave: 'obstaculo', lugar: { coluna: 2, linha: 1 }, deitada: true },
    { nome: 'A raiz', regra: 'o que sustenta isso por baixo, muitas vezes antigo',
      lugar: { coluna: 1, linha: 2 } },
    { nome: 'O que passou', regra: 'o que já saiu de cena e ainda ecoa',
      chave: 'passado', lugar: { coluna: 0, linha: 1 } },
    { nome: 'O que se busca', regra: 'o que você quer que aconteça, dito ou não',
      lugar: { coluna: 1, linha: 0 } },
    { nome: 'O que vem', regra: 'o próximo movimento, não o desfecho',
      chave: 'futuro', lugar: { coluna: 3, linha: 1 } },
    { nome: 'Você nisso', regra: 'como você está se portando dentro do assunto',
      lugar: { coluna: 4, linha: 3 } },
    { nome: 'Os outros', regra: 'o ambiente e as pessoas ao redor',
      lugar: { coluna: 4, linha: 2 } },
    { nome: 'Esperança e medo', regra: 'a mesma coisa vista pelos dois lados',
      lugar: { coluna: 4, linha: 1 } },
    { nome: 'Para onde caminha', regra: 'o desfecho provável se o caminho seguir assim',
      lugar: { coluna: 4, linha: 0 } },
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest data/__tests__/tiragens.test.ts && npx tsc --noEmit`
Expected: PASS, `tsc` exit 0.

- [ ] **Step 5: Commit**

```bash
git add data/tiragens.ts data/__tests__/tiragens.test.ts
git commit -m "feat(taro): a tiragem passa a dizer onde cada posicao fica"
```

---

### Task 3: A ordem de leitura

**Files:**
- Modify: `data/tiragens.ts`
- Test: `data/__tests__/tiragens.test.ts`

**Interfaces:**
- Consumes: `Tiragem` com `ordemDeLeitura` (Task 2).
- Produces: `ordemDasPosicoes(tiragem: Tiragem, agora?: Date): number[]`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { ordemDasPosicoes } from '../tiragens';

describe('ordemDasPosicoes', () => {
  it('sem regra própria, lê na ordem em que as cartas foram postas', () => {
    for (const tiragem of TIRAGENS) {
      const esperada = tiragem.posicoes.map((_, i) => i);
      expect(ordemDasPosicoes(tiragem)).toEqual(esperada);
    }
  });

  it('com regra própria, lê na ordem que ela manda', () => {
    // Há tiragens em que a ordem de leitura não é a de distribuição: "O ano à frente"
    // começa pela carta do mês corrente. Sem isto, a leitura começaria sempre em abril.
    const falsa = { ...TIRAGENS[0], ordemDeLeitura: () => [2, 0, 1] };
    expect(ordemDasPosicoes(falsa)).toEqual([2, 0, 1]);
  });

  it('regra que devolve lixo não derruba a leitura', () => {
    // Índice fora da faixa ou repetido deixaria uma posição de fora e outra duas vezes.
    const falsa = { ...TIRAGENS[0], ordemDeLeitura: () => [9, 1, 1] };
    expect(ordemDasPosicoes(falsa)).toEqual([0, 1, 2]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest data/__tests__/tiragens.test.ts -t ordemDasPosicoes`
Expected: FAIL — `ordemDasPosicoes` não existe.

- [ ] **Step 3: Escrever a função**

```ts
/**
 * A ordem em que as posições desta tiragem devem ser LIDAS.
 *
 * Sem regra própria, é a ordem em que as cartas foram postas. Uma regra que devolva
 * índice fora da faixa ou repetido é descartada inteira e volta-se à ordem natural: é
 * melhor ler na ordem errada do que deixar uma posição de fora da leitura.
 */
export function ordemDasPosicoes(tiragem: Tiragem, agora: Date = new Date()): number[] {
  const natural = tiragem.posicoes.map((_, i) => i);
  if (!tiragem.ordemDeLeitura) return natural;
  const pedida = tiragem.ordemDeLeitura(agora);
  const valida = pedida.length === natural.length
    && new Set(pedida).size === natural.length
    && pedida.every((i) => Number.isInteger(i) && i >= 0 && i < natural.length);
  return valida ? pedida : natural;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest data/__tests__/tiragens.test.ts && npx tsc --noEmit`
Expected: PASS, `tsc` exit 0.

- [ ] **Step 5: Commit**

```bash
git add data/tiragens.ts data/__tests__/tiragens.test.ts
git commit -m "feat(taro): a ordem de leitura deixa de ser a ordem de distribuicao"
```

---

### Task 4: O tabuleiro genérico

**Files:**
- Create: `components/taro/Tabuleiro.tsx`
- Create: `components/taro/__tests__/Tabuleiro.test.tsx`
- Delete: `components/taro/CruzCelta.tsx`
- Modify: `app/consulta/cartas.tsx`

**Interfaces:**
- Consumes: `PosicaoDaTiragem` com `lugar` e `deitada` (Task 2).
- Produces: `<Tabuleiro posicoes={PosicaoDaTiragem[]} vaga={(indice: number) => ReactNode} />`; `LARGURA_MINIMA_DO_TABULEIRO = 760`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// components/taro/__tests__/Tabuleiro.test.tsx
import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Tabuleiro } from '../Tabuleiro';

const POSICOES = [
  { nome: 'A', regra: 'a', lugar: { coluna: 1, linha: 0 } },
  { nome: 'B', regra: 'b', lugar: { coluna: 0, linha: 1 } },
  { nome: 'C', regra: 'c', lugar: { coluna: 1, linha: 1 }, deitada: true },
  { nome: 'D', regra: 'd', lugar: { coluna: 3, linha: 2 } },
];

describe('Tabuleiro', () => {
  it('desenha uma vaga por posição', () => {
    render(<Tabuleiro posicoes={POSICOES} vaga={(i) => <Text>vaga {i}</Text>} />);
    for (let i = 0; i < POSICOES.length; i++) {
      expect(screen.getByText(`vaga ${i}`)).toBeTruthy();
    }
  });

  it('a grade tem o tamanho da maior coordenada, não o número de posições', () => {
    // O defeito que isto pega: dimensionar pela contagem. A Cruz Celta tem dez cartas
    // numa grade de cinco por quatro, com buracos — contar cartas daria grade errada.
    render(<Tabuleiro posicoes={POSICOES} vaga={(i) => <Text>vaga {i}</Text>} />);
    expect(screen.getAllByTestId('celula-do-tabuleiro')).toHaveLength(4 * 3);
  });

  it('a posição deitada é girada um quarto de volta', () => {
    render(<Tabuleiro posicoes={POSICOES} vaga={(i) => <Text>vaga {i}</Text>} />);
    const deitada = screen.getByTestId('deitada-2');
    const estilo = [deitada.props.style].flat(5).find(
      (e) => e && Array.isArray((e as { transform?: unknown }).transform),
    ) as { transform: { rotate: string }[] };
    expect(estilo.transform[0].rotate).toBe('90deg');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest components/taro/__tests__/Tabuleiro.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Escrever o tabuleiro**

```tsx
// components/taro/Tabuleiro.tsx
import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Espacamento } from '../../constants/spacing';
import type { PosicaoDaTiragem } from '../../data/tiragens';

interface Props {
  posicoes: PosicaoDaTiragem[];
  /** Desenha a vaga de um índice. O tabuleiro só arruma — não sabe o que é carta. */
  vaga: (indice: number) => ReactNode;
}

/** Abaixo disto a mesa não cabe sem espremer, e a tiragem vai em coluna. */
export const LARGURA_MINIMA_DO_TABULEIRO = 760;

/**
 * Desenha qualquer tiragem a partir da coordenada de cada posição.
 *
 * Substitui o `CruzCelta.tsx`, que era a cruz desenhada à mão. As fontes trazem
 * tiragens em linha, cruz, pirâmide e círculo — uma função por formato não escala, e
 * acrescentar tiragem passaria a ser escrever componente. Com a grade, é acrescentar
 * uma entrada em `data/tiragens.ts`.
 *
 * A grade é dimensionada pela maior coordenada, não pela contagem de posições: a Cruz
 * Celta tem dez cartas numa grade de cinco por quatro, cheia de buracos.
 */
export function Tabuleiro({ posicoes, vaga }: Props) {
  const colunas = Math.max(...posicoes.map((p) => p.lugar.coluna)) + 1;
  const linhas = Math.max(...posicoes.map((p) => p.lugar.linha)) + 1;

  const ocupante = new Map<string, number>();
  posicoes.forEach((p, i) => ocupante.set(`${p.lugar.coluna},${p.lugar.linha}`, i));

  return (
    <View style={estilos.grade}>
      {Array.from({ length: linhas }, (_, linha) => (
        <View key={linha} style={estilos.linha}>
          {Array.from({ length: colunas }, (_, coluna) => {
            const indice = ocupante.get(`${coluna},${linha}`);
            return (
              <View key={coluna} testID="celula-do-tabuleiro" style={estilos.celula}>
                {indice === undefined ? null : (
                  <View
                    testID={posicoes[indice].deitada ? `deitada-${indice}` : `vaga-${indice}`}
                    style={posicoes[indice].deitada ? estilos.deitada : undefined}
                  >
                    {vaga(indice)}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  grade: { gap: Espacamento.sm, alignItems: 'center' },
  linha: { flexDirection: 'row', gap: Espacamento.sm, alignItems: 'center' },
  celula: { alignItems: 'center', justifyContent: 'center' },
  // A carta que atravessa é posta cruzada sobre a primeira na mesa de verdade. Aqui ela
  // fica ao lado e girada: sobreposta, as duas vagas ficariam impossíveis de escolher.
  deitada: { transform: [{ rotate: '90deg' }] },
});
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest components/taro/__tests__/Tabuleiro.test.tsx`
Expected: PASS, 3 testes.

- [ ] **Step 5: Trocar na tela e apagar a cruz desenhada à mão**

Em `app/consulta/cartas.tsx`: trocar o import de `CruzCelta`/`LARGURA_MINIMA_DA_CRUZ` por `Tabuleiro`/`LARGURA_MINIMA_DO_TABULEIRO`. A condição passa a valer para qualquer tiragem maior que três:

```tsx
const emTabuleiro = POSICOES.length > 3 && larguraDaTela >= LARGURA_MINIMA_DO_TABULEIRO;
```

e o bloco de render:

```tsx
{emTabuleiro
  ? <Tabuleiro posicoes={POSICOES} vaga={desenharVaga} />
  : POSICOES.map((_, i) => desenharVaga(i))}
```

`compacta={emTabuleiro}` continua em `desenharVaga`. Depois: `git rm components/taro/CruzCelta.tsx`.

- [ ] **Step 6: Rodar os portões**

Run: `npx jest && npx tsc --noEmit`
Expected: tudo verde, exit 0. A suíte `rito-do-taro` já cobre a Cruz Celta com dez posições e deve continuar passando sem alteração.

- [ ] **Step 7: Commit**

```bash
git add components/taro/Tabuleiro.tsx components/taro/__tests__/Tabuleiro.test.tsx app/consulta/cartas.tsx
git rm components/taro/CruzCelta.tsx
git commit -m "feat(taro): tiragem vira dado — um tabuleiro desenha qualquer formato"
```

---

### Task 5: O payload leva material, não rótulos

**Files:**
- Modify: `services/ia.ts` (interface `CartaParaLeitura`)
- Modify: `app/consulta/resultado.tsx` (a chamada, linha ~115-120)
- Modify: `supabase/functions/ia-interpretacao/index.ts` (`dadosDoTarot`)
- Test: `services/__tests__/ia.test.ts`, `__tests__/validade-nas-functions.test.ts`

**Interfaces:**
- Consumes: `notaDaPosicao` (Task 1), `PosicaoDaTiragem.chave` (Task 2).
- Produces: `CartaParaLeitura` com `palavrasChave?: string[]`, `frasesChave?: string[]`, `nota?: string`, `chave?: PosicaoChave`.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `services/__tests__/ia.test.ts`:

```ts
it('manda o material da carta, não só o rótulo', async () => {
  // A IA deixa de inventar o que a carta significa e passa a tecer material humano.
  // Esquecer de repassar um campo aqui é o defeito que já custou um dia com as áreas
  // do mapa: o servidor recebe menos do que existe, e nada reclama.
  mockInvoke.mockResolvedValue({ data: TAROT_COMPLETO, error: null });

  await gerarInterpretacaoTarot([{
    nome: 'XVI - A Torre',
    posicao: 'O que atravessa',
    regra: 'o que ajuda ou atrapalha',
    chave: 'obstaculo',
    significado: 'Ruptura.',
    palavrasChave: ['ruptura', 'revelação'],
    frasesChave: ['estrutura falsa que cai'],
    nota: 'A mesma força, travada.',
  }]);

  const enviada = mockInvoke.mock.calls[0][1].body.cartas[0];
  expect(enviada.palavrasChave).toEqual(['ruptura', 'revelação']);
  expect(enviada.frasesChave).toEqual(['estrutura falsa que cai']);
  expect(enviada.nota).toBe('A mesma força, travada.');
  expect(enviada.chave).toBe('obstaculo');
});
```

Acrescentar a `__tests__/validade-nas-functions.test.ts`:

```ts
describe('o payload do taro carrega o material da carta', () => {
  const fonte = readFileSync(join(RAIZ, 'ia-interpretacao', 'index.ts'), 'utf8');

  it('a function le as palavras-chave, as frases-chave e a nota de posicao', () => {
    for (const campo of ['palavrasChave', 'frasesChave', 'nota']) {
      expect(fonte).toMatch(new RegExp(`c\\.${campo}`));
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest services/__tests__/ia.test.ts __tests__/validade-nas-functions.test.ts`
Expected: FAIL — os campos não existem em `CartaParaLeitura` nem na function.

- [ ] **Step 3: Alargar o serviço**

Em `services/ia.ts`:

```ts
import type { PosicaoChave } from '../data/tarot';

export interface CartaParaLeitura {
  nome: string;
  posicao: string;
  /** A pergunta que a posição faz. É dela que sai a leitura, não da carta sozinha. */
  regra?: string;
  /** Qual das quatro posições-chave esta posição é, quando é alguma. */
  chave?: PosicaoChave;
  significado: string;
  invertida?: boolean;
  /** Âncora curta: é o que impede a IA de divagar sobre o que a carta significa. */
  palavrasChave?: string[];
  frasesChave?: string[];
  /** A nota desta carta para esta posição, quando o conteúdo já existir. */
  nota?: string;
}
```

O corpo do `invoke` já manda `cartas` inteiro — nada mais a mudar ali.

- [ ] **Step 4: Preencher na tela do resultado**

Em `app/consulta/resultado.tsx`, importar `notaDaPosicao` e `type PosicaoChave` de `../../data/tarot`, acrescentar `chave?: PosicaoChave` ao tipo de `posicoes`, e a chamada passa a:

```tsx
const resultado = await gerarInterpretacaoTarot(
  cartas.map((c, i) => ({
    nome: c.nomeCompleto,
    posicao: nomeDaPosicao(i),
    regra: posicoes[i]?.regra,
    chave: posicoes[i]?.chave,
    significado: c.significado,
    palavrasChave: c.palavrasChave,
    frasesChave: c.frasesChave,
    nota: notaDaPosicao(c, posicoes[i]?.chave),
  })),
  intencao
);
```

- [ ] **Step 5: Escrever o material no `<dados>` da function**

Em `supabase/functions/ia-interpretacao/index.ts`, dentro de `dadosDoTarot`, o corpo do `linhas.map` passa a devolver:

```ts
    const palavras = Array.isArray(c.palavrasChave)
      ? c.palavrasChave.map((p) => texto(p, 40)).filter(Boolean).slice(0, 6).join(', ')
      : '';
    const frases = Array.isArray(c.frasesChave)
      ? c.frasesChave.map((f) => texto(f, 80)).filter(Boolean).slice(0, 8).join(' · ')
      : '';
    const nota = texto(c.nota, 400);
    return [
      `- ${posicao}${pergunta}: ${nome}${orientacao}`,
      significado ? `  o que diz: ${significado}` : '',
      palavras ? `  palavras-chave: ${palavras}` : '',
      frases ? `  frases-chave: ${frases}` : '',
      nota ? `  nesta posição: ${nota}` : '',
    ].filter(Boolean).join('\n');
```

- [ ] **Step 6: Rodar os portões**

Run: `npx jest && npx tsc --noEmit && node scripts/conferir-functions.js`
Expected: tudo verde, `22 arquivos, sintaxe ok`.

- [ ] **Step 7: Commit**

```bash
git add services/ia.ts app/consulta/resultado.tsx supabase/functions/ia-interpretacao/index.ts services/__tests__/ia.test.ts __tests__/validade-nas-functions.test.ts
git commit -m "feat(taro): a IA recebe material da carta, e nao so o rotulo dela"
```

---

### Task 6: As duas regras do livro no prompt

**Files:**
- Create: `data/proporcao.ts`
- Create: `data/__tests__/proporcao.test.ts`
- Modify: `supabase/functions/ia-interpretacao/index.ts` (`INSTRUCOES_TAROT`)
- Test: `__tests__/validade-nas-functions.test.ts`

**Interfaces:**
- Consumes: `CartaTarot` com `naipe` (Task 1).
- Produces: `proporcaoDeMaiores(cartas: CartaTarot[]): { maiores: number; menores: number } | null`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// data/__tests__/proporcao.test.ts
import { proporcaoDeMaiores } from '../proporcao';
import { ARCANOS_MAIORES } from '../tarot';

describe('proporcaoDeMaiores', () => {
  it('sem nenhum Menor em jogo, não há proporção a dizer', () => {
    // Hoje o baralho são só os 22. Dizer "todas Maiores" em toda leitura é ruído que a
    // IA repetiria como se fosse achado.
    expect(proporcaoDeMaiores(ARCANOS_MAIORES.slice(0, 3))).toBeNull();
  });

  it('com os dois tipos em jogo, conta cada um', () => {
    const menor = { ...ARCANOS_MAIORES[0], naipe: 'copas' as const };
    expect(proporcaoDeMaiores([ARCANOS_MAIORES[1], menor, menor])).toEqual({
      maiores: 1, menores: 2,
    });
  });

  it('lista vazia não quebra', () => {
    expect(proporcaoDeMaiores([])).toBeNull();
  });
});
```

Acrescentar a `__tests__/validade-nas-functions.test.ts`, dentro do describe do tarô:

```ts
it('o prompt do taro manda fechar devolvendo uma pergunta', () => {
  // As fontes fecham cada carta com uma pergunta a quem consulta, e e isso que separa
  // leitura simbolica de afirmacao sobre a vida de alguem.
  const instrucoes = fonte.slice(
    fonte.indexOf('INSTRUCOES_TAROT'),
    fonte.indexOf('INSTRUCOES_BUZIOS'),
  );
  expect(instrucoes).toMatch(/pergunta/i);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest data/__tests__/proporcao.test.ts __tests__/validade-nas-functions.test.ts`
Expected: FAIL — módulo `proporcao` não existe; o prompt não fala em pergunta.

- [ ] **Step 3: Escrever a conta**

```ts
// data/proporcao.ts
import type { CartaTarot } from './tarot';

/**
 * Quantos Maiores e quantos Menores saíram.
 *
 * Devolve `null` quando não há os dois tipos em jogo: enquanto o baralho forem só os 22
 * Maiores, dizer "todas Maiores" em toda leitura é ruído que a IA repetiria como se
 * fosse achado. A conta fica pronta aqui e passa a valer sozinha quando os 56 Menores
 * chegarem (Fase 3).
 */
export function proporcaoDeMaiores(
  cartas: CartaTarot[],
): { maiores: number; menores: number } | null {
  const menores = cartas.filter((c) => Boolean(c.naipe)).length;
  const maiores = cartas.length - menores;
  if (maiores === 0 || menores === 0) return null;
  return { maiores, menores };
}
```

- [ ] **Step 4: Acrescentar a regra da pergunta ao prompt**

Em `INSTRUCOES_TAROT`, antes do bloco que descreve o JSON:

```
Feche cada posição devolvendo uma pergunta a quem consultou, e não um veredito. A leitura abre uma questão para a pessoa pensar — nunca afirma o que vai acontecer com ela, nem decide por ela.
```

- [ ] **Step 5: Rodar os portões**

Run: `npx jest && npx tsc --noEmit && node scripts/conferir-functions.js`
Expected: tudo verde.

- [ ] **Step 6: Commit**

```bash
git add data/proporcao.ts data/__tests__/proporcao.test.ts supabase/functions/ia-interpretacao/index.ts __tests__/validade-nas-functions.test.ts
git commit -m "feat(taro): a leitura fecha em pergunta, e a proporcao fica pronta"
```

---

### Task 7: Embaralhar com a pergunta na cabeça

**Files:**
- Modify: `app/consulta/cartas.tsx`
- Test: `__tests__/app/consulta/rito-do-taro.test.tsx`

**Interfaces:**
- Consumes: `embaralhar` de `data/corteDoBaralho.ts`.
- Produces: nada para outras tarefas.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar o helper ao topo da suíte, junto dos outros:

```tsx
const embaralharCartas = () => fireEvent.press(screen.getByText('Embaralhar'));
```

e os dois casos novos:

```tsx
it('o leque só abre depois de embaralhar com a pergunta na cabeça', async () => {
  // Nas fontes, a pergunta é segurada na cabeça DURANTE o embaralhamento — é isso que
  // liga a pergunta à tiragem. Embaralhar invisível, num instante, é sorteio com outro
  // nome, e foi por isso que a tela de preparo antiga parecia enfeite.
  await abrir();
  expect(screen.queryByLabelText(/Cortar aqui/)).toBeNull();
  expect(screen.getByText('Embaralhar')).toBeTruthy();

  embaralharCartas();
  expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(22);
  expect(screen.queryByText('Embaralhar')).toBeNull();
});

it('recomeçar devolve o rito ao embaralhamento', async () => {
  await abrir();
  embaralharCartas();
  cortar();
  fireEvent.press(screen.getByText('Recomeçar o rito'));
  expect(screen.getByText('Embaralhar')).toBeTruthy();
  expect(screen.queryByLabelText(/Cortar aqui/)).toBeNull();
});
```

Todos os demais casos da suíte que chamam `cortar()` passam a chamar `embaralharCartas();` imediatamente antes — **exceto** o primeiro ("começa pedindo o corte"), cujas asserções passam a valer depois de `embaralharCartas()`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest __tests__/app/consulta/rito-do-taro.test.tsx`
Expected: FAIL — não existe "Embaralhar"; o leque já abre de saída.

- [ ] **Step 3: Escrever o passo**

Em `app/consulta/cartas.tsx`, no estado:

```tsx
// O leque só abre depois do gesto. Nas fontes a pergunta é segurada na cabeça DURANTE
// o embaralhamento — é isso que liga a pergunta à tiragem. Embaralhar invisível, num
// instante, é sorteio com outro nome.
const [embaralhado, setEmbaralhado] = useState(false);
```

```tsx
const embaralharAgora = useCallback(() => {
  Hapticos.impactoMedio();
  setLeque(embaralhar(ARCANOS_MAIORES));
  setEmbaralhado(true);
}, []);
```

Em `recomecar`, acrescentar `setEmbaralhado(false);`.

No painel do baralho, antes do `LequeDeCorte`:

```tsx
{!embaralhado && !distribuindo && !recolhendo ? (
  <Button
    variante="primary"
    label="Embaralhar"
    icone="shuffle-outline"
    onPress={embaralharAgora}
  />
) : null}
```

e o `LequeDeCorte` passa a ser renderizado só quando `embaralhado`.

Nos textos de estado, quando `!embaralhado`:

```tsx
passo = 'Segure a sua pergunta e embaralhe as cartas.';
contador = 'O baralho tem 22 cartas. O que você está pensando entra agora, com o gesto.';
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest __tests__/app/consulta/rito-do-taro.test.tsx`
Expected: PASS, toda a suíte.

- [ ] **Step 5: Rodar os portões**

Run: `npx jest && npx tsc --noEmit && node scripts/conferir-functions.js`
Expected: tudo verde, exit 0.

- [ ] **Step 6: Commit**

```bash
git add app/consulta/cartas.tsx __tests__/app/consulta/rito-do-taro.test.tsx
git commit -m "feat(taro): embaralhar volta como gesto, com a pergunta na cabeca"
```

---

## Auto-revisão

**Cobertura da spec.** Seção 1 (camadas da carta) → Task 1. Seção 2 (geometria e ordem de leitura) → Tasks 2, 3 e 4. Seção 3 (fechar em pergunta) → Task 6. Seção 4 / E (embaralhar com a pergunta) → Task 7. Seção C (payload com material) → Task 5. Seção D (proporção) → Task 6, conta pronta e inerte até os Menores. **Fora, declarado no cabeçalho:** três cartas por casa, dois montes, tiragens em sequência e tiragens temáticas novas.

**Consistência de tipos.** `PosicaoChave` nasce em `data/tarot.ts` (Task 1) e é consumida por `data/tiragens.ts` (Task 2) e `services/ia.ts` (Task 5) com o mesmo nome. `notaDaPosicao(carta, chave)` é definida na Task 1 e chamada na Task 5 com a mesma assinatura. `lugar: { coluna, linha }` nasce na Task 2 e é lido pelo `Tabuleiro` na Task 4 com os mesmos campos. `LARGURA_MINIMA_DO_TABULEIRO` substitui `LARGURA_MINIMA_DA_CRUZ`, que some com o arquivo apagado.

**Ordem obrigatória.** A Task 2 importa da Task 1; a Task 4 depende da Task 2; a Task 5 depende das Tasks 1 e 2. As Tasks 6 e 7 são independentes das demais e podem ir em qualquer ponto.
