import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('../../../utils/haptics', () => ({
  Hapticos: { impactoLeve: jest.fn(), impactoMedio: jest.fn(), selecao: jest.fn() },
}));

// O embaralhamento de verdade, com um observador: a tela segue usando o `embaralhar`
// real, e os testes do gesto conseguem ver quando ele é chamado e o que a tela faz com
// o que ele devolve.
const mockEmbaralhar = jest.fn();
jest.mock('../../../data/corteDoBaralho', () => ({
  ...jest.requireActual('../../../data/corteDoBaralho'),
  embaralhar: (...a: unknown[]) => mockEmbaralhar(...a),
}));

import TelaCartas from '../../../app/consulta/cartas';
import { ARCANOS_MAIORES, type CartaTarot } from '../../../data/tarot';

const corteReal = jest.requireActual<typeof import('../../../data/corteDoBaralho')>(
  '../../../data/corteDoBaralho',
);

// "Reduzir movimento" ligado: o riffle entrega o baralho na hora, e o fluxo do rito é
// testado sem depender do tempo de nenhuma animação.
beforeEach(() => {
  jest.clearAllMocks();
  // O `embaralhar` de verdade é o padrão; os testes do gesto trocam por uma ordem conhecida.
  mockEmbaralhar.mockImplementation(corteReal.embaralhar);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
});

afterEach(() => jest.restoreAllMocks());

// A leitura do "reduzir movimento" é assíncrona: sem este ato, cada teste reclama de um
// setState fora do act quando a promessa resolve.
/**
 * Espera a carta virar sozinha — os 320 ms de `ESPERA_DA_VIRADA`.
 *
 * Com `waitFor` isto levava 4,5 a 5,7 SEGUNDOS, e fazia a suíte inteira falhar de vez
 * em quando. A causa, medida: `waitFor` pesquisa em laço e roda um `act()` a cada
 * passada, percorrendo a árvore desta tela — que tem 22 lâminas e vários componentes.
 * O laço come a thread, e o `setTimeout` da própria tela não consegue rodar. Medido:
 * o relógio disparava aos 4478 ms com `waitFor` e aos 326 ms com uma espera simples.
 *
 * A regra que fica: `waitFor` serve para o que você não sabe quando chega. Para o que
 * vem de relógio, espere o relógio.
 */
const esperarAVirada = async () => {
  await act(async () => { await new Promise((r) => { setTimeout(r, 500); }); });
};

const abrir = async () => {
  render(<TelaCartas />);
  await act(async () => {});
};

const CAMPO_INTENCAO = 'O que te trouxe aqui?';
const campo = () => screen.getByLabelText(CAMPO_INTENCAO);
// A linha precisa dizer as duas coisas: que a pergunta já entrou, e como mudá-la.
const AVISO_DA_PERGUNTA = /A pergunta já entrou com o embaralhamento.*Recomeçar o rito/;
// O espelho, para quem embaralhou sem escrever: não afirma pergunta nenhuma, só mostra o
// caminho.
const AVISO_SEM_PERGUNTA = /Você embaralhou sem escrever.*Recomeçar o rito/;
const PLACEHOLDER_ABERTO = 'Ex.: estou decidindo se mudo de trabalho';
const embaralharCartas = () => fireEvent.press(screen.getByText('Embaralhar'));
const cortar = () => fireEvent.press(screen.getByLabelText('Cortar aqui, carta 8 de 22'));
const irParaLeitura = () => fireEvent.press(screen.getByText('Ir para a leitura'));
const puxar = () => fireEvent.press(screen.getByLabelText('Carta de cima do monte, pegue daqui'));
const seguir = () => fireEvent.press(screen.getByText('Ver Leitura Completa'));
const escolherCruzCelta = () => fireEvent.press(screen.getByLabelText('Cruz Celta, 10 cartas'));

/** Puxa `quantas` cartas e espera elas virarem sozinhas, como no protótipo. */
const distribuir = async (quantas: number) => {
  for (let i = 0; i < quantas; i++) puxar();
  await waitFor(() => expect(screen.getByText('Ver Leitura Completa')).toBeTruthy());
};

