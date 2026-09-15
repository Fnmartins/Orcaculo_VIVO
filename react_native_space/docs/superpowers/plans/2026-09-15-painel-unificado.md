# Painel unificado (Planos + Roadmap + Acessos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o `/manager` num painel único com abas Planos, Roadmap (editável) e Acessos (dar/tirar super-admin), atrás do login do Supabase, e corrigir os dois defeitos do Perfil anotados em 15/09.

**Architecture:** `app/manager.tsx` vira moldura (porta de super-admin + abas via `?aba=`); cada aba é um componente em `components/manager/`. Roadmap lê e grava direto na tabela `roadmap_itens`, protegida por RLS de super-admin. Acessos passa pela Edge Function `admin-acessos` (service role, confere `is_super_admin` no servidor); as travas ficam num módulo puro testável. A correção de colunas de `perfis` já foi aplicada em produção em 15/09 e aqui só é versionada.

**Tech Stack:** Expo SDK 54 + expo-router 6, React Native Web, TypeScript 5.9 (strict), Supabase (`@supabase/supabase-js` ^2.49, Postgres RLS, Edge Functions Deno), Jest (`jest-expo`) + `@testing-library/react-native` 13.

**Spec:** `docs/superpowers/specs/2026-09-14-painel-unificado-design.md`

## Global Constraints

- Todo caminho abaixo é relativo a `react_native_space/` (exceto `site/`, na raiz do repo `oraculo_vivo`).
- Branch `feat/painel-unificado`, de `main`. **Nenhuma task faz `git push` nem deploy** — `git push` na `main` = deploy de produção na Vercel. Produção só na Task 10.
- Textos de UI e nomes de código em português, como o resto do app.
- Tema claro creme: cores só por `Cores` (`constants/colors.ts`), fontes por `Fontes` (`constants/typography.ts`), espaços por `Espacamento`/`RaioBorda` (`constants/spacing.ts`). Nunca cor fixa de tema escuro.
- Alertas e confirmações só via `utils/alerta.ts` (`mostrarAlerta`, `confirmarAcao`) — `Alert.alert` é no-op na web.
- O app **nunca** grava `role`, `is_super_admin`, `permissions`, `plano`, `plano_valido_ate`, `consultas_restantes`, `stripe_customer_id` nem `email` de `perfis`. Colunas graváveis pelo cliente: `nome, avatar_url, data_nascimento, signo, caminho_espiritual, intencao, xp, nivel, ultima_consulta_em`.
- Edge Functions: Deno, `npm:@supabase/supabase-js@2`, pasta excluída do `tsc` (`tsconfig.json`). Lógica testável vai em módulo puro sem imports.
- SQL: arquivos em `supabase/*.sql`, idempotentes, rodados no SQL Editor do projeto `rfdjukdbrtvvulaxbzwb`.
- Verificação de cada task: `yarn typecheck` limpo e `yarn test` verde. Teste isolado: `yarn test caminho/do/arquivo.test.ts`.
- Commits pequenos, mensagem `tipo(escopo): descrição` em pt-BR, terminando com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Mapa de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `contexts/AuthContext.tsx` | `atualizarPerfil` falha visível sem sessão | 1 |
| `app/(tabs)/perfil.tsx` | modal de nome legível; lápis só com login; link "Painel" | 1, 4 |
| `supabase/functions/_shared/regras-acessos.ts` | travas puras de dar/tirar admin | 2 |
| `supabase/functions/admin-acessos/index.ts` | listar usuários e definir admin (service role) | 3 |
| `supabase/config.toml` | `verify_jwt` da função nova | 3 |
| `supabase/painel-seguranca-perfis.sql` | versiona o revoke/grant aplicado em 15/09 | 3 |
| `services/admin.ts` | **removido** (nunca usado; gravava papel do cliente) | 3 |
| `utils/abasManager.ts` | lista, rótulos e resolução da aba do `?aba=` | 4 |
| `components/manager/tipos.ts` | `PropsAbaManager` | 4 |
| `components/manager/AbaPlanos.tsx` | tela de planos atual, movida sem mudança | 4 |
| `app/manager.tsx` | moldura: porta, cabeçalho, abas | 4 |
| `supabase/roadmap.sql` | tabela, RLS, gatilho e carga inicial | 5 |
| `utils/roadmap.ts` | tipos, agrupamento, progresso, próxima ordem | 5 |
| `services/acessoNegado.ts` | `AcessoNegadoError` | 5 |
| `services/roadmap.ts` | CRUD do roadmap com tradução de erro de permissão | 5 |
| `components/manager/estilos.ts` | estilos compartilhados das abas novas + cores de status | 6 |
| `components/manager/EstadoCarregamento.tsx` | spinner ou erro com "Tentar de novo" | 6 |
| `components/manager/EditorItemRoadmap.tsx` | modal de criar/editar item | 6 |
| `components/manager/AbaRoadmap.tsx` | aba Roadmap | 6 |
| `utils/acessos.ts` | tipo `UsuarioAcesso`, filtro de busca, rótulo de plano | 7 |
| `services/acessos.ts` | chamadas à `admin-acessos` com tradução de erro | 7 |
| `components/manager/AbaAcessos.tsx` | aba Acessos | 8 |
| `site/roadmap.html`, `site/vercel.json`, `site/README.md` | remover roadmap solto e redirecionar `/roadmap` | 9 |

---

### Task 1: Perfil — modal de nome legível e edição só com login

Pedido do Fabiano em 15/09 (backlog do doc de estado). Fora da spec do painel, mas mexe no mesmo Perfil.

**Files:**
- Modify: `contexts/AuthContext.tsx` (função `atualizarPerfil`)
- Modify: `app/(tabs)/perfil.tsx` (`salvarNome`, bloco do nome no card, estilos `modalCard`/`modalInput`/`modalCancelar`)
- Test: `contexts/__tests__/AuthContext.test.tsx`

**Interfaces:**
- Produces: `export const ERRO_SEM_SESSAO = 'Entre na sua conta para editar o perfil.'` em `contexts/AuthContext.tsx`; `atualizarPerfil` rejeita com `Error(ERRO_SEM_SESSAO)` quando não há sessão.

- [ ] **Step 1: Escrever o teste que falha**

`contexts/__tests__/AuthContext.test.tsx`:

```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../services/auth', () => ({
  AuthServico: {
    sessaoAtual: jest.fn().mockResolvedValue(null),
    onMudancaAuth: jest.fn(() => ({ unsubscribe: jest.fn() })),
    buscarPerfil: jest.fn(),
    atualizarPerfil: jest.fn(),
  },
}));
jest.mock('../../services/consultaPendente', () => ({
  migrarConsultaPendente: jest.fn().mockResolvedValue(undefined),
}));

import { AuthProvider, useAuth, ERRO_SEM_SESSAO } from '../AuthContext';
import { AuthServico } from '../../services/auth';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext.atualizarPerfil', () => {
  it('sem sessão, rejeita com mensagem e não chama o serviço', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await expect(result.current.atualizarPerfil({ nome: 'Teste' })).rejects.toThrow(ERRO_SEM_SESSAO);
    expect(AuthServico.atualizarPerfil).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `yarn test contexts/__tests__/AuthContext.test.tsx`
Expected: FAIL — `ERRO_SEM_SESSAO` não exportado / a promessa resolve em vez de rejeitar.

- [ ] **Step 3: Implementar em `contexts/AuthContext.tsx`**

Logo abaixo dos imports:

```tsx
export const ERRO_SEM_SESSAO = 'Entre na sua conta para editar o perfil.';
```

Trocar a função `atualizarPerfil` por:

```tsx
  const atualizarPerfil = useCallback(async (dados: Partial<Perfil>) => {
    if (!sessao?.user?.id) throw new Error(ERRO_SEM_SESSAO);
    const atualizado = await AuthServico.atualizarPerfil(sessao.user.id, dados);
    setPerfil(atualizado);
  }, [sessao]);
```

- [ ] **Step 4: Rodar e ver passar**

Run: `yarn test contexts/__tests__/AuthContext.test.tsx`
Expected: PASS

- [ ] **Step 5: Perfil — mensagem real no erro e lápis só com login**

Em `app/(tabs)/perfil.tsx`, trocar o `catch` de `salvarNome`:

```tsx
    } catch (e) {
      mostrarAlerta(
        'Não foi possível salvar o nome',
        e instanceof Error && e.message ? e.message : 'Tente novamente.',
      );
    } finally {
```

Trocar o `Pressable` do nome no card do perfil (o que tem `onPress={abrirEditarNome}`) por:

```tsx
              <Pressable
                onPress={abrirEditarNome}
                disabled={!sessao}
                style={estilos.nomeContainer}
                accessibilityRole="button"
                accessibilityLabel={sessao ? 'Editar nome' : undefined}
              >
                <Text style={estilos.perfilNome}>{nomeExibido}</Text>
                {sessao ? (
                  <Ionicons name="pencil-outline" size={14} color={Cores.textoSecundario} style={estilos.nomeIconeEditar} />
                ) : null}
              </Pressable>
```

- [ ] **Step 6: Perfil — modal no tema claro**

No `StyleSheet` de `app/(tabs)/perfil.tsx`, trocar estes três estilos (os demais do modal ficam como estão):

```tsx
  modalCard: {
    width: '100%',
    backgroundColor: Cores.superficie,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.lg,
  },
```

```tsx
  modalInput: {
    backgroundColor: Cores.inputFundo,
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: Cores.inputBorda,
    paddingHorizontal: Espacamento.md,
    paddingVertical: 12,
    fontFamily: Fontes.corpo,
    fontSize: 16,
    color: Cores.textoPrimario,
    marginBottom: Espacamento.md,
  },
```

```tsx
  modalCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RaioBorda.md,
    backgroundColor: Cores.fundoClaro,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    alignItems: 'center',
  },
```

Conferir que não sobrou a cor do tema antigo:

Run: `grep -rn "1E1B2E" app components`
Expected: nenhuma linha.

(Mudança só de estilo: sem teste automático; o contraste entra no roteiro manual da Task 10.)

- [ ] **Step 7: Verificar**

Run: `yarn typecheck && yarn test`
Expected: typecheck sem erros; todos os testes passam.

- [ ] **Step 8: Commit**

```bash
git add contexts/AuthContext.tsx contexts/__tests__/AuthContext.test.tsx "app/(tabs)/perfil.tsx"
git commit -m "fix(perfil): modal de nome legível no tema claro e edição só com login"
```

---

### Task 2: Travas de acesso (módulo puro)

**Files:**
- Create: `supabase/functions/_shared/regras-acessos.ts`
- Test: `services/__tests__/regras-acessos.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface MudancaAdmin {
    solicitanteId: string; alvoId: string; tornarAdmin: boolean;
    alvoEhAdmin: boolean; totalAdmins: number;
  }
  export type ResultadoValidacao = { ok: true } | { ok: false; erro: string };
  export const ERRO_REMOVER_SI_MESMO: string;
  export const ERRO_ULTIMO_ADMIN: string;
  export function validarMudancaAdmin(m: MudancaAdmin): ResultadoValidacao;
  ```

- [ ] **Step 1: Escrever o teste que falha**

`services/__tests__/regras-acessos.test.ts` (fica em `services/__tests__` com os demais testes; importa o módulo por caminho relativo):

```ts
import {
  validarMudancaAdmin,
  ERRO_REMOVER_SI_MESMO,
  ERRO_ULTIMO_ADMIN,
} from '../../supabase/functions/_shared/regras-acessos';

const base = { solicitanteId: 'eu', alvoId: 'outro', alvoEhAdmin: true, totalAdmins: 2 };

