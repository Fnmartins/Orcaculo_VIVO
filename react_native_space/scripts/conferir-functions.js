/**
 * Confere a sintaxe das Edge Functions.
 *
 * ## Por que existe
 *
 * `tsc --noEmit` do app NÃO cobre `supabase/functions/`: elas rodam no Deno e
 * ficam fora do tsconfig. Em 28/09 um `\n` virou quebra de linha de verdade
 * dentro de uma string, o `tsc` passou verde, e o erro só apareceu no deploy:
 *
 *     Failed to bundle the function (reason: The module's source code could
 *     not be parsed: Expected ',', got 'string literal' at index.ts:171)
 *
 * Um arquivo que não faz parse não sobe. Descobrir isso no deploy é caro e
 * tarde; descobrir junto dos testes custa menos de um segundo.
 *
 * ## O que ele cobre, e o que não
 *
 * **Cobre sintaxe.** Usa o parser do próprio TypeScript, que já está instalado,
 * e não precisa resolver import nenhum — por isso funciona com os `npm:` e os
 * `.ts` explícitos que o Deno usa e o Node não entende.
 *
 * **Não cobre tipo.** Um nome de coluna errado numa consulta passa por aqui.
 * Checagem de tipo exigiria Deno instalado e um `deno.json` resolvendo os
 * `npm:` — está anotado no roadmap como passo seguinte, e este arquivo não
 * finge fazer o que não faz.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const RAIZ = path.join(__dirname, '..', 'supabase', 'functions');

/** Todos os `.ts` abaixo da raiz, inclusive os de `_shared`. */
function arquivosTS(diretorio) {
  const achados = [];
  for (const entrada of fs.readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) achados.push(...arquivosTS(caminho));
    else if (entrada.name.endsWith('.ts')) achados.push(caminho);
  }
  return achados;
}

/**
 * Os erros de sintaxe de um arquivo, já em texto legível.
 *
 * Exportada para o teste poder provar que a rede pega o erro de 28/09 — uma
 * rede que ninguém testou é uma rede que ninguém sabe se existe.
 */
function errosDeSintaxe(nome, codigo) {
  const arquivo = ts.createSourceFile(nome, codigo, ts.ScriptTarget.ESNext, true);
  // `parseDiagnostics` é o que o parser encheu antes de qualquer resolução de
  // módulo. É justamente o que se quer: nada aqui depende de dependência
  // instalada.
  const diagnosticos = arquivo.parseDiagnostics ?? [];
  return diagnosticos.map((d) => {
    const posicao = typeof d.start === 'number'
      ? arquivo.getLineAndCharacterOfPosition(d.start)
      : null;
    const onde = posicao ? `${posicao.line + 1}:${posicao.character + 1}` : '?';
    return `${onde} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`;
  });
}

module.exports = { errosDeSintaxe, arquivosTS, RAIZ };

if (require.main === module) {
  if (!fs.existsSync(RAIZ)) {
    console.error(`[functions] ${RAIZ} não existe.`);
    process.exit(1);
  }

  const arquivos = arquivosTS(RAIZ);
  let quebrados = 0;

  for (const caminho of arquivos) {
    const relativo = path.relative(path.join(__dirname, '..'), caminho);
    const erros = errosDeSintaxe(relativo, fs.readFileSync(caminho, 'utf8'));
    if (erros.length === 0) continue;
    quebrados += 1;
    console.error(`\n${relativo}`);
    for (const erro of erros) console.error(`  ${erro}`);
  }

  if (quebrados > 0) {
    console.error(`\n[functions] ${quebrados} de ${arquivos.length} não fazem parse.`);
    process.exit(1);
  }
  console.log(`[functions] ${arquivos.length} arquivos, sintaxe ok.`);
}
