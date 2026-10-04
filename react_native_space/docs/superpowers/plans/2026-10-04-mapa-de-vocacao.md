# Mapa de Vocação — Plano de Implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixa (`- [ ]`) para marcação.

**Goal:** Entregar o item 32 do roadmap — uma leitura de carreira escrita a partir do mapa natal que o app já calcula, com parte grátis na home e a leitura completa dentro do plano.

**Architecture:** Nenhuma efeméride nova e nenhum cálculo novo. Um módulo puro (`data/vocacao.ts`) escolhe as peças que a área Trabalho de `data/areas.ts` já resolve e acrescenta o meio do céu; a leitura entra como **quarto oráculo** na Edge Function `ia-interpretacao`, herdando validade de plano, cota do dia, contagem de tokens e o 402; a tela nova `/vocacao` lê os dados de nascimento já salvos no perfil, calcula o mapa no aparelho e mostra a parte grátis antes de pedir plano.

**Tech Stack:** Expo SDK 54, expo-router, React Native Web, TypeScript strict, Jest (`jest-expo`) + `@testing-library/react-native`, Supabase Edge Functions (Deno).

**Spec:** `docs/superpowers/specs/2026-10-01-mapa-de-vocacao-design.md` — leia junto com este plano. As quatro decisões do dono estão lá e são vinculantes.

## Global Constraints

- **pt-BR em todo texto de tela, identificador e comentário.** Nada de identificador em inglês.
- **TypeScript strict**; `npx tsc --noEmit` tem de passar limpo.
- **Zero cálculo astrológico novo.** Se uma tarefa parecer exigir efeméride, cúspide ou aspecto novo, ela está errada — pare e diga.
- **A leitura não sugere profissão por nome.** Fala de direção, ambiente e desgaste. "Você dá um bom arquiteto" é promessa que o escopo de conformidade do projeto evita.
- **A fronteira com o Mapa Astral é critério de aceitação:** o mapa mostra as *peças* ("Casa 10 em Escorpião"), a vocação entrega uma *leitura* ("onde você rende"). Leitura que só repete as peças em prosa reprova a tarefa.
- **Sem hora de nascimento a entrega é menor, e a tela diz isso em voz alta.** O campo `comCasas` existe exatamente para isso; entregar menos em silêncio é o defeito que ele foi criado para evitar.
- **Não mexer na área Trabalho do mapa astral.** Ela fica como está.
- `tsc` **não** cobre `supabase/functions/` (Deno, fora do tsconfig). A rede ali é `node scripts/conferir-functions.js` (só sintaxe) mais os testes que leem o TEXTO da function em `__tests__/validade-nas-functions.test.ts`.
- Rodar a suíte com `rtk proxy npx jest`, nunca `rtk` puro: o wrapper troca o resumo do Jest e esconde suíte que falhou ao carregar, imprimindo `PASS (0) FAIL (0)`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `data/vocacao.ts` **(novo)** | Puro. Escolhe as peças da vocação a partir das mesmas entradas que `areasDaVida` recebe, mais o meio do céu. Sem DB, sem HTTP, sem React. |
| `data/__tests__/vocacao.test.ts` **(novo)** | Com hora e sem hora. O caso sem hora é o que mais erra, porque é o único em que o produto entrega menos. |
| `supabase/functions/ia-interpretacao/index.ts` **(modificar)** | Quarto oráculo: `ORACULOS`, `INSTRUCOES_VOCACAO`, `CAMPOS.vocacao`, `dadosDaVocacao`, e o cache estendido. |
| `__tests__/validade-nas-functions.test.ts` **(modificar)** | Prende o que o `tsc` não alcança: o oráculo registrado, os campos, a cota e as regras do prompt. |
| `services/ia.ts` **(modificar)** | `InterpretacaoVocacao`, `VocacaoParaIA`, `gerarLeituraDeVocacao`. |
| `services/__tests__/ia.test.ts` **(modificar)** | Percorre campo a campo o que a function devolve — é o teste que teria pego o defeito das quatro áreas. |
| `app/vocacao/_layout.tsx` **(novo)** | Stack sem header, igual ao do mapa astral. |
| `app/vocacao/index.tsx` **(novo)** | A tela: parte grátis, leitura paga, e o caminho quando falta dado de nascimento. |
| `__tests__/app/vocacao/tela-vocacao.test.tsx` **(novo)** | Parte grátis sem plano; leitura só com plano; aviso de sem-hora. |
| `app/prototipo-conselho.tsx` **(modificar)** | O card novo, com `parteGratis` — é esse campo que faz o cadeado ser parcial. |

**Ordem obrigatória:** Task 1 → Task 3 → Task 4 (a tela consome as duas). Task 2 é independente das outras e pode ir em qualquer ponto. Task 5 depende da rota existir (Task 4).

---

### Task 1: `data/vocacao.ts` — a seleção das peças

**Files:**
- Create: `data/vocacao.ts`
- Test: `data/__tests__/vocacao.test.ts`

