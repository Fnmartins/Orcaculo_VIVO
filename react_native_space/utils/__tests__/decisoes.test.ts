import {
  montarTextoDecisao,
  ROTULO_POSICAO,
  ROTULO_STATUS,
  type Decisao,
  type Manifestacao,
} from '../decisoes';

const decisao: Decisao = {
  id: 'd1',
  titulo: 'Mesa de búzios',
  contexto: 'A peneira atual tem anéis concêntricos e nenhum pano.',
  link: 'https://claude.ai/artifact/exemplo',
  previa: null,
  status: 'aberta',
  decisao_final: null,
  decidido_por_nome: null,
  decidido_em: null,
  criado_em: '2026-09-22T12:00:00Z',
  atualizado_em: '2026-09-22T12:00:00Z',
};

const manifestacoes: Manifestacao[] = [
  {
    id: 'm1',
    decisao_id: 'd1',
    autor_nome: 'Marcio',
    posicao: 'aprovo',
    texto: 'Gostei do fundo escuro.',
    criado_em: '2026-09-22T13:00:00Z',
  },
  {
    id: 'm2',
    decisao_id: 'd1',
    autor_nome: 'Fabiano',
    posicao: 'nao_aprovo',
    texto: 'O pano deixa a cena confusa no celular.',
    criado_em: '2026-09-22T14:00:00Z',
  },
];

describe('montarTextoDecisao', () => {
  it('abre com o título e o status', () => {
    const texto = montarTextoDecisao(decisao, manifestacoes);
    expect(texto.startsWith('Decisão: Mesa de búzios')).toBe(true);
    expect(texto).toContain('Status: Aberta');
  });

  it('traz contexto, link e o texto de cada manifestação', () => {
    const texto = montarTextoDecisao(decisao, manifestacoes);
    expect(texto).toContain('A peneira atual tem anéis concêntricos');
    expect(texto).toContain('https://claude.ai/artifact/exemplo');
    expect(texto).toContain('Gostei do fundo escuro.');
    expect(texto).toContain('O pano deixa a cena confusa no celular.');
  });

  it('identifica autor e posição de cada manifestação', () => {
    const texto = montarTextoDecisao(decisao, manifestacoes);
    expect(texto).toContain('Marcio');
    expect(texto).toContain(ROTULO_POSICAO.aprovo);
    expect(texto).toContain('Fabiano');
    expect(texto).toContain(ROTULO_POSICAO.nao_aprovo);
  });

  it('mantém a ordem cronológica, mesmo recebendo fora de ordem', () => {
    const texto = montarTextoDecisao(decisao, [manifestacoes[1], manifestacoes[0]]);
    expect(texto.indexOf('Gostei do fundo escuro.')).toBeLessThan(
      texto.indexOf('O pano deixa a cena confusa'),
    );
  });

  it('omite contexto e link quando não existem', () => {
    const texto = montarTextoDecisao(
      { ...decisao, contexto: null, link: null },
      manifestacoes,
    );
    expect(texto).not.toContain('Contexto:');
    expect(texto).not.toContain('Link:');
  });

  it('diz que ainda não há manifestações, em vez de deixar vazio', () => {
    expect(montarTextoDecisao(decisao, [])).toContain('Nenhuma manifestação registrada');
  });

  it('mostra quando a decisão foi fechada', () => {
    const texto = montarTextoDecisao(
      { ...decisao, status: 'decidida', decidido_em: '2026-09-23T10:00:00Z' },
      manifestacoes,
    );
    expect(texto).toContain(`Status: ${ROTULO_STATUS.decidida}`);
    expect(texto).toMatch(/Fechada em \d{2}\/\d{2}\/\d{4}/);
  });

  it('data de cada manifestação em dia, mês, ano e hora', () => {
    expect(montarTextoDecisao(decisao, manifestacoes)).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
  });
});

// O conselho de 23/09 chamou a saída do "Copiar tudo" de contrato: é o texto
// que vira execução. Sem estes campos, quem recebe adivinha.
describe('montarTextoDecisao — o que não pode faltar', () => {
  const fechada: Decisao = {
    ...decisao,
    status: 'decidida',
    decisao_final: 'Adotamos a peneira proposta, com o regente em destaque.',
    decidido_em: '2026-09-24T15:30:00Z',
    decidido_por_nome: 'Fabiano',
    previa: 'mesa-buzios',
  };

  it('traz a decisão em si, e não só o status', () => {
    const texto = montarTextoDecisao(fechada, manifestacoes);
    expect(texto).toContain('O que ficou combinado:');
    expect(texto).toContain('Adotamos a peneira proposta');
  });

  it('diz quem fechou e quando', () => {
    expect(montarTextoDecisao(fechada, manifestacoes)).toContain('por Fabiano');
  });

  // O desenho não sobrevive ao copiar e colar; o nome dele tem de ir junto.
  it('nomeia a proposta desenhada', () => {
    expect(montarTextoDecisao(fechada, manifestacoes)).toContain('Proposta na tela:');
    expect(montarTextoDecisao(fechada, manifestacoes)).toContain('Mesa de búzios');
  });

  it('decisão aberta não inventa uma decisão final', () => {
    const texto = montarTextoDecisao(decisao, manifestacoes);
    expect(texto).not.toContain('O que ficou combinado:');
  });

  it('identificador de prévia desconhecido não quebra o texto', () => {
    const texto = montarTextoDecisao({ ...fechada, previa: 'inexistente' }, manifestacoes);
    expect(texto).toContain('Proposta na tela: inexistente');
  });
});
