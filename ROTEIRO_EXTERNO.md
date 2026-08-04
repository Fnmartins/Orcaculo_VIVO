# Oráculo Vivo — Roteiro de Atividades Externas (Fora do Código)

> Este documento lista, em ordem sequencial, todas as tarefas que precisam ser feitas em
> plataformas externas para o app funcionar de verdade em produção.
> O código já está pronto — basta preencher credenciais e configurar cada serviço.

---

## BLOCO 1 — Supabase (Banco de Dados + Auth)
**Plataforma:** https://supabase.com

### Passo a passo:
1. Criar conta em supabase.com (gratuito até 500 MB)
2. Criar novo projeto → escolher região "South America (São Paulo)" → anotar a senha
3. No painel do projeto → aba **SQL Editor** → colar o conteúdo do arquivo `supabase_schema.sql` e executar
4. Ir em **Settings → API** → copiar:
   - `Project URL` → colocar em `.env` como `EXPO_PUBLIC_SUPABASE_URL`
   - `anon public key` → colocar em `.env` como `EXPO_PUBLIC_SUPABASE_ANON_KEY`
5. Em **Authentication → Providers** → habilitar Email/Password (já ativo por padrão)
6. Em **Authentication → Email Templates** → personalizar os e-mails de boas-vindas e recuperação de senha com a identidade visual do Oráculo Vivo
7. Em **Storage** → criar bucket chamado `avatares` → marcar como **Public**
8. Testar: criar conta no app → verificar se perfil aparece na tabela `perfis` do Supabase

---

## BLOCO 2 — Abacus.AI (IA Real)
**Plataforma:** https://abacus.ai

### Passo a passo:
1. Criar conta em abacus.ai
2. Ir em **Developer Settings → API Keys** → criar nova chave de API
3. Copiar a chave → colocar em `.env` como `EXPO_PUBLIC_ABACUS_API_KEY`
4. Verificar modelos disponíveis: `claude-3-5-sonnet` (visão) e `gpt-4o-mini` (texto)
5. Testar: abrir o app → fazer uma consulta de Tarot → tocar "Aprofundar com IA" → deve gerar interpretação real

---

## BLOCO 3 — Mercado Pago (Pagamentos)
**Plataforma:** https://www.mercadopago.com.br/developers

### Passo a passo:
1. Criar conta de desenvolvedor em mercadopago.com.br/developers
2. Ir em **Suas integrações → Criar aplicação** → nome: "Oráculo Vivo"
3. Em **Credenciais de produção** → copiar:
   - `Public Key` → colocar em `.env` como `EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
   - `Access Token` → colocar em `.env` como `MERCADOPAGO_ACCESS_TOKEN`
4. Configurar **Webhook** (para confirmar pagamentos):
   - URL de notificação: `https://SEU_BACKEND.supabase.co/functions/v1/mp-webhook`
   - Eventos: `payment`
5. Criar **Supabase Edge Function** chamada `mp-webhook` que:
   - Recebe o evento do Mercado Pago
   - Verifica o pagamento via API MP
   - Chama `DatabaseServico.confirmarAssinatura()` no banco
6. Testar com cartão de teste do Mercado Pago (número: 5031 4332 1540 6351)

---

## BLOCO 4 — Push Notifications (Expo + OneSignal OU Expo Notifications)
**Plataforma:** https://expo.dev + https://onesignal.com (opcional)

### Opção A — Expo Notifications (nativo, já está no código):
1. Em `eas.json` já está configurado
2. No código: `services/notificacoes.ts` (a criar) vai usar `expo-notifications`
3. Mensagens agendadas: leitura do dia (diária às 08h), streak, novidades de plano
4. Funciona após o build EAS (não funciona no Expo Go)

### Opção B — OneSignal (mais recursos, dashboard visual):
1. Criar conta em onesignal.com → criar app
2. Plataforma: React Native (Expo)
3. Copiar App ID → adicionar em `.env` como `EXPO_PUBLIC_ONESIGNAL_APP_ID`
4. Configurar segmentação: gratuitos, iniciantes, exploradores, mestres

### Passos comuns:
1. Criar `services/notificacoes.ts` com funções:
   - `solicitarPermissao()` — pede permissão ao usuário
   - `agendarLeituraDia()` — diária às 08h
   - `notificarStreakRisco()` — aviso quando streak prestes a quebrar
2. Chamar `solicitarPermissao()` no onboarding ou perfil
3. Testar com build de preview (não funciona no Expo Go)

---

## BLOCO 5 — EAS Build (Build do App)
**Plataforma:** https://expo.dev

