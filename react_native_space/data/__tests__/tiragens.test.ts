import { TIRAGENS, TIRAGEM_PADRAO } from '../tiragens';
import { ARCANOS_MAIORES } from '../tarot';

describe('tiragens', () => {
  it('a Cruz Celta tem as dez posições', () => {
    const cruz = TIRAGENS.find((t) => t.id === 'cruz-celta');
    expect(cruz?.posicoes).toHaveLength(10);
  });

  it('nenhuma tiragem pede mais cartas do que o baralho tem', () => {
    // O defeito que isto pega: acrescentar uma tiragem grande antes dos 56 Menores
    // existirem. O monte acabaria no meio da distribuição e a pessoa ficaria com
    // posições vazias e nenhuma carta para pôr nelas.
    for (const tiragem of TIRAGENS) {
      expect(tiragem.posicoes.length).toBeLessThanOrEqual(ARCANOS_MAIORES.length);
    }
  });

  it('toda posição tem nome e pergunta, e nenhum nome se repete', () => {
    // Nome repetido quebra a leitura de verdade: a Edge Function casa as respostas da
    // IA pelo nome da posição, e duas iguais fariam uma sobrescrever a outra.
    for (const tiragem of TIRAGENS) {
      const nomes = tiragem.posicoes.map((p) => p.nome);
      expect(new Set(nomes).size).toBe(nomes.length);
      for (const posicao of tiragem.posicoes) {
        expect(posicao.nome.trim().length).toBeGreaterThan(0);
        expect(posicao.regra.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('nenhuma pergunta de posição promete o futuro', () => {
    // A tiragem fala de tendência, nunca de certeza — é o que `docs/COMPLIANCE-SCOPE`
    // exige e o que a spec do tarô repete. Uma regra escrita com "vai acontecer"
    // contamina a leitura inteira, porque a IA escreve a partir dela.
    const proibidas = /\bvai (acontecer|dar|ser)\b|\bcerteza\b|\bgarant/i;
    for (const tiragem of TIRAGENS) {
      for (const posicao of tiragem.posicoes) {
        expect(posicao.regra).not.toMatch(proibidas);
      }
    }
  });

  it('a tiragem padrão é uma das oferecidas', () => {
    expect(TIRAGENS).toContain(TIRAGEM_PADRAO);
  });
});

describe('geometria das tiragens', () => {
  it('toda posição diz onde fica', () => {
    for (const tiragem of TIRAGENS) {
      for (const posicao of tiragem.posicoes) {
        expect(Number.isFinite(posicao.lugar.coluna)).toBe(true);
        expect(Number.isFinite(posicao.lugar.linha)).toBe(true);
      }
    }
  });

  it('duas posições nunca ocupam o mesmo lugar', () => {
    // O defeito que isto pega: duas cartas desenhadas uma sobre a outra, impossíveis
    // de escolher separadamente. Aconteceu com "O que atravessa" e "O que vem".
    for (const tiragem of TIRAGENS) {
      const lugares = tiragem.posicoes.map((p) => `${p.lugar.coluna},${p.lugar.linha}`);
      expect(new Set(lugares).size).toBe(lugares.length);
    }
  });

  it('as três cartas ficam numa linha só', () => {
    const tres = TIRAGENS.find((t) => t.id === 'tres-cartas');
    const linhas = new Set(tres?.posicoes.map((p) => p.lugar.linha));
    expect(linhas.size).toBe(1);
  });

  it('a Cruz Celta tem a cruz à esquerda e o bastão numa coluna à direita', () => {
    const cruz = TIRAGENS.find((t) => t.id === 'cruz-celta');
    const posicoes = cruz?.posicoes ?? [];
    const colunaDoBastao = Math.max(...posicoes.map((p) => p.lugar.coluna));
    const bastao = posicoes.filter((p) => p.lugar.coluna === colunaDoBastao);
    expect(bastao).toHaveLength(4);
    // A carta que atravessa fica ao lado da situação, na mesma linha.
    const situacao = posicoes[0];
    const atravessa = posicoes[1];
    expect(atravessa.lugar.linha).toBe(situacao.lugar.linha);
    expect(atravessa.deitada).toBe(true);
  });

  it('as posições-chave declaradas são das quatro válidas', () => {
    const validas = new Set(['agora', 'passado', 'futuro', 'obstaculo']);
    for (const tiragem of TIRAGENS) {
      for (const posicao of tiragem.posicoes) {
        if (posicao.chave) expect(validas.has(posicao.chave)).toBe(true);
      }
    }
  });

  it('a posição que atravessa é um obstáculo, e o passado é passado', () => {
    // É a chave que liga a posição à nota da carta. Sem ela, a nota nunca é usada.
    const cruz = TIRAGENS.find((t) => t.id === 'cruz-celta');
    // As dez, na ordem do array: apagar uma chave de qualquer posição tem de quebrar aqui.
    expect(cruz?.posicoes.map((p) => p.chave)).toEqual([
      'agora', 'obstaculo', undefined, 'passado', undefined, 'futuro',
      undefined, undefined, undefined, undefined,
    ]);
    const tres = TIRAGENS.find((t) => t.id === 'tres-cartas');
    expect(tres?.posicoes.map((p) => p.chave)).toEqual(['passado', 'agora', 'futuro']);
  });

  it('uma posicao-chave nao se repete dentro da mesma tiragem', () => {
    // Duas posicoes com a mesma chave tornariam ambigua a busca da nota da carta.
    for (const tiragem of TIRAGENS) {
      const chaves = tiragem.posicoes.map((p) => p.chave).filter(Boolean);
      expect(new Set(chaves).size).toBe(chaves.length);
    }
  });
});
