# Tarô fiel — Design

**Data:** 2026-10-01 · **Status:** desenho validado em protótipo, aguardando plano

Nasceu de uma avaliação de especialistas: *"o tarô do app é muito simples"*. O desenho abaixo foi
construído e aprovado passo a passo num protótipo navegável, com as cartas e os textos reais do app.

## O que havia de errado

| | Antes | Prática real |
|---|---|---|
| Baralho | 22 Arcanos Maiores | 78 cartas |
| Leitura da carta | um `significado` | direita **e** invertida |
| Posição | rótulo passado/presente/futuro | define o sentido da carta |
| Arte | um ícone do Ionicons num retângulo | a cena é o método de leitura |
| Embaralhamento | `sort(() => Math.random() - 0.5)` | — |
| Ritual | uma tela de respiração | o consulente corta e tira as cartas |

**O embaralhamento é defeito, não estilo.** Um comparador com `Math.random() - 0.5` não produz
permutação uniforme: algumas cartas saem menos que outras, em silêncio. Num produto em que o
sorteio **é** o produto, isso é honestidade, não detalhe. `app/leitura-do-dia.tsx:49` tem o mesmo
problema por outro caminho — `Math.random` cru sobre 22 cartas faz quem usa todo dia ver repetição
em semanas, o que lê como app quebrado.

## A regra que governa tudo

**O gesto decide, a animação mostra.** Toda interação do rito altera a ordem real do baralho.
Nenhum movimento é encenação por cima de uma ordem já sorteada.

É por isso que o recolhimento dos montes tem riffle **visual** mas não embaralha: embaralhar ali
apagaria os cortes da pessoa e devolveria o problema do `Math.random`, só que mais bonito.

## O rito, como ficou no protótipo

1. **Intenção, opcional.** "O que te trouxe aqui?" Quem escreve recebe leitura sobre aquilo; quem
   não escreve recebe uma leitura que **diz** que não sabe e devolve a aplicação à pessoa. O que
   não pode existir é o app não perguntar e depois afirmar "com base no que você pensou".
2. **Escolha da tiragem:** três cartas ou Cruz Celta.
3. **O leque.** O baralho abre em arco, de costas. Ao mover o dedo, **o monte inteiro que sairia
   acende e sobe** — a escolha é "até onde", não "qual carta".
4. **O corte.** O toque parte o baralho ali: `baralho.slice(0, i+1)` vira um monte de lado, o leque
   fica com o resto. Livre, até dez vezes, perguntando a cada corte.
5. **O recolhimento.** Os montes voltam na ordem em que saíram, o resto do leque por cima, com o
   riffle como animação.
6. **A distribuição.** As posições aparecem **vazias, cada uma com a sua pergunta**, e a pessoa
   **arrasta a carta de cima do monte** para a posição que quiser. Pousa de costas, vira. Tocar no
   monte manda para a próxima vaga, para quem não quiser arrastar. O monte leva borda dourada e
   rótulo "Pegue daqui": sem isso ele se confunde com os versos do leque, que não se pegam.

Posições vazias e visíveis desde o começo foram um achado do protótipo: é o que faz a Cruz Celta se
explicar sozinha, porque as dez perguntas são lidas antes de qualquer resposta.

## As três fases, separadas pela dívida de conteúdo

O código é barato; os textos não. Esta separação é o centro da spec.

### Fase 1 — zero texto novo

- **Fisher-Yates** em `data/tarot.ts` (`sortearCartas`) e em `app/leitura-do-dia.tsx`.
- **O rito inteiro** — leque, corte em montes, riffle, arraste — com os **22 Arcanos Maiores** que
  já existem.
- **A arte de 1909** para os 22. A leitura do Rider-Waite é leitura da cena; sem imagem o método
  não existe.

Isto já responde à maior parte do "muito simples", e pode subir sozinho.

### Fase 2 — 32 textos, escritos na voz aprovada

