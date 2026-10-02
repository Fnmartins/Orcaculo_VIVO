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
