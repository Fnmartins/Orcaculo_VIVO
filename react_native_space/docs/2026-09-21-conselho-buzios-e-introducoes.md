# Conselho de Oraculistas — Búzios e introduções dos oráculos

Data: 21/09/2026
Status: **Implementado, menos o I5.** B1 a B4 e I4 em 21 e 22/09; B5, I1, I2, I3 e B6 em 23/09, com os
ajustes do parecer abaixo. Segue aberta só a decisão 5 — o vídeo explicativo da numerologia.

## O que o Fabiano apontou

Usando o app em produção, em 21/09:

- **Búzios, preparação:** o vídeo do ritual de preparação começa cortado e é curto demais.
- **Búzios, mesa:** não está feia, mas está pequena e com cores demais.
- **Búzios, lançamento:** ao tocar em lançar, volta um vídeo parecido com o da preparação. A queda dos
  búzios em si está muito boa, mas destoa da mesa.
- **Tarô:** a introdução com uma bola e círculos em volta, tentando criar mistério, não funcionou. As
  introduções de cada oráculo, em geral, estão ruins e precisam ser trocadas.
- **Tarô, passado/presente/futuro:** a tela "Toque para revelar" não tem botão de voltar; quem quer
  desistir fica preso.
- **Numerologia:** falta uma introdução que explique o que é a numerologia — o ideal seria um vídeo
  renderizado, no tom holístico do app, apresentando o conceito. Hoje não existe.

## O que o código mostra

- **Preparação** (`app/consulta/buzios-preparo.tsx`): o vídeo tem 8 s e começa em 1,8 s, por isso o corte
  no início; em loop, recomeça no mesmo ponto, o que repete o corte. A tela dura 12,5 s obrigatórios
  (5 frases de 2,5 s), mas a barra de progresso termina em 10 s. Painel 16:9 de no máximo 520 px, sem som.
- **Mesa** (`app/consulta/buzios-jogo.tsx`): é a foto `assets/mesa-buzios.jpg`, em formato retrato,
  recortada num quadrado de no máximo 450 px. A foto **já mostra 16 búzios** arrumados na peneira, e o app
  desenha outros 12 por cima. Há guias de muitas cores, cristais, veludo vermelho e roxo — e, no canto
  inferior direito, a marca ✦ de uma ferramenta de edição por IA.
- **Lançamento:** um segundo vídeo de 8 s, iniciado em 2,2 s; só depois os búzios caem. A queda usa as
  conchas vetoriais aprovadas em 24/08, com animação de mola — o trecho que o Fabiano aprovou.
- **Tradição:** o app joga **12 búzios** e conhece 12 odus; o merindilogun, forma do jogo no candomblé,
  usa **16**. Não existem no app os odus 13 a 16 (Ejiologbon, Iká, Obeogundá, Alafiá), e "nenhum búzio
  aberto" vira o odu 12.
- **Frases:** "Conecte-se com os Orixás", "Os búzios estão sendo consagrados", "O axé está se
  manifestando", "Os Odus estão se alinhando". Consagrar búzios é ato de sacerdote; o app não pode afirmar
  que faz isso. O prompt da IA já foi corrigido nesse sentido em 26/08 — as frases de tela ficaram para trás.
- **Tarô** (`app/consulta/preparo.tsx`): a introdução é uma bola de cristal com anéis em órbita — objeto
  de outra prática (a cristalomancia), não do tarô.
- **Tarô, três cartas** (`app/consulta/cartas.tsx`): a tela não tem nenhum botão de voltar.

## Conselho

Papéis conceituais convocados para esta revisão. Nenhuma pessoa real participa ou endossa o produto.

- sacerdote ou sacerdotisa do candomblé com prática no merindilogun;
- pesquisador de religiões afro-brasileiras, com foco em representação respeitosa;
- taróloga com prática de atendimento;
- numeróloga, pelo conteúdo introdutório;
- diretor de arte;
- designer de movimento (motion);
- especialista em experiência do usuário;
- especialista em acessibilidade;
- responsável de produto, pelo custo e pela prioridade.

## Recomendações

### Búzios

**B1 — Jogar 16 búzios, como na tradição.** *(sacerdote, pesquisador — prioridade alta)* Doze búzios é o
primeiro detalhe que alguém do candomblé nota, e derruba a credibilidade de toda a leitura. Passar a 16
búzios e 16 odus, com o tratamento de "nenhum aberto" definido com quem conhece o jogo. A animação e as
conchas aprovadas continuam as mesmas, só em maior número.

**B2 — Trocar as frases por frases sobre a intenção de quem consulta.** *(sacerdote, pesquisador)* Sair de
"consagrados", "Conecte-se com os Orixás", "o axé está se manifestando", "os Odus estão se alinhando".
Entrar: "Respire", "Pense no que você quer compreender", "Quando estiver pronto, lance". O app convida à
reflexão; não afirma um ato religioso que não realiza.

**B3 — Uma mesa só, desenhada, maior e com menos cores.** *(diretor de arte, motion)* Uma peneira circular
de palha sobre fundo escuro liso, ocupando até ~92% da largura no celular e até ~720 px no computador.
Paleta de dois ou três tons: palha, madeira escura e um acento dourado. Sem búzios fotografados (duplicavam
os do jogo), sem guias coloridas, sem a marca da ferramenta de IA. Desenhada no mesmo traço das conchas,
ela resolve o "a queda está boa mas destoa": conchas vetoriais sobre mesa vetorial falam a mesma língua.

