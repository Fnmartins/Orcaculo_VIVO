# Site institucional do Arcanus (estático)

Site de marketing na frente do app. **Não é o app** (o app é Expo/React Native em `../react_native_space`).

## Arquivos
- `index.html` — landing principal (persona Buscadora). Vídeo de fundo em `videos/buzios.mp4`.
- `videos/buzios.mp4` — vídeo do hero.
- `vercel.json` — `cleanUrls` + redirecionamentos temporários: `/roadmap` vai para o Painel do app
  (`https://app.arcanus.com.br/manager?aba=roadmap`), e as rotas do app (`/planos`, `/auth/*`, `/manager`,
  `/perfil`…) vão para `https://app.arcanus.com.br/<mesmo caminho>`, pra links antigos em
  `www.arcanus.com.br/...` (e-mails de senha, checkout, favoritos) não caírem em 404.
  Se o app ganhar uma rota nova de primeiro nível, acrescente-a na lista.

## Arquitetura: "site na frente, app atrás"
- `arcanus.com.br`      → este site estático (landing)
- `app.arcanus.com.br`  → o app Expo (projeto Vercel já existente, root `react_native_space`)

Os CTAs de entrada da landing ("Fazer minha primeira leitura", "Assinar", etc.) apontam para
`https://app.arcanus.com.br` (ajuste no `<script>` no fim do `index.html` se mudar o subdomínio).

## Migração do domínio (decidida em 14/09) — nesta ordem, sem derrubar o app

> **✅ Concluída em 17/09/2026.** `arcanus.com.br` e `www.arcanus.com.br` estão no projeto Vercel
> `arcanus-site` (landing); `app.arcanus.com.br` no `oraculo_vivo` (app). Conferido: landing nos dois
> endereços, botões levando ao app, `/roadmap` → Painel, `/planos` → app; Site URL do Supabase e
> `APP_BASE_URL` apontando pro `app`.
>
> **Diferenças em relação ao roteiro abaixo:**
> - O projeto `arcanus-site` foi criado pela CLI (`vercel deploy --prod` a partir de `site/`) e **ainda não está
>   ligado ao GitHub**: mudança no site só vai ao ar rodando `vercel deploy --prod --scope fnmartins-projects`
>   dentro de `site/`, até alguém conectar o repo em Settings → Git (Root Directory = `site`).
> - O 308 de `arcanus.com.br` → `www` que existia no projeto do app sumiu na troca e foi recriado em 17/09 no
>   `arcanus-site`. O botão Save do painel não habilitou; foi aplicado pela API (o mesmo endpoint do painel):
>   `MSYS_NO_PATHCONV=1 vercel api /v9/projects/arcanus-site/domains/arcanus.com.br -X PATCH -f redirect=www.arcanus.com.br -F redirectStatusCode=308 --scope fnmartins-projects`
>   (no Git Bash, sem `MSYS_NO_PATHCONV=1` o caminho `/v9/...` é convertido pra caminho do Windows e a CLI recusa).
> - A Vercel não deixa tirar o `www` de um projeto enquanto outro domínio desse projeto redireciona pra ele:
>   mova primeiro o domínio que redireciona (o raiz) e depois o `www`.

O DNS de `arcanus.com.br` fica no **registro.br** (não na Vercel), e os dois domínios já apontam pra
Vercel. Por isso mover `arcanus.com.br`/`www` de projeto não exige mexer no DNS; só o `app` é novo.
A regra que evita repetir o bug do link de senha: **o app precisa responder em `app.arcanus.com.br` e o
Supabase precisa apontar pra lá ANTES de o domínio raiz virar o site.**

1. **Projeto Vercel do site** (`fnmartins-projects/arcanus-site`): Root Directory = `site`, preset **Other**,
   sem build. Conectar ao repo pra `git push` publicar. Conferir a landing no `*.vercel.app`.
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
8. **Conferir:** `www.arcanus.com.br` mostra a landing, os botões levam ao app, `/roadmap` leva ao Painel do app e
   `www.arcanus.com.br/planos` redireciona pro app.

**Login não atravessa endereços:** o navegador guarda a sessão do Supabase separada por endereço, então
quem está logado em `www.arcanus.com.br` aparece **deslogado** em `app.arcanus.com.br` (e vice-versa) e
precisa entrar uma vez no endereço novo. Deslogado, o Perfil mostra "Buscador de Luz" com avatar "?".
Vale avisar os usuários na migração.

**Voltar atrás:** devolver `arcanus.com.br`/`www` ao projeto `oraculo_vivo` (passo 7 ao contrário). O app
continua respondendo em `app.` e `oraculovivo.vercel.app`, e o Supabase já aceita os dois endereços.

## Roadmap
Desde 15/09 o roadmap interno não fica mais no site: está no Painel do app (`/manager?aba=roadmap`), atrás
do login de super-admin, com o conteúdo no banco (`react_native_space/supabase/roadmap.sql`). As senhas da
antiga página `roadmap.html` deixaram de existir.

## Lista de espera
Decidido em 14/09: **não usar por enquanto.** O app já está aberto e os botões da landing levam direto ao
cadastro, que já é a lista de interessados. `react_native_space/supabase/lista-espera.sql` fica guardado
para quando fizer sentido segurar entrada (ex.: campanha de fundador antes do go-live).
