import { destinoDaSplash, precisaMandarParaLogin, rotaPublica } from '../portaDeEntrada';

describe('rotaPublica', () => {
  it('a splash decide sozinha e não é barrada', () => {
    expect(rotaPublica(undefined)).toBe(true);
  });

  it('boas-vindas, login, legal, planos e retorno do pagamento ficam abertos', () => {
    for (const raiz of ['welcome', 'auth', 'legal', 'planos', 'pagamento']) {
      expect(rotaPublica(raiz)).toBe(true);
    }
  });

  it('o app por dentro não fica', () => {
    for (const raiz of ['(tabs)', 'consulta', 'numerologia', 'mapa-astral', 'ia', 'lei-atracao', 'manager']) {
      expect(rotaPublica(raiz)).toBe(false);
    }
  });
});

describe('precisaMandarParaLogin', () => {
  it('sem sessão, numa rota interna, manda', () => {
    expect(precisaMandarParaLogin('(tabs)', false, false)).toBe(true);
    expect(precisaMandarParaLogin('manager', false, false)).toBe(true);
  });

  // No primeiro quadro a sessão ainda não chegou e é nula até para quem está
  // logado. Agir aí expulsaria assinante na abertura do app.
  it('enquanto a sessão carrega, não manda ninguém embora', () => {
    expect(precisaMandarParaLogin('(tabs)', false, true)).toBe(false);
  });

  it('com sessão, não manda', () => {
    expect(precisaMandarParaLogin('(tabs)', true, false)).toBe(false);
  });

  it('sem sessão numa rota pública, não manda — senão o login seria inalcançável', () => {
    expect(precisaMandarParaLogin('auth', false, false)).toBe(false);
    expect(precisaMandarParaLogin('welcome', false, false)).toBe(false);
  });
});

describe('destinoDaSplash', () => {
  it('sem sessão vai para as boas-vindas, não para dentro do app', () => {
    expect(destinoDaSplash(false, false)).toBe('/welcome');
  });

  it('com sessão vai para as abas', () => {
    expect(destinoDaSplash(true, false)).toBe('/(tabs)');
  });

  // Quem chega pelo link do e-mail de recuperação tem sessão de recuperação:
  // mandá-lo para as abas faria o link não servir para nada.
  it('recuperação de senha tem precedência', () => {
    expect(destinoDaSplash(true, true)).toBe('/auth/nova-senha');
    expect(destinoDaSplash(false, true)).toBe('/auth/nova-senha');
  });
});
