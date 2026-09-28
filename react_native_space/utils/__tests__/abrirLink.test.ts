import { Linking } from 'react-native';
import { abrirLink, linkSeguro } from '../abrirLink';

/**
 * O link de uma decisão vem do banco, digitado por gente. Estes testes fixam
 * o que o app aceita abrir — e, principalmente, o que ele recusa.
 */

describe('linkSeguro', () => {
  it('aceita http e https', () => {
    expect(linkSeguro('https://claude.ai/artifact/AbC123')).toBe('https://claude.ai/artifact/AbC123');
    expect(linkSeguro('http://exemplo.com.br/x?y=1')).toBe('http://exemplo.com.br/x?y=1');
  });

  it('tira espaço em volta', () => {
    expect(linkSeguro('  https://arcanus.com.br  ')).toBe('https://arcanus.com.br');
  });

  it('recusa javascript:', () => {
    // Na web o app roda dentro de uma página; abrir isso executaria o código
    // no contexto dela. É a razão de a trava existir.
    expect(linkSeguro('javascript:alert(1)')).toBeNull();
    expect(linkSeguro('JavaScript:alert(1)')).toBeNull();
  });

  it('recusa outros esquemas', () => {
    expect(linkSeguro('file:///C:/Windows/System32')).toBeNull();
    expect(linkSeguro('arcanus://perfil')).toBeNull();
    expect(linkSeguro('mailto:contato@arcanus.com.br')).toBeNull();
  });

  it('recusa endereço sem esquema, que não abre sozinho', () => {
    expect(linkSeguro('www.arcanus.com.br')).toBeNull();
    expect(linkSeguro('arcanus.com.br')).toBeNull();
  });

  it('recusa vazio, nulo e só espaço', () => {
    expect(linkSeguro(null)).toBeNull();
    expect(linkSeguro(undefined)).toBeNull();
    expect(linkSeguro('')).toBeNull();
    expect(linkSeguro('   ')).toBeNull();
  });
});

describe('abrirLink', () => {
  let abrir: jest.SpyInstance;

  beforeEach(() => {
    // `mockReset` e não só `restoreAllMocks`: o preset do React Native já
    // entrega `openURL` mockada, então espiar de novo devolve a MESMA função,
    // com o histórico do teste anterior. Sem zerar, o segundo teste vê a
    // chamada do primeiro e acusa falha onde não há.
    abrir = jest.spyOn(Linking, 'openURL');
    abrir.mockReset();
    abrir.mockResolvedValue(true);
  });

  afterEach(() => { jest.restoreAllMocks(); });

  it('abre o que é seguro', async () => {
    await expect(abrirLink('https://arcanus.com.br')).resolves.toBe(true);
    expect(abrir).toHaveBeenCalledWith('https://arcanus.com.br');
  });

  it('não chega a chamar o sistema com esquema recusado', async () => {
    await expect(abrirLink('javascript:alert(1)')).resolves.toBe(false);
    expect(abrir).not.toHaveBeenCalled();
  });

  it('devolve falso quando o sistema recusa, sem estourar', async () => {
    // Quem chama continua mostrando o endereço na tela, então a pessoa ainda
    // consegue copiar; uma exceção aqui derrubaria a aba inteira.
    abrir.mockRejectedValue(new Error('sem navegador'));
    await expect(abrirLink('https://arcanus.com.br')).resolves.toBe(false);
  });
});
