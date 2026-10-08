# Mapa Astral — fontes e procedência

**Data:** 2026-10-05

Último documento da auditoria geral de 05/10, e o de menos achados: diferente do búzios e da
numerologia, aqui o código já declarava quase tudo o que precisava declarar. Este arquivo
existe para tirar a procedência dos comentários e deixá-la onde um astrólogo convidado a
revisar possa ler sem abrir o código.

Nada de texto de terceiro foi transcrito. O que vem de fora é **método** — efemérides,
sistema de casas, convenção de orbes — e **dado**, que é a parte com obrigação de licença.

---

## O motor

As posições vêm da biblioteca **`astronomy-engine`** (versão 2.1.19, licença MIT), em
**longitude eclíptica da data**, no **zodíaco tropical** — que é o que a astrologia ocidental
usa. Não é aritmética aproximada.

Vale registrar o que havia antes, porque é o tipo de coisa que um produto esconde: até o item
M1 do conselho (21/09), a Lua era `(hora + dia + mês) % 12` e o ascendente era `hora ÷ 2`.
Nas palavras do próprio comentário em `data/efemerides.ts`, *"números que pareciam um mapa e
não eram"*. A troca por efemérides reais foi a correção disso.

**Roda no aparelho, não no servidor.** O conselho tinha pedido servidor para os dados de
nascimento não irem a terceiros; no aparelho eles não vão a lugar nenhum, e ainda dá para
testar com o Jest.

Os dez corpos são os clássicos: Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano,
Netuno, Plutão. **Retrogradação é calculada** (`estaRetrogrado`), entra na assinatura do mapa
como fator próprio, e tem um texto que começa desarmando a leitura errada: retrógrado não
quer dizer ruim nem andando para trás.

## O sistema de casas é uma escolha, e é Placidus

**Placidus**, calculado de tempo sideral e obliquidade em `data/casas.ts`, com guarda de
latitude: acima de certo paralelo parte do zodíaco não nasce nem se põe e o sistema se
desfaz — o código sabe disso e trata.

Placidus é o sistema mais usado do planeta, e por isso é uma escolha defensável. Mas é *uma*
escolha:

- **Casas inteiras** (*whole sign*) é o sistema mais antigo com evidência textual clara —
  padrão do helenismo do século I a.C. ao VII d.C., e ainda primário na astrologia védica.
  Nele toda casa tem exatos 30 graus e o resultado não depende da latitude.
- **Casas iguais** parte do ascendente e divide o círculo em doze fatias de 30 graus.

Com a mesma hora e o mesmo lugar, **dois apps dão casas diferentes**, e quem comparar o
Arcanus com outro site pode concluir que um dos dois está quebrado. Nenhum está. É o mesmo
problema que a numerologia tem com a tabela caldaica.

**Correção, 05/10/2026.** A primeira versão deste documento afirmava aqui que a tela não
dizia qual sistema se usou. **Estava errado**: `app/mapa-astral/resultado.tsx` já mostrava
"Calculadas pelo sistema Placidus" acima das doze casas, e eu afirmei o contrário tendo
olhado só a camada `data/`. É a quarta inferência errada desta auditoria, e está na nota de
método no fim.

O que de fato faltava era a **consequência**, não o nome: dizer "Placidus" não avisa a quem
compara com outro site que a divergência é esperada. Isso entrou em
`TEXTO_SISTEMA_DE_CASAS` (`data/textos-mapa.ts`), abaixo do rótulo que já existia.

## O tempo e o lugar

A maior fonte de erro em mapa brasileiro não é a efeméride: é o fuso. O Brasil ligou e
desligou horário de verão em anos diferentes, por estados diferentes.

- Cada cidade guarda o **nome IANA do fuso** (`America/Sao_Paulo`, `America/Manaus`…), e não
  um offset fixo. Quem decide se havia horário de verão naquele dia é o banco de fusos do
  sistema, não um palpite nosso. `offsetPadrao` existe só como reserva para ambiente sem
  fusos nomeados, e cada valor escrito à mão é conferido contra o banco de fusos em teste.
- A busca de cidade corre num recorte do **GeoNames** no Postgres, cobrindo Brasil, Estados
  Unidos, Canadá e Europa. A lista de 54 cidades dentro do app não é o catálogo: é rede de
  proteção para quando não há internet ou o banco está fora do ar, para o formulário não
  travar quem quer o próprio mapa.
- Escolher a cidade vizinha em vez da exata move o ascendente em cerca de **um grau por 100
  km** — bem menos que a incerteza da hora que quase todo mundo tem. "Nasci por volta das
  três" já vale uns sete graus de ascendente.

## Os orbes são convenção, e a literatura concorda que não há outro jeito

