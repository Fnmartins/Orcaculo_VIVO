# Arcanus — estado em 29/09/2026

Documento de retomada. Substitui `2026-09-11-estado-arcanus.md`, que ficou 18
dias para trás e não conhece casas, aspectos, voz nem o roadmap atual.

Escrito para alguém — ou alguma sessão — que pegue o projeto do zero.

---

## 1. Onde as coisas vivem

| O quê | Onde |
|---|---|
| App (Expo / React Native Web) | `oraculo_vivo/react_native_space` |
| Site de marketing | `oraculo_vivo/site` |
| App no ar | `app.arcanus.com.br` (Vercel, publica da `main`) |
| Site no ar | `arcanus.com.br` |
| Banco e functions | Supabase, projeto **`rfdjukdbrtvvulaxbzwb`** |
| Repositório | `Fnmartins/Orcaculo_VIVO` |
| Painel interno | `app.arcanus.com.br/manager` (só super-admin) |
| Roadmap | tabela `public.roadmap_itens`, editada pelo Painel |

**Atenção:** existe outro projeto Supabase na conta (`mltipakxqjlyrsvcdzqi`).
Não é o Arcanus. Ver a seção 6.

---

## 2. O que está no ar

Entregue em 28 e 29/09, tudo mergeado e publicado — conferido no bundle de
produção, não só no git (seção 6):

**Mapa astral**
- Motor real de efemérides (`astronomy-engine`), rodando no aparelho — as
  posições sobem, os dados de nascimento não.
- **Casas por Placidus** (`data/casas.ts`). Sem solução fechada; resolve
  iterando. Devolve nulo acima de ±66° de latitude e sem hora de nascimento,
  em vez de inventar cúspide.
- **Aspectos** (`data/aspectos.ts`). Cinco ângulos clássicos entre os dez
  corpos mais ascendente e meio do céu. Orbes declarados como convenção numa
  tabela só, para um astrólogo revisar.
- **Roda profissional**: ascendente à esquerda, zodíaco anti-horário, doze
  cúspides desenhadas, quatro eixos em destaque, dez corpos no grau real.
- **Quatro áreas da vida** na leitura: amor, trabalho, dinheiro e caminho, cada
  uma escrita a partir das casas e dos planetas do assunto (`data/areas.ts`), com
  **as peças aparecendo na tela ao lado do texto** — a leitura fica conferível.
  As atribuições de casa e planeta estão numa tabela só, declaradas como
  convenção, para um astrólogo revisar.
- **Nome de nascimento no perfil**, separado do nome de tela: a numerologia usa o
  de registro, e as três telas que pediam nome e data passam a ler do perfil.
- **Dados de nascimento no perfil** — o mapa é da conta, não formulário livre.
- **Cache da interpretação**: mesma posição, mesma leitura, sem pagar de novo.

**Voz**
- `pt-BR-Chirp3-HD-Sadaltager` (Google Chirp 3 HD), decidida por votação entre
  41 candidatas dentro do próprio Painel.
- Function `ia-voz`: chave só no servidor, cache antes da cota, teto de 3000
  caracteres por leitura, uso contado só depois do áudio existir.
- Bucket `leituras-faladas` **privado**, URL assinada de uma hora.
- Pausar e continuar, compartilhar em um toque, link curto
  (`/ouvir/<codigo>`) que expira em sete dias.
- Quarto tipo no contador de uso (`uso_ia`) e no interruptor por plano.

**Painel**
- Interruptor de IA por plano, com quatro recursos e limite diário.
- Aba Decisões com link clicável e prévia embutida.
- Votação de vozes como prévia de decisão.

**Web**
- Título, descrição e Open Graph no HTML publicado, com cartão 1200×630.
- `robots.txt` tirando `/manager`, `/perfil` e `/auth` do índice.

---

## 3. O roadmap

**34 feitos, 12 abertos, 46 no total** (conferido em 29/09, fim do dia).

Para ver o estado atual:

```sql
select fase, ordem, status, titulo
  from public.roadmap_itens
 where status in ('todo', 'run', 'block')
 order by fase, ordem;
```

**Não sobrou nenhum item que se resolva só com código.** Os 12 abertos se separam
em duas naturezas, e a diferença é o que decide o que fazer amanhã:

