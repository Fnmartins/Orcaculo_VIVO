import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Lê o TEXTO da `ia-interpretacao`, como `validade-nas-functions.test.ts`: a function
 * roda no Deno, fora do Jest e do tsc do app, e nada mais a alcança antes da produção.
 *
 * O que se vigia aqui é a leitura de taróloga: um campo `resposta` que responde à
 * pergunta, e a triagem que impede essa resposta direta de virar conselho de saúde,
 * de processo ou de dinheiro — ou de chegar a alguém em crise como leitura de cartas.
 */
const fonte = readFileSync(
  join(__dirname, '..', 'supabase', 'functions', 'ia-interpretacao', 'index.ts'),
  'utf8',
);

const instrucoesDoTarot = (() => {
  const inicio = fonte.indexOf('const INSTRUCOES_TAROT');
  const fim = fonte.indexOf('const INSTRUCOES_BUZIOS');
  return fonte.slice(inicio, fim);
})();

describe('a leitura de taróloga na ia-interpretacao', () => {
  it('o tarô pede e exige o campo resposta', () => {
    expect(instrucoesDoTarot).toContain('"resposta"');
    expect(fonte).toMatch(/tarot:\s*\[[^\]]*'resposta'/);
  });

  it('as regras que não se quebram continuam valendo para o tarô', () => {
    expect(instrucoesDoTarot).toContain('${REGRAS}');
  });

  it('a pergunta de volta fica nas posições, e a resposta responde', () => {
    // Antes a regra de devolver pergunta valia para a leitura inteira, e "mudo de
    // emprego?" saía sem resposta nenhuma. Agora ela fica carta a carta, como nas fontes,
    // e a mesa inteira responde em "resposta".
    expect(instrucoesDoTarot).toMatch(/Feche cada posição em "leituras" devolvendo uma pergunta/);
    expect(instrucoesDoTarot).not.toContain('nunca afirma o que vai acontecer com ela, nem decide por ela');
  });

  it('a intenção passa pela mesma triagem da ia-pergunta', () => {
    expect(fonte).toMatch(/import \{[^}]*\btriar\b[^}]*\} from '\.\.\/_shared\/triagem\.ts'/);
    expect(fonte).toMatch(/AVISO_FORA\[/);
  });

  it('crise responde antes de conferir cota: não gasta consulta nem chama a IA', () => {
    const crise = fonte.indexOf("tipo === 'crise'");
    expect(crise).toBeGreaterThan(-1);
    expect(crise).toBeLessThan(fonte.indexOf('conferirUso('));
    expect(crise).toBeLessThan(fonte.indexOf('anthropic.messages.create'));
  });
});