describe('validarMudancaAdmin', () => {
  it('permite promover alguém', () => {
    expect(validarMudancaAdmin({ ...base, tornarAdmin: true, alvoEhAdmin: false })).toEqual({ ok: true });
  });

  it('permite remover outro admin quando sobra pelo menos um', () => {
    expect(validarMudancaAdmin({ ...base, tornarAdmin: false })).toEqual({ ok: true });
  });

  it('recusa remover o próprio acesso', () => {
    expect(validarMudancaAdmin({ ...base, tornarAdmin: false, alvoId: 'eu' }))
      .toEqual({ ok: false, erro: ERRO_REMOVER_SI_MESMO });
  });

  it('recusa remover o último admin', () => {
    expect(validarMudancaAdmin({ ...base, tornarAdmin: false, totalAdmins: 1 }))
      .toEqual({ ok: false, erro: ERRO_ULTIMO_ADMIN });
  });

  it('é idempotente: promover quem já é admin e rebaixar quem não é passam', () => {
    expect(validarMudancaAdmin({ ...base, tornarAdmin: true })).toEqual({ ok: true });
    expect(validarMudancaAdmin({ ...base, tornarAdmin: false, alvoEhAdmin: false, totalAdmins: 1 }))
      .toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `yarn test services/__tests__/regras-acessos.test.ts`
Expected: FAIL — `Cannot find module '../../supabase/functions/_shared/regras-acessos'`.

- [ ] **Step 3: Implementar**

`supabase/functions/_shared/regras-acessos.ts`:

```ts
// Travas de dar/tirar super-admin. Módulo puro (sem imports) para ser usado
// pela Edge Function admin-acessos (Deno) e testado pelo Jest do app.

export interface MudancaAdmin {
  solicitanteId: string;
  alvoId: string;
  tornarAdmin: boolean;
  alvoEhAdmin: boolean;
  totalAdmins: number;
}

export type ResultadoValidacao = { ok: true } | { ok: false; erro: string };

export const ERRO_REMOVER_SI_MESMO = 'Você não pode remover o seu próprio acesso de admin.';
export const ERRO_ULTIMO_ADMIN = 'O Arcanus precisa de pelo menos um admin.';

export function validarMudancaAdmin(m: MudancaAdmin): ResultadoValidacao {
  // Promover, ou "rebaixar" quem já não é admin, nunca tranca ninguém para fora.
  if (m.tornarAdmin || !m.alvoEhAdmin) return { ok: true };
  if (m.alvoId === m.solicitanteId) return { ok: false, erro: ERRO_REMOVER_SI_MESMO };
  if (m.totalAdmins <= 1) return { ok: false, erro: ERRO_ULTIMO_ADMIN };
  return { ok: true };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `yarn test services/__tests__/regras-acessos.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/regras-acessos.ts services/__tests__/regras-acessos.test.ts
git commit -m "feat(acessos): travas puras para dar e tirar super-admin"
```

---

### Task 3: Edge Function `admin-acessos` + segurança versionada

**Files:**
- Create: `supabase/functions/admin-acessos/index.ts`
- Modify: `supabase/config.toml` (acrescentar bloco no fim)
- Create: `supabase/painel-seguranca-perfis.sql`
- Delete: `services/admin.ts`

**Interfaces:**
- Consumes: `validarMudancaAdmin` (Task 2), importado como `'../_shared/regras-acessos.ts'`.
- Produces (contrato HTTP, usado pela Task 7): `POST /functions/v1/admin-acessos`, JWT do usuário no header.
  - `{ "acao": "listar" }` → `200 { "usuarios": UsuarioAcesso[] }`
  - `{ "acao": "definir-admin", "usuarioId": "<uuid>", "admin": true|false }` → `200 { "usuario": UsuarioAcesso }`
  - Erros: `401 { erro }` sem sessão · `403 { erro: "Acesso negado" }` não é super-admin · `400 { erro }` input inválido · `404 { erro: "Usuário não encontrado" }` · `409 { erro }` trava (texto de `ERRO_REMOVER_SI_MESMO`/`ERRO_ULTIMO_ADMIN`) · `502`/`503 { erro }` falha interna.
  - `UsuarioAcesso` = `{ id: string; nome: string | null; email: string | null; criado_em: string; plano: 'gratuito'|'iniciante'|'explorador'|'mestre'; is_super_admin: boolean }`.

Sem teste unitário (Deno fica fora do Jest); a lógica de decisão já está testada na Task 2. A função é exercitada no roteiro manual da Task 10.

- [ ] **Step 1: Escrever a função**

`supabase/functions/admin-acessos/index.ts`:

```ts
// supabase/functions/admin-acessos/index.ts
// Lista usuários e dá/tira super-admin. Só super-admin chama (conferido no
// servidor, nunca pelo body). Grava com service role: o cliente não tem
// permissão de UPDATE em role/is_super_admin (supabase/painel-seguranca-perfis.sql).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { validarMudancaAdmin } from '../_shared/regras-acessos.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function resposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUNAS = 'id, nome, email, criado_em, plano, is_super_admin';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return resposta({ erro: 'Método não permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return resposta({ erro: 'Configuração indisponível' }, 503);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // 1) Autorização pelo JWT do request.
  const authorization = request.headers.get('Authorization') ?? '';
  const jwt = authorization.replace(/^Bearer\s+/i, '');
  if (!jwt) return resposta({ erro: 'Sem sessão' }, 401);
  const { data: auth, error: erroAuth } = await supabaseAdmin.auth.getUser(jwt);
  if (erroAuth || !auth?.user) return resposta({ erro: 'Sem sessão' }, 401);
  const solicitanteId = auth.user.id;
  const { data: solicitante } = await supabaseAdmin
    .from('perfis').select('is_super_admin').eq('id', solicitanteId).maybeSingle();
  if (!solicitante?.is_super_admin) return resposta({ erro: 'Acesso negado' }, 403);

  // 2) Corpo.
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return resposta({ erro: 'JSON inválido' }, 400);
  }
  const { acao, usuarioId, admin } = body;

  if (acao === 'listar') {
    const { data, error } = await supabaseAdmin
      .from('perfis').select(COLUNAS).order('criado_em', { ascending: false });
    if (error) {
      console.error('falha ao listar perfis', error.message);
      return resposta({ erro: 'Falha ao listar usuários' }, 502);
    }
    return resposta({ usuarios: data ?? [] });
  }

  if (acao === 'definir-admin') {
    if (typeof usuarioId !== 'string' || !UUID.test(usuarioId)) {
      return resposta({ erro: 'usuarioId inválido' }, 400);
    }
    if (typeof admin !== 'boolean') return resposta({ erro: 'admin inválido' }, 400);

    const { data: alvo, error: erroAlvo } = await supabaseAdmin
      .from('perfis').select('id, is_super_admin').eq('id', usuarioId).maybeSingle();
    if (erroAlvo) {
      console.error('falha ao ler perfil alvo', erroAlvo.message);
      return resposta({ erro: 'Falha ao ler o usuário' }, 502);
    }
    if (!alvo) return resposta({ erro: 'Usuário não encontrado' }, 404);

    const { count, error: erroContagem } = await supabaseAdmin
      .from('perfis').select('id', { count: 'exact', head: true }).eq('is_super_admin', true);
    if (erroContagem || count === null) {
      console.error('falha ao contar admins', erroContagem?.message);
      return resposta({ erro: 'Falha ao conferir os admins' }, 502);
    }

    const validacao = validarMudancaAdmin({
      solicitanteId,
      alvoId: usuarioId,
      tornarAdmin: admin,
      alvoEhAdmin: alvo.is_super_admin === true,
      totalAdmins: count,
    });
    if (!validacao.ok) return resposta({ erro: validacao.erro }, 409);

    const campos = admin
      ? { role: 'super_admin', is_super_admin: true }
      : { role: 'usuario', is_super_admin: false, permissions: [] as string[] };
    const { data: salvo, error: erroSalvar } = await supabaseAdmin
      .from('perfis').update(campos).eq('id', usuarioId).select(COLUNAS).single();
    if (erroSalvar) {
      console.error('falha ao gravar papel', erroSalvar.message);
      return resposta({ erro: 'Falha ao salvar' }, 502);
    }
    return resposta({ usuario: salvo });
  }

  return resposta({ erro: 'acao inválida' }, 400);
});
```

- [ ] **Step 2: Declarar no `config.toml`**

Acrescentar ao fim de `supabase/config.toml`:

```toml

# admin-acessos: exige JWT valido (default). A funcao ainda checa
# is_super_admin no perfil antes de ler/gravar papeis (defesa em profundidade).
[functions.admin-acessos]
verify_jwt = true
```

- [ ] **Step 3: Versionar a correção de segurança**

`supabase/painel-seguranca-perfis.sql`:

```sql
-- ============================================================
-- Arcanus — colunas graváveis de public.perfis (padrão fechado)
-- APLICADO EM PRODUÇÃO EM 15/09/2026 (SQL Editor, projeto rfdjukdbrtvvulaxbzwb).
-- Idempotente: rodar de novo não muda nada.
--
-- Problema corrigido: a policy "Usuário edita só o próprio perfil" não limita
-- colunas e o Supabase dá UPDATE na tabela inteira a anon/authenticated. Qualquer
-- usuário logado gravava is_super_admin, plano e stripe_customer_id na própria linha.
--
-- Regra: o app só grava as colunas listadas no GRANT. Todo o resto — e qualquer
-- coluna criada no futuro — só muda por service role (Edge Functions).
-- Coluna nova de perfil que o usuário edita (ex.: perfil rico) precisa de
-- "grant update (coluna) on public.perfis to authenticated" na migração dela.
--
-- A ordem importa: revogar o privilégio da TABELA também apaga os de COLUNA,
-- então o revoke vem antes do grant.
-- ============================================================

revoke insert, update, delete, truncate, references, trigger
  on public.perfis from anon, authenticated;

grant update (nome, avatar_url, data_nascimento, signo, caminho_espiritual,
              intencao, xp, nivel, ultima_consulta_em)
  on public.perfis to authenticated;

-- Conferência (deve voltar FECHADA e true):
-- select case when has_column_privilege('authenticated', 'public.perfis', 'is_super_admin', 'UPDATE')
--             then 'ABERTA' else 'FECHADA' end as falha,
--        has_column_privilege('authenticated', 'public.perfis', 'nome', 'UPDATE') as nome_editavel;

-- ROLLBACK (reabre a falha — só em emergência, e corrigir em seguida):
-- grant update on public.perfis to authenticated;
```

- [ ] **Step 4: Remover `services/admin.ts`**

Confirmar que ninguém importa:

Run: `grep -rn "services/admin\|AdminServico" app components contexts hooks services utils`
Expected: só linhas de dentro do próprio `services/admin.ts`.

Run: `git rm services/admin.ts`

- [ ] **Step 5: Verificar**

Run: `yarn typecheck && yarn test`
Expected: typecheck sem erros; todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/admin-acessos/index.ts supabase/config.toml supabase/painel-seguranca-perfis.sql
git commit -m "feat(acessos): Edge Function admin-acessos e versiona a trava de colunas de perfis"
```

---

### Task 4: Moldura do painel com abas (Planos movida)

**Files:**
- Create: `utils/abasManager.ts`
- Test: `utils/__tests__/abasManager.test.ts`
- Create: `components/manager/tipos.ts`
- Create: `components/manager/AbaPlanos.tsx` (conteúdo atual de `app/manager.tsx`, sem mudança de comportamento)
- Create: `components/manager/AbaRoadmap.tsx` e `components/manager/AbaAcessos.tsx` (versão mínima; o corpo real vem nas Tasks 6 e 8)
- Modify: `app/manager.tsx` (reescrito como moldura)
- Modify: `app/(tabs)/perfil.tsx` (rótulo do link)
- Test: `app/__tests__/manager.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // utils/abasManager.ts
  export const ABAS_MANAGER: readonly ['planos', 'roadmap', 'acessos'];
  export type AbaManager = 'planos' | 'roadmap' | 'acessos';
  export const ROTULO_ABA: Record<AbaManager, string>;
  export function resolverAba(valor: string | string[] | undefined): AbaManager;
  // components/manager/tipos.ts
  export interface PropsAbaManager { aoPerderAcesso: () => void }
  // componentes
  export function AbaPlanos(props: PropsAbaManager): JSX.Element;
  export function AbaRoadmap(props: PropsAbaManager): JSX.Element;
  export function AbaAcessos(props: PropsAbaManager): JSX.Element;
  ```
- `aoPerderAcesso` (definido na moldura): avisa "Seu acesso de admin foi removido.", recarrega o perfil e volta ao Perfil. As abas o chamam quando recebem `AcessoNegadoError`.

- [ ] **Step 1: Teste da resolução de aba (falha)**

`utils/__tests__/abasManager.test.ts`:

```ts
import { ABAS_MANAGER, ROTULO_ABA, resolverAba } from '../abasManager';

describe('resolverAba', () => {
  it('aceita as três abas', () => {
    expect(resolverAba('planos')).toBe('planos');
    expect(resolverAba('roadmap')).toBe('roadmap');
    expect(resolverAba('acessos')).toBe('acessos');
  });

  it('cai em planos quando falta, é inválido ou vem repetido', () => {
    expect(resolverAba(undefined)).toBe('planos');
    expect(resolverAba('outra')).toBe('planos');
    expect(resolverAba(['roadmap', 'acessos'])).toBe('roadmap');
  });

  it('tem rótulo para cada aba, na ordem de exibição', () => {
    expect(ABAS_MANAGER.map((a) => ROTULO_ABA[a])).toEqual(['Planos', 'Roadmap', 'Acessos']);
  });
});
```

Run: `yarn test utils/__tests__/abasManager.test.ts`
Expected: FAIL — `Cannot find module '../abasManager'`.

- [ ] **Step 2: Implementar `utils/abasManager.ts`**

```ts
export const ABAS_MANAGER = ['planos', 'roadmap', 'acessos'] as const;
export type AbaManager = (typeof ABAS_MANAGER)[number];

export const ROTULO_ABA: Record<AbaManager, string> = {
  planos: 'Planos',
  roadmap: 'Roadmap',
  acessos: 'Acessos',
};

/** Lê o ?aba= da URL. Valor ausente ou inválido abre Planos. */
export function resolverAba(valor: string | string[] | undefined): AbaManager {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  return (ABAS_MANAGER as readonly string[]).includes(bruto ?? '') ? (bruto as AbaManager) : 'planos';
}
```

Run: `yarn test utils/__tests__/abasManager.test.ts`
Expected: PASS

- [ ] **Step 3: Tipos e abas mínimas**

`components/manager/tipos.ts`:

```ts
export interface PropsAbaManager {
  /** Chamado quando o servidor recusa por falta de permissão de admin. */
  aoPerderAcesso: () => void;
}
```

`components/manager/AbaRoadmap.tsx` (substituído na Task 6):

```tsx
import { Text } from 'react-native';
import type { PropsAbaManager } from './tipos';

export function AbaRoadmap(_props: PropsAbaManager) {
  return <Text>Roadmap</Text>;
}
```

`components/manager/AbaAcessos.tsx` (substituído na Task 8):

```tsx
import { Text } from 'react-native';
import type { PropsAbaManager } from './tipos';

export function AbaAcessos(_props: PropsAbaManager) {
  return <Text>Acessos</Text>;
}
```

- [ ] **Step 4: Mover a tela de planos para `components/manager/AbaPlanos.tsx`**

Mesma lógica, textos e estilos do `app/manager.tsx` atual, sem cabeçalho, `SafeAreaView` e `GradientBackground` (agora da moldura) e com imports um nível acima:

```tsx
import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { carregarConfigPlanos, salvarPlano, type PlanoStripe } from '../../services/configPlanos';
import { MOEDAS_SUPORTADAS, SIMBOLO, type MoedaSuportada } from '../../services/stripe-planos';
import { mostrarAlerta } from '../../utils/alerta';
import type { PropsAbaManager } from './tipos';

export function AbaPlanos(_props: PropsAbaManager) {
  const [planos, setPlanos] = useState<PlanoStripe[] | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const recarregar = () =>
    carregarConfigPlanos({ incluirNaoConfigurados: true })
      .then(setPlanos)
      .catch(() => setPlanos([]));

  useEffect(() => {
    recarregar();
  }, []);

  async function onSalvar(
    p: PlanoStripe,
    cota: number,
    precos: Record<MoedaSuportada, number>,
  ) {
    if (!Number.isFinite(cota) || cota <= 0 || MOEDAS_SUPORTADAS.some((m) => !(precos[m] > 0))) {
      mostrarAlerta('Valores inválidos', 'Cota e todos os preços devem ser maiores que zero.');
      return;
    }
    setSalvando(p.id);
    try {
      await salvarPlano(p.id, { cotaConsultas: cota, precos });
      await recarregar();
      mostrarAlerta('Plano atualizado', 'O preço novo já vale para novos checkouts.');
    } catch (e) {
      mostrarAlerta('Falha ao salvar', String((e as Error)?.message ?? e));
    } finally {
      setSalvando(null);
    }
  }

  if (!planos) return <ActivityIndicator style={{ marginTop: 48 }} color={Cores.acento} />;

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Text style={estilos.ajuda}>
        Ao salvar, um Price novo é criado na Stripe (o antigo é arquivado) e o app
        passa a exibir e cobrar o valor novo em novos checkouts.
      </Text>
      {planos.map((p) => (
        <CardPlano key={p.id} plano={p} salvando={salvando === p.id} onSalvar={onSalvar} />
      ))}
      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

function CardPlano({
  plano,
  salvando,
  onSalvar,
}: {
  plano: PlanoStripe;
  salvando: boolean;
  onSalvar: (p: PlanoStripe, cota: number, precos: Record<MoedaSuportada, number>) => void;
}) {
  const [cota, setCota] = useState(String(plano.cotaConsultas));
  const [precos, setPrecos] = useState<Record<MoedaSuportada, string>>({
    brl: String(plano.precos.brl),
    usd: String(plano.precos.usd),
    eur: String(plano.precos.eur),
    cad: String(plano.precos.cad),
  });

  function salvar() {
    const precosNum = {} as Record<MoedaSuportada, number>;
    for (const m of MOEDAS_SUPORTADAS) precosNum[m] = Number(precos[m].replace(',', '.'));
    onSalvar(plano, Number(cota), precosNum);
  }

  return (
    <View style={estilos.card}>
      <Text style={estilos.cardTitulo}>{plano.nome}</Text>
      <Text style={estilos.priceId}>
        {plano.stripePriceId ? `Price: ${plano.stripePriceId}` : 'Ainda não configurado na Stripe'}
      </Text>

      <View style={estilos.linha}>
        {MOEDAS_SUPORTADAS.map((m) => (
          <View key={m} style={estilos.campo}>
            <Text style={estilos.campoLabel}>{SIMBOLO[m]}</Text>
            <TextInput
              style={estilos.input}
              value={precos[m]}
              onChangeText={(v) => setPrecos((atual) => ({ ...atual, [m]: v }))}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={Cores.textoSecundario}
            />
          </View>
        ))}
      </View>

      <View style={estilos.campoCota}>
        <Text style={estilos.campoLabel}>Consultas/mês</Text>
        <TextInput
          style={estilos.input}
          value={cota}
          onChangeText={setCota}
          keyboardType="number-pad"
          placeholder="4"
          placeholderTextColor={Cores.textoSecundario}
        />
      </View>

      <Pressable
        onPress={salvar}
        disabled={salvando}
        style={[estilos.botao, salvando && estilos.botaoDesabilitado]}
      >
        <Text style={estilos.botaoTexto}>{salvando ? 'Criando Price…' : 'Salvar'}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: { paddingHorizontal: Espacamento.lg, gap: Espacamento.md },
  ajuda: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginBottom: Espacamento.xs,
  },
  card: {
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    gap: Espacamento.sm,
  },
  cardTitulo: { fontFamily: Fontes.corpoNegrito, fontSize: 18, color: Cores.textoClaro },
  priceId: { fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: Espacamento.sm },
  campo: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 120, flexGrow: 1 },
  campoCota: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Espacamento.xs },
  campoLabel: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario, minWidth: 40 },
  input: {
    flex: 1,
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoClaro,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  botao: {
    backgroundColor: Cores.acento,
    borderRadius: RaioBorda.full,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: Espacamento.sm,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { fontFamily: Fontes.corpoNegrito, fontSize: 15, color: '#fff' },
});
```

(Única diferença de comportamento: o `useEffect` não depende mais de `isSuper`, porque a moldura só monta a aba para super-admin.)

- [ ] **Step 5: Teste da moldura (falha)**

`app/__tests__/manager.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockSetParams = jest.fn();
let mockParams: { aba?: string } = {};
let mockIsSuper = true;

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => false,
    setParams: (...args: unknown[]) => mockSetParams(...args),
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/GradientBackground', () => {
  const { View } = require('react-native');
  return { GradientBackground: View };
});
jest.mock('../../hooks/useAdmin', () => ({ useIsSuperAdmin: () => mockIsSuper }));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ recarregarPerfil: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('../../utils/alerta', () => ({ mostrarAlerta: jest.fn() }));
jest.mock('../../components/manager/AbaPlanos', () => {
  const { Text } = require('react-native');
  return { AbaPlanos: () => <Text>conteudo-planos</Text> };
});
jest.mock('../../components/manager/AbaRoadmap', () => {
  const { Text } = require('react-native');
  return { AbaRoadmap: () => <Text>conteudo-roadmap</Text> };
});
jest.mock('../../components/manager/AbaAcessos', () => {
  const { Text } = require('react-native');
  return { AbaAcessos: () => <Text>conteudo-acessos</Text> };
});

import Manager from '../manager';

beforeEach(() => {
  mockParams = {};
  mockIsSuper = true;
  mockSetParams.mockClear();
});

describe('Painel (/manager)', () => {
  it('quem não é super-admin vê acesso restrito e nenhuma aba', () => {
    mockIsSuper = false;
    render(<Manager />);
    expect(screen.getByText('Acesso restrito.')).toBeTruthy();
    expect(screen.queryByText('conteudo-planos')).toBeNull();
  });

  it('abre em Planos sem ?aba=', () => {
    render(<Manager />);
    expect(screen.getByText('conteudo-planos')).toBeTruthy();
  });

  it('abre a aba do ?aba=', () => {
    mockParams = { aba: 'acessos' };
    render(<Manager />);
    expect(screen.getByText('conteudo-acessos')).toBeTruthy();
  });

  it('trocar de aba grava o ?aba= na URL', () => {
    render(<Manager />);
    fireEvent.press(screen.getByRole('tab', { name: 'Roadmap' }));
    expect(mockSetParams).toHaveBeenCalledWith({ aba: 'roadmap' });
  });
});
```

Run: `yarn test app/__tests__/manager.test.tsx`
Expected: FAIL — o `app/manager.tsx` atual não tem abas nem importa `components/manager/*`.

- [ ] **Step 6: Reescrever `app/manager.tsx` como moldura**

```tsx
import { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientBackground } from '../components/GradientBackground';
import { AbaPlanos } from '../components/manager/AbaPlanos';
import { AbaRoadmap } from '../components/manager/AbaRoadmap';
import { AbaAcessos } from '../components/manager/AbaAcessos';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { useIsSuperAdmin } from '../hooks/useAdmin';
import { useAuth } from '../contexts/AuthContext';
import { ABAS_MANAGER, ROTULO_ABA, resolverAba } from '../utils/abasManager';
import { mostrarAlerta } from '../utils/alerta';

export default function Manager() {
  const isSuper = useIsSuperAdmin();
  const { recarregarPerfil } = useAuth();
  const { aba: abaParam } = useLocalSearchParams<{ aba?: string | string[] }>();
  const aba = resolverAba(abaParam);

  // Aberto direto pela URL (sem histórico), router.back() é no-op: cai no perfil.
  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/perfil'));

  const aoPerderAcesso = useCallback(() => {
    mostrarAlerta('Acesso removido', 'Seu acesso de admin foi removido.');
    recarregarPerfil().finally(() => router.replace('/perfil'));
  }, [recarregarPerfil]);

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safe}>
        <View style={estilos.header}>
          <Pressable onPress={voltar} style={estilos.voltar} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
          </Pressable>
          <Text style={estilos.titulo}>Painel</Text>
        </View>

        {!isSuper ? (
          <Text style={estilos.restrito}>Acesso restrito.</Text>
        ) : (
          <>
            <View style={estilos.abas} accessibilityRole="tablist">
              {ABAS_MANAGER.map((a) => {
                const ativa = a === aba;
                return (
                  <Pressable
                    key={a}
                    accessibilityRole="tab"
                    accessibilityLabel={ROTULO_ABA[a]}
                    accessibilityState={{ selected: ativa }}
                    onPress={() => router.setParams({ aba: a })}
                    style={[estilos.aba, ativa && estilos.abaAtiva]}
                  >
                    <Text style={[estilos.abaTexto, ativa && estilos.abaTextoAtivo]}>{ROTULO_ABA[a]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={estilos.conteudo}>
              {aba === 'planos' && <AbaPlanos aoPerderAcesso={aoPerderAcesso} />}
              {aba === 'roadmap' && <AbaRoadmap aoPerderAcesso={aoPerderAcesso} />}
              {aba === 'acessos' && <AbaAcessos aoPerderAcesso={aoPerderAcesso} />}
            </View>
          </>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Espacamento.lg,
    paddingTop: Espacamento.sm,
    paddingBottom: Espacamento.md,
    gap: Espacamento.md,
  },
  voltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontFamily: Fontes.titulo, fontSize: 22, fontWeight: '700', color: Cores.textoClaro },
  restrito: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    paddingHorizontal: Espacamento.lg,
    marginTop: 48,
    textAlign: 'center',
  },
  abas: {
    flexDirection: 'row',
    marginHorizontal: Espacamento.lg,
    marginBottom: Espacamento.md,
    padding: Espacamento.xs,
    gap: Espacamento.xs,
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.full,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  aba: { flex: 1, paddingVertical: Espacamento.sm, borderRadius: RaioBorda.full, alignItems: 'center' },
  abaAtiva: { backgroundColor: Cores.acento },
  abaTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.textoSecundario },
  abaTextoAtivo: { color: '#fff' },
  conteudo: { flex: 1 },
});
```

Run: `yarn test app/__tests__/manager.test.tsx`
Expected: PASS (4 testes)

- [ ] **Step 7: Link "Painel" no Perfil**

Em `app/(tabs)/perfil.tsx`, no bloco "Administração (só super-admin)", trocar o texto do link:

```tsx
                  <Text style={{ fontSize: 15, fontWeight: '700', color: Cores.textoClaro }}>Painel</Text>
```

- [ ] **Step 8: Verificar**

Run: `yarn typecheck && yarn test`
Expected: typecheck sem erros; todos os testes passam.

- [ ] **Step 9: Commit**

```bash
git add utils/abasManager.ts utils/__tests__/abasManager.test.ts components/manager app/manager.tsx app/__tests__/manager.test.tsx "app/(tabs)/perfil.tsx"
git commit -m "feat(painel): moldura do /manager com abas Planos, Roadmap e Acessos"
```

---

### Task 5: Roadmap — banco, regras puras e serviço

**Files:**
- Create: `supabase/roadmap.sql`
- Create: `utils/roadmap.ts`
- Test: `utils/__tests__/roadmap.test.ts`
- Create: `services/acessoNegado.ts`
- Create: `services/roadmap.ts`
- Test: `services/__tests__/roadmap.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // utils/roadmap.ts
  export type StatusRoadmap = 'todo' | 'run' | 'ok' | 'block';
  export const STATUS_ROADMAP: readonly StatusRoadmap[];
  export const ROTULO_STATUS: Record<StatusRoadmap, string>;
  export interface ItemRoadmap {
    id: string; fase: string; titulo: string; descricao: string | null;
    status: StatusRoadmap; ordem: number; criado_em: string; atualizado_em: string;
  }
  export interface GrupoRoadmap { fase: string; itens: ItemRoadmap[] }
  export function agruparPorFase(itens: ItemRoadmap[]): GrupoRoadmap[];
  export function calcularProgresso(itens: ItemRoadmap[]): { concluidos: number; total: number };
  export function proximaOrdem(itens: ItemRoadmap[], fase: string): number;
  // services/acessoNegado.ts
  export const MENSAGEM_ACESSO_NEGADO: string;
  export class AcessoNegadoError extends Error {}
  export function ehAcessoNegado(e: unknown): boolean;
  // services/roadmap.ts
  export interface DadosItemRoadmap {
    fase: string; titulo: string; descricao: string | null; status: StatusRoadmap; ordem: number;
  }
  export function listarRoadmap(): Promise<ItemRoadmap[]>;
  export function criarItemRoadmap(dados: DadosItemRoadmap): Promise<ItemRoadmap>;
  export function atualizarItemRoadmap(id: string, dados: Partial<DadosItemRoadmap>): Promise<ItemRoadmap>;
  export function excluirItemRoadmap(id: string): Promise<void>;
  ```
- Regra de erro dos serviços: permissão negada (erro Postgres `42501`, ou update/delete que não afeta nenhuma linha) → rejeita com `AcessoNegadoError`; qualquer outro erro → `Error` com a mensagem do Supabase. Os consumidores testam com `ehAcessoNegado(e)`, e não com `instanceof`, pra não depender de como o Babel compila `extends Error`.

- [ ] **Step 1: Escrever `supabase/roadmap.sql`**

```sql
-- ============================================================
-- Arcanus — roadmap interno (aba Roadmap do /manager)
-- Rodar no SQL Editor do projeto rfdjukdbrtvvulaxbzwb. Idempotente.
-- Só super-admin lê e grava (RLS via public.is_super_admin()).
-- Substitui o site/roadmap.html (senha no cliente, conteúdo público no GitHub).
-- ============================================================

create table if not exists public.roadmap_itens (
  id             uuid primary key default gen_random_uuid(),
  fase           text not null check (length(trim(fase)) > 0),
  titulo         text not null check (length(trim(titulo)) > 0),
  descricao      text,
  status         text not null default 'todo' check (status in ('todo', 'run', 'ok', 'block')),
  ordem          int  not null default 0,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null
);

alter table public.roadmap_itens enable row level security;

-- O Supabase dá privilégios a anon em tabelas novas do schema public: tirar.
revoke all on public.roadmap_itens from anon;
grant select, insert, update, delete on public.roadmap_itens to authenticated;

drop policy if exists "roadmap super admin le" on public.roadmap_itens;
create policy "roadmap super admin le"
  on public.roadmap_itens for select to authenticated
  using (public.is_super_admin());

drop policy if exists "roadmap super admin cria" on public.roadmap_itens;
create policy "roadmap super admin cria"
  on public.roadmap_itens for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists "roadmap super admin edita" on public.roadmap_itens;
create policy "roadmap super admin edita"
  on public.roadmap_itens for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "roadmap super admin exclui" on public.roadmap_itens;
create policy "roadmap super admin exclui"
  on public.roadmap_itens for delete to authenticated
  using (public.is_super_admin());

-- Carimbo de quem/quando, preenchido pelo banco (o cliente não forja).
create or replace function public.roadmap_carimbar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  new.atualizado_por = auth.uid();
  return new;
end;
$$;

drop trigger if exists roadmap_itens_carimbar on public.roadmap_itens;
create trigger roadmap_itens_carimbar
  before insert or update on public.roadmap_itens
  for each row execute procedure public.roadmap_carimbar();

-- Carga inicial: os 20 itens do site/roadmap.html (versão de 14/09). Só se vazia.
insert into public.roadmap_itens (fase, titulo, descricao, status, ordem)
select v.fase, v.titulo, v.descricao, v.status, v.ordem
from (values
  ('Marca & Produto', 'Rebrand Oráculo Vivo → Arcanus', 'Nome, telas, scheme e e-mails trocados em todo o app e deployados.', 'ok', 1),
  ('Marca & Produto', '6 oráculos no app', 'Tarô, búzios, numerologia, mapa astral, lei da atração e leitura de imagem.', 'ok', 2),
  ('Marca & Produto', 'Identidade visual do site', 'Landing e roadmap na paleta e nas fontes da marca.', 'ok', 3),
  ('Infra & Backend', 'Supabase próprio (auth + banco)', 'Conta do Fabiano, RLS corrigido, cadastro ponta a ponta funcionando.', 'ok', 4),
  ('Infra & Backend', 'Deploy web (Vercel + Expo)', 'App no ar; build no servidor, root directory corrigido.', 'ok', 5),
  ('Infra & Backend', 'Recuperação de senha na web', 'Tela de nova senha e URLs de retorno do Supabase corrigidas (11/09).', 'ok', 6),
  ('Pagamento (Stripe)', 'Migração para Stripe', 'Assinatura recorrente multi-moeda BRL/USD/EUR/CAD, webhook endurecido. No ar desde 10/09.', 'ok', 7),
  ('Pagamento (Stripe)', 'Painel de planos (/manager)', 'Super-admin cria e atualiza preços na Stripe sem mexer em código.', 'ok', 8),
  ('Pagamento (Stripe)', 'Teste em test mode', 'Portal do cliente pronto; 1 de 3 planos cadastrado. Faltam Explorador, Mestre e o roteiro de compra, renovação e cancelamento.', 'run', 9),
  ('Pagamento (Stripe)', 'Go-live', 'Chaves live, planos recadastrados em live, 1 compra e 1 renovação reais.', 'todo', 10),
  ('E-mail & Domínio', 'Site e app no domínio', 'Site em arcanus.com.br, app em app.arcanus.com.br. Migração em andamento.', 'run', 11),
  ('E-mail & Domínio', 'Resend + SMTP + templates', 'Domínio verificado, remetente contato@arcanus.com.br, e-mails com a marca.', 'ok', 12),
  ('E-mail & Domínio', 'E-mail de boas-vindas', 'Ligar a função que envia o e-mail no cadastro.', 'todo', 13),
  ('E-mail & Domínio', 'Receber contato@arcanus.com.br', 'Encaminhar para o Gmail; o endereço já aparece nos Termos.', 'todo', 14),
  ('Site & Marketing', 'Landing institucional', 'Pronta; publicação junto com a migração do domínio.', 'run', 15),
  ('Site & Marketing', 'Estratégia de marketing', 'Personas, posicionamento, copy, canais e playbook de lançamento.', 'ok', 16),
  ('Site & Marketing', 'Campanha de lançamento', 'Depois do go-live do pagamento, com oferta de fundador.', 'todo', 17),
  ('App / Web — polimento', 'Perfil rico', 'Nome completo, hora e local de nascimento num lugar só, pré-preenchendo as ferramentas.', 'todo', 18),
  ('App / Web — polimento', 'SEO / Open Graph', 'Título, descrição e imagem de compartilhamento do app.', 'todo', 19),
  ('App / Web — polimento', 'Exclusão de conta real', 'Implementar o fluxo de deleção (LGPD/lojas).', 'todo', 20)
) as v(fase, titulo, descricao, status, ordem)
where not exists (select 1 from public.roadmap_itens);
```

(O SQL não é executado nesta task — roda na Task 10. Aqui ele só entra versionado.)

- [ ] **Step 2: Teste das regras puras (falha)**

`utils/__tests__/roadmap.test.ts`:

```ts
import {
  agruparPorFase, calcularProgresso, proximaOrdem,
  type ItemRoadmap,
} from '../roadmap';

function item(parcial: Partial<ItemRoadmap> & Pick<ItemRoadmap, 'id' | 'fase' | 'ordem'>): ItemRoadmap {
  return {
    titulo: parcial.id,
    descricao: null,
    status: 'todo',
    criado_em: '2026-09-15T00:00:00Z',
    atualizado_em: '2026-09-15T00:00:00Z',
    ...parcial,
  };
}

describe('agruparPorFase', () => {
  it('ordena fases pela menor ordem e itens por ordem', () => {
    const grupos = agruparPorFase([
      item({ id: 'b2', fase: 'B', ordem: 5 }),
      item({ id: 'a1', fase: 'A', ordem: 1 }),
      item({ id: 'b1', fase: 'B', ordem: 3 }),
      item({ id: 'a2', fase: 'A', ordem: 2 }),
    ]);
    expect(grupos.map((g) => g.fase)).toEqual(['A', 'B']);
    expect(grupos[1].itens.map((i) => i.id)).toEqual(['b1', 'b2']);
  });

  it('ordem repetida entre fases não embaralha as fases', () => {
    const grupos = agruparPorFase([
      item({ id: 'a1', fase: 'A', ordem: 1 }),
      item({ id: 'b1', fase: 'B', ordem: 2 }),
      item({ id: 'a-novo', fase: 'A', ordem: 2, criado_em: '2026-09-16T00:00:00Z' }),
    ]);
    expect(grupos.map((g) => g.fase)).toEqual(['A', 'B']);
    expect(grupos[0].itens.map((i) => i.id)).toEqual(['a1', 'a-novo']);
  });

  it('empate de ordem na mesma fase desempata pela criação', () => {
    const [grupo] = agruparPorFase([
      item({ id: 'depois', fase: 'A', ordem: 1, criado_em: '2026-09-16T00:00:00Z' }),
      item({ id: 'antes', fase: 'A', ordem: 1, criado_em: '2026-09-15T00:00:00Z' }),
    ]);
    expect(grupo.itens.map((i) => i.id)).toEqual(['antes', 'depois']);
  });

  it('lista vazia vira nenhum grupo', () => {
    expect(agruparPorFase([])).toEqual([]);
  });
});

describe('calcularProgresso', () => {
  it('conta só os concluídos', () => {
    expect(calcularProgresso([])).toEqual({ concluidos: 0, total: 0 });
    expect(calcularProgresso([
      item({ id: '1', fase: 'A', ordem: 1, status: 'ok' }),
      item({ id: '2', fase: 'A', ordem: 2, status: 'run' }),
      item({ id: '3', fase: 'A', ordem: 3, status: 'block' }),
    ])).toEqual({ concluidos: 1, total: 3 });
  });
});

describe('proximaOrdem', () => {
  const itens = [
    item({ id: 'a1', fase: 'A', ordem: 1 }),
    item({ id: 'a2', fase: 'A', ordem: 2 }),
    item({ id: 'b1', fase: 'B', ordem: 7 }),
  ];

  it('fase existente: maior ordem da fase + 1', () => {
    expect(proximaOrdem(itens, 'A')).toBe(3);
  });

  it('fase nova: maior ordem geral + 1 (vai para o fim)', () => {
    expect(proximaOrdem(itens, 'Nova')).toBe(8);
  });

  it('roadmap vazio começa em 1', () => {
    expect(proximaOrdem([], 'A')).toBe(1);
  });
});
```

Run: `yarn test utils/__tests__/roadmap.test.ts`
Expected: FAIL — `Cannot find module '../roadmap'`.

- [ ] **Step 3: Implementar `utils/roadmap.ts`**

```ts
export type StatusRoadmap = 'todo' | 'run' | 'ok' | 'block';

export const STATUS_ROADMAP: readonly StatusRoadmap[] = ['todo', 'run', 'ok', 'block'];

export const ROTULO_STATUS: Record<StatusRoadmap, string> = {
  todo: 'A fazer',
  run: 'Em andamento',
  ok: 'Concluído',
  block: 'Bloqueado',
};

export interface ItemRoadmap {
  id: string;
  fase: string;
  titulo: string;
  descricao: string | null;
  status: StatusRoadmap;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

export interface GrupoRoadmap {
  fase: string;
  itens: ItemRoadmap[];
}

function compararItens(a: ItemRoadmap, b: ItemRoadmap): number {
  return a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em);
}

/** Fases na ordem da menor `ordem` de cada uma; itens por `ordem`, empate pela criação. */
export function agruparPorFase(itens: ItemRoadmap[]): GrupoRoadmap[] {
  const porFase = new Map<string, ItemRoadmap[]>();
  for (const i of itens) {
    const lista = porFase.get(i.fase) ?? [];
    lista.push(i);
    porFase.set(i.fase, lista);
  }
  return [...porFase.entries()]
    .map(([fase, lista]) => ({ fase, itens: [...lista].sort(compararItens) }))
    .sort((a, b) => compararItens(a.itens[0], b.itens[0]));
}

export function calcularProgresso(itens: ItemRoadmap[]): { concluidos: number; total: number } {
  return { concluidos: itens.filter((i) => i.status === 'ok').length, total: itens.length };
}

/** Ordem de um item novo: fim da fase, ou fim do roadmap se a fase é nova. */
export function proximaOrdem(itens: ItemRoadmap[], fase: string): number {
  const daFase = itens.filter((i) => i.fase === fase);
  const referencia = daFase.length > 0 ? daFase : itens;
  return referencia.reduce((maior, i) => Math.max(maior, i.ordem), 0) + 1;
}
```

Run: `yarn test utils/__tests__/roadmap.test.ts`
Expected: PASS (8 testes)

- [ ] **Step 4: Teste do serviço (falha)**

`services/__tests__/roadmap.test.ts`:

```ts
type Resultado = { data: unknown; error: { code?: string; message?: string } | null };

const mockFrom = jest.fn();
jest.mock('../supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import {
  listarRoadmap, criarItemRoadmap, atualizarItemRoadmap, excluirItemRoadmap,
} from '../roadmap';

/** Cadeia do supabase-js: todo método devolve a própria cadeia; `await` resolve no resultado. */
function cadeia(resultado: Resultado) {
  const c: Record<string, unknown> = {};
  for (const metodo of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single']) {
    c[metodo] = jest.fn(() => c);
  }
  c.then = (resolver: (r: Resultado) => unknown, rejeitar: (e: unknown) => unknown) =>
    Promise.resolve(resultado).then(resolver, rejeitar);
  return c;
}

const itemA = {
  id: 'a', fase: 'A', titulo: 'Item A', descricao: null, status: 'todo',
  ordem: 1, criado_em: '2026-09-15T00:00:00Z', atualizado_em: '2026-09-15T00:00:00Z',
};
const dados = { fase: 'A', titulo: 'Item A', descricao: null, status: 'todo' as const, ordem: 1 };

beforeEach(() => mockFrom.mockReset());

describe('services/roadmap', () => {
  it('lista os itens da tabela roadmap_itens', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [itemA], error: null }));
    await expect(listarRoadmap()).resolves.toEqual([itemA]);
    expect(mockFrom).toHaveBeenCalledWith('roadmap_itens');
  });

  it('criar recusado pela RLS (42501) vira AcessoNegadoError', async () => {
    mockFrom.mockReturnValue(cadeia({ data: null, error: { code: '42501', message: 'rls' } }));
    await expect(criarItemRoadmap(dados)).rejects.toMatchObject({ name: 'AcessoNegadoError' });
  });

  it('atualizar sem nenhuma linha afetada vira AcessoNegadoError', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [], error: null }));
    await expect(atualizarItemRoadmap('a', { titulo: 'Novo' })).rejects.toMatchObject({ name: 'AcessoNegadoError' });
  });

  it('atualizar devolve a linha gravada', async () => {
    mockFrom.mockReturnValue(cadeia({ data: [{ ...itemA, titulo: 'Novo' }], error: null }));
    await expect(atualizarItemRoadmap('a', { titulo: 'Novo' })).resolves.toMatchObject({ titulo: 'Novo' });
  });

  it('erro comum mantém a mensagem do Supabase', async () => {
    mockFrom.mockReturnValue(cadeia({ data: null, error: { code: '08006', message: 'sem conexão' } }));
    await expect(excluirItemRoadmap('a')).rejects.toThrow('sem conexão');
  });
});
```

Run: `yarn test services/__tests__/roadmap.test.ts`
Expected: FAIL — `Cannot find module '../roadmap'`.

- [ ] **Step 5: Implementar `services/acessoNegado.ts`**

```ts
export const MENSAGEM_ACESSO_NEGADO = 'Seu acesso de admin foi removido.';

/** O servidor recusou por falta de permissão de super-admin. */
export class AcessoNegadoError extends Error {
  constructor(mensagem: string = MENSAGEM_ACESSO_NEGADO) {
    super(mensagem);
    this.name = 'AcessoNegadoError';
    Object.setPrototypeOf(this, AcessoNegadoError.prototype);
  }
}

/** Use isto em vez de `instanceof`: não depende de como a classe foi compilada. */
export function ehAcessoNegado(e: unknown): boolean {
  return e instanceof AcessoNegadoError || (e as { name?: unknown } | null)?.name === 'AcessoNegadoError';
}
```

- [ ] **Step 6: Implementar `services/roadmap.ts`**

```ts
import { supabase } from './supabase';
import { AcessoNegadoError } from './acessoNegado';
import type { ItemRoadmap, StatusRoadmap } from '../utils/roadmap';

export interface DadosItemRoadmap {
  fase: string;
  titulo: string;
  descricao: string | null;
  status: StatusRoadmap;
  ordem: number;
}

const TABELA = 'roadmap_itens';
const COLUNAS = 'id, fase, titulo, descricao, status, ordem, criado_em, atualizado_em';
const PERMISSAO_NEGADA = '42501';

function traduzirErro(error: { code?: string; message?: string }): Error {
  if (error.code === PERMISSAO_NEGADA) return new AcessoNegadoError();
  return new Error(error.message || 'Falha ao acessar o roadmap.');
}

export async function listarRoadmap(): Promise<ItemRoadmap[]> {
  const { data, error } = await supabase.from(TABELA).select(COLUNAS).order('ordem', { ascending: true });
  if (error) throw traduzirErro(error);
  return (data ?? []) as ItemRoadmap[];
}

export async function criarItemRoadmap(dados: DadosItemRoadmap): Promise<ItemRoadmap> {
  const { data, error } = await supabase.from(TABELA).insert(dados).select(COLUNAS).single();
  if (error) throw traduzirErro(error);
  return data as ItemRoadmap;
}

// Sem permissão, a RLS não devolve erro no update/delete: só não afeta linha.
// Por isso pedimos as linhas de volta e tratamos "nenhuma" como acesso negado.
export async function atualizarItemRoadmap(
  id: string,
  dados: Partial<DadosItemRoadmap>,
): Promise<ItemRoadmap> {
  const { data, error } = await supabase.from(TABELA).update(dados).eq('id', id).select(COLUNAS);
  if (error) throw traduzirErro(error);
  const linhas = (data ?? []) as ItemRoadmap[];
  if (linhas.length === 0) throw new AcessoNegadoError();
  return linhas[0];
}

export async function excluirItemRoadmap(id: string): Promise<void> {
  const { data, error } = await supabase.from(TABELA).delete().eq('id', id).select('id');
  if (error) throw traduzirErro(error);
  if ((data ?? []).length === 0) throw new AcessoNegadoError();
}
```

Run: `yarn test services/__tests__/roadmap.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 7: Verificar**

Run: `yarn typecheck && yarn test`
Expected: typecheck sem erros; todos os testes passam.

- [ ] **Step 8: Commit**

```bash
git add supabase/roadmap.sql utils/roadmap.ts utils/__tests__/roadmap.test.ts services/acessoNegado.ts services/roadmap.ts services/__tests__/roadmap.test.ts
git commit -m "feat(roadmap): tabela com RLS de super-admin, regras de ordem e serviço"
```

---

### Task 6: Aba Roadmap

**Files:**
- Create: `components/manager/estilos.ts`
- Create: `components/manager/EstadoCarregamento.tsx`
- Create: `components/manager/EditorItemRoadmap.tsx`
- Modify: `components/manager/AbaRoadmap.tsx` (troca a versão mínima da Task 4)
- Test: `components/manager/__tests__/AbaRoadmap.test.tsx`

**Interfaces:**
- Consumes: `PropsAbaManager` (Task 4); `listarRoadmap`, `criarItemRoadmap`, `atualizarItemRoadmap`, `excluirItemRoadmap`, `DadosItemRoadmap` (Task 5); `ehAcessoNegado` (Task 5); `agruparPorFase`, `calcularProgresso`, `proximaOrdem`, `ROTULO_STATUS`, `STATUS_ROADMAP`, `ItemRoadmap`, `StatusRoadmap` (Task 5); `mostrarAlerta`, `confirmarAcao` (`utils/alerta.ts`).
- Produces (usados pela Task 8):
  ```ts
  // components/manager/estilos.ts
  export const estilosPainel: {
    conteudo, card, ajuda, titulo, botao, botaoSecundario, botaoDesabilitado,
    botaoTexto, botaoSecundarioTexto, input, chip, chipAtivo, chipTexto, chipTextoAtivo, erro
  }; // StyleSheet
  export const CORES_STATUS: Record<StatusRoadmap, { texto: string; fundo: string }>;
  // components/manager/EstadoCarregamento.tsx
  export function EstadoCarregamento(props: { erro: string | null; aoTentarDeNovo: () => void }): JSX.Element;
  ```

- [ ] **Step 1: Teste da aba (falha)**

`components/manager/__tests__/AbaRoadmap.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockListar = jest.fn();
const mockCriar = jest.fn();
const mockAtualizar = jest.fn();
const mockExcluir = jest.fn();
jest.mock('../../../services/roadmap', () => ({
  listarRoadmap: (...a: unknown[]) => mockListar(...a),
  criarItemRoadmap: (...a: unknown[]) => mockCriar(...a),
  atualizarItemRoadmap: (...a: unknown[]) => mockAtualizar(...a),
  excluirItemRoadmap: (...a: unknown[]) => mockExcluir(...a),
}));
const mockAlerta = jest.fn();
jest.mock('../../../utils/alerta', () => ({
  mostrarAlerta: (...a: unknown[]) => mockAlerta(...a),
  confirmarAcao: (_titulo: string, _mensagem: string, aoConfirmar: () => void) => aoConfirmar(),
}));

import { AbaRoadmap } from '../AbaRoadmap';
import { AcessoNegadoError } from '../../../services/acessoNegado';

const datas = { criado_em: '2026-09-15T00:00:00Z', atualizado_em: '2026-09-15T00:00:00Z' };
const itens = [
  { id: 'a', fase: 'Fase 1', titulo: 'Item A', descricao: null, status: 'ok', ordem: 1, ...datas },
  { id: 'b', fase: 'Fase 2', titulo: 'Item B', descricao: 'Detalhe B', status: 'todo', ordem: 2, ...datas },
];

beforeEach(() => jest.clearAllMocks());

describe('AbaRoadmap', () => {
  it('mostra progresso, fases e descrições', async () => {
    mockListar.mockResolvedValue(itens);
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    expect(await screen.findByText('1 de 2 concluídos')).toBeTruthy();
    expect(screen.getByText('Fase 1')).toBeTruthy();
    expect(screen.getByText('Fase 2')).toBeTruthy();
    expect(screen.getByText('Detalhe B')).toBeTruthy();
  });

  it('editar mantém a ordem quando a fase não muda', async () => {
    mockListar.mockResolvedValue(itens);
    mockAtualizar.mockResolvedValue({ ...itens[0], titulo: 'Item A2' });
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Editar Item A'));
    fireEvent.changeText(screen.getByLabelText('Título'), 'Item A2');
    fireEvent.press(screen.getByText('Salvar'));
    await waitFor(() => expect(mockAtualizar).toHaveBeenCalledWith('a', {
      titulo: 'Item A2', fase: 'Fase 1', descricao: null, status: 'ok', ordem: 1,
    }));
  });

  it('novo item numa fase existente vai para o fim dela', async () => {
    mockListar.mockResolvedValue(itens);
    mockCriar.mockResolvedValue({ ...itens[0], id: 'c' });
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByText('+ Novo item'));
    fireEvent.changeText(screen.getByLabelText('Título'), 'Item C');
    fireEvent.changeText(screen.getByLabelText('Fase'), 'Fase 1');
    fireEvent.press(screen.getByText('Salvar'));
    await waitFor(() => expect(mockCriar).toHaveBeenCalledWith({
      titulo: 'Item C', fase: 'Fase 1', descricao: null, status: 'todo', ordem: 2,
    }));
  });

  it('não cria item sem fase', async () => {
    mockListar.mockResolvedValue(itens);
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByText('+ Novo item'));
    fireEvent.changeText(screen.getByLabelText('Título'), 'Sem fase');
    fireEvent.press(screen.getByText('Salvar'));
    expect(mockAlerta).toHaveBeenCalledWith('Faltam dados', 'Preencha o título e a fase.');
    expect(mockCriar).not.toHaveBeenCalled();
  });

  it('acesso negado ao carregar chama aoPerderAcesso', async () => {
    mockListar.mockRejectedValue(new AcessoNegadoError());
    const aoPerderAcesso = jest.fn();
    render(<AbaRoadmap aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(aoPerderAcesso).toHaveBeenCalled());
  });

  it('falha comum mostra "Tentar de novo" e recarrega', async () => {
    mockListar.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(itens);
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    expect(await screen.findByText('Não foi possível carregar o roadmap.')).toBeTruthy();
    fireEvent.press(screen.getByText('Tentar de novo'));
    expect(await screen.findByText('1 de 2 concluídos')).toBeTruthy();
  });
});
```

Run: `yarn test components/manager/__tests__/AbaRoadmap.test.tsx`
Expected: FAIL — a `AbaRoadmap` mínima só renderiza "Roadmap".

- [ ] **Step 2: `components/manager/estilos.ts`**

```ts
import { StyleSheet } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import type { StatusRoadmap } from '../../utils/roadmap';

