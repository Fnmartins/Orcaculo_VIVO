const { valeConstruir, decidir, PULAR, CONSTRUIR } = require('../decidir-deploy');

/**
 * A regra de deploy é onde um erro não aparece: ela não quebra nada, ela deixa
 * produção velha. Estes testes existem para a decisão errar sempre para o lado de
 * construir.
 */

describe('os códigos de saída', () => {
  it('zero pula e um constrói, como a Vercel define', () => {
    // Invertido do costume de shell. Trocar isto desliga o deploy do produto.
    expect(PULAR).toBe(0);
    expect(CONSTRUIR).toBe(1);
  });
});

describe('valeConstruir', () => {
  it('arquivo do app manda construir', () => {
    expect(valeConstruir(['app/mapa-astral/resultado.tsx'])).toBe(true);
    expect(valeConstruir(['package.json'])).toBe(true);
    expect(valeConstruir(['data/areas.ts'])).toBe(true);
  });

  it('só documentação não manda construir', () => {
    expect(valeConstruir(['docs/2026-09-29-estado-arcanus.md'])).toBe(false);
    expect(valeConstruir(['docs/a.md', 'docs/superpowers/specs/b.md'])).toBe(false);
  });

  it('documentação MAIS código manda construir', () => {
    // O caso exato que a regra velha errava quando os dois vinham no mesmo push.
    expect(valeConstruir(['docs/nota.md', 'app/planos.tsx'])).toBe(true);
  });

  it('nada mudou é nada a publicar', () => {
    expect(valeConstruir([])).toBe(false);
    expect(valeConstruir(['', '  '])).toBe(false);
  });

  it('não confunde caminho que só começa parecido com docs', () => {
    // `docs-antigos/` e `app/docs/` não são a pasta de documentação da raiz.
    expect(valeConstruir(['docs-antigos/x.md'])).toBe(true);
    expect(valeConstruir(['app/docs/ajuda.tsx'])).toBe(true);
  });
});

describe('decidir', () => {
  const antes = process.env.VERCEL_GIT_PREVIOUS_SHA;
  afterEach(() => {
    if (antes === undefined) delete process.env.VERCEL_GIT_PREVIOUS_SHA;
    else process.env.VERCEL_GIT_PREVIOUS_SHA = antes;
  });

  it('sem deploy anterior, constrói', () => {
    // Primeira publicação da branch, ou a opção de expor variáveis desligada no
    // projeto. Nos dois casos não há como comparar — então publica.
    delete process.env.VERCEL_GIT_PREVIOUS_SHA;
    expect(decidir()).toMatchObject({ construir: true });

    process.env.VERCEL_GIT_PREVIOUS_SHA = '   ';
    expect(decidir()).toMatchObject({ construir: true });
  });

  it('commit anterior fora do clone raso, constrói', () => {
    // A Vercel clona com --depth=10: um deploy antigo não está no clone. Este SHA
    // não existe em repositório nenhum.
    process.env.VERCEL_GIT_PREVIOUS_SHA = '0000000000000000000000000000000000000000';
    const decisao = decidir();
    expect(decisao.construir).toBe(true);
    expect(decisao.motivo).toContain('clone raso');
  });

  it('comparando um commit com ele mesmo, não há o que publicar', () => {
    // Usa o HEAD real deste repositório: diff de algo contra si mesmo é vazio.
    const { execFileSync } = require('node:child_process');
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    process.env.VERCEL_GIT_PREVIOUS_SHA = head;
    expect(decidir()).toMatchObject({ construir: false });
  });
});
