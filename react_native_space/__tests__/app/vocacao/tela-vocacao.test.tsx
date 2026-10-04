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
}

// `let`, e não `const`: o mock lê o valor no momento da chamada, e cada teste monta o seu.
// `sessao: null` de propósito: sem sessão o `SemaforoUso` não vai ao banco ler o uso do dia.
let mockPerfil: PerfilFalso | null = null;
let mockCarregando = false;
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ perfil: mockPerfil, sessao: null, carregando: mockCarregando }),
}));

// O gate só abre para `mapa_completo`. Responder "sim" a qualquer recurso deixaria a tela
// trocar de recurso (`consulta_premium`, por exemplo) sem que teste nenhum notasse.
let mockAcesso = false;
jest.mock('../../../hooks/usePlano', () => ({
  usePlano: () => ({
    temAcesso: (recurso: string) => recurso === 'mapa_completo' && mockAcesso,
  }),
}));

const mockGerarLeitura = jest.fn();
jest.mock('../../../services/ia', () => ({
  gerarLeituraDeVocacao: (...a: unknown[]) => mockGerarLeitura(...a),
}));

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
  cidade?: CidadeFalsa;
}) {
  const {
    temAcesso, semHora = false, horaNula = false, perfilVazio = false, cidade = SAO_PAULO,
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

beforeEach(() => {
  jest.clearAllMocks();
  mockCarregando = false;
  mockGerarLeitura.mockResolvedValue(LEITURA);
});

describe('tela de vocação', () => {
  it('sem plano, mostra o meio do céu e não mostra a leitura', () => {
    // É a vitrine: a parte grátis tem de aparecer ANTES de pedir dinheiro. Se ela
    // sumir, o card vira cadeado puro e a decisão 3 do dono deixa de valer.
    renderComPlano({ temAcesso: false });
    expect(screen.getByText(/Meio do céu/i)).toBeTruthy();
    expect(screen.queryByText(/Onde você rende/i)).toBeNull();
  });

  it('com plano, o botão da leitura aparece', () => {
    renderComPlano({ temAcesso: true });
    expect(screen.getByText(/Ler minha vocação/i)).toBeTruthy();
  });

  it('sem hora de nascimento, a tela diz isso em voz alta', () => {
    // Entregar menos calado é o defeito que `comCasas` foi criado para evitar.
    renderComPlano({ temAcesso: true, semHora: true });
    expect(screen.getByText(/sem a hora/i)).toBeTruthy();
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
    expect(screen.getByText(/Leão/)).toBeTruthy();
    expect(screen.getByText(/A casa 10 é a carreira/)).toBeTruthy();
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
    const aviso = textos.findIndex((t) => /sem a hora/i.test(t));
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
    expect(screen.getByText(/sem a hora/i)).toBeTruthy();
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
    expect(screen.queryByText(/sem a hora/i)).toBeNull();
  });

  it('lugar polar com hora: as casas somem, mas a tela não culpa a hora', () => {
    // `comCasas` é falso aqui, e dizer "sem a hora" a quem informou a hora seria uma
    // falsidade pior que o silêncio. O meio do céu continua: existe com a hora.
    renderComPlano({ temAcesso: true, cidade: TROMSO });
    expect(screen.queryByText(/sem a hora/i)).toBeNull();
    expect(screen.getByText(/não se aplica/i)).toBeTruthy();
    expect(screen.getByText(/Meio do céu/i)).toBeTruthy();
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