describe('o rito do tarô', () => {
  it('o leque só abre depois de embaralhar com a pergunta na cabeça', async () => {
    // Nas fontes, a pergunta é segurada na cabeça DURANTE o embaralhamento — é isso que
    // liga a pergunta à tiragem. Embaralhar invisível, num instante, é sorteio com outro
    // nome, e foi por isso que a tela de preparo antiga parecia enfeite.
    await abrir();
    expect(screen.queryByLabelText(/Cortar aqui/)).toBeNull();
    expect(screen.getByText('Embaralhar')).toBeTruthy();

    embaralharCartas();
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(22);
    expect(screen.queryByText('Embaralhar')).toBeNull();
  });

  it('o gesto embaralha: a ordem das cartas sai dele, com a pergunta já escrita', async () => {
    // É esta chamada que torna verdadeira a frase da tela, "O que você está pensando
    // entra agora, com o gesto". Se a ordem saísse só de quando a tela monta, estaria
    // fixa antes de a pergunta existir, e a frase seria falsa sem erro em lugar nenhum.
    // O teste de `recomeçar` não cobre isto: `recomeçar` restaura o baralho por conta
    // própria, e ele confere o baralho antes do gesto.
    await abrir();
    fireEvent.changeText(campo(), 'devo aceitar a proposta');
    // O sorteio de quando a tela monta não conta: só vale o que o gesto fizer.
    mockEmbaralhar.mockClear();

    embaralharCartas();

    expect(mockEmbaralhar).toHaveBeenCalledTimes(1);
    expect(mockEmbaralhar).toHaveBeenCalledWith(ARCANOS_MAIORES);
  });

  it('a carta que a pessoa recebe vem da ordem que o gesto produziu, não da de antes', async () => {
    // Chamar `embaralhar` e jogar o resultado fora passaria no teste acima. Aqui a ordem
    // de antes do gesto é a natural e a do gesto é a inversa: se as cartas da mesa
    // vierem da natural, o embaralhamento não chegou até elas.
    let aoContrario = false;
    mockEmbaralhar.mockImplementation((lista: CartaTarot[]) =>
      (aoContrario ? [...lista].reverse() : [...lista])
    );
    await abrir();
    aoContrario = true;
    embaralharCartas(); cortar(); irParaLeitura();
    await distribuir(3);
    seguir();

    const cartas = JSON.parse(mockPush.mock.calls[0][0].params.cartas) as { id: number }[];
    const esperadas = [...ARCANOS_MAIORES].reverse().slice(0, 3).map((c) => c.id);
    expect(cartas.map((c) => c.id)).toEqual(esperadas);
  });

  it('antes de embaralhar, a tela pede a pergunta na cabeça e não fala de corte', async () => {
    // Os textos de estado acompanham o gesto: dizer "toque numa carta do leque" diante
    // de um leque que ainda não existe mandaria a pessoa procurar o que não está lá.
    await abrir();
    expect(screen.getByText('Segure a sua pergunta e embaralhe as cartas.')).toBeTruthy();
    expect(screen.getByText(
      'O baralho tem 22 cartas. O que você está pensando entra agora, com o gesto.'
    )).toBeTruthy();
    expect(screen.queryByText('Toque numa carta do leque para tirar um monte.')).toBeNull();
    expect(screen.queryByText('Ir para a leitura')).toBeNull();
  });

  it('recomeçar devolve o rito ao embaralhamento', async () => {
    await abrir();
    embaralharCartas();
    cortar();
    fireEvent.press(screen.getByText('Recomeçar o rito'));
    expect(screen.getByText('Embaralhar')).toBeTruthy();
    expect(screen.queryByLabelText(/Cortar aqui/)).toBeNull();
  });

  it('começa pedindo o corte, e conta o que há na mesa', async () => {
    await abrir();
    embaralharCartas();
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(22);
    expect(screen.getByText('Toque numa carta do leque para tirar um monte.')).toBeTruthy();
    expect(screen.getByText(/O baralho tem 22 cartas, embaralhadas/)).toBeTruthy();
    // "Ir para a leitura" só aparece quando já há um corte dado.
    expect(screen.queryByText('Ir para a leitura')).toBeNull();
    expect(screen.queryByText('Pegue daqui')).toBeNull();
  });

  it('o corte deixa rastro: o monte aparece e a narração muda', async () => {
    // Sem os montes na tela o corte não registra nada, e a pessoa não vê que fez algo.
    await abrir();
    embaralharCartas(); cortar();
    expect(screen.getByText(/^1º · \d+ cartas?$/)).toBeTruthy();
    expect(screen.getByText('Cortar de novo, ou seguir para a leitura?')).toBeTruthy();
    expect(screen.getByText(/1 monte de lado, \d+ cartas ainda no leque\./)).toBeTruthy();
  });


  it('cortar perto da ponta esvazia o leque, e a tela diz isso', async () => {
    // O defeito que o dono encontrou com o dedo: o corte leva TUDO do comeco do leque
    // ate onde se toca. Tocar perto da direita leva quase o baralho — e com 22 cartas
    // o corte acaba num toque so. A carta mais facil de acertar e justamente a da
    // ponta, que esta por cima de todas.
    //
    // Nao e defeito de toque; e o leque ficando sem cartas. O que era defeito e a tela
    // continuar desenhando um leque com cara de clicavel depois disso.
    await abrir();
    embaralharCartas();
    fireEvent.press(screen.getByLabelText('Cortar aqui, carta 21 de 22'));
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(1);
    expect(screen.getByText('Nao sobrou leque para cortar.'.replace('Nao', 'Não'))).toBeTruthy();
    expect(screen.getByText('Siga para a leitura.')).toBeTruthy();
    expect(screen.getByText('Ir para a leitura')).toBeTruthy();
  });

  it('antes de soltar, a tela diz o tamanho do monte que sairia', async () => {
    // Sem isto a pessoa so descobre o tamanho do corte depois de dado, e um toque na
    // ponta direita leva o baralho inteiro sem aviso.
    await abrir();
    embaralharCartas();
    fireEvent(screen.getByLabelText('Cortar aqui, carta 8 de 22'), 'pressIn');
    expect(screen.getByText(/Soltando aqui, saem 8 cartas e ficam 14 no leque\./)).toBeTruthy();
    fireEvent(screen.getByLabelText('Cortar aqui, carta 8 de 22'), 'pressOut');
    expect(screen.getByText(/O baralho tem 22 cartas/)).toBeTruthy();
  });

  it('depois de juntar, as posições aparecem vazias com a pergunta de cada uma', async () => {
    await abrir();
    embaralharCartas(); cortar(); irParaLeitura();
    expect(screen.getByLabelText('Posição Passado, vazia')).toBeTruthy();
    expect(screen.getByLabelText('Posição Presente, vazia')).toBeTruthy();
    expect(screen.getByLabelText('Posição Futuro, vazia')).toBeTruthy();
    expect(screen.getByText('o que já se consumou e ainda pesa')).toBeTruthy();
    expect(
      screen.getByText('Montes juntos. Agora as cartas são suas para distribuir.')
    ).toBeTruthy();
  });

  it('a carta pousa de costas e vira sozinha', async () => {
    // É a espera que faz a leitura acontecer. No protótipo são 320 ms entre pousar e
    // virar; sem isso a carta aparece pronta e não acontece nada.
    await abrir();
    embaralharCartas(); cortar(); irParaLeitura();
    puxar();
    expect(screen.getByLabelText(/^Posição Passado, carta de costas/)).toBeTruthy();
    await esperarAVirada();
    expect(screen.queryByLabelText(/^Posição Passado, carta de costas/)).toBeNull();
  });

  it('a distribuição conta quantas faltam', async () => {
    await abrir();
    embaralharCartas(); cortar(); irParaLeitura();
    expect(screen.getByText(/Faltam 3 cartas\./)).toBeTruthy();
    puxar();
    await waitFor(() => expect(screen.getByText(/Faltam 2 cartas\./)).toBeTruthy());
  });

  it('as três cartas distribuídas levam ao resultado', async () => {
    await abrir();
    embaralharCartas(); cortar(); irParaLeitura();
    await distribuir(3);
    seguir();
    expect(mockPush).toHaveBeenCalledTimes(1);
    const destino = mockPush.mock.calls[0][0];
    expect(destino.pathname).toBe('/consulta/resultado');
    expect(JSON.parse(destino.params.cartas)).toHaveLength(3);
  });

  it('não oferece a leitura com posição vazia', async () => {
    // A regressão mais provável: liberar a leitura assim que a primeira carta cai.
    await abrir();
    embaralharCartas(); cortar(); irParaLeitura(); puxar();
    await esperarAVirada();
    expect(screen.queryByLabelText(/^Posição Passado, carta de costas/)).toBeNull();
    expect(screen.queryByText('Ver Leitura Completa')).toBeNull();
  });

  it('as três cartas da tiragem são distintas', async () => {
    // `puxar` tira do topo do baralho recolhido e encurta o monte. Se ele lesse sempre
    // a mesma lista, a tiragem sairia com a mesma carta três vezes.
    await abrir();
    embaralharCartas(); cortar(); irParaLeitura();
    await distribuir(3);
    seguir();
    const cartas = JSON.parse(mockPush.mock.calls[0][0].params.cartas) as { id: number }[];
    expect(new Set(cartas.map((c) => c.id)).size).toBe(3);
  });

  // As cartas vão para as posições na ordem da tiragem, como nos livros (Burke, p. 157 e
  // 162; Rider-Waite, p. 53): quem consulta escolhe a carta, não a posição. O arraste e o
  // toque na vaga continuam — mas só valem na próxima posição.
  it('a tela diz qual é a próxima posição', async () => {
    await abrir();
    embaralharCartas(); cortar(); irParaLeitura();
    expect(screen.getByText(/Próxima posição: Passado\./)).toBeTruthy();
    puxar();
    await waitFor(() => expect(screen.getByText(/Próxima posição: Presente\./)).toBeTruthy());
  });

  it('tocar numa vaga fora da ordem não põe a carta, e a tela diz qual é a vez', async () => {
    await abrir();
    embaralharCartas(); cortar(); irParaLeitura();
    fireEvent.press(screen.getByLabelText('Posição Futuro, vazia'));
    expect(screen.getByLabelText('Posição Futuro, vazia')).toBeTruthy();
    expect(screen.getByLabelText('Posição Passado, vazia')).toBeTruthy();
    expect(screen.getByText(/As cartas vão na ordem da tiragem: esta é de Passado\./)).toBeTruthy();
    expect(screen.getByText(/Faltam 3 cartas\./)).toBeTruthy();
  });

  it('tocar na próxima vaga põe a carta nela, e o aviso some', async () => {
    await abrir();
    embaralharCartas(); cortar(); irParaLeitura();
    fireEvent.press(screen.getByLabelText('Posição Futuro, vazia'));
    fireEvent.press(screen.getByLabelText('Posição Passado, vazia'));
    await waitFor(() =>
      expect(screen.queryByLabelText('Posição Passado, vazia')).toBeNull()
    );
    expect(screen.queryByText(/As cartas vão na ordem da tiragem/)).toBeNull();
  });

  it('recomeçar está sempre à mão, e devolve o baralho inteiro', async () => {
    // No protótipo o botão vive no painel do baralho desde o começo. Quem cortou errado
    // na primeira carta não precisa sair da tela para recomeçar.
    await abrir();
    expect(screen.getByText('Recomeçar o rito')).toBeTruthy();
    embaralharCartas(); cortar(); irParaLeitura();
    expect(screen.getByText('Pegue daqui')).toBeTruthy();
    fireEvent.press(screen.getByText('Recomeçar o rito'));
    // O rito volta ao gesto de embaralhar. O baralho inteiro tem de estar de volta JÁ
    // aqui, antes do gesto: embaralhar reconstrói o baralho cheio sozinho, e conferir só
    // depois dele esconderia um `recomecar` que deixasse de restaurar o leque (a tela
    // diria "O baralho tem 14 cartas").
    expect(screen.getByText(
      'O baralho tem 22 cartas. O que você está pensando entra agora, com o gesto.'
    )).toBeTruthy();
    expect(screen.queryByLabelText(/Cortar aqui/)).toBeNull();
    embaralharCartas();
    expect(screen.getAllByLabelText(/Cortar aqui/)).toHaveLength(22);
    expect(screen.queryByText('Pegue daqui')).toBeNull();
  });

  it('recomeçar não apaga a intenção escrita', async () => {
    // A pergunta que trouxe a pessoa continua a mesma. Fazê-la digitar de novo é
    // castigo por querer outra tiragem.
    await abrir();
    fireEvent.changeText(screen.getByLabelText(CAMPO_INTENCAO), 'devo aceitar a proposta');
    embaralharCartas(); cortar();
    fireEvent.press(screen.getByText('Recomeçar o rito'));
    expect(screen.getByLabelText(CAMPO_INTENCAO).props.value).toBe('devo aceitar a proposta');
  });

  it('depois de embaralhar a pergunta já vale: o campo não aceita edição, e o texto fica à vista', async () => {
    // Quem embaralha e só então digita reproduz a falsidade que fez a tela de preparo
    // antiga ser removida: o gesto antes, a pergunta depois. Se a pergunta ainda pode
    // entrar, o embaralhamento não a carregou. O campo não some: o que foi escrito é a
    // pergunta da leitura e continua à vista durante o corte.
    await abrir();
    expect(campo().props.editable).toBe(true);
    fireEvent.changeText(campo(), 'devo aceitar a proposta');
    expect(campo().props.value).toBe('devo aceitar a proposta');
    expect(screen.queryByText(AVISO_DA_PERGUNTA)).toBeNull();

    embaralharCartas();
    expect(campo().props.editable).toBe(false);
    fireEvent.changeText(campo(), 'outra pergunta, pensada tarde');
    expect(campo().props.value).toBe('devo aceitar a proposta');
    expect(screen.getByText(AVISO_DA_PERGUNTA)).toBeTruthy();
    expect(screen.queryByText(AVISO_SEM_PERGUNTA)).toBeNull();
  });

  it('sem pergunta escrita, embaralhar não afirma que uma pergunta entrou', async () => {
    // Dizer que a pergunta entrou quando não houve pergunta é o que esta tela evita em
    // todo lugar. Só espaços também não é pergunta.
    await abrir();
    embaralharCartas();
    expect(screen.queryByText(AVISO_DA_PERGUNTA)).toBeNull();

    fireEvent.press(screen.getByText('Recomeçar o rito'));
    fireEvent.changeText(campo(), '   ');
    embaralharCartas();
    expect(screen.queryByText(AVISO_DA_PERGUNTA)).toBeNull();
  });

  it('quem embaralha sem escrever vê o caminho para escrever, e o campo não convida', async () => {
    // Campo travado e vazio, com o placeholder convidando e nada explicando, é um beco
    // sem saída: a pessoa segurou a pergunta na cabeça, como a tela pediu, quer escrevê-la
    // e não tem pista de que o caminho é recomeçar. A linha não afirma pergunta nenhuma.
    await abrir();
    expect(campo().props.placeholder).toBe(PLACEHOLDER_ABERTO);
    expect(screen.queryByText(AVISO_SEM_PERGUNTA)).toBeNull();

    embaralharCartas();
    expect(screen.getByText(AVISO_SEM_PERGUNTA)).toBeTruthy();
    expect(campo().props.placeholder).not.toBe(PLACEHOLDER_ABERTO);

    // Recomeçar é o caminho que a linha aponta: o convite e a edição voltam, a linha some.
    fireEvent.press(screen.getByText('Recomeçar o rito'));
    expect(screen.queryByText(AVISO_SEM_PERGUNTA)).toBeNull();
    expect(campo().props.placeholder).toBe(PLACEHOLDER_ABERTO);
    expect(campo().props.editable).toBe(true);
  });

  it('só espaços não é pergunta: o campo travado mostra o caminho, não o aviso de pergunta', async () => {
    await abrir();
    fireEvent.changeText(campo(), '   ');
    embaralharCartas();
    expect(screen.getByText(AVISO_SEM_PERGUNTA)).toBeTruthy();
    expect(screen.queryByText(AVISO_DA_PERGUNTA)).toBeNull();
  });

  it('com a leitura posta, a tela diz que recomeçar volta ao embaralhamento', async () => {
    // "Recomeçar o rito" já não leva ao corte: leva ao gesto de embaralhar. A frase do
    // estado "lido" tem de dizer o que o botão faz hoje.
    await abrir();
    embaralharCartas(); cortar(); irParaLeitura();
    await distribuir(3);
    expect(screen.getByText(
      'Toque em "Recomeçar o rito" para embaralhar e cortar outra vez.'
    )).toBeTruthy();
    expect(screen.queryByText(/para cortar outra vez/)).toBeNull();
  });

  it('recomeçar devolve a edição ao campo, e a pergunta escrita continua lá', async () => {
    // Recomeçar é o único caminho para mudar a pergunta depois do embaralhamento: o
    // campo volta a aceitar texto, sem castigar a pessoa com a digitação de novo.
    await abrir();
    fireEvent.changeText(campo(), 'devo aceitar a proposta');
    embaralharCartas();
    expect(campo().props.editable).toBe(false);

    fireEvent.press(screen.getByText('Recomeçar o rito'));
    expect(campo().props.editable).toBe(true);
    expect(campo().props.value).toBe('devo aceitar a proposta');
    expect(screen.queryByText(AVISO_DA_PERGUNTA)).toBeNull();

    fireEvent.changeText(campo(), 'devo recusar a proposta');
    expect(campo().props.value).toBe('devo recusar a proposta');
  });

  it('oferece as duas tiragens antes de cortar', async () => {
    await abrir();
    expect(screen.getByLabelText(/Três cartas, 3 cartas/)).toBeTruthy();
    expect(screen.getByLabelText('Cruz Celta, 10 cartas')).toBeTruthy();
  });

  it('depois do primeiro corte não dá mais para trocar de tiragem', async () => {
    // Os cortes já foram dados sobre uma tiragem. Trocar ali embaixo faria outra coisa.
    await abrir();
    embaralharCartas(); cortar();
    expect(screen.queryByLabelText('Cruz Celta, 10 cartas')).toBeNull();
  });

  it('a Cruz Celta abre dez posições, com as perguntas do protótipo', async () => {
    await abrir();
    escolherCruzCelta();
    embaralharCartas(); cortar(); irParaLeitura();
    expect(screen.getAllByLabelText(/^Posição .*, vazia$/)).toHaveLength(10);
    expect(screen.getByText('o assunto como ele está')).toBeTruthy();
    expect(screen.getByText('o desfecho provável se o caminho seguir assim')).toBeTruthy();
  });

  it('trocar de tiragem redimensiona a tiragem inteira', async () => {
    // O defeito que isto pega: guardar três vagas e trocar para a Cruz Celta. Com três
    // cartas puxadas o rito se daria por completo, e a leitura sairia com sete posições
    // vazias que a pessoa nunca viu.
    await abrir();
    escolherCruzCelta();
    embaralharCartas(); cortar(); irParaLeitura();
    for (let i = 0; i < 3; i++) puxar();
    await waitFor(() => expect(screen.getByText(/Faltam 7 cartas\./)).toBeTruthy());
    expect(screen.queryByText('Ver Leitura Completa')).toBeNull();
  });

  it('a tiragem escolhida viaja até o resultado, com a pergunta de cada posição', async () => {
    await abrir();
    escolherCruzCelta();
    embaralharCartas(); cortar(); irParaLeitura();
    await distribuir(10);
    seguir();
    const enviadas = JSON.parse(mockPush.mock.calls[0][0].params.posicoes);
    expect(enviadas).toHaveLength(10);
    expect(enviadas[0].nome).toBe('A situação');
    expect(enviadas[0].regra).toBe('o assunto como ele está');
  });

  it('sem intenção escrita, nada é afirmado sobre ela', async () => {
    await abrir();
    embaralharCartas(); cortar(); irParaLeitura();
    expect(screen.getByText(/Você não disse o que trouxe/)).toBeTruthy();
    await distribuir(3);
    seguir();
    expect(mockPush.mock.calls[0][0].params.intencao).toBe('');
  });

  it('a intenção escrita aparece na tela e chega inteira ao resultado', async () => {
    await abrir();
    fireEvent.changeText(screen.getByLabelText(CAMPO_INTENCAO), '  devo aceitar a proposta  ');
    embaralharCartas(); cortar(); irParaLeitura();
    expect(screen.getByText('Leitura sobre: devo aceitar a proposta')).toBeTruthy();
    await distribuir(3);
    seguir();
    expect(mockPush.mock.calls[0][0].params.intencao).toBe('devo aceitar a proposta');
  });
});