- **Invertidas dos 22** (22 textos).
- **As dez posições da Cruz Celta** (10 frases).

A voz foi aprovada em amostra: abre pela cena, fala com a pessoa, não promete futuro, e a invertida
**não é o contrário** — é a mesma força travada, atrasada ou virada contra. Inverter o significado é
o erro que tarólogo reconhece na hora.

Uma frase por **posição**, não por carta em cada posição: dez na Cruz Celta, não setecentas e
oitenta. Combinar carta com posição é trabalho da leitura — e é nisso que o custo de IA é gasto.

### Fase 3 — 112 textos, e não depende de código

Os **56 Arcanos Menores**: significado e conselho de cada um. Quatro naipes com elemento e domínio —
espadas/ar/mente, paus/fogo/ação, copas/água/afeto, ouros/terra/matéria — mais quatro cartas de
corte por naipe, que representam **pessoas** ao redor, não temas.

Caminho recomendado: *The Pictorial Key to the Tarot* (Waite, 1911, domínio público) como espinha
factual, reescrito na voz do Arcanus e revisado por tarólogo. **Significado de carta não tem dono;
redação tem** — a tradição é livre, as frases de cada autor não.

Esta fase **bloqueia** o baralho de 78, e só ela.

## O que muda no código

**`data/tarot.ts`** — `CartaTarot` ganha `invertido` e `arte`, e para os Menores `naipe`, `elemento`
e `dominio`. `sortearCartas` passa a Fisher-Yates.

**Componentes novos:** o leque com o corte, o monte arrastável, e a lâmina que vira. Com
`react-native-reanimated` e `react-native-gesture-handler`, **já instalados** (4.1 e 2.28) — nenhuma
dependência nova.

**`ia-interpretacao`** — o payload passa a levar, por carta: a posição, a orientação e, quando
houver, a intenção. O prompt cresce, então o custo medido de **US$ 0,031** por aprofundamento de
tarô vai subir; medir na aba Custo depois de subir, e decidir ali se vale.

**Nada quebra no histórico.** `consultas.resultado` guarda um objeto JSON completo, não índices de
carta — cada leitura salva é um retrato fechado de si mesma.

## Testes

- **Fisher-Yates:** que toda posição recebe toda carta ao longo de muitas execuções, e que o
  resultado é permutação — nenhuma carta repetida, nenhuma perdida. É o teste que o embaralhamento
  antigo não passaria.
- **O corte é real:** cortar no índice `i` produz exatamente `[...resto, ...monte]` na ordem; e a
  mesma sequência de cortes, a partir do mesmo baralho, produz a mesma tiragem. Prende que a
  animação não decide nada.
- **O recolhimento não embaralha:** a ordem final é função só dos cortes. Se alguém puser um
  `embaralhar()` no riffle, este teste fica vermelho.
- **A tela sem intenção não afirma intenção:** nenhuma string sobre "o que você pensou" quando o
  campo está vazio.

## Fora de escopo

- **Outras tiragens** além de três cartas e Cruz Celta.
- **Guardar a intenção** no banco. Ela vai ao prompt e não é persistida — texto livre sobre a vida
  de alguém é dado sensível, e guardar pede decisão própria.
- **Arte em alta resolução** para impressão ou compartilhamento.
- **Trocar os textos dos 22 que já existem.** A Fase 2 acrescenta as invertidas, não reescreve as
  direitas.

## Riscos

**A confirmação jurídica da arte é do dono.** Domínio público nos EUA por publicação em 1909, e no
Brasil pelos 70 anos após a morte de Pamela Colman Smith, em 1951. Baixar para avaliar é uma coisa;
distribuir num produto pago é outra, e pede confirmação de quem entende antes de a Fase 1 subir.

**Os textos da Fase 3 feitos às pressas pioram o produto.** 112 textos rasos são piores que 22 bons:
quem reclamou de simples vai reclamar de genérico, e com razão. Melhor atrasar a Fase 3 que
entregá-la mal.
