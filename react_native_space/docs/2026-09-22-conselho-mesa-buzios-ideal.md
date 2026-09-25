# Conselho de Oraculistas — a mesa de búzios ideal

Data: 22/09/2026
Status: **Briefing de design — descreve o alvo, não o que existe hoje**

## A pergunta do Fabiano

"Esqueçam o que a gente tem aqui. Como seria o modelo perfeito de peneira, ou de superfície de leitura
de búzios, em termos de design — místico e profissional ao mesmo tempo?"

## Princípio que vem antes do desenho

O jogo acontece, na prática, sobre objetos **consagrados**, que pertencem a quem foi iniciado. Um
aplicativo não deve representá-los: nem ferramentas de orixá, nem otás, nem imagens de entidades, nem
marcas de pemba com significado ritual. O conselho é unânime nisso, e a consequência é libertadora para
o design: a mesa do Arcanus **não imita um terreiro**. Ela é uma **superfície de leitura** — digna,
silenciosa, feita para que dezesseis conchas sejam vistas com clareza.

Daí saem duas regras que atravessam todo o resto:

1. **Nada de cenário.** Sem altar, sem velas, sem colares, sem imagens religiosas.
2. **A concha é a protagonista.** Tudo o que disputa atenção com ela está sobrando.

## O modelo ideal, camada por camada

### 1. Fundo
Superfície escura, lisa e sem textura marcada — madeira muito escura ou tecido fosco. Serve para dar
profundidade e sumir. Nada de gradiente colorido, nada de estrelas, nada de roxo místico.

### 2. Pano
Um pano claro, de algodão cru, estendido sob a peneira, aparecendo apenas como uma margem irregular de
poucos centímetros. Dá o ar de cuidado e de coisa preparada, sem virar decoração.

### 3. A peneira
O elemento central, e o mais importante.

- **Formato:** circular, rasa, de palha trançada em espiral a partir do centro.
- **Proporção:** ocupa de 80 a 88% da menor dimensão da tela. Menos que isso parece maquete; mais que
  isso encosta nas bordas e perde o ar de objeto pousado.
- **Trama:** espiral contínua, não anéis concêntricos perfeitos. A espiral é o que faz o olho ler
  "trançado à mão" em vez de "alvo de tiro". A densidade diminui do centro para a borda.
- **Irregularidade:** a palha real não é perfeita. Pequenas variações de espessura e de tom, e um
  contorno levemente oval, valem mais que qualquer efeito.
- **Aro:** borda mais escura, de fibra torcida, com dois a três por cento do diâmetro. É o que dá a
  sensação de objeto com volume.

### 4. Luz e profundidade
- Uma única fonte de luz, vinda de cima e um pouco à esquerda.
- Sombra curta e suave sob a peneira, e sombra própria de cada concha — pequena, deslocada de dois a
  três pixels. É a sombra da concha que faz a cena parecer real.
- Vinheta muito leve na borda da peneira, para o centro respirar.
- **Nada de brilho, glow ou reflexo.** Brilho é o que faz um objeto parecer plástico.

### 5. As conchas
- Dezesseis, todas do mesmo tamanho, com diâmetro entre 9 e 11% do diâmetro da peneira.
- **Aberta:** a face com a fenda serrilhada para cima, creme claro. **Fechada:** o dorso liso, mais
  escuro. A diferença precisa ser legível em miniatura, sem depender de cor.
- Caem dentro de 70% do raio da peneira, com posições e ângulos aleatórios, e **sem se sobrepor** —
  conchas empilhadas atrapalham a contagem, que é o coração da leitura.

### 6. Paleta
| Uso | Cor |
|---|---|
| Fundo | `#1A140F` |
| Pano | `#F0EADC` |
| Palha, luz | `#E8D6AC` |
| Palha, meio-tom | `#D2B784` |
| Palha, sombra | `#8A6A3C` |
| Aro | `#3A2A1C` |
| Concha aberta | `#F3EADB` |
| Concha fechada | `#6B5334` |
| Acento (só na interface, nunca na mesa) | `#D4AF37` |