// Mesma família de cor das etiquetas do antigo site/roadmap.html; o texto foi
// escurecido para ficar legível em tamanho pequeno sobre o fundo creme.
export const CORES_STATUS: Record<StatusRoadmap, { texto: string; fundo: string }> = {
  ok: { texto: '#3F6650', fundo: 'rgba(88,117,101,0.14)' },
  run: { texto: '#8C6A2F', fundo: 'rgba(181,139,70,0.16)' },
  todo: { texto: '#6F6655', fundo: 'rgba(138,127,107,0.12)' },
  block: { texto: '#9A4B37', fundo: 'rgba(180,97,75,0.14)' },
};

export const estilosPainel = StyleSheet.create({
  conteudo: { paddingHorizontal: Espacamento.lg, gap: Espacamento.md },
  card: {
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    gap: Espacamento.sm,
  },
  ajuda: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario },
  titulo: { fontFamily: Fontes.corpoNegrito, fontSize: 16, color: Cores.textoPrimario },
  botao: {
    backgroundColor: Cores.acento,
    borderRadius: RaioBorda.full,
    paddingVertical: 10,
    paddingHorizontal: Espacamento.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoSecundario: {
    backgroundColor: Cores.fundoClaro,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.full,
    paddingVertical: 10,
    paddingHorizontal: Espacamento.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoDesabilitado: { opacity: 0.5 },
  botaoTexto: { fontFamily: Fontes.corpoNegrito, fontSize: 15, color: '#fff' },
  botaoSecundarioTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 15, color: Cores.textoPrimario },
  input: {
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoPrimario,
    backgroundColor: Cores.inputFundo,
    borderWidth: 1,
    borderColor: Cores.inputBorda,
    borderRadius: RaioBorda.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chip: {
    borderRadius: RaioBorda.full,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    backgroundColor: Cores.superficie,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipAtivo: { backgroundColor: Cores.acento, borderColor: Cores.acento },
  chipTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.textoSecundario },
  chipTextoAtivo: { color: '#fff' },
  erro: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.erro, textAlign: 'center' },
});
```

- [ ] **Step 3: `components/manager/EstadoCarregamento.tsx`**

```tsx
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Espacamento } from '../../constants/spacing';
import { estilosPainel } from './estilos';

