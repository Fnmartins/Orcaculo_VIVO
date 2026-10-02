# Tarô fiel, Fase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o tarô do app pelo rito completo — sorteio honesto, arte de 1909 e corte feito pela pessoa — sem escrever uma linha de interpretação nova.

**Architecture:** A decisão do rito mora em funções puras (`data/corteDoBaralho.ts`), testadas pelo Jest sem tela. Os componentes de `components/taro/` só desenham e emitem eventos; a tela `app/consulta/cartas.tsx` orquestra. Nenhuma animação altera ordem: ela mostra o que a função pura já decidiu.

**Tech Stack:** React Native / Expo SDK 54, TypeScript estrito, `react-native-reanimated` 4.1 e `react-native-gesture-handler` 2.28 (já instalados), `expo-image`, Jest com `jest-expo` e `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-10-01-taro-fiel-design.md`

## Global Constraints

- **O gesto decide, a animação mostra.** Toda interação altera a ordem real do baralho. Nenhuma função de animação pode chamar `embaralhar`.
- **Zero texto de interpretação novo nesta fase.** Os 22 `significado` e `conselho` atuais ficam intactos. Invertidas e Cruz Celta são Fase 2.
- **Baralho de 22** nesta fase. Os 56 Menores são Fase 3.
- **Nenhuma dependência nova.**
- Gates antes do PR: `yarn typecheck`, `yarn test`, `yarn check:functions`.
- Comentários e textos de tela em pt-BR.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `data/corteDoBaralho.ts` | **Criar.** Funções puras: embaralhar, cortar, recolher. Nenhuma importação de React. |
| `data/__tests__/corteDoBaralho.test.ts` | **Criar.** A suíte que prende a honestidade do sorteio. |
| `data/tarot.ts` | **Modificar.** `sortearCartas` passa a usar Fisher-Yates. |
| `data/__tests__/tarot.test.ts` | **Criar.** Permutação e cobertura do sorteio. |
| `app/leitura-do-dia.tsx` | **Modificar.** Linha 49: trocar `Math.random` cru por sorteio uniforme. |
| `assets/tarot/*.jpg` | **Criar.** 22 imagens de 1909, 420px de largura. |
| `data/arteDoTaro.ts` | **Criar.** O mapa de `require` de cada carta. |
| `components/CartaTarotVisual.tsx` | **Modificar.** Passa a desenhar a arte. |
| `components/taro/LequeDeCorte.tsx` | **Criar.** O leque em arco e o toque que corta. |
| `components/taro/MonteParaDistribuir.tsx` | **Criar.** O monte dourado, de onde se puxa. |
| `components/taro/VagaDaTiragem.tsx` | **Criar.** A posição vazia, com a pergunta dela. |
| `app/consulta/cartas.tsx` | **Modificar.** Orquestra o rito e entrega ao resultado. |
| `services/ia.ts` | **Modificar.** `gerarInterpretacaoTarot` passa a levar posição e intenção. |
| `supabase/functions/ia-interpretacao/index.ts` | **Modificar.** Lê posição e intenção no payload. |
| `__tests__/validade-nas-functions.test.ts` | **Modificar.** Varre o novo payload. |

---

### Task 1: O sorteio honesto

**Files:**
- Create: `data/corteDoBaralho.ts`
- Create: `data/__tests__/corteDoBaralho.test.ts`
- Create: `data/__tests__/tarot.test.ts`
- Modify: `data/tarot.ts:214-216`
- Modify: `app/leitura-do-dia.tsx:49`

**Interfaces:**
- Consumes: nada.
- Produces: `embaralhar<T>(lista: readonly T[]): T[]`, `sortearUm<T>(lista: readonly T[]): T`, `cortar<T>(leque: readonly T[], indice: number): { monte: T[]; resto: T[] }`, `recolher<T>(montes: readonly T[][], leque: readonly T[]): T[]`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// data/__tests__/corteDoBaralho.test.ts
import { cortar, embaralhar, recolher, sortearUm } from '../corteDoBaralho';

const BARALHO = Array.from({ length: 22 }, (_, i) => i);

describe('embaralhar', () => {
  it('devolve permutação: nada some, nada repete', () => {
    const saida = embaralhar(BARALHO);
    expect(saida).toHaveLength(BARALHO.length);
    expect([...saida].sort((a, b) => a - b)).toEqual(BARALHO);
  });

  it('não muda a lista original', () => {
    const original = [...BARALHO];
    embaralhar(BARALHO);
    expect(BARALHO).toEqual(original);
  });

  it('toda carta alcança muitas posições diferentes', () => {
    // O defeito que isto pega: `sort(() => Math.random() - 0.5)` não distribui igual,
    // e algumas cartas ficam presas perto de onde começaram.
    const alcance = new Map<number, Set<number>>();
    for (let r = 0; r < 2000; r++) {
      embaralhar(BARALHO).forEach((carta, posicao) => {
        if (!alcance.has(carta)) alcance.set(carta, new Set());
        alcance.get(carta)!.add(posicao);
      });
    }
    for (const carta of BARALHO) expect(alcance.get(carta)!.size).toBeGreaterThan(15);
  });
});

