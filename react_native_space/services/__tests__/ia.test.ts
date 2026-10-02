const mockInvoke = jest.fn();

// `services/supabase.ts` puxa AsyncStorage, que não existe no Jest. Mockar aqui
// é a convenção dos outros testes de serviço deste diretório.
// O `jest.mock` é içado para cima do `const` acima, junto com o `import` — então
// a fábrica não pode LER o mock, só chamá-lo depois. Daí a função no meio: sem
// ela, `invoke` fica indefinido e o teste falha por um motivo que não é o dele.
jest.mock('../supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

// eslint-disable-next-line import/first
import { gerarInterpretacaoMapa, gerarInterpretacaoTarot, type InterpretacaoMapa } from '../ia';

/**
 * Este teste existe por causa de um defeito que ficou um dia inteiro no ar sem
 * ninguém ver.
 *
 * A Edge Function gerava as quatro áreas da vida e até se recusava a responder
 * sem elas. O tipo as declarava. A tela as renderizava. E o mapeador daqui
 * montava o objeto de retorno campo por campo, sem copiá-las — então elas
 * chegavam do servidor e morriam aqui. A tela esconde bloco sem texto, então não
 * houve erro, não houve log, não houve nada: só quatro seções que nunca
 * apareceram.
 *
 * A lição não é "lembre de copiar o campo". É que montar objeto campo por campo
 * falha em silêncio, e por isso precisa de um teste que percorra os campos.
 */

const RESPOSTA_COMPLETA = {
  titulo: 'Fogo que organiza',
  narrativa: 'Cinco frases sobre a combinação desta pessoa.',
  forca: 'O que essa combinação faz bem.',
  tensao: 'Onde ela puxa para dois lados.',
  conselho: 'Uma prática concreta.',
  amor: 'Casa 7 em Libra, regida por Vênus na casa 3.',
  trabalho: 'Meio do céu em Capricórnio, Saturno na casa 4.',
  dinheiro: 'Casa 2 sem planeta dentro, regida por Vênus.',
  caminho: 'Sol na casa 5, Júpiter na 7.',
};

const mapaMinimo = {
  sol: { signo: 'Leão', grau: 5 },
  lua: { signo: 'Áries', grau: 5 },
  planetas: [],
  elementoDominante: 'Fogo',
  qualidadeDominante: 'Fixo',
};

beforeEach(() => mockInvoke.mockReset());

describe('gerarInterpretacaoMapa', () => {
  it('entrega TODOS os campos que a function devolve', async () => {
    mockInvoke.mockResolvedValue({ data: RESPOSTA_COMPLETA, error: null });

    const lida = await gerarInterpretacaoMapa(mapaMinimo);

    // Campo por campo, pelas chaves da resposta: um campo novo na function que o
    // mapeador esqueça de copiar derruba este teste em vez de desaparecer.
    for (const [campo, valor] of Object.entries(RESPOSTA_COMPLETA)) {
      expect(lida[campo as keyof InterpretacaoMapa]).toBe(valor);
    }
  });

  it('as quatro áreas da vida chegam à tela', async () => {
    // O defeito de 28/09, nomeado: eram exatamente estas quatro que caíam.
    mockInvoke.mockResolvedValue({ data: RESPOSTA_COMPLETA, error: null });

    const lida = await gerarInterpretacaoMapa(mapaMinimo);

    expect(lida.amor).toBeTruthy();
    expect(lida.trabalho).toBeTruthy();
    expect(lida.dinheiro).toBeTruthy();
    expect(lida.caminho).toBeTruthy();
  });

  it('leitura guardada antes das áreas continua abrindo', async () => {
    // Uma resposta sem os campos novos não pode virar erro: a tela esconde o
    // bloco vazio e mostra o resto.
    const {
      amor: _amor, trabalho: _trabalho, dinheiro: _dinheiro, caminho: _caminho, ...antiga
    } = RESPOSTA_COMPLETA;
    mockInvoke.mockResolvedValue({ data: antiga, error: null });

    const lida = await gerarInterpretacaoMapa(mapaMinimo);

    expect(lida.titulo).toBe(RESPOSTA_COMPLETA.titulo);
    expect(lida.amor).toBeUndefined();
  });

  it('manda as áreas para o servidor junto do mapa', async () => {
    mockInvoke.mockResolvedValue({ data: RESPOSTA_COMPLETA, error: null });

    await gerarInterpretacaoMapa({
      ...mapaMinimo,
      areas: [{ id: 'amor', titulo: 'Amor', comCasas: true, pecas: ['Casa 7: começa em Libra'] }],
    });

    const enviado = mockInvoke.mock.calls[0][1].body;
    expect(enviado.oraculo).toBe('mapa');
    expect(enviado.mapa.areas[0].pecas).toEqual(['Casa 7: começa em Libra']);
  });

  it('recusa resposta sem título ou narrativa, em vez de mostrar vazio', async () => {
    mockInvoke.mockResolvedValue({ data: { titulo: 'Só o título' }, error: null });
    await expect(gerarInterpretacaoMapa(mapaMinimo)).rejects.toThrow(/incompleta/i);
  });
});

const TAROT_COMPLETO = {
  titulo: 'A torre que ainda não caiu',
  narrativa: 'Cinco frases sobre as três cartas juntas.',
  passado: 'O que já se consumou.',
  presente: 'O que está em jogo.',
  futuro: 'O que tende a se formar.',
  conselho: 'Uma prática concreta.',
};

const TRES_CARTAS = [
  { nome: 'XVI - A Torre', posicao: 'Passado', significado: 'Ruptura.' },
  { nome: 'I - O Mago', posicao: 'Presente', significado: 'Poder pessoal.' },
  { nome: 'XIX - O Sol', posicao: 'Futuro', significado: 'Clareza.' },
];

describe('gerarInterpretacaoTarot', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('manda a intenção escrita junto das cartas', async () => {
    // A intenção é o que diferencia esta leitura de três parágrafos soltos. Se ela
    // parar no caminho, a tela continua funcionando e ninguém percebe a perda.
    mockInvoke.mockResolvedValue({ data: TAROT_COMPLETO, error: null });

    await gerarInterpretacaoTarot(TRES_CARTAS, 'devo aceitar a proposta');

    const enviado = mockInvoke.mock.calls[0][1].body;
    expect(enviado.oraculo).toBe('tarot');
    expect(enviado.intencao).toBe('devo aceitar a proposta');
    expect(enviado.cartas[0].posicao).toBe('Passado');
  });

  it('sem intenção, manda string vazia e não inventa uma', async () => {
    mockInvoke.mockResolvedValue({ data: TAROT_COMPLETO, error: null });

    await gerarInterpretacaoTarot(TRES_CARTAS);

    expect(mockInvoke.mock.calls[0][1].body.intencao).toBe('');
  });
});
