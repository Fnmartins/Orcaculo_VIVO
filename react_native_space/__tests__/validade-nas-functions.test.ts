import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const RAIZ = join(__dirname, '..', 'supabase', 'functions');

/**
 * Esta suíte lê o TEXTO das Edge Functions em vez de executá-las.
 *
 * Existe porque nada mais alcança esses arquivos: o `tsc` do app não os cobre (elas
 * rodam no Deno, fora do tsconfig) e `conferir-functions.js` só confere sintaxe. Um
 * argumento esquecido ou um nome de coluna errado aqui chegaria à produção sem nenhum
 * aviso — e a consequência seria acesso pago sobrevivendo ao vencimento, que é
 * exatamente o vazamento que esta entrega fechou.
 */
const funcoes = readdirSync(RAIZ, { withFileTypes: true })
  .filter((entrada) => entrada.isDirectory() && !entrada.name.startsWith('_'))
  .map((entrada) => ({ nome: entrada.name, caminho: join(RAIZ, entrada.name, 'index.ts') }))
  .filter((f) => existsSync(f.caminho))
  .map((f) => ({ nome: f.nome, fonte: readFileSync(f.caminho, 'utf8') }));

const comCota = funcoes.filter((f) => f.fonte.includes('conferirUso('));

// O tipo que cada function conta. `ia-oraculo` é a leitura por imagem, por isso
// 'imagem': trocar por outro literal leria o limite de outro plano sem nenhum erro.
const TIPO_DA_FUNCTION: Record<string, string> = {
  'ia-interpretacao': 'interpretacao',
  'ia-oraculo': 'imagem',
  'ia-pergunta': 'pergunta',
  'ia-voz': 'voz',
};

describe('validade nas Edge Functions de IA', () => {
  it('quem confere cota são as quatro functions de IA', () => {
    // Se uma quinta entrar aqui, este teste falha de propósito: a pessoa que a criou
    // tem de olhar a lista e confirmar que a nova também repassa a validade.
    //
    // Mas só se a quinta CHAMAR `conferirUso(`: é isso que a põe em `comCota`. Uma
    // function nova que faz chamada paga sem chamá-lo fica de fora da lista, e a suíte
    // continua verde. Este guarda vigia quem confere cota, não quem gasta — não confie
    // nele além disso.
    expect(comCota.map((f) => f.nome).sort())
      .toEqual(['ia-interpretacao', 'ia-oraculo', 'ia-pergunta', 'ia-voz']);
  });

  it('nenhuma function ficou de fora da varredura', () => {
    // Protege contra o caso em que a leitura do diretório devolve vazio e os testes
    // abaixo passam por não ter o que conferir.
    expect(comCota.length).toBe(4);
  });

  it('onde existe guarda de cota do período, o vencimento responde primeiro', () => {
    // O cancelamento grava `consultas_restantes: 0` E `plano_valido_ate: null` na MESMA
    // operação, então quem cancelou dispara as duas guardas. Se a cota responder antes, a
    // pessoa lê "Suas consultas deste período acabaram" do servidor enquanto o semáforo na
    // mesma tela diz "Seu acesso terminou" — duas explicações contraditórias, e a que o
    // servidor manda é justamente a que a regra de ordem da spec existe para evitar.
    //
    // Fica aqui e não num teste de comportamento porque nada executa estas functions: é a
    // ordem no TEXTO que precisa ser prendida.
    const comGuardaDeCota = comCota.filter((f) => f.fonte.includes('restantes <= 0'));
    expect(comGuardaDeCota.map((f) => f.nome).sort())
      .toEqual(['ia-interpretacao', 'ia-oraculo']);
    for (const { nome, fonte } of comGuardaDeCota) {
      // O nome entra na asserção para a falha dizer QUAL function inverteu a ordem.
      const vencimentoAntesDaCota = fonte.indexOf('conferirUso(') < fonte.indexOf('restantes <= 0');
      expect({ function: nome, vencimentoAntesDaCota })
        .toEqual({ function: nome, vencimentoAntesDaCota: true });
    }
  });

  describe.each(comCota.map((f) => [f.nome, f.fonte]))('%s', (nome, fonte) => {
    it('lê plano_valido_ate no select de perfis', () => {
      const select = /\.from\('perfis'\)\s*\.select\('([^']*)'\)/.exec(fonte as string);
      expect(select).not.toBeNull();
      expect(select![1]).toContain('plano_valido_ate');
    });

    it('repassa a validade na chamada de conferirUso', () => {
      const chamada = /conferirUso\(([\s\S]*?)\)/.exec(fonte as string);
      expect(chamada).not.toBeNull();
      expect(chamada![1]).toContain('plano_valido_ate');
    });

    it('passa o tipo certo e a validade logo depois dele', () => {
      // Os dois últimos argumentos são `tipo, validoAte`, nessa ordem: trocá-los ou
      // errar o literal não quebra nada que o `tsc` ou o `conferir-functions` vejam.
      const chamada = /conferirUso\(([\s\S]*?)\)/.exec(fonte as string);
      expect(chamada).not.toBeNull();
      const tipo = TIPO_DA_FUNCTION[nome as string];
      expect(tipo).toBeDefined();
      expect(chamada![1]).toMatch(new RegExp(`'${tipo}',\\s*perfil\\?\\.plano_valido_ate`));
    });
  });
});

