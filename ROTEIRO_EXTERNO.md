# Oráculo Vivo — Roteiro de Atividades Externas (Fora do Código)

> Este documento lista, em ordem, as tarefas que precisam ser feitas em plataformas
> externas para o app funcionar de verdade em produção.
> O código já está pronto; falta configurar cada serviço.
>
> **Atualizado em 29/08/2026** após auditoria de segurança. Correções em relação à
> versão anterior:
> - **IA remota foi DESATIVADA de propósito** (privacidade) — não é mais "preencher uma
>   chave da Abacus". Ver Bloco 2.
> - **Mercado Pago é server-side** via Supabase Edge Functions já implementadas
>   (`criar-preferencia` e `mercadopago-webhook`). O Access Token vai nos **secrets do
>   Supabase**, NUNCA no `.env` do app nem em `EXPO_PUBLIC_*`. Ver Bloco 3.

---

## BLOCO 1 — Supabase (Banco de Dados + Auth + Edge Functions)
**Plataforma:** https://supabase.com
**Estado:** projeto JÁ criado (ref `sqwvfwrthbdwoicrualb`). Falta confirmar o schema e publicar as Edge Functions.

### Passo a passo:
1. (Feito) Conta e projeto criados. Region ideal: "South America (São Paulo)".
2. No painel do projeto → **SQL Editor** → colar e executar o conteúdo de `supabase_schema.sql`
   (cria `perfis`, `consultas`, `assinaturas`, `desejos`, RLS e triggers). Se o banco já
   existe sem alguma coluna, rodar o bloco de MIGRAÇÃO comentado no fim do arquivo.
3. **Settings → API** → copiar (já estão no `.env` local, confira se batem):
   - `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
   - `anon public key` → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → **NÃO vai no `.env` do app**; será usado só como secret das
     Edge Functions (passo do Bloco 3).
4. **Authentication → Providers** → Email/Password (ativo por padrão).
5. **Authentication → Email Templates** → personalizar boas-vindas e recuperação de senha.
6. **Storage** → criar bucket `avatares` como **Public** (para foto de perfil).
7. **Edge Functions** — publicar via CLI (feito no Bloco 3, junto com os secrets do MP).
   O CLI roda por `npx supabase` (não precisa instalar nada global).
8. Testar: criar conta no app → conferir se o perfil aparece na tabela `perfis`.

---

## BLOCO 2 — IA remota: DESATIVADA por privacidade
**Estado:** desligada de propósito no código (`services/ia.ts` → `IA_REMOTA_DISPONIVEL = false`).

O app NÃO envia fotos de mão/xícara nem textos pessoais a nenhum provedor externo. As
análises de Borra de Café e Quiromância usam **fallback local**; Tarot e Búzios funcionam
sem terceiros. Os botões de "Aprofundar com IA" ficam ocultos enquanto a integração está
indisponível.

### Para REATIVAR no futuro (não é só preencher uma chave):
1. Publicar uma **política de privacidade** e obter **consentimento explícito** do usuário
   antes de qualquer upload de imagem/texto.
2. Rotear as chamadas por um **proxy autenticado** (ex.: uma Edge Function no Supabase),
   com limite de uso — a chave de IA NUNCA em `EXPO_PUBLIC_*`.
3. Validar as respostas do modelo antes de exibir.
4. Só então trocar `IA_REMOTA_DISPONIVEL` para `true` e ligar a chamada real.

> Observação: a antiga instrução de "criar conta na Abacus.AI e colar a chave no `.env`"
> está OBSOLETA e foi removida por segurança.

---

## BLOCO 3 — Mercado Pago (Pagamentos) — server-side, já implementado
**Plataforma:** https://www.mercadopago.com.br/developers
**Estado:** o código do servidor JÁ existe. Falta criar a conta MP, publicar as functions e
configurar os secrets + webhook.

As Edge Functions já implementadas:
- `supabase/functions/criar-preferencia/index.ts` — valida o usuário (JWT), fixa os preços
  no servidor, cria a assinatura `pendente` e gera a preferência no Mercado Pago.
- `supabase/functions/mercadopago-webhook/index.ts` — recebe o evento, **reconsulta o
  pagamento na API do MP** (não confia no payload), valida valor/metadados e só então ativa
  a assinatura e o plano no perfil. Idempotente.

### Passo a passo:
1. Criar conta de desenvolvedor em mercadopago.com.br/developers.
2. **Suas integrações → Criar aplicação** → nome "Oráculo Vivo".
3. Em **Credenciais** copiar o `Access Token` (produção quando for pra valer; ou de teste
   para validar antes).
4. Publicar as functions e configurar os secrets no Supabase (via `npx supabase`, dentro de
   `react_native_space/`):
   ```sh
   npx supabase login
   npx supabase link --project-ref sqwvfwrthbdwoicrualb
   npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=<seu_access_token>
   npx supabase secrets set SUPABASE_URL=https://sqwvfwrthbdwoicrualb.supabase.co
   npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<sua_service_role_key>
   npx supabase functions deploy criar-preferencia
   npx supabase functions deploy mercadopago-webhook --no-verify-jwt
   ```
   (`criar-preferencia` mantém `verify_jwt = true`; o webhook é chamado pelo MP, por isso
   `--no-verify-jwt`.)
5. No painel do Mercado Pago, configurar o **Webhook**:
   - URL: `https://sqwvfwrthbdwoicrualb.supabase.co/functions/v1/mercadopago-webhook`
   - Evento: `payment`
