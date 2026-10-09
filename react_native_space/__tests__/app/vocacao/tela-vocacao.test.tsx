import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

// Rota, área segura e háptico se mockam como em `consulta/rito-do-taro.test.tsx`; o
// perfil, como em `home-cadeado.test.tsx` (o rito não lê perfil nem plano, então é lá
// que este repositório já mostra como). O mapa NÃO é mockado: a tela roda o motor de
// verdade sobre o perfil falso, e é isso que torna "meio do céu em Leão" uma afirmação.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('../../../utils/haptics', () => ({
  Hapticos: { impactoLeve: jest.fn(), impactoMedio: jest.fn(), selecao: jest.fn() },
}));

// Os ícones viram nada, como em `home-cadeado.test.tsx`: o componente real gera aviso de
// "not wrapped in act(...)", e nenhuma asserção daqui olha ícone.
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

interface CidadeFalsa {
  id: string; nome: string; uf: string; pais: string;
  lat: number; lon: number; fuso: string; offsetPadrao: number;
}
interface PerfilFalso {
  data_nascimento: string | null;
  nascimento_hora: string | null;
  nascimento_sem_hora: boolean;
  nascimento_cidade: CidadeFalsa | null;
  // Só o `SemaforoUso` lê estes três, e só quando há sessão.
  plano?: string;
  plano_valido_ate?: string | null;
  is_super_admin?: boolean;
}

// `let`, e não `const`: o mock lê o valor no momento da chamada, e cada teste monta o seu.
// `sessao` nula por padrão, de propósito: sem sessão o `SemaforoUso` não renderiza nada
// nem vai ao banco ler o uso do dia. O teste do cadeado põe uma sessão com acesso vencido,
// caminho que o `SemaforoUso` resolve antes de `lerUsoDoDia`, então também não toca o banco.
let mockPerfil: PerfilFalso | null = null;
let mockCarregando = false;
let mockSessao: { user: { id: string } } | null = null;
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ perfil: mockPerfil, sessao: mockSessao, carregando: mockCarregando }),
}));

// O gate só abre para `mapa_completo`. Responder "sim" a qualquer recurso deixaria a tela
// trocar de recurso (`consulta_premium`, por exemplo) sem que teste nenhum notasse.
let mockAcesso = false;
// `podeFazerConsulta` é a aproximação que o app já usa para "a cota do plano ainda cobre":
// só a frase do crédito a consulta. Falso por padrão, que é o do comprador sem plano.
let mockPodeConsultar = false;
jest.mock('../../../hooks/usePlano', () => ({
  usePlano: () => ({
    temAcesso: (recurso: string) => recurso === 'mapa_completo' && mockAcesso,
    podeFazerConsulta: () => mockPodeConsultar,
  }),
}));

const mockGerarLeitura = jest.fn();
jest.mock('../../../services/ia', () => ({
  gerarLeituraDeVocacao: (...a: unknown[]) => mockGerarLeitura(...a),
}));

// O hook do crédito é mockado inteiro, e não o `expo-router` ganhando um `useFocusEffect`:
// o que esta tela precisa saber é "quantos créditos de vocação a pessoa tem", e a releitura
// ao ganhar foco já tem teste próprio em `hooks/__tests__/useCreditoAvulso.test.tsx`. O
// mock responde só pela vocação, como o hook real, para a tela não ler o crédito do mapa.
let mockCreditos: Record<string, number> = {};
let mockGastou: Record<string, boolean> = {};
let mockFalhou = false;
let mockLendo = false;
jest.mock('../../../hooks/useCreditoAvulso', () => ({
  useCreditoAvulso: (oraculo: string) => ({
    credito: mockCreditos[oraculo] ?? 0,
    gastou: mockGastou[oraculo] ?? false,
    falhou: mockFalhou,
    lendo: mockLendo,
  }),
}));

let mockMoeda = 'brl';
jest.mock('../../../services/stripe', () => ({
  moedaPadrao: () => mockMoeda,
}));

const mockComprar = jest.fn();
jest.mock('../../../services/avulso', () => ({
  comprarAvulso: (...a: unknown[]) => mockComprar(...a),
}));

const mockAlerta = jest.fn();
jest.mock('../../../utils/alerta', () => ({
  mostrarAlerta: (...a: unknown[]) => mockAlerta(...a),
}));

import { Linking, StyleSheet } from 'react-native';
import { Cores } from '../../../constants/colors';
import TelaVocacao from '../../../app/vocacao/index';

const SAO_PAULO: CidadeFalsa = {
  id: 'sao-paulo-sp', nome: 'São Paulo', uf: 'SP', pais: 'Brasil',
  lat: -23.55, lon: -46.63, fuso: 'America/Sao_Paulo', offsetPadrao: -180,
};

// Acima do círculo polar o sistema de casas se desfaz, mas a hora é conhecida: é o único
// caso em que `comCasas` é falso COM hora, e a frase de "sem hora" seria mentira.
const TROMSO: CidadeFalsa = {
  id: 'tromso-no', nome: 'Tromsø', uf: '', pais: 'Noruega',
  lat: 69.65, lon: 18.96, fuso: 'Europe/Oslo', offsetPadrao: 60,
};

