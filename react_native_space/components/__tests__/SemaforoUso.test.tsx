import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

interface PerfilFalso {
  plano: string;
  is_super_admin: boolean;
  plano_valido_ate: string | null;
}

// `let` e não `const`: um teste precisa de perfil nulo (a sessão já existe e o perfil
// ainda não chegou), e o mock lê o valor no momento da chamada.
let mockPerfil: PerfilFalso | null = null;
let mockSessao: { user: { id: string } } | null = { user: { id: 'u1' } };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ perfil: mockPerfil, sessao: mockSessao }),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
const mockLerUso = jest.fn().mockResolvedValue(null);
jest.mock('../../services/usoIA', () => ({
  lerUsoDoDia: (...a: unknown[]) => mockLerUso(...a),
}));

import { SemaforoUso } from '../SemaforoUso';

// Cada teste mexe no perfil e na sessão; sem devolver ao começo, uma falha no meio
// de um teste contaminaria o seguinte e esconderia qual deles quebrou de verdade.
beforeEach(() => {
  mockPerfil = { plano: 'gratuito', is_super_admin: false, plano_valido_ate: null };
  mockSessao = { user: { id: 'u1' } };
  mockLerUso.mockClear();
  mockPush.mockClear();
});

// Os testes só mexem no perfil depois de ele existir; `!` aqui diz isso ao tsc sem
// espalhar a checagem de nulo por cada linha que prepara um cenário.
const perfil = () => mockPerfil!;

describe('SemaforoUso quando o acesso venceu', () => {
  it('mostra o cadeado e a data', async () => {
    // Data no passado de verdade, para o teste não depender do dia em que roda, e ao
    // meio-dia em Brasília (15h UTC) para o dia não virar na conversão de fuso.
    perfil().plano_valido_ate = '2025-10-10T15:00:00Z';
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(await screen.findByLabelText('Acesso vencido')).toBeTruthy();
    expect(screen.getByText(/10\/10/)).toBeTruthy();
  });

  it('validade nula também é vencido, sem escrever "null"', () => {
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="voz" rotulo="Leituras faladas" />);
    expect(screen.getByLabelText('Acesso vencido')).toBeTruthy();
    expect(screen.queryByText(/null/)).toBeNull();
  });

  it('com validade no futuro não mostra cadeado', () => {
    perfil().plano_valido_ate = '2099-01-01T00:00:00Z';
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
  });

  it('super-admin nunca vê cadeado', () => {
    perfil().plano_valido_ate = null;
    perfil().is_super_admin = true;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
  });

  it('quem saiu da conta não lê "seu acesso terminou", nunca teve acesso', () => {
    mockSessao = null;
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
    expect(screen.queryByText(/acesso terminou/)).toBeNull();
  });

  it('não acusa enquanto o perfil não chegou', () => {
    // O AuthContext define a sessão e só DEPOIS busca o perfil, então este estado
    // acontece em todo cold start. Sem este guarda, quem paga lê "Seu acesso terminou"
    // a cada abertura — e para sempre, se a leitura do perfil falhar.
    mockPerfil = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
    expect(screen.queryByText(/acesso terminou/)).toBeNull();
  });

  it('trancado não vai ao banco ler o contador do dia', () => {
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(screen.getByLabelText('Acesso vencido')).toBeTruthy();
    expect(mockLerUso).not.toHaveBeenCalled();
  });

  it('com acesso, o contador do dia continua sendo lido', async () => {
    perfil().plano_valido_ate = '2099-01-01T00:00:00Z';
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    await waitFor(() => expect(mockLerUso)
      .toHaveBeenCalledWith('u1', 'gratuito', 'interpretacao'));
  });
});

