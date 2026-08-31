import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial', timeout: 60_000 });

const ROTAS_PUBLICAS = [
  { nome: 'entrada', caminho: '/' },
  { nome: 'mapa numerológico', caminho: '/mapa-numerologico' },
  { nome: 'formulário numerológico', caminho: '/mapa-numerologico/formulario' },
  { nome: 'numerologia', caminho: '/numerologia' },
  { nome: 'mapa astral', caminho: '/mapa-astral' },
  { nome: 'matriz do destino', caminho: '/matriz-destino' },
  { nome: 'análise por imagem', caminho: '/ia' },
  { nome: 'preparação dos búzios', caminho: '/consulta/buzios-preparo' },
  { nome: 'jogo de búzios', caminho: '/consulta/buzios-jogo' },
] as const;

for (const rota of ROTAS_PUBLICAS) {
  test(`${rota.nome}: carrega sem overflow ou exceção`, async ({ page }) => {
    const excecoes: string[] = [];
    page.on('pageerror', erro => excecoes.push(erro.message));

    await page.goto(rota.caminho);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();

    const dimensoes = await page.evaluate(() => ({
      documento: document.documentElement.scrollWidth,
      janela: window.innerWidth,
    }));

    expect(dimensoes.documento, `Overflow em ${rota.caminho}`).toBeLessThanOrEqual(dimensoes.janela);
    expect(excecoes, `Exceções em ${rota.caminho}: ${excecoes.join('\n')}`).toEqual([]);
  });
}

const ROTAS_ACESSIBILIDADE = [
  '/mapa-numerologico',
  '/mapa-numerologico/formulario',
  '/mapa-numerologico/resultado?nome=Ana%20da%20Silva&nomeAtual=Ana%20de%20Souza&dia=1&mes=1&ano=2000',
] as const;

for (const caminho of ROTAS_ACESSIBILIDADE) {
  test(`${caminho}: sem violações graves de acessibilidade`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'Auditoria Axe centralizada em 390 px');

    await page.goto(caminho);
    await page.waitForLoadState('domcontentloaded');

    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const graves = resultado.violations.filter(violacao =>
      violacao.impact === 'critical' || violacao.impact === 'serious'
    );

    expect(
      graves,
      graves.map(violacao => `${violacao.id}: ${violacao.help} (${violacao.nodes.length})`).join('\n')
    ).toEqual([]);
  });
}