/** Enquanto carrega: spinner. Se falhou: a mensagem e um botão para tentar de novo. */
export function EstadoCarregamento({
  erro,
  aoTentarDeNovo,
}: {
  erro: string | null;
  aoTentarDeNovo: () => void;
}) {
  if (!erro) return <ActivityIndicator style={estilos.espaco} color={Cores.acento} />;
  return (
    <View style={[estilos.espaco, estilos.erro]}>
      <Text style={estilosPainel.erro}>{erro}</Text>
      <Pressable onPress={aoTentarDeNovo} style={estilosPainel.botao} accessibilityRole="button">
        <Text style={estilosPainel.botaoTexto}>Tentar de novo</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  espaco: { marginTop: 48 },
  erro: { paddingHorizontal: Espacamento.lg, gap: Espacamento.md, alignItems: 'center' },
});
```

- [ ] **Step 4: `components/manager/EditorItemRoadmap.tsx`**

```tsx
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import {
  ROTULO_STATUS, STATUS_ROADMAP, type ItemRoadmap, type StatusRoadmap,
} from '../../utils/roadmap';
import { mostrarAlerta } from '../../utils/alerta';
import { estilosPainel } from './estilos';

export interface ValoresEditorRoadmap {
  fase: string;
  titulo: string;
  descricao: string | null;
  status: StatusRoadmap;
}

