# Leitura por imagem — fontes e procedência

**Data:** 2026-10-05

Sexto e último documento da auditoria geral dos oráculos, depois do tarô (02/10), da
vocação (04/10), e do búzios, da numerologia, da Matriz do Destino e do mapa astral
(05/10).

Eu entrei nele com a premissa errada, e registro isso no começo porque ela muda como o
documento deve ser lido: eu havia dito que a leitura por imagem era "o único oráculo sem
base teórica para auditar". **Não é.** São duas tradições nomeadas, com literatura própria
— tasseografia e quiromancia —, e eu disse aquilo sem ter aberto o arquivo.

Nada de texto de terceiro foi transcrito. O que vem de fora é **método**.

---

## O que são as duas leituras

**Tasseografia** (também tasseomancia) é a leitura dos restos de chá, borra de café ou
borras de vinho no fundo da xícara. Em turco, *fal bakma*. No gesto tradicional, quem
consulta segura a xícara com a mão dominante, faz um pedido, cobre com o pires e vira — a
borra mais pesada escorre e o que fica desenha a leitura.

**Quiromancia** é a leitura das linhas da palma da mão: coração, cabeça, vida, destino
quando visível, e os cruzamentos entre elas.

## Como a xícara se lê, e o que faltava

A xícara tem **dois eixos**, não um.

O **eixo do tempo** vai da borda ao fundo: a borda é o presente e o que acontece em dias ou
semanas; os lados são o meio do caminho; o fundo é o mais distante. Esta parte o app já
tinha certa.

O **eixo do assunto se orienta inteiro pela asa**, que a tradição chama de "domínio" de
quem consulta. A região junto da asa fala de vínculo, casa e família; a oposta, do que se
ganha e se gasta; um lado é o estado atual, o outro é o que vem.

**A asa não existia em lugar nenhum do app** — nem no prompt, nem em tela. Com borda e
fundo apenas, a leitura tinha o eixo do tempo e nenhum eixo de assunto. Corrigido em
05/10: entrou a seção "A asa e o que a cerca" e a instrução que descreve a orientação.

Com uma guarda que importa tanto quanto a correção: **se a asa não aparecer na foto, o
modelo tem de dizer isso e ler só pelas faixas de tempo.** Sem essa guarda, a correção
viraria um defeito novo — o modelo passaria a afirmar "junto da asa" em foto onde a asa nem
aparece.

**Os lados ficaram dentro da seção "A borda e os lados"**, e não em seção própria. É
escolha declarada: cobre as três faixas de tempo sem a xícara virar uma lista de oito itens,
que custaria mais e leria pior.

## A mão, e a crença que precisava ser desarmada

### A linha da vida não mede tempo de vida

Esta é a confusão mais comum sobre quiromancia, vem do próprio nome da linha, e é a única
capaz de assustar de verdade. A literatura é unânime: a linha da vida fala de **vitalidade
e qualidade de vida** — como a pessoa gasta e repõe energia. Uma linha curta ou rasa **não
significa vida curta**; costuma indicar constituição mais delicada, ou alguém que se esvazia
no convívio.

O prompt já proibia prognóstico de saúde, e o modelo obedecia. **Mas proibir o modelo não é
o mesmo que desarmar o leitor.** Quem lê "Linha da vida: traçado curto" conclui sozinho uma
coisa que o app nunca escreveu, e é o silêncio do app que deixa a conclusão de pé.

A correção tem duas camadas, de propósito:

1. **No prompt**, uma instrução específica proibindo ligar a linha a tempo de vida, mesmo
   por insinuação. Impede o problema de nascer.
2. **No app**, `TEXTO_LINHA_DA_VIDA` em `data/textos-imagem.ts`, fixo, mostrado em toda
   leitura de mão. Desarma a crença que a pessoa já trouxe.

A segunda camada existe porque resposta gerada muda a cada leitura, e o desarme não pode
depender de o modelo ter lembrado dele. É a mesma razão do guarda em
`data/__tests__/lei-atracao.test.ts`: o bloco REGRAS protege o texto **gerado**, e texto
fixo do app nunca passa pelo modelo.

O precedente de forma é `TEXTO_RETROGRADO`, em `data/textos-mapa.ts`, que abre desarmando:
*"Retrógrado não quer dizer 'ruim' nem 'andando para trás'"*.

### Ler a mão dominante é escolha

Na tradição, a **dominante** mostra o que a pessoa fez de si — presente e futuro, mudanças
internas e externas. A **passiva** guarda o herdado, o traço de berço. Muitos leitores usam
as duas e comparam.

