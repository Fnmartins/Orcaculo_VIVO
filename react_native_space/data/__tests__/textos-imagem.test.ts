import { readFileSync } from 'fs';
import { join } from 'path';
import { TEXTO_LINHA_DA_VIDA, TEXTO_MAO_DOMINANTE } from '../textos-imagem';

/**
 * O desarme da linha da vida não pode sumir sem alguém perceber.
 *
 * A auditoria de 05/10/2026 achou o único risco real da leitura por imagem: a
 * seção chamada "Linha da vida" existia, o prompt já proibia prognóstico de
 * saúde, e **nada em lugar nenhum dizia que a linha não mede tempo de vida**.
 * Quem lê "traçado curto" conclui sozinho, e o silêncio do app deixa a conclusão
 * de pé.
 *
 * Mesmo motivo do guarda em `lei-atracao.test.ts`: o bloco REGRAS das Edge
 * Functions protege o texto GERADO, e este texto é fixo do app — nunca passa
 * pelo modelo, então a proteção tem de viver aqui, no dado.
 *
 * A última parte lê o TEXTO da Edge Function, porque o `tsc` do app não cobre
 * `supabase/functions/` (roda no Deno, fora do tsconfig) e `conferir-functions`
 * só confere sintaxe. É o mesmo recurso de `__tests__/validade-nas-functions.test.ts`.
 */

const FONTE_ORACULO = readFileSync(
  join(__dirname, '..', '..', 'supabase', 'functions', 'ia-oraculo', 'index.ts'),
  'utf8',
);

describe('a linha da vida não vira tempo de vida', () => {
  it('o texto nega a leitura de duração, com todas as letras', () => {
    // O defeito que isto pega é alguém "enxugar" o aviso e tirar justamente a
    // negação, deixando um texto bonito que não desarma nada.
    expect(TEXTO_LINHA_DA_VIDA).toMatch(/não mede quanto tempo você vive/i);
    expect(TEXTO_LINHA_DA_VIDA).toMatch(/curta ou fina não é vida curta/i);
  });

  it('manda para profissional de saúde em vez de bastar a si mesmo', () => {
    expect(TEXTO_LINHA_DA_VIDA).toMatch(/profissional de saúde/i);
  });

  it('o próprio aviso não afirma nada sobre a saúde de quem lê', () => {
    // Guarda contra o conserto que erra o alvo: um aviso que, ao explicar, passe
    // a dizer o que a linha indica sobre o corpo seria pior que o silêncio.
    expect(TEXTO_LINHA_DA_VIDA).not.toMatch(/doença|diagnóstic|sintoma|prognóstic/i);
  });
});

describe('ler só a mão dominante é escolha declarada', () => {
  it('diz qual mão é lida e que existe outra', () => {
    expect(TEXTO_MAO_DOMINANTE).toMatch(/mão dominante/i);
    expect(TEXTO_MAO_DOMINANTE).toMatch(/a outra mão/i);
  });

  it('assume a escolha em vez de apresentá-la como a regra', () => {
    expect(TEXTO_MAO_DOMINANTE).toMatch(/escolha nossa, não a única/i);
  });
});

describe('o prompt da Edge Function sustenta os mesmos limites', () => {
  it('proíbe ligar a linha da vida a tempo de vida', () => {
    // Cinto e suspensório: o texto do app desarma o leitor, esta instrução
    // impede o modelo de criar o problema antes.
    expect(FONTE_ORACULO).toMatch(/linha da vida NÃO indica quanto tempo a pessoa vive/);
  });

  it('a asa da xícara existe no método, e não só na instrução', () => {
    // A asa é o ponto de referência da tasseografia. Sem a seção, o modelo não
    // tem onde escrever o que viu perto dela, e o eixo volta a se perder.
    expect(FONTE_ORACULO).toContain("'A asa e o que a cerca'");
    expect(FONTE_ORACULO).toMatch(/a asa é o ponto de referência/i);
  });

  it('manda declarar quando a asa não aparece, em vez de inventar a orientação', () => {
    // Sem isto a correção vira um defeito novo: o modelo passaria a afirmar
    // "junto da asa" em foto onde a asa nem aparece.
    expect(FONTE_ORACULO).toMatch(/não invente a orientação/i);
  });
});