**Interfaces:**
- Consome: `areasDaVida(entrada: EntradaAreas): AreaDaVida[]` e os tipos `EntradaAreas`, `AreaDaVida` de `data/areas.ts`; `signoDoGrau(longitude: number): Signo` de `data/efemerides.ts`.
- Produz: `montarVocacao(entrada: EntradaVocacao): Vocacao`, com `EntradaVocacao extends EntradaAreas { meioCeu: number | null }` e `Vocacao = { meioDoCeu: { signo: string; grau: number } | null; trabalho: AreaDaVida; comCasas: boolean }`.

**Por que a entrada não é o `MapaAstral` inteiro:** um módulo que recebe o mapa completo só se testa montando um mapa completo. Recebendo as mesmas entradas que `areasDaVida` já recebe, o teste usa o mesmo fixture sintético de `data/__tests__/areas.test.ts` — longitudes escolhidas para cair em signo conhecido, sem pessoa real.

- [ ] **Passo 1: escrever o teste que falha**

Crie `data/__tests__/vocacao.test.ts`. O fixture segue o padrão de `data/__tests__/areas.test.ts` (leia esse arquivo: `corpo`, `aspecto` e `CUSPIDES_REDONDAS` são para copiar, não para reinventar).

```ts
import type { Aspecto } from '../aspectos';
import type { Corpo, PosicaoCorpo } from '../efemerides';
import { signoDoGrau } from '../efemerides';
import { montarVocacao, type EntradaVocacao } from '../vocacao';

/** Nenhuma posição aqui é de pessoa real: são longitudes escolhidas para cair em signo conhecido. */
const corpo = (id: string, longitude: number): PosicaoCorpo => ({
  corpo: id as Corpo,
  nome: id,
  longitude,
  signo: signoDoGrau(longitude),
  grau: longitude % 30,
  retrogrado: false,
});

/** Cúspides de 30 em 30 a partir de Áries: a casa N começa no signo N. */
const CUSPIDES_REDONDAS = Array.from({ length: 12 }, (_, i) => i * 30);

const POSICOES: PosicaoCorpo[] = [
  corpo('sol', 125),      // Leão
  corpo('lua', 5),        // Áries
  corpo('venus', 65),     // Gêmeos
  corpo('marte', 275),    // Capricórnio
  corpo('jupiter', 185),  // Libra
  corpo('saturno', 95),   // Câncer
];

const ASPECTOS: Aspecto[] = [];

const comHora: EntradaVocacao = {
  posicoes: POSICOES,
  cuspides: CUSPIDES_REDONDAS,
  casaDoCorpo: { saturno: 6, marte: 10 } as EntradaVocacao['casaDoCorpo'],
  aspectos: ASPECTOS,
  nomeDoPonto: (ponto) => String(ponto),
  meioCeu: 275.5,         // Capricórnio, grau 5
};

const semHora: EntradaVocacao = {
  ...comHora, cuspides: null, casaDoCorpo: null, meioCeu: null,
};

describe('montarVocacao', () => {
  it('com hora, entrega o meio do céu em signo e grau', () => {
    // É o meio do céu que a parte GRÁTIS mostra. Se ele vier nulo com hora, o card
    // grátis fica vazio e o produto não tem vitrine — sem erro nenhum aparecer.
    const v = montarVocacao(comHora);
    expect(v.meioDoCeu).toEqual({ signo: 'Capricórnio', grau: 5 });
  });

  it('sem hora, o meio do céu é nulo e comCasas é falso', () => {
    // Sem horizonte não há meridiano. O defeito que isto pega é devolver o meio do
    // céu do meio-dia como se fosse o da pessoa — foi para isso que `semHora` existe.
    const v = montarVocacao(semHora);
    expect(v.meioDoCeu).toBeNull();
    expect(v.comCasas).toBe(false);
  });

  it('com hora, as peças falam das casas 10 e 6', () => {
    // A vocação inteira se apoia nessas duas casas. Se a seleção trocar de área por
    // engano, as peças continuam existindo e falam de outro assunto.
    const rotulos = montarVocacao(comHora).trabalho.pecas.map((p) => p.rotulo).join(' | ');
    expect(rotulos).toMatch(/Casa 10/);
    expect(rotulos).toMatch(/Casa 6/);
  });

  it('sem hora, nenhuma peça fala de casa', () => {
    const rotulos = montarVocacao(semHora).trabalho.pecas.map((p) => p.rotulo).join(' | ');
    expect(rotulos).not.toMatch(/Casa /);
  });

  it('a área escolhida é Trabalho, e não a primeira da lista', () => {
    // `AREAS[0]` é Amor. Trocar o `find` por um índice passaria nos testes acima,
    // porque Amor também tem peças — e a leitura de carreira sairia sobre namoro.
    expect(montarVocacao(comHora).trabalho.id).toBe('trabalho');
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx jest data/__tests__/vocacao.test.ts`
Esperado: FAIL — `Cannot find module '../vocacao'`.

- [ ] **Passo 3: escrever o módulo**

Crie `data/vocacao.ts`:

