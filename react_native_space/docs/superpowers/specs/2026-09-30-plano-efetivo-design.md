# Plano efetivo por validade — Design

**Data:** 2026-09-30 · **Branch:** `plano-efetivo` (de `main`) · **Status:** aprovado, aguardando plano

Item 1 dos três que saíram de `docs/2026-09-30-conselho-cota-e-custo.md`.

## Objetivo

Fazer `perfis.plano_valido_ate` valer. Hoje ela é gravada e não é cumprida: **uma regra que existe no banco e
não existe no código**.

Isso fecha um vazamento que já está no ar e constrói a máquina que o teste de 10 dias (item 2) precisa.

## O que existe hoje

Evidência levantada em 30/09, com o código na mão:

- **Escrita:** o webhook da Stripe grava `plano_valido_ate` na ativação, estende na renovação (`invoice.paid`)
  e zera no cancelamento, junto de `plano = 'gratuito'` e `consultas_restantes = 0`.
- **Leitura:** **um lugar só** — `app/(tabs)/perfil.tsx:94`, para mostrar "dias até renovar".
- **Cumprimento:** nenhum. Quem decide acesso é `perfis.plano`, e só ele. As quatro Edge Functions de IA leem
  `plano` para achar a linha de `configuracao_ia`; a data não entra na decisão.

**Consequência:** se um webhook da Stripe falhar ou nunca chegar, a data passa e o acesso continua — para
sempre, sem erro em lugar nenhum. O acesso pago inteiro depende de um webhook chegar.

**Estado do banco em 30/09:** cinco contas, todas `gratuito`, nenhuma com validade. Nenhum assinante pagante
ainda. É por isso que a regra pode ser estrita sem quebrar ninguém.

## A regra

**Uma data ausente não é permissão.** `plano_valido_ate` nula significa **sem validade, logo sem acesso a
IA**. Todo plano que dá acesso carrega uma data.

Isso acerta de graça um caso que hoje depende de sorte: quem cancela fica com `plano = 'gratuito'` e data nula,
e passa a ficar corretamente sem acesso a IA — sem código novo para o cancelamento.

O super-admin continua passando por cima, como já passa por cima da cota.

### A função

Em `supabase/functions/_shared/limites.ts`, onde as decisões puras já moram — testada pelo Jest do app, como
`decidirUso`:

```ts
export interface AcessoDoPlano {
  liberado: boolean;
  /** A data que venceu, para a tela dizer quando. Nula quando nunca houve validade. */
  venceuEm: string | null;
}

export function acessoDoPlano(
  validoAte: string | null | undefined,
  agora: Date,
  semLimite: boolean,
): AcessoDoPlano;
```

**Ela não recebe o nome do plano**, de propósito: a decisão de acesso depende da data, não do rótulo. O nome do
plano continua servindo para achar a linha de `configuracao_ia` — outra pergunta, outro parâmetro. Função que
recebe argumento e ignora convida ao erro de quem lê.

Semântica:

| `validoAte` | `semLimite` | resultado |
|---|---|---|
| qualquer | `true` | liberado (super-admin) |
| nula ou vazia | `false` | **não** liberado, `venceuEm: null` |
| no futuro | `false` | liberado |
| no passado, ou igual a agora | `false` | **não** liberado, `venceuEm` = a data |
| texto que não é data | `false` | **não** liberado, `venceuEm: null` |

Igual a agora conta como vencido: o instante do vencimento é o fim, não um segundo extra. E data ilegível
**barra** em vez de liberar — dado estragado não pode virar acesso.

### `decidirUso` ganha um motivo

`Veredito.motivo` passa a aceitar `'vencido'`, e a ordem das checagens é:

1. `semLimite` → permitido;
2. **acesso vencido → `motivo: 'vencido'`**;
3. recurso desligado no plano → `'desligado'`;
4. limite do dia → `'limite_dia'`.

Vencido vem **antes** de desligado de propósito: dizer "não disponível no seu plano" a quem venceu manda a
pessoa para o lugar errado — ela vai procurar um plano que já tinha.

`mensagemDoLimite` ganha o caso: *"Seu acesso terminou em DD/MM. Atualize seu plano para continuar."* Quando
`venceuEm` é nulo, a frase omite a data em vez de escrever "null".

## Onde a regra é cumprida

### Servidor — as quatro functions

`ia-interpretacao`, `ia-oraculo`, `ia-pergunta` e `ia-voz` já leem `perfis` para pegar `plano`,
`consultas_restantes` e `is_super_admin`. Passam a ler `plano_valido_ate` na mesma consulta e a chamar
`acessoDoPlano` antes de gastar chamada paga.