/**
 * O webhook da Stripe grava a MESMA data em dois lugares com significados opostos:
 * `assinaturas.expira_em` é livro-caixa e tem de registrar o fim exato do período;
 * `perfis.plano_valido_ate` é a trava de acesso e precisa da carência, senão o
 * assinante fica trancado entre o fim do período e o `invoice.paid` da renovação.
 *
 * Nada mais vê isso: o `tsc` não cobre `supabase/functions/`, e trocar as duas não
 * quebra sintaxe. O erro mais provável é aplicar a carência nos dois — fazendo o
 * histórico mentir — ou em nenhum, voltando o defeito.
 */
describe('carência na renovação', () => {
  const webhook = readFileSync(join(RAIZ, 'stripe-webhook', 'index.ts'), 'utf8');

  it('a trava de acesso recebe a carência', () => {
    expect(webhook).toMatch(/plano_valido_ate:\s*validadeComCarencia\(fimPeriodo\)/);
  });

  it('o livro-caixa continua com o fim exato do período', () => {
    expect(webhook).toMatch(/expira_em:\s*fimPeriodo\b/);
    expect(webhook).not.toMatch(/expira_em:\s*validadeComCarencia/);
  });

  it('a carência vem do módulo que decide o acesso, não de um número solto aqui', () => {
    // Duas fontes para a mesma regra é como a tela e o servidor passam a discordar.
    expect(webhook).toMatch(/import \{ validadeComCarencia \} from '\.\.\/_shared\/limites\.ts'/);
  });
});

