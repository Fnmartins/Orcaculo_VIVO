# Conselho de Custo e Oferta — a cota, o teste e o que o Painel controla

Data: 30/09/2026
Status: **Decisão tomada — vira três especificações, na ordem da seção final**

## A pergunta do Fabiano

"Vamos seguir com o limite diário. Eu quero definir a quantidade por mês lá dentro do nosso Painel, com a
média de custo, e quero o gratuito como teste com prazo — não como plano para sempre. Joguem minhas ideias e
as suas observações no conselho e tomem a decisão."

Três vozes na mesa: **produção e custo**, **comercial**, e **produto de assinatura**.

---

## O que esta conversa tem que as anteriores não tinham: número medido

Todo conselho anterior sobre oferta discutiu intuição. Este discute medição. Em 29 e 30/09 o projeto passou a
gravar tokens e caracteres por uso (`uso_ia`), e três chamadas reais foram medidas:

| o que a pessoa faz | entrada | saída | **custo real** | repete? |
|---|---|---|---|---|
| Aprofundar o mapa astral | 3.547 | 5.433 | **US$ 0,123** | **não** — cacheado por posições, para sempre |
| Aprofundar uma tiragem de tarô | 671 | 1.393 | **US$ 0,031** | **sim** — tiragem nova, sem cache |
| Uma pergunta na caixa | 763 | 217 | **US$ 0,0074** | sim |
| Leitura de imagem (café, mão) | — | — | ~US$ 0,024 simples / ~US$ 0,10 completa | sim |
| Leitura falada (voz) | — | 3.000 caracteres (teto) | **US$ 0,030** | cacheada por hash |

Uma amostra de cada: a saída varia com a tiragem e com o céu. A ordem de magnitude, não.

**Preços dos planos** (de `app/planos.tsx`, podendo ser sobrescritos por moeda em `config_planos`):
Iniciante R$ 29,90 · Explorador R$ 79,90 · Mestre R$ 199,90.

### A primeira conclusão, e ela inverte a intuição

**O que é caro é o que não repete. O que repete é barato.**

O aprofundamento do mapa custa 4× o tarô e 17× uma pergunta — e é o único que a pessoa faz **uma vez na
vida**, porque os dados de nascimento moram na conta e o resultado fica cacheado. Uma pergunta, que parece "a
coisa da IA que dá medo de liberar", custa **três quartos de um centavo**.

> **Produção e custo:** limitar pergunta a duas por dia economiza um centavo e meio por pessoa e custa a
> sensação de que o app é mesquinho. É o pior negócio da tabela.

---

## Camada 1 — O gratuito deixa de ser plano e passa a ser prazo

**Decidido: teste de 10 dias, um uso de IA por dia, escolhido pela pessoa.**

Dez e não catorze, porque catorze dias de teste com muita gente entrando é conta real; e dez e não sete
porque há seis ou sete cards, e a pessoa precisa de folga para repetir o que gostou.

Um por dia **compartilhado** — não um de cada. A pessoa escolhe: hoje a mão, amanhã o mapa, depois o tarô. O
que ela escolheu, gastou.

### O que não entra no orçamento diário

**Só conta o que chama IA.** Numerologia, mapa numerológico, matriz do destino e lei da atração são
calculados no aparelho: custam zero. Limitá-los empobrece o teste de graça.

> **Produto de assinatura:** o que faz alguém voltar no dia 4 de um teste não é a leitura paga — é ter o que
> abrir. Os cards calculados são presença diária sem custo marginal. Cobrar cota deles é pagar para reduzir a
> própria conversão.

### O teto que isso cria

1 mapa (US$ 0,123, e nunca mais) + 9 usos do mais caro no nível básico (~US$ 0,031) =
**~US$ 0,40 por conta de teste, no pior caso imaginável.**

Mil cadastros são **US$ 400 no teto absoluto**, e na prática uma fração disso, porque quase ninguém usa os
dez dias. Com o dólar a 5,50 — premissa, não dado — um mês de Iniciante paga cerca de treze contas de teste
no teto.

> **Comercial:** esse número é o que permite fazer campanha sem medo. Antes dele, "quantos cadastros eu
> aguento?" não tinha resposta, e a resposta prudente era sempre "menos".

### O que acontece no dia 11