`data/aspectos.ts` declara os cinco aspectos maiores numa tabela única, com dois orbes cada:
o normal, e o maior, que vale quando Sol ou Lua está envolvido.

| Aspecto | Ângulo | Orbe | Orbe com luminar | Natureza |
|---|---|---|---|---|
| Conjunção | 0° | 8° | 10° | neutro |
| Oposição | 180° | 8° | 10° | tenso |
| Trígono | 120° | 7° | 8° | harmônico |
| Quadratura | 90° | 7° | 8° | tenso |
| Sextil | 60° | 5° | 6° | harmônico |

O comentário do arquivo já dizia que isso é convenção e não fato. **As fontes confirmam, e
vão além: não existe tabela universal de orbes.** Tradições diferentes usam tabelas
diferentes, algumas atribuem orbe ao planeta em vez de ao aspecto, e a escola uraniana
trabalha com orbes de um a dois graus. Dar orbe maior aos luminares é prática padrão,
descrita nas fontes exatamente como está aqui: um aspecto com o Sol pode ser lido a 10 graus,
enquanto o mesmo aspecto entre Mercúrio e Saturno para em 6.

A nossa tabela é defensável e está dentro da prática comum. **O que a torna honesta é estar
declarada como escolha, num lugar só, onde um astrólogo possa discordar item a item.**

**Os ângulos recebem aspecto.** `PontoAspectavel` é `Corpo | 'ascendente' | 'meioCeu'` —
aspecto ao ascendente é leitura natal padrão, e está contemplado.

## Sem a hora de nascimento

O formulário tem a opção explícita de não saber a hora, e o perfil guarda
`nascimento_sem_hora`. Nesse caso os **ângulos vêm nulos** — sem hora não existe horizonte, e
inventar um ascendente seria pior que não ter.

A vocação vai um passo além e **tira os aspectos da Lua** quando não há hora: sem hora a Lua
pode estar a até 7 graus do lugar certo, o que passa do orbe de qualquer aspecto da tabela
acima. A regra vive em `aspectosSemALua`, em `data/aspectos.ts`.

## O que é nosso

- **Todos os textos** de signo, casa, planeta e aspecto. Significado astrológico é tradição
  livre; a redação de cada autor não é, e a nossa é nossa. Mesmo argumento já registrado em
  `2026-10-02-fontes-de-taro.md`.
- **A classificação harmônico / tenso / neutro**, e o cuidado declarado de dizer na tela que
  nenhum dos dois é bom ou ruim — porque "tenso" assusta quem lê.
- **A assinatura do mapa** (`data/assinatura.ts`): escolher quatro fatores — planeta
  dominante, aspecto mais forte, casa mais povoada, retrógrados — e destacá-los é decisão de
  produto, não método herdado de escola nenhuma.
- **A tabela de orbes**, dentro da prática comum, mas nossa como escolha.

## O que falta

Quatro itens. O primeiro é diferente dos outros três: é **obrigação**, não escopo.

**1. Creditar o GeoNames. Pendência de licença, não de gosto.**

Os dados do GeoNames são publicados sob **Creative Commons Attribution 4.0** — confirmado em
<https://www.geonames.org/about.html> —, e CC BY exige atribuição de quem usa. O recorte está
em produção na tabela `cidades` do Postgres, e **o crédito não aparece em nenhum lugar que o
usuário veja**: só em comentário de código e em doc de planejamento.

O conselho de 21/09 já havia anotado a exigência, com a mitigação escrita na própria tabela
de APIs: *"crédito ao GeoNames na tela ou na política"*. Não foi feito. Existe `app/legal/`,
que é onde isso naturalmente mora.

Na mesma família, menor: `astronomy-engine` é **MIT**, que pede o aviso de copyright nas
distribuições. Não encontrei tela de créditos nem de licenças de terceiros — uma página em
`app/legal/` resolveria as duas de uma vez.

> **Feito em 05/10/2026.** `app/legal/creditos.tsx` credita o GeoNames com link para a fonte
> e para a licença CC BY 4.0, carrega o aviso MIT, e entrou no menu do Perfil. No caminho
> apareceu que Termos e Privacidade estavam marcados "em breve" ali, com as duas páginas
> prontas desde setembro e alcançáveis só pela tela de cadastro — atribuição que ninguém
> alcança não é atribuição.

**2. Dizer que Placidus é uma escolha entre sistemas.**

> **Feito em 05/10/2026**, e não como estava escrito aqui. A tela já nomeava o sistema; o
> que faltava era a consequência. Ver a correção na seção sobre casas, acima.

**3. Nodos lunares.** As fontes tratam os nodos como componente padrão da prática natal —
conhecidos desde a antiguidade como *Caput* e *Cauda Draconis*, cabeça e cauda do dragão. É a
ausência mais visível para quem comparar o Arcanus com outro app.