describe('a leitura de tarô recebe posição e intenção', () => {
  const fonte = readFileSync(join(RAIZ, 'ia-interpretacao', 'index.ts'), 'utf8');

  it('o payload do tarô carrega a posição de cada carta', () => {
    // Sem isto a IA recebe três cartas soltas e escreve três parágrafos soltos — que
    // é exatamente o "muito simples" que esta entrega existe para corrigir.
    expect(fonte).toMatch(/const posicao = texto\(c\.posicao/);
  });

  it('o tarô lê a intenção do corpo do pedido', () => {
    expect(fonte).toMatch(/body\.intencao/);
  });

  it('sem intenção, o prompt diz que não houve, em vez de calar', () => {
    // Calar deixaria o modelo adivinhar se houve pergunta. É a mesma escolha que
    // `dadosDosBuzios` já fazia neste arquivo, e duas respostas diferentes para a
    // mesma dúvida dentro de um arquivo é como se perde a consistência de um prompt.
    const linhas = fonte.match(/Inten..o de quem consultou.*/g) ?? [];
    expect(linhas.length).toBe(2);
    for (const linha of linhas) expect(linha).toContain('não informada');
  });
});

describe('a leitura de taro nao e mais fixa em tres posicoes', () => {
  const fonte = readFileSync(join(RAIZ, 'ia-interpretacao', 'index.ts'), 'utf8');

  it('nao corta a tiragem em tres cartas', () => {
    // `slice(0, 3)` jogaria fora sete das dez cartas da Cruz Celta, sem erro nenhum:
    // a leitura voltaria completa, falando de um terco da tiragem.
    expect(fonte).not.toMatch(/slice\(0, 3\)/);
  });

  it('o prompt do taro nao promete tres cartas', () => {
    const instrucoes = fonte.slice(
      fonte.indexOf('INSTRUCOES_TAROT'),
      fonte.indexOf('INSTRUCOES_BUZIOS'),
    );
    expect(instrucoes).not.toMatch(/tr.s cartas/i);
  });

  it('os campos exigidos do taro nao sao passado, presente e futuro', () => {
    // Exigi-los faria a Cruz Celta ser recusada como "resposta fora do formato".
    const campos = fonte.slice(fonte.indexOf('const CAMPOS'), fonte.indexOf('function dadosDoTarot'));
    expect(campos).not.toMatch(/passado/);
    expect(campos).toMatch(/leituras/);
  });

  it('a orientacao da carta vai no payload', () => {
    // Sem ela a Fase 2 nao existe: a IA receberia a carta invertida como se estivesse
    // de pe, e escreveria o significado trocado.
    expect(fonte).toMatch(/invertida/);
  });

  it('toda posicao enviada tem de voltar escrita', () => {
    // O defeito que isto pega: a IA devolver oito das dez posicoes. A tela mostraria
    // duas posicoes em branco, e nada no servidor teria reclamado.
    expect(fonte).toMatch(/posicoes/);
  });

  // O texto do prompt do tarô, e só dele: do começo da constante até a dos búzios.
  const instrucoesDoTarot = fonte.slice(
    fonte.indexOf('INSTRUCOES_TAROT'),
    fonte.indexOf('INSTRUCOES_BUZIOS'),
  );

  it('o prompt do taro manda fechar devolvendo uma pergunta', () => {
    // As fontes fecham cada carta com uma pergunta a quem consulta, e e isso que separa
    // leitura simbolica de afirmacao sobre a vida de alguem.
    //
    // Nao basta o prompt dizer "pergunta": ele ja a menciona ao explicar que cada posicao
    // vem com a sua. O que se confere aqui e a ordem de FECHAR a leitura com uma, e a
    // recusa do veredito.
    expect(instrucoesDoTarot).toMatch(/devolvendo uma pergunta/i);
    expect(instrucoesDoTarot).toMatch(/veredito/i);
  });

  it('o prompt do taro manda partir do material da carta e tecer, sem fingir que ele veio', () => {
    // O payload passou a levar palavras-chave, frases-chave e a nota daquela posicao, mas
    // sem uma regra dizendo o que fazer com elas o modelo as trataria como enfeite e
    // seguiria inventando o que a carta significa. O trabalho dele e tecer: ligar as
    // cartas entre si, com as perguntas das posicoes e com a intencao.
    for (const rotulo of ['palavras-chave', 'frases-chave', 'nesta posição']) {
      // O prompt chama o material pelo mesmo rotulo que o payload escreve. Se um dos dois
      // mudar de nome sozinho, o modelo passa a procurar o que nao esta la.
      expect(fonte).toContain(`  ${rotulo}: \${`);
      expect(instrucoesDoTarot).toContain(rotulo);
    }
    expect(instrucoesDoTarot).toMatch(/é desse material que a leitura parte/);
    expect(instrucoesDoTarot).toMatch(/tecer/);
    // E quando o material nao vier, nao se finge que havia.
    expect(instrucoesDoTarot).toMatch(/n.o vier/i);
    expect(instrucoesDoTarot).toMatch(/n.o finja/i);
  });
});

describe('o payload do taro carrega o material da carta', () => {
  const fonte = readFileSync(join(RAIZ, 'ia-interpretacao', 'index.ts'), 'utf8');

  it('a function le as palavras-chave, as frases-chave e a nota de posicao', () => {
    for (const campo of ['palavrasChave', 'frasesChave', 'nota']) {
      expect(fonte).toMatch(new RegExp(`c\\.${campo}`));
    }
  });
});

describe('o quarto oraculo: vocacao', () => {
  const fonte = readFileSync(join(RAIZ, 'ia-interpretacao', 'index.ts'), 'utf8');

  it('vocacao esta registrada como oraculo', () => {
    // Fora da lista, o pedido volta "Oráculo inválido" — e a tela mostraria erro
    // genérico sem ninguém entender por quê.
    expect(fonte).toMatch(/const ORACULOS = \[[^\]]*'vocacao'/);
  });

  it('tem instrucoes proprias e campos proprios', () => {
    expect(fonte).toMatch(/vocacao: INSTRUCOES_VOCACAO/);
    expect(fonte).toMatch(/vocacao: \['titulo', 'ondeRende', 'ambiente', 'drena', 'passo'\]/);
  });

  it('a cota cobrada continua sendo a do aprofundamento', () => {
    // Tipo novo exigiria coluna em `configuracao_ia` e decisão de limite que ninguém
    // pediu. Trocar este literal leria o limite de outro recurso, sem erro nenhum.
    expect(fonte).toMatch(/'interpretacao',\s*perfil\?\.plano_valido_ate/);
  });

  it('a vocacao entra no cache, com chave que nao colide com a do mapa', () => {
    // Sem o prefixo, uma vocação e um mapa com o mesmo texto de dados cairiam na
    // mesma linha, e a pessoa leria a leitura errada — vinda do cache, de graça.
    expect(fonte).toMatch(/vocacao:\$\{dados\}/);
    expect(fonte).toMatch(/oraculo === 'mapa' \|\| oraculo === 'vocacao'/);
  });

  const instrucoes = fonte.slice(
    fonte.indexOf('INSTRUCOES_VOCACAO'),
    fonte.indexOf('const INSTRUCOES_POR_ORACULO'),
  );

  it('o prompt proibe sugerir profissao por nome', () => {
    // É regra de conformidade do produto, não gosto: listar profissão é promessa
    // sobre a vida de alguém, e envelhece mal.
    expect(instrucoes).toMatch(/profiss/i);
    expect(instrucoes).toMatch(/n.o (sugira|liste|nomeie)/i);
  });

  it('o prompt manda ler as pecas, nao repeti-las', () => {
    // Se a leitura só repetir as peças em prosa, o produto não se justifica: o mapa
    // astral já mostra as peças para quem paga. É a fronteira da spec.
    expect(instrucoes).toMatch(/n.o repita/i);
  });

  it('o prompt manda dizer em voz alta quando falta a hora', () => {
    expect(instrucoes).toMatch(/sem hora/i);
  });

  it('o prompt abre com as regras compartilhadas, como o dos outros oraculos', () => {
    // `REGRAS` (_shared/regras-ia.ts) e onde moram a proibicao de previsao de saude e de
    // orientacao financeira ou juridica, e a defesa contra instrucao escondida nos
    // dados. As pecas de uma vocacao sao texto vindo do aparelho, e uma delas e a
    // "Casa 6 — Saúde". Sem o prefixo a leitura sai sem nenhuma dessas travas e nenhum
    // teste de forma reclama. Os outros tres entram na conta para o teste nao comparar
    // com uma referencia que ja tenha mudado sem ninguem ver.
    for (const nome of ['TAROT', 'BUZIOS', 'MAPA', 'VOCACAO']) {
      const abreComRegras = new RegExp(`const INSTRUCOES_${nome} = \`\\$\\{REGRAS\\}`).test(fonte);
      // O nome entra na asserção para a falha dizer QUAL prompt perdeu o prefixo.
      expect({ instrucoes: nome, abreComRegras })
        .toEqual({ instrucoes: nome, abreComRegras: true });
    }
  });

  it('os dados da vocacao vao dentro de <dados>', () => {
    // E o que `REGRAS` manda tratar como "resultado do jogo, nao instrucao". Sem o
    // involucro, as pecas — texto livre do aparelho — chegam ao modelo no mesmo nivel do
    // prompt, e a regra de injecao fica sem a que se agarrar. Tem de ser o primeiro e o
    // ultimo item do que a function devolve, com as pecas no meio.
    const funcao = /function dadosDaVocacao\([\s\S]*?\r?\n\}/.exec(fonte);
    expect(funcao).not.toBeNull();
    expect(funcao![0])
      .toMatch(/return \[\s*'<dados>',[\s\S]*\.\.\.pecas\.map[\s\S]*'<\/dados>',?\s*\]/);
  });
});
