#!/usr/bin/env node
'use strict';

/**
 * Decide se a Vercel deve construir este commit.
 *
 * ## O defeito que isto corrige
 *
 * A regra era `git diff --quiet HEAD^ HEAD -- . ':(exclude)docs'`: olhava UM
 * commit. Quando um push traz vários — o caso normal ao mergear um PR — a Vercel
 * constroi o mais novo, e a comparacao via so ele.
 *
 * Push com dois commits, o primeiro mexendo em `app/` e o ultimo so em `docs/`:
 * a regra via documentacao, pulava o deploy, e a mudanca do app NAO ia ao ar. Sem
 * erro, sem aviso, e sem jeito de perceber a nao ser abrindo o site e achando a
 * versao velha. Ficava assim ate algum commit futuro tocar o app.
 *
 * ## Como fica
 *
 * A comparacao passa a ser contra o ultimo deploy que DEU CERTO nesta branch, que
 * a Vercel entrega em `VERCEL_GIT_PREVIOUS_SHA` — e essa variavel existe
 * justamente porque existe um Ignored Build Step. Assim nenhum commit fica fora da
 * janela: o que nao foi publicado continua sendo considerado.
 *
 * ## A prova de falha, sempre para o lado de construir
 *
 * Tres situacoes em que a decisao e impossivel, e nas tres a resposta e construir:
 *
 * - `VERCEL_GIT_PREVIOUS_SHA` vazio: primeiro deploy da branch, ou a opcao
 *   "Automatically Expose System Environment Variables" desligada no projeto.
 * - O commit anterior fora do clone: a Vercel clona com `--depth=10`, e um deploy
 *   antigo simplesmente nao esta ali.
 * - Qualquer erro no git.
 *
 * Construir sem precisar custa alguns minutos de build. Pular sem poder deixa
 * producao velha sem ninguem saber. Os dois erros nao tem o mesmo tamanho.
 *
 * ## Atencao ao codigo de saida
 *
 * Invertido em relacao ao costume de shell, e a documentacao da Vercel e
 * explicita: **0 = pular o build**, **1 ou mais = construir**. Um `process.exit`
 * trocado aqui desliga o deploy do produto inteiro.
 */

const { execFileSync } = require('node:child_process');

/** Sair com este codigo PULA o build. */
const PULAR = 0;
/** Sair com este codigo CONSTROI. */
const CONSTRUIR = 1;

/**
 * Caminhos que, sozinhos, nao mudam o que e publicado.
 *
 * Deliberadamente curto. Cada entrada aqui e uma aposta de que mexer ali nunca
 * altera o site — e uma aposta errada vira producao velha em silencio, que e
 * exatamente o defeito que este arquivo existe para matar.
 */
const SO_DOCUMENTACAO = [/^docs\//];

/**
 * Vale construir por causa desta lista de arquivos?
 *
 * Pura de proposito: e a unica parte com decisao, e e a que o teste cobre. Lista
 * vazia responde `false` — nada mudou, nada a publicar.
 */
function valeConstruir(arquivos) {
  return arquivos.some((caminho) => {
    const limpo = caminho.trim();
    if (!limpo) return false;
    return !SO_DOCUMENTACAO.some((padrao) => padrao.test(limpo));
  });
}

function git(...argumentos) {
  return execFileSync('git', argumentos, { encoding: 'utf8' });
}

function decidir() {
  const anterior = (process.env.VERCEL_GIT_PREVIOUS_SHA ?? '').trim();
  if (!anterior) {
    return { construir: true, motivo: 'sem deploy anterior nesta branch' };
  }

  try {
    // O commit existe neste clone? Com `--depth=10`, pode nao existir.
    git('cat-file', '-e', `${anterior}^{commit}`);
  } catch {
    return {
      construir: true,
      motivo: `o commit ${anterior.slice(0, 8)} do ultimo deploy nao esta no clone raso`,
    };
  }

  let arquivos;
  try {
    arquivos = git('diff', '--name-only', anterior, 'HEAD').split('\n');
  } catch (erro) {
    return { construir: true, motivo: `git diff falhou (${erro.message.split('\n')[0]})` };
  }

  const mudou = arquivos.filter((a) => a.trim());
  if (mudou.length === 0) {
    return { construir: false, motivo: 'nada mudou desde o ultimo deploy' };
  }
  if (!valeConstruir(mudou)) {
    return {
      construir: false,
      motivo: `so documentacao mudou (${mudou.length} arquivo${mudou.length > 1 ? 's' : ''})`,
    };
  }
  return { construir: true, motivo: `${mudou.length} arquivo(s) mudaram desde o ultimo deploy` };
}

// Rodando como script, e nao sendo importado pelo teste.
if (require.main === module) {
  const { construir, motivo } = decidir();
  console.log(`[deploy] ${construir ? 'construir' : 'pular'}: ${motivo}`);
  process.exit(construir ? CONSTRUIR : PULAR);
}

module.exports = { valeConstruir, decidir, PULAR, CONSTRUIR };