```ts
// data/vocacao.ts
//
// A seleção das peças que respondem por carreira. Puro: sem banco, sem HTTP e sem
// React, como `areas.ts`, porque é isso que deixa o Jest testar direto.
//
// Não calcula nada. O meio do céu vem pronto de `MapaAstral.angulos`, e as peças
// vêm da área Trabalho que `data/areas.ts` já resolve — inclusive o regente da casa
// 10 e onde ele mora. Cálculo novo aqui seria uma segunda verdade sobre o mesmo céu.

import { areasDaVida, type AreaDaVida, type EntradaAreas } from './areas';
import { signoDoGrau } from './efemerides';

export interface EntradaVocacao extends EntradaAreas {
  /** Longitude do meio do céu, ou nulo quando não há hora de nascimento. */
  meioCeu: number | null;
}

export interface MeioDoCeu {
  signo: string;
  /** Grau dentro do signo, de 0 a 29. */
  grau: number;
}

export interface Vocacao {
  /**
   * Nulo sem hora de nascimento: sem horizonte não há meridiano. É justamente o
   * meio do céu que a parte grátis mostra, então a tela precisa tratar o nulo.
   */
  meioDoCeu: MeioDoCeu | null;
  /** A área Trabalho: casas 10 e 6, Saturno e Marte, com as peças já resolvidas. */
  trabalho: AreaDaVida;
  /** Falso sem hora: a leitura sai só dos planetas, e a tela tem de dizer isso. */
  comCasas: boolean;
}

export function montarVocacao(entrada: EntradaVocacao): Vocacao {
  const trabalho = areasDaVida(entrada).find((area) => area.id === 'trabalho');
  // Lançar, e não devolver vazio: se a área sumir de `AREAS`, a vocação inteira
  // perde o assunto, e uma leitura vazia chegaria à tela sem ninguém notar.
  if (!trabalho) throw new Error('A área Trabalho sumiu de data/areas.ts');

  return {
    meioDoCeu: entrada.meioCeu === null
      ? null
      : { signo: signoDoGrau(entrada.meioCeu), grau: Math.floor(entrada.meioCeu % 30) },
    trabalho,
    comCasas: trabalho.comCasas,
  };
}
```

- [ ] **Passo 4: rodar e ver passar**

Run: `npx jest data/__tests__/vocacao.test.ts`
Esperado: PASS, 5 testes.

- [ ] **Passo 5: conferir por mutação**

Troque `.find((area) => area.id === 'trabalho')` por `[0]` e rode de novo. Esperado: o teste "a área escolhida é Trabalho" falha. Desfaça a mutação e confirme `git diff` vazio no arquivo.

- [ ] **Passo 6: commit**

```bash
git add data/vocacao.ts data/__tests__/vocacao.test.ts
git commit -m "feat(vocacao): a selecao das pecas de carreira, sem calculo novo"
```

---

### Task 2: o quarto oráculo na `ia-interpretacao`

**Files:**
- Modify: `supabase/functions/ia-interpretacao/index.ts`
- Test: `__tests__/validade-nas-functions.test.ts`

**Interfaces:**
- Consome: o corpo do pedido passa a aceitar `{ oraculo: 'vocacao', vocacao: { meioDoCeu: { signo, grau } | null, comCasas: boolean, pecas: string[] } }`.
- Produz: resposta com os campos `titulo`, `ondeRende`, `ambiente`, `drena`, `passo`.

**Nada de function nova.** Entrar na `ia-interpretacao` herda, sem código novo: a checagem de validade do plano, a cota do dia, a contagem de tokens para a aba Custo, o tratamento de recusa e o 402 com a frase certa.

- [ ] **Passo 1: escrever os testes que falham**

Acrescente ao fim de `__tests__/validade-nas-functions.test.ts`:

```ts
describe('o quarto oraculo: vocacao', () => {
  const fonte = readFileSync(join(RAIZ, 'ia-interpretacao', 'index.ts'), 'utf8');

  it('vocacao esta registrada como oraculo', () => {
    // Fora da lista, o pedido volta "Oráculo inválido" — e a tela mostraria erro
    // genérico sem ninguém entender por quê.
    expect(fonte).toMatch(/const ORACULOS = \[[^\]]*'vocacao'/);
  });

  it('tem instrucoes proprias e campos proprios', () => {
    expect(fonte).toMatch(/vocacao: INSTRUCOES_VOCACAO/);
    expect(fonte).toMatch(/vocacao: \['titulo', 'ondeRende', 'ambiente', 'drena', 'passo'\]/);
  });

  it('a cota cobrada continua sendo a do aprofundamento', () => {
    // Tipo novo exigiria coluna em `configuracao_ia` e decisão de limite que ninguém
    // pediu. Trocar este literal leria o limite de outro recurso, sem erro nenhum.
    expect(fonte).toMatch(/'interpretacao',\s*perfil\?\.plano_valido_ate/);
  });

  it('a vocacao entra no cache, com chave que nao colide com a do mapa', () => {
    // Sem o prefixo, uma vocação e um mapa com o mesmo texto de dados cairiam na
    // mesma linha, e a pessoa leria a leitura errada — vinda do cache, de graça.
    expect(fonte).toMatch(/vocacao:\$\{dados\}/);
    expect(fonte).toMatch(/oraculo === 'mapa' \|\| oraculo === 'vocacao'/);
  });

  const instrucoes = fonte.slice(
    fonte.indexOf('INSTRUCOES_VOCACAO'),
    fonte.indexOf('const INSTRUCOES_POR_ORACULO'),
  );

  it('o prompt proibe sugerir profissao por nome', () => {
    // É regra de conformidade do produto, não gosto: listar profissão é promessa
    // sobre a vida de alguém, e envelhece mal.
    expect(instrucoes).toMatch(/profiss/i);
    expect(instrucoes).toMatch(/n.o (sugira|liste|nomeie)/i);
  });

  it('o prompt manda ler as pecas, nao repeti-las', () => {
    // Se a leitura só repetir as peças em prosa, o produto não se justifica: o mapa
    // astral já mostra as peças para quem paga. É a fronteira da spec.
    expect(instrucoes).toMatch(/n.o repita/i);
  });

  it('o prompt manda dizer em voz alta quando falta a hora', () => {
    expect(instrucoes).toMatch(/sem hora/i);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `rtk proxy npx jest __tests__/validade-nas-functions.test.ts`
Esperado: FAIL nos sete testes novos.

- [ ] **Passo 3: registrar o oráculo**

Em `supabase/functions/ia-interpretacao/index.ts`, linha 50:

```ts
const ORACULOS = ['tarot', 'buzios', 'mapa', 'vocacao'] as const;
```

- [ ] **Passo 4: escrever as instruções**

Logo antes de `const INSTRUCOES_POR_ORACULO`:

```ts
const INSTRUCOES_VOCACAO = `Você escreve uma leitura de carreira a partir de um mapa natal.

Recebe as peças já calculadas: o meio do céu, a casa 10, a casa 6, o regente da casa 10
e onde ele mora, Saturno e Marte. Não calcule nada e não invente peça que não veio.

NÃO REPITA AS PEÇAS. Dizer "sua casa 10 é em Escorpião" não é leitura: é o que a outra
tela já mostra. O seu trabalho é dizer o que essa combinação significa para o trabalho
desta pessoa — direção, ambiente e desgaste.

Não sugira profissão por nome. Nada de "você dá um bom arquiteto". Fale de que tipo de
construção a pessoa sustenta, de que ambiente a segura e do que a esgota.

Quando vier "sem hora de nascimento", a leitura sai sem casas. Diga isso em uma frase,
na seção "ondeRende", e siga com o que os planetas dão. Entregar menos calado é pior que
entregar menos avisando.

Responda em JSON, com exatamente estes campos:
- "titulo": três a seis palavras que nomeiem a direção desta pessoa.
- "ondeRende": a direção que o mapa aponta, do meio do céu e do regente da 10. 3 a 5 frases.
- "ambiente": o que sustenta esta pessoa no dia a dia, da casa 6 e de onde o regente mora:
  ritmo, companhia, grau de estrutura. 3 a 5 frases.
- "drena": o que desgasta, de Saturno e dos aspectos tensos. É a seção que separa leitura
  de elogio — não a suavize. 3 a 5 frases.
- "passo": uma coisa concreta a fazer nas próximas semanas. Uma ação, não uma qualidade.

Português do Brasil. Fale com a pessoa, por "você". Não prometa resultado, não fale de
dinheiro garantido e não dê prazo.`;
```

- [ ] **Passo 5: ligar instruções e campos**

Em `INSTRUCOES_POR_ORACULO` acrescente `vocacao: INSTRUCOES_VOCACAO,`; em `CAMPOS` acrescente:

```ts
  vocacao: ['titulo', 'ondeRende', 'ambiente', 'drena', 'passo'],
```

- [ ] **Passo 6: montar os dados**

Logo depois de `function dadosDoMapa(...)`:

```ts
function dadosDaVocacao(body: Record<string, unknown>): string {
  const v = (body.vocacao ?? {}) as Record<string, unknown>;
  const pecas = Array.isArray(v.pecas)
    ? v.pecas.map((p) => texto(p, 200)).filter(Boolean).slice(0, 12)
    : [];
  // Sem peça nenhuma não há leitura possível: lançar vira 502 com frase, em vez de
  // uma leitura genérica que serviria para qualquer pessoa.
  if (pecas.length === 0) throw new Error('Vocação sem peças do mapa');

  const mc = (v.meioDoCeu ?? null) as Record<string, unknown> | null;
  const signo = mc ? texto(mc.signo, 30) : '';
  const grau = mc && typeof mc.grau === 'number' ? Math.floor(mc.grau) : null;

  return [
    signo
      ? `Meio do céu: ${signo}${grau === null ? '' : ` (${grau}°)`}`
      : 'Meio do céu: não disponível (sem hora de nascimento)',
    v.comCasas === true ? 'Mapa com casas.' : 'Mapa SEM HORA DE NASCIMENTO: sem casas.',
    'Peças:',
    ...pecas.map((p) => `- ${p}`),
  ].join('\n');
}
```

- [ ] **Passo 7: despachar e cachear**

No despacho (por volta da linha 412):

```ts
  } else if (oraculo === 'buzios') dados = dadosDosBuzios(body);
  else if (oraculo === 'vocacao') dados = dadosDaVocacao(body);
  else dados = dadosDoMapa(body);