**Bloqueia.** A conta continua existindo, o histórico fica, o mapa que a pessoa já viu continua visível — mas
nada de IA sem assinar. O gratuito não vira plano magro permanente.

> **Produto de assinatura:** gratuito permanente cria custo perpétuo por cadastro e quase não converte — quem
> assina, assina no calor do teste. O plano magro parece generoso e é, na prática, uma assinatura de custo que
> ninguém paga.

---

## Camada 2 — O cartão, e o botão que não deve cobrar

**Decidido: o cartão pode entrar a qualquer momento do teste; a cobrança acontece no fim, nunca antes.**

A ideia original era pedir o cartão no dia 7 para liberar a segunda semana. O conselho fundiu isso com o botão
"assinar agora": **são a mesma coisa**, e cobrar na hora é o único jeito de errar.

Se alguém aperta "assinar agora" no dia 3 e é cobrado ali, ela **perde sete dias que já eram dela** e paga o
mesmo valor. Isso produz arrependimento, pedido de reembolso e avaliação ruim — os três de uma vez.

O botão certo diz **"garantir minha assinatura"**: guarda o cartão agora, cobra no dia 11. A pessoa ganha a
certeza de não perder acesso, o projeto ganha o cartão antes do vencimento, e ninguém paga por dia que não
usou. Na Stripe é o mesmo mecanismo — `trial_end` fixo, cartão coletado quando a pessoa quiser.

### Três condições, sem as quais a cobrança automática volta como problema

1. **Aviso antes de cobrar.** A Stripe emite `customer.subscription.trial_will_end` três dias antes. Sem
   e-mail nesse gancho, cobrança automática vira reembolso e nota baixa. É a mesma estrada do item 13 do
   roadmap: o código do e-mail já existe, falta a chave do Resend.
2. **Cancelar em um toque, à vista.** `criar-portal-stripe` já existe; precisa estar visível, não escondido. E
   no momento de guardar o cartão, a tela diz **a data e o valor** em português claro.
3. **Validade que vale.** Ver a camada 4 — hoje ela não existe.

> **Comercial:** o aviso de três dias não reduz conversão de forma relevante; reduz disputa. Quem cancela por
> causa do aviso ia pedir reembolso depois, com mais atrito e pior reputação.

---

## Camada 3 — Os limites dos planos pagos, recalibrados pelo custo

**Decidido: limite por tipo, com teto diário e teto mensal.** Hoje existe um número só (`limite_dia`),
aplicado por tipo, igual para todos — o que trata como iguais coisas que custam 17× diferente.

| tipo | custo | diário | mensal | por quê |
|---|---|---|---|---|
| pergunta | 0,0074 | generoso | — | é o mais barato de longe; restringir só irrita |
| tarô / búzios | 0,031 | **3** | **20** | o que de fato repete |
| mapa | 0,123 | baixo | — | cacheado: na prática a pessoa gasta uma vez |
| imagem | ~0,10 | baixo | sim | o segundo mais caro, e o único sem cache nenhum |

O **teto mensal não existe hoje** e é mecanismo novo. `uso_ia` guarda uma linha por dia, então somar o mês é
uma consulta — mas a tela precisa dizer **qual** dos dois limites bateu. Se a pessoa lê "3 de 3 hoje" quando
o problema é o teto do mês, ela espera até amanhã e bate na parede de novo.

> **Produção e custo:** separar mapa de tarô no contador é a correção mais urgente desta camada. Hoje os dois
> são `tipo = 'interpretacao'`: quem aprofunda o mapa gasta a cota do tarô, e o mapa é justamente o que não
> repete. A distorção pune o uso que não custa.

---

## Camada 4 — A fresta que o conselho encontrou

**Não existe máquina de validade neste projeto.**

`perfis.plano_valido_ate` é gravada pelo webhook da Stripe e lida em **um lugar só** —
`app/(tabs)/perfil.tsx:94` — apenas para mostrar "dias até renovar". **Nada confere essa data para dar ou
negar acesso.** Quem decide acesso é `perfis.plano`.

Duas consequências:

- **O teste de dez dias depende dessa máquina**, e ela precisa ser construída, não configurada.
- **Existe uma fresta hoje:** se um webhook da Stripe falhar ou nunca chegar, a data passa e o acesso
  continua, para sempre, em silêncio. O acesso pago inteiro depende de um webhook chegar.

