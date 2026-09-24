import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial', timeout: 60_000 });

// Desde 24/09 o app exige sessão: só estas abrem sem login. As de dentro
// passaram para ROTAS_PROTEGIDAS — deixá-las aqui manteria nove testes verdes
// medindo a mesma tela de boas-vindas, que é pior que teste vermelho.
const ROTAS_PUBLICAS = [
  { nome: 'entrada', caminho: '/' },
  { nome: 'boas-vindas', caminho: '/welcome' },
  { nome: 'login', caminho: '/auth/login' },
  { nome: 'cadastro', caminho: '/auth/cadastro' },
  { nome: 'planos', caminho: '/planos' },
  { nome: 'privacidade', caminho: '/legal/privacidade' },
  { nome: 'termos', caminho: '/legal/termos' },
] as const;

const ROTAS_PROTEGIDAS = [
  { nome: 'abas', caminho: '/(tabs)' },
  { nome: 'mapa numerológico', caminho: '/mapa-numerologico' },
  { nome: 'numerologia', caminho: '/numerologia' },
  { nome: 'mapa astral', caminho: '/mapa-astral' },
  { nome: 'análise por imagem', caminho: '/ia' },
  { nome: 'preparação dos búzios', caminho: '/consulta/buzios-preparo' },
  { nome: 'painel', caminho: '/manager' },
] as const;

for (const rota of ROTAS_PROTEGIDAS) {
  test(`${rota.nome}: sem sessão, não abre`, async ({ page }) => {
    await page.goto(rota.caminho);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/welcome/, { timeout: 15_000 });
  });
}

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

// Também precisaram sair as telas de dentro: sem sessão, o Axe auditava a tela
// de boas-vindas achando que auditava o mapa numerológico. Auditar as telas
// internas volta a ser possível quando o E2E tiver login.
const ROTAS_ACESSIBILIDADE = [
  '/welcome',
  '/auth/login',
  '/planos',
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