function renderComPlano(opcoes: {
  temAcesso: boolean;
  semHora?: boolean;
  /** Hora nula SEM `nascimento_sem_hora`: a pessoa nunca respondeu sobre a hora. */
  horaNula?: boolean;
  perfilVazio?: boolean;
  /** Ninguém logado, ou a busca do perfil falhou: o app não tem perfil nenhum. */
  semPerfil?: boolean;
  /** Sessão aberta, plano pago, mas `plano_valido_ate` no passado. */
  acessoVencido?: boolean;
  /**
   * Sessão aberta, plano `gratuito` e sem validade: o perfil que a compra avulsa deixa, e
   * o que o semáforo de verdade acusa como "acesso vencido" se ninguém o avisar do crédito.
   */
  compradorSemPlano?: boolean;
  cidade?: CidadeFalsa;
}) {
  const {
    temAcesso, semHora = false, horaNula = false, perfilVazio = false,
    semPerfil = false, acessoVencido = false, compradorSemPlano = false, cidade = SAO_PAULO,
  } = opcoes;
  mockAcesso = temAcesso;
  // Os quatro campos que `app/mapa-astral/index.tsx` grava. Sem hora, ele grava a hora
  // nula e `nascimento_sem_hora` verdadeiro, e este fixture faz o mesmo.
  mockPerfil = perfilVazio
    ? {
      data_nascimento: null, nascimento_hora: null,
      nascimento_sem_hora: false, nascimento_cidade: null,
    }
    : {
      data_nascimento: '1990-07-15',
      nascimento_hora: semHora || horaNula ? null : '14:30',
      nascimento_sem_hora: semHora,
      nascimento_cidade: cidade,
    };
  if (semPerfil) mockPerfil = null;
  if (acessoVencido && mockPerfil) {
    mockSessao = { user: { id: 'u1' } };
    mockPerfil = {
      ...mockPerfil, plano: 'iniciante', plano_valido_ate: '2020-01-01T00:00:00Z', is_super_admin: false,
    };
  }
  if (compradorSemPlano && mockPerfil) {
    mockSessao = { user: { id: 'u1' } };
    mockPerfil = {
      ...mockPerfil, plano: 'gratuito', plano_valido_ate: null, is_super_admin: false,
    };
  }
  return render(<TelaVocacao />);
}

/** Todo texto da tela, na ordem em que aparece de cima para baixo. */
function textosNaOrdem(): string[] {
  const saida: string[] = [];
  const percorrer = (no: unknown): void => {
    if (typeof no === 'string') { saida.push(no); return; }
    if (Array.isArray(no)) { no.forEach(percorrer); return; }
    if (no && typeof no === 'object' && 'children' in no) {
      percorrer((no as { children: unknown }).children);
    }
  };
  percorrer(screen.toJSON());
  return saida;
}

const LEITURA = {
  titulo: 'Quem constrói à vista',
  ondeRende: 'Texto da direção.',
  ambiente: 'Texto do ambiente.',
  drena: 'Texto do desgaste.',
  passo: 'Texto do passo.',
};

let abrirURL: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  mockCarregando = false;
  mockSessao = null;
  mockCreditos = {};
  mockGastou = {};
  mockFalhou = false;
  mockLendo = false;
  mockPodeConsultar = false;
  mockMoeda = 'brl';
  mockGerarLeitura.mockResolvedValue(LEITURA);
  mockComprar.mockResolvedValue('https://checkout.stripe.com/c/pay/cs_teste');
  abrirURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => { abrirURL.mockRestore(); });