> **Feito em 05/10/2026**, com duas escolhas declaradas.
>
> **Nodo verdadeiro, não médio.** O verdadeiro é o nodo do plano orbital instantâneo da Lua;
> o médio é a posição suavizada por fórmula. Os dois diferem em até ~1,5°, o bastante para
> trocar o signo de quem nasceu perto de uma cúspide. Escolhemos o verdadeiro porque é o que
> a maioria dos apps ocidentais mostra, e cada divergência a mais é uma a explicar.
>
> **Fora dos aspectos.** Os nodos entram por signo e casa, e não na tabela de aspectos. Os
> orbes de `data/aspectos.ts` foram escolhidos para corpos — com orbe maior para os
> luminares, por serem luminares —, e orbe de aspecto a nodo é outra convenção, que pede
> pesquisa e decisão próprias. Fica registrado como possível, não como pendência.
>
> O cálculo não procura o cruzamento: a normal ao plano da órbita é `h = r × v`, e a linha
> dos nodos é `ẑ × h`. Conferido contra a fórmula do nodo médio de Meeus (cap. 47) em
> `data/__tests__/nodos.test.ts` — de 1980 a 2040 a diferença fica dentro de ±1,7°, e o
> movimento anual dá cerca de −19,8°, retrógrado. São duas contas independentes chegando ao
> mesmo lugar: o oráculo do teste não passa pela `astronomy-engine` nem pelos nossos vetores.
>
> Os nodos aparecem **mesmo sem hora de nascimento** — um dia inteiro os move menos de um
> décimo de grau. A casa deles é que depende da hora, e some junto com as outras.

**4. Quíron.** Descoberto em 1977 e hoje padrão na astrologia psicológica. Mais opcional que
os nodos; Lilith cai na mesma categoria. **É o que resta desta auditoria.**

## Fontes

- *About GeoNames* — <https://www.geonames.org/about.html>
  (a licença: Creative Commons Attribution 4.0)
- *Houses in Astrology — Placidus vs Whole Sign*, Kerykeion —
  <https://kerykeion.net/content/learn-astrology/guide-placidus-vs-whole-sign>
  (as diferenças de cálculo, e que casas inteiras é o mais antigo com evidência textual)
- *Foundation: House Systems*, Kerykeion —
  <https://kerykeion.net/content/learn-astrology/foundation-house-systems>
- *House Systems In Astrology, Explained*, Nylon —
  <https://www.nylon.com/life/house-systems-astrology-explained>
- *Foundation: Orbs*, Kerykeion — <https://kerykeion.net/content/learn-astrology/foundation-orbs>
  (que não há tabela universal, e que luminares recebem orbe maior)
- *Astrological aspect*, Wikipedia — <https://en.wikipedia.org/wiki/Astrological_aspect>
- *Moiety*, Glossary of Astrological Terms, Skyscript —
  <https://www.skyscript.co.uk/gl/moiety.html>
- *Deepening Your Practice — Intermediate Natal Astrology*, Sean Chan Academy —
  <https://www.masterseanchan.com/deepening-your-practice-intermediate-western-astrology/>
  (nodos, Quíron e retrogradação como componentes da prática natal)
- *Lilith and the Nodes*, Halloran — <https://halloran.com/lilith-nodes.htm>

## Nota de método sobre esta auditoria

Das cinco lacunas que eu levantei antes de conferir o código, **quatro não existiam como eu
as descrevi**: retrogradação, cobertura de cidades, aspectos aos ângulos e a declaração de
Placidus já estavam implementados. Eu havia inferido de leitura parcial — a lista local de 54
cidades sem ver a tabela do GeoNames, o tipo `PosicaoCorpo` sem ver `estaRetrogrado`, o filtro
de aspectos sem ver `PontoAspectavel`, e a camada `data/` sem abrir as telas.

A quarta só apareceu no dia seguinte, quando fui implementar a correção e descobri que ela já
estava lá. As três primeiras eu achei antes de escrever; esta eu **publiquei errada** neste
documento, e ela viveu no `main` até ser corrigida.

O padrão é sempre o mesmo e tem nome: concluir sobre o sistema a partir de um arquivo. Vale
mais que uma nota — vale um método. **Antes de afirmar que algo falta, procurar onde ele
estaria se existisse**, e isso quase nunca é só a camada de dados.

Fica registrado por dois motivos: quem ler isto depois merece saber que o mapa é mais
completo do que uma primeira passada sugere; e o achado que de fato importa — o crédito do
GeoNames — não saiu de nenhuma das cinco hipóteses, e sim de ler a ata do conselho de 21/09 e
conferir se o que ela pedia tinha sido feito.