**B4 — Lançamento sem vídeo.** *(motion, experiência do usuário)* O vídeo do lançamento é o que repete a
preparação. O lançamento passa a ser só a animação aprovada, precedida de um gesto curto: segurar o botão
para "chacoalhar" (vibração e som já existem no app) e soltar para lançar. Mais participação, menos espera.

**B5 — Preparação curta e conduzida por quem consulta.** *(experiência do usuário, taróloga)* No lugar dos
12,5 s obrigatórios com barra de carregamento: 3 a 5 s de abertura, com "Pular", e o jogo começa quando a
pessoa toca em "Estou pronto". Se o vídeo for mantido, precisa ser novo — começar do início, sem corte no
loop e com duração planejada. Caso contrário, a abertura vira animação da própria peneira.

**B6 — Acessibilidade.** *(acessibilidade)* Respeitar o "reduzir movimento" do sistema (sem vídeo e com
animação mínima), manter as frases como texto legível e garantir contraste do texto sobre a mesa.

### Introduções dos oráculos

**I1 — Cada introdução usa o objeto da própria prática.** *(taróloga, diretor de arte)* Tarô: baralho sendo
embaralhado e cortado, cartas abrindo em leque. Búzios: a peneira. Numerologia: letras e números se
organizando. Mapa astral: o céu. A bola de cristal sai.

**I2 — Quem consulta conduz o ritual.** *(taróloga, experiência do usuário)* No tarô, quem pergunta
embaralha e corta. Tocar para embaralhar e tocar para cortar dá sentido à espera e reduz a sensação de
carregamento. Toda introdução tem "Pular".

**I3 — Um componente único de introdução.** *(produto)* A mesma estrutura para todos os oráculos, com
conteúdo próprio de cada um. Consistência, e manutenção num lugar só.

**I4 — Botão de voltar em toda etapa do jogo.** *(experiência do usuário)* A tela das três cartas do tarô
ganha voltar, e nenhuma etapa de nenhum oráculo fica sem saída. Correção pequena, pode ir antes do resto.

**I5 — Vídeo explicativo de cada oráculo, começando pela numerologia.** *(numeróloga, motion, produto)*
Um vídeo curto (40 a 60 s), renderizado, no tom holístico do app: o que é a prática, de onde vem, o que a
leitura oferece e o que ela não promete. Fica disponível antes da primeira leitura e depois num "O que é a
numerologia?", sem bloquear quem já conhece. Numerologia primeiro, porque é o oráculo mais conceitual; a
mesma peça pode ser feita depois para tarô, búzios e mapa astral.

## Parecer do conselho sobre a abertura proposta (23/09)

Proposta levada: um componente único de abertura para todos os oráculos, com objeto animado, frase curta,
"Pular" e "Estou pronto"; no tarô, tocar para embaralhar e tocar para cortar; no búzios, a peneira
surgindo; sem vídeo; respeitando "reduzir movimento".

**Aprovada, com três ajustes.**

1. **Um botão, não dois.** *(experiência do usuário)* Numa tela de três a cinco segundos, "Pular" e
   "Estou pronto" fazem a mesma coisa e obrigam a pessoa a escolher entre sinônimos. Fica só **Estou
   pronto**; no tarô, os próprios gestos avançam.
2. **O gesto precisa ter consequência.** *(taróloga)* Embaralhar só significa alguma coisa se as cartas
   forem sorteadas depois. Hoje é assim — o sorteio acontece quando a tela das três cartas abre
   (`app/consulta/cartas.tsx:131`) — e precisa continuar. Se algum dia o sorteio subir para antes da
   abertura, o gesto vira teatro e deve ser removido. O texto também não afirma que o corte "define" a
   leitura: convida, apenas.
3. **Gesto sempre com alternativa nomeada.** *(acessibilidade)* Quem usa leitor de tela não descobre um
   "toque na área". Cada gesto tem um botão equivalente, com rótulo — Embaralhar, Cortar —, e o "reduzir
   movimento" do sistema entrega a tela parada, sem animação.

Duas observações mantidas dos itens anteriores: na abertura do búzios **não aparece mão humana** reunindo
ou preparando as conchas — a peneira pousa e pronto, porque preparar búzios é ato de quem é iniciado; e a
animação termina em repouso, sem loop.

## Ordem sugerida

1. **I4** — o botão de voltar do tarô (pequeno, destrava o usuário);
2. **B1 + B2** — 16 búzios e as frases (rápido, maior risco de reputação);
3. **B3 + B4** — mesa nova e lançamento sem vídeo (maior impacto visual);
4. **B5 + I1 + I2 + I3 + B6** — as introduções, num componente único, com acessibilidade;
5. **I5** — o vídeo da numerologia, depois dos demais oráculos.

## Decisões do Fabiano

1. **16 búzios** — sim (21/09). Falta quem valide os textos dos odus 13 a 16 e o Opirá com quem conhece
   o jogo; hoje são textos nossos.
2. **Mesa** — desenhada (21/09). É a `components/MesaBuzios.tsx`.
3. **Preparação dos búzios** — abertura em animação, sem vídeo (23/09).
4. **Introduções** — interativas, com um botão só (23/09).
5. **Vídeo da numerologia** — *em aberto*: produzido por nós (renderizado a partir de roteiro e animação)
   ou por alguém de fora, com narração?
