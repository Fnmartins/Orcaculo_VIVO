import { montarRoteiro } from '../vozLeitura';

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
