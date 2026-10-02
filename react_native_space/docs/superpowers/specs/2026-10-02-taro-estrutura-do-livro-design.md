# A estrutura do jogo, como o livro ensina — e o que isso pede do código

**Data:** 02/10/2026
**Revisa:** `docs/superpowers/specs/2026-10-01-taro-fiel-design.md`
**Fonte principal:** *A Bíblia do Tarô*, Sarah Bartlett (Pensamento) — lida na edição digitalizada
**Fontes de apoio:** *Manual de Diagnóstico Espiritual com o Tarô*, Arlete Scantamburlo; resumo dos 78 arcanos do blog *Tarot Diário*
**Notas de leitura:** `docs/referencias/2026-10-02-fontes-de-taro.md`

> **Regra de uso.** Significado e método são tradição livre; a redação de cada autor não é. Nada aqui transcreve os livros — o que se registra é a *estrutura* do jogo, em nossas palavras, para que o sistema se adeque ao modelo e não o contrário.

---

## O erro de ordem que este documento corrige

A spec da Fase 1 decidiu escrever **uma frase por posição** e deixar a IA combinar carta com posição, para não escrever 780 textos. A conta estava certa e a decisão era defensável — mas foi tomada **antes** de alguém ler o modelo inteiro. É decisão econômica ocupando o lugar da decisão estrutural.

A ordem correta, e a que este documento segue: **entender o modelo → desenhar a estrutura que o atende → só então escolher onde economizar.** E economizar definindo padrões de análise, não cortando método.

---

## O modelo, como o livro o descreve

### 1. A carta não é um parágrafo — é um verbete com camadas

Cada carta ocupa duas páginas e tem quatro camadas distintas:

| Camada | Forma | Exemplo (Oito de Ouros) |
|---|---|---|
| **Palavras-chave** | 3 a 5 palavras soltas | habilidade, diligência, disciplina, conhecimento |
| **Frases-chave** | 6 a 8 frases curtíssimas | *dedicação ao trabalho*, *perseverança recompensada*, *situação repetitiva ou entediante* |
| **Interpretação** | prosa, dois a três parágrafos | o que a carta diz quando aparece |
| **Notas de posição** | uma ou duas frases, **dentro** da interpretação | *"numa posição de futuro…"*, *"quando está numa posição de obstáculo…"* |

**A descoberta que muda a conta:** o livro **não escreve um texto por carta em cada posição.** Ele escreve a interpretação uma vez e acrescenta uma nota curta só nas posições em que a carta lê diferente — em geral uma ou duas, não quatro. Não são 780 textos nem 88: são 22 interpretações mais um punhado de notas onde elas importam.

As quatro posições que o livro nomeia como chave: **você agora, passado, futuro, obstáculo**.

E o *Tarot Diário* fecha o círculo: ele trata "sentido revertido" e "posição de obstáculo" como a mesma leitura. **A nota de obstáculo e o texto de invertida são o mesmo texto.**

### 2. A tiragem tem geometria, nomes e regra própria

Cada tiragem no livro traz quatro coisas:

- **para que serve** — uma frase sobre quando usá-la;
- **a geometria** — o desenho das posições na mesa, que é arbitrário: linha, cruz, pirâmide, **círculo**;
- **o nome de cada posição** — numeradas, com rótulo curto;
- **um exemplo de leitura** completo.

Duas descobertas aqui:

**Geometria é dado, não layout.** "O ano à frente" dispõe doze cartas em círculo, uma por mês. "Tiragem da energia do dia" são três em cruz pequena. A Cruz Celta é só uma entre muitas. Um componente desenhado à mão por tiragem — como o nosso `CruzCelta.tsx` — não escala.

**Algumas tiragens têm regra de leitura além do layout.** No "ano à frente", começa-se pela carta do mês corrente e segue-se em ordem — ou seja, a **ordem de leitura não é a ordem de distribuição**.

### 3. A leitura termina em pergunta, não em veredito

Nos exemplos do livro, o texto de cada carta fecha devolvendo uma pergunta a quem consulta: *"você resiste a esses sentimentos ou os aceita?"*, *"até que ponto você é racional?"*

Isso não é só estilo. É o que separa leitura simbólica de afirmação sobre a vida de alguém — e é exatamente a postura que `docs/COMPLIANCE-SCOPE.md` exige de nós por outro caminho. A fonte e a nossa restrição concordam.

### 4. A mecânica da mesa (do *Manual*)

- A pergunta é **mentalizada durante o embaralhamento**, não antes dele.
- Embaralha, **corta**, distribui uma carta por casa.
- Variantes: uma carta por casa; **três** cartas por casa; ou **dois montes** — Maiores e Menores separados, um de cada por casa, onde **o Maior diz *o quê* e o Menor diz *como***.
- **Tiragens em sequência** sobre o mesmo assunto, podendo deixar a primeira aberta para comparar.
- **Leitura por proporção**: casa só de Maiores pesa mais; casa só de Menores indica questão mais leve.

---

