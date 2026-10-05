# Numerologia — fontes e procedência

**Data:** 2026-10-05

Cobre os dois produtos que compartilham a mesma base: **Numerologia**
(`data/numerologia.ts`) e **Mapa Numerológico** (`data/mapa-numerologico.ts`). Escrito na
mesma auditoria que produziu os documentos do tarô, do búzios e da Matriz do Destino, e
pela mesma razão: o app afirmava um método sem dizer de onde ele vem.

---

## O achado principal: "pitagórico" não é de Pitágoras

O nosso código chama o sistema de pitagórico em dois lugares — no cabeçalho de
`mapa-numerologico.ts` (*"Cálculo Pitagórico com passos preservados"*) e no nome da
constante `TABELA_PITAGORICA`. **A atribuição é herdada, não histórica.**

O que as fontes mostram:

- A tabela que converte letra em número, a distinção entre número de nome e número de
  nascimento, e os números mestres **11 e 22** aparecem pela primeira vez num livro de
  **L. Dow Balliett, publicado em 1908** (nascida Sarah Joanna Dennis, 1847).
- **Juno Jordan**, aluna de Balliett, fundou o California Institute of Numerical Research
  e, em **1965**, formalizou exatamente os cálculos que este app usa: **Caminho de Vida,
  Expressão, Alma (Soul Urge) e Personalidade**.
- Balliett **tomou emprestados o nome e a reputação de Pitágoras** para dar peso
  filosófico ao sistema. O método de converter letra em número e reduzir dígitos **não tem
  base documentada em nada que Pitágoras ou sua escola tenham escrito ou praticado**.

**Isto não invalida o sistema: situa-o.** Ele tem 118 anos e autoria conhecida, como a
Matriz do Destino tem vinte e a sua. A diferença prática é que Balliett e Jordan estão
mortas há décadas e o vocabulário entrou em uso comum; não há aqui a questão de direitos
que o documento da Matriz registra.

## Existe mais de um sistema, e nós escolhemos um

Nenhum dos dois módulos menciona isso: a **numerologia caldaica** usa outra tabela de
letras e produz **outros números para o mesmo nome**. Há ainda outras escolas.

A nossa tabela é uma escolha entre sistemas concorrentes, não o cálculo da numerologia.
Quem comparar o resultado do app com o de outro site pode encontrar números diferentes, e
isso não é erro de nenhum dos dois.

## Os números mestres

- **11 e 22** vêm do livro de Balliett, de 1908.
- **33** é acréscimo posterior, e nem todas as escolas o preservam.

O nosso código trata os três juntos (`ehMestre: numeroFinal === 11 || 22 || 33`), o que é
prática comum hoje, mas não é a formulação original.

## O que o app já faz bem

Diferente do búzios, o texto de tela **já se protege sozinho**. Cada verbete diz *"a
tradição associa este número a…"*, e um deles chega a dizer:

> *"Algumas escolas preservam o 11 e o associam a inspiração e sensibilidade. Isso é uma
> convenção simbólica, não evidência de poderes especiais."*

Quem escreveu isso estava sendo honesto. **O que faltava não era a ressalva: era a
procedência**, dizer que a tradição em questão tem nome, data e autora.

## O que é nosso

- **Os textos de cada número** (`NUMEROS`, e os verbetes de caminho, expressão, alma e
  personalidade). Significado de número é tradição livre; a redação de cada autor não é, e
  a nossa é nossa.
- **A exposição do passo a passo** (`PassoCalculo`, `CalculoDetalhado`). Mostrar a conta
  em vez de só o resultado é decisão de produto, e boa: deixa a pessoa conferir em vez de
  acreditar.
- **A escolha de preservar os mestres** na redução.

## Fontes

- *The History of Numerology: Origins, Pythagoras & More*, Numerologist —
  <https://numerologist.com/numerology/the-history-of-numerology>
- *The truth about Pythagorean Numerology*, Expanded Numerology —
  <https://www.expandednumerology.com/blog/the-truth-about-pythagorean-numerology>
- *The History of Numerology: From Pythagoras to the Present*, Number Destiny —
  <https://numberdestiny.com/guides/numerology-history/>
- *Numerology — A History*, Kyshara — <https://kyshara.com/disciplines/numerology>

## O que fazer com isso

Nada é urgente, e nada muda comportamento. Duas opções registradas, nenhuma decidida:

1. **Trocar o nome da constante e do cabeçalho** — de `TABELA_PITAGORICA` para algo que
   não atribua a Pitágoras. Custo: um rename mecânico. Ganho: o código para de repetir uma
   atribuição que as fontes desmentem.
2. **Dizer na tela que existe mais de um sistema** — uma linha, onde o resultado aparece,
   explicando que a caldaica dá outros números. Ganho: quem comparar com outro site não
   conclui que um dos dois está quebrado.

A primeira é higiene de código; a segunda é produto, e é do dono.
