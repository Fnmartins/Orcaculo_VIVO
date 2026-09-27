import { buscarCidades, cidadePorId, CIDADES, rotuloDaCidade } from '../cidades';
import { offsetDoFuso } from '../../utils/fuso';

describe('a lista de cidades', () => {
  it('tem id único para cada uma', () => {
    const ids = CIDADES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tem as 27 capitais brasileiras', () => {
    const ufs = new Set(CIDADES.filter((c) => c.pais === 'Brasil').map((c) => c.uf));
    expect(ufs.size).toBe(27);
  });

  // Coordenada escrita à mão erra de dois jeitos que estragam o mapa sem
  // parecer errado: sinal trocado e latitude no lugar da longitude. As faixas
  // pegam os dois.
  it('as brasileiras caem dentro do Brasil', () => {
    for (const c of CIDADES.filter((x) => x.pais === 'Brasil')) {
      expect(c.lat).toBeGreaterThan(-34);
      expect(c.lat).toBeLessThan(6);
      expect(c.lon).toBeGreaterThan(-74);
      expect(c.lon).toBeLessThan(-34);
    }
  });

  it('nenhuma coordenada é zero nem passa dos limites do globo', () => {
    for (const c of CIDADES) {
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
      expect(c.lat === 0 && c.lon === 0).toBe(false);
    }
  });

  // O teste que mais importa deste arquivo: o nome IANA existe e o offset que
  // eu escrevi é o mesmo que o banco de fusos diz, fora do horário de verão.
  it('cada fuso existe e o offset padrão bate com o banco de fusos', () => {
    for (const c of CIDADES) {
      // Julho para o hemisfério sul e janeiro para o norte: nos dois casos é
      // horário padrão, sem verão.
      const referencia = c.lat < 0
        ? new Date('2026-07-15T12:00:00Z')
        : new Date('2026-01-15T12:00:00Z');
      expect(() => offsetDoFuso(c.fuso, referencia)).not.toThrow();
      expect(offsetDoFuso(c.fuso, referencia)).toBe(c.offsetPadrao);
    }
  });
});

describe('buscarCidades', () => {
  it('acha sem acento e sem caixa', () => {
    expect(buscarCidades('sao paulo')[0].id).toBe('sao-paulo-sp');
    expect(buscarCidades('FLORIANO')[0].id).toBe('florianopolis-sc');
  });

  it('quem começa com o termo vem antes de quem só contém', () => {
    const achados = buscarCidades('porto');
    expect(achados[0].nome.startsWith('Porto')).toBe(true);
  });

  it('acha pela sigla do estado e pelo país', () => {
    expect(buscarCidades('sorocaba sp')[0].id).toBe('sorocaba-sp');
    expect(buscarCidades('lisboa portugal')[0].id).toBe('lisboa-pt');
  });

  it('termo vazio não devolve a lista toda', () => {
    expect(buscarCidades('  ')).toEqual([]);
  });
});

describe('cidadePorId e rótulo', () => {
  it('acha e escreve com estado, ou com país quando é de fora', () => {
    const sp = cidadePorId('sao-paulo-sp');
    expect(sp).not.toBeNull();
    expect(rotuloDaCidade(sp!)).toBe('São Paulo, SP');
    expect(rotuloDaCidade(cidadePorId('lisboa-pt')!)).toBe('Lisboa, Portugal');
  });

  it('id inventado devolve nulo', () => {
    expect(cidadePorId('atlantida')).toBeNull();
  });
});
