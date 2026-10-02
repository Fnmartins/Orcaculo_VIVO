# Fontes de tarô, e o que elas mostram que falta no Arcanus

**Data:** 02/10/2026
**Para:** a Fase 2 e a Fase 3 do tarô (`docs/superpowers/specs/2026-10-01-taro-fiel-design.md`)

## As três fontes

| Fonte | O que é | Para que serve aqui |
|---|---|---|
| **Manual de Diagnóstico Espiritual com o Tarô** — Arlete Scantamburlo, 95 p. | Um método próprio de diagnóstico espiritual, com duas tiragens em sequência | Variantes de mecânica (seção A). **O conteúdo está fora do nosso escopo** — ver a seção C |
| **A Bíblia do Tarot** — Sarah Bartlett, digitalizada, 222 p. | Enciclopédia: carta a carta, e um catálogo de tiragens temáticas | Estrutura dos verbetes, posições-chave e repertório de tiragens |
| **Resumo dos 78 Arcanos** — blog *Tarot Diário*, 2 p. | Significados de todos os 78, normais e revertidos | Mapa da dívida de conteúdo das Fases 2 e 3 |

### Regra de uso destas fontes

**Significado e método são tradição livre; a redação de cada autor não é.** Nenhuma frase destes três materiais entra no app. Aproveita-se o que eles *ensinam* — a mecânica, a estrutura, a lista de posições —, reescrito na voz do Arcanus. É a mesma regra que a spec já fixou para *The Pictorial Key to the Tarot*.

Por isso este documento registra o método em nossas palavras e não transcreve trechos.

---

## A. Mecânica — dá para construir, não depende de texto novo

**1. A pergunta é mentalizada enquanto se embaralha.** Nas fontes de método, quem consulta segura a questão na cabeça *durante* o embaralhamento; é isso que liga a pergunta à tiragem. No app a intenção é digitada antes, e o embaralhamento é instantâneo e invisível — existe o corte, não existe o embaralhar. O gesto que saiu da tela de preparo (com razão, porque ali era enfeite) não voltou como gesto de verdade.

**2. Mais de uma carta por posição.** Scantamburlo descreve o mesmo jogo com 1 e com 3 cartas por casa, e diz o que muda: três dão mais detalhe e tornam a leitura mais longa. O app é fixo em uma.

**3. Dois montes, um Maior e um Menor por casa.** O que ela chama de Método Europeu: separa os 22 dos 56, embaralha cada monte, e cada casa recebe um de cada. A regra de leitura é clara e vale a pena — **o Arcano Maior diz *o quê* está acontecendo, o Menor diz *como* ou de onde vem.** Depende da Fase 3.

**4. Tiragens em sequência sobre o mesmo assunto.** O método dela encadeia duas: a primeira levanta o quadro, a segunda aprofunda. Entre uma e outra, recolhe e embaralha de novo — ou usa um segundo baralho para deixar a primeira aberta e **comparar as duas**. O app faz uma tiragem e termina.

**5. Tiragens temáticas pequenas, com posições próprias.** Bartlett organiza o catálogo por *o que você quer saber*, não por tamanho. Uma de três cartas chamada "Meu maior ponto fraco" tem as posições *ponto fraco atual*, *o que me ajudará a superá-lo* e *nova direção*. O app oferece duas tiragens genéricas; o repertório real é por assunto.

**6. Leitura por combinação.** A proporção entre Maiores e Menores numa casa muda o peso dela: casa só de Maiores pesa mais; casa só de Menores indica questão mais leve. **Isto é regra calculável, não texto** — o app pode dizer antes mesmo de ter significado escrito. Depende da Fase 3.

## B. Conteúdo — é Fase 2 e Fase 3

**7. Cartas invertidas.** Parte normal do método. Uma observação útil do *Tarot Diário*: ele trata "sentido revertido" e **"posição de obstáculo"** como a mesma leitura. Ou seja, a carta na posição *O que atravessa* da Cruz Celta já pede o tom de invertida, mesmo de pé. Isso barateia a Fase 2 — um texto serve aos dois casos.

**8. Os 56 Arcanos Menores.** Sem eles não existem os itens 3 e 6.

**9. Interpretação da carta *por posição*.** Bartlett dá, para cada carta, a interpretação principal **e** variações para posições-chave. Ela nomeia quatro: *você agora*, *passado*, *futuro* e *obstáculo*.

> **Isto contraria uma decisão da nossa spec**, que diz: *"uma frase por POSIÇÃO, não por carta em cada posição: dez na Cruz Celta, não setecentas e oitenta. Combinar carta com posição é trabalho da leitura."* A escolha foi deixar a IA combinar, para não escrever 780 textos.
>
> As fontes mostram um meio-termo que ninguém considerou: **quatro posições-chave, não dez.** Quatro variações × 22 Maiores = 88 textos, não 780 — e cobrem as posições que mais aparecem. Vale decidir antes de começar a Fase 2.

**10. Campos que as cartas não têm.** Bartlett estrutura cada verbete com palavras-chave, correspondência astrológica e correspondência numérica. O nosso `CartaTarot` tem `significado` e `conselho`, mais nada. Palavras-chave em especial são baratas e dão à IA uma âncora curta por carta.

**11. Cartas da corte são gente.** Valete, Cavaleiro, Rainha e Rei podem representar uma pessoa na vida de quem consulta, a própria pessoa, ou um acontecimento. Regra de leitura própria, que entra com a Fase 3.

## C. O que não entra sem decisão do dono

O *Manual de Diagnóstico Espiritual* não é um livro de tarô no sentido em que o Arcanus usa tarô. É um sistema para **diagnosticar condições espirituais** — identifica obsessores, vampirismo energético, inveja — e **prescreve tratamento**: limpeza energética, mesa radiônica, procurar um sacerdote ou uma instituição.

Isso bate de frente com `docs/PRODUCT-MISSION.md` e `docs/COMPLIANCE-SCOPE.md`: o app é análise simbólica, não diagnóstico; não afirma fato sobre a vida espiritual nem sobre a saúde de ninguém, e não prescreve tratamento. Uma leitura que diga "há um obsessor agindo sobre você, procure um sacerdote" é outra categoria de afirmação.

Dois pontos justos a favor do livro: ele recomenda explicitamente **psicólogo e psicanálise** ao lado do trabalho espiritual, o que é responsável; e a **mecânica** dele (seção A) é aproveitável sem nada do conteúdo.

**A mecânica entra. O vocabulário de diagnóstico não — a não ser que o dono decida mudar o que o Arcanus se propõe a ser, e aí a missão muda antes do código.**

---

## O que fazer com isto

1. **Decidir o item 9** — quatro posições-chave por carta, ou manter a combinação só na IA. Muda o tamanho da Fase 2.
2. **Item 7 sai de graça**: escrever o texto de invertida já servindo à posição de obstáculo.
3. **Item 1** é o único de mecânica que não depende da Fase 3, e devolve um gesto que o rito perdeu.
4. **Itens 3, 6 e 11** entram com os Menores, na Fase 3 — anotar na spec agora, para não serem redescobertos depois.
5. **Item 5** é escopo novo, não previsto em nenhuma fase. Fica para depois das três.