interface Props {
  visivel: boolean;
  /** `null` = item novo. */
  item: ItemRoadmap | null;
  fases: string[];
  salvando: boolean;
  aoSalvar: (valores: ValoresEditorRoadmap) => void;
  aoExcluir?: () => void;
  aoFechar: () => void;
}

export function EditorItemRoadmap({
  visivel, item, fases, salvando, aoSalvar, aoExcluir, aoFechar,
}: Props) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fase, setFase] = useState('');
  const [status, setStatus] = useState<StatusRoadmap>('todo');

  // Preenche só quando abre ou troca de item: recarregar a lista com o editor
  // aberto não pode apagar o que está sendo digitado.
  useEffect(() => {
    if (!visivel) return;
    setTitulo(item?.titulo ?? '');
    setDescricao(item?.descricao ?? '');
    setFase(item?.fase ?? '');
    setStatus(item?.status ?? 'todo');
  }, [visivel, item]);

  function salvar() {
    const t = titulo.trim();
    const f = fase.trim();
    if (!t || !f) {
      mostrarAlerta('Faltam dados', 'Preencha o título e a fase.');
      return;
    }
    aoSalvar({ titulo: t, fase: f, descricao: descricao.trim() || null, status });
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <View style={estilos.overlay}>
        <View style={estilos.card}>
          <ScrollView contentContainerStyle={estilos.corpo} keyboardShouldPersistTaps="handled">
            <Text style={estilos.titulo}>{item ? 'Editar item' : 'Novo item'}</Text>

            <Text style={estilos.rotulo}>Título</Text>
            <TextInput
              style={estilosPainel.input}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="O que precisa ser feito"
              placeholderTextColor={Cores.textoSecundario}
              maxLength={120}
              accessibilityLabel="Título"
            />

            <Text style={estilos.rotulo}>Descrição</Text>
            <TextInput
              style={[estilosPainel.input, estilos.descricao]}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Detalhes (opcional)"
              placeholderTextColor={Cores.textoSecundario}
              multiline
              accessibilityLabel="Descrição"
            />

            <Text style={estilos.rotulo}>Fase</Text>
            <View style={estilos.chips}>
              {fases.map((f) => {
                const ativa = f === fase;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFase(f)}
                    style={[estilosPainel.chip, ativa && estilosPainel.chipAtivo]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativa }}
                  >
                    <Text style={[estilosPainel.chipTexto, ativa && estilosPainel.chipTextoAtivo]}>{f}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={estilosPainel.input}
              value={fase}
              onChangeText={setFase}
              placeholder="ou digite uma fase nova"
              placeholderTextColor={Cores.textoSecundario}
              maxLength={60}
              accessibilityLabel="Fase"
            />

            <Text style={estilos.rotulo}>Status</Text>
            <View style={estilos.chips}>
              {STATUS_ROADMAP.map((s) => {
                const ativo = s === status;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[estilosPainel.chip, ativo && estilosPainel.chipAtivo]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativo }}
                  >
                    <Text style={[estilosPainel.chipTexto, ativo && estilosPainel.chipTextoAtivo]}>
                      {ROTULO_STATUS[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={estilos.botoes}>
              <Pressable
                onPress={aoFechar}
                style={[estilosPainel.botaoSecundario, estilos.botao]}
                accessibilityRole="button"
              >
                <Text style={estilosPainel.botaoSecundarioTexto}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={salvar}
                disabled={salvando}
                style={[estilosPainel.botao, estilos.botao, salvando && estilosPainel.botaoDesabilitado]}
                accessibilityRole="button"
              >
                {salvando
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={estilosPainel.botaoTexto}>Salvar</Text>}
              </Pressable>
            </View>

            {aoExcluir ? (
              <Pressable onPress={aoExcluir} disabled={salvando} style={estilos.excluir} accessibilityRole="button">
                <Text style={estilos.excluirTexto}>Excluir item</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(36,49,45,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Espacamento.lg,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    backgroundColor: Cores.superficie,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.lg,
  },
  corpo: { gap: Espacamento.sm },
  titulo: { fontFamily: Fontes.titulo, fontSize: 20, color: Cores.textoPrimario, marginBottom: Espacamento.xs },
  rotulo: { fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.textoSecundario, marginTop: Espacamento.xs },
  descricao: { minHeight: 72, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espacamento.xs },
  botoes: { flexDirection: 'row', gap: Espacamento.sm, marginTop: Espacamento.md },
  botao: { flex: 1 },
  excluir: { alignItems: 'center', paddingVertical: Espacamento.sm },
  excluirTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.erro },
});
```

- [ ] **Step 5: `components/manager/AbaRoadmap.tsx` (substitui o arquivo inteiro)**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import {
  atualizarItemRoadmap, criarItemRoadmap, excluirItemRoadmap, listarRoadmap,
} from '../../services/roadmap';
import { ehAcessoNegado } from '../../services/acessoNegado';
import {
  agruparPorFase, calcularProgresso, proximaOrdem, ROTULO_STATUS, type ItemRoadmap,
} from '../../utils/roadmap';
import { confirmarAcao, mostrarAlerta } from '../../utils/alerta';
import { EstadoCarregamento } from './EstadoCarregamento';
import { EditorItemRoadmap, type ValoresEditorRoadmap } from './EditorItemRoadmap';
import { CORES_STATUS, estilosPainel } from './estilos';
import type { PropsAbaManager } from './tipos';

type Edicao = { modo: 'novo' } | { modo: 'editar'; item: ItemRoadmap };

export function AbaRoadmap({ aoPerderAcesso }: PropsAbaManager) {
  const [itens, setItens] = useState<ItemRoadmap[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    setErro(null);
    listarRoadmap()
      .then(setItens)
      .catch((e) => {
        if (ehAcessoNegado(e)) {
          aoPerderAcesso();
          return;
        }
        setErro('Não foi possível carregar o roadmap.');
      });
  }, [aoPerderAcesso]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const grupos = useMemo(() => agruparPorFase(itens ?? []), [itens]);
  const progresso = useMemo(() => calcularProgresso(itens ?? []), [itens]);
  const fases = useMemo(() => grupos.map((g) => g.fase), [grupos]);

  function tratarFalha(e: unknown, titulo: string) {
    if (ehAcessoNegado(e)) {
      aoPerderAcesso();
      return;
    }
    mostrarAlerta(titulo, e instanceof Error ? e.message : String(e));
  }

  async function salvar(valores: ValoresEditorRoadmap) {
    if (!itens || !edicao) return;
    setSalvando(true);
    try {
      if (edicao.modo === 'novo') {
        await criarItemRoadmap({ ...valores, ordem: proximaOrdem(itens, valores.fase) });
      } else {
        const { item } = edicao;
        const ordem = valores.fase === item.fase
          ? item.ordem
          : proximaOrdem(itens.filter((i) => i.id !== item.id), valores.fase);
        await atualizarItemRoadmap(item.id, { ...valores, ordem });
      }
      setEdicao(null);
      carregar();
    } catch (e) {
      tratarFalha(e, 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item: ItemRoadmap) {
    setSalvando(true);
    try {
      await excluirItemRoadmap(item.id);
      setEdicao(null);
      carregar();
    } catch (e) {
      tratarFalha(e, 'Falha ao excluir');
    } finally {
      setSalvando(false);
    }
  }

  if (!itens) return <EstadoCarregamento erro={erro} aoTentarDeNovo={carregar} />;

  const pct = progresso.total ? Math.round((progresso.concluidos / progresso.total) * 100) : 0;
  const itemEmEdicao = edicao?.modo === 'editar' ? edicao.item : null;

  return (
    <>
      <ScrollView contentContainerStyle={estilosPainel.conteudo}>
        <View style={estilosPainel.card}>
          <Text style={estilosPainel.titulo}>{`${progresso.concluidos} de ${progresso.total} concluídos`}</Text>
          <View style={estilos.barra}>
            <View style={[estilos.barraCheia, { width: `${pct}%` as const }]} />
          </View>
        </View>

        <Pressable
          onPress={() => setEdicao({ modo: 'novo' })}
          style={estilosPainel.botao}
          accessibilityRole="button"
        >
          <Text style={estilosPainel.botaoTexto}>+ Novo item</Text>
        </Pressable>

        {grupos.map((grupo) => (
          <View key={grupo.fase} style={estilosPainel.card}>
            <Text style={estilos.fase}>{grupo.fase}</Text>
            {grupo.itens.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setEdicao({ modo: 'editar', item })}
                style={estilos.item}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${item.titulo}`}
              >
                <View style={estilos.itemTopo}>
                  <Text style={estilos.itemTitulo}>{item.titulo}</Text>
                  <Text
                    style={[
                      estilos.status,
                      { color: CORES_STATUS[item.status].texto, backgroundColor: CORES_STATUS[item.status].fundo },
                    ]}
                  >
                    {ROTULO_STATUS[item.status]}
                  </Text>
                </View>
                {item.descricao ? <Text style={estilosPainel.ajuda}>{item.descricao}</Text> : null}
              </Pressable>
            ))}
          </View>
        ))}
        <View style={estilos.rodape} />
      </ScrollView>

      <EditorItemRoadmap
        visivel={edicao !== null}
        item={itemEmEdicao}
        fases={fases}
        salvando={salvando}
        aoSalvar={salvar}
        aoExcluir={itemEmEdicao
          ? () => confirmarAcao(
            'Excluir item',
            `"${itemEmEdicao.titulo}" sai do roadmap.`,
            () => excluir(itemEmEdicao),
            { confirmarLabel: 'Excluir', destrutivo: true },
          )
          : undefined}
        aoFechar={() => setEdicao(null)}
      />
    </>
  );
}