describe('tela de vocação', () => {
  it('sem plano, mostra o meio do céu e não mostra a leitura', () => {
    // É a vitrine: a parte grátis tem de aparecer ANTES de pedir dinheiro. Se ela
    // sumir, o card vira cadeado puro e a decisão 3 do dono deixa de valer.
    renderComPlano({ temAcesso: false });
    expect(screen.getByText('Seu Meio do Céu')).toBeTruthy();
    expect(screen.queryByText(/Onde você rende/i)).toBeNull();
  });

  it('com plano, o botão da leitura aparece', () => {
    renderComPlano({ temAcesso: true });
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
  });

  it('sem hora de nascimento, a tela diz isso em voz alta', () => {
    // Entregar menos calado é o defeito que `comCasas` foi criado para evitar.
    renderComPlano({ temAcesso: true, semHora: true });
    expect(screen.getByText(/a leitura sai sem as casas/)).toBeTruthy();
  });

  it('sem dados de nascimento, manda para o mapa astral em vez de pedir de novo', () => {
    renderComPlano({ temAcesso: true, perfilVazio: true });
    expect(screen.getByText(/Mapa Astral/i)).toBeTruthy();
    expect(screen.queryByText(/Meio do céu/i)).toBeNull();
  });

  // A partir daqui, o que o brief não escreveu e o resto do contrato exige.

  it('a parte grátis traz o signo do meio do céu e a frase da casa 10', () => {
    // O título sozinho passaria com a tela mostrando "Meio do Céu" e nenhum signo. Para
    // 15/07/1990, 14:30, em São Paulo, o meio do céu cai em Leão (RAMC perto de 146°).
    renderComPlano({ temAcesso: false });
    expect(screen.getByText('Leão')).toBeTruthy();
    expect(screen.getByText(/O meio do céu e a casa 10 são a carreira/)).toBeTruthy();
  });

  it('enquanto o perfil carrega, não diz que faltam os dados de nascimento', () => {
    // O app define a sessão e só depois busca o perfil: nesse intervalo `perfil` é nulo
    // para quem TEM os dados guardados. Mandá-lo "gerar o mapa" seria uma frase falsa.
    mockAcesso = true;
    mockPerfil = null;
    mockCarregando = true;
    render(<TelaVocacao />);
    expect(screen.queryByText(/Mapa Astral/i)).toBeNull();
    expect(screen.queryByText(/Falta o seu mapa natal/i)).toBeNull();
  });

  it('sem perfil nenhum, a tela não afirma a causa e oferece entrar, não o mapa astral', () => {
    // Sem login, `perfil` é nulo (e também quando a busca do perfil falhou). A tela não
    // sabe qual dos dois, então não pode dizer que "faltam dados". E mandar quem não
    // entrou gerar o mapa é um beco sem saída: `mapa-astral/index.tsx` só grava no perfil
    // `if (perfil)`, e a pessoa volta para esta mesma frase, para sempre.
    renderComPlano({ temAcesso: true, semPerfil: true });
    expect(screen.getByText(/Não consegui abrir o seu perfil/)).toBeTruthy();
    expect(screen.queryByText(/falta a data ou a cidade/i)).toBeNull();
    expect(screen.queryByText(/Mapa Astral/i)).toBeNull();
    expect(screen.queryByText(/Meio do céu/i)).toBeNull();

    fireEvent.press(screen.getByText('Entrar na minha conta'));
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
    expect(mockPush).not.toHaveBeenCalledWith('/mapa-astral');
  });

  it('perfil presente sem data ou cidade: diz o que falta e manda para o mapa astral', () => {
    // O estado que a frase "falta a data ou a cidade" de fato descreve. Separado do teste
    // acima para uma edição futura não fundir os dois outra vez: aqui há perfil, e é a
    // única situação em que o formulário do mapa astral resolve.
    renderComPlano({ temAcesso: true, perfilVazio: true });
    expect(screen.getByText(/falta a data ou a cidade/i)).toBeTruthy();
    expect(screen.queryByText(/Não consegui abrir o seu perfil/)).toBeNull();
    expect(screen.queryByText('Entrar na minha conta')).toBeNull();
  });

  it('data e cidade guardadas, mas o cálculo falha: não diz que os dados faltam', () => {
    // A cidade guardada sem fuso faz `montarMapaAstral` lançar. O perfil TEM data e
    // cidade, então "falta a data ou a cidade" seria falso; a saída certa é revisar os
    // dados no formulário, que já vem preenchido com o que está guardado.
    renderComPlano({ temAcesso: true, cidade: { ...SAO_PAULO, fuso: '' } });
    expect(screen.getByText(/Não deu para calcular o seu mapa/)).toBeTruthy();
    expect(screen.queryByText(/falta a data ou a cidade/i)).toBeNull();
    expect(screen.queryByText(/Meio do céu/i)).toBeNull();

    fireEvent.press(screen.getByText('Revisar no Mapa Astral'));
    expect(mockPush).toHaveBeenCalledWith('/mapa-astral');
  });

  it('com o acesso vencido, o cadeado do semáforo aparece ANTES do botão da leitura', () => {
    // O `SemaforoUso` sem sessão não renderiza nada, então apagar a linha deixava os
    // testes todos verdes. Com sessão e `plano_valido_ate` no passado ele resolve o
    // cadeado antes de qualquer ida ao banco. `temAcesso` segue verdadeiro, como no app:
    // ele olha o nome do plano, não a validade, e é o cadeado que avisa antes do toque.
    renderComPlano({ temAcesso: true, acessoVencido: true });
    expect(screen.getByLabelText('Acesso vencido')).toBeTruthy();
    const textos = textosNaOrdem();
    const cadeado = textos.findIndex((t) => /Seu acesso terminou/.test(t));
    const botao = textos.findIndex((t) => /Ler minha vocação/i.test(t));
    expect(cadeado).toBeGreaterThanOrEqual(0);
    expect(botao).toBeGreaterThanOrEqual(0);
    expect(cadeado).toBeLessThan(botao);
  });

  it('sem sessão, o semáforo não aparece', () => {
    renderComPlano({ temAcesso: true });
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
  });

  it('sem dados, o botão leva ao mapa astral', () => {
    renderComPlano({ temAcesso: false, perfilVazio: true });
    fireEvent.press(screen.getByText(/Mapa Astral/i));
    expect(mockPush).toHaveBeenCalledWith('/mapa-astral');
  });

  it('sem plano, no lugar do botão vai a chamada para os planos', () => {
    renderComPlano({ temAcesso: false });
    expect(screen.queryByText(/Ler minha vocação/i)).toBeNull();
    fireEvent.press(screen.getByText('Ver os planos'));
    expect(mockPush).toHaveBeenCalledWith('/planos');
  });

  it('o aviso de falta de hora vem ANTES do botão, não depois', () => {
    // O teste de presença passaria com o aviso embaixo do botão, que é onde ninguém
    // lê: quem toca no botão já decidiu sem saber que a leitura sai mais curta.
    renderComPlano({ temAcesso: true, semHora: true });
    const textos = textosNaOrdem();
    const aviso = textos.findIndex((t) => /a leitura sai sem as casas/.test(t));
    const botao = textos.findIndex((t) => /Ler minha vocação/i.test(t));
    expect(aviso).toBeGreaterThanOrEqual(0);
    expect(botao).toBeGreaterThanOrEqual(0);
    expect(aviso).toBeLessThan(botao);
  });

  it('hora nula sem o sinal de "não sei a hora" também é sem hora: nenhum meio do céu vira da pessoa', async () => {
    // O perfil tem data e cidade, mas `nascimento_hora` é nula e `nascimento_sem_hora` NÃO
    // é verdadeiro. A hora nula É a ausência da hora; confiar só no sinal montaria um mapa
    // do meio-dia, com `comCasas: true`, e a vitrine mostraria o meio do céu do meio-dia
    // como se fosse o da pessoa. Hoje nenhuma tela grava esse perfil; a garantia vale só
    // até a próxima tela que gravar dado de perfil.
    renderComPlano({ temAcesso: true, horaNula: true });
    expect(screen.getByText(/a leitura sai sem as casas/)).toBeTruthy();
    expect(screen.getByText(/depende da hora/i)).toBeTruthy();
    // O grau só aparece junto do signo do meio do céu: sem ele, nada foi apresentado.
    expect(screen.queryByText(/°/)).toBeNull();

    fireEvent.press(screen.getByText(/Ler minha vocação/i));
    await waitFor(() => expect(screen.getByText('Onde você rende')).toBeTruthy());
    const pedido = mockGerarLeitura.mock.calls[0][0];
    expect(pedido.meioDoCeu).toBeNull();
    expect(pedido.comCasas).toBe(false);
  });

  it('com hora, a tela não diz que falta a hora', () => {
    renderComPlano({ temAcesso: true });
    expect(screen.queryByText(/a leitura sai sem as casas/)).toBeNull();
  });

  it('lugar polar com hora: as casas somem, mas a tela não culpa a hora', () => {
    // `comCasas` é falso aqui, e dizer "sem a hora" a quem informou a hora seria uma
    // falsidade pior que o silêncio. O meio do céu continua: existe com a hora.
    renderComPlano({ temAcesso: true, cidade: TROMSO });
    expect(screen.queryByText(/a leitura sai sem as casas/)).toBeNull();
    expect(screen.getByText(/não se aplica/i)).toBeTruthy();
    expect(screen.getByText('Seu Meio do Céu')).toBeTruthy();
  });

  it('o botão pede a leitura só com as posições e mostra as quatro seções', async () => {
    renderComPlano({ temAcesso: true });
    fireEvent.press(screen.getByText(/Ler minha vocação/i));

    await waitFor(() => expect(screen.getByText('Onde você rende')).toBeTruthy());
    expect(screen.getByText('O ambiente que te sustenta')).toBeTruthy();
    expect(screen.getByText('O que te drena')).toBeTruthy();
    expect(screen.getByText('O próximo passo')).toBeTruthy();
    for (const texto of [LEITURA.titulo, LEITURA.ondeRende, LEITURA.ambiente, LEITURA.drena, LEITURA.passo]) {
      expect(screen.getByText(texto)).toBeTruthy();
    }

    expect(mockGerarLeitura).toHaveBeenCalledTimes(1);
    const pedido = mockGerarLeitura.mock.calls[0][0];
    expect(pedido.meioDoCeu).toEqual({ signo: 'Leão', grau: expect.any(Number) });
    expect(pedido.comCasas).toBe(true);
    expect(pedido.pecas.length).toBeGreaterThan(0);
    for (const peca of pedido.pecas) expect(typeof peca).toBe('string');
    expect(pedido.pecas).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Casa 10 — Carreira: /)]),
    );
    // Data, hora e cidade ficam no aparelho; só o que o motor calculou sobe.
    expect(JSON.stringify(pedido)).not.toMatch(/1990|14:30|São Paulo/);
  });

  it('sem hora, o pedido à IA também diz que não há meio do céu nem casas', async () => {
    // O aviso na tela não basta se o texto que a IA escreve ignora a falta: a leitura
    // sairia com casas inventadas. `comCasas: true` aqui seria "entregar menos calado".
    renderComPlano({ temAcesso: true, semHora: true });
    fireEvent.press(screen.getByText(/Ler minha vocação/i));
    // Espera a resposta pousar: um `setState` depois do fim do teste vira aviso de `act`.
    await waitFor(() => expect(screen.getByText('Onde você rende')).toBeTruthy());
    expect(mockGerarLeitura).toHaveBeenCalledTimes(1);
    const pedido = mockGerarLeitura.mock.calls[0][0];
    expect(pedido.meioDoCeu).toBeNull();
    expect(pedido.comCasas).toBe(false);
    expect(pedido.pecas.join('\n')).not.toMatch(/Casa 10|Casa 6/);
  });

  it('dois toques seguidos pedem a leitura uma vez só', () => {
    // Cada leitura gasta cota do período. A segunda chamada, com a primeira ainda no ar,
    // seria dinheiro (ou consulta) gasto por um toque duplo.
    mockGerarLeitura.mockReturnValue(new Promise(() => {}));
    renderComPlano({ temAcesso: true });
    fireEvent.press(screen.getByText(/Ler minha vocação/i));
    fireEvent.press(screen.getByText(/Lendo a sua vocação/i));
    expect(mockGerarLeitura).toHaveBeenCalledTimes(1);
  });

  it('se a leitura falha, mostra a mensagem do servidor e o botão continua à mão', async () => {
    mockGerarLeitura.mockRejectedValue(new Error('Suas consultas deste período acabaram.'));
    renderComPlano({ temAcesso: true });
    fireEvent.press(screen.getByText(/Ler minha vocação/i));

    await waitFor(() =>
      expect(screen.getByText('Suas consultas deste período acabaram.')).toBeTruthy(),
    );
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
    expect(screen.queryByText('Onde você rende')).toBeNull();
  });
});