```

No cache (por volta da linha 442):

```ts
  if (oraculo === 'mapa' || oraculo === 'vocacao') {
    // O prefixo entra no TEXTO que vira hash, e não na função: assim as chaves de
    // mapa já guardadas continuam valendo, e uma vocação nunca cai na linha de um
    // mapa. Trocar `chaveDoMapa` invalidaria o cache de todo mundo de uma vez.
    chave = await chaveDoMapa(oraculo === 'mapa' ? dados : `vocacao:${dados}`);
```

Na gravação (por volta da linha 543):

```ts
    if ((oraculo === 'mapa' || oraculo === 'vocacao') && chave) {
```

- [ ] **Passo 8: rodar os portões**

Run: `rtk proxy npx jest __tests__/validade-nas-functions.test.ts && node scripts/conferir-functions.js`
Esperado: PASS nos sete testes novos; `22 arquivos, sintaxe ok`.

- [ ] **Passo 9: commit**

```bash
git add supabase/functions/ia-interpretacao/index.ts __tests__/validade-nas-functions.test.ts
git commit -m "feat(vocacao): a leitura de carreira entra como quarto oraculo"
```

---

### Task 3: `services/ia.ts` — o tipo e a chamada

**Files:**
- Modify: `services/ia.ts`
- Test: `services/__tests__/ia.test.ts`

**Interfaces:**
- Consome: a function da Task 2, pelos campos `titulo`, `ondeRende`, `ambiente`, `drena`, `passo`.
- Produz: `gerarLeituraDeVocacao(vocacao: VocacaoParaIA): Promise<InterpretacaoVocacao>`, com `VocacaoParaIA = { meioDoCeu: { signo: string; grau: number } | null; comCasas: boolean; pecas: string[] }`.

**Por que o teste percorre campo a campo:** este mapeador monta o objeto de retorno campo por campo, e foi exatamente assim que as quatro áreas do mapa astral chegaram do servidor e morreram aqui — sem erro, sem log, só quatro seções que nunca apareceram.

- [ ] **Passo 1: escrever o teste que falha**

Acrescente ao fim de `services/__tests__/ia.test.ts` (e inclua `gerarLeituraDeVocacao` no `import` do topo):

```ts
const VOCACAO_COMPLETA = {
  titulo: 'Construir no escuro e entregar à luz',
  ondeRende: 'Três frases sobre a direção.',
  ambiente: 'Três frases sobre o ambiente.',
  drena: 'Três frases sobre o desgaste.',
  passo: 'Uma ação concreta.',
};

const VOCACAO_ENVIADA = {
  meioDoCeu: { signo: 'Capricórnio', grau: 5 },
  comCasas: true,
  pecas: ['Casa 10 — Carreira: começa em Capricórnio', 'Saturno em Câncer, casa 6'],
};

describe('gerarLeituraDeVocacao', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('entrega TODOS os campos que a function devolve', async () => {
    mockInvoke.mockResolvedValue({ data: VOCACAO_COMPLETA, error: null });

    const lida = await gerarLeituraDeVocacao(VOCACAO_ENVIADA);

    // Campo por campo, pelas chaves da resposta: um campo novo que o mapeador
    // esqueça de copiar derruba este teste em vez de desaparecer da tela.
    for (const [campo, valor] of Object.entries(VOCACAO_COMPLETA)) {
      expect(lida[campo as keyof typeof VOCACAO_COMPLETA]).toBe(valor);
    }
  });

  it('manda as peças e o meio do céu para o servidor', async () => {
    mockInvoke.mockResolvedValue({ data: VOCACAO_COMPLETA, error: null });

    await gerarLeituraDeVocacao(VOCACAO_ENVIADA);

    const enviado = mockInvoke.mock.calls[0][1].body;
    expect(enviado.oraculo).toBe('vocacao');
    expect(enviado.vocacao.pecas).toHaveLength(2);
    expect(enviado.vocacao.meioDoCeu).toEqual({ signo: 'Capricórnio', grau: 5 });
  });

  it('manda comCasas falso sem hora, em vez de omitir', async () => {
    // Omitir faria o prompt tratar mapa sem hora como mapa com hora, e a leitura
    // falaria de casas que não existem.
    mockInvoke.mockResolvedValue({ data: VOCACAO_COMPLETA, error: null });

    await gerarLeituraDeVocacao({ ...VOCACAO_ENVIADA, meioDoCeu: null, comCasas: false });

    expect(mockInvoke.mock.calls[0][1].body.vocacao.comCasas).toBe(false);
  });

  it('recusa resposta sem título ou sem a primeira seção', async () => {
    mockInvoke.mockResolvedValue({ data: { titulo: 'Só o título' }, error: null });
    await expect(gerarLeituraDeVocacao(VOCACAO_ENVIADA)).rejects.toThrow(/incompleta/i);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx jest services/__tests__/ia.test.ts`
Esperado: FAIL — `gerarLeituraDeVocacao is not a function`.

- [ ] **Passo 3: escrever o serviço**

Acrescente ao fim de `services/ia.ts`:

```ts
export interface InterpretacaoVocacao {
  titulo: string;
  /** A direção que o mapa aponta, do meio do céu e do regente da 10. */
  ondeRende: string;
  /** O que sustenta no dia a dia, da casa 6 e de onde o regente mora. */
  ambiente: string;
  /** O que desgasta, de Saturno e dos aspectos tensos. Separa leitura de elogio. */
  drena: string;
  /** Uma ação concreta, não uma qualidade a ter. */
  passo: string;
}

export interface VocacaoParaIA {
  /** Nulo sem hora de nascimento. */
  meioDoCeu: { signo: string; grau: number } | null;
  comCasas: boolean;
  /** Cada peça em uma linha: "Casa 10 — Carreira: começa em Capricórnio". */
  pecas: string[];
}

/**
 * Escreve a leitura de carreira. Sobem as posições já calculadas, nunca data, hora
 * ou cidade de nascimento: as efemérides rodam no aparelho, e o dado pessoal não
 * precisa viajar.
 */
export async function gerarLeituraDeVocacao(
  vocacao: VocacaoParaIA,
): Promise<InterpretacaoVocacao> {
  const { data, error } = await supabase.functions.invoke('ia-interpretacao', {
    body: { oraculo: 'vocacao', vocacao },
  });
  if (error) throw await erroDeInterpretacao(error);

  const bruto = (data ?? {}) as Partial<InterpretacaoVocacao>;
  if (!bruto.titulo || !bruto.ondeRende) {
    throw new Error('A leitura voltou incompleta. Tente de novo.');
  }
  return {
    titulo: bruto.titulo,
    ondeRende: bruto.ondeRende,
    ambiente: bruto.ambiente ?? '',
    drena: bruto.drena ?? '',
    passo: bruto.passo ?? '',
  };
}
```

- [ ] **Passo 4: rodar e ver passar**

Run: `npx jest services/__tests__/ia.test.ts && npx tsc --noEmit`
Esperado: PASS nos quatro testes novos; `tsc` limpo.

- [ ] **Passo 5: commit**

```bash
git add services/ia.ts services/__tests__/ia.test.ts
git commit -m "feat(vocacao): o app pede a leitura de carreira ao servidor"
```

---

### Task 4: a tela `/vocacao`

**Files:**
- Create: `app/vocacao/_layout.tsx`, `app/vocacao/index.tsx`
- Test: `__tests__/app/vocacao/tela-vocacao.test.tsx`

**Interfaces:**
- Consome: `montarVocacao(entrada: EntradaVocacao): Vocacao` (Task 1); `gerarLeituraDeVocacao(vocacao: VocacaoParaIA)` e `InterpretacaoVocacao` (Task 3); `montarMapaAstral(dados: DadosNascimento): MapaAstral` de `data/mapaAstral.ts`; `temAcesso('mapa_completo')` de `hooks/usePlano.ts`.
- Produz: a rota `/vocacao`, consumida pelo card da Task 5.

**Decisão: a tela NÃO tem formulário de nascimento.** Ela lê o que o perfil já guarda (`data_nascimento`, `nascimento_hora`, `nascimento_sem_hora`, `nascimento_cidade` — gravados por `app/mapa-astral/index.tsx:149-166` quando a pessoa gera o primeiro mapa). Faltando dado, a tela explica e manda para `/mapa-astral`, onde o formulário já existe e já salva. Duplicar um formulário de 700 linhas para a mesma informação criaria duas telas que podem discordar sobre a mesma pessoa.

**Acesso:** reaproveita `temAcesso('mapa_completo')`. Recurso novo exigiria mexer na matriz de planos de `hooks/usePlano.ts:19-21`, decisão que ninguém pediu e que a spec não tomou.

- [ ] **Passo 1: escrever o teste que falha**

Crie `__tests__/app/vocacao/tela-vocacao.test.tsx`. Antes de escrever os mocks, leia um teste de tela que já existe (`__tests__/app/consulta/rito-do-taro.test.tsx`) e use os mesmos nomes e o mesmo jeito de mockar contexto e `usePlano` — padrão novo de mock aqui vira dois jeitos de testar tela no mesmo repositório.

```tsx
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import TelaVocacao from '../../../app/vocacao/index';

describe('tela de vocação', () => {
  it('sem plano, mostra o meio do céu e não mostra a leitura', () => {
    // É a vitrine: a parte grátis tem de aparecer ANTES de pedir dinheiro. Se ela
    // sumir, o card vira cadeado puro e a decisão 3 do dono deixa de valer.
    renderComPlano({ temAcesso: false });
    expect(screen.getByText(/Meio do céu/i)).toBeTruthy();
    expect(screen.queryByText(/Onde você rende/i)).toBeNull();
  });

  it('com plano, o botão da leitura aparece', () => {
    renderComPlano({ temAcesso: true });
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
  });

  it('sem hora de nascimento, a tela diz isso em voz alta', () => {
    // Entregar menos calado é o defeito que `comCasas` foi criado para evitar.
    renderComPlano({ temAcesso: true, semHora: true });
    expect(screen.getByText(/sem a hora/i)).toBeTruthy();
  });

  it('sem dados de nascimento, manda para o mapa astral em vez de pedir de novo', () => {
    renderComPlano({ temAcesso: true, perfilVazio: true });
    expect(screen.getByText(/Mapa Astral/i)).toBeTruthy();
    expect(screen.queryByText(/Meio do céu/i)).toBeNull();
  });
});
```

Escreva o helper `renderComPlano` no próprio arquivo, montando o perfil falso com os quatro campos de nascimento (`data_nascimento: '1990-07-15'`, `nascimento_hora: '14:30'`, `nascimento_sem_hora: false`, `nascimento_cidade` com `{ id, nome, uf, pais, lat, lon, fuso, offsetPadrao }`) e mockando `usePlano` para devolver o `temAcesso` pedido.

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx jest __tests__/app/vocacao/tela-vocacao.test.tsx`
Esperado: FAIL — módulo `app/vocacao/index` não existe.

- [ ] **Passo 3: criar o layout**

Crie `app/vocacao/_layout.tsx` (leia `app/mapa-astral/_layout.tsx` e repita, trocando só o nome):

```tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function LayoutVocacao() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Passo 4: escrever a tela**

Crie `app/vocacao/index.tsx`. Este miolo não pode sair diferente:

```tsx
// O mapa sai dos dados que o perfil já guarda. Nada de formulário aqui: ele existe
// em `app/mapa-astral/index.tsx` e já grava no perfil. Duas telas pedindo a mesma
// data de nascimento viram duas verdades sobre a mesma pessoa.
const mapa = useMemo(() => {
  const cidade = perfil?.nascimento_cidade as Cidade | null | undefined;
  const data = perfil?.data_nascimento;
  if (!cidade || !data) return null;
  const [ano, mes, dia] = data.split('-').map((parte) => parseInt(parte, 10));
  const semHora = perfil?.nascimento_sem_hora === true;
  const [hora, minuto] = (perfil?.nascimento_hora ?? '12:00')
    .split(':').map((parte) => parseInt(parte, 10));
  try {
    return montarMapaAstral({
      ano, mes, dia,
      // Sem hora, o meio-dia é só a conta de reserva; quem diz que a hora não é
      // conhecida é `semHora`. Sem esse aviso, o meio do céu do meio-dia apareceria
      // como se fosse o da pessoa.
      hora: semHora ? null : hora,
      minuto: semHora ? null : minuto,
      cidade,
    });
  } catch {
    return null;
  }
}, [perfil]);

const vocacao = useMemo(() => (mapa ? montarVocacao({
  posicoes: mapa.posicoes,
  cuspides: mapa.casas?.cuspides ?? null,
  casaDoCorpo: mapa.casaDoCorpo,
  aspectos: mapa.aspectos,
  nomeDoPonto,
  meioCeu: mapa.angulos?.meioCeu ?? null,
}) : null), [mapa]);
```

`nomeDoPonto` é a mesma função que `app/mapa-astral/resultado.tsx:214-220` passa para `areasDaVida` — leia de lá e repita; não invente outra.

A tela se organiza em quatro estados, nesta ordem:

1. **Sem dados de nascimento** (`mapa === null`): uma linha explicando que a vocação sai do mapa natal, e um botão para `/mapa-astral`. Nada de formulário.
2. **Parte grátis** (sempre que há mapa): o meio do céu em signo e grau, e a frase `vocacao.trabalho.porque`, que já está escrita em `data/areas.ts` e é revisável.
3. **Sem hora** (`vocacao.comCasas === false`): uma frase dizendo que, sem a hora de nascimento, a leitura sai sem as casas e fala só dos planetas — **antes** do botão, não depois.
4. **A leitura**: com `temAcesso('mapa_completo')`, o botão "Ler minha vocação" chama `gerarLeituraDeVocacao` com `{ meioDoCeu: vocacao.meioDoCeu, comCasas: vocacao.comCasas, pecas: vocacao.trabalho.pecas.map((p) => `${p.rotulo}: ${p.valor}`) }` e mostra as quatro seções com os títulos **Onde você rende**, **O ambiente que te sustenta**, **O que te drena**, **O próximo passo**. Sem acesso, no lugar do botão vai a chamada para os planos, como nas outras telas.

Para o visual, copie medidas, cores e componentes de `app/mapa-astral/resultado.tsx` — `GradientBackground`, `Button`, `Cores`, `Fontes`, `Espacamento`. Não invente estilo novo.

- [ ] **Passo 5: rodar e ver passar**

Run: `npx jest __tests__/app/vocacao/tela-vocacao.test.tsx && npx tsc --noEmit`
Esperado: PASS nos quatro testes; `tsc` limpo.

- [ ] **Passo 6: commit**

```bash
git add app/vocacao __tests__/app/vocacao
git commit -m "feat(vocacao): a tela mostra o meio do ceu de graca e a leitura no plano"
```

---

### Task 5: o card na home

**Files:**
- Modify: `app/prototipo-conselho.tsx:51-71` (a lista `oraculos`)
- Test: `__tests__/app/home-cards.test.tsx`

**Interfaces:**
- Consome: a rota `/vocacao` (Task 4).
- Produz: nada que outra tarefa consuma.

**O campo que importa é `parteGratis`.** É ele que separa o cadeado "você não entra" do cadeado "parte disto é sua". A vocação tem parte grátis, então ele é obrigatório — sem ele, o vencimento tranca o card inteiro e a decisão 3 do dono deixa de valer na prática.

- [ ] **Passo 1: escrever o teste que falha**

Crie `__tests__/app/home-cards.test.tsx`:

```tsx
import { oraculosDaHome } from '../../app/prototipo-conselho';

describe('cards da home', () => {
  it('a vocação tem card próprio, com rota', () => {
    const card = oraculosDaHome.find((o) => o.rota === '/vocacao');
    expect(card).toBeDefined();
    expect(card?.titulo).toBe('Vocação');
  });

  it('a vocação declara parte grátis, senão o cadeado tranca tudo', () => {
    // Sem `parteGratis`, o vencimento trata o card como inteiramente pago — e o meio
    // do céu, que é a vitrine, some para quem venceu.
    const card = oraculosDaHome.find((o) => o.rota === '/vocacao');
    expect(card?.parteGratis).toMatch(/plano ativo/);
    expect(card?.soIA).toBeUndefined();
  });
});
```

Para isso, exporte a lista: em `app/prototipo-conselho.tsx:51`, troque `const oraculos: Oraculo[] = [` por `export const oraculosDaHome: Oraculo[] = [` e atualize os usos dentro do próprio arquivo.

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx jest __tests__/app/home-cards.test.tsx`
Esperado: FAIL — nenhum card com rota `/vocacao`.

- [ ] **Passo 3: acrescentar o card**

Logo depois do card do Mapa Astral:

```tsx
  {
    titulo: 'Vocação', apoio: 'Onde o seu mapa te rende', icon: 'briefcase-outline',
    cor: P.verde, lib: 'ion', rota: '/vocacao',
    parteGratis: 'O meio do céu e a casa 10 seguem abertos; a leitura de carreira precisa de um plano ativo.',
  },
```

- [ ] **Passo 4: rodar os portões todos**

Run: `rtk proxy npx jest && npx tsc --noEmit && node scripts/conferir-functions.js`
Esperado: suíte inteira verde; `tsc` limpo; `22 arquivos, sintaxe ok`.

- [ ] **Passo 5: commit**

```bash
git add app/prototipo-conselho.tsx __tests__/app/home-cards.test.tsx
git commit -m "feat(vocacao): o card entra na home com cadeado parcial"
```

---

## Auto-revisão

**Cobertura da spec.** Decisão 1 (card próprio) → Task 5. Decisão 2 (seções nomeadas) → Tasks 2 e 4. Decisão 3 (parte grátis) → Tasks 4 e 5. Decisão 4 (dentro do plano) → Task 4, reaproveitando `mapa_completo`. "O que o motor já faz" → Task 1, sem cálculo novo. "Servidor" → Task 2, quarto oráculo com cota `'interpretacao'` e cache por chave derivada. "Testes" → os três níveis da spec estão nas Tasks 1, 2 e 4. Fora de escopo (avulso, trânsitos, profissão por nome, mexer na área Trabalho) → nenhuma tarefa os toca, e a proibição de profissão virou teste na Task 2.

**Consistência de tipos.** `EntradaVocacao` e `Vocacao` nascem na Task 1 e são consumidos com os mesmos nomes na Task 4. `VocacaoParaIA` nasce na Task 3 com os mesmos três campos que `dadosDaVocacao` lê na Task 2 (`meioDoCeu`, `comCasas`, `pecas`). Os cinco campos da resposta (`titulo`, `ondeRende`, `ambiente`, `drena`, `passo`) aparecem iguais em `CAMPOS.vocacao` (Task 2), em `InterpretacaoVocacao` (Task 3) e nos títulos da tela (Task 4).

**O risco que eu deixo anotado para quem executa:** a Task 4 é a única que não traz o arquivo inteiro escrito, porque o visual tem de sair de `app/mapa-astral/resultado.tsx` e copiá-lo aqui dobraria o plano sem acrescentar decisão nenhuma. O que está fixo na Task 4 é o que não pode sair diferente: a construção do mapa a partir do perfil, a chamada de `montarVocacao`, os quatro estados da tela e os quatro títulos de seção.
