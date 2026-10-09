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
    //
    // A `ia-interpretacao` deixou de comparar `restantes` com zero: quem decide é
    // `decidirCobranca`, que aceita o crédito avulso no lugar da cota. Mudou o TEXTO da
    // guarda, não a regra que este teste prende — por isso a âncora é uma por function.
    const GUARDA_DE_COTA: Record<string, string> = {
      'ia-interpretacao': 'if (!cobranca.permitido) {',
      'ia-oraculo': 'restantes <= 0',
    };
    const guardaDe = (nome: string) => GUARDA_DE_COTA[nome] ?? 'restantes <= 0';
    const comGuardaDeCota = comCota.filter((f) => f.fonte.includes(guardaDe(f.nome)));
    expect(comGuardaDeCota.map((f) => f.nome).sort())
      .toEqual(['ia-interpretacao', 'ia-oraculo']);
    for (const { nome, fonte } of comGuardaDeCota) {
      // O nome entra na asserção para a falha dizer QUAL function inverteu a ordem.
      const vencimentoAntesDaCota = fonte.indexOf('conferirUso(') < fonte.indexOf(guardaDe(nome));
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
  // Os trechos abaixo atravessam linhas. A árvore de quem usa Windows é CRLF e o índice
  // é LF: normalizar aqui evita um `\r?` em cada expressão.
  const lf = fonte.replace(/\r\n/g, '\n');

  it('vocacao esta registrada como oraculo', () => {
    // Fora da lista, o pedido volta "Oráculo inválido" — e a tela mostraria erro
    // genérico sem ninguém entender por quê.
    expect(fonte).toMatch(/const ORACULOS = \[[^\]]*'vocacao'/);
  });

  it('tem instrucoes proprias e campos proprios', () => {
    expect(fonte).toMatch(/vocacao: INSTRUCOES_VOCACAO/);
    expect(fonte).toMatch(/vocacao: \['titulo', 'ondeRende', 'ambiente', 'drena', 'passo'\]/);
  });

  it('a cota cobrada e a do aprofundamento, nos tres pontos que a usam', () => {
    // Tipo novo exigiria coluna em `configuracao_ia` e decisão de limite que ninguém
    // pediu. Cada ponto é conferido com a lista de argumentos INTEIRA e o literal solto:
    // um ternário como `oraculo === 'vocacao' ? 'vocacao' : 'interpretacao'` deixaria o
    // literal na lista, e o teste genérico (`passa o tipo certo...`) o aceitava.
    //
    // `registrarUso` é o que alimenta a aba Custo. Errar o tipo ali põe o gasto da
    // vocação na linha de outro recurso, sem erro nenhum — e é a única medição que o dono
    // tem do que cada leitura custa.
    expect(lf).toMatch(
      /conferirUso\(\s*supabaseAdmin, usuarioId, plano, semLimite, 'interpretacao',\s*perfil\?\.plano_valido_ate as string \| null,\s*\)/,
    );
    expect(lf).toMatch(/registrarUso\(supabaseAdmin, usuarioId, 'interpretacao', oraculo, \{/);
    expect(lf).toMatch(/mensagemDoLimite\(veredito, 'interpretacao'\)/);
    // Um ponto só de cada: uma segunda chamada, em outro ramo, poderia cobrar outro tipo.
    for (const chamada of [/conferirUso\(/g, /registrarUso\(/g, /mensagemDoLimite\(/g]) {
      expect({ chamada: String(chamada), vezes: lf.match(chamada)?.length })
        .toEqual({ chamada: String(chamada), vezes: 1 });
    }
  });

  it('o despacho manda a vocacao para dadosDaVocacao e deixa o mapa como o resto', () => {
    // Sem a linha, uma vocação cai em `dadosDoMapa`: um 400 "Mapa sem posição do Sol" que
    // ninguém entende — ou, se vier um mapa junto, um mapa lido no lugar da vocação.
    expect(lf).toMatch(
      /\} else if \(oraculo === 'buzios'\) dados = dadosDosBuzios\(body\);\n\s*else if \(oraculo === 'vocacao'\) dados = dadosDaVocacao\(body\);\n\s*else dados = dadosDoMapa\(body\);/,
    );
  });

  it('a chave do mapa segue sendo a de antes e a da vocacao leva o prefixo', () => {
    // Sem o prefixo, uma vocação e um mapa com o mesmo texto de dados cairiam na mesma
    // linha, e a pessoa leria a leitura errada — vinda do cache, de graça.
    //
    // Cada expressão é ancorada no ramo dela, e inteira. Invertidas, o MAPA passaria a
    // ser prefixado: toda leitura de mapa já guardada ficaria órfã de uma vez, e todo
    // mundo pagaria outra. É o desastre que o comentário ao lado do código descreve.
    expect(lf).toMatch(/if \(oraculo === 'mapa'\) \{\n\s*chave = await chaveDoMapa\(dados\);\n/);
    expect(lf).toMatch(
      /if \(oraculo === 'vocacao'\) \{\n(?:\s*\/\/[^\n]*\n)*\s*chave = await chaveDoMapa\(`vocacao:\$\{dados\}`\);\n/,
    );
    // Só essas duas: uma terceira geraria uma chave que nenhum dos ramos lê.
    expect(lf.match(/await chaveDoMapa\(/g)?.length).toBe(2);
  });

  it('chaveDoMapa continua exatamente como era', () => {
    // Mexer no corpo dela muda o hash de TODA leitura de mapa já guardada. O prefixo da
    // vocação mora fora dela justamente para isto não acontecer.
    const inicio = lf.indexOf('async function chaveDoMapa');
    expect(inicio).toBeGreaterThan(-1);
    const corpo = lf.slice(inicio, lf.indexOf('\n}\n', inicio) + 3);
    expect(corpo).toBe([
      'async function chaveDoMapa(dados: string): Promise<string> {',
      '  const bytes = new TextEncoder().encode(`${VERSAO_FORMATO}\\n${dados}`);',
      "  const resumo = await crypto.subtle.digest('SHA-256', bytes);",
      '  return Array.from(new Uint8Array(resumo))',
      "    .map((b) => b.toString(16).padStart(2, '0'))",
      "    .join('');",
      '}',
      '',
    ].join('\n'));
  });

  it('a vocacao e guardada depois de gerada, e so quando ha chave', () => {
    // Sem a vocação neste par ela leria o cache mas nunca escreveria nele: cada abertura
    // seria uma chamada paga ao modelo. O espelho (fora do ramo de leitura) é pego pelo
    // teste da chave, acima.
    expect(lf).toMatch(
      /if \(\(oraculo === 'mapa' \|\| oraculo === 'vocacao'\) && chave\) \{\n\s*const \{ error: erroGuardar \} = await supabaseAdmin\n\s*\.from\('interpretacoes_mapa'\)\.insert\(\{ chave, conteudo: interpretacao \}\);/,
    );
  });

  it('o mapa le o cache antes do veredito e a vocacao so depois dele e da cota do periodo', () => {
    // A chave da vocação é grossa (signos e graus de poucas peças), então o acerto entre
    // pessoas diferentes é comum. Antes do veredito, uma leitura guardada iria de graça
    // a quem está com o plano vencido — e esta leitura é para quem paga.
    //
    // Depois da cota do período também: o acerto não custa nada, e a chave é grossa, então
    // quem tem plano válido e cota gasta continuaria recebendo, sem limite, as leituras que
    // outras pessoas deixaram guardadas. Barrar só pela metade é o pior resultado possível.
    //
    // O mapa fica ANTES: reabrir um mapa não custa nada e não entra no limite do dia, e
    // mudar isso é regressão. A ordem é o que reverte em silêncio numa edição futura.
    // O veredito deixou de barrar sozinho em `vencido` e `limite_dia` (o crédito avulso
    // passa por eles); o que sobrou como portão próprio é a guarda que lista o que o
    // crédito contorna e olha `recursoLigado`.
    const veredito = lf.indexOf(
      'if (!veredito.permitido && (!vereditoContornavel || !veredito.recursoLigado)) {',
    );
    const cota = lf.indexOf('if (!cobranca.permitido) {');
    const lerMapa = lf.indexOf("if (oraculo === 'mapa') {");
    const lerVocacao = lf.indexOf("if (oraculo === 'vocacao') {");
    expect(veredito).toBeGreaterThan(-1);
    expect(lerMapa).toBeGreaterThan(-1);
    expect(lerVocacao).toBeGreaterThan(-1);
    expect(cota).toBeGreaterThan(veredito);
    expect(lerMapa).toBeLessThan(lf.indexOf('conferirUso('));
    expect(lerVocacao).toBeGreaterThan(veredito);
    expect(lerVocacao).toBeGreaterThan(cota);
    // E antes do modelo: depois dele não seria cache, seria só um registro.
    expect(lerVocacao).toBeLessThan(lf.indexOf('anthropic.messages.create'));
  });

  it('o acerto de cache da vocacao nao desconta consulta nem conta no dia', () => {
    // Passar pelo veredito e pela cota do período são os portões. O acerto devolve a
    // leitura guardada sem custar chamada, sem baixar `consultas_restantes` e sem somar
    // em `uso_ia`.
    const bloco = /\n  if \(oraculo === 'vocacao'\) \{[\s\S]*?\n  \}\n/.exec(lf);
    expect(bloco).not.toBeNull();
    expect(bloco![0]).toMatch(/doCache: true/);
    for (const proibido of ['restantes', 'registrarUso', 'exigirEscrita', 'anthropic']) {
      expect({ proibido, aparece: bloco![0].includes(proibido) })
        .toEqual({ proibido, aparece: false });
    }
  });

  const instrucoes = lf.slice(
    lf.indexOf('INSTRUCOES_VOCACAO'),
    lf.indexOf('const INSTRUCOES_POR_ORACULO'),
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

  it('sem pecas nao ha leitura: o pedido volta 400 antes do cache e do modelo', () => {
    // Sem a guarda, peças vazias chegariam ao modelo e a leitura genérica seria GUARDADA
    // sob a chave das peças vazias — e entregue a todo mundo que mandar peças vazias.
    const funcao = /function dadosDaVocacao\([\s\S]*?\n\}/.exec(lf);
    expect(funcao).not.toBeNull();
    // A guarda tem de vir antes do `return`: depois dele seria código morto.
    expect(funcao![0]).toMatch(/if \(pecas\.length === 0\) throw new Error\('[^']+'\);[\s\S]*return \[/);
    // O `throw` só vira 400 porque o despacho está num try cujo catch devolve 400, e
    // isso acontece antes de qualquer leitura de cache.
    expect(lf).toMatch(
      /\} catch \(erro\) \{\n\s*return resposta\(\{ erro: erro instanceof Error \? erro\.message : 'Dados incompletos' \}, 400\);/,
    );
    expect(lf.indexOf('dadosDaVocacao(body)')).toBeLessThan(lf.indexOf("if (oraculo === 'mapa') {"));
  });

  it('o prompt fecha como os outros tres: so o objeto JSON, com o esqueleto', () => {
    // `validarResultado` tira cerca de código, mas não tira texto antes do JSON: um
    // preâmbulo custa uma chamada gasta, um 502 e nada guardado. A frase é a dos irmãos,
    // palavra por palavra, e o esqueleto lista os mesmos cinco campos de `CAMPOS`.
    expect(instrucoes).toContain(
      'Responda SOMENTE com um objeto JSON, sem cercas de código e sem texto antes ou depois:',
    );
    expect(instrucoes).toMatch(
      /depois:\n\{"titulo": "[^"]+", "ondeRende": "[^"]+", "ambiente": "[^"]+", "drena": "[^"]+", "passo": "[^"]+"\}`;\n*$/,
    );
    expect(instrucoes).not.toMatch(/Responda em JSON/);
  });
});

/**
 * O defeito que a revisão final pegou, já no ar.
 *
 * Sem hora de nascimento não chegam casas, nem meio do céu, nem o regente da 10 — só
 * Saturno, Marte e os aspectos. Mesmo assim o prompt abria dizendo que recebia tudo, e
 * exigia `ambiente` "da casa 6 e de onde o regente mora": as DUAS fontes ausentes. Como
 * `ambiente` é campo obrigatório em CAMPOS, a resposta sem ele vira 502 — ou seja, o
 * modelo era empurrado a inventar uma seção inteira, e "não sei a hora" é opção de
 * primeira classe no formulário.
 */
describe('a vocacao sem hora nao manda inventar', () => {
  const fonte = readFileSync(join(RAIZ, 'ia-interpretacao', 'index.ts'), 'utf8');
  const instrucoes = fonte.slice(
    fonte.indexOf('INSTRUCOES_VOCACAO'),
    fonte.indexOf('const INSTRUCOES_POR_ORACULO'),
  );

  it('a abertura nao promete pecas que podem nao vir', () => {
    // "Recebe as peças já calculadas: o meio do céu, a casa 10..." era falso sem hora.
    expect(instrucoes).toMatch(/que podem ser menos/i);
    expect(instrucoes).toMatch(/n.o existe nesta leitura/i);
  });

  it('o caso sem hora diz o que fazer em CADA secao, e nao so numa', () => {
    // A versão anterior falava só de `ondeRende` e deixava `ambiente` — obrigatório e
    // sem fonte nenhuma — por conta do modelo.
    const semHora = instrucoes.slice(instrucoes.indexOf('SEM HORA DE NASCIMENTO'));
    expect(semHora).toMatch(/em "ondeRende"/);
    expect(semHora).toMatch(/em "ambiente"/);
  });

  it('proibe nomear a casa 6 e o regente quando eles nao vieram', () => {
    // É a frase que separa "entregar menos avisando" de "inventar o que não veio".
    expect(instrucoes).toMatch(/NUNCA da casa 6/);
    expect(instrucoes).toMatch(/nunca de onde o regente mora/);
    expect(instrucoes).toMatch(/N.o nomeie, em nenhuma se..o, uma casa que n.o esteja nos dados/);
  });
});

/**
 * Os planetas do ofício e a casa 2 no prompt.
 *
 * O payload passou a levar Mercúrio, Vênus e a casa 2. Material que chega sem o prompt
 * saber o que fazer com ele vira enfeite: o modelo o ignora e escreve do mesmo jeito de
 * antes. É o mesmo defeito que a Task 5 do tarô corrigiu, noutro oráculo.
 */
describe('o prompt da vocacao sabe o que fazer com os planetas do oficio', () => {
  const fonte = readFileSync(join(RAIZ, 'ia-interpretacao', 'index.ts'), 'utf8');
  const instrucoes = fonte.slice(
    fonte.indexOf('INSTRUCOES_VOCACAO'),
    fonte.indexOf('const INSTRUCOES_POR_ORACULO'),
  );

  it('a abertura nomeia os tres que entraram', () => {
    for (const peca of ['a casa 2', 'Mercúrio', 'Vênus']) {
      expect(instrucoes).toContain(peca);
    }
  });

  it('"ondeRende" recebe os tres como fonte, e nao so como enfeite', () => {
    const campo = instrucoes.slice(
      instrucoes.indexOf('- "ondeRende"'),
      instrucoes.indexOf('- "ambiente"'),
    );
    expect(campo).toMatch(/Mercúrio/);
    expect(campo).toMatch(/Vênus/);
    expect(campo).toMatch(/casa 2/);
  });

  it('sem hora, o prompt conta com os quatro planetas, e nao com dois', () => {
    // Sem casas a leitura vive dos planetas. Deixar a frase falando só de Saturno e
    // Marte desperdiçaria os dois que acabaram de entrar, justo no caso mais magro.
    const semHora = instrucoes.slice(instrucoes.indexOf('SEM HORA DE NASCIMENTO'));
    expect(semHora).toMatch(/Mercúrio, Vênus, Saturno e Marte/);
  });
});

/**
 * Custo por ORÁCULO, e não só por tipo de cota.
 *
 * A aba Custo sabia dizer o preço médio de uma "interpretação", mas quatro produtos
 * diferentes caem nesse tipo e custam valores bem diferentes — uma Cruz Celta manda
 * dez cartas com material, um Mapa dos Arcanos manda uma data reduzida a números. Sem
 * o corte por produto não dá para pensar em preço avulso por item.
 *
 * A medição vai para `consumo_ia`, tabela separada. NÃO entra em `uso_ia`: aquela é a
 * tabela da cota, lida com `maybeSingle()` por (usuário, dia, tipo), e dividi-la por
 * oráculo faria a leitura ver uma linha de várias, afrouxando o limite diário sem erro
 * nenhum aparecer.
 */
describe('a medicao de custo separa por oraculo sem tocar na cota', () => {
  const uso = readFileSync(join(RAIZ, '_shared', 'uso.ts'), 'utf8');

  it('registrarUso grava na tabela de medicao', () => {
    expect(uso).toMatch(/from\('consumo_ia'\)\s*\.insert\(/);
    expect(uso).toMatch(/oraculo,/);
  });

  it('a cota continua indo para contar_uso_ia, intacta', () => {
    // O defeito que isto pega: alguém "simplificar" trocando a RPC por um insert na
    // tabela nova. A cota deixaria de ser contada e o limite diário sumiria.
    expect(uso).toMatch(/rpc\('contar_uso_ia', \{/);
    expect(uso).toMatch(/p_tipo: tipo,/);
  });

  it('a tabela da cota NAO ganhou coluna de oraculo', () => {
    // É a regra que protege o limite diário. Se alguém puser o oráculo em `uso_ia`,
    // `conferirUso` passa a ler uma linha de várias.
    expect(uso).not.toMatch(/from\('uso_ia'\)[\s\S]{0,200}oraculo/);
  });

  it('falhar a medicao nao derruba a leitura: so loga', () => {
    // A cota já foi contada e a pessoa já tem o texto na tela. Perder uma linha de
    // medição custa um ponto no gráfico; lançar aqui custaria a leitura dela.
    const trecho = uso.slice(uso.indexOf("from('consumo_ia')"));
    expect(trecho).toMatch(/console\.error\('falha ao medir consumo por oraculo'/);
    expect(trecho).not.toMatch(/throw/);
  });

  it('as quatro functions dizem QUAL produto gerou a chamada', () => {
    // A de interpretação passa a variável `oraculo`, porque são quatro produtos num
    // tipo só. As outras três têm produto fixo e passam o literal. Um literal na de
    // interpretação juntaria tarô, búzios, mapa e vocação na mesma conta.
    const esperado: Record<string, RegExp> = {
      'ia-interpretacao': /registrarUso\([^)]*'interpretacao', oraculo,/,
      'ia-oraculo': /registrarUso\([^)]*'imagem', 'imagem',/,
      'ia-pergunta': /registrarUso\([^)]*'pergunta', 'pergunta',/,
      'ia-voz': /registrarUso\([^)]*'voz', 'voz',/,
    };
    for (const [nome, padrao] of Object.entries(esperado)) {
      const fonte = readFileSync(join(RAIZ, nome, 'index.ts'), 'utf8');
      expect({ function: nome, passa: padrao.test(fonte) })
        .toEqual({ function: nome, passa: true });
    }
  });
});


describe('o webhook separa assinatura de compra avulsa', () => {
  const webhook = funcoes.find((f) => f.nome === 'stripe-webhook')!.fonte;
  // Só o trecho do ramo avulso até o próximo `case`. `expira_em` e `23505` já existem em
  // outros pontos do arquivo (o livro-caixa das assinaturas e o dedupe de eventos), então
  // conferir o arquivo inteiro deixaria os testes abaixo verdes antes de o ramo existir —
  // verdes pelo motivo errado, que é como um ramo apagado passaria sem ninguém ver.
  const ramoAvulso = webhook.slice(
    webhook.indexOf("session.mode === 'payment'"),
    webhook.indexOf("case 'invoice.paid'"),
  );

  it('ramifica por `session.mode` antes de ativar plano', () => {
    // Sem esta ramificação, uma compra avulsa cairia no caminho da assinatura e
    // ativaria um plano que ninguém pagou.
    expect(webhook).toMatch(/session\.mode === 'payment'/);
  });

  it('o ramo avulso vem ANTES da recusa por falta de assinatura', () => {
    // Só presença não basta: a sessão avulsa não tem `plano_id` nem `subscription`, então
    // se o ramo ficasse depois do `return resposta(400)` do caminho de assinatura, ela seria
    // recusada antes de chegar nele — e a pessoa pagaria sem ganhar nada.
    const ramo = webhook.indexOf("session.mode === 'payment'");
    const recusa = webhook.indexOf('!session.subscription');
    expect(ramo).toBeGreaterThan(-1);
    expect(recusa).toBeGreaterThan(-1);
    expect(ramo).toBeLessThan(recusa);
  });

  it('grava a sessão, que é o que torna o webhook idempotente', () => {
    // O Stripe repete a entrega. A garantia é o UNIQUE no banco, e para ele
    // valer a coluna precisa ser gravada.
    expect(ramoAvulso).toContain('stripe_session_id');
  });

  it('grava validade, e não deixa o crédito aberto para sempre', () => {
    expect(ramoAvulso).toContain('expira_em');
  });

  it('trata violacao de UNIQUE como reentrega, e nao como defeito', () => {
    // 23505 é unique_violation. Sem esta distinção, toda reentrega do Stripe
    // gritaria no log, e o log de erro deixaria de significar alguma coisa.
    //
    // Confere a COMPARAÇÃO, e não só o número: o comentário do ramo também cita 23505,
    // então `toContain` continuaria verde com o código apagado.
    expect(ramoAvulso).toMatch(/\.code\s*!==\s*'23505'/);
  });

  it('não credita antes de o pagamento confirmar', () => {
    // Pix e boleto chegam como `completed` com `payment_status` != 'paid'.
    const guarda = ramoAvulso.indexOf("session.payment_status !== 'paid'");
    expect(guarda).toBeGreaterThan(-1);
    // E a guarda vem ANTES da gravação: depois do insert ela não impediria crédito nenhum.
    const gravacao = ramoAvulso.indexOf("from('compras_avulsas')");
    expect(gravacao).toBeGreaterThan(-1);
    expect(guarda).toBeLessThan(gravacao);
  });

  it('a guarda do pagamento interrompe de fato, e não só avisa', () => {
    // Sem o `break`, a execução seguiria para o insert: o aviso no log seria o
    // único sinal de que creditamos antes de receber. A posição da guarda sozinha
    // não prova nada — o que importa é ela cortar o caminho.
    const guarda = webhook.indexOf("session.payment_status !== 'paid'");
    const gravacao = webhook.indexOf("from('compras_avulsas')");
    expect(guarda).toBeGreaterThan(-1);
    expect(gravacao).toBeGreaterThan(guarda);
    const trecho = webhook.slice(guarda, gravacao);
    expect(trecho).toContain('break;');
    // E o `break` tem de ser o DESTE bloco. Só `toContain` aceitaria o `break` de outro
    // ramo que caísse no recorte (a checagem de metadata, se alguém a pusesse depois da
    // guarda), e a guarda sem o seu continuaria verde. `[^}]*` impede de cruzar o `}` que
    // fecha o bloco da guarda.
    expect(trecho).toMatch(/^session\.payment_status !== 'paid'\) \{[^}]*\bbreak;/);
  });

  it('uma falha de gravação sobe para o catch, em vez de virar 200', () => {
    // Devolver 200 faria o Stripe não repetir a entrega e deixaria o dedupe gravado: quem
    // pagou ficaria sem a leitura, com uma linha de log como único rastro. Lançar manda o
    // erro ao `catch` do webhook, que libera o dedupe e responde 500 para o Stripe repetir.
    // Repetir é seguro porque o UNIQUE transforma a segunda gravação em 23505.
    expect(ramoAvulso).toMatch(/throw new Error\(`falha ao registrar compra avulsa/);
    expect(ramoAvulso).not.toMatch(/console\.error\('falha ao registrar/);
  });
});

describe('o checkout avulso vende só o que tem preço', () => {
  const avulso = funcoes.find((f) => f.nome === 'criar-checkout-avulso')!.fonte;

  it('é compra, e não assinatura', () => {
    // `subscription` aqui ativaria um plano recorrente por uma venda única.
    expect(avulso).toContain("mode: 'payment'");
    expect(avulso).not.toContain("mode: 'subscription'");
  });

  it('a lista de vendáveis é fechada no código, e não vem do pedido', () => {
    // Um oráculo chegando pelo corpo da requisição viraria venda de algo sem preço.
    expect(avulso).toContain("VENDAVEIS = ['mapa', 'vocacao']");
  });

  it('devolve `checkoutUrl`, o mesmo nome da function irmã', () => {
    // `services/stripe.ts` lê `checkoutUrl`. Devolver `url` faria quem copiasse
    // o serviço existente receber `undefined`, sem erro de compilação.
    expect(avulso).toContain('checkoutUrl: session.url');
  });

  it('aborta em erro de leitura do perfil ANTES de criar cliente na Stripe', () => {
    // `perfil` nulo por falha e `perfil` nulo por não haver cliente são
    // indistinguíveis, e o segundo caminho cria cliente. Inverter duplica cliente.
    expect(avulso.indexOf('erroPerfil')).toBeLessThan(avulso.indexOf('customers.create'));
    // A linha acima sozinha passa mesmo se o `if` for apagado: a primeira ocorrência de
    // `erroPerfil` é a desestruturação, que sempre vem antes. O que impede o cliente
    // duplicado é o `if` que devolve a resposta, e é ele que se confere aqui.
    const guarda = avulso.indexOf('if (erroPerfil)');
    expect(guarda).toBeGreaterThan(-1);
    expect(guarda).toBeLessThan(avulso.indexOf('customers.create'));
  });

  it('aceita só cartão, até alguém tratar a confirmação tardia', () => {
    // Pix e boleto chegam como `completed` sem estar pagos, e o evento que
    // confirma o pagamento não é tratado: a pessoa pagaria sem receber.
    expect(avulso).toContain("payment_method_types: ['card']");
  });

  it('não aceita cupom, até alguém conferir o total zero em modo de teste', () => {
    // Um cupom de 100% pode fazer a sessão chegar com `payment_status` diferente de
    // 'paid', e a guarda do webhook barraria quem usou o cupom: pagou (ou quase) e não
    // recebe. A linha veio copiada do molde de assinatura, e é por esse caminho que ela
    // volta: quem copiar o molde de novo a traz junto.
    expect(avulso).not.toContain('allow_promotion_codes');
  });
});

describe('o credito avulso entra na interpretacao sem furar o cache', () => {
  const interp = funcoes.find((f) => f.nome === 'ia-interpretacao')!.fonte;
  // Os trechos de várias linhas abaixo usam esta cópia: a árvore de quem usa Windows
  // é CRLF e o índice é LF.
  const lf = interp.replace(/\r\n/g, '\n');

  it('o credito é lido ANTES da decisão de cobrança', () => {
    expect(interp).toContain('creditoDisponivel(');
    expect(interp).toContain('decidirCobranca(');
    expect(interp.indexOf('creditoDisponivel(')).toBeLessThan(interp.indexOf('decidirCobranca('));
  });

  it('o credito é reivindicado ANTES de gerar, e nao depois', () => {
    // Depois seria verificar-depois-agir: dois cliques simultâneos gerariam os
    // dois, e só o segundo `update` falharia — duas leituras por uma compra.
    //
    // O `-1` precisa ser barrado de propósito: `indexOf` devolve -1 quando a chamada
    // não existe, e -1 é menor que qualquer posição. Sem esta linha o teste passaria
    // com a reivindicação apagada.
    expect(interp.indexOf('reivindicarCredito(')).toBeGreaterThan(-1);
    expect(interp.indexOf('reivindicarCredito('))
      .toBeLessThan(interp.indexOf('anthropic.messages.create'));
  });

  it('o retorno do cache não passa por reivindicarCredito', () => {
    // Os dois `return` de cache estão acima do ponto de reivindicação. Se a
    // reivindicação subisse para antes deles, uma releitura comeria a compra.
    expect(interp.indexOf('reivindicarCredito(')).toBeGreaterThan(interp.indexOf('doCache: true'));
  });

  it('os DOIS retornos de cache ficam acima da reivindicação, e não só o do mapa', () => {
    // `indexOf('doCache: true')` acha o do MAPA, que é o primeiro. Uma reivindicação
    // posta entre o cache do mapa e o da vocação passaria no teste acima — e ainda
    // assim comeria a compra de quem reabre uma vocação já guardada, que é o caso que
    // a spec manda prender primeiro. O 2 também é de propósito: um terceiro retorno de
    // cache pede que alguém olhe esta ordem de novo.
    expect(lf.match(/doCache: true/g)?.length).toBe(2);
    expect(interp.indexOf('reivindicarCredito(')).toBeGreaterThan(interp.lastIndexOf('doCache: true'));
  });

  it('a geração que falha devolve o crédito', () => {
    // Sem isto, um 502 da Anthropic faria a pessoa perder o que pagou.
    expect(interp).toContain('devolverCredito(');
  });

  it('falha ao LER o crédito não vira "sem acesso"', () => {
    // `erro` e `nao_tem` são estados diferentes: tratar os dois igual mandaria
    // quem já comprou comprar de novo, e nada impede a segunda compra.
    expect(interp).toContain("estado === 'erro'");
  });

  it('a falha de leitura responde 503 e vem ANTES da guarda de cota', () => {
    // Depois da guarda, quem teve a leitura falhando já teria levado o 402 de
    // "consultas acabaram" — a mesma frase de quem não comprou nada, e o caminho
    // direto para a segunda compra. O teste acima só prova que o estado é conferido;
    // este prova que a conferência chega a tempo e que o código é 503, não 402.
    expect(lf).toMatch(
      /if \(!cobranca\.permitido && busca\.estado === 'erro'\) \{\n\s*return resposta\(\{[^}]*\}, 503\);/,
    );
    expect(lf.indexOf("busca.estado === 'erro'"))
      .toBeLessThan(lf.indexOf('if (!cobranca.permitido) {'));
  });

  it('só o plano desconta de consultas_restantes', () => {
    // Era `if (!semLimite)`. Com o avulso isso descontaria também a cota do plano de
    // quem já pagou o item à parte — duas cobranças por uma leitura, e
    // `consultas_restantes` abaixo de zero.
    expect(lf).toMatch(
      /if \(cobranca\.fonte === 'plano'\) \{\n\s*exigirEscrita\('perfis\.consultas_restantes'/,
    );
    expect(lf).not.toMatch(/if \(!semLimite\) \{\n\s*exigirEscrita/);
  });

  it('o crédito volta por QUALQUER saída sem leitura, e por um ponto só', () => {
    // Dentro do `try` há saídas de falha que não passam pelo `catch`: recusa do modelo
    // (422), resposta cortada e resposta fora do formato (502). Devolver só no `catch`
    // deixaria a pessoa perder o que pagou nessas três. O `finally` cobre todas, e
    // cobre as que alguém acrescentar depois.
    //
    // Um ponto só: `devolverCredito` zera `consumido_em` sem condição, então chamá-lo
    // duas vezes pode devolver o crédito que OUTRA requisição já reivindicou.
    expect(lf.match(/devolverCredito\(/g)?.length).toBe(1);
    const final = lf.indexOf('} finally {');
    // O `catch` externo é o último do arquivo; o anterior é o da validação do formato.
    expect(final).toBeGreaterThan(lf.lastIndexOf('} catch (erro) {'));
    expect(lf.slice(final)).toContain('devolverCredito(');
  });

  it('só devolve o que ESTA execução reivindicou, e nunca depois de entregar', () => {
    // Sem a primeira metade, uma leitura paga por plano (ou um pedido que nem chegou à
    // reivindicação) devolveria um crédito alheio. Sem a segunda, o crédito voltaria
    // junto com uma leitura já entregue: duas por uma compra.
    expect(lf.slice(lf.indexOf('} finally {')))
      .toMatch(/idReivindicado !== null && !leituraEntregue/);
    // `idReivindicado` só recebe valor depois de `reivindicarCredito` confirmar que
    // ganhou — a corrida perdida devolve 409 antes de chegar nesta linha.
    expect(lf.match(/idReivindicado = /g)?.length).toBe(1);
    expect(lf).toMatch(
      /if \(!ganhou\) \{\n\s*return resposta\(\{[^}]*\}, 409\);\n\s*\}\n\s*idReivindicado = busca\.id;/,
    );
    // E `leituraEntregue` só vira verdadeiro na última linha antes da resposta de sucesso.
    expect(lf.match(/leituraEntregue = true;/g)?.length).toBe(1);
    expect(lf).toMatch(/leituraEntregue = true;\n\s*return resposta\(\{\n\s*\.\.\.interpretacao,/);
  });

  it('o credito avulso passa por vencido e por limite diario', () => {
    // Sem isto a venda avulsa só serviria a assinante com cota gasta — o oposto do
    // público que ela existe para atender: quem cancelou ou nunca assinou chega com o
    // veredito em `vencido`.
    //
    // O que prende o defeito é a AUSÊNCIA do portão antigo: um `if (!veredito.permitido)`
    // que devolve sempre barraria o comprador antes de a cobrança ser decidida.
    expect(lf).not.toMatch(/if \(!veredito\.permitido\) \{\n\s*return/);
    expect(lf).toMatch(/const vereditoContornavel = veredito\.motivo === 'vencido' \|\| tetoDoDiaContornavel;/);
    expect(lf).toMatch(
      /if \(!veredito\.permitido && \(!vereditoContornavel \|\| !veredito\.recursoLigado\)\) \{\n\s*return recusaDoVeredito\(\);/,
    );
    // E antes da decisão de cobrança: depois dela o crédito já teria sido contado.
    expect(lf.indexOf('!veredito.recursoLigado')).toBeGreaterThan(-1);
    expect(lf.indexOf('!veredito.recursoLigado')).toBeLessThan(lf.indexOf('decidirCobranca('));
  });

  it('o portão lista o que o crédito contorna, em vez de listar o que ele não contorna', () => {
    // Falhar fechado: um motivo novo em `decidirUso` nasce barrado. A forma antiga —
    // barrar só `desligado` — faria o quarto motivo nascer contornável sem ninguém tocar
    // aqui. O teste prende a forma, não só o resultado de hoje, porque a união atual é
    // fechada e as duas formas dão o mesmo resultado enquanto ela for.
    expect(lf).not.toContain("motivo === 'desligado'");
    expect(lf).toMatch(/veredito\.motivo === 'vencido'/);
  });

  it('recurso desligado barra quem venceu: a guarda olha o fato, não o motivo', () => {
    // `decidirUso` devolve 'vencido' ANTES de olhar se o recurso está ligado, então para
    // o público do crédito avulso o motivo nunca é 'desligado'. Só `recursoLigado`
    // enxerga isso (ver `limites.test.ts`, que prende o lado puro).
    expect(lf).toMatch(/!veredito\.recursoLigado\)\) \{/);
  });

  it('o teto do dia só é contornado por quem não tem mais cota no plano', () => {
    // Quem ainda tem consultas só precisa esperar amanhã, de graça. Sem a condição, um
    // assinante com cota sobrando que bate o teto queimaria um crédito comprado por algo
    // que o tempo resolvia.
    expect(lf).toMatch(
      /const tetoDoDiaContornavel = veredito\.motivo === 'limite_dia' && restantes <= 0;/,
    );
    expect(lf).toMatch(/veredito\.motivo === 'vencido' \|\| tetoDoDiaContornavel/);
  });

  it('negativa sem credito ainda responde com a mensagem do veredito', () => {
    // Quem venceu e não comprou precisa continuar lendo "seu acesso terminou".
    expect(interp).toContain('mensagemDoLimite(');
    // E o veredito responde ANTES da frase de cota dentro da negativa final: invertidos,
    // quem cancelou leria "consultas acabaram" — a explicação errada que a regra de
    // ordem da spec existe para evitar.
    const final = lf.slice(lf.indexOf('if (!cobranca.permitido) {'));
    expect(final.indexOf('recusaDoVeredito()')).toBeGreaterThan(-1);
    expect(final.indexOf('recusaDoVeredito()')).toBeLessThan(final.indexOf('semConsultas: true'));
  });

  it('so o credito contorna o veredito: a cota do plano nao', () => {
    // Com o veredito negado por plano vencido ou teto do dia, `consultas_restantes`
    // não pode pagar a leitura. `decidirCobranca` põe o plano na frente do avulso, então
    // sem isto uma cota que sobrou passaria por cima do vencimento e do limite diário —
    // o vazamento que a validade fechou, reaberto por quem não comprou nada.
    expect(lf).toMatch(/restantesDoPlano: veredito\.permitido \? restantes : 0,/);
  });

  it('a resposta do veredito sai de um ponto só', () => {
    // O desligado e a negativa final precisam dizer a mesma coisa, e a mensagem do
    // veredito tem um único chamador (o teste da cota cobrada confere o mesmo).
    expect(lf.match(/recusaDoVeredito\(\)/g)?.length).toBe(2);
    expect(lf.match(/const recusaDoVeredito = /g)?.length).toBe(1);
  });

  it('a devolução do crédito não derruba a resposta já montada', () => {
    // O `devolverCredito` roda dentro do `finally`. Se lançasse, o throw substituiria o 502
    // ou o 422 já montado por um 500 cru, sem CORS, e o app mostraria erro de rede no lugar
    // da mensagem. O `catch` tem nome próprio de propósito: o teste do `finally` acima
    // procura o ÚLTIMO `} catch (erro) {` do arquivo, e este não pode ser confundido com o
    // da geração.
    const final = lf.slice(lf.indexOf('} finally {'));
    expect(final).toMatch(/try \{\n\s*await devolverCredito\(supabaseAdmin, idReivindicado\);\n\s*\} catch \(erroDevolucao\) \{\n\s*console\.error\(/);
  });
});