const estilos = StyleSheet.create({
  barra: { height: 8, borderRadius: RaioBorda.full, backgroundColor: Cores.cardBorda, overflow: 'hidden' },
  barraCheia: { height: 8, backgroundColor: Cores.primaria },
  fase: { fontFamily: Fontes.tituloSemibold, fontSize: 17, color: Cores.textoPrimario },
  item: {
    paddingVertical: Espacamento.sm,
    borderTopWidth: 1,
    borderTopColor: Cores.cardBorda,
    gap: Espacamento.xs,
  },
  itemTopo: { flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm },
  itemTitulo: { flex: 1, fontFamily: Fontes.corpoSemibold, fontSize: 15, color: Cores.textoPrimario },
  status: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RaioBorda.full,
    overflow: 'hidden',
  },
  rodape: { height: 48 },
});
```

Run: `yarn test components/manager/__tests__/AbaRoadmap.test.tsx`
Expected: PASS (6 testes)

- [ ] **Step 6: Verificar**

Run: `yarn typecheck && yarn test`
Expected: typecheck sem erros; todos os testes passam.

- [ ] **Step 7: Commit**

```bash
git add components/manager/estilos.ts components/manager/EstadoCarregamento.tsx components/manager/EditorItemRoadmap.tsx components/manager/AbaRoadmap.tsx components/manager/__tests__/AbaRoadmap.test.tsx
git commit -m "feat(roadmap): aba Roadmap editável no painel"
```

---

### Task 7: Acessos — busca pura e serviço

**Files:**
- Create: `utils/acessos.ts`
- Test: `utils/__tests__/acessos.test.ts`
- Create: `services/acessos.ts`
- Test: `services/__tests__/acessos.test.ts`

**Interfaces:**
- Consumes: contrato HTTP da `admin-acessos` (Task 3); `AcessoNegadoError` (Task 5).
- Produces (usados pela Task 8):
  ```ts
  // utils/acessos.ts
  export type PlanoUsuario = 'gratuito' | 'iniciante' | 'explorador' | 'mestre';
  export interface UsuarioAcesso {
    id: string; nome: string | null; email: string | null;
    criado_em: string; plano: PlanoUsuario; is_super_admin: boolean;
  }
  export const ROTULO_PLANO: Record<PlanoUsuario, string>;
  export function filtrarUsuarios(usuarios: UsuarioAcesso[], termo: string): UsuarioAcesso[];
  // services/acessos.ts
  export function listarUsuarios(): Promise<UsuarioAcesso[]>;
  export function definirAdmin(usuarioId: string, admin: boolean): Promise<UsuarioAcesso>;
  ```
- Regra de erro: resposta `401`/`403` da função → `AcessoNegadoError`; outra resposta com corpo `{ erro }` → `Error(erro)` (ex.: a mensagem da trava no `409`); sem corpo legível → `Error('Falha ao falar com o servidor.')`.

- [ ] **Step 1: Teste da busca (falha)**

`utils/__tests__/acessos.test.ts`:

```ts
import { filtrarUsuarios, ROTULO_PLANO, type UsuarioAcesso } from '../acessos';

