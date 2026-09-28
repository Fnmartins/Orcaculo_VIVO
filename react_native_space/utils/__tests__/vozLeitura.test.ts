import { dividirEmPartes, montarRoteiro, vozDisponivel } from '../vozLeitura';

describe('dividirEmPartes', () => {
  // Existe por uma limitação do Safari do iPhone: fala longa é cortada depois
  // de alguns segundos. Picar e enfileirar reinicia o relógio dele.
  it('texto curto sai inteiro, num pedaço só', () => {
    expect(dividirEmPartes('Uma frase curta.')).toEqual(['Uma frase curta.']);
  });

  it('corta em fim de frase, e nenhum pedaço passa do limite', () => {
    const texto = 'Frase de tamanho razoável aqui. '.repeat(20);
    const partes = dividirEmPartes(texto, 120);
    expect(partes.length).toBeGreaterThan(1);
    for (const p of partes) expect(p.length).toBeLessThanOrEqual(120);
  });

  it('não corta no meio de uma palavra, mesmo sem pontuação', () => {
    const texto = 'palavra '.repeat(60).trim();
    for (const p of dividirEmPartes(texto, 100)) {
      expect(p.startsWith('palavra')).toBe(true);
      expect(p.endsWith('palavra')).toBe(true);
    }
  });

  it('junta os pedaços de volta no texto original', () => {
    const texto = 'Primeira frase. Segunda frase um pouco maior. Terceira e última.';
    expect(dividirEmPartes(texto, 30).join(' ')).toBe(texto);
  });
});

describe('montarRoteiro', () => {
  it('junta as partes e fala o rótulo antes do texto', () => {
    expect(montarRoteiro([
      { texto: 'Ejilaxeborá.' },
      { rotulo: 'Conselho', texto: 'Escute antes de responder.' },
    ])).toBe('Ejilaxeborá.\n\nConselho. Escute antes de responder.');
  });

  it('pula parte vazia, em vez de falar o rótulo sozinho', () => {
    expect(montarRoteiro([
      { texto: 'Uma coisa.' },
      { rotulo: 'Tensão', texto: '   ' },
      { texto: 'Outra.' },
    ])).toBe('Uma coisa.\n\nOutra.');
  });

  // O motivo de existir esta função: "21° 24′" falado como símbolo vira
  // "vinte e um grau vinte e quatro linha", que não é português.
  it('lê grau e minuto como medida, não como símbolo', () => {
    expect(montarRoteiro([{ texto: '21° 24′ de Câncer' }]))
      .toBe('21 graus e 24 minutos de Câncer');
    expect(montarRoteiro([{ texto: 'Marte a 3°' }])).toBe('Marte a 3 graus');
  });

  it('diz "retrógrado" em vez do símbolo', () => {
    expect(montarRoteiro([{ texto: 'Júpiter em Aquário ℞' }]))
      .toContain('retrógrado');
  });

  it('troca os símbolos do céu por palavra e descarta emoji', () => {
    const roteiro = montarRoteiro([{ texto: '☀ Seu Sol 🔮 e ☾ a Lua' }]);
    expect(roteiro).toContain('Sol');
    expect(roteiro).toContain('Lua');
    expect(roteiro).not.toContain('🔮');
    expect(roteiro).not.toContain('☀');
  });

  it('lista vazia devolve texto vazio, e quem chama decide não falar', () => {
    expect(montarRoteiro([])).toBe('');
  });
});

describe('vozDisponivel', () => {
  it('sem síntese de voz no ambiente, devolve falso', () => {
    // No Jest não existe speechSynthesis: é o mesmo caso de um navegador velho,
    // e aí o botão de ouvir some em vez de não fazer nada.
    expect(vozDisponivel()).toBe(false);
  });
});
