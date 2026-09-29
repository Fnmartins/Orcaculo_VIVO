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

Entregue em 28/09, tudo mergeado e publicado:

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
- **Quatro áreas da vida** na leitura: amor, trabalho, dinheiro e caminho.
  Versão básica (Sol/Lua/Ascendente); a completa está no roadmap.
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

**25 feitos, 21 abertos, 46 no total** (conferido em 28/09).

Para ver o estado atual:

```sql
select fase, ordem, status, titulo
  from public.roadmap_itens
 where status in ('todo', 'run', 'block')
 order by fase, ordem;
```

Os 21 abertos se separam em três naturezas, e a diferença importa mais que o
número:

### Dependem do dono, não de código
| # | Item |
|---|---|
| 13 | E-mail de boas-vindas — precisa de `RESEND_API_KEY`, `WELCOME_HOOK_SECRET`, `REMETENTE_EMAIL` |
| 14 | Receber `contato@arcanus.com.br` — DNS |
| 17 | Campanha de lançamento |
| 31 | Auditoria de custo por plano |

### Polimento do que já existe
| # | Item |
|---|---|
| 18 | Perfil rico (spec em `docs/superpowers/specs/2026-09-09-perfil-rico-design.md`) |
| 33 | Dívida técnica do pagamento e do painel |
| 38 | **Conferência das Edge Functions** — ver seção 5 |
| 39 | Conexões do mapa na tela (aspectos já calculados, só a IA os vê) |
| 40 | Áreas da vida na versão completa, usando as casas |
| 41 | Assinatura astrológica no lugar da "Síntese do seu Sol" |
| 42 | Casas expansíveis com regente e planetas |
| 43 | Tirar repetição no card do Sol; tirar "sistema mais usado no Brasil" |
| 44 | Bateria de validação de 20 mapas contra referência profissional |

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

1. **Item 38 — conferência das functions.** Não é o mais valioso; é o que
   protege todos os outros. Hoje qualquer erro numa Edge Function passa pelo
   `tsc` verde e só aparece no deploy. Aconteceu em 28/09.
2. **Item 44 — bateria de 20 mapas.** Antes de chamar auditor. Um astrólogo
   abre o produto e a primeira coisa que confere é se as cúspides batem; se
   houver erro ali, ele para no primeiro mapa e nada mais é avaliado.
3. **Item 39 — conexões na tela.** Melhor retorno por esforço: os aspectos já
   estão calculados e já vão para a IA, falta só mostrá-los.
4. Depois os itens 41, 42 e 43 — polimento da leitura.
5. Itens 13 e 14 quando o dono tiver os secrets e o DNS.

Trânsitos, sinastria e astrocartografia **não estão no roadmap de propósito**:
cada um é engine nova (exige um segundo momento no tempo ou um segundo mapa),
não extensão do que existe.

---

## 5. O trabalho que ficou pela metade

**Item 38, conferência das Edge Functions.** Começado em 29/09, não terminado.

O problema: `tsc --noEmit` do app **não cobre** `supabase/functions/` — elas
rodam no Deno e ficam fora do `tsconfig`. Em 28/09 um erro de sintaxe passou
pelo verde e só apareceu no deploy:

```
Failed to bundle the function (reason: The module's source code could not be
parsed: Expected ',', got 'string literal' at index.ts:171)
```

Duas rotas avaliadas:

- **`deno check`** — cobertura completa, inclusive tipos. Exige Deno instalado
  (não está no PATH; `npx deno` baixa o runtime e levou mais de cinco minutos)
  e um `deno.json` com `"nodeModulesDir": "auto"` para resolver os `npm:`.
- **Parse pelo TypeScript já instalado** — `ts.createSourceFile` e
  `parseDiagnostics` acham erro de sintaxe sem resolver import, em menos de um
  segundo, sem toolchain nova. **Cobre sintaxe, não tipos.**

A segunda rota estava sendo construída. **O teste que provaria que ela
distingue código quebrado de código bom não passou** — o escape do shell
quebrou os dois arquivos de amostra, então a comparação não valeu. Quem
retomar precisa refazer essa prova antes de confiar na rede.

Seja qual for a rota, ela tem de entrar no `package.json` como script e rodar
junto de `yarn test`, senão ninguém lembra de chamá-la.

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
yarn typecheck && yarn test
```

E no banco, o roadmap de verdade (a consulta da seção 3).
