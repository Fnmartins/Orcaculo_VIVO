import {
  FALHA_SEM_MOTIVO,
  NOME_SEM_CONSULTAS,
  ehSemConsultas,
  falhaDaIA,
} from '../falhaDaIA';

const recusaDoPlano = (frase: string) => {
  const falha = new Error(frase);
  falha.name = NOME_SEM_CONSULTAS;
  return falha;
};

describe('ehSemConsultas', () => {
  it('reconhece o erro que o 402 produz', () => {
    expect(ehSemConsultas(recusaDoPlano('Suas consultas deste período acabaram.'))).toBe(true);
  });

  it('não confunde com outro erro qualquer', () => {
    expect(ehSemConsultas(new Error('A leitura voltou incompleta.'))).toBe(false);
  });

  it('nada e coisa nenhuma não são recusa de plano', () => {
    expect(ehSemConsultas(null)).toBe(false);
    expect(ehSemConsultas(undefined)).toBe(false);
    expect(ehSemConsultas('SemConsultasError')).toBe(false);
  });
});

describe('falhaDaIA', () => {
  it('mostra a frase do servidor e tira a nova tentativa quando é recusa de plano', () => {
    const frase = 'Seu acesso terminou em 28/09. Atualize seu plano para continuar.';
    expect(falhaDaIA(recusaDoPlano(frase))).toEqual({ texto: frase, tentarDeNovo: false });
  });

  it('falha de serviço mostra o motivo e mantém a nova tentativa', () => {
    // A diferença que importa: aqui insistir resolve, lá não.
    expect(falhaDaIA(new Error('A leitura voltou incompleta. Tente de novo.')))
      .toEqual({ texto: 'A leitura voltou incompleta. Tente de novo.', tentarDeNovo: true });
  });

  it('Error sem mensagem cai na frase de sempre', () => {
    expect(falhaDaIA(new Error())).toEqual({ texto: FALHA_SEM_MOTIVO, tentarDeNovo: true });
  });

  it('mensagem só de espaço também é mensagem nenhuma', () => {
    // Sem o `trim`, a tela mostraria uma linha em branco onde devia haver aviso.
    expect(falhaDaIA(new Error('   '))).toEqual({ texto: FALHA_SEM_MOTIVO, tentarDeNovo: true });
  });

  it('objeto que só PARECE erro não vira texto na tela', () => {
    // `instanceof Error` em vez de olhar `.message`: qualquer coisa que o `invoke`
    // devolva pode ter um campo `message`, e texto de origem desconhecida na tela do
    // usuário é pior que a frase genérica.
    expect(falhaDaIA({ message: 'texto de procedência nenhuma' }))
      .toEqual({ texto: FALHA_SEM_MOTIVO, tentarDeNovo: true });
  });

  it('nada, texto cru e coisa nenhuma caem na frase de sempre', () => {
    expect(falhaDaIA(null)).toEqual({ texto: FALHA_SEM_MOTIVO, tentarDeNovo: true });
    expect(falhaDaIA(undefined)).toEqual({ texto: FALHA_SEM_MOTIVO, tentarDeNovo: true });
    expect(falhaDaIA('deu erro')).toEqual({ texto: FALHA_SEM_MOTIVO, tentarDeNovo: true });
  });

  it('recusa de plano sem mensagem volta a convidar a tentar — limite conhecido', () => {
    // Caso de borda real: 402 com corpo vazio pode produzir um Error sem texto, e aí só
    // sobra a frase genérica, que convida a insistir. Fica preso aqui de propósito, em
    // vez de corrigido: consertar exigiria inventar uma frase sobre o que o servidor
    // não disse, e texto inventado sobre acesso é pior que convite inútil. Se este
    // teste mudar, foi decisão de alguém, não acidente.
    expect(falhaDaIA(recusaDoPlano(''))).toEqual({ texto: FALHA_SEM_MOTIVO, tentarDeNovo: true });
  });
});