### Dependem do dono, não de código
| # | Item | O que falta chegar |
|---|---|---|
| 13 | E-mail de boas-vindas | conta no Resend: `RESEND_API_KEY` e `REMETENTE_EMAIL` verificado. **O código está inteiro** — function, trigger e roteiro em `supabase/welcome-email/README.md`, sem placeholder e sem segredo para copiar |
| 14 | Receber `contato@arcanus.com.br` | registro de DNS |
| 17 | Campanha de lançamento | decisão de oferta |
| 31 | Auditoria de custo por plano | números de consumo real |

### Produto novo
| # | Item |
|---|---|
| 25 | Agenda real da consulta ao vivo |
| 27 | Envio automático configurável |
| 28 | Conteúdo exclusivo e relatórios (Mestre) |
| 29 | Consulta avulsa com desconto |
| 30 | Vídeo personalizado |
| 32 | Mapa de Vocação |
| 34 | Foto pelo celular via QR Code (guardado como futuro, a pedido) |
| 36 | Vídeo explicativo da numerologia |

---

## 4. A ordem que eu recomendo

A fila de código acabou em 29/09. O que resta exige decisão de quem é dono do
produto, e é por isso que a recomendação mudou de natureza:

1. **Itens 13 e 14**, assim que houver os secrets e o DNS. São os mais baratos
   dos quatro e os únicos que travam coisa que já existe: hoje o endereço
   `contato@arcanus.com.br` aparece nos Termos e não recebe nada.
2. **Item 31 — auditoria de custo por plano.** Agora ela é possível de verdade:
   até 29/09 a tabela `assinaturas` acumulava linhas `pendente` de checkout
   desistido, e qualquer contagem de compras mentia. Ver seção 6.
3. **Item 17 — campanha**, depois que 13 e 14 estiverem de pé. Campanha que
   manda para um e-mail que não responde queima a primeira impressão.
4. **Um dos oito produtos novos**, escolhido pelo dono. Cada um é projeto com
   escopo próprio, não continuação do que existe.

Trânsitos, sinastria e astrocartografia **não estão no roadmap de propósito**:
cada um é engine nova (exige um segundo momento no tempo ou um segundo mapa),
não extensão do que existe.

---

## 5. O que está aberto no código, sem estar no roadmap

Nada ficou pela metade em 29/09. O que existe são três coisas conhecidas e
decididas, que alguém retomando merece saber antes de tropeçar nelas.

**A rede das Edge Functions cobre sintaxe, não tipos.** `yarn check:functions`
(`scripts/conferir-functions.js`) usa o parser do próprio TypeScript —
`ts.createSourceFile` e `parseDiagnostics` — e acha erro de sintaxe em menos de
um segundo, sem resolver import. Foi a rota escolhida contra `deno check`, que
cobriria tipos mas exige Deno no PATH (`npx deno` baixa o runtime e levou mais
de cinco minutos) e um `deno.json` com `"nodeModulesDir": "auto"`. **O `tsc` do
app não alcança `supabase/functions/`**, e em 28/09 um erro de sintaxe passou
pelo verde e só apareceu no deploy. Cobertura de tipos nas functions continua
sem rede.

**O plano gratuito recebe casas no prompt e não vê casas na tela.** O payload
da leitura manda as casas sempre que elas existem, independente de plano, mas a
tela esconde a seção de casas, os aspectos e as peças das áreas de quem não tem
`mapa_completo`. Resultado: a leitura de um gratuito pode citar "sua casa 7 em
Libra" sobre algo que ele não consegue conferir. Não é defeito de código — é
uma escolha de produto que ninguém tomou explicitamente. Vale decidir: ou o
prompt respeita o plano, ou a tela mostra o que a leitura cita.

**O passo 3 de `supabase/assinaturas-abandonadas.sql` supõe `criado_em`.**
Conferido em 29/09 e correto hoje. Se a tabela mudar de nome de coluna, o
comando falha dizendo qual — de propósito: melhor falhar que marcar linha
errada.

---

## 6. Armadilhas conhecidas

Cada uma destas custou tempo real.

**`--project-ref` sempre.** Não há projeto vinculado salvo, então o CLI
pergunta e pega o primeiro da lista. Em 28/09 isso mandou um secret com a chave
do Google e uma function para `mltipakxqjlyrsvcdzqi`, outro projeto. Use
sempre:

