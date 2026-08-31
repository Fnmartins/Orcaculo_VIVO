import { expect, test } from '@playwright/test';

const rotaComparacao = '/mapa-numerologico/resultado?nome=Ana%20da%20Silva&nomeAtual=Ana%20de%20Souza&dia=1&mes=1&ano=2000';

test.beforeEach(async ({ page }) => {
  const falhas: string[] = [];
  page.on('pageerror', erro => falhas.push(`pageerror: ${erro.message}`));
  page.on('console', mensagem => {
    if (mensagem.type() === 'error') falhas.push(`console: ${mensagem.text()}`);
  });
  (page as typeof page & { falhasDaPagina?: string[] }).falhasDaPagina = falhas;
});

test.afterEach(async ({ page }) => {
  const falhas = (page as typeof page & { falhasDaPagina?: string[] }).falhasDaPagina ?? [];
  expect(falhas, `Erros detectados na página:\n${falhas.join('\n')}`).toEqual([]);
});

test('resultado não cria overflow horizontal', async ({ page }) => {
  await page.goto(rotaComparacao);
  await expect(page.getByText('Mapa Numerológico')).toBeVisible();

  const dimensoes = await page.evaluate(() => ({
    larguraDocumento: document.documentElement.scrollWidth,
    larguraJanela: window.innerWidth,
  }));

  expect(dimensoes.larguraDocumento).toBeLessThanOrEqual(dimensoes.larguraJanela);
});

test('comparação de nomes e plano são navegáveis', async ({ page }) => {
  await page.goto(rotaComparacao);

  await page.getByRole('tab', { name: /Comparar nomes/i }).click();
  await expect(page.getByText('Comparação simbólica')).toBeVisible();
  await expect(page.getByText('Ana de Souza')).toBeVisible();

  await page.getByRole('tab', { name: /Meu plano/i }).click();
  await expect(page.getByText('Seu plano de reflexão')).toBeVisible();
  await page.getByRole('checkbox', { name: /Clareza/i }).click();
  await expect(page.getByText('1 tema escolhido')).toBeVisible();
});

test('parâmetros inválidos exibem recuperação', async ({ page }) => {
  await page.goto('/mapa-numerologico/resultado?nome=A&dia=31&mes=2&ano=2000');

  await expect(page.getByText('Não foi possível montar seu mapa')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revisar dados' })).toBeVisible();
});