6. Testar com cartão de teste do Mercado Pago (ex.: `5031 4332 1540 6351`) e confirmar a
   transição da assinatura `pendente` → `ativo`, e que pagamentos recusados/pendentes NÃO
   liberam o plano.

> Segurança: o `Access Token` do MP vai SOMENTE nos secrets do Supabase. Nunca no `.env` do
> Expo nem em variáveis `EXPO_PUBLIC_*`.

---

## BLOCO 4 — Push Notifications (Expo Notifications OU OneSignal)
**Plataforma:** https://expo.dev + https://onesignal.com (opcional)

### Opção A — Expo Notifications (nativo, já previsto):
1. `eas.json` já configurado.
2. Criar `services/notificacoes.ts` usando `expo-notifications`.
3. Mensagens agendadas: leitura do dia (08h), streak, novidades de plano.
4. Funciona após o build EAS (não no Expo Go).

### Opção B — OneSignal (dashboard visual):
1. Criar conta → app → plataforma React Native (Expo).
2. Copiar App ID → `.env` como `EXPO_PUBLIC_ONESIGNAL_APP_ID`.
3. Segmentar: gratuitos, iniciantes, exploradores, mestres.

### Passos comuns:
1. `services/notificacoes.ts` com `solicitarPermissao()`, `agendarLeituraDia()`,
   `notificarStreakRisco()`.
2. Chamar `solicitarPermissao()` no onboarding ou perfil.
3. Testar com build de preview (não funciona no Expo Go).

---

## BLOCO 5 — EAS Build (Build do App)
**Plataforma:** https://expo.dev

### Passo a passo:
1. Criar conta em expo.dev.
2. `npm install -g eas-cli` (ou usar `npx eas-cli`).
3. Dentro de `react_native_space/`: `eas login` e `eas build:configure`.
4. Build de preview (APK): `eas build --platform android --profile preview`.
5. Instalar o APK no Android para testar.
6. iOS (precisa de conta Apple Developer): `eas build --platform ios --profile preview`.

---

## BLOCO 6 — Apple Developer Program (iOS)
**Plataforma:** https://developer.apple.com

1. Criar conta → taxa anual (US$ 99/ano).
2. App ID conforme `app.json` (bundle `com.abacusai.oraculovivo.t1782140273` — revisar se
   quer um identificador próprio antes de publicar).
3. Certificados/profiles (o EAS gera automaticamente).
4. Criar app no **App Store Connect**: nome "Oráculo Vivo", categoria Lifestyle / Health &
   Fitness, classificação etária 4+ ou 12+.