/**
 * O que a revisão final da entrega pegou, já no ar.
 *
 * Dois buracos na parte que não custa nada: a casa 10 prometida e não mostrada, e o
 * aviso da Lua que a tela do mapa astral dá desde sempre e esta não dava — justamente
 * aqui, que é onde um aspecto da Lua vira prosa paga.
 */
describe('o que a parte grátis promete, ela mostra', () => {
  it('com hora, a casa 10 da PESSOA aparece, e não só a definição dela', () => {
    // O card na home diz "o meio do céu e a casa 10 seguem abertos" e a spec promete o
    // mesmo. Antes disto o que vinha de graça era a frase genérica de `areas.ts`, igual
    // para todo mundo — a promessa do card era falsa.
    renderComPlano({ temAcesso: false });
    expect(screen.getByText(/Casa 10 — Carreira:/)).toBeTruthy();
  });

  it('sem hora não há cúspide, então a linha da casa 10 não aparece', () => {
    // O contrapeso: inventar uma cúspide sem hora seria o mesmo defeito do meio do céu
    // do meio-dia, que esta entrega já corrigiu uma vez.
    renderComPlano({ temAcesso: false, semHora: true });
    expect(screen.queryByText(/Casa 10 — Carreira:/)).toBeNull();
  });

  it('sem hora, a tela diz que os aspectos da Lua ficaram de fora', () => {
    // Eles saem de verdade (`aspectosSemALua`), e sumir calado é pior que entregar
    // menos — é a mesma regra que vale para as casas, logo acima na tela.
    renderComPlano({ temAcesso: true, semHora: true });
    expect(screen.getByText(/Os aspectos da Lua ficaram de fora/)).toBeTruthy();
  });

  it('com hora, nada se diz sobre a Lua', () => {
    renderComPlano({ temAcesso: true });
    expect(screen.queryByText(/aspectos da Lua/)).toBeNull();
  });

  it('sem hora, nenhum aspecto da Lua chega ao servidor', () => {
    // O teste que importa: o aviso na tela é explicação, não conserto. Quem não pode
    // vazar é o payload, porque é dele que a prosa paga é escrita. A Lua não está em
    // `CORPOS_DA_VOCACAO`, então "Lua" só apareceria vindo de um aspecto.
    renderComPlano({ temAcesso: true, semHora: true });
    fireEvent.press(screen.getByText(/Ler minha vocação/i));

    const enviado = mockGerarLeitura.mock.calls[0][0] as { pecas: string[] };
    expect(enviado.pecas.filter((p) => /Lua/.test(p))).toEqual([]);
  });
});

