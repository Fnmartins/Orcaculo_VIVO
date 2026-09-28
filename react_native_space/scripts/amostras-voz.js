/**
 * Gera a mesma leitura de mapa astral em todas as vozes candidatas e monta uma
 * página única para comparar de ouvido.
 *
 * Existe porque a voz atual é a `speechSynthesis` do navegador, e o retorno do
 * teste no iPhone foi direto: "a voz é robotizada". Tabela de preço não decide
 * isso — precisa ouvir, lado a lado, com o mesmo texto.
 *
 * Roda na máquina do usuário, onde as chaves vivem. Elas ficam só no ambiente:
 * este arquivo não as escreve, não as imprime, e a página gerada não as contém —
 * o áudio entra embutido, então ela abre offline e pode ser compartilhada sem
 * vazar nada.
 *
 *     node scripts/amostras-voz.js
 *
 * A lista de vozes do Google vem da própria API (`voices.list`), não da memória.
 */

const fs = require('fs');
const path = require('path');

/** Um trecho real de leitura, com grau por extenso como a voz lê. */
const TEXTO =
  'Seu Sol está a vinte e três graus de Escorpião, na casa cinco. ' +
  'É onde você se reconhece: no que cria, no que arrisca, no que faz por prazer e não por obrigação. ' +
  'A Lua em Peixes, na casa nove, pede horizonte — e fica inquieta quando a vida encolhe demais.';

/**
 * As vozes do `gpt-4o-mini-tts`. Se alguma não valer mais, ela falha sozinha e
 * aparece na página como indisponível, em vez de derrubar o resto.
 */
const VOZES_OPENAI = [
  'alloy', 'ash', 'ballad', 'coral', 'echo',
  'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse',
];

const PASTA = path.join(__dirname, '..', 'amostras-voz');

/**
 * Nenhuma chamada espera para sempre.
 *
 * Em 28/09 a geração parou em silêncio depois da primeira voz da OpenAI: sem
 * erro, sem sucesso, o processo pendurado. `fetch` não tem timeout por padrão,
 * então uma conexão que não responde trava a fila inteira — e como o laço é
 * sequencial, as dez vozes seguintes nunca chegaram a ser pedidas.
 */
const ESPERA_MAXIMA = 60000;

async function buscarComPrazo(url, opcoes) {
  const freio = new AbortController();
  const relogio = setTimeout(() => freio.abort(), ESPERA_MAXIMA);
  try {
    return await fetch(url, { ...opcoes, signal: freio.signal });
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new Error(`sem resposta em ${ESPERA_MAXIMA / 1000}s`);
    }
    throw erro;
  } finally {
    clearTimeout(relogio);
  }
}

async function listarVozesGoogle(chave) {
  const resposta = await buscarComPrazo(
    `https://texttospeech.googleapis.com/v1/voices?languageCode=pt-BR&key=${chave}`,
    {},
  );
  const corpo = await resposta.json();
  if (!resposta.ok) throw new Error(corpo.error?.message ?? `HTTP ${resposta.status}`);
  return corpo.voices
    .filter((v) => v.name.includes('Chirp3-HD'))
    .map((v) => ({ nome: v.name, genero: v.ssmlGender }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

async function falarGoogle(chave, voz) {
  const resposta = await buscarComPrazo(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${chave}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: TEXTO },
        voice: { languageCode: 'pt-BR', name: voz },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    },
  );
  const corpo = await resposta.json();
  if (!resposta.ok) throw new Error(corpo.error?.message ?? `HTTP ${resposta.status}`);
  return Buffer.from(corpo.audioContent, 'base64');
}

async function falarOpenAI(chave, voz) {
  const resposta = await buscarComPrazo('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: voz,
      input: TEXTO,
      response_format: 'mp3',
    }),
  });
  if (!resposta.ok) throw new Error((await resposta.text()).slice(0, 160));
  return Buffer.from(await resposta.arrayBuffer());
}

