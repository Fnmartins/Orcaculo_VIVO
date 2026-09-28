// eslint-disable-next-line @typescript-eslint/no-var-requires
const { injetarHead, TITULO } = require('../head-web');

/** O shell que o Expo gera hoje, encurtado no que não importa aqui. */
const SHELL_DO_EXPO = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <title>Arcanus</title>
    <style id="expo-reset">body { overflow: hidden; }</style>
  <link rel="icon" href="/favicon.ico" /></head>
  <body><div id="root"></div></body>
</html>`;

describe('head da web', () => {
  it('troca o idioma e o título', () => {
    const saida = injetarHead(SHELL_DO_EXPO);
    expect(saida).toContain('<html lang="pt-BR"');
    expect(saida).toContain(`<title>${TITULO}</title>`);
    expect(saida).not.toContain('lang="en"');
  });

  it('põe descrição, Open Graph e cartão do Twitter', () => {
    const saida = injetarHead(SHELL_DO_EXPO);
    for (const marca of [
      'name="description"',
      'property="og:title"',
      'property="og:description"',
      'property="og:image"',
      'property="og:image:width"',
      'name="twitter:card"',
    ]) {
      expect(saida).toContain(marca);
    }
  });

  it('não mexe no reset de rolagem do Expo', () => {
    // Foi esse reset que fez o PDF sair em uma página só; quebrá-lo aqui
    // quebraria a rolagem do app inteiro na web.
    expect(injetarHead(SHELL_DO_EXPO)).toContain('id="expo-reset"');
  });

  it('rodar duas vezes não duplica meta tag', () => {
    const uma = injetarHead(SHELL_DO_EXPO);
    const duas = injetarHead(uma);
    expect(duas).toBe(uma);
    expect(duas.match(/property="og:image"/g)).toHaveLength(1);
  });

  it('grita se o template do Expo mudar, em vez de publicar sem Open Graph', () => {
    // O modo de falhar importa: um build que passa e vai pro ar sem preview é
    // pior que um build vermelho, porque ninguém fica sabendo.
    expect(() => injetarHead('<html><body>oi</body></html>')).toThrow(/lang/);
    expect(() => injetarHead('<html lang="en"><body>oi</body></html>')).toThrow(/head/);
  });
});