/**
 * A compra avulsa: quem paga uma leitura, sem plano, tem de poder gastá-la aqui.
 *
 * O portão da leitura olhava só o plano (`temAcesso('mapa_completo')`), e quem compra
 * volta da Stripe sem plano nenhum. Sem estes testes, o produto cobraria e a tela
 * continuaria mostrando o cadeado.
 */
describe('compra avulsa na vocação', () => {
  it('sem plano e COM crédito, o botão da leitura aparece no lugar do cadeado', () => {
    mockCreditos = { vocacao: 1 };
    renderComPlano({ temAcesso: false });
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
    // Nem a chamada para os planos nem uma segunda compra: o direito já está pago.
    expect(screen.queryByText('Ver os planos')).toBeNull();
    expect(screen.queryByText('Comprar só esta leitura')).toBeNull();
  });

  it('sem plano e com crédito, tocar na leitura pede a leitura e mostra as seções', async () => {
    mockCreditos = { vocacao: 1 };
    renderComPlano({ temAcesso: false });
    fireEvent.press(screen.getByText(/Ler minha vocação/i));

    await waitFor(() => expect(screen.getByText('Onde você rende')).toBeTruthy());
    expect(mockGerarLeitura).toHaveBeenCalledTimes(1);
  });

  it('crédito de mapa não abre a leitura de vocação', () => {
    // Cada crédito paga uma leitura de UM produto. Se o portão contasse o de mapa, a
    // pessoa tocaria em "Ler minha vocação" e o servidor recusaria, depois de a tela
    // dizer que ela podia.
    mockCreditos = { mapa: 1 };
    renderComPlano({ temAcesso: false });
    expect(screen.queryByText(/Ler minha vocação/i)).toBeNull();
    expect(screen.getByText('Comprar só esta leitura')).toBeTruthy();
  });

  it('o comprador sem plano não lê "Seu acesso terminou" acima do botão que funciona', () => {
    // O perfil que a compra deixa é `gratuito`, sem validade, e é o que o cadeado acusa.
    // Aqui o semáforo é o de verdade, com sessão aberta: a tela entrega o crédito a ele, e
    // ele diz que há leitura em vez de dizer que o acesso acabou.
    mockCreditos = { vocacao: 2 };
    renderComPlano({ temAcesso: false, compradorSemPlano: true });
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
    expect(screen.queryByText(/acesso terminou/)).toBeNull();
    expect(screen.getByText('Aprofundamentos: você tem 2 leituras avulsas para usar.')).toBeTruthy();
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
  });

  it('sem crédito, o cadeado do semáforo segue acusando o acesso vencido', () => {
    // O contrapeso: o desvio é do crédito, não de todo perfil sem plano.
    renderComPlano({ temAcesso: true, compradorSemPlano: true });
    expect(screen.getByLabelText('Acesso vencido')).toBeTruthy();
  });

  it('antes do botão, diz que ler agora usa uma das leituras avulsas', () => {
    mockCreditos = { vocacao: 1 };
    renderComPlano({ temAcesso: false });
    const textos = textosNaOrdem();
    const frase = textos.findIndex((t) => /Ler agora usa uma das suas leituras avulsas/.test(t));
    const botao = textos.findIndex((t) => /Ler minha vocação/i.test(t));
    expect(frase).toBeGreaterThanOrEqual(0);
    expect(botao).toBeGreaterThanOrEqual(0);
    // Depois do botão, quem tocou já gastou sem saber.
    expect(frase).toBeLessThan(botao);
  });

  it('com cota no plano, a frase do crédito não aparece: o servidor gasta a cota primeiro', () => {
    // A frase é uma afirmação sobre dinheiro. Dizer "usa uma leitura avulsa" a quem o
    // servidor cobraria da cota é dizer que gastou o que não gastou.
    mockCreditos = { vocacao: 1 };
    mockPodeConsultar = true;
    renderComPlano({ temAcesso: true });
    expect(screen.queryByText(/Ler agora usa uma das suas leituras avulsas/)).toBeNull();
  });

  it('sem plano mas com cota sobrando, a frase também não aparece', () => {
    mockCreditos = { vocacao: 1 };
    mockPodeConsultar = true;
    renderComPlano({ temAcesso: false });
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
    expect(screen.queryByText(/Ler agora usa uma das suas leituras avulsas/)).toBeNull();
  });

  it('plano sem cota e com crédito: o servidor cobra do crédito, e a frase aparece', () => {
    mockCreditos = { vocacao: 1 };
    mockPodeConsultar = false;
    renderComPlano({ temAcesso: true });
    expect(screen.getByText(/Ler agora usa uma das suas leituras avulsas/)).toBeTruthy();
  });

  it('sem crédito, a frase do crédito não aparece', () => {
    renderComPlano({ temAcesso: true });
    expect(screen.queryByText(/leituras avulsas/)).toBeNull();
  });

  it('sem plano e sem crédito, oferece a compra avulsa DEPOIS dos planos', () => {
    renderComPlano({ temAcesso: false });
    expect(screen.queryByText(/Ler minha vocação/i)).toBeNull();
    const textos = textosNaOrdem();
    const planos = textos.indexOf('Ver os planos');
    const avulso = textos.indexOf('Comprar só esta leitura');
    expect(planos).toBeGreaterThanOrEqual(0);
    expect(avulso).toBeGreaterThanOrEqual(0);
    // A assinatura segue sendo a oferta principal; a avulsa é a segunda saída.
    expect(planos).toBeLessThan(avulso);
  });

  it('o botão de comprar é texto puro: sem a borda do botão de assinatura', () => {
    // A assinatura é a oferta principal e isso tem de se ver. "Ver os planos" é botão de
    // borda; a compra avulsa, não.
    renderComPlano({ temAcesso: false });
    const compra = StyleSheet.flatten(screen.getByLabelText('Comprar só esta leitura').props.style);
    const planos = StyleSheet.flatten(screen.getByLabelText('Ver os planos').props.style);
    expect(planos.borderWidth).toBe(1);
    expect(compra.borderWidth).toBeUndefined();
    expect(compra.backgroundColor).toBeUndefined();
    const texto = StyleSheet.flatten(screen.getByText('Comprar só esta leitura').props.style);
    expect(texto.fontSize).toBe(13);
    expect(texto.color).toBe(Cores.textoSecundario);
  });

  it('diz o prazo do direito e que a leitura gerada fica, antes de a pessoa pagar', () => {
    renderComPlano({ temAcesso: false });
    expect(screen.getByText(/O direito de gerar vale 90 dias/)).toBeTruthy();
    expect(screen.getByText(/depois de gerada, fica no seu histórico enquanto sua conta existir/)).toBeTruthy();
  });

  it('tocar em comprar pede o checkout da vocação e abre o endereço que voltou', async () => {
    renderComPlano({ temAcesso: false });
    fireEvent.press(screen.getByText('Comprar só esta leitura'));

    await waitFor(() =>
      expect(abrirURL).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_teste'),
    );
    // O produto certo: comprar `mapa` aqui entregaria um crédito que esta tela não gasta.
    expect(mockComprar).toHaveBeenCalledWith('vocacao', 'brl');
    expect(mockAlerta).not.toHaveBeenCalled();
  });

  it('pede o checkout na moeda de quem compra, e não sempre em reais', async () => {
    mockMoeda = 'eur';
    renderComPlano({ temAcesso: false });
    fireEvent.press(screen.getByText('Comprar só esta leitura'));

    await waitFor(() => expect(mockComprar).toHaveBeenCalledWith('vocacao', 'eur'));
  });

  it('dois toques seguidos abrem um checkout só', () => {
    // Cada checkout aberto pode virar uma compra. O segundo toque, com o primeiro ainda
    // abrindo, seria dinheiro cobrado por um toque duplo.
    mockComprar.mockReturnValue(new Promise(() => {}));
    renderComPlano({ temAcesso: false });
    fireEvent.press(screen.getByText('Comprar só esta leitura'));
    fireEvent.press(screen.getByText('Abrindo o pagamento…'));

    expect(mockComprar).toHaveBeenCalledTimes(1);
  });

  it('se o pagamento não abre, a pessoa lê o motivo, nenhum endereço é aberto e o botão volta', async () => {
    mockComprar.mockRejectedValueOnce(new Error('O pagamento não abriu. Tente de novo.'));
    renderComPlano({ temAcesso: false });
    fireEvent.press(screen.getByText('Comprar só esta leitura'));

    await waitFor(() => expect(mockAlerta).toHaveBeenCalledWith(
      'Não foi possível abrir o pagamento', 'O pagamento não abriu. Tente de novo.',
    ));
    expect(abrirURL).not.toHaveBeenCalled();

    // Dá para tentar de novo.
    await waitFor(() => expect(screen.getByText('Comprar só esta leitura')).toBeTruthy());
    fireEvent.press(screen.getByText('Comprar só esta leitura'));
    await waitFor(() => expect(mockComprar).toHaveBeenCalledTimes(2));
  });

  it('com plano, a compra avulsa não é oferecida', () => {
    renderComPlano({ temAcesso: true });
    expect(screen.queryByText('Comprar só esta leitura')).toBeNull();
  });
});