describe('o cadeado leva a algum lugar', () => {
  it('tocar abre os planos', () => {
    // Ate 01/10 este aviso pedia "atualize seu plano" e era texto morto: o app mandava
    // agir e nao oferecia caminho nenhum. O card da home ja levava aos planos.
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    fireEvent.press(screen.getByLabelText('Acesso vencido'));
    expect(mockPush).toHaveBeenCalledWith('/planos');
  });

  it('o semaforo com numero nao leva a lugar nenhum', () => {
    // O contrapeso: o desvio e do cadeado, nao de todo semaforo.
    perfil().plano_valido_ate = '2099-01-01T00:00:00Z';
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

/**
 * Quem comprou uma leitura avulsa é `gratuito` e sem validade, que é exatamente o perfil
 * que o cadeado acusa. Sem o desvio, a tela diria "Seu acesso terminou" logo acima do
 * botão que funciona.
 */
describe('o crédito avulso no lugar do cadeado', () => {
  it('com um crédito, diz que há uma leitura avulsa e não mostra o cadeado', () => {
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso={1} />);
    expect(screen.getByText('Aprofundamentos: você tem uma leitura avulsa para usar.')).toBeTruthy();
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
    expect(screen.queryByText(/acesso terminou/)).toBeNull();
  });

  it('com vários créditos, diz quantos no plural', () => {
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso={3} />);
    expect(screen.getByText('Aprofundamentos: você tem 3 leituras avulsas para usar.')).toBeTruthy();
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
  });

  it('a faixa do crédito não leva a lugar nenhum: não é o cadeado', () => {
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso={1} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('com o acesso vencido (plano que terminou), o crédito também vale no lugar do cadeado', () => {
    perfil().plano = 'iniciante';
    perfil().plano_valido_ate = '2020-01-01T00:00:00Z';
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso={2} />);
    expect(screen.getByText(/você tem 2 leituras avulsas/)).toBeTruthy();
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
  });

  it.each([[0], [undefined]])('com crédito %s, o cadeado continua', (credito) => {
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso={credito} />);
    expect(screen.getByLabelText('Acesso vencido')).toBeTruthy();
    expect(screen.queryByText(/leitura avulsa|leituras avulsas/)).toBeNull();
  });

  it('com o crédito, ainda não vai ao banco ler o contador do dia', () => {
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso={1} />);
    expect(mockLerUso).not.toHaveBeenCalled();
  });

  it('recurso desligado para o plano: o aviso verdadeiro fica, o crédito não o encobre', async () => {
    // Aqui o servidor barra mesmo quem tem crédito (`recursoLigado` vence o crédito),
    // então dizer "você tem uma leitura" ao lado prometeria o que ele vai recusar.
    perfil().plano_valido_ate = '2099-01-01T00:00:00Z';
    mockLerUso.mockResolvedValueOnce({ ligado: false, usadoHoje: 0, limiteDia: null });
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso={2} />);
    expect(await screen.findByText('Aprofundamentos não está no seu plano.')).toBeTruthy();
    expect(screen.queryByText(/leitura avulsa|leituras avulsas/)).toBeNull();
  });

  it('com acesso e contador, o crédito não troca o número do dia', async () => {
    perfil().plano_valido_ate = '2099-01-01T00:00:00Z';
    mockLerUso.mockResolvedValueOnce({ ligado: true, usadoHoje: 1, limiteDia: 5 });
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso={2} />);
    expect(await screen.findByText('Aprofundamentos: 4 de 5 ainda hoje.')).toBeTruthy();
  });
});

/**
 * `'desconhecido'`: ainda não leu o crédito, ou a leitura falhou. No lugar do cadeado o
 * semáforo não diz nada, porque o cadeado afirmaria "acesso terminou" a quem pode ter acabado
 * de pagar. Só o ramo do cadeado muda; e sem a prop, nada muda para quem não conhece a compra.
 */
describe('crédito avulso desconhecido', () => {
  it('no lugar do cadeado, não renderiza nada', () => {
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso="desconhecido" />);
    expect(screen.toJSON()).toBeNull();
    expect(screen.queryByLabelText('Acesso vencido')).toBeNull();
    expect(screen.queryByText(/acesso terminou/)).toBeNull();
    expect(screen.queryByText(/leitura avulsa|leituras avulsas/)).toBeNull();
  });

  it('com o acesso vencido por plano que terminou, também não renderiza nada', () => {
    perfil().plano = 'iniciante';
    perfil().plano_valido_ate = '2020-01-01T00:00:00Z';
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso="desconhecido" />);
    expect(screen.toJSON()).toBeNull();
  });

  it('com acesso, o semáforo segue mostrando o número do dia', async () => {
    // Só o ramo do cadeado é afetado.
    perfil().plano_valido_ate = '2099-01-01T00:00:00Z';
    mockLerUso.mockResolvedValueOnce({ ligado: true, usadoHoje: 1, limiteDia: 5 });
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso="desconhecido" />);
    expect(await screen.findByText('Aprofundamentos: 4 de 5 ainda hoje.')).toBeTruthy();
  });

  it('recurso desligado para o plano: o aviso segue dito', async () => {
    perfil().plano_valido_ate = '2099-01-01T00:00:00Z';
    mockLerUso.mockResolvedValueOnce({ ligado: false, usadoHoje: 0, limiteDia: null });
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso="desconhecido" />);
    expect(await screen.findByText('Aprofundamentos não está no seu plano.')).toBeTruthy();
  });

  it('sem sessão, nada muda: continua sem renderizar', () => {
    mockSessao = null;
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso="desconhecido" />);
    expect(screen.toJSON()).toBeNull();
  });
});

describe('sem a prop `creditoAvulso`, nada muda (as outras telas não a passam)', () => {
  it('o cadeado aparece, com a data, como sempre', () => {
    perfil().plano_valido_ate = '2025-10-10T15:00:00Z';
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />);
    expect(screen.getByLabelText('Acesso vencido')).toBeTruthy();
    expect(screen.getByText(/10\/10/)).toBeTruthy();
  });

  it('o cadeado ainda leva aos planos', () => {
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="voz" rotulo="Leituras faladas" />);
    fireEvent.press(screen.getByLabelText('Acesso vencido'));
    expect(mockPush).toHaveBeenCalledWith('/planos');
  });

  it('`undefined` explícito é o mesmo que ausente', () => {
    perfil().plano_valido_ate = null;
    render(<SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso={undefined} />);
    expect(screen.getByLabelText('Acesso vencido')).toBeTruthy();
  });

  it('o semáforo com número segue igual, sem a prop', async () => {
    perfil().plano_valido_ate = '2099-01-01T00:00:00Z';
    mockLerUso.mockResolvedValueOnce({ ligado: true, usadoHoje: 2, limiteDia: 5 });
    render(<SemaforoUso tipo="pergunta" rotulo="Perguntas" />);
    expect(await screen.findByText('Perguntas: 3 de 5 ainda hoje.')).toBeTruthy();
  });
});