5. Preparar: screenshots iPhone 6.7" e iPad 12.9", ícone 1024×1024 sem transparência,
   descrição PT-BR, política de privacidade (URL obrigatória).
6. Submeter para revisão (1–3 dias úteis).

---

## BLOCO 7 — Google Play Console (Android)
**Plataforma:** https://play.google.com/console

1. Conta de desenvolvedor → taxa única (US$ 25).
2. Novo app: "Oráculo Vivo", categoria Saúde e Bem-estar / Estilo de Vida, gratuito com
   compras no app.
3. Preparar: screenshots (celular, tablet 7"/10"), ícone 512×512, feature graphic
   1024×500, descrições curta (80) e longa (4000) em PT-BR.
4. Assinaturas: criar produtos iniciante/explorador/mestre. Atenção: para compras digitais
   no app, a Play costuma exigir **Google Play Billing**; Mercado Pago via checkout externo
   pode ter restrições — validar a política antes de decidir o mecanismo.
5. Questionário de conteúdo.
6. Submeter (3–7 dias úteis). Trilha: Teste interno → Teste fechado → Produção.

---

## BLOCO 8 — Consultas ao Vivo (Oraculista Real)
**Plataforma:** Calendly + Zoom OU plataforma própria

### Fase inicial (simples):
1. Oraculista cria conta no **Calendly** com disponibilidade + preço.
2. No app: botão "Agendar Consulta ao Vivo" → abre Calendly (WebView/navegador).
3. Após pagamento no Calendly, oraculista recebe e-mail automático.

### Futuro (avançado):
1. Tabela `consultas_ao_vivo` no Supabase.
2. Tela de agendamento com calendário.
3. Vídeo in-app (Daily.co ou Twilio Video).
4. Push 15 min antes.
5. Gravação opcional no Supabase Storage.

---

## ORDEM DE EXECUÇÃO RECOMENDADA

| Prioridade | Bloco | Tempo estimado | Impacto |
|-----------|-------|---------------|---------|
| 1° | Supabase (schema + Edge Functions) | 30–45 min | Auth + banco + base de pagamento |
| 2° | Mercado Pago (conta + secrets + deploy) | 1–2h | Pagamentos reais |
| 3° | EAS Build | 1h | APK para testar no celular |
| 4° | Push Notifications | 2h | Retenção de usuários |
| 5° | Google Play | 1–2 dias | Lançamento Android |
| 6° | Apple Developer | 3–5 dias | Lançamento iOS |
| 7° | Consultas ao Vivo | variável | Receita premium |
| — | IA remota | — | Só depois de política de privacidade + consentimento (Bloco 2) |

---

## CHECKLIST RÁPIDO PRÉ-LANÇAMENTO

- [ ] Schema SQL executado no Supabase (tabelas `perfis`/`assinaturas`/... existem)
- [ ] Edge Functions `criar-preferencia` e `mercadopago-webhook` publicadas
- [ ] Secrets do Supabase definidos: `MERCADOPAGO_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Webhook do Mercado Pago apontado para `.../functions/v1/mercadopago-webhook`
- [ ] `.env` com as chaves **públicas** (Supabase URL + anon) — sem segredos privados
- [ ] `.env` desrastreado do git (`git rm --cached react_native_space/.env`)
- [ ] Bucket `avatares` criado como público
- [ ] Build de preview testado no celular físico
- [ ] Fluxo cadastro → consulta → pagamento (`pendente` → `ativo`) testado ponta a ponta
- [ ] Pagamentos recusados/pendentes NÃO liberam plano
- [ ] Política de privacidade e Termos de uso publicados em URL pública
- [ ] Ícone e screenshots preparados para as lojas
- [ ] App testado por ao menos 5 usuários beta

---

*Atualizado após auditoria de 29/08/2026. Reflete o código real: IA remota desativada,
pagamento Mercado Pago server-side via Edge Functions.*
