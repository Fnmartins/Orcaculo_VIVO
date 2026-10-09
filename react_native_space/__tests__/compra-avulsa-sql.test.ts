import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * O SQL da compra avulsa, lido como TEXTO.
 *
 * Mesma forma de `validade-nas-functions.test.ts`, e pelo mesmo motivo: nada mais alcança
 * este arquivo. `supabase/compra-avulsa.sql` é rodado à mão pelo dono no editor SQL, fica
 * fora do `tsc`, fora do Jest e fora de `conferir-functions.js` — e é onde mora a única
 * garantia contra vender duas vezes.
 *
 * O que estes testes prendem não é estilo de SQL: é dinheiro. Apagar a palavra `unique` da
 * linha de `stripe_session_id` deixava os 1250 testes verdes e permitia a reentrega do
 * Stripe vender a mesma leitura duas vezes, porque a idempotência do webhook é, por decisão
 * explícita, garantia do BANCO (`stripe-webhook` segue em frente no erro 23505 justamente
 * confiando nela).
 */
const RAIZ = join(__dirname, '..');
const SQL = readFileSync(join(RAIZ, 'supabase', 'compra-avulsa.sql'), 'utf8');

/**
 * Os comandos executáveis, sem comentário e com o espaço em branco normalizado.
 *
 * Os comentários saem primeiro de propósito: o arquivo explica cada decisão em prosa, e
 * um teste que procurasse "unique" no texto cru passaria com a palavra existindo só no
 * comentário que fala dela — exatamente o defeito que este arquivo existe para prender.
 */
const comandos = SQL
  .replace(/--[^\n]*/g, '')
  .split(';')
  .map((comando) => comando.replace(/\s+/g, ' ').trim())
  .filter(Boolean);

describe('supabase/compra-avulsa.sql', () => {
  it('o arquivo foi lido de verdade', () => {
    // Sem isto, um arquivo renomeado ou um `split` que devolvesse vazio deixaria todos os
    // testes abaixo passando por não ter o que conferir.
    expect(comandos.length).toBeGreaterThan(5);
    expect(comandos.some((c) => c.startsWith('create table if not exists public.compras_avulsas')))
      .toBe(true);
  });

  const criacao = comandos.find((c) =>
    c.startsWith('create table if not exists public.compras_avulsas'));

  it('stripe_session_id é unique: é o que impede o Stripe vender duas vezes', () => {
    // A reentrega do mesmo `checkout.session.completed` é o caso NORMAL, não a exceção. O
    // webhook conta com o 23505 para seguir em frente; sem a restrição, a segunda entrega
    // insere uma segunda linha e a pessoa ganha um crédito que ninguém pagou.
    //
    // A forma é conferida na coluna, que é onde ela está hoje. Mover a unicidade para uma
    // constraint ou índice separado continua sendo correto — mas tem de passar por este
    // teste, e por quem o estiver lendo.
    expect(criacao).toMatch(/stripe_session_id text not null unique/);
  });

  it('expira_em é not null: crédito sem validade é crédito para sempre', () => {
    // O webhook grava `now + 90 dias`, e `creditoDisponivel` filtra por
    // `gt('expira_em', now)`. Nulo ali passaria pelo filtro sem nunca vencer — e uma
    // gravação futura que esquecesse a coluna não falharia.
    expect(criacao).toMatch(/expira_em timestamptz not null/);
  });

  it('a RLS está ligada', () => {
    // `services/avulso.ts` NÃO filtra por `usuario_id`: a separação entre as compras de
    // cada pessoa depende inteiramente da RLS. Sem ela, a consulta devolveria as linhas
    // alheias e qualquer pessoa leria o crédito de qualquer outra.
    expect(comandos).toContain('alter table public.compras_avulsas enable row level security');
  });

  it('a policy de select casa auth.uid(), e é a única', () => {
    // Uma policy a mais nesta tabela é dinheiro: a de escrita entregaria crédito de graça.
    const policies = comandos.filter((c) =>
      c.startsWith('create policy') && c.includes('public.compras_avulsas'));
    expect(policies).toHaveLength(1);
    expect(policies[0]).toMatch(/for select using \(auth\.uid\(\) = usuario_id\)/);
  });

  it('anon e authenticated não têm insert nem update', () => {
    // O Supabase dá todos os privilégios a anon e authenticated em tabela nova, então a
    // revogação não é zelo: é o que fecha a porta. Crédito que o cliente pudesse inserir
    // ou reabrir (`consumido_em` de volta a nulo) seria leitura paga de graça.
    expect(comandos).toContain('revoke all on public.compras_avulsas from anon, authenticated');

    // A igualdade, e não uma busca por "insert": só a leitura chega ao cliente, numa tabela
    // só. Qualquer grant novo para anon ou authenticated passa a obrigar uma olhada aqui.
    const paraOCliente = comandos.filter((c) =>
      c.startsWith('grant ') && /\bto\b[^,]*\b(anon|authenticated)\b/.test(c));
    expect(paraOCliente).toEqual(['grant select on public.compras_avulsas to authenticated']);
  });

  it('a tabela de preços não chega ao cliente', () => {
    // `precos_avulsos` guarda os `price_id` do Stripe e é lida só pelo `service_role`, que
    // passa por cima da RLS. RLS ligada sem policy nega tudo, e é o que se quer aqui.
    expect(comandos).toContain('alter table public.precos_avulsos enable row level security');
    expect(comandos).toContain('revoke all on public.precos_avulsos from anon, authenticated');
    expect(comandos.filter((c) => c.startsWith('create policy') && c.includes('precos_avulsos')))
      .toEqual([]);
  });
});

