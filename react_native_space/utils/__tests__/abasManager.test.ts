import { ABAS_MANAGER, ROTULO_ABA, resolverAba } from '../abasManager';

describe('resolverAba', () => {
  it('aceita as cinco abas', () => {
    expect(resolverAba('planos')).toBe('planos');
    expect(resolverAba('roadmap')).toBe('roadmap');
    expect(resolverAba('decisoes')).toBe('decisoes');
    expect(resolverAba('moderacao')).toBe('moderacao');
    expect(resolverAba('acessos')).toBe('acessos');
  });

  it('cai em planos quando falta, é inválido ou vem repetido', () => {
    expect(resolverAba(undefined)).toBe('planos');
    expect(resolverAba('outra')).toBe('planos');
    expect(resolverAba(['roadmap', 'acessos'])).toBe('roadmap');
  });

  it('tem rótulo para cada aba, na ordem de exibição', () => {
    // A lista é fixada de propósito: aba nova sem rótulo apareceria em branco na
    // barra do Painel, e este teste é o que obriga a pensar no nome dela.
    expect(ABAS_MANAGER.map((a) => ROTULO_ABA[a]))
      .toEqual(['Planos', 'Roadmap', 'Decisões', 'Moderação', 'Acessos', 'Custo']);
  });
});
