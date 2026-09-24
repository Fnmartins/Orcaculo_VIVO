import { destinoDoAvatar } from '../avatar';

const ID = 'b4c32ce3-0000-4000-8000-000000000001';

describe('destinoDoAvatar', () => {
  it('usa a extensão do tipo que o seletor informou', () => {
    expect(destinoDoAvatar(ID, 'image/png')).toEqual({
      fileName: `avatar_${ID}.png`,
      tipo: 'image/png',
    });
  });

  it('aceita jpeg e heic sem tratamento especial', () => {
    expect(destinoDoAvatar(ID, 'image/jpeg').fileName).toBe(`avatar_${ID}.jpeg`);
    expect(destinoDoAvatar(ID, 'image/heic').fileName).toBe(`avatar_${ID}.heic`);
  });

  it('tipo composto perde o sufixo', () => {
    expect(destinoDoAvatar(ID, 'image/svg+xml').fileName).toBe(`avatar_${ID}.svg`);
  });

  it('sem tipo, assume jpeg', () => {
    expect(destinoDoAvatar(ID)).toEqual({ fileName: `avatar_${ID}.jpeg`, tipo: 'image/jpeg' });
    expect(destinoDoAvatar(ID, '   ').tipo).toBe('image/jpeg');
  });

  // O defeito de origem: na web a URI é `data:image/png;base64,...` e a tela
  // tirava a extensão dela. O nome tem que continuar curto e previsível.
  it('o nome não depende da URI da imagem', () => {
    const { fileName } = destinoDoAvatar(ID, 'image/png');
    expect(fileName).not.toContain('base64');
    expect(fileName.length).toBeLessThan(60);
  });
});
