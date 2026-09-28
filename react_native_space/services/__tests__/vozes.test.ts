// `services/supabase.ts` puxa AsyncStorage, que não existe no Jest. Mockar aqui
// é a convenção dos outros testes de serviço deste diretório.
jest.mock('../supabase', () => ({ supabase: { from: jest.fn(), storage: { from: jest.fn() } } }));

// eslint-disable-next-line import/first
import { lerNomeDoArquivo, resumirVotos, type VotoVoz } from '../vozes';

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

describe('resumirVotos', () => {
  const voto = (voz: string, usuario_id: string, nota: number): VotoVoz =>
    ({ voz, usuario_id, nota });

  it('tira a média por voz', () => {
    const resumo = resumirVotos([
      voto('google-Aoede', 'u1', 5),
      voto('google-Aoede', 'u2', 4),
    ]);
    expect(resumo[0]).toEqual({ voz: 'google-Aoede', media: 4.5, quantos: 2 });
  });

  it('ordena da maior média para a menor', () => {
    const resumo = resumirVotos([
      voto('a', 'u1', 2),
      voto('b', 'u1', 5),
      voto('c', 'u1', 3),
    ]);
    expect(resumo.map((r) => r.voz)).toEqual(['b', 'c', 'a']);
  });

  it('empate de média desempata por quantidade', () => {
    // Quatro estrelas de duas pessoas valem mais que quatro de uma só: as duas
    // concordaram, e é isso que a decisão procura.
    const resumo = resumirVotos([
      voto('uma-pessoa', 'u1', 4),
      voto('duas-pessoas', 'u1', 4),
      voto('duas-pessoas', 'u2', 4),
    ]);
    expect(resumo.map((r) => r.voz)).toEqual(['duas-pessoas', 'uma-pessoa']);
  });

  it('sem voto nenhum, devolve lista vazia em vez de estourar', () => {
    expect(resumirVotos([])).toEqual([]);
  });
});