A correção serve aos dois casos e é pequena: **uma função pura de plano efetivo** — recebe plano e validade,
devolve o plano que vale agora — em `_shared/limites.ts`, onde as decisões testáveis já moram, usada pelas
quatro functions e pela tela. Validade deixa de ser enfeite e passa a ser regra.

> **Produção e custo:** esta é a única linha deste documento que já é um risco, não um plano. As outras
> melhoram o produto; esta fecha um vazamento.

---

## Camada 5 — O Painel: o dono define, e vê o que a decisão custa

**Decidido: a cota por plano passa a ser editável no Painel, com projeção de custo ao lado.**

Um controle que mostra apenas "20 por mês" não ajuda a decidir. Ao lado de cada limite, a tela mostra **quanto
aquele número custa se as pessoas o usarem**, em faixas:

| faixa | o que a tela mostra |
|---|---|
| 50 assinantes | custo/mês no teto e custo/mês no uso médio observado |
| 100 assinantes | idem |
| 500 assinantes | idem |

Duas colunas, não uma: **teto** (todos usando tudo) e **observado** (a média que a aba Custo já mede). O teto
sozinho assusta e leva a limite mesquinho; a média sozinha esconde o pior caso.

### O câmbio tem de aparecer

O custo é em **dólar** e o preço em **real**. Qualquer projeção de margem carrega uma taxa — e taxa envelhece.
A tela diz **com qual dólar está calculando e de quando é essa cotação**, do mesmo jeito que `precos_ia` diz
`confirmado_em`. Número de moeda sem data é mentira com data marcada.

> **Comercial:** a pergunta que esse Painel responde não é "quanto gastei" — a aba Custo já responde. É "posso
> subir o limite do Explorador sem furar a margem?". Para isso o número tem de estar ao lado do campo onde se
> digita, não noutra tela.

---

## O que fica fora, explicitamente

- **Cachear tarô e búzios.** Cada tiragem é diferente; cache ali seria devolver a leitura de outra tiragem. O
  cache do mapa existe porque o mapa é determinístico.
- **Baixar o esforço do modelo para economizar.** `ia-interpretacao` roda em `effort: 'high'`, e 89% do custo
  é saída — baixar para `medium` cortaria perto de um terço. **Fica fora de propósito:** é troca de qualidade
  por dinheiro, e a US$ 0,12 por mapa (uma vez por pessoa) não há pressa. A aba Custo mostrará quando houver.
- **Plano gratuito permanente em qualquer forma.** Decidido na camada 1.
- **Cota compartilhada entre planos pagos.** O orçamento único é do teste; nos pagos, limite por tipo.

---

## O que não foi decidido, e precisa ser antes da implementação

1. **Conta nova quando o teste vence.** Nada impede criar outra conta com outro e-mail e ganhar dez dias. A
   confirmação de e-mail exige caixa real, o que limita — não impede. Opções conhecidas: aceitar (o teto é
   US$ 0,40 por conta), exigir cartão já no dia 1 (mata conversão), ou marcar o aparelho (privacidade e falso
   positivo). **O conselho recomenda aceitar por enquanto e medir.**
2. **Os números dos limites pagos.** A tabela da camada 3 tem a forma, não os valores de cada plano. O Painel
   da camada 5 existe justamente para o dono escolhê-los vendo o custo.
3. **O que "nível básico" significa em cada card durante o teste.** Imagem tem simples e completa; o mapa tem
   básico e completo. O teste usa o simples — mas isso precisa virar configuração, não adjetivo.

---

## A ordem de construção

Três especificações independentes. O conselho recomenda esta ordem, e a razão de cada posição importa mais que
a posição:

1. **Plano efetivo por validade** (camada 4). Primeiro porque é a única que corrige um vazamento que já
   existe, e porque as outras duas dependem dela: sem validade que vale, não há teste com prazo.
2. **Teste de 10 dias com um uso por dia** (camadas 1 e 2). É a que muda a oferta, e a que a campanha do item
   17 espera.
3. **Cota editável no Painel com projeção de custo** (camadas 3 e 5). Última porque é a única que pode
   esperar: enquanto ela não existe, os limites continuam ajustáveis por SQL.

Cada uma vira spec própria em `docs/superpowers/specs/`, plano próprio, e entrega própria.
