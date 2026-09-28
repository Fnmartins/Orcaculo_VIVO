import { imprimirPagina, podeImprimir } from '../impressao';

describe('impressão', () => {
  it('sem navegador, não oferece o botão nem tenta imprimir', () => {
    // No Jest não existe `print`: é o mesmo caso do app rodando fora da web,
    // e aí o botão some em vez de não fazer nada.
    expect(podeImprimir()).toBe(false);
    expect(imprimirPagina()).toBe(false);
  });
});