Três famílias de cor no total. A regra do conselho: se aparecer uma quarta, algo está decorando.

### 7. Movimento
- As conchas caem com **peso**: aceleração, um quique curto de poucos pixels, e param. Nada de flutuar.
- Escalonadas em 40 a 60 milissegundos entre uma e outra; o conjunto inteiro se resolve em cerca de 1,2
  segundo. Mais que isso vira espetáculo e cansa em quem joga todo dia.
- Rotação sutil no ar, de até meia volta. Rodopio é brinquedo, não leitura.
- Som seco e curto no pouso, se houver som. Vibração leve.

### 8. O que fica fora da mesa
Título, contagem, nome do odu e botões vivem **fora** da peneira, no fundo escuro. A superfície de
leitura não carrega texto nem ícone.

## O que evitar, explicitamente

- Fotografia de mesa real com objetos consagrados, colares, cristais e búzios já dispostos.
- Imagens ou nomes de orixás como ornamento.
- Símbolos religiosos desenhados na palha.
- Brilhos, neon, roxo místico, partículas, estrelas piscando.
- Marca d'água de ferramenta de geração de imagem.
- Texto dentro da mesa.

## Acessibilidade

- Contraste entre concha aberta e fechada legível também em escala de cinza.
- Com "reduzir movimento" ligado, as conchas aparecem posicionadas, sem queda.
- O resultado sempre disponível em texto: quantas abertas, quantas fechadas, qual odu.

## Antes de publicar

Este briefing é a visão de um conselho conceitual. Antes de virar a mesa definitiva do Arcanus, deveria
passar pelos olhos de **uma pessoa iniciada que jogue búzios**, com uma pergunta simples: "isso
desrespeita alguma coisa?". É a mesma validação pendente para os textos dos odus.

## A pergunta do Márcio, e a resposta (24/09/2026)

No fio da decisão, dentro da aba Decisões, ele escreveu:

> "Se a mesa estiver sem as guias dos Orixás à volta e os símbolos, como saberemos quais orixás estão
> respondendo naquele momento?" — 24/09, 04:03, e às 06:10 a correção: "onde se lê ótica, leia-se Orixás".

É a objeção mais séria que esta proposta recebeu, porque não é sobre estética: é sobre a leitura
funcionar. Na mesa física, as guias e os símbolos ao redor são **referência de posição** — onde a concha
cai em relação à marca diz quem está respondendo.

**A resposta, em três partes.**

1. **No Arcanus, quem responde vem do odu, não da posição.** Os dezesseis odus já têm regente declarado,
   e a tela de resultado mostra "Regentes: Oxossi e Yemanjá" junto de abertos, fechados e elemento. Não é
   uma informação que falta; é uma informação que chega por outro caminho.
2. **Até 24/09 essa resposta estava quebrada, e isso ajudou a criar a dúvida.** A tela truncava o regente
   no primeiro nome (`split('/')[0]`), então os três odus de regência dupla — Oxossi/Yemanjá,
   Iansã/Egúm, Obá/Ogum — apareciam com um orixá só, e a interpretação escrita podia citar o outro.
   Corrigido em `regentesDoOdu` (`data/buzios.ts`), com teste, e já no ar.
3. **Desenhar as guias e os símbolos na palha é justamente o que o conselho recusa por unanimidade** —
   é a linha "imagens ou nomes de orixás como ornamento" e "símbolos religiosos desenhados na palha"
   acima. Não por timidez de design: um app não deve representar o que é consagrado e pertence a quem foi
   iniciado.

**O que fica aberto de propósito.** A leitura por posição — a que o Márcio descreve — é uma modalidade
diferente, não um detalhe da mesa. Ela cabe na ideia de **escolher a mesa antes de jogar** (24/09), do
mesmo jeito que se escolhe o pano no tarô: uma mesa com marcação, escolhida por quem sabe usá-la. Isso
é proposta separada, e só se faz com validação de uma pessoa iniciada — não entra nesta decisão.