O app lê só a dominante. É escolha defensável, e o que faltava era declará-la — mesmo
argumento do Placidus no mapa astral e da tabela caldaica na numerologia. Agora está em
`TEXTO_MAO_DOMINANTE`, na tela.

## A privacidade, que já estava certa

Registro porque é a parte mais bem resolvida, e seria injusto o documento só listar falhas.

- **A foto nunca é gravada.** Viaja em base64 no corpo da requisição para a `ia-oraculo`,
  que não escreve em storage nem em banco. O `services/imagemCache.ts` é um `Map` em memória
  com limite de três, e existe só porque imagem não cabe em parâmetro de rota.
- **O consentimento é pedido na tela antes do primeiro envio**, e fica guardado **no
  aparelho** — com o comentário certo em `app/ia/captura.tsx`: *"é escolha de quem usa, não
  dado nosso"*.
- **A política nomeia a prática** em vez de esconder atrás de "imagens enviadas": diz
  "leitura por imagem (borra de café e leitura de mão)", diz que a foto vai ao provedor de
  IA, e diz que não é guardada.

Isso importa mais aqui do que nos outros oráculos: **a palma da mão é identificador
biométrico**, e tratá-la como dado descartável seria o erro mais caro do app inteiro.

## O que o prompt já fazia bem antes desta auditoria

- **Manda descrever o que está na imagem antes de interpretar.** É o que separa leitura de
  invenção.
- **Manda dizer que não dá para ler** quando a foto está escura, tremida ou cortada, e
  devolver energia "neutra", em vez de inventar.
- **Seção sem o que observar deve dizer isso**, e não encher linguiça: *"seção vazia não é
  aceita, seção honesta é"*.

## O que é nosso

- **Os textos de desarme** (`data/textos-imagem.ts`) e a redação do prompt.
- **A divisão em seções** e a classificação de energia (positiva, neutra, atenção). Nenhuma
  tradição rotula leitura assim; é decisão de produto, para a tela saber o que destacar.
- **Os dois níveis de profundidade** (simples e completa).

## O que ficou de fora

- **O gesto da consulta.** Na tradição a xícara é virada sobre o pires depois de um pedido,
  e isso faz parte da prática. O app recebe uma foto, e não deve sugerir que seja a mesma
  coisa. A tela de captura instrui o preparo, que é o mais honesto possível aqui.
- **Montes, dedos e formato da mão.** A quiromancia lê muito além das linhas. O app lê
  linhas e cruzamentos, e isso é recorte, não o todo.
- **Os lados da xícara como seção própria**, já explicado acima.

## Fontes

- *Tasseography*, Wikipedia — <https://en.wikipedia.org/wiki/Tasseography>
  (definição, e as zonas de tempo: borda, lados, fundo)
- *Coffee Tasseography — Fortune Telling with Coffee*, I Need Coffee —
  <https://ineedcoffee.com/coffee-tasseography-fortune-telling-with-coffee/>
- *Tea and Coffee Readings* — <https://energyreader.yolasite.com/tea-leaves-and-coffee-grounds.php>
  (a asa como "domínio", e a divisão por assunto ao redor dela)
- *The Turkish Coffee Tradition*, Tasting Table —
  <https://www.tastingtable.com/1887749/turkish-coffee-tradition-tell-your-future>
  (o gesto: pedido, pires, virada)
- *Palm reading guide: hand lines meaning* —
  <https://www.eastchinatrip.com/palm-reading-guide-hand-lines-meaning/>
  (mão dominante contra passiva; a linha da vida como vitalidade, não duração)
- *The Elements of Hand Reading* —
  <https://dev.studyabroadfoundation.org/filedownload.ashx/B12OL9/995125/The%20Elements%20Of%20Handreading.pdf>

## O que falta

- **Revisão por quem pratica.** Vale o mesmo que o búzios pede de um pai ou mãe de santo:
  nenhuma pesquisa de internet substitui alguém que lê xícara ou mão há anos, e este
  documento existe para tornar essa revisão possível.
- A tasseografia varia forte entre tradições — turca, árabe, grega, cigana. Este documento
  segue a leitura mais comum nas fontes citadas e **não declara de qual escola é**, lacuna
  menor do mesmo tipo que a do búzios com as nações.

## Nota de método

O achado de maior consequência desta auditoria não foi de fidelidade à tradição: foi o
**silêncio sobre a linha da vida**. Um app pode estar correto em tudo que escreve e ainda
assim deixar a pessoa concluir sozinha o que mais a assusta.

Vale guardar como critério para os próximos: perguntar não só "o que o app afirma?", mas
"o que o leitor conclui que o app não precisou dizer?".