/**
 * Quem já gastou um crédito: a leitura que ele pagou mora no servidor e "fica para
 * sempre" (promessa dos Termos). Na tela ela é estado local, e sair da tela a apaga. Com o
 * portão fechado, a pessoa leria a promessa e, logo abaixo, uma oferta de pagar de novo.
 */
describe('quem já gastou um crédito de vocação', () => {
  it('sem plano e sem crédito, o botão da leitura segue aberto', () => {
    mockGastou = { vocacao: true };
    renderComPlano({ temAcesso: false });
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
    // O cartão trancado, que manda assinar para ler, não faz sentido para quem já pagou.
    expect(screen.queryByText('Ver os planos')).toBeNull();
  });

  it('tocar na leitura pede a leitura', async () => {
    mockGastou = { vocacao: true };
    renderComPlano({ temAcesso: false });
    fireEvent.press(screen.getByText(/Ler minha vocação/i));

    await waitFor(() => expect(screen.getByText('Onde você rende')).toBeTruthy());
    expect(mockGerarLeitura).toHaveBeenCalledTimes(1);
  });

  it('ainda pode comprar outra: os dados de nascimento podem ser outros', () => {
    // A tela mostra as duas coisas: "leia o que você já tem" e "compre outra".
    mockGastou = { vocacao: true };
    renderComPlano({ temAcesso: false });
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
    expect(screen.getByText('Comprar só esta leitura')).toBeTruthy();
  });

  it('a oferta de comprar vem DEPOIS do botão da leitura', () => {
    mockGastou = { vocacao: true };
    renderComPlano({ temAcesso: false });
    const textos = textosNaOrdem();
    const leitura = textos.findIndex((t) => /Ler minha vocação/i.test(t));
    const oferta = textos.indexOf('Comprar só esta leitura');
    expect(leitura).toBeGreaterThanOrEqual(0);
    expect(oferta).toBeGreaterThan(leitura);
  });

  it('o botão de comprar da tela aberta também compra a vocação', async () => {
    mockGastou = { vocacao: true };
    renderComPlano({ temAcesso: false });
    fireEvent.press(screen.getByText('Comprar só esta leitura'));
    await waitFor(() => expect(mockComprar).toHaveBeenCalledWith('vocacao', 'brl'));
  });

  it('com um crédito novo na mão, não oferece comprar de novo', () => {
    mockGastou = { vocacao: true };
    mockCreditos = { vocacao: 1 };
    renderComPlano({ temAcesso: false });
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
    expect(screen.queryByText('Comprar só esta leitura')).toBeNull();
  });

  it('sem crédito novo, não diz que ler gasta uma leitura avulsa', () => {
    // Quem só gastou o que tinha não tem mais o que gastar: a frase seria falsa.
    mockGastou = { vocacao: true };
    renderComPlano({ temAcesso: false });
    expect(screen.queryByText(/Ler agora usa uma das suas leituras avulsas/)).toBeNull();
  });

  it('com plano, não oferece a compra', () => {
    mockGastou = { vocacao: true };
    renderComPlano({ temAcesso: true });
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
    expect(screen.queryByText('Comprar só esta leitura')).toBeNull();
  });

  it('ter gastado um crédito de MAPA não abre a leitura de vocação', () => {
    mockGastou = { mapa: true };
    renderComPlano({ temAcesso: false });
    expect(screen.queryByText(/Ler minha vocação/i)).toBeNull();
    expect(screen.getByText('Ver os planos')).toBeTruthy();
  });
});

