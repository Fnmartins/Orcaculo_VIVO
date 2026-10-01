# Mapa de Vocação — Design

**Data:** 2026-10-01 · **Status:** aprovado nas quatro decisões, aguardando plano

Item 32 do roadmap. Escolhido como o primeiro produto novo porque é o único dos oito que se
apoia inteiramente no motor que já existe.

## Objetivo

Uma leitura de carreira a partir do mapa natal que o app **já calcula**: o meio do céu e a casa
10 (o que a pessoa constrói à vista), a casa 6 (a rotina de quem faz), o regente da 10 e onde ele
mora, e Saturno (onde está o esforço e a autoridade).

## As quatro decisões do dono, em 01/10

| # | Decisão | Por quê |
|---|---|---|
| 1 | **Card próprio na home**, não aba dentro do Mapa Astral | "Vocação" é o que a pessoa procura; "casa 10" não é. Dentro do mapa, vira detalhe de outro produto |
| 2 | **Leitura com seções nomeadas**, não texto corrido | Texto corrido sobre carreira vira horóscopo de revista. Seção nomeada obriga a IA a ser específica — a mesma razão que estruturou o aprofundamento |
| 3 | **Tem parte grátis:** meio do céu e casa 10 abertos; a leitura completa atrás do plano | Mantém a lógica que a home já usa, e dá algo concreto antes de pedir dinheiro |
| 4 | **Dentro do plano**, não avulso | Avulso exige mexer em pagamento (item 29) e dobraria o trabalho |

## O que o motor já faz — levantado com o código na mão

**`data/areas.ts` já modela a área Trabalho**: casas `[10, 6]`, corpos `[saturno, marte]`, com o
porquê escrito para ir à tela. A área Caminho — casas `[1, 9]`, Sol e Júpiter — também existe.

`regenteDaCasa(numero, cuspides)` devolve o regente da cúspide, e `areasDaVida` já resolve **onde
esse regente mora**, com o comentário que explica a escolha: *"A casa vazia não está sem assunto:
o assunto dela está onde mora o regente."*

`AreaDaVida.comCasas` já distingue mapa **com** hora de nascimento de mapa **sem** — sem hora não
há casas, e a leitura cai para só os planetas. A tela e o prompt precisam dizer isso em voz alta
em vez de entregar menos sem explicar.

**Consequência:** não há efeméride nova, não há cálculo novo. O que falta é prompt, tela e rota.

## O risco que isto cria, e a fronteira que o resolve

A área Trabalho **já aparece** na tela do mapa astral, atrás de `temAcesso('mapa_completo')`.
Vender um "Mapa de Vocação" sem fronteira seria cobrar duas vezes pela mesma coisa — e a pessoa
que já paga perceberia primeiro.

**A fronteira:** o mapa astral mostra as **peças**; a vocação entrega uma **leitura**.

| | Mapa Astral (hoje) | Mapa de Vocação |
|---|---|---|
| O que mostra | Casa 10 em Escorpião, Saturno na 6, regente na 11 | O que essas posições dizem sobre onde você rende |
| Forma | rótulo e valor (`PecaDaArea`) | texto em seções, escrito pela IA |
| Pergunta que responde | "o que tem no meu mapa?" | "que trabalho combina comigo?" |

Se a leitura só repetir as peças em prosa, o produto não se justifica. **Isso é critério de
aceitação, não observação:** a leitura tem de nomear direção, ambiente e desgaste — coisas que
nenhuma peça diz sozinha.

## Onde vive

**Card próprio na home** (`app/prototipo-conselho.tsx`), ao lado dos seis atuais. Como tem parte
grátis, ele entra na regra do **cadeado parcial** criada em 01/10: quando o acesso vence, marca o
card e abre a folha de escolhas, em vez de trancar.

Rota nova, `/vocacao`, com o mesmo fluxo do mapa astral: dados de nascimento (ou reaproveitados,
se já houver) → cálculo local → leitura.

## O que a pessoa recebe

**Grátis:** o meio do céu e a casa 10 — signo e grau, com a frase curta que o `DefinicaoArea.porque`
já escreve.

**No plano**, a leitura em quatro seções nomeadas:

1. **Onde você rende** — a direção que o mapa aponta, do MC e do regente da 10.
2. **O ambiente que te sustenta** — da casa 6 e de onde o regente mora: ritmo, companhia, grau de
   estrutura.
3. **O que te drena** — de Saturno e dos aspectos tensos da 10 e da 6. É a seção que diferencia
   leitura de elogio.
4. **O próximo passo concreto** — uma coisa a fazer, não uma qualidade a ter.

**Sem hora de nascimento**, a leitura sai sem casas e **diz isso**, usando o `comCasas` que já
existe. Entregar menos em silêncio é o defeito que esse campo foi criado para evitar.

## Servidor

**Quarto oráculo em `ia-interpretacao`**, não function nova. A function já tem `ORACULOS`,
`INSTRUCOES_POR_ORACULO`, `CAMPOS[oraculo]` e o despacho por tipo. Entrar ali herda, sem código
novo: a checagem de validade do plano, a cota do dia, a contagem de tokens para a aba Custo, o
tratamento de recusa e o 402 com a frase certa.

- `tipo` de uso: **`'interpretacao'`**, a mesma cota do aprofundamento. Criar um tipo novo exigiria
  coluna em `configuracao_ia` e decisão de limite que ninguém pediu.
- **Cache** como o do mapa: chave derivada das posições, que são as mesmas para sempre. Uma leitura
  de vocação não muda — reler não custa chamada paga nem desconta cota.

## Testes

**No motor (Jest, direto):** a seleção das peças da vocação a partir de um mapa fixo — com hora e
sem hora. O caso sem hora é o que mais erra, porque é o único em que o produto entrega menos.

**No texto da function** (a suíte que lê o código das Edge Functions, porque o `tsc` não as
alcança): que `'vocacao'` está em `ORACULOS`, tem instruções próprias, tem `CAMPOS` próprios, e
que o `tipo` repassado a `conferirUso` é `'interpretacao'` — trocar esse literal leria a cota de
outro recurso sem erro nenhum.

**Na tela:** o card novo mostra a parte grátis sem plano; a leitura completa não aparece sem
acesso; e o cadeado parcial se comporta como nos outros três — porque a regressão mais provável é
tratar o card novo como se fosse inteiramente pago.

## Fora de escopo

- **Avulso.** É o item 29, e mexe em pagamento.
- **Trânsitos** — "quando mudar de emprego" é engine nova, que exige um segundo momento no tempo.
  O roadmap deixa trânsitos de fora de propósito.
- **Sugerir profissões por nome.** A leitura fala de direção, ambiente e desgaste. Listar "você
  dá um bom arquiteto" é o tipo de promessa que o escopo de conformidade do projeto evita, e que
  envelhece mal.
- **Mudar a área Trabalho do mapa astral.** Ela continua como está; a fronteira acima é o que
  separa as duas, e mexer nela agora misturaria duas entregas.
