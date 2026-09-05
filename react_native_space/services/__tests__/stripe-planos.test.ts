import {
  moedaPadrao, formatarPreco, PLANOS_STRIPE, MOEDAS_SUPORTADAS,
} from '../stripe-planos';

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

describe('PLANOS_STRIPE', () => {
  it('tem os 3 planos com preço em todas as moedas suportadas', () => {
    expect(PLANOS_STRIPE.map(p => p.id)).toEqual(['iniciante', 'explorador', 'mestre']);
    for (const plano of PLANOS_STRIPE) {
      for (const moeda of MOEDAS_SUPORTADAS) {
        expect(typeof plano.precos[moeda]).toBe('number');
      }
    }
  });
  it('mantém os preços BRL conhecidos', () => {
    const brl = Object.fromEntries(PLANOS_STRIPE.map(p => [p.id, p.precos.brl]));
    expect(brl).toEqual({ iniciante: 29.9, explorador: 79.9, mestre: 199.9 });
  });
});
