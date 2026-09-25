import { descartarImagem, guardarImagem, obterImagem } from '../imagemCache';

const URI = 'data:image/jpeg;base64,AAAA';

describe('imagemCache', () => {
  it('devolve a imagem guardada pela chave', () => {
    const id = guardarImagem(URI, 'AAAA');
    expect(obterImagem(id)).toEqual({ uri: URI, base64: 'AAAA' });
  });

  // A chave viaja na URL: precisa ser curta, senão o problema volta.
  it('a chave é curta e não carrega a imagem dentro', () => {
    const id = guardarImagem(URI, 'A'.repeat(50000));
    expect(id.length).toBeLessThan(40);
    expect(id).not.toContain('base64');
  });

  it('duas fotos não colidem', () => {
    const a = guardarImagem('data:image/png;base64,AA', 'AA');
    const b = guardarImagem('data:image/png;base64,BB', 'BB');
    expect(a).not.toBe(b);
    expect(obterImagem(a)?.base64).toBe('AA');
    expect(obterImagem(b)?.base64).toBe('BB');
  });

  it('chave desconhecida devolve nulo em vez de quebrar', () => {
    expect(obterImagem('img_inexistente')).toBeNull();
    expect(obterImagem('')).toBeNull();
  });

  it('descartar remove', () => {
    const id = guardarImagem(URI, 'AAAA');
    descartarImagem(id);
    expect(obterImagem(id)).toBeNull();
  });

  // É memória de app: guardar sem limite seria vazamento a cada leitura.
  it('mantém só as últimas, e a mais recente sempre está lá', () => {
    const ids = Array.from({ length: 6 }, (_, i) => guardarImagem(`u${i}`, `b${i}`));
    const vivas = ids.filter((id) => obterImagem(id) !== null);
    expect(vivas.length).toBeLessThanOrEqual(3);
    expect(obterImagem(ids[ids.length - 1])?.base64).toBe('b5');
  });
});
