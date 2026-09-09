# Site institucional do Arcanus (estático)

Site de marketing na frente do app. **Não é o app** (o app é Expo/React Native em `../react_native_space`).

## Arquivos
- `index.html` — landing principal (persona Buscadora). Vídeo de fundo em `videos/buzios.mp4`.
- `roadmap.html` — área privada de acompanhamento, com gate de senha (2 senhas). **Rota:** `/roadmap`.
- `videos/buzios.mp4` — vídeo do hero.
- `vercel.json` — `cleanUrls` (deixa `/roadmap` funcionar sem `.html`).

## Arquitetura: "site na frente, app atrás"
- `arcanus.com.br`      → este site estático (landing + roadmap)
- `app.arcanus.com.br`  → o app Expo (projeto Vercel já existente, root `react_native_space`)

Os CTAs de entrada da landing ("Fazer minha primeira leitura", "Assinar", etc.) apontam para
`https://app.arcanus.com.br` (ajuste no `<script>` no fim do `index.html` se mudar o subdomínio).

## Deploy (ação do Fabiano — passos externos)
1. **Novo projeto Vercel** para este site: import do repo `Fnmartins/Orcaculo_VIVO`, **Root Directory = `site`**,
   Framework Preset = **Other** (sem build; é estático). Deploy.
2. **Domínios (Vercel → Settings → Domains):**
   - Neste projeto novo: adicionar `arcanus.com.br` (e `www`).
   - No projeto do **app** (o atual): trocar o domínio para `app.arcanus.com.br`.
3. **DNS (registro.br):** `arcanus.com.br` (A/ALIAS) + `www` e `app` (CNAME) conforme a Vercel indicar.
4. **Supabase URL Config:** manter Site URL/Redirect do app apontando para `https://app.arcanus.com.br`.

## Senhas do roadmap
Editar no topo do `<script>` de `roadmap.html` (objeto `ACESSOS`). Cada chave é uma senha; o valor é o
nome exibido ao entrar. Troque os valores padrão antes de publicar. Gate é do lado do cliente
(mantém curiosos fora; não é segurança forte — para segurança real depois, login via Supabase).
