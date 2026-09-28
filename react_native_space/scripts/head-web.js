/**
 * Põe título, descrição e Open Graph no `dist/index.html` depois do export.
 *
 * ## Por que não é `app/+html.tsx`
 *
 * Era esse o caminho certo, e ele não vale aqui. `app.json` usa
 * `web.output: "single"`, e a documentação do Expo diz que essa opção gera
 * "a single index.html in the output folder, and has no statically indexable
 * HTML" — o `+html.tsx` só é aplicado em `output: "static"`.
 *
 * Trocar para `"static"` foi tentado em 28/09 e quebra o export:
 *
 *     ReferenceError: window is not defined
 *       at AsyncStorage.getItem
 *       at GoTrueClient._recoverAndRefresh
 *
 * O cliente Supabase inicializa na importação e vai no AsyncStorage, que na
 * web é `localStorage`. Para pré-renderizar em Node seria preciso adiar essa
 * inicialização — mexida na autenticação inteira, que não se faz na véspera de
 * uma auditoria só para ganhar meta tag.
 *
 * ## O que isso não resolve
 *
 * Como todas as rotas servem o mesmo HTML, o preview é do app inteiro, não da
 * tela. Compartilhar o mapa astral e compartilhar o tarô dão o mesmo cartão.
 * Preview por tela depende de `output: "static"`, ou seja, do mesmo trabalho
 * acima.
 *
 * ## Por que ele grita em vez de desistir calado
 *
 * Se o Expo mudar o template e as marcas não forem achadas, o script sai com
 * erro e derruba o build. A alternativa — não achar e seguir — publicaria o
 * site sem Open Graph sem ninguém notar, que é exatamente o estado que este
 * arquivo veio consertar.
 */

const fs = require('fs');
const path = require('path');

const URL_APP = 'https://app.arcanus.com.br';
const TITULO = 'Arcanus — seu oráculo vivo';
const DESCRICAO =
  'Arcanus — oráculos e autoconhecimento guiados por IA. Tarô, astrologia, numerologia e mais, num app sereno.';
const CHAMADA = 'Vários oráculos. Um só lugar. A clareza que você procura.';
const ALT_IMAGEM =
  'Duas mãos segurando uma bola de cristal estrelada, entre folhas, sobre fundo creme';

const TAGS = [
  `<meta name="description" content="${DESCRICAO}" />`,
  '<meta name="theme-color" content="#F7F3EA" />',
  '<meta property="og:type" content="website" />',
  '<meta property="og:site_name" content="Arcanus" />',
  `<meta property="og:title" content="${TITULO}" />`,
  `<meta property="og:description" content="${CHAMADA}" />`,
  `<meta property="og:url" content="${URL_APP}" />`,
  '<meta property="og:locale" content="pt_BR" />',
  `<meta property="og:image" content="${URL_APP}/og.png" />`,
  '<meta property="og:image:width" content="1200" />',
  '<meta property="og:image:height" content="630" />',
  `<meta property="og:image:alt" content="${ALT_IMAGEM}" />`,
  '<meta name="twitter:card" content="summary_large_image" />',
  `<meta name="twitter:title" content="${TITULO}" />`,
  `<meta name="twitter:description" content="${CHAMADA}" />`,
  `<meta name="twitter:image" content="${URL_APP}/og.png" />`,
  '<meta name="apple-mobile-web-app-title" content="Arcanus" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
];

/**
 * Devolve o HTML com o head completo. Roda duas vezes sem duplicar nada, para
 * um build repetido em cima da mesma pasta não empilhar meta tag.
 */
function injetarHead(html) {
  if (!html.includes('<html lang=')) {
    throw new Error('não achei o atributo lang no <html>: o template do Expo mudou');
  }
  if (!html.includes('</head>')) {
    throw new Error('não achei </head>: o template do Expo mudou');
  }

  let saida = html.replace(/<html lang="[^"]*"/, '<html lang="pt-BR"');
  saida = saida.replace(/<title>[^<]*<\/title>/, `<title>${TITULO}</title>`);

  if (saida.includes('property="og:image"')) return saida;

  return saida.replace('</head>', `  ${TAGS.join('\n    ')}\n  </head>`);
}

module.exports = { injetarHead, TITULO, DESCRICAO, CHAMADA };

if (require.main === module) {
  const alvo = path.join(__dirname, '..', 'dist', 'index.html');
  if (!fs.existsSync(alvo)) {
    console.error(`[head-web] ${alvo} não existe — rode o export antes.`);
    process.exit(1);
  }
  try {
    fs.writeFileSync(alvo, injetarHead(fs.readFileSync(alvo, 'utf8')));
    console.log('[head-web] head do index.html atualizado');
  } catch (erro) {
    console.error('[head-web]', erro.message);
    process.exit(1);
  }
}