/**
 * Quando não dá para ler o que a pessoa tem. "Zero" por queda de rede pode ser quem já
 * pagou: esconder o botão dele é pior que mostrá-lo a quem não pagou, porque o servidor é
 * o portão de verdade e recusa quem não tem nada. E convidá-lo a comprar de novo é cobrar
 * duas vezes.
 */
describe('quando a leitura do crédito falha', () => {
  it('o botão da leitura abre, em vez de trancar quem talvez tenha pago', () => {
    mockFalhou = true;
    renderComPlano({ temAcesso: false });
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
    expect(screen.queryByText('Ver os planos')).toBeNull();
  });

  it('não convida a comprar', () => {
    mockFalhou = true;
    renderComPlano({ temAcesso: false });
    expect(screen.queryByText('Comprar só esta leitura')).toBeNull();
    expect(screen.queryByText(/O direito de gerar vale 90 dias/)).toBeNull();
  });

  it('nem quando também já gastou um crédito', () => {
    mockFalhou = true;
    mockGastou = { vocacao: true };
    renderComPlano({ temAcesso: false });
    expect(screen.queryByText('Comprar só esta leitura')).toBeNull();
  });

  it('tocar na leitura chega ao servidor, que decide', async () => {
    mockFalhou = true;
    renderComPlano({ temAcesso: false });
    fireEvent.press(screen.getByText(/Ler minha vocação/i));
    await waitFor(() => expect(screen.getByText('Onde você rende')).toBeTruthy());
    expect(mockGerarLeitura).toHaveBeenCalledTimes(1);
  });
});

