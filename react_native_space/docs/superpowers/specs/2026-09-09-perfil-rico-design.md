# Perfil rico do Arcanus — Design

**Data:** 2026-09-09 · **Branch:** `feat/perfil-rico` (de `main`) · **Status:** aprovado, aguardando implementação (recomendado em sessão nova)

## Objetivo

A página de perfil hoje é "basicão": mostra só avatar, nome e plano. Este trabalho a transforma no **cadastro-base do usuário**, coletando (uma vez) os dados que as ferramentas do app precisam para gerar leituras corretas, em vez de cada ferramenta pedir os mesmos dados toda vez.

## Descoberta da auditoria

1. **O banco já guarda mais do que a tela mostra.** O tipo `Perfil` (`services/auth.ts`) já tem `nome`, `email`, `avatar_url`, `data_nascimento`, `signo`, `caminho_espiritual`, `intencao`, além de plano/nível/xp/streak. A página só exibe avatar + nome + plano. Primeiro ganho: **surfar o que já existe**.
2. **Features pedem os dados isoladamente.** Ex.: `app/mapa-numerologico/formulario.tsx` coleta dados de nascimento por conta própria, porque não há fonte central. Coletar no perfil permite **pré-preencher** essas telas depois.

## Auditoria: ferramenta × dados necessários

| Ferramenta | Dados necessários | Situação |
|---|---|---|
| Signo | data de nascimento | ✅ já existe (`data_nascimento`) |
| Numerologia / Mapa numerológico | **nome COMPLETO de nascimento** + data de nascimento | ⚠️ `nome` pode ser apelido → novo campo `nome_completo` |
| Matriz do Destino | data de nascimento | ✅ |
| Mapa Astral (completo) | data + **hora** + **local** de nascimento | ⚠️ faltam hora e local |
| Tarô / Búzios | pergunta/intenção (nome personaliza) | ✅ `intencao` |
| Lei da Atração | intenção/objetivos | ✅ `intencao` |
| IA visual (café/quiromancia) | só a imagem | não usa perfil |

**Base que destrava a maioria dos oráculos:** nome completo (de nascimento) + data de nascimento.
**Opcional de alto valor (mapa astral real):** hora + local de nascimento.

## Escopo

### Parte 1 — coleta e exibição (este spec, sem infra externa)

**Novas colunas em `perfis`** (migração aditiva/idempotente, rodada pelo Fabiano no SQL Editor):

```sql
alter table perfis add column if not exists nome_completo    text;
alter table perfis add column if not exists hora_nascimento  time;
alter table perfis add column if not exists local_nascimento text;
alter table perfis add column if not exists telefone         text;
alter table perfis add column if not exists pais             text;
alter table perfis add column if not exists cidade           text;
```

**Tipo `Perfil`:** adicionar esses 6 campos (todos `string | null`, `hora_nascimento` como `string | null`).

**Tela de perfil (`app/(tabs)/perfil.tsx`) — nova seção "Meus dados"**, um cartão com linhas editáveis (reaproveitando o padrão do modal "Editar Nome" já existente), agrupadas por papel:

- **Base (recomendado preencher):**
  - `nome_completo` — **nome de nascimento**. Nota no campo: *"Use seu nome completo de nascimento (como no registro), não o nome de casado ou social — a numerologia se baseia nele."*
  - `data_nascimento` (já existe).
- **Opcional (destrava mais):**
  - `hora_nascimento`, `local_nascimento`. Aviso na seção: *"Hora e local de nascimento são pré-requisito de alguns serviços (como o Mapa Astral). Sem eles, a leitura não sai o mais correta possível."*
- **Contato / contexto:** `telefone` (com selo discreto **"não verificado"**), `pais`, `cidade`.

**Mensagem no topo da seção:** *"Essas informações são a base das suas leituras — quanto mais completas, mais precisos ficam seu Mapa Astral, Numerologia e Matriz do Destino."*

Salvamento reutiliza `AuthServico.atualizarPerfil` (já genérico). Telefone com formato/máscara internacional (DDI), **sem** verificação.

### Fase 1.5 — pré-preencher features a partir do perfil (documentado, não obrigatório na Parte 1)

As telas que hoje pedem nome/data de nascimento (numerologia, mapa numerológico, matriz, mapa astral) passam a **puxar do perfil** e só pedir o que faltar. Reduz atrito e usa o perfil como fonte de verdade. Pode virar um segundo plano/entrega após a Parte 1.

### Fase 2 — verificação de telefone por SMS (DECISÃO REGISTRADA, futura)

Confirmar o telefone por código SMS exige **infra externa**, análoga ao que foi o Resend para e-mail:

- **Provedor de SMS** (Twilio, MessageBird ou Vonage) — conta, credenciais/secrets, **custo por SMS** (mais caro internacional: EUA/Europa/Canadá).
- **Supabase Phone Auth** configurado com esse provedor (o Supabase envia/valida o OTP).
- Fluxo no app: campo telefone → "enviar código" → tela de OTP → marca `telefone` como verificado (nova coluna `telefone_verificado boolean`).

**Por que adiado:** é decisão de negócio (custo recorrente + escolha de provedor) e setup externo do Fabiano. A Parte 1 já deixa o telefone coletado; a Fase 2 apenas adiciona a verificação por cima. **A ser implementada depois, quando o provedor for escolhido.**

## Fora de escopo

- Verificação SMS (Fase 2, acima).
- Refatorar as telas de cálculo dos oráculos (só a Fase 1.5, opcional, encosta nelas — e mesmo assim só para pré-preencher).
- Geocodificação/coordenadas do local de nascimento (por ora `local_nascimento` é texto livre; cálculo astrológico preciso com coordenadas pode ser um refinamento futuro).

## Gates e integração

- Branch `feat/perfil-rico` (de `main`), commits **locais** — sem push (push = deploy de produção na Vercel).
- Migração SQL: ação do Fabiano no SQL Editor do projeto `rfdjukdbrtvvulaxbzwb`.
- Verificação: `yarn typecheck` + revisão + teste visual (375px e 768px) pelo Fabiano.
- Independente do trabalho do Stripe (`feat/stripe-migration`) — tocam arquivos diferentes.
