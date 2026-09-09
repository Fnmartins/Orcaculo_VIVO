import { moedaPadrao, formatarPreco } from '../stripe-planos';

describe('moedaPadrao', () => {
  it('retorna brl para locale pt-BR', () => {
    expect(moedaPadrao('pt-BR')).toBe('brl');
  });
  it('retorna cad para en-CA', () => {
    expect(moedaPadrao('en-CA')).toBe('cad');
  });
  it('retorna usd para en-US', () => {
    expect(moedaPadrao('en-US')).toBe('usd');
  });
  it('retorna eur para de-DE', () => {
    expect(moedaPadrao('de-DE')).toBe('eur');
  });
  it('cai em brl para locale desconhecido', () => {
    expect(moedaPadrao('xx-YY')).toBe('brl');
  });
});

describe('formatarPreco', () => {
  it('usa R$ e vírgula para brl', () => {
    expect(formatarPreco(29.9, 'brl')).toBe('R$ 29,90');
  });
  it('usa US$ e ponto para usd', () => {
    expect(formatarPreco(6.9, 'usd')).toBe('US$ 6.90');
  });
  it('usa € e vírgula para eur', () => {
    expect(formatarPreco(16.9, 'eur')).toBe('€ 16,90');
  });
});
