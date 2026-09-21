import {
  exigirEscrita,
  exigirLinhaAtualizada,
} from '../../supabase/functions/_shared/escritas';

describe('exigirEscrita', () => {
  it('passa quando o banco não reclamou', () => {
    expect(() => exigirEscrita('perfis.update', { error: null, data: [{ id: 'u1' }] })).not.toThrow();
  });

  it('lança com o rótulo e a mensagem do banco', () => {
    expect(() => exigirEscrita('perfis.update', { error: { message: 'permission denied' } }))
      .toThrow('perfis.update: permission denied');
  });

  it('lança mesmo quando o erro não traz message', () => {
    expect(() => exigirEscrita('assinaturas.update', { error: { code: '42501' } }))
      .toThrow('assinaturas.update');
  });
});

describe('exigirLinhaAtualizada', () => {
  it('aceita exatamente uma linha', () => {
    expect(() => exigirLinhaAtualizada('perfis.update', { error: null, data: [{ id: 'u1' }] }))
      .not.toThrow();
  });

  it('recusa zero linhas: o update não encontrou o perfil', () => {
    expect(() => exigirLinhaAtualizada('perfis.update', { error: null, data: [] }))
      .toThrow('esperava atualizar 1 linha, afetou 0');
  });

  it('recusa data ausente', () => {
    expect(() => exigirLinhaAtualizada('perfis.update', { error: null }))
      .toThrow('afetou 0');
  });

  it('recusa mais de uma linha', () => {
    expect(() => exigirLinhaAtualizada('perfis.update', { error: null, data: [{ id: 'a' }, { id: 'b' }] }))
      .toThrow('afetou 2');
  });

  it('reporta o erro do banco antes de olhar a contagem', () => {
    expect(() => exigirLinhaAtualizada('perfis.update', { error: { message: 'timeout' }, data: [] }))
      .toThrow('perfis.update: timeout');
  });
});