## O que isso pede do código

### A. `CartaTarot` ganha camadas

```ts
export type PosicaoChave = 'agora' | 'passado' | 'futuro' | 'obstaculo';

export interface CartaTarot {
  id: number;
  nome: string;
  nomeCompleto: string;

  /** 3 a 5 palavras. Âncora curta — é o que a IA usa para não divagar. */
  palavrasChave: string[];
  /** 6 a 8 frases curtíssimas. O "sentimento" da carta. */
  frasesChave: string[];
  /** A interpretação em prosa. Substitui o atual `significado`. */
  interpretacao: string;
  conselho: string;

  /**
   * Nota curta só para as posições em que a carta lê diferente.
   * Opcional e parcial de propósito: o livro só escreve onde importa.
   */
  porPosicao?: Partial<Record<PosicaoChave, string>>;

  /** Serve também à posição `obstaculo` — é a mesma leitura. */
  invertida?: string;

  /** Só nos Menores. */
  naipe?: 'espadas' | 'paus' | 'copas' | 'ouros';
  elemento?: 'ar' | 'fogo' | 'agua' | 'terra';
  ehCorte?: boolean;
}
```

**Tudo que é novo entra opcional.** A estrutura pode subir hoje, com os campos vazios, e o conteúdo chega carta a carta sem nenhuma migração. É isto que responde "por que não agora": a estrutura pode ser agora; só o texto é que é lento.

### B. `Tiragem` ganha geometria e ordem de leitura

```ts
export interface PosicaoDaTiragem {
  nome: string;
  regra: string;
  /** Qual das quatro posições-chave esta posição é, quando é alguma. */
  chave?: PosicaoChave;
  /** Onde ela fica na mesa, em coordenada de grade. */
  lugar: { coluna: number; linha: number };
  /** Girada, como a carta que atravessa na Cruz Celta. */
  deitada?: boolean;
}

export interface Tiragem {
  id: string;
  nome: string;
  quando: string;
  posicoes: PosicaoDaTiragem[];
  /**
   * Ordem em que as posições são LIDAS, quando difere da ordem em que são postas.
   * "O ano à frente" começa pelo mês corrente.
   */
  ordemDeLeitura?: (agora: Date) => number[];
}
```

Com `lugar` em coordenada de grade, **um componente desenha qualquer tiragem** — linha, cruz, círculo, pirâmide. O `CruzCelta.tsx` escrito à mão vira um caso de dado, não de código, e acrescentar tiragem passa a ser acrescentar uma entrada.

### C. O payload da IA passa a levar material, não só rótulos

Hoje mandamos `{nome, posicao, regra, significado, invertida}`. Passa a levar, por carta: palavras-chave, frases-chave, a interpretação, **a nota de posição quando existir**, e a chave da posição.

**É aqui que mora a economia pedida.** O texto de carta é estático — custa zero de IA e é revisável por tarólogo num diff. A IA deixa de inventar o que a carta significa e passa a fazer só o que ela faz bem: **tecer** as cartas entre si e com a intenção. Menos token gasto, menos invenção, e a leitura fica ancorada em material humano.

### D. O prompt ganha duas regras do livro

1. **Fechar devolvendo uma pergunta** a quem consulta, como os exemplos do livro.
2. **Peso por proporção**: quando a tiragem tiver Maiores e Menores, dizer o que a predominância significa naquela casa. Regra calculável, enviada pronta no payload.

### E. A mecânica da mesa

- **Embaralhar com a pergunta na cabeça** — o gesto que saiu da tela de preparo (ali era enfeite) volta onde é verdadeiro: antes do leque abrir.
- **Mais de uma carta por posição** — `posicoes[].quantidade`, padrão 1.
- **Dois montes, Maior + Menor por casa** — depende dos Menores existirem.
- **Tiragens em sequência**, guardando a primeira para comparar.

---

## O que muda nas fases

| | Antes | Agora |
|---|---|---|
| **Estrutura** | não era fase; estava implícita | **entra primeiro, e pode entrar já** — campos opcionais, zero migração |
| **Fase 2** | 22 invertidas + 10 posições = 32 textos | 22 invertidas (que **são** a nota de obstáculo) + palavras-chave e frases-chave dos 22 + notas de posição onde importam |
| **Fase 3** | 112 textos dos Menores | o mesmo, com naipe, elemento e cartas da corte, que a estrutura já comporta |

A Fase 2 não ficou maior por causa da descoberta — ficou **mais bem dirigida**. O que ela ganhou de trabalho (palavras-chave e frases-chave) é o que mais barateia a IA depois.

## O que fica fora

O *Manual de Diagnóstico Espiritual* diagnostica condições espirituais — obsessores, vampirismo, inveja — e prescreve tratamento: limpeza energética, mesa radiônica, procurar um sacerdote. Isso contraria `docs/PRODUCT-MISSION.md` e `docs/COMPLIANCE-SCOPE.md`. **A mecânica dele entra; o vocabulário de diagnóstico não**, a menos que a missão mude antes.
