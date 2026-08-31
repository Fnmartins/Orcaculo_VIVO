import {
  calcularAlma,
  calcularAnoPessoal,
  calcularCaminhoVida,
  calcularExpressao,
  calcularPersonalidade,
  gerarMapaCompleto,
  normalizarNome,
} from '../mapa-numerologico';
import { gerarNumerologiaCompleta } from '../numerologia';

describe('motor do mapa numerológico', () => {
  it('normaliza acentos e descarta caracteres fora do alfabeto usado', () => {
    expect(normalizarNome('  Fabiáno Nascimento-Martins  ')).toBe('FABIANO NASCIMENTOMARTINS');
  });

  it('calcula nome e data de forma determinística', () => {
    expect(calcularCaminhoVida(1, 1, 2000).numeroFinal).toBe(4);
    expect(calcularExpressao('Ana').numeroFinal).toBe(7);
    expect(calcularAlma('Ana').numeroFinal).toBe(2);
    expect(calcularPersonalidade('Ana').numeroFinal).toBe(5);
  });

  it('calcula o Ano Pessoal usando um ano de referência explícito', () => {
    const resultado = calcularAnoPessoal(28, 8, 2026);

    expect(resultado.numeroFinal).toBe(1);
    expect(resultado.passos[0].detalhe).toBe('28 + 8 + 2 + 0 + 2 + 6 = 46');
  });

  it('preserva a trilha e o ano de referência no mapa completo', () => {
    const mapa = gerarMapaCompleto('Ana Silva', 1, 1, 2000, 2026);

    expect(mapa.anoReferencia).toBe(2026);
    expect(mapa.anoPessoal.passos.length).toBeGreaterThan(1);
    expect(mapa.caminhoVida.passos.length).toBeGreaterThan(0);
  });

  it('mantém números mestres compatíveis na leitura simples', () => {
    const leitura = gerarNumerologiaCompleta('Azzzz', 1, 1, 2000);

    expect(leitura.expressao.numero).toBe(33);
    expect(leitura.expressao.titulo).toBe('O Cuidador Mestre');
  });
});
