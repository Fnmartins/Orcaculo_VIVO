# Site institucional do Arcanus (estático)

Site de marketing na frente do app. **Não é o app** (o app é Expo/React Native em `../react_native_space`).

## Arquivos
- `index.html` — landing principal (persona Buscadora). Vídeo de fundo em `videos/buzios.mp4`.
- `roadmap.html` — área privada de acompanhamento, com gate de senha (Fabiano e Marcio). **Rota:** `/roadmap`.
- `videos/buzios.mp4` — vídeo do hero.
- `vercel.json` — `cleanUrls` (deixa `/roadmap` funcionar sem `.html`) + redirecionamento temporário das
  rotas do app (`/planos`, `/auth/*`, `/manager`, `/perfil`…) para `https://app.arcanus.com.br/<mesmo caminho>`,
  pra links antigos em `www.arcanus.com.br/...` (e-mails de senha, checkout, favoritos) não caírem em 404.
  Se o app ganhar uma rota nova de primeiro nível, acrescente-a na lista.

## Arquitetura: "site na frente, app atrás"
- `arcanus.com.br`      → este site estático (landing + roadmap)
- `app.arcanus.com.br`  → o app Expo (projeto Vercel já existente, root `react_native_space`)

Os CTAs de entrada da landing ("Fazer minha primeira leitura", "Assinar", etc.) apontam para
`https://app.arcanus.com.br` (ajuste no `<script>` no fim do `index.html` se mudar o subdomínio).

## Migração do domínio (decidida em 14/09) — nesta ordem, sem derrubar o app

O DNS de `arcanus.com.br` fica no **registro.br** (não na Vercel), e os dois domínios já apontam pra
Vercel. Por isso mover `arcanus.com.br`/`www` de projeto não exige mexer no DNS; só o `app` é novo.
A regra que evita repetir o bug do link de senha: **o app precisa responder em `app.arcanus.com.br` e o
Supabase precisa apontar pra lá ANTES de o domínio raiz virar o site.**

1. **Projeto Vercel do site** (`fnmartins-projects/arcanus-site`): Root Directory = `site`, preset **Other**,
   sem build. Conectar ao repo pra `git push` publicar. Conferir a landing e o `/roadmap` no `*.vercel.app`.
2. **No projeto do app** (`oraculo_vivo`): adicionar o domínio `app.arcanus.com.br` (sem remover os atuais).
3. **registro.br:** criar o CNAME `app` com o valor que a Vercel mostrar. Esperar o certificado sair e
   `https://app.arcanus.com.br` abrir o app. Até aqui nada muda pra quem usa `www`.
4. **Supabase → Authentication → URL Configuration:** Site URL = `https://app.arcanus.com.br`.
   Redirect URLs: garantir `https://app.arcanus.com.br/**` e manter `www`, `arcanus.com.br` e
   `oraculovivo.vercel.app` durante a transição.
5. **Secret:** `npx supabase secrets set APP_BASE_URL=https://app.arcanus.com.br --project-ref rfdjukdbrtvvulaxbzwb`
   (retorno do checkout e do portal da Stripe).
6. **Testar em `app.arcanus.com.br`:** login, "Esqueci minha senha" até entrar com a nova, e abrir o `/manager`.
7. **Só então mover os domínios:** tirar `arcanus.com.br` e `www.arcanus.com.br` do projeto do app e
   adicioná-los ao `arcanus-site` (manter `arcanus.com.br` → 308 → `www`, como hoje).
8. **Conferir:** `www.arcanus.com.br` mostra a landing, os botões levam ao app, `/roadmap` abre com senha e
   `www.arcanus.com.br/planos` redireciona pro app.

**Login não atravessa endereços:** o navegador guarda a sessão do Supabase separada por endereço, então
quem está logado em `www.arcanus.com.br` aparece **deslogado** em `app.arcanus.com.br` (e vice-versa) e
precisa entrar uma vez no endereço novo. Deslogado, o Perfil mostra "Buscador de Luz" com avatar "?".
Vale avisar os usuários na migração.

**Voltar atrás:** devolver `arcanus.com.br`/`www` ao projeto `oraculo_vivo` (passo 7 ao contrário). O app
continua respondendo em `app.` e `oraculovivo.vercel.app`, e o Supabase já aceita os dois endereços.

## Senhas do roadmap
O objeto `ACESSOS` no topo do `<script>` de `roadmap.html` guarda **só o SHA-256** de cada senha (o repo é
público): chave = hash, valor = nome exibido. Para trocar, gere o hash (`printf %s 'nova-senha' | sha256sum`)
e substitua a chave; a senha em texto nunca entra no git. O portão é do lado do cliente: esconde a página de
quem visita o site, mas o conteúdo do roadmap continua legível no código-fonte e no GitHub — não coloque
nada ali que não possa ser público. Pra algo realmente privado, o caminho é login via Supabase.

## Lista de espera
Decidido em 14/09: **não usar por enquanto.** O app já está aberto e os botões da landing levam direto ao
cadastro, que já é a lista de interessados. `react_native_space/supabase/lista-espera.sql` fica guardado
para quando fizer sentido segurar entrada (ex.: campanha de fundador antes do go-live).
