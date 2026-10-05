import { CATEGORIAS, obterCategoria } from '../lei-atracao';

/**
 * As afirmações não podem prometer o que o app não entrega.
 *
 * A auditoria de 05/10/2026 achou aqui o único risco real dos cinco oráculos revisados.
 * A categoria Saúde dizia "eu me curo em todos os níveis" e "a saúde perfeita é meu
 * estado natural", em primeira pessoa, para quem pode estar doente — junto de um botão
 * de ritual e de um registro de "manifestado". Alguém com diagnóstico sério podia ler
 * aquilo como razão para adiar tratamento. A categoria Prosperidade dizia "eu sou um ímã
 * para riqueza" e "o dinheiro vem até mim", afirmando que a prática traz dinheiro.
 *
 * O bloco REGRAS das Edge Functions já proíbe conselho de saúde e financeiro, e a leitura
 * da IA obedece. Este texto escapava: é fixo no app e nunca passa pelo modelo. Por isso o
 * guarda vive aqui, no dado, e não lá.
 */

/** Juntar tudo numa string por categoria deixa a falha dizer QUAL frase voltou. */
const frasesDe = (id: string) => obterCategoria(id as never).afirmacoes.join(' | ');

describe('as afirmações de saúde não prometem cura', () => {
  it('nenhuma fala em curar, nem em saúde perfeita', () => {
    // O defeito que isto pega é o retorno das frases antigas, por reversão ou por
    // alguém "melhorando" o texto sem saber por que ele é assim.
    const frases = frasesDe('saude');
    expect(frases).not.toMatch(/cur[ao]|curan/i);
    expect(frases).not.toMatch(/saúde perfeita/i);
    expect(frases).not.toMatch(/cada célula/i);
  });

  it('a frase que já estava certa continua lá', () => {
    // Ela é o tom que as outras quatro passaram a seguir: cuidado e escuta, não promessa.
    expect(frasesDe('saude')).toContain('Eu escuto e honro as necessidades do meu corpo.');
  });

  it('abre caminho para pedir ajuda, em vez de bastar a si mesma', () => {
    expect(frasesDe('saude')).toMatch(/peço ajuda quando preciso/i);
  });
});

describe('as afirmações de prosperidade não prometem dinheiro', () => {
  it('nenhuma afirma que o dinheiro vem, nem que a pessoa é um ímã', () => {
    const frases = frasesDe('prosperidade');
    expect(frases).not.toMatch(/ímã|imã/i);
    expect(frases).not.toMatch(/dinheiro vem/i);
    expect(frases).not.toMatch(/riqueza/i);
    expect(frases).not.toMatch(/abundância flui/i);
  });

  it('fala de ação e de escolha, que é o que uma afirmação sustenta', () => {
    expect(frasesDe('prosperidade')).toMatch(/um passo de cada vez/i);
  });
});

describe('o guarda vale para todas as categorias, não só para as duas revisadas', () => {
  it('nenhuma categoria promete cura', () => {
    // Amor, carreira, família e as outras não foram reescritas porque não prometiam
    // nada. Se alguém acrescentar categoria nova com promessa de cura, cai aqui.
    for (const categoria of CATEGORIAS) {
      expect(categoria.afirmacoes.join(' | ')).not.toMatch(/\bcura\b|\bme curo\b/i);
    }
  });

  it('toda categoria tem pelo menos uma afirmação', () => {
    // Guarda contra o conserto preguiçoso: apagar as frases problemáticas e deixar a
    // categoria vazia passaria em todos os testes acima.
    for (const categoria of CATEGORIAS) {
      expect(categoria.afirmacoes.length).toBeGreaterThan(0);
    }
  });
});
