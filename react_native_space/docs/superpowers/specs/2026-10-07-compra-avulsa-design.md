# Compra avulsa por produto — design

**Data:** 2026-10-07
**Status:** proposta, aguardando aprovação do Fabiano

## O que isto resolve

Hoje só existe assinatura mensal. Quem quer **uma** leitura — "quero só um Mapa de
Vocação" — tem de assinar um plano inteiro ou desistir. Isto abre a venda por item.

O preço de cada item **não é decidido aqui**. Ele sai da aba Custo por produto (PR #72),
depois que houver leituras medidas. Esta spec é a máquina de vender; o número é outra
conversa, e de propósito — foi a decisão do dono de não precificar antes de medir.

## As três decisões, e por quê

1. **A compra é de um produto específico**, não de crédito genérico. "Um Mapa de Vocação"
   é como o dono descreveu, e crédito genérico esconderia a diferença de custo: uma Cruz
   Celta e uma pergunta curta gastariam o mesmo crédito custando valores bem diferentes.
2. **O direito de gerar expira em 90 dias.** A leitura já gerada fica para sempre no
   histórico; o que expira é o direito de gerar. Sem prazo, cada venda vira passivo eterno,
   resgatável quando o modelo custar outra coisa.
3. **Assinante pode comprar, e os saldos somam**, gastando a cota do plano primeiro. É
   receita a mais sem canibalizar, e evita a conversão absurda de cancelar o plano para
   comprar um item.

## A armadilha que define o modelo de dados

`perfis.consultas_restantes` é **zerado e reescrito** pelo webhook a cada renovação
(`stripe-webhook/index.ts`, `consultas_restantes: cfg.cota_consultas`). Crédito avulso
somado ali **sumiria na renovação seguinte, sem erro nenhum** — a pessoa pagaria e
perderia.

Por isso o crédito avulso vive em **tabela própria**, e nunca numa coluna de `perfis`.

## Modelo de dados

```
public.compras_avulsas
  id                bigint, identidade
  usuario_id        uuid    → auth.users(id), on delete cascade
  oraculo           text    -- 'tarot' | 'buzios' | 'mapa' | 'vocacao' | ...
  stripe_session_id text    UNIQUE  -- idempotência do webhook
  pago_em           timestamptz
  expira_em         timestamptz     -- pago_em + 90 dias
  consumido_em      timestamptz     -- nulo enquanto não usado
  consumido_chave   text            -- qual leitura gastou este crédito
```

**Uma linha por compra, não um contador.** Contador perde o rastro de quando cada crédito
foi comprado, e com validade por compra isso é necessário para saber qual expira primeiro.
Também torna a auditoria possível: cada venda tem uma linha que se liga a uma leitura.

RLS ligada. A pessoa lê as **suas** compras — a tela precisa mostrar "você tem um Mapa de
Vocação disponível" —, e só `service_role` escreve.

Crédito disponível é `consumido_em is null and expira_em > now()`.

## O caminho do pagamento

Espelha o que já existe para assinatura, trocando o modo:

- **`criar-checkout-avulso`** (function nova, irmã de `criar-checkout-stripe`):
  `mode: 'payment'`, `line_items` com o preço avulso do produto,
  `metadata: { usuario_id, oraculo, tipo: 'avulso' }`.
- **Preços**: uma coluna `stripe_price_avulso_id` por produto, na tabela de configuração —
  mesmo padrão de `config_planos.stripe_price_id`. Nunca preço no código.
- **`stripe-webhook`**: `checkout.session.completed` passa a ramificar por `session.mode`.
  `subscription` segue exatamente como hoje; `payment` insere em `compras_avulsas`. A
  idempotência vem do `UNIQUE` em `stripe_session_id` — o Stripe repete o webhook, e
  repetir não pode vender duas vezes.

## O consumo, que é a parte delicada

O gasto acontece em `ia-interpretacao`, **depois que a leitura existe**, junto com o
desconto de `consultas_restantes` que já está lá.

**Precedência: cota do plano primeiro, avulso depois.** Quem tem plano ativo com cota gasta
a cota; o avulso comprado fica guardado para quando ela acabar. O contrário faria o
assinante queimar o que pagou à parte enquanto a cota do mês sobrava.

**O crédito não é consumido quando a resposta vem do cache.** Este é o ponto que mais
importa, e o cache hoje trata dois oráculos de formas **deliberadamente diferentes**:

- **`mapa`**: o cache fica acima de tudo — releitura não custa chamada, não desconta
  consulta e não entra no limite do dia, para qualquer pessoa.
- **`vocacao`**: o cache fica **depois** da cota e da validade, com o comentário no código
  dizendo por quê — *"guardada iria de graça a quem está com o plano vencido ou com a cota
  gasta, e esta leitura é para quem paga"*.

Como o avulso entra em cada um:

- No **mapa**, o acerto é o mesmo de hoje: vindo do cache, nada é cobrado e **nenhum
  crédito é gasto**. Quem comprou um mapa e o reabre não paga de novo.
- Na **vocação**, o crédito avulso precisa ser aceito **no lugar da cota**, no mesmo ponto
  em que a validade é conferida — senão quem comprou é barrado antes de chegar ao cache e
  recebe "plano vencido" depois de ter pago.

Errar isto significa alguém pagar e o crédito ser comido por uma releitura. É a primeira
coisa que os testes devem prender.

## O que a pessoa vê

- No card do oráculo, ao lado de "Ver os planos", uma segunda saída: **"Comprar só este"**.
- Depois de comprar, o card mostra que há um crédito disponível, e até quando.
- No Perfil, a lista das compras: o que foi comprado, quando, se foi usado, e a validade.

A tela de planos **não muda de hierarquia**: a assinatura continua a oferta principal, e o
avulso é a saída para quem não quer assinar.

## Termos de Uso

Três acréscimos, e não são opcionais:

1. Que a compra avulsa dá direito a **uma** leitura do item comprado.
2. Que esse direito **expira em 90 dias**, e que a leitura já gerada permanece.
3. Que o direito de arrependimento de 7 dias do CDC continua valendo — e o que acontece
   quando ele é exercido **depois** de a leitura ter sido gerada, porque aí o produto já
   foi entregue.

O item 3 é pergunta para o dono, não decisão minha.

## Fora de escopo, de propósito

- **Pacotes** ("compre 3, pague 2"). Uma venda por vez primeiro.
- **Presente para outra pessoa.** Muda o modelo: quem paga deixa de ser quem consome.
- **Reembolso automático.** O fluxo do Stripe existe; ligá-lo a devolver o crédito é
  trabalho próprio.
- **Definir os preços.** Depende da medição de custo.

## Riscos

- **Webhook que vende duas vezes.** Mitigado pelo `UNIQUE` em `stripe_session_id`, que é
  garantia do banco e não do código.
- **Crédito comido por cache**, descrito acima.
- **Pagou e não recebeu.** Se o webhook falhar, a pessoa pagou e não tem crédito. O caminho
  de hoje já usa `exigirLinhaAtualizada` para gritar em vez de falhar calado, e o avulso
  deve usar o mesmo. Vale uma tela de "pagamento confirmado, crédito a caminho".
- **O preço do modelo sobe** depois da venda. É o que a validade de 90 dias limita.

## O que falta decidir

1. **Quais produtos** vão à venda avulsa: os sete, ou só os determinísticos (mapa, vocação,
   numerologia), que têm cache e por isso custo previsível?
2. **Arrependimento depois da leitura gerada** (item 3 dos Termos).
3. **Os preços**, depois da medição.