```bash
npx supabase functions deploy <nome> --project-ref rfdjukdbrtvvulaxbzwb
```

**Conferir se a branch ainda está aberta ANTES de empurrar.** Aconteceu três
vezes em 28/09: o PR é mergeado enquanto o trabalho continua, o commit seguinte
vai para a branch fechada e nunca chega à `main`. Também foi assim que o cache
da interpretação ficou perdido por um dia inteiro.

```bash
git merge-base --is-ancestor <commit> origin/main && echo "na main" || echo "orfao"
```

**`gh pr create --body @'...'@` quebra com aspas duplas no texto.** O
PowerShell encerra o here-string cedo e o `gh` reclama de "unknown arguments".
Escreva o corpo num arquivo e use `--body-file`.

**Git pelo PowerShell**, não pelo Bash: um hook reescreve `git` para `rtk git`
e já matou comando encadeado.

**O importador de CSV do painel do Supabase cria a tabela com RLS ligada e zero
policies.** Dado presente, SQL enxerga, app não vê, nenhum erro em lugar
nenhum. Aconteceu com a tabela de cidades.

**Suíte que não roda não aparece como falha.** Quando uma suíte morre no
carregamento, o Jest conta "0 testes falharam" e o resumo parece verde — só a
linha `Test Suites: 1 failed` denuncia. Aconteceu três vezes: com `expo-av`, com
AsyncStorage e com o cliente Supabase (que recusa URL vazia). As três causas
moram em `jest.setup.ts`, porque são fato do ambiente. **Confira sempre a linha
`Test Suites:`, não só a de testes.**

**O CLI do Supabase publica o que está no SEU DISCO, não o que está no GitHub.**
Duas consequências: rodar `functions deploy` de dentro da pasta errada falha com
`Entrypoint path does not exist` (a pasta certa é `react_native_space`, não a
raiz do repositório), e deployar com a branch errada em checkout publica a versão
velha **sem erro nenhum**. Antes de deployar, confira em que branch você está.

**Regra de deploy do app (`vercel.json`) compara contra o último deploy que deu
certo**, não contra o último commit — `scripts/decidir-deploy.js`. Ela depende de
"Automatically Expose System Environment Variables" ligado no projeto; sem isso
ela não vê `VERCEL_GIT_PREVIOUS_SHA` e constrói sempre, que é o lado seguro. O
código de saída é invertido do costume: **0 pula, 1 constrói**.

**"Está no ar" ≠ "está no aparelho".** O iPhone serve bundle em cache. Para
provar o que está publicado, baixe o bundle e procure uma string da versão:

```bash
curl -s https://app.arcanus.com.br/ | grep -o '/_expo/static/js/web/entry-[a-f0-9]*\.js'
```

---

## 7. Regras do projeto que não são negociáveis

- **Chave de API nunca no cliente.** Vai para `supabase secrets`. Se for para o
  bundle, qualquer um extrai e gasta na conta do dono.
- **A IA não prevê.** `supabase/functions/_shared/regras-ia.ts` proíbe previsão
  de saúde, orientação financeira ou jurídica, e afirmar que algo vai
  acontecer. Por isso a área do mapa chama-se **Caminho**, não "Futuro".
- **Pergunta em crise não é guardada** e não chama modelo: devolve acolhimento.
- **Cache guarda hash, nunca conteúdo nem dono.**
- **Áudio de leitura é conteúdo da pessoa**: bucket privado, URL assinada.
- Todo passo entregue ao dono começa com onde roda — **[SQL]**, **[PowerShell]**,
  **[App]**, **[Supabase]** — e o código vem na mensagem, nunca o nome de um
  arquivo do repositório.

---

## 8. Como retomar

> **"continua Arcanus: ler `react_native_space/docs/2026-09-29-estado-arcanus.md`
> e seguir a ordem da seção 4"**

Antes de qualquer coisa, conferir o estado real:

```bash
cd react_native_space
git fetch origin main && git log --oneline origin/main -5
yarn typecheck && yarn test && yarn check:functions
```

Em 29/09, fim do dia, isso dava **56 suítes e 610 testes**, `tsc` limpo e 20
functions com sintaxe ok. Confira a linha `Test Suites:` além da de testes: suíte
que morre no carregamento não conta falha nenhuma (seção 6).

E no banco, o roadmap de verdade (a consulta da seção 3).
