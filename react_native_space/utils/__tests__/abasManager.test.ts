import { ABAS_MANAGER, ROTULO_ABA, resolverAba } from '../abasManager';

describe('resolverAba', () => {
  it('aceita as três abas', () => {
    expect(resolverAba('planos')).toBe('planos');
    expect(resolverAba('roadmap')).toBe('roadmap');
    expect(resolverAba('acessos')).toBe('acessos');
  });

  it('cai em planos quando falta, é inválido ou vem repetido', () => {
    expect(resolverAba(undefined)).toBe('planos');
    expect(resolverAba('outra')).toBe('planos');
    expect(resolverAba(['roadmap', 'acessos'])).toBe('roadmap');
  });

  it('tem rótulo para cada aba, na ordem de exibição', () => {
    expect(ABAS_MANAGER.map((a) => ROTULO_ABA[a])).toEqual(['Planos', 'Roadmap', 'Acessos']);
  });
});