O cache do mapa continua **antes** da checagem, como já está: leitura já escrita não custa nada, não desconta
cota e não deveria ser barrada por validade — a pessoa está relendo o que já era dela.

> **Correção, 30/09, durante a implementação.** A frase acima vale para o cache do mapa, cuja chave inclui as
> posições do mapa daquela pessoa. Ela **não** vale para o `voz_cache`, cuja chave é `sha256(VOZ + texto)` —
> global, não por usuário. Ali a justificativa correta é "já gerado, por qualquer pessoa": quem venceu pode
> receber um áudio que outra conta sintetizou, se o texto for idêntico. A decisão de manter o cache antes da
> checagem continua certa, porque não gasta chamada paga nem desconta cota; o que estava errado era o motivo.
> Fica registrado em vez de reescrito: motivo corrigido em silêncio é decisão que ninguém pode auditar.

### Tela — cadeado onde custa, e só onde custa

Dos seis cards da home (`app/prototipo-conselho.tsx`, `HomeAurora`), **um** é inteiramente IA:

| card | grátis | atrás do cadeado |
|---|---|---|
| Búzios | o jogo inteiro | "Aprofundar com IA" |
| Tarot | as três cartas | "Aprofundar com IA" |
| Mapa Astral | o mapa com Sol, Lua e Ascendente | "Ler a minha combinação" |
| **Leitura por imagem** | — | **o card inteiro** |
| Numerologia | tudo | — |
| Lei da Atração | tudo | — |

**Cadeado no card:** só "Leitura por imagem".
**Cadeado no botão:** aprofundar (búzios, tarô), ler a combinação (mapa), ouvir (voz), caixa de pergunta.
**Sem cadeado:** Numerologia e Lei da Atração.

Cadeado no card seria errado em quatro dos seis: esconderia conteúdo grátis e tiraria justamente o que faz a
pessoa voltar durante o teste. Tocar em qualquer cadeado abre a mesma mensagem e o botão de planos.

**Casas e aspectos do mapa já são pagos hoje**, por `temAcesso('mapa_completo')` — não são "grátis" e não
entram neste cadeado. Quem venceu perde a leitura da IA; casas e aspectos ele já não via. Duas travas
diferentes, por dois motivos diferentes, e misturá-las faria a tela dizer a causa errada.

A tela **não precisa buscar nada novo**: `plano_valido_ate` já está no tipo `Perfil`
(`services/auth.ts:53`) e já vem do `select('*')` de `buscarPerfil`.

A tela usa **a mesma função** do servidor. Uma regra, dois lados: se a tela decidisse por conta própria,
existiriam duas verdades, e a que desse acesso indevido seria a que ninguém notaria.

## Migração

Um `update` dá validade às cinco contas existentes, para não sobrar nulo nenhum no banco:

```sql
update public.perfis
   set plano_valido_ate = now() + interval '10 days'
 where plano_valido_ate is null
returning id, plano, plano_valido_ate;
```

Dez dias espelham o teste que o item 2 vai implantar. Esperam-se cinco linhas.

## Testes

**A função pura** (em `services/__tests__/limites.test.ts`, que já existe): data no futuro libera; no passado
barra e devolve a data; igual a agora barra; nula barra com `venceuEm` nulo; texto inválido barra; `semLimite`
libera em todos os casos acima.

**`decidirUso`:** vencido vence sobre desligado e sobre limite do dia; super-admin passa por cima de vencido.

**`mensagemDoLimite`:** com data, escreve a data; sem data, não escreve "null".

**A tela:** o card de imagem mostra cadeado quando vencido e não mostra quando liberado; tocar no cadeado
mostra a mensagem com a data; Numerologia **nunca** mostra cadeado — este último protege contra a regressão
mais provável desta entrega, que é aplicar o cadeado no card errado.

## Fora de escopo

- **Dar validade a quem se cadastra.** É o item 2. Esta entrega faz a data valer; quem escolhe as datas vem
  depois.
- **A contagem "faltam 3 dias"** e o botão "garantir minha assinatura". Também item 2: enquanto ninguém tem
  prazo, um contador não tem o que contar.
- **Limite por tipo e teto mensal.** Item 3.
- **Rebaixar `perfis.plano` quando vence.** A regra é lida, não gravada: um job que reescrevesse o plano
  precisaria de agendador e criaria uma segunda fonte de verdade. A data basta.

## Gates e integração

- `yarn typecheck`, `yarn test` e `yarn check:functions` verdes antes do PR.
- Deploy das quatro functions **depois** do `update` de migração — na ordem inversa, uma conta sem validade
  perderia acesso por alguns minutos.
- O `update` é passo `[SQL]` do dono, com o SQL colado na mensagem, nunca como nome de arquivo.