const escapar = (t) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function montarPagina(grupos) {
  const linha = (a) => {
    if (a.erro) {
      return `<li class="voz falhou"><span class="nome">${escapar(a.nome)}</span>
        <span class="aviso">${escapar(a.erro)}</span></li>`;
    }
    return `<li class="voz" data-genero="${escapar(a.genero || '')}">
      <button class="tocar" data-audio="${a.id}" aria-label="Ouvir ${escapar(a.nome)}">▶</button>
      <span class="nome">${escapar(a.nome)}</span>
      ${a.genero ? `<span class="badge">${escapar(a.genero.toLowerCase())}</span>` : ''}
      <span class="estrelas" data-voz="${escapar(a.rotulo)}">${[1, 2, 3, 4, 5]
        .map((n) => `<button class="estrela" data-nota="${n}" aria-label="${n} de 5 para ${escapar(a.nome)}">☆</button>`)
        .join('')}</span>
      <audio id="${a.id}" preload="none" src="data:audio/mpeg;base64,${a.base64}"></audio>
    </li>`;
  };

  const secoes = grupos
    .map(
      (g) => `<section>
      <h2>${escapar(g.titulo)}</h2>
      <p class="sub">${escapar(g.subtitulo)}</p>
      <ul class="lista">${g.amostras.map(linha).join('\n')}</ul>
    </section>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Comparar vozes — Arcanus</title>
<style>
  :root { --creme:#F7F3EA; --papel:#FFFCF6; --tinta:#24312D; --suave:#59665F;
          --sage:#587565; --ouro:#B58B46; --borda:#DED9CC; }
  * { box-sizing:border-box; }
  body { margin:0; padding:24px 16px 64px; background:var(--creme); color:var(--tinta);
         font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif; }
  .caixa { max-width:760px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 4px; }
  .texto { background:var(--papel); border:1px solid var(--borda); border-radius:12px;
           padding:16px; margin:16px 0 8px; font-style:italic; color:var(--suave); }
  .filtros { display:flex; gap:8px; margin:16px 0; flex-wrap:wrap; }
  .filtros button { border:1px solid var(--borda); background:var(--papel); color:var(--tinta);
                    border-radius:999px; padding:8px 16px; cursor:pointer; font-size:14px; }
  .filtros button[aria-pressed="true"] { background:var(--sage); color:#fff; border-color:var(--sage); }
  h2 { font-size:17px; margin:28px 0 2px; }
  .sub { margin:0 0 12px; color:var(--suave); font-size:13px; }
  .lista { list-style:none; padding:0; margin:0; }
  .voz { display:flex; align-items:center; gap:12px; background:var(--papel);
         border:1px solid var(--borda); border-radius:10px; padding:10px 12px; margin-bottom:8px; }
  .voz.oculta { display:none; }
  .voz.falhou { opacity:.55; }
  .tocar { width:40px; height:40px; flex:none; border-radius:50%; border:1px solid var(--sage);
           background:var(--sage); color:#fff; font-size:15px; cursor:pointer; }
  .tocar.tocando { background:var(--ouro); border-color:var(--ouro); }
  .nome { flex:1; font-weight:600; font-size:15px; word-break:break-word; }
  .badge { font-size:11px; color:var(--suave); border:1px solid var(--borda);
           border-radius:999px; padding:2px 8px; }
  .estrelas { display:flex; gap:1px; flex:none; }
  .estrela { border:none; background:none; font-size:20px; line-height:1; padding:0 1px;
             cursor:pointer; color:var(--ouro); }
  .aviso { font-size:12px; color:#D94F4F; }
  .favoritas { background:var(--papel); border:1px dashed var(--ouro); border-radius:12px;
               padding:12px 16px; margin-top:24px; font-size:14px; }
  .favoritas b { color:var(--ouro); }
</style>
</head>
<body>
<div class="caixa">
  <h1>Qual dessas vozes é o Arcanus?</h1>
  <p class="sub">Todas leem exatamente o mesmo trecho. Dê de 1 a 5 estrelas; clicar de novo na mesma estrela limpa a nota.</p>
  <div class="texto">${escapar(TEXTO)}</div>

  <div class="filtros">
    <button data-filtro="todas" aria-pressed="true">Todas</button>
    <button data-filtro="FEMALE" aria-pressed="false">Femininas</button>
    <button data-filtro="MALE" aria-pressed="false">Masculinas</button>
  </div>

  ${secoes}

  <div class="favoritas">Suas notas: <b id="marcadas">nenhuma ainda</b></div>
</div>
<script>
  var atual = null, botaoAtual = null;

  document.querySelectorAll('.tocar').forEach(function (botao) {
    botao.addEventListener('click', function () {
      var audio = document.getElementById(botao.dataset.audio);
      if (atual && atual !== audio) { atual.pause(); atual.currentTime = 0; }
      if (botaoAtual) { botaoAtual.textContent = '\u25B6'; botaoAtual.classList.remove('tocando'); }
      if (audio.paused) {
        audio.play();
        botao.textContent = '\u23F8';
        botao.classList.add('tocando');
        atual = audio; botaoAtual = botao;
      } else {
        audio.pause(); atual = null; botaoAtual = null;
      }
      audio.onended = function () {
        botao.textContent = '\u25B6'; botao.classList.remove('tocando');
        atual = null; botaoAtual = null;
      };
    });
  });

  var notas = {};
  function pintar(grupo, nota) {
    grupo.querySelectorAll('.estrela').forEach(function (e) {
      e.textContent = Number(e.dataset.nota) <= nota ? '\u2605' : '\u2606';
    });
  }

  function resumir() {
    var vozes = Object.keys(notas).filter(function (v) { return notas[v] > 0; });
    vozes.sort(function (a, b) { return notas[b] - notas[a]; });
    document.getElementById('marcadas').textContent = vozes.length
      ? vozes.map(function (v) { return v + ': ' + notas[v]; }).join('   \u00B7   ')
      : 'nenhuma ainda';
  }

  document.querySelectorAll('.estrelas').forEach(function (grupo) {
    grupo.querySelectorAll('.estrela').forEach(function (estrela) {
      estrela.addEventListener('click', function () {
        var voz = grupo.dataset.voz;
        var nota = Number(estrela.dataset.nota);
        // Clicar de novo na mesma nota limpa: sem isso n\u00E3o d\u00E1 para desfazer um
        // voto dado por engano, e a pessoa fica presa com a nota errada.
        notas[voz] = notas[voz] === nota ? 0 : nota;
        pintar(grupo, notas[voz]);
        resumir();
      });
    });
  });

  document.querySelectorAll('.filtros button').forEach(function (botao) {
    botao.addEventListener('click', function () {
      document.querySelectorAll('.filtros button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === botao));
      });
      var filtro = botao.dataset.filtro;
      document.querySelectorAll('.voz').forEach(function (voz) {
        var g = voz.dataset.genero || '';
        // Vozes sem gênero declarado (as da OpenAI) ficam sempre visíveis: o
        // filtro serve para percorrer as trinta do Google, não para escondê-las.
        voz.classList.toggle('oculta', filtro !== 'todas' && g !== '' && g !== filtro);
      });
    });
  });
</script>
</body>
</html>`;
}

/**
 * Remonta a página a partir dos mp3 que já estão na pasta, sem chamar API.
 *
 * Existe porque o áudio é a parte cara e a página é só a casca: mudar a casca
 * (as estrelas, o filtro, um texto) não pode custar uma rodada nova de
 * sintetização. Também salva a situação quando a geração para no meio — o que
 * já saiu continua aproveitável.
 */
async function remontar() {
  const arquivos = fs.readdirSync(PASTA).filter((f) => f.endsWith('.mp3'));
  if (arquivos.length === 0) {
    console.error(`Nenhum .mp3 em ${PASTA}. Rode sem --remontar primeiro.`);
    process.exit(1);
  }

  // O gênero não está no nome do arquivo; `voices.list` é consulta, não
  // sintetização, então não custa nada. Sem chave, a página fica sem o filtro.
  let generos = {};
  if (process.env.GOOGLE_TTS_KEY) {
    try {
      const vozes = await listarVozesGoogle(process.env.GOOGLE_TTS_KEY);
      for (const v of vozes) generos[v.nome.replace('pt-BR-Chirp3-HD-', '')] = v.genero;
    } catch {
      console.log('(sem a lista de gêneros; o filtro vai mostrar todas)');
    }
  }

  const grupos = [];
  for (const [prefixo, titulo, cobranca] of [
    ['google-', 'Google — Chirp 3 HD', 'cobradas por caractere'],
    ['openai-', 'OpenAI — gpt-4o-mini-tts', 'cobradas por token de áudio'],
  ]) {
    const amostras = arquivos
      .filter((f) => f.startsWith(prefixo))
      .sort()
      .map((f) => {
        const curto = f.replace(prefixo, '').replace('.mp3', '');
        const marca = prefixo === 'google-' ? 'Google' : 'OpenAI';
        return {
          id: `${prefixo[0]}_${curto}`,
          nome: curto,
          rotulo: `${marca} ${curto}`,
          genero: generos[curto] || '',
          base64: fs.readFileSync(path.join(PASTA, f)).toString('base64'),
        };
      });
    if (amostras.length > 0) {
      grupos.push({ titulo, subtitulo: `${amostras.length} vozes, ${cobranca}`, amostras });
    }
  }

  const pagina = path.join(PASTA, 'comparar.html');
  fs.writeFileSync(pagina, montarPagina(grupos));
  console.log(`Página remontada com ${arquivos.length} vozes, sem gastar API:\n${pagina}`);
}

/**
 * Já existe no disco?
 *
 * Voz sintetizada é dinheiro gasto, e o mesmo texto na mesma voz dá o mesmo
 * áudio. Reaproveitar o que está lá deixa rerodar barato — importa porque a
 * primeira rodada travou no meio e a segunda só precisa das que faltaram.
 * Para refazer tudo, apague a pasta.
 */
function jaTem(arquivo) {
  return fs.existsSync(arquivo) && fs.statSync(arquivo).size > 1024;
}

async function main() {
  fs.mkdirSync(PASTA, { recursive: true });

  if (process.argv.includes('--remontar')) return remontar();

  const chaveGoogle = process.env.GOOGLE_TTS_KEY;
  const chaveOpenAI = process.env.OPENAI_API_KEY;
  if (!chaveGoogle && !chaveOpenAI) {
    console.error('Nenhuma chave no ambiente. Rode antes:');
    console.error('  $env:GOOGLE_TTS_KEY = Read-Host');
    console.error('  $env:OPENAI_API_KEY = Read-Host');
    process.exit(1);
  }

  const grupos = [];
  let caracteres = 0;

  if (chaveGoogle) {
    const vozes = await listarVozesGoogle(chaveGoogle);
    console.log(`Google: ${vozes.length} vozes Chirp 3 HD em pt-BR`);
    const amostras = [];
    for (const voz of vozes) {
      const curto = voz.nome.replace('pt-BR-Chirp3-HD-', '');
      const arquivo = path.join(PASTA, `google-${curto}.mp3`);
      const existia = jaTem(arquivo);
      try {
        const audio = existia
          ? fs.readFileSync(arquivo)
          : await falarGoogle(chaveGoogle, voz.nome);
        if (!existia) {
          fs.writeFileSync(arquivo, audio);
          caracteres += TEXTO.length;
        }
        console.log(`  ${existia ? 'tem ' : 'ok  '} ${curto}`);
        amostras.push({
          id: `g_${curto}`, nome: curto, rotulo: `Google ${curto}`,
          genero: voz.genero, base64: audio.toString('base64'),
        });
      } catch (erro) {
        amostras.push({ nome: curto, rotulo: `Google ${curto}`, erro: erro.message });
        console.log(`  falhou ${curto}: ${erro.message}`);
      }
    }
    grupos.push({
      titulo: 'Google — Chirp 3 HD',
      subtitulo: `${amostras.filter((a) => !a.erro).length} vozes, cobradas por caractere`,
      amostras,
    });
  }

  if (chaveOpenAI) {
    console.log(`OpenAI: ${VOZES_OPENAI.length} vozes em gpt-4o-mini-tts`);
    const amostras = [];
    for (const voz of VOZES_OPENAI) {
      const arquivo = path.join(PASTA, `openai-${voz}.mp3`);
      const existia = jaTem(arquivo);
      try {
        const audio = existia
          ? fs.readFileSync(arquivo)
          : await falarOpenAI(chaveOpenAI, voz);
        if (!existia) {
          fs.writeFileSync(arquivo, audio);
          caracteres += TEXTO.length;
        }
        console.log(`  ${existia ? 'tem ' : 'ok  '} ${voz}`);
        amostras.push({
          id: `o_${voz}`, nome: voz, rotulo: `OpenAI ${voz}`,
          genero: '', base64: audio.toString('base64'),
        });
      } catch (erro) {
        amostras.push({ nome: voz, rotulo: `OpenAI ${voz}`, erro: erro.message });
        console.log(`  falhou ${voz}: ${erro.message}`);
      }
    }
    grupos.push({
      titulo: 'OpenAI — gpt-4o-mini-tts',
      subtitulo: `${amostras.filter((a) => !a.erro).length} vozes, cobradas por token de áudio`,
      amostras,
    });
  }

  const pagina = path.join(PASTA, 'comparar.html');
  fs.writeFileSync(pagina, montarPagina(grupos));

  console.log(`\n${caracteres} caracteres sintetizados no total.`);
  console.log('Abra esta página e ouça:\n' + pagina);
}

module.exports = { montarPagina, TEXTO };

if (require.main === module) {
  main().catch((erro) => {
    console.error(erro.message);
    process.exit(1);
  });
}