describe('cortar', () => {
  it('tira da ponta até o índice, inclusive', () => {
    expect(cortar([1, 2, 3, 4, 5], 2)).toEqual({ monte: [1, 2, 3], resto: [4, 5] });
  });

  it('nunca leva o leque inteiro: sempre sobra carta para cortar de novo', () => {
    expect(cortar([1, 2, 3], 2)).toEqual({ monte: [1, 2], resto: [3] });
    expect(cortar([1, 2, 3], 99)).toEqual({ monte: [1, 2], resto: [3] });
  });

  it('índice negativo vira o primeiro corte possível', () => {
    expect(cortar([1, 2, 3], -5)).toEqual({ monte: [1], resto: [2, 3] });
  });
});

describe('recolher', () => {
  it('monta na ordem em que os montes saíram, com o leque por cima', () => {
    expect(recolher([[1, 2], [3]], [4, 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it('é função só dos cortes: a mesma sequência dá o mesmo baralho', () => {
    // Prende a regra da spec. Se alguém puser um embaralhamento aqui achando que
    // "recolher" é "embaralhar", este teste fica vermelho.
    const um = cortar(BARALHO, 4);
    const dois = cortar(um.resto, 7);
    const a = recolher([um.monte, dois.monte], dois.resto);
    const b = recolher([um.monte, dois.monte], dois.resto);
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(BARALHO);
  });
});

describe('sortearUm', () => {
  it('ao longo de muitas vezes, alcança todos os itens', () => {
    const vistos = new Set<number>();
    for (let r = 0; r < 2000; r++) vistos.add(sortearUm(BARALHO));
    expect(vistos.size).toBe(BARALHO.length);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest data/__tests__/corteDoBaralho.test.ts`
Expected: FAIL — `Cannot find module '../corteDoBaralho'`.

- [ ] **Step 3: Escrever o módulo**

```ts
// data/corteDoBaralho.ts
/**
 * As decisões do rito do tarô, sem tela.
 *
 * Moram aqui, puras e sem React, porque é o sorteio que faz o produto ser honesto —
 * e sorteio dentro de componente é sorteio que ninguém testa. A animação mostra o que
 * estas funções decidiram; nenhuma delas é chamada por um efeito visual.
 */

/**
 * Fisher-Yates. O que havia antes era `sort(() => Math.random() - 0.5)`, que **não**
 * produz permutação uniforme: o comparador é inconsistente, o resultado depende do
 * algoritmo de ordenação, e algumas cartas saem menos que outras sem nada avisar.
 */
export function embaralhar<T>(lista: readonly T[]): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Um item ao acaso, com a mesma chance para todos. */
export function sortearUm<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * O corte: tudo da ponta até `indice`, inclusive, sai como monte.
 *
 * Sempre sobra ao menos uma carta no resto. Um corte que levasse o leque inteiro
 * deixaria a pessoa sem onde cortar de novo, e o rito travaria sem dizer por quê.
 */
export function cortar<T>(leque: readonly T[], indice: number): { monte: T[]; resto: T[] } {
  const limite = Math.max(0, Math.min(indice, leque.length - 2));
  return { monte: leque.slice(0, limite + 1), resto: leque.slice(limite + 1) };
}

/**
 * Os montes voltam na ordem em que saíram, e o que restou do leque vai por cima.
 *
 * **Não embaralha, de propósito.** Embaralhar aqui apagaria os cortes da pessoa: o
 * rito inteiro viraria encenação sobre uma ordem decidida em outro lugar.
 */
export function recolher<T>(montes: readonly T[][], leque: readonly T[]): T[] {
  return montes.reduce<T[]>((tudo, monte) => tudo.concat(monte), []).concat(leque);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest data/__tests__/corteDoBaralho.test.ts`
Expected: PASS, 8 testes.

- [ ] **Step 5: Escrever o teste do sorteio de cartas**

```ts
// data/__tests__/tarot.test.ts
import { ARCANOS_MAIORES, sortearCartas } from '../tarot';

describe('sortearCartas', () => {
  it('devolve a quantidade pedida, sem repetir', () => {
    const tres = sortearCartas(3);
    expect(tres).toHaveLength(3);
    expect(new Set(tres.map((c) => c.id)).size).toBe(3);
  });

  it('ao longo de muitas tiragens, toda carta aparece', () => {
    const vistas = new Set<number>();
    for (let r = 0; r < 1500; r++) sortearCartas(3).forEach((c) => vistas.add(c.id));
    expect(vistas.size).toBe(ARCANOS_MAIORES.length);
  });
});
```

- [ ] **Step 6: Trocar o embaralhamento nos dois lugares**

Em `data/tarot.ts`, acrescentar `import { embaralhar } from './corteDoBaralho';` e substituir o corpo de `sortearCartas`:

```ts
export function sortearCartas(quantidade: number): CartaTarot[] {
  return embaralhar(ARCANOS_MAIORES).slice(0, quantidade);
}
```

Em `app/leitura-do-dia.tsx`, acrescentar `import { sortearUm } from '../data/corteDoBaralho';` e trocar a linha 49:

```ts
// antes: const idx = Math.floor(Math.random() * ARCANOS_MAIORES.length);
const carta = sortearUm(ARCANOS_MAIORES);
```

ajustando o uso seguinte de `idx` para usar `carta` diretamente.

- [ ] **Step 7: Rodar os gates**

Run: `npx jest && npx tsc --noEmit`
Expected: tudo verde, exit 0.

- [ ] **Step 8: Commit**

```bash
git add data/corteDoBaralho.ts data/__tests__/corteDoBaralho.test.ts data/__tests__/tarot.test.ts data/tarot.ts app/leitura-do-dia.tsx
git commit -m "fix(taro): o sorteio passa a ser uniforme, e o corte vira funcao pura"
```

---

### Task 2: A arte de 1909

**Files:**
- Create: `assets/tarot/00-o-louco.jpg` … `assets/tarot/21-o-mundo.jpg`
- Create: `data/arteDoTaro.ts`
- Modify: `components/CartaTarotVisual.tsx`
- Modify: `app/consulta/resultado.tsx` e `app/consulta/cartas.tsx` (os dois usos atuais)
- Create: `components/__tests__/CartaTarotVisual.test.tsx`

**Interfaces:**
- Consumes: `ARCANOS_MAIORES` de `data/tarot.ts`.
- Produces: `ARTE_POR_ID: Record<number, number>`; `<CartaTarotVisual cartaId={number} nome={string} invertida?={boolean} largura?={number} />`.

- [ ] **Step 1: Baixar as 22 imagens**

```bash
python -c "
import urllib.request, os, io, time
from PIL import Image
nomes = ['00_Fool','01_Magician','02_High_Priestess','03_Empress','04_Emperor','05_Hierophant','06_Lovers','07_Chariot','08_Strength','09_Hermit','10_Wheel_of_Fortune','11_Justice','12_Hanged_Man','13_Death','14_Temperance','15_Devil','16_Tower','17_Star','18_Moon','19_Sun','20_Judgement','21_World']
slugs = ['00-o-louco','01-o-mago','02-a-sacerdotisa','03-a-imperatriz','04-o-imperador','05-o-hierofante','06-os-amantes','07-o-carro','08-a-forca','09-o-eremita','10-a-roda-da-fortuna','11-a-justica','12-o-pendurado','13-a-morte','14-a-temperanca','15-o-diabo','16-a-torre','17-a-estrela','18-a-lua','19-o-sol','20-o-julgamento','21-o-mundo']
os.makedirs('assets/tarot', exist_ok=True)
UA = {'User-Agent':'Arcanus/1.0 (contato@arcanus.com.br)'}
for nome, slug in zip(nomes, slugs):
    req = urllib.request.Request('https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_%s.jpg' % nome, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r: bruto = r.read()
    img = Image.open(io.BytesIO(bruto)).convert('RGB')
    img.thumbnail((420, 760), Image.LANCZOS)
    img.save('assets/tarot/%s.jpg' % slug, 'JPEG', quality=82, optimize=True)
    time.sleep(0.25)
print('ok')
"
```

Expected: 22 arquivos, somando por volta de 1,5 MB.

- [ ] **Step 2: Escrever o teste que falha**

```tsx
// components/__tests__/CartaTarotVisual.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ARCANOS_MAIORES } from '../../data/tarot';
import { ARTE_POR_ID } from '../../data/arteDoTaro';
import { CartaTarotVisual } from '../CartaTarotVisual';

describe('CartaTarotVisual', () => {
  it('toda carta tem arte: nenhuma volta a ser ícone', () => {
    // O defeito que isto pega: acrescentar carta ao baralho e esquecer a imagem.
    // Ela apareceria em branco na tiragem, sem erro em lugar nenhum.
    for (const carta of ARCANOS_MAIORES) expect(ARTE_POR_ID[carta.id]).toBeDefined();
  });

  it('mostra a cena, com o nome como rótulo acessível', () => {
    render(<CartaTarotVisual cartaId={16} nome="XVI - A Torre" />);
    expect(screen.getByLabelText('XVI - A Torre')).toBeTruthy();
  });

  it('invertida, o leitor de tela também sabe', () => {
    // A prop entra agora, usada na Fase 2, para a tela não mudar de forma depois.
    render(<CartaTarotVisual cartaId={16} nome="XVI - A Torre" invertida />);
    expect(screen.getByLabelText('XVI - A Torre, invertida')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx jest components/__tests__/CartaTarotVisual.test.tsx`
Expected: FAIL — `Cannot find module '../../data/arteDoTaro'`.

- [ ] **Step 4: Criar o mapa de arte**

```ts
// data/arteDoTaro.ts
/**
 * A cena de cada Arcano Maior, na edição de 1909 de Pamela Colman Smith.
 *
 * `require` estático e não caminho montado em runtime: o empacotador do Expo precisa
 * ver cada arquivo em tempo de build, e um caminho em string não entra no bundle — a
 * carta sairia em branco só no aparelho, nunca no teste.
 *
 * No Rider-Waite a leitura é leitura da cena. Sem estas imagens, o método que o
 * próprio baralho propõe não existe.
 */
export const ARTE_POR_ID: Record<number, number> = {
  0: require('../assets/tarot/00-o-louco.jpg'),
  1: require('../assets/tarot/01-o-mago.jpg'),
  2: require('../assets/tarot/02-a-sacerdotisa.jpg'),
  3: require('../assets/tarot/03-a-imperatriz.jpg'),
  4: require('../assets/tarot/04-o-imperador.jpg'),
  5: require('../assets/tarot/05-o-hierofante.jpg'),
  6: require('../assets/tarot/06-os-amantes.jpg'),
  7: require('../assets/tarot/07-o-carro.jpg'),
  8: require('../assets/tarot/08-a-forca.jpg'),
  9: require('../assets/tarot/09-o-eremita.jpg'),
  10: require('../assets/tarot/10-a-roda-da-fortuna.jpg'),
  11: require('../assets/tarot/11-a-justica.jpg'),
  12: require('../assets/tarot/12-o-pendurado.jpg'),
  13: require('../assets/tarot/13-a-morte.jpg'),
  14: require('../assets/tarot/14-a-temperanca.jpg'),
  15: require('../assets/tarot/15-o-diabo.jpg'),
  16: require('../assets/tarot/16-a-torre.jpg'),
  17: require('../assets/tarot/17-a-estrela.jpg'),
  18: require('../assets/tarot/18-a-lua.jpg'),
  19: require('../assets/tarot/19-o-sol.jpg'),
  20: require('../assets/tarot/20-o-julgamento.jpg'),
  21: require('../assets/tarot/21-o-mundo.jpg'),
};
```

- [ ] **Step 5: Trocar o desenho da carta**

```tsx
// components/CartaTarotVisual.tsx — corpo novo
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Cores } from '../constants/colors';
import { ARTE_POR_ID } from '../data/arteDoTaro';

interface CartaTarotVisualProps {
  cartaId: number;
  nome: string;
  invertida?: boolean;
  largura?: number;
}

export function CartaTarotVisual({ cartaId, nome, invertida = false, largura = 82 }: CartaTarotVisualProps) {
  const altura = largura * 1.58;
  return (
    <View
      accessibilityLabel={invertida ? `${nome}, invertida` : nome}
      style={[estilos.moldura, { width: largura, height: altura, borderRadius: largura * 0.1 }]}
    >
      <Image
        source={ARTE_POR_ID[cartaId]}
        style={[estilos.arte, invertida && estilos.deCabecaParaBaixo]}
        contentFit="cover"
        transition={160}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  moldura: { overflow: 'hidden', borderWidth: 1, borderColor: Cores.cardBorda, backgroundColor: '#0C0714' },
  arte: { width: '100%', height: '100%' },
  deCabecaParaBaixo: { transform: [{ rotate: '180deg' }] },
});
```

- [ ] **Step 6: Atualizar os dois usos existentes**

Em `app/consulta/resultado.tsx` e `app/consulta/cartas.tsx`, trocar `icone={carta.icone} cor={carta.cor}` por `cartaId={carta.id} nome={carta.nomeCompleto}`.

- [ ] **Step 7: Rodar os gates**

Run: `npx jest && npx tsc --noEmit`
Expected: tudo verde, exit 0.

- [ ] **Step 8: Commit**

```bash
git add assets/tarot data/arteDoTaro.ts components/CartaTarotVisual.tsx components/__tests__/CartaTarotVisual.test.tsx app/consulta/resultado.tsx app/consulta/cartas.tsx
git commit -m "feat(taro): as cartas passam a mostrar a cena de 1909"
```

---

### Task 3: O leque que corta

**Files:**
- Create: `components/taro/LequeDeCorte.tsx`
- Create: `components/taro/__tests__/LequeDeCorte.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `<LequeDeCorte quantidade={number} aoCortar={(indice: number) => void} desligado?={boolean} />`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// components/taro/__tests__/LequeDeCorte.test.tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { LequeDeCorte } from '../LequeDeCorte';

describe('LequeDeCorte', () => {
  it('abre uma lâmina por carta', () => {
    render(<LequeDeCorte quantidade={22} aoCortar={jest.fn()} />);
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(22);
  });

  it('tocar numa lâmina entrega o índice dela', () => {
    // O índice é o contrato com `cortar`: errar aqui corta no lugar errado e nada
    // quebra — a pessoa só recebe outra tiragem, sem jeito de perceber.
    const aoCortar = jest.fn();
    render(<LequeDeCorte quantidade={22} aoCortar={aoCortar} />);
    fireEvent.press(screen.getByLabelText('Cortar aqui, carta 7 de 22'));
    expect(aoCortar).toHaveBeenCalledWith(6);
  });

  it('desligado, não corta', () => {
    const aoCortar = jest.fn();
    render(<LequeDeCorte quantidade={22} aoCortar={aoCortar} desligado />);
    fireEvent.press(screen.getByLabelText('Cortar aqui, carta 7 de 22'));
    expect(aoCortar).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest components/taro`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Escrever o componente**

```tsx
// components/taro/LequeDeCorte.tsx
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

interface Props {
  quantidade: number;
  aoCortar: (indice: number) => void;
  desligado?: boolean;
}

const LARGURA_LAMINA = 38;
const ALTURA_LAMINA = 60;
const MEIA_ABERTURA = 38; // graus para cada lado: leque de mão, não semicírculo

/**
 * O baralho aberto em arco, de costas.
 *
 * Gira em torno de um pivô ABAIXO das cartas — é isso que faz o leque abrir em arco em
 * vez de esticar na horizontal. As pontas descem `raio * (1 - cos)`, e a altura da mesa
 * sai dessa conta: com altura fixa, o arco é cortado pela borda.
 */
export function LequeDeCorte({ quantidade, aoCortar, desligado = false }: Props) {
  const { width } = useWindowDimensions();
  const { queda, passo } = useMemo(() => {
    const rad = (MEIA_ABERTURA * Math.PI) / 180;
    const raio = Math.min(430, Math.max(170, (width / 2 - 26) / Math.sin(rad)));
    return {
      queda: raio * (1 - Math.cos(rad)),
      passo: quantidade > 1 ? (MEIA_ABERTURA * 2) / (quantidade - 1) : 0,
    };
  }, [width, quantidade]);

  return (
    <View style={[estilos.mesa, { height: ALTURA_LAMINA + queda + 22 }]}>
      {Array.from({ length: quantidade }, (_, i) => (
        <View
          key={i}
          style={[estilos.pivo, {
            bottom: queda + 10,
            zIndex: i,
            transform: [{ rotate: `${(-MEIA_ABERTURA + i * passo).toFixed(2)}deg` }],
          }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cortar aqui, carta ${i + 1} de ${quantidade}`}
            onPress={() => { if (!desligado) aoCortar(i); }}
            style={estilos.lamina}
          />
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  mesa: { position: 'relative', marginTop: 16 },
  // Duas camadas de propósito: o invólucro gira e a lâmina se desloca. Numa só, a
  // animação do corte apagaria a rotação e as cartas levantadas se empilhariam.
  pivo: {
    position: 'absolute', left: '50%', width: LARGURA_LAMINA, height: ALTURA_LAMINA,
    marginLeft: -LARGURA_LAMINA / 2,
  },
  lamina: {
    width: '100%', height: '100%', borderRadius: 5,
    backgroundColor: '#2A1B3D', borderWidth: 1, borderColor: 'rgba(181,139,70,0.45)',
  },
});
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest components/taro`
Expected: PASS, 3 testes.

- [ ] **Step 5: Commit**

```bash
git add components/taro/LequeDeCorte.tsx components/taro/__tests__/LequeDeCorte.test.tsx
git commit -m "feat(taro): o leque em arco, com o toque que corta"
```

---

### Task 4: O monte de onde se puxa

**Files:**
- Create: `components/taro/MonteParaDistribuir.tsx`
- Create: `components/taro/__tests__/MonteParaDistribuir.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `<MonteParaDistribuir restantes={number} aoPuxar={() => void} />`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// components/taro/__tests__/MonteParaDistribuir.test.tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MonteParaDistribuir } from '../MonteParaDistribuir';

describe('MonteParaDistribuir', () => {
  it('diz de onde se pega', () => {
    render(<MonteParaDistribuir restantes={19} aoPuxar={jest.fn()} />);
    expect(screen.getByText('Pegue daqui')).toBeTruthy();
  });

  it('tocar puxa uma carta', () => {
    const aoPuxar = jest.fn();
    render(<MonteParaDistribuir restantes={19} aoPuxar={aoPuxar} />);
    fireEvent.press(screen.getByLabelText('Carta de cima do monte, pegue daqui'));
    expect(aoPuxar).toHaveBeenCalledTimes(1);
  });

  it('monte vazio não puxa nada e diz que acabou', () => {
    const aoPuxar = jest.fn();
    render(<MonteParaDistribuir restantes={0} aoPuxar={aoPuxar} />);
    expect(screen.getByText('Monte vazio')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Carta de cima do monte, pegue daqui'));
    expect(aoPuxar).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest components/taro/__tests__/MonteParaDistribuir.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Escrever o componente**

```tsx
// components/taro/MonteParaDistribuir.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';

interface Props {
  restantes: number;
  aoPuxar: () => void;
}

/**
 * O monte de onde a carta sai.
 *
 * A borda dourada e o rótulo não são enfeite: no rito o monte tem exatamente a mesma
 * aparência dos versos do leque, e nada diria que de um se pega e do outro não.
 */
export function MonteParaDistribuir({ restantes, aoPuxar }: Props) {
  const vazio = restantes <= 0;
  return (
    <View style={estilos.bloco}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Carta de cima do monte, pegue daqui"
        accessibilityHint={vazio ? undefined : 'Põe a carta na próxima posição vazia'}
        onPress={() => { if (!vazio) aoPuxar(); }}
        style={[estilos.monte, vazio && estilos.vazio]}
      />
      <Text style={estilos.rotulo}>{vazio ? 'Monte vazio' : 'Pegue daqui'}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { alignItems: 'center', gap: 6 },
  monte: {
    width: 76, height: 120, borderRadius: 8,
    backgroundColor: '#2A1B3D', borderWidth: 2, borderColor: Cores.acento,
  },
  vazio: { opacity: 0.2, borderColor: Cores.cardBorda },
  rotulo: {
    fontFamily: Fontes.corpo, fontSize: 11, letterSpacing: 1,
    textTransform: 'uppercase', color: Cores.acento,
  },
});
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest components/taro/__tests__/MonteParaDistribuir.test.tsx`
Expected: PASS, 3 testes.

- [ ] **Step 5: Commit**

```bash
git add components/taro/MonteParaDistribuir.tsx components/taro/__tests__/MonteParaDistribuir.test.tsx
git commit -m "feat(taro): o monte dourado, que diz de onde se pega"
```

---

### Task 5: A vaga da tiragem

**Files:**
- Create: `components/taro/VagaDaTiragem.tsx`
- Create: `components/taro/__tests__/VagaDaTiragem.test.tsx`

**Interfaces:**
- Consumes: `CartaTarotVisual` (Task 2), `CartaTarot` de `data/tarot.ts`.
- Produces: `<VagaDaTiragem posicao={{ nome: string; regra: string }} carta={CartaTarot | null} aoReceber={() => void} />`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// components/taro/__tests__/VagaDaTiragem.test.tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ARCANOS_MAIORES } from '../../../data/tarot';
import { VagaDaTiragem } from '../VagaDaTiragem';

const PASSADO = { nome: 'Passado', regra: 'o que já se consumou e ainda pesa' };
const TORRE = ARCANOS_MAIORES[16];

describe('VagaDaTiragem', () => {
  it('vazia, mostra a pergunta que a posição faz', () => {
    // A Cruz Celta se explica sozinha por causa disto: as perguntas são lidas antes
    // de qualquer resposta. Esconder a regra até a carta cair desperdiça o momento.
    render(<VagaDaTiragem posicao={PASSADO} carta={null} aoReceber={jest.fn()} />);
    expect(screen.getByText('Passado')).toBeTruthy();
    expect(screen.getByText('o que já se consumou e ainda pesa')).toBeTruthy();
  });

  it('vazia, recebe o toque', () => {
    const aoReceber = jest.fn();
    render(<VagaDaTiragem posicao={PASSADO} carta={null} aoReceber={aoReceber} />);
    fireEvent.press(screen.getByLabelText('Posição Passado, vazia'));
    expect(aoReceber).toHaveBeenCalledTimes(1);
  });

  it('com carta, mostra a cena e não aceita outra', () => {
    const aoReceber = jest.fn();
    render(<VagaDaTiragem posicao={PASSADO} carta={TORRE} aoReceber={aoReceber} />);
    expect(screen.getByLabelText(TORRE.nomeCompleto)).toBeTruthy();
    fireEvent.press(screen.getByLabelText(`Posição Passado, ${TORRE.nomeCompleto}`));
    expect(aoReceber).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest components/taro/__tests__/VagaDaTiragem.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Escrever o componente**

```tsx
// components/taro/VagaDaTiragem.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { CartaTarotVisual } from '../CartaTarotVisual';
import type { CartaTarot } from '../../data/tarot';

interface Props {
  posicao: { nome: string; regra: string };
  carta: CartaTarot | null;
  aoReceber: () => void;
}

export function VagaDaTiragem({ posicao, carta, aoReceber }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={carta ? `Posição ${posicao.nome}, ${carta.nomeCompleto}` : `Posição ${posicao.nome}, vazia`}
      onPress={() => { if (!carta) aoReceber(); }}
      style={estilos.vaga}
    >
      <Text style={estilos.nome}>{posicao.nome}</Text>
      {carta
        ? <CartaTarotVisual cartaId={carta.id} nome={carta.nomeCompleto} largura={104} />
        : <View style={estilos.vazia} />}
      <Text style={estilos.regra}>{carta ? carta.nome : posicao.regra}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  vaga: { alignItems: 'center', gap: Espacamento.sm, flex: 1, minWidth: 112 },
  nome: { fontFamily: Fontes.titulo, fontSize: 15, color: Cores.acento },
  vazia: {
    width: 104, height: 164, borderRadius: RaioBorda.md,
    borderWidth: 1, borderColor: Cores.cardBorda, borderStyle: 'dashed',
  },
  regra: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario, textAlign: 'center' },
});
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest components/taro/__tests__/VagaDaTiragem.test.tsx`
Expected: PASS, 3 testes.

- [ ] **Step 5: Commit**

```bash
git add components/taro/VagaDaTiragem.tsx components/taro/__tests__/VagaDaTiragem.test.tsx
git commit -m "feat(taro): a vaga que mostra a pergunta antes da resposta"
```

---

### Task 6: A tela do rito

**Files:**
- Modify: `app/consulta/cartas.tsx`
- Create: `__tests__/app/consulta/rito-do-taro.test.tsx`

**Interfaces:**
- Consumes: `LequeDeCorte`, `MonteParaDistribuir`, `VagaDaTiragem`, `embaralhar`, `cortar`, `recolher`.
- Produces: navegação para `/consulta/resultado` com `params.cartas` (JSON de `CartaTarot[]`, na ordem das posições) e `params.intencao` (string, vazia quando a pessoa não escreveu).

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// __tests__/app/consulta/rito-do-taro.test.tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('../../../components/GradientBackground', () => {
  const { View } = require('react-native');
  return { GradientBackground: View };
});
jest.mock('../../../utils/haptics', () => ({
  Hapticos: { impactoLeve: jest.fn(), impactoMedio: jest.fn(), selecao: jest.fn() },
}));

import TelaCartas from '../../../app/consulta/cartas';

beforeEach(() => mockPush.mockClear());

const cortar = () => fireEvent.press(screen.getByLabelText('Cortar aqui, carta 8 de 22'));
const juntar = () => fireEvent.press(screen.getByText('Juntar e seguir'));
const puxar = () => fireEvent.press(screen.getByLabelText('Carta de cima do monte, pegue daqui'));

describe('o rito do tarô', () => {
  it('começa pedindo o corte, não a tiragem', () => {
    render(<TelaCartas />);
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(22);
    expect(screen.queryByText('Pegue daqui')).toBeNull();
  });

  it('depois de cortar e juntar, as três posições aparecem vazias', () => {
    render(<TelaCartas />);
    cortar(); juntar();
    expect(screen.getByLabelText('Posição Passado, vazia')).toBeTruthy();
    expect(screen.getByLabelText('Posição Presente, vazia')).toBeTruthy();
    expect(screen.getByLabelText('Posição Futuro, vazia')).toBeTruthy();
  });

  it('três cartas puxadas levam ao resultado', () => {
    render(<TelaCartas />);
    cortar(); juntar(); puxar(); puxar(); puxar();
    expect(mockPush).toHaveBeenCalledTimes(1);
    const destino = mockPush.mock.calls[0][0];
    expect(destino.pathname).toBe('/consulta/resultado');
    expect(JSON.parse(destino.params.cartas)).toHaveLength(3);
  });

  it('não vai para o resultado com posição vazia', () => {
    // A regressão mais provável: navegar assim que a primeira carta cai.
    render(<TelaCartas />);
    cortar(); juntar(); puxar();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('sem intenção escrita, nada é afirmado sobre ela', () => {
    render(<TelaCartas />);
    cortar(); juntar(); puxar(); puxar(); puxar();
    expect(mockPush.mock.calls[0][0].params.intencao).toBe('');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest __tests__/app/consulta/rito-do-taro.test.tsx`
Expected: FAIL — a tela ainda sorteia sozinha e não tem leque.

- [ ] **Step 3: Reescrever o miolo da tela**

Substituir `const [cartasSorteadas] = useState(() => sortearCartas(3))` por:

```tsx
const POSICOES = [
  { nome: 'Passado', regra: 'o que já se consumou e ainda pesa' },
  { nome: 'Presente', regra: 'o que está em jogo agora' },
  { nome: 'Futuro', regra: 'o que tende a se formar se nada mudar' },
];

const [intencao, setIntencao] = useState('');
const [leque, setLeque] = useState<CartaTarot[]>(() => embaralhar(ARCANOS_MAIORES));
const [montes, setMontes] = useState<CartaTarot[][]>([]);
const [baralho, setBaralho] = useState<CartaTarot[] | null>(null);
const [tiragem, setTiragem] = useState<(CartaTarot | null)[]>([null, null, null]);

function aoCortar(indice: number) {
  const { monte, resto } = cortar(leque, indice);
  setMontes((anteriores) => [...anteriores, monte]);
  setLeque(resto);
}

function juntar() {
  setBaralho(recolher(montes, leque));
}

function puxar() {
  const vaga = tiragem.findIndex((c) => c === null);
  if (vaga < 0 || !baralho || baralho.length === 0) return;
  const [topo, ...resto] = baralho;
  const nova = [...tiragem];
  nova[vaga] = topo;
  setTiragem(nova);
  setBaralho(resto);
  // A navegação sai daqui, com a lista já completa na mão: ler `tiragem` logo após
  // o `setTiragem` devolveria o estado anterior, e a última carta ficaria de fora.
  if (nova.every((c) => c !== null)) {
    router.push({
      pathname: '/consulta/resultado',
      params: { cartas: JSON.stringify(nova), intencao: intencao.trim() },
    });
  }
}
```

A tela renderiza, nessa ordem: o campo de intenção, com o rótulo *"Se quiser, diga o que te trouxe aqui"*; o `LequeDeCorte` enquanto `baralho === null`; o botão **Juntar e seguir**, visível a partir do primeiro corte; e, com `baralho` preenchido, o `MonteParaDistribuir` ao lado das três `VagaDaTiragem`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest __tests__/app/consulta/rito-do-taro.test.tsx`
Expected: PASS, 5 testes.

- [ ] **Step 5: Rodar os gates**

Run: `npx jest && npx tsc --noEmit`
Expected: tudo verde, exit 0.

- [ ] **Step 6: Commit**

```bash
git add app/consulta/cartas.tsx __tests__/app/consulta/rito-do-taro.test.tsx
git commit -m "feat(taro): a tela do rito, com corte e distribuicao pela pessoa"
```

---

### Task 7: A posição e a intenção chegam à leitura

**Files:**
- Modify: `services/ia.ts`
- Modify: `app/consulta/resultado.tsx`
- Modify: `supabase/functions/ia-interpretacao/index.ts`
- Modify: `__tests__/validade-nas-functions.test.ts`

**Interfaces:**
- Consumes: `params.cartas` e `params.intencao` (Task 6).
- Produces: `gerarInterpretacaoTarot(cartas: { nome: string; posicao: string; significado: string }[], intencao?: string)`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// acrescentar a __tests__/validade-nas-functions.test.ts
describe('a leitura de tarô recebe posição e intenção', () => {
  const fonte = readFileSync(join(RAIZ, 'ia-interpretacao', 'index.ts'), 'utf8');

  it('o payload do tarô carrega a posição de cada carta', () => {
    // Sem isto a IA recebe três cartas soltas e escreve três parágrafos soltos — que
    // é exatamente o "muito simples" que esta entrega existe para corrigir.
    expect(fonte).toMatch(/posicao/);
  });

  it('a intenção só entra no prompt quando existe', () => {
    // O defeito que isto pega: um prompt que diga "o consulente perguntou" mesmo com
    // o campo vazio. O app passaria a afirmar o que não sabe.
    expect(fonte).toMatch(/intencao/);
    expect(fonte).toMatch(/intencao\s*\?/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest __tests__/validade-nas-functions.test.ts`
Expected: FAIL — `posicao` não aparece na function.

- [ ] **Step 3: Levar posição e intenção no serviço**

Em `services/ia.ts`, `gerarInterpretacaoTarot` passa a receber `posicao` em cada carta e um segundo parâmetro `intencao?: string`, repassando os dois no `body` do `invoke`.

Em `app/consulta/resultado.tsx`, a chamada passa a montar `{ nome, posicao: POSICOES[i], significado }` e a repassar `params.intencao`.

- [ ] **Step 4: Ler na function**

Em `supabase/functions/ia-interpretacao/index.ts`, `dadosDoTarot` escreve a posição ao lado de cada carta, e acrescenta:

```ts
const intencao = typeof body.intencao === 'string' ? body.intencao.trim() : '';
// Sem intenção, nenhuma linha é acrescentada: um prompt que afirme pergunta onde não
// houve pergunta faz a leitura inventar contexto, e a pessoa percebe.
const linhaIntencao = intencao ? `\nO que a pessoa trouxe: ${intencao}` : '';
```

- [ ] **Step 5: Rodar os gates**

Run: `npx jest && npx tsc --noEmit && node scripts/conferir-functions.js`
Expected: tudo verde, exit 0, `22 arquivos, sintaxe ok`.

- [ ] **Step 6: Commit**

```bash
git add services/ia.ts app/consulta/resultado.tsx supabase/functions/ia-interpretacao/index.ts __tests__/validade-nas-functions.test.ts
git commit -m "feat(taro): a leitura recebe a posicao de cada carta e a intencao"
```

---

### Task 8: O movimento — riffle e arraste

Até aqui o rito funciona **por toque**, e funciona inteiro: cortar, juntar, puxar. Esta tarefa
acrescenta o gesto e a animação por cima, sem mudar nenhuma decisão. É a última de propósito: se
algo aqui der errado, o que já está no ar continua correto, só mais seco.

**Files:**
- Create: `components/taro/Recolhimento.tsx`
- Modify: `components/taro/MonteParaDistribuir.tsx`
- Modify: `app/consulta/cartas.tsx`
- Modify: `components/taro/__tests__/MonteParaDistribuir.test.tsx`

**Interfaces:**
- Consumes: `MonteParaDistribuir` (Task 4), `VagaDaTiragem` (Task 5).
- Produces: `<Recolhimento aoTerminar={() => void} />`; `MonteParaDistribuir` ganha `aoSoltarEm?: (indiceDaVaga: number) => void` e `vagas?: { indice: number; y: number }[]`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// acrescentar a components/taro/__tests__/MonteParaDistribuir.test.tsx
it('o toque continua funcionando quando há arraste', () => {
  // O arraste é camada por cima. Se ele engolir o toque, quem não arrasta no celular
  // fica sem saída — e é a maioria.
  const aoPuxar = jest.fn();
  render(<MonteParaDistribuir restantes={19} aoPuxar={aoPuxar} aoSoltarEm={jest.fn()} />);
  fireEvent.press(screen.getByLabelText('Carta de cima do monte, pegue daqui'));
  expect(aoPuxar).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest components/taro/__tests__/MonteParaDistribuir.test.tsx`
Expected: FAIL — `aoSoltarEm` não existe na interface.

- [ ] **Step 3: O arraste**

Em `MonteParaDistribuir`, envolver o `Pressable` num `GestureDetector` com `Gesture.Pan()`. A carta
fantasma é um `Animated.View` com `translateX`/`translateY` em `useSharedValue`. No `onEnd`, a vaga
alvo sai da posição Y do dedo comparada com as medidas em `vagas`; sem alvo, a carta volta ao monte
com `withSpring(0)`.

```tsx
const pan = Gesture.Pan()
  .onUpdate((e) => { x.value = e.translationX; y.value = e.translationY; })
  .onEnd((e) => {
    const alvo = vagaSob(e.absoluteY);
    x.value = withSpring(0); y.value = withSpring(0);
    if (alvo >= 0) runOnJS(aoSoltarEm)(alvo);
  });
```

`Gesture.Pan()` e `Pressable` coexistem: o pan só reivindica o gesto depois de alguns pixels de
movimento, então o toque simples continua chegando ao `onPress`.

- [ ] **Step 4: O riffle**

`Recolhimento` desenha vinte versos, metade entrando de cada lado, cada um com o seu atraso, e
chama `aoTerminar` no fim. **Não recebe nem devolve cartas** — a ordem já foi decidida por
`recolher`. Respeitar `AccessibilityInfo.isReduceMotionEnabled()`: com ele ligado, chamar
`aoTerminar` direto.

- [ ] **Step 5: Ligar na tela**

Em `app/consulta/cartas.tsx`, `juntar()` passa a mostrar `Recolhimento` e só define `baralho` no
`aoTerminar`. As `VagaDaTiragem` registram a sua posição Y por `onLayout`, e a tela passa a lista
para o monte.

- [ ] **Step 6: Rodar os gates**

Run: `npx jest && npx tsc --noEmit`
Expected: tudo verde, exit 0. Os testes das Tasks 4 a 6 continuam passando: o toque não mudou.

- [ ] **Step 7: Commit**

```bash
git add components/taro/Recolhimento.tsx components/taro/MonteParaDistribuir.tsx components/taro/__tests__/MonteParaDistribuir.test.tsx app/consulta/cartas.tsx
git commit -m "feat(taro): o riffle do recolhimento e o arraste da carta"
```

---

## Depois da Fase 1

**O deploy não é só o merge.** O Vercel publica o app; a Edge Function é à parte:
`npx supabase functions deploy ia-interpretacao --project-ref rfdjukdbrtvvulaxbzwb`.

**A conferência no aparelho, que nenhum teste faz:** o leque de 22 cartas num celular estreito; o corte com o dedo, não com o mouse; e a leitura chegando com as três posições citadas.

**A confirmação jurídica da arte é do dono**, antes de isto ir ao ar.