/**
 * Antes da primeira resposta a tela não sabe se a pessoa já comprou. O portão não espera
 * (fica fechado e abre quando a resposta chega: um piscar de cartão trancado custa pouco), mas
 * a oferta de compra espera: oferecer uma compra que a pessoa já fez é cobrar duas vezes.
 */
describe('enquanto a primeira leitura do crédito não chega', () => {
  it('não convida a comprar', () => {
    mockLendo = true;
    renderComPlano({ temAcesso: false });
    expect(screen.queryByText('Comprar só esta leitura')).toBeNull();
    expect(screen.queryByText(/O direito de gerar vale 90 dias/)).toBeNull();
  });

  it('o portão fica fechado, sem esperar: o cartão trancado segue na tela', () => {
    mockLendo = true;
    renderComPlano({ temAcesso: false });
    expect(screen.queryByText(/Ler minha vocação/i)).toBeNull();
    expect(screen.getByText('Ver os planos')).toBeTruthy();
  });

  it('quando a resposta chega sem crédito, a oferta aparece', () => {
    mockLendo = true;
    const { rerender } = renderComPlano({ temAcesso: false });
    expect(screen.queryByText('Comprar só esta leitura')).toBeNull();

    mockLendo = false;
    rerender(<TelaVocacao />);
    expect(screen.getByText('Comprar só esta leitura')).toBeTruthy();
  });

  it('quando a resposta chega com crédito, o portão abre e a oferta nunca aparece', () => {
    mockLendo = true;
    const { rerender } = renderComPlano({ temAcesso: false });
    expect(screen.queryByText(/Ler minha vocação/i)).toBeNull();

    mockLendo = false;
    mockCreditos = { vocacao: 1 };
    rerender(<TelaVocacao />);
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
    expect(screen.queryByText('Comprar só esta leitura')).toBeNull();
  });

  it('quando a resposta chega com compra já gasta, o portão abre e a oferta aparece', () => {
    mockLendo = true;
    const { rerender } = renderComPlano({ temAcesso: false });

    mockLendo = false;
    mockGastou = { vocacao: true };
    rerender(<TelaVocacao />);
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
    expect(screen.getByText('Comprar só esta leitura')).toBeTruthy();
  });
});

/**
 * O semáforo não chuta: sem saber do crédito (lendo, ou a leitura falhou), não diz nada. O
 * cadeado afirmaria "acesso terminou" a quem pode ter acabado de pagar.
 */
describe('o semáforo quando não se sabe do crédito', () => {
  it('com a leitura falha, o comprador não lê "Seu acesso terminou" nem promessa de crédito', () => {
    mockFalhou = true;
    renderComPlano({ temAcesso: false, compradorSemPlano: true });
    // O botão da leitura abriu (o `falhou` abre o portão) e o semáforo ao lado fica calado.
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
    expect(screen.queryByText(/acesso terminou/)).toBeNull();
    expect(screen.queryByText(/leitura avulsa|leituras avulsas/)).toBeNull();
  });

  it('enquanto lê, o semáforo também se cala, até para quem tem o plano vencido', () => {
    // Sem a primeira resposta não se sabe do crédito, e o cadeado seria um palpite.
    mockLendo = true;
    renderComPlano({ temAcesso: true, acessoVencido: true });
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
  });

  it('quem gastou e não tem crédito novo lê o cadeado, que aqui é verdadeiro', () => {
    // Sabemos que o crédito é zero (a leitura respondeu): o cadeado não mente.
    mockGastou = { vocacao: true };
    renderComPlano({ temAcesso: false, compradorSemPlano: true });
    expect(screen.getByLabelText('Acesso vencido')).toBeTruthy();
  });
});