function usuario(parcial: Partial<UsuarioAcesso> & Pick<UsuarioAcesso, 'id'>): UsuarioAcesso {
  return {
    nome: null,
    email: null,
    criado_em: '2026-09-15T00:00:00Z',
    plano: 'gratuito',
    is_super_admin: false,
    ...parcial,
  };
}

const lista = [
  usuario({ id: '1', nome: 'João Mística', email: 'joao@exemplo.com' }),
  usuario({ id: '2', nome: 'Marcio', email: 'marcio@exemplo.com' }),
  usuario({ id: '3', nome: null, email: 'semnome@exemplo.com' }),
];

describe('filtrarUsuarios', () => {
  it('termo vazio ou só espaços devolve todos', () => {
    expect(filtrarUsuarios(lista, '')).toHaveLength(3);
    expect(filtrarUsuarios(lista, '   ')).toHaveLength(3);
  });

  it('acha pelo nome ignorando acento e caixa', () => {
    expect(filtrarUsuarios(lista, 'JOAO mis').map((u) => u.id)).toEqual(['1']);
  });

  it('acha pelo e-mail, inclusive de quem não tem nome', () => {
    expect(filtrarUsuarios(lista, 'semnome@').map((u) => u.id)).toEqual(['3']);
  });

  it('sem correspondência devolve lista vazia', () => {
    expect(filtrarUsuarios(lista, 'ninguém')).toEqual([]);
  });
});

describe('ROTULO_PLANO', () => {
  it('tem rótulo para os quatro planos', () => {
    expect(ROTULO_PLANO).toEqual({
      gratuito: 'Gratuito', iniciante: 'Iniciante', explorador: 'Explorador', mestre: 'Mestre',
    });
  });
});
```

Run: `yarn test utils/__tests__/acessos.test.ts`
Expected: FAIL — `Cannot find module '../acessos'`.

- [ ] **Step 2: Implementar `utils/acessos.ts`**

```ts
export type PlanoUsuario = 'gratuito' | 'iniciante' | 'explorador' | 'mestre';

export interface UsuarioAcesso {
  id: string;
  nome: string | null;
  email: string | null;
  criado_em: string;
  plano: PlanoUsuario;
  is_super_admin: boolean;
}

export const ROTULO_PLANO: Record<PlanoUsuario, string> = {
  gratuito: 'Gratuito',
  iniciante: 'Iniciante',
  explorador: 'Explorador',
  mestre: 'Mestre',
};

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Busca por nome ou e-mail, sem acento e sem caixa. Termo vazio devolve todos. */
export function filtrarUsuarios(usuarios: UsuarioAcesso[], termo: string): UsuarioAcesso[] {
  const busca = normalizar(termo);
  if (!busca) return usuarios;
  return usuarios.filter((u) => normalizar(`${u.nome ?? ''} ${u.email ?? ''}`).includes(busca));
}
```

Run: `yarn test utils/__tests__/acessos.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 3: Teste do serviço (falha)**

`services/__tests__/acessos.test.ts`:

```ts
const mockInvoke = jest.fn();
jest.mock('../supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

import { definirAdmin, listarUsuarios } from '../acessos';

/** Erro do supabase-js para resposta não-2xx: o Response fica em `context`. */
function erroHttp(status: number, corpo: unknown) {
  return { context: { status, json: async () => corpo } };
}

const marcio = {
  id: '6b1f3c1e-0000-4000-8000-000000000002', nome: 'Marcio', email: 'marcio@exemplo.com',
  criado_em: '2026-09-08T19:32:53Z', plano: 'gratuito', is_super_admin: false,
};

beforeEach(() => mockInvoke.mockReset());

describe('services/acessos', () => {
  it('listarUsuarios chama a função com acao=listar e devolve a lista', async () => {
    mockInvoke.mockResolvedValue({ data: { usuarios: [marcio] }, error: null });
    await expect(listarUsuarios()).resolves.toEqual([marcio]);
    expect(mockInvoke).toHaveBeenCalledWith('admin-acessos', { body: { acao: 'listar' } });
  });

  it('definirAdmin envia usuarioId e admin e devolve o usuário gravado', async () => {
    mockInvoke.mockResolvedValue({ data: { usuario: { ...marcio, is_super_admin: true } }, error: null });
    await expect(definirAdmin(marcio.id, true)).resolves.toMatchObject({ is_super_admin: true });
    expect(mockInvoke).toHaveBeenCalledWith('admin-acessos', {
      body: { acao: 'definir-admin', usuarioId: marcio.id, admin: true },
    });
  });

  it('403 vira AcessoNegadoError', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: erroHttp(403, { erro: 'Acesso negado' }) });
    await expect(listarUsuarios()).rejects.toMatchObject({ name: 'AcessoNegadoError' });
  });

  it('409 traz a mensagem da trava', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: erroHttp(409, { erro: 'O Arcanus precisa de pelo menos um admin.' }),
    });
    await expect(definirAdmin(marcio.id, false)).rejects.toThrow('O Arcanus precisa de pelo menos um admin.');
  });

  it('falha sem corpo legível usa mensagem genérica', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Failed to fetch') });
    await expect(listarUsuarios()).rejects.toThrow('Falha ao falar com o servidor.');
  });
});
```

Run: `yarn test services/__tests__/acessos.test.ts`
Expected: FAIL — `Cannot find module '../acessos'`.

- [ ] **Step 4: Implementar `services/acessos.ts`**

```ts
import { supabase } from './supabase';
import { AcessoNegadoError } from './acessoNegado';
import type { UsuarioAcesso } from '../utils/acessos';

const FUNCAO = 'admin-acessos';

/** supabase-js coloca o Response de respostas não-2xx em `error.context`. */
async function erroDaFuncao(error: unknown): Promise<Error> {
  const contexto = (error as { context?: { status?: number; json?: () => Promise<unknown> } } | null)?.context;
  if (contexto?.status === 401 || contexto?.status === 403) return new AcessoNegadoError();
  let mensagem: string | undefined;
  try {
    const corpo = await contexto?.json?.();
    const erro = (corpo as { erro?: unknown } | undefined)?.erro;
    if (typeof erro === 'string' && erro) mensagem = erro;
  } catch {
    // corpo não é JSON: fica a mensagem genérica
  }
  return new Error(mensagem ?? 'Falha ao falar com o servidor.');
}

export async function listarUsuarios(): Promise<UsuarioAcesso[]> {
  const { data, error } = await supabase.functions.invoke(FUNCAO, { body: { acao: 'listar' } });
  if (error) throw await erroDaFuncao(error);
  return (data as { usuarios?: UsuarioAcesso[] } | null)?.usuarios ?? [];
}

export async function definirAdmin(usuarioId: string, admin: boolean): Promise<UsuarioAcesso> {
  const { data, error } = await supabase.functions.invoke(FUNCAO, {
    body: { acao: 'definir-admin', usuarioId, admin },
  });
  if (error) throw await erroDaFuncao(error);
  return (data as { usuario: UsuarioAcesso }).usuario;
}
```

Run: `yarn test services/__tests__/acessos.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 5: Verificar**

Run: `yarn typecheck && yarn test`
Expected: typecheck sem erros; todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add utils/acessos.ts utils/__tests__/acessos.test.ts services/acessos.ts services/__tests__/acessos.test.ts
git commit -m "feat(acessos): busca de usuários e serviço da função admin-acessos"
```

---

### Task 8: Aba Acessos

**Files:**
- Modify: `components/manager/AbaAcessos.tsx` (troca a versão mínima da Task 4)
- Test: `components/manager/__tests__/AbaAcessos.test.tsx`

**Interfaces:**
- Consumes: `PropsAbaManager` (Task 4); `estilosPainel`, `EstadoCarregamento` (Task 6); `ehAcessoNegado` (Task 5); `listarUsuarios`, `definirAdmin` (Task 7); `filtrarUsuarios`, `ROTULO_PLANO`, `UsuarioAcesso` (Task 7); `useAuth().sessao` (`contexts/AuthContext.tsx`); `confirmarAcao`, `mostrarAlerta` (`utils/alerta.ts`).
- Produces: `export function AbaAcessos({ aoPerderAcesso }: PropsAbaManager): JSX.Element`.

- [ ] **Step 1: Teste da aba (falha)**

`components/manager/__tests__/AbaAcessos.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockListar = jest.fn();
const mockDefinir = jest.fn();
jest.mock('../../../services/acessos', () => ({
  listarUsuarios: (...a: unknown[]) => mockListar(...a),
  definirAdmin: (...a: unknown[]) => mockDefinir(...a),
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ sessao: { user: { id: 'eu' } } }),
}));
const mockAlerta = jest.fn();
jest.mock('../../../utils/alerta', () => ({
  mostrarAlerta: (...a: unknown[]) => mockAlerta(...a),
  confirmarAcao: (_titulo: string, _mensagem: string, aoConfirmar: () => void) => aoConfirmar(),
}));

import { AbaAcessos } from '../AbaAcessos';
import { AcessoNegadoError } from '../../../services/acessoNegado';

const fabiano = {
  id: 'eu', nome: 'Fabiano', email: 'fabiano@exemplo.com',
  criado_em: '2026-09-01T00:00:00Z', plano: 'gratuito', is_super_admin: true,
};
const marcio = {
  id: 'm', nome: 'Marcio', email: 'marcio@exemplo.com',
  criado_em: '2026-09-08T00:00:00Z', plano: 'gratuito', is_super_admin: false,
};

beforeEach(() => jest.clearAllMocks());

describe('AbaAcessos', () => {
  it('lista usuários, marca admin e desativa o botão da própria linha', async () => {
    mockListar.mockResolvedValue([fabiano, marcio]);
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    expect(await screen.findByText('Marcio')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('você')).toBeTruthy();
    expect(screen.getByLabelText('Remover admin de Fabiano').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('tornar admin confirma, chama a função e recarrega a lista', async () => {
    mockListar.mockResolvedValue([fabiano, marcio]);
    mockDefinir.mockResolvedValue({ ...marcio, is_super_admin: true });
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Tornar admin de Marcio'));
    await waitFor(() => expect(mockDefinir).toHaveBeenCalledWith('m', true));
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
  });

  it('mostra a mensagem da trava quando o servidor recusa', async () => {
    mockListar.mockResolvedValue([fabiano, { ...marcio, is_super_admin: true }]);
    mockDefinir.mockRejectedValue(new Error('O Arcanus precisa de pelo menos um admin.'));
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Remover admin de Marcio'));
    await waitFor(() => expect(mockAlerta).toHaveBeenCalledWith(
      'Não foi possível alterar', 'O Arcanus precisa de pelo menos um admin.',
    ));
  });

  it('a busca filtra por nome ou e-mail', async () => {
    mockListar.mockResolvedValue([fabiano, marcio]);
    render(<AbaAcessos aoPerderAcesso={jest.fn()} />);
    await screen.findByText('Marcio');
    fireEvent.changeText(screen.getByLabelText('Buscar usuário'), 'marc');
    expect(screen.queryByText('Fabiano')).toBeNull();
    expect(screen.getByText('Marcio')).toBeTruthy();
  });

  it('acesso negado ao listar chama aoPerderAcesso', async () => {
    mockListar.mockRejectedValue(new AcessoNegadoError());
    const aoPerderAcesso = jest.fn();
    render(<AbaAcessos aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(aoPerderAcesso).toHaveBeenCalled());
  });
});
```

Run: `yarn test components/manager/__tests__/AbaAcessos.test.tsx`
Expected: FAIL — a `AbaAcessos` mínima só renderiza "Acessos".

