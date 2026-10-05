# Matriz do Destino — fontes, autoria e a questão de direitos

**Data:** 2026-10-05
**Decisão do dono, nesta data:** o produto fica **exatamente como está**, e a questão de
direitos vira pendência de parecer jurídico. Licenciar ou pagar percentual é um caminho
que só existe enquanto o produto está de pé e reconhecível; desmontá-lo antes de
perguntar fecharia essa porta.

Este documento existe para que essa conversa aconteça com o fato na mesa. Ele não é
parecer jurídico e não substitui um.

---

## O que é, e de quem é

A Matriz do Destino **não é tradição anônima**. Tem autora, data e escola.

- Foi criada por **Natalia Ladini** em **2006**, a partir do estudo dos 22 Arcanos
  Maiores do tarô. O nome original era *Diagnostics of Purpose* / *Diagnóstico do
  Destino*; depois foi publicada como *Matriz do Destino* (Матрица Судьбы).
- **Andrey Kravchuk** aparece nas fontes como quem estruturou o método como sistema de
  ensino.
- O sistema combina numerologia de base pitagórica com os arquétipos dos 22 arcanos,
  distribuídos num octograma: dois quadrados sobrepostos formando uma estrela de oito
  pontas.

**Ela tem vinte anos.** Não é prática milenar, e o app não deve sugerir que seja.

Nota de honestidade sobre a própria origem: circulam **pelo menos quatro versões
incompatíveis** sobre como o método nasceu. Nem a história de criação é consensual.

## A questão de direitos

**Isto é o que as fontes afirmam, não o que está verificado em cartório ou em registro de
patentes.** Nenhuma consulta a INPI, USPTO ou equivalente foi feita.

- As fontes descrevem Natalia Ladini como **titular dos direitos do método dos "22
  Códigos"**.
- Descrevem a técnica **"Matriz Pessoal" como patenteada**, e afirmam que só a Escola
  Ladini tem o direito de emitir certificações.
- Boa parte dessas afirmações vem de materiais da própria escola e de sites que a
  revendem, o que não as invalida, mas também não as confirma.

**O que isso vale no Brasil, e se a nossa implementação infringe algo, é pergunta para
advogado.** Método não é, em regra, protegido por direito autoral; a expressão dele pode
ser; e patente de método tem escopo territorial. Nada disso eu sei dizer com autoridade.

## O que a nossa implementação reproduz

Esta parte é factual e verificável lendo `data/matriz-destino.ts`.

Não se trata de coincidência entre dois sistemas numerológicos. O nosso `calcularMatriz`
reproduz **a arquitetura dela, com a nomenclatura dela**:

- **Quadrado pessoal nos pontos cardeais** — oeste (dia), norte (mês), leste (ano), sul
  (missão/karma), centro (essência).
- **Quadrado ancestral nas diagonais** — noroeste, nordeste, sudeste, sudoeste, lidos
  como linhas paterna e materna.
- **Linhas especiais** — linha do dinheiro, linha do amor, linha paterna, linha materna.
- **Cauda cármica.**
- **Sete chakras, cada um com três energias** (corpo, energia, emoções).

Qualquer avaliação jurídica precisa partir disso, e não de "usamos numerologia e
arcanos".

## O que é tradição livre, e seguiria nosso de qualquer forma

- **Os 22 Arcanos Maiores** e seus significados. É o mesmo argumento já registrado em
  `2026-10-02-fontes-de-taro.md`: o método e os sentidos são tradição livre; a redação de
  cada autor não é. Os textos de `ARCANOS` em `matriz-destino.ts` são nossos.
- **A numerologia pitagórica.** Reduzir data de nascimento a dígitos é prática de domínio
  público, que o app já usa em dois outros produtos (`numerologia.ts` e
  `mapa-numerologico.ts`).

## O que o app não diz hoje

O comentário no topo de `data/matriz-destino.ts` diz apenas *"Sistema baseado em
numerologia + 22 Arcanos Maiores do Tarô + chakras"*. **Não cita a autora, nem o ano, nem
a escola.** A tela também não.

Atribuir é, em geral, a mitigação mais barata que existe, e costuma ser o primeiro pedido
de quem detém um método. Fica registrado como opção para a conversa com o advogado, não
como decisão tomada.

## Validação

Não há estudo revisado por pares que valide o método, o que é esperado neste domínio e
coerente com a postura do projeto: o app não promete previsão nem resultado. Vale
registrar porque, se a conversa de licenciamento avançar, a linguagem de marketing da
escola é mais afirmativa que a nossa, e não devemos herdá-la junto com a licença.

## Fontes

- *Natalia Ladini's Journey*, Matrix of Destiny —
  <https://destinymatrics.com/discover-the-origins-of-the-matrix-of-destiny-natalia-ladinis-journey/>
- *Andrey and Natalia Ladini School* — <http://matrixladini.com/>
- *What Is the Destiny Matrix? Origin, Method & Chart* —
  <https://www.thematrixofdestiny.com/what-is-destiny-matrix>
- *Matriz do Destino: a nova queridinha merece sua atenção?*, Atheris —
  <https://atheris.substack.com/p/matriz-do-destino-a-nova-queridinha>
  (é a fonte que registra as quatro versões incompatíveis de origem)

## Pendência

**Parecer jurídico**, na mesma lista em que já está a arte de 1909 do tarô. Com uma
diferença que importa: no tarô o argumento é de domínio público e está documentado; aqui
é o contrário — método de 2006, autora viva, escola que afirma exclusividade.

Os caminhos que o dono levantou, para o advogado avaliar: pagar percentual ou licenciar;
atribuir; manter como está; ou reescrever de forma independente. O último foi considerado
e **adiado de propósito**, porque desmontar o produto antes de perguntar eliminaria a
possibilidade de acordo.