/**
 * O prazo do direito de gerar, num lugar só.
 *
 * O valor real mora no webhook; a promessa aparece em quatro textos de tela. Nada ligava os
 * dois: `NOVENTA_DIAS` podia virar nove dias sem nenhum vermelho, enquanto as telas
 * continuavam prometendo noventa — ou o contrário, uma tela corrigida e as outras três não.
 * Isto é promessa de venda, e tem de poder mudar só nos dois lugares ao mesmo tempo.
 */
describe('os 90 dias do direito de gerar não podem mudar num lugar só', () => {
  const webhook = readFileSync(
    join(RAIZ, 'supabase', 'functions', 'stripe-webhook', 'index.ts'), 'utf8',
  );

  // O valor que de fato vai para `expira_em`, e não uma constante qualquer do arquivo.
  const usoDoPrazo = /expira_em: new Date\(Date\.now\(\) \+ NOVENTA_DIAS\)\.toISOString\(\),/;
  const declaracao = /const NOVENTA_DIAS = (\d+) \* 24 \* 60 \* 60 \* 1000;/.exec(webhook);

  it('o webhook declara o prazo em dias e é ele que grava expira_em', () => {
    expect(webhook).toMatch(usoDoPrazo);
    expect(declaracao).not.toBeNull();
    expect(Number(declaracao![1])).toBeGreaterThan(0);
  });

  it('as quatro frases de tela dizem o mesmo número de dias que o webhook grava', () => {
    const dias = Number(declaracao![1]);
    const TELAS = [
      'app/pagamento/sucesso.tsx',
      'app/mapa-astral/resultado.tsx',
      'app/vocacao/index.tsx',
    ];
    const frases = TELAS.flatMap((tela) => [
      ...readFileSync(join(RAIZ, tela), 'utf8').matchAll(/O direito de gerar vale (\d+) dias/g),
    ].map((achado) => ({ tela, dias: Number(achado[1]) })));

    // A lista inteira, e não uma contagem: uma cópia a mais (ou a menos) muda o que o
    // produto promete, e tem de passar por aqui. Duas em `sucesso.tsx` porque a tela
    // escreve a frase com e sem o nome do produto.
    expect(frases).toEqual([
      { tela: 'app/pagamento/sucesso.tsx', dias },
      { tela: 'app/pagamento/sucesso.tsx', dias },
      { tela: 'app/mapa-astral/resultado.tsx', dias },
      { tela: 'app/vocacao/index.tsx', dias },
    ]);
  });
});