### Passo a passo:
1. Criar conta em expo.dev
2. Instalar EAS CLI: `npm install -g eas-cli`
3. No terminal (dentro de `react_native_space/`):
   ```
   eas login
   eas build:configure
   ```
4. Fazer build de preview (APK para teste):
   ```
   eas build --platform android --profile preview
   ```
5. Instalar o APK gerado no celular Android para testar
6. Para iOS (precisa de conta Apple Developer):
   ```
   eas build --platform ios --profile preview
   ```

---

## BLOCO 6 — Apple Developer Program (iOS)
**Plataforma:** https://developer.apple.com

### Passo a passo:
1. Criar conta em developer.apple.com → pagar taxa anual (US$ 99/ano)
2. Criar App ID: `com.oraculovivo.app`
3. Criar certificados e provisioning profiles (o EAS faz isso automaticamente)
4. Criar app no **App Store Connect**:
   - Nome: "Oráculo Vivo"
   - Categoria: Lifestyle / Health & Fitness
   - Classificação etária: 4+ ou 12+ (conteúdo espiritual)
5. Preparar para submissão:
   - Screenshots: iPhone 6.7" e iPad Pro 12.9" (obrigatório)
   - Ícone: 1024x1024px sem transparência
   - Descrição em PT-BR
   - Política de privacidade (URL obrigatória)
6. Submeter para revisão (prazo médio: 1-3 dias úteis)
7. Responder perguntas da Apple sobre conteúdo espiritual se solicitado

---

## BLOCO 7 — Google Play Console (Android)
**Plataforma:** https://play.google.com/console

### Passo a passo:
1. Criar conta de desenvolvedor → pagar taxa única (US$ 25)
2. Criar novo app:
   - Nome: "Oráculo Vivo"
   - Categoria: Saúde e Bem-estar / Estilo de Vida
   - Gratuito (com compras no app)
3. Preparar para submissão:
   - Screenshots: celular, tablet 7" e 10" (recomendado)
   - Ícone: 512x512px
   - Feature graphic: 1024x500px
   - Descrição curta (80 chars) e longa (4000 chars) em PT-BR
4. Configurar **Google Play Billing** para assinaturas:
   - Criar produtos de assinatura: iniciante, explorador, mestre
   - Integrar com Mercado Pago OU usar billing nativo
5. Questionário de conteúdo (declarar: sem violência, sem dado de menores, etc.)
6. Submeter para revisão (prazo médio: 3-7 dias úteis)
7. Lançamento inicial como "Teste interno" → "Teste fechado" → "Produção"

---

## BLOCO 8 — Consultas ao Vivo (Oraculista Real)
**Plataforma:** Calendly + Zoom OU plataforma própria

### Opção Simples (fase inicial):
1. Oraculista cria conta em **Calendly** (calendly.com)
2. Configura disponibilidade + preço por consulta
3. No app: botão "Agendar Consulta ao Vivo" → abre Calendly via WebView ou navegador
4. Após pagamento no Calendly, oraculista recebe e-mail automático

### Opção Avançada (futuro):
1. Criar tabela `consultas_ao_vivo` no Supabase
2. Criar tela de agendamento no app com calendário
3. Integrar **Daily.co** ou **Twilio Video** para chamada de vídeo in-app
4. Notificação push 15 min antes da consulta
5. Gravação opcional da consulta (armazenar no Supabase Storage)

---

## ORDEM DE EXECUÇÃO RECOMENDADA

| Prioridade | Bloco | Tempo estimado | Impacto |
|-----------|-------|---------------|---------|
| 1° | Supabase | 30 min | Auth + banco funcionando |
| 2° | Abacus.AI | 10 min | IA real nas consultas |
| 3° | EAS Build | 1h | APK para testar no celular |
| 4° | Mercado Pago | 2h | Pagamentos reais |
| 5° | Push Notifications | 2h | Retenção de usuários |
| 6° | Google Play | 1-2 dias | Lançamento Android |
| 7° | Apple Developer | 3-5 dias | Lançamento iOS |
| 8° | Consultas ao Vivo | variável | Receita premium |

---

## CHECKLIST RÁPIDO PRÉ-LANÇAMENTO

- [ ] `.env` preenchido com todas as chaves reais
- [ ] Schema SQL executado no Supabase
- [ ] Bucket `avatares` criado como público
- [ ] Build de preview testado no celular físico
- [ ] Fluxo de cadastro → consulta → pagamento testado de ponta a ponta
- [ ] Política de privacidade publicada em URL pública
- [ ] Termos de uso publicados em URL pública
- [ ] Ícone e screenshots preparados para as lojas
- [ ] App testado por ao menos 5 usuários beta

---

*Arquivo gerado automaticamente pelo agente. Última atualização: Agosto 2026.*
