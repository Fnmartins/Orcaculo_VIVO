import fs from 'fs';
import path from 'path';
import {
  FRASES_CRISE,
  LIMITE_PERGUNTA,
  normalizar,
  podeEnviar,
  podeGuardar,
  triar,
} from '../perguntas';

describe('normalizar', () => {
  it('tira acento, caixa e espaço sobrando', () => {
    expect(normalizar('  NÃO   Aguento  Mais ')).toBe('nao aguento mais');
  });
});

describe('triar', () => {
  it('pergunta comum passa', () => {
    expect(triar('o que essa carta pede de mim?')).toEqual({ tipo: 'ok' });
  });

  it('campo vazio não sai do aparelho', () => {
    expect(triar('   ')).toEqual({ tipo: 'vazia' });
  });

  it('texto colado acima do limite é recusado', () => {
    expect(triar('a'.repeat(LIMITE_PERGUNTA + 1))).toEqual({ tipo: 'longa' });
  });

  it('crise é reconhecida com acento, sem acento e em caixa alta', () => {
    expect(triar('não quero mais viver assim').tipo).toBe('crise');
    expect(triar('NAO QUERO MAIS VIVER').tipo).toBe('crise');
    expect(triar('ando pensando em suicídio').tipo).toBe('crise');
  });

  it('crise vence o limite de tamanho, senão o telefone não aparece', () => {
    const longa = `${'contexto '.repeat(60)} eu quero morrer`;
    expect(longa.length).toBeGreaterThan(LIMITE_PERGUNTA);
    expect(triar(longa).tipo).toBe('crise');
  });

  it('não confunde quem está bem', () => {
    // "matar" sozinho não entra na lista justamente por isto.
    expect(triar('vou matar a saudade dele nesta viagem').tipo).toBe('ok');
    expect(triar('corações partidos voltam a bater?').tipo).toBe('ok');
    expect(triar('meu processo criativo está travado').tipo).toBe('fora');
  });

  it('saúde, jurídico e financeiro saem marcados por assunto', () => {
    expect(triar('o exame vai dar tudo bem?')).toEqual({ tipo: 'fora', assunto: 'saude' });
    expect(triar('vou ganhar a audiência?')).toEqual({ tipo: 'fora', assunto: 'juridico' });
    expect(triar('devo investir em bitcoin?')).toEqual({ tipo: 'fora', assunto: 'financeiro' });
  });
});

describe('o que pode sair e o que pode ficar', () => {
  it('crise não vai ao modelo e não é guardada', () => {
    const t = triar('quero morrer');
    expect(podeEnviar(t)).toBe(false);
    expect(podeGuardar(t)).toBe(false);
  });

  it('assunto fora do escopo é respondido, mas nunca guardado', () => {
    const t = triar('o que o exame vai dizer?');
    expect(podeEnviar(t)).toBe(true);
    expect(podeGuardar(t)).toBe(false);
  });

  it('pergunta comum pode as duas coisas', () => {
    const t = triar('o que eu não estou querendo ver?');
    expect(podeEnviar(t)).toBe(true);
    expect(podeGuardar(t)).toBe(true);
  });
});

describe('a lista de crise do cliente e a do servidor', () => {
  // São dois arquivos porque são dois runtimes, e o servidor não pode confiar
  // no cliente. Divergir em silêncio é o risco; este teste é o que impede.
  it('têm exatamente as mesmas frases, na mesma ordem', () => {
    const arquivo = path.join(
      __dirname, '..', '..', 'supabase', 'functions', '_shared', 'triagem.ts',
    );
    const fonte = fs.readFileSync(arquivo, 'utf8');
    const bloco = /export const FRASES_CRISE = \[([\s\S]*?)\];/.exec(fonte);
    expect(bloco).not.toBeNull();
    const doServidor = Array.from(bloco![1].matchAll(/'([^']+)'/g), (m) => m[1]);
    expect(doServidor).toEqual(FRASES_CRISE);
  });
});
