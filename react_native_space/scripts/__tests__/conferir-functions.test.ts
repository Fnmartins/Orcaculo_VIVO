// eslint-disable-next-line @typescript-eslint/no-var-requires
const { errosDeSintaxe, arquivosTS, RAIZ } = require('../conferir-functions');

/**
 * Uma rede que ninguém testou é uma rede que ninguém sabe se existe.
 *
 * O caso que importa está logo abaixo: o erro exato que escapou em 28/09 e só
 * apareceu no deploy. Se algum dia alguém trocar o parser por outra coisa,
 * este teste é quem avisa que a proteção sumiu.
 *
 * As strings são montadas aqui, com concatenação explícita, e não escritas em
 * arquivo pelo shell — foi o escape do shell que invalidou a primeira
 * tentativa de provar isto: os dois lados da comparação saíram quebrados e o
 * teste "passou" sem comparar nada.
 */

const ASPA = String.fromCharCode(39);
const BARRA = String.fromCharCode(92);
const QUEBRA = String.fromCharCode(10);

describe('errosDeSintaxe', () => {
  it('pega a quebra de linha dentro da string — o erro de 28/09', () => {
    // `['x'].join('` + quebra de linha real + `');`
    const quebrado = `const a = [${ASPA}x${ASPA}].join(${ASPA}${QUEBRA}${ASPA});`;
    const erros = errosDeSintaxe('t.ts', quebrado);
    expect(erros.length).toBeGreaterThan(0);
    expect(erros.join(' ')).toMatch(/nterminated string/i);
  });

  it('e deixa passar o mesmo código escrito certo', () => {
    // `['x'].join('\n');` — a barra e o "n" como dois caracteres.
    const correto = `const a = [${ASPA}x${ASPA}].join(${ASPA}${BARRA}n${ASPA});`;
    expect(errosDeSintaxe('t.ts', correto)).toEqual([]);
  });

  it('acha outros erros de sintaxe comuns', () => {
    expect(errosDeSintaxe('t.ts', 'const a = {;').length).toBeGreaterThan(0);
    expect(errosDeSintaxe('t.ts', 'function f( { return 1; }').length).toBeGreaterThan(0);
  });

  it('não reclama de import que o Node não entende', () => {
    // O Deno usa `npm:` e `.ts` explícito. O parser não resolve import nenhum,
    // e é por isso que esta conferência funciona sem instalar nada.
    const deno = [
      `import { createClient } from ${ASPA}npm:@supabase/supabase-js@2${ASPA};`,
      `import { algo } from ${ASPA}../_shared/uso.ts${ASPA};`,
      'Deno.serve(() => new Response(algo(createClient)));',
    ].join(QUEBRA);
    expect(errosDeSintaxe('t.ts', deno)).toEqual([]);
  });

  it('diz linha e coluna, para achar o estrago', () => {
    const tresLinhas = ['const a = 1;', 'const b = {;', 'const c = 3;'].join(QUEBRA);
    expect(errosDeSintaxe('t.ts', tresLinhas)[0]).toMatch(/^2:/);
  });
});

describe('as functions de verdade', () => {
  it('todas fazem parse', () => {
    // Não é redundante com rodar o script: aqui a falha aparece junto dos
    // outros testes, que é onde alguém está olhando.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const quebrados: string[] = [];

    for (const caminho of arquivosTS(RAIZ)) {
      const erros = errosDeSintaxe(caminho, fs.readFileSync(caminho, 'utf8'));
      if (erros.length > 0) {
        quebrados.push(`${path.basename(path.dirname(caminho))}: ${erros[0]}`);
      }
    }
    expect(quebrados).toEqual([]);
  });

  it('encontra as functions, em vez de passar por uma pasta vazia', () => {
    // Sem isto, apagar a pasta faria o teste acima passar com zero arquivos —
    // verde por não ter olhado nada.
    expect(arquivosTS(RAIZ).length).toBeGreaterThan(10);
  });
});
