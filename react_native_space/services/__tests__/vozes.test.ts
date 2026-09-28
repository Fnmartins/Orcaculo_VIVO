// `services/supabase.ts` puxa AsyncStorage, que não existe no Jest. Mockar aqui
// é a convenção dos outros testes de serviço deste diretório.
jest.mock('../supabase', () => ({ supabase: { from: jest.fn(), storage: { from: jest.fn() } } }));

// eslint-disable-next-line import/first
import { lerNomeDoArquivo, resumirGeral, resumirVotos, type VotoVoz } from '../vozes';

/**
 * As duas peças com lógica de verdade em `services/vozes.ts`. O resto do
 * arquivo é ida ao Supabase, que não se testa sem servidor.
 */

describe('lerNomeDoArquivo', () => {
  it('separa marca e nome pela convenção do script', () => {
    expect(lerNomeDoArquivo('google-Aoede.mp3')).toEqual({
      id: 'google-Aoede', marca: 'Google', nome: 'Aoede',
    });
    expect(lerNomeDoArquivo('openai-nova.mp3')).toEqual({
      id: 'openai-nova', marca: 'OpenAI', nome: 'nova',
    });
  });

  it('mantém o nome inteiro quando ele tem hífen', () => {
    // Corta no primeiro hífen, não no último: a marca é o prefixo.
    expect(lerNomeDoArquivo('google-Zubenelgenubi-2.mp3')?.nome).toBe('Zubenelgenubi-2');
  });

  it('deixa passar marca desconhecida com o nome que tem', () => {
    // Um fornecedor novo não pode sumir da lista só por não estar no dicionário.
    expect(lerNomeDoArquivo('eleven-Rachel.mp3')).toEqual({
      id: 'eleven-Rachel', marca: 'eleven', nome: 'Rachel',
    });
  });

  it('ignora o que não é amostra', () => {
    expect(lerNomeDoArquivo('leia-me.txt')).toBeNull();
    expect(lerNomeDoArquivo('.emptyFolderPlaceholder')).toBeNull();
    expect(lerNomeDoArquivo('semtraco.mp3')).toBeNull();
    expect(lerNomeDoArquivo('-comecando-com-traco.mp3')).toBeNull();
    expect(lerNomeDoArquivo('terminando-.mp3')).toBeNull();
  });
});

const voto = (voz: string, usuario_id: string, nota: number, autor_nome = usuario_id): VotoVoz =>
  ({ voz, usuario_id, autor_nome, nota });

describe('resumirVotos', () => {
  it('tira a média por voz', () => {
    const resumo = resumirVotos([
      voto('google-Aoede', 'u1', 5),
      voto('google-Aoede', 'u2', 4),
    ]);
    expect(resumo[0].voz).toBe('google-Aoede');
    expect(resumo[0].media).toBe(4.5);
    expect(resumo[0].quantos).toBe(2);
  });

  it('carrega os votos individuais, para a tela mostrar nome por nome', () => {
    const resumo = resumirVotos([
      voto('x', 'u2', 3, 'Marcio'),
      voto('x', 'u1', 5, 'Fabiano'),
    ]);
    expect(resumo[0].votos.map((v) => `${v.autor_nome} ${v.nota}`)).toEqual(['Fabiano 5', 'Marcio 3']);
  });

  it('quem mais gente ouviu vem primeiro, mesmo com média menor', () => {
    // A regra que importa numa decisão a dois: cinco estrelas de uma pessoa só
    // não vale mais que quatro das duas. Uma voz com um voto é sugestão, não
    // candidata — e era isso que o pódio invertia antes.
    const resumo = resumirVotos([
      voto('so-um-ouviu', 'u1', 5),
      voto('os-dois-ouviram', 'u1', 4),
      voto('os-dois-ouviram', 'u2', 4),
    ]);
    expect(resumo.map((r) => r.voz)).toEqual(['os-dois-ouviram', 'so-um-ouviu']);
  });

  it('com a mesma quantidade de votos, a média decide', () => {
    const resumo = resumirVotos([
      voto('pior', 'u1', 2), voto('pior', 'u2', 2),
      voto('melhor', 'u1', 5), voto('melhor', 'u2', 4),
    ]);
    expect(resumo.map((r) => r.voz)).toEqual(['melhor', 'pior']);
  });

  it('sem voto nenhum, devolve lista vazia em vez de estourar', () => {
    expect(resumirVotos([])).toEqual([]);
  });
});

describe('resumirGeral', () => {
  it('conta quantas vozes cada pessoa pontuou', () => {
    const geral = resumirGeral([
      voto('a', 'u1', 5, 'Fabiano'),
      voto('b', 'u1', 4, 'Fabiano'),
      voto('a', 'u2', 3, 'Marcio'),
    ], 41);
    expect(geral.porPessoa).toEqual([
      { usuario_id: 'u1', nome: 'Fabiano', quantas: 2 },
      { usuario_id: 'u2', nome: 'Marcio', quantas: 1 },
    ]);
    expect(geral.totalVotado).toBe(41);
  });

  it('diz em quantas vozes todo mundo já votou', () => {
    // É este número que responde "dá para fechar a decisão?".
    const geral = resumirGeral([
      voto('a', 'u1', 5), voto('a', 'u2', 4),
      voto('b', 'u1', 3),
    ], 41);
    expect(geral.ouvidasPorTodos).toBe(1);
  });

  it('com uma pessoa só, tudo que ela votou conta como ouvido por todos', () => {
    const geral = resumirGeral([voto('a', 'u1', 5), voto('b', 'u1', 4)], 41);
    expect(geral.ouvidasPorTodos).toBe(2);
  });

  it('sem voto nenhum não divide por zero', () => {
    expect(resumirGeral([], 41)).toEqual({ porPessoa: [], ouvidasPorTodos: 0, totalVotado: 41 });
  });

  it('voto antigo sem nome gravado chega com o nome vazio, não inventado', () => {
    // Quem desenha a tela é que escolhe o rótulo ("o outro"); o serviço não
    // pode fingir que sabe de quem é o voto.
    const geral = resumirGeral([{ voz: 'a', usuario_id: 'u9', autor_nome: '', nota: 4 }], 41);
    expect(geral.porPessoa[0].nome).toBe('');
  });
});