- [ ] **Step 2: `components/manager/AbaAcessos.tsx` (substitui o arquivo inteiro)**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { useAuth } from '../../contexts/AuthContext';
import { definirAdmin, listarUsuarios } from '../../services/acessos';
import { ehAcessoNegado } from '../../services/acessoNegado';
import { filtrarUsuarios, ROTULO_PLANO, type UsuarioAcesso } from '../../utils/acessos';
import { confirmarAcao, mostrarAlerta } from '../../utils/alerta';
import { EstadoCarregamento } from './EstadoCarregamento';
import { estilosPainel } from './estilos';
import type { PropsAbaManager } from './tipos';

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function AbaAcessos({ aoPerderAcesso }: PropsAbaManager) {
  const { sessao } = useAuth();
  const meuId = sessao?.user?.id;
  const [usuarios, setUsuarios] = useState<UsuarioAcesso[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [termo, setTermo] = useState('');
  const [alterando, setAlterando] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setErro(null);
    listarUsuarios()
      .then(setUsuarios)
      .catch((e) => {
        if (ehAcessoNegado(e)) {
          aoPerderAcesso();
          return;
        }
        setErro('Não foi possível carregar os usuários.');
      });
  }, [aoPerderAcesso]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const visiveis = useMemo(() => filtrarUsuarios(usuarios ?? [], termo), [usuarios, termo]);

  async function aplicar(u: UsuarioAcesso, admin: boolean) {
    setAlterando(u.id);
    try {
      await definirAdmin(u.id, admin);
      carregar();
    } catch (e) {
      if (ehAcessoNegado(e)) {
        aoPerderAcesso();
        return;
      }
      mostrarAlerta('Não foi possível alterar', e instanceof Error ? e.message : String(e));
    } finally {
      setAlterando(null);
    }
  }

  function pedirMudanca(u: UsuarioAcesso) {
    const nome = u.nome ?? u.email ?? 'Esta pessoa';
    if (u.is_super_admin) {
      confirmarAcao(
        'Remover admin',
        `${nome} deixa de abrir o Painel e passa a seguir as regras do próprio plano.`,
        () => aplicar(u, false),
        { confirmarLabel: 'Remover admin', destrutivo: true },
      );
    } else {
      confirmarAcao(
        'Tornar admin',
        `${nome} poderá alterar preços na Stripe e usará todos os recursos sem pagar.`,
        () => aplicar(u, true),
        { confirmarLabel: 'Tornar admin' },
      );
    }
  }

  if (!usuarios) return <EstadoCarregamento erro={erro} aoTentarDeNovo={carregar} />;

  return (
    <ScrollView contentContainerStyle={estilosPainel.conteudo} keyboardShouldPersistTaps="handled">
      <TextInput
        style={estilosPainel.input}
        value={termo}
        onChangeText={setTermo}
        placeholder="Buscar por nome ou e-mail"
        placeholderTextColor={Cores.textoSecundario}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Buscar usuário"
      />
      <Text style={estilosPainel.ajuda}>{`${visiveis.length} de ${usuarios.length} usuários`}</Text>
      {visiveis.length === 0 ? <Text style={estilosPainel.ajuda}>Nenhum usuário encontrado.</Text> : null}

      {visiveis.map((u) => {
        const ehVoce = u.id === meuId;
        const nome = u.nome ?? u.email ?? 'Sem nome';
        const acao = u.is_super_admin ? 'Remover admin' : 'Tornar admin';
        const desabilitado = ehVoce || alterando !== null;
        return (
          <View key={u.id} style={estilosPainel.card}>
            <View style={estilos.topo}>
              <Text style={[estilosPainel.titulo, estilos.nome]}>{nome}</Text>
              {u.is_super_admin ? <Text style={estilos.selo}>Admin</Text> : null}
            </View>
            {u.nome && u.email ? <Text style={estilosPainel.ajuda}>{u.email}</Text> : null}
            <Text style={estilosPainel.ajuda}>
              {`Cadastro em ${formatarData(u.criado_em)} · Plano ${ROTULO_PLANO[u.plano] ?? u.plano}`}
            </Text>
            <View style={estilos.rodapeCard}>
              {ehVoce ? <Text style={estilosPainel.ajuda}>você</Text> : null}
              <Pressable
                onPress={() => pedirMudanca(u)}
                disabled={desabilitado}
                accessibilityRole="button"
                accessibilityLabel={`${acao} de ${nome}`}
                accessibilityState={{ disabled: desabilitado }}
                style={[
                  u.is_super_admin ? estilosPainel.botaoSecundario : estilosPainel.botao,
                  desabilitado && estilosPainel.botaoDesabilitado,
                ]}
              >
                <Text style={u.is_super_admin ? estilosPainel.botaoSecundarioTexto : estilosPainel.botaoTexto}>
                  {alterando === u.id ? 'Salvando…' : acao}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <View style={estilos.rodape} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm },
  nome: { flex: 1 },
  selo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 11,
    color: '#fff',
    backgroundColor: Cores.primaria,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RaioBorda.full,
    overflow: 'hidden',
  },
  rodapeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Espacamento.sm,
    marginTop: Espacamento.xs,
  },
  rodape: { height: 48 },
});
```

Run: `yarn test components/manager/__tests__/AbaAcessos.test.tsx`
Expected: PASS (5 testes)

- [ ] **Step 3: Verificar**

Run: `yarn typecheck && yarn test`
Expected: typecheck sem erros; todos os testes passam.

- [ ] **Step 4: Commit**

```bash
git add components/manager/AbaAcessos.tsx components/manager/__tests__/AbaAcessos.test.tsx
git commit -m "feat(acessos): aba Acessos para dar e tirar super-admin"
```

---

### Task 9: Tirar o roadmap do site

Comandos desta task rodam na **raiz do repo** (`oraculo_vivo/`), não em `react_native_space/`.

**Files:**
- Delete: `site/roadmap.html`
- Modify: `site/vercel.json`
- Modify: `site/README.md`
- Modify: `react_native_space/docs/superpowers/specs/2026-09-14-painel-unificado-design.md` (linha de status)

**Interfaces:**
- Consumes: rota `/manager?aba=roadmap` (Task 4).

- [ ] **Step 1: Remover a página**

Run: `git rm site/roadmap.html`

- [ ] **Step 2: `site/vercel.json` com o redirecionamento de `/roadmap`**

Substituir o arquivo inteiro:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true,
  "trailingSlash": false,
  "redirects": [
    {
      "source": "/roadmap",
      "destination": "https://app.arcanus.com.br/manager?aba=roadmap",
      "permanent": false
    },
    {
      "source": "/:rota(auth|consulta|consultas|ia|jornada|legal|lei-atracao|leitura-do-dia|manager|mapa-astral|mapa-numerologico|matriz-destino|numerologia|onboarding|pagamento|perfil|planos|rituais|welcome)/:resto*",
      "destination": "https://app.arcanus.com.br/:rota/:resto*",
      "permanent": false
    }
  ]
}
```

Run: `node -e "JSON.parse(require('fs').readFileSync('site/vercel.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: `site/README.md`**

Trocar o bloco da seção "Arquivos" (do bullet do `roadmap.html` até o fim do bullet do `vercel.json`) por:

```markdown
- `videos/buzios.mp4` — vídeo do hero.
- `vercel.json` — `cleanUrls` + redirecionamentos temporários: `/roadmap` vai para o Painel do app
  (`https://app.arcanus.com.br/manager?aba=roadmap`), e as rotas do app (`/planos`, `/auth/*`, `/manager`,
  `/perfil`…) vão para `https://app.arcanus.com.br/<mesmo caminho>`, pra links antigos em
  `www.arcanus.com.br/...` (e-mails de senha, checkout, favoritos) não caírem em 404.
  Se o app ganhar uma rota nova de primeiro nível, acrescente-a na lista.
```

Trocar `→ este site estático (landing + roadmap)` por `→ este site estático (landing)`.

Trocar `Conferir a landing e o \`/roadmap\` no \`*.vercel.app\`.` por `Conferir a landing no \`*.vercel.app\`.`

Trocar `` `/roadmap` abre com senha e`` por `` `/roadmap` leva ao Painel do app e``.

Trocar a seção inteira `## Senhas do roadmap` (título e parágrafo) por:

```markdown
## Roadmap
Desde 15/09 o roadmap interno não fica mais no site: está no Painel do app (`/manager?aba=roadmap`), atrás
do login de super-admin, com o conteúdo no banco (`react_native_space/supabase/roadmap.sql`). As senhas da
antiga página `roadmap.html` deixaram de existir.
```

Conferir:

Run: `grep -n "roadmap.html\|Senhas do roadmap\|abre com senha" site/README.md`
Expected: uma única linha, a da seção nova `## Roadmap` que cita a antiga página `roadmap.html`.

- [ ] **Step 4: Status da spec**

Em `react_native_space/docs/superpowers/specs/2026-09-14-painel-unificado-design.md`, trocar a linha de status por:

```markdown
- **Status:** implementado na branch `feat/painel-unificado`; produção pendente (Task 10 do plano `docs/superpowers/plans/2026-09-15-painel-unificado.md`)
```

- [ ] **Step 5: Commit**

```bash
git add site/vercel.json site/README.md react_native_space/docs/superpowers/specs/2026-09-14-painel-unificado-design.md
git commit -m "chore(site): roadmap sai do site e /roadmap leva ao Painel do app"
```

---

### Task 10: Produção e roteiro manual (com o Fabiano)

Esta task não escreve código. O que muda produção é feito pelo Fabiano, ou por quem ele autorizar na hora: SQL Editor, `supabase functions deploy` e `git push`. Quem executa o plano prepara os comandos e faz as conferências só de leitura (consultas e `curl`).

- [ ] **Step 1: Revisão final e merge local**

Revisão da branch inteira (superpowers:requesting-code-review). Com tudo aprovado, merge local de `feat/painel-unificado` em `main`, **sem push**.

- [ ] **Step 2: Banco — roadmap (Fabiano, SQL Editor)**

Rodar o conteúdo de `react_native_space/supabase/roadmap.sql`. Conferir:

```sql
select status, count(*) from public.roadmap_itens group by status order by status;
```
Expected: `ok 10`, `run 3`, `todo 7` (20 no total).

```sql
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'roadmap_itens' order by cmd;
select has_table_privilege('anon', 'public.roadmap_itens', 'SELECT') as anon_le;
```
Expected: 4 policies (DELETE, INSERT, SELECT, UPDATE); `anon_le = false`.

- [ ] **Step 3: Banco — trava de `perfis` continua fechada**

A correção já está aplicada desde 15/09; aqui só se confere que nada a reabriu:

```sql
select case when has_column_privilege('authenticated', 'public.perfis', 'is_super_admin', 'UPDATE') then 'ABERTA' else 'FECHADA' end as falha, has_column_privilege('authenticated', 'public.perfis', 'nome', 'UPDATE') as nome_editavel;
```
Expected: `FECHADA`, `true`. Se vier `ABERTA`, rodar `react_native_space/supabase/painel-seguranca-perfis.sql` antes de seguir.

- [ ] **Step 4: Deploy da função (Fabiano, terminal em `react_native_space/`)**

```bash
npx supabase functions deploy admin-acessos --project-ref rfdjukdbrtvvulaxbzwb
```

Conferir que a função está no ar e exige login:

Run: `curl -s -o /dev/null -w "%{http_code}\n" -X POST https://rfdjukdbrtvvulaxbzwb.supabase.co/functions/v1/admin-acessos`
Expected: `401`

- [ ] **Step 5: Publicar o app (Fabiano)**

```bash
git -C C:\Users\fabia\Documents\Projetos\oraculo_vivo push origin main
```

Run (depois do deploy da Vercel): `curl -s -o /dev/null -w "%{http_code}\n" https://app.arcanus.com.br/manager`
Expected: `200`

- [ ] **Step 6: Roteiro manual (Fabiano, em `https://app.arcanus.com.br`, janela anônima)**

1. **Perfil sem login:** o nome aparece sem lápis e tocar nele não abre nada.
2. **Perfil com login:** o modal "Editar Nome" tem fundo claro e texto legível sem selecionar; salvar muda o nome.
3. **Conta comum** (`efem.adm+teste1@gmail.com`): o Perfil não mostra "Painel"; abrir `/manager` direto mostra "Acesso restrito.".
4. **Super-admin — Planos:** Perfil → "Painel" abre na aba Planos. Salvar **Explorador** e **Mestre** (fecha também o B2 pendente) e conferir que `/planos` mostra os 3 planos.
5. **Roadmap:** aparecem os 20 itens e "10 de 20 concluídos". Criar um item de teste numa fase existente, mudar o status, editar o título e excluir, confirmando. O Marcio recarrega a aba e vê a mudança.
6. **Acessos:** a lista mostra os cadastrados; na sua linha aparece "você" e o botão está desativado. Tornar `efem.adm+teste1@gmail.com` admin (aparece o selo **Admin**) e, com essa conta em outra janela, conferir que o "Painel" aparece. Remover o admin de novo e, na outra janela, usar o Painel: aparece "Seu acesso de admin foi removido." e volta ao Perfil.
7. **Link direto:** `https://app.arcanus.com.br/manager?aba=acessos` abre direto em Acessos.

A trava "nunca zerar admins" não entra no roteiro: pela interface ela só é alcançável numa corrida entre dois admins, e está coberta pelos testes da Task 2.

`www.arcanus.com.br/roadmap` só pode ser conferido depois que o site for publicado na migração do domínio (`site/README.md`), que fica fora deste plano.

- [ ] **Step 7: Registrar**

Em `react_native_space/docs/2026-09-11-estado-arcanus.md` (seção 4.1), anotar a data do deploy e o resultado de cada item do roteiro. Na spec, trocar o status para `em produção desde <data>`. Commit na `main` e push (Fabiano).

```bash
git add react_native_space/docs/2026-09-11-estado-arcanus.md react_native_space/docs/superpowers/specs/2026-09-14-painel-unificado-design.md
git commit -m "docs(painel): painel unificado em produção e resultado do roteiro"
```
