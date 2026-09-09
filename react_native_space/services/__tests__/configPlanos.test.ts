// configPlanos importa ./supabase (que puxa async-storage, indisponível no
// jest). As funções testadas aqui são puras; mockamos o supabase p/ isolar.
jest.mock('../supabase', () => ({ supabase: {} }));

import { centavosParaNumero, numeroParaCentavos } from '../configPlanos';

describe('conversão de centavos', () => {
  it('centavos → número de exibição', () => {
    expect(centavosParaNumero(2990)).toBe(29.9);
    expect(centavosParaNumero(690)).toBe(6.9);
    expect(centavosParaNumero(19990)).toBe(199.9);
  });

  it('número → centavos (arredonda)', () => {
    expect(numeroParaCentavos(29.9)).toBe(2990);
    expect(numeroParaCentavos(16.9)).toBe(1690);
    expect(numeroParaCentavos(29.905)).toBe(2991);
  });

  it('ida e volta preserva o valor', () => {
    expect(centavosParaNumero(numeroParaCentavos(54.9))).toBe(54.9);
  });
});
