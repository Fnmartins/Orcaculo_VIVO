import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockLer = jest.fn();
jest.mock('../../../services/custo', () => ({
  lerAuditoriaDeCusto: (...a: unknown[]) => mockLer(...a),
}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
}));

import { AbaCusto } from '../AbaCusto';
import { AcessoNegadoError } from '../../../services/acessoNegado';
import { SessaoExpiradaError } from '../../../services/sessaoExpirada';

/**
 * A aba mostra dinheiro, e o risco dela não é quebrar: é fazer o dono ler um número
 * baixo como economia quando ele é falta de medição ou de preço. Os dois testes de
 * aviso abaixo são os mais importantes daqui.
 */

const PRECOS = [
  { chave: 'modelo-entrada', dolar_por_milhao: 5, confirmado_em: '2026-09-29' },
  { chave: 'modelo-saida', dolar_por_milhao: 25, confirmado_em: '2026-09-29' },
  { chave: 'voz-caractere', dolar_por_milhao: 10, confirmado_em: '2026-09-29' },
];

const auditoria = (campos: Record<string, unknown> = {}) => ({
  desde: '2026-08-30',
  dias: 30,
  medidoDesde: '2026-09-29',
  // Dois planos consumindo, de propósito: com um só, o total e o custo do plano
  // seriam o mesmo número e o teste não saberia qual dos dois está conferindo.
  consumo: [
    {
      plano: 'mestre', tipo: 'interpretacao', chamadas: 4,
      tokensEntrada: 0, tokensSaida: 400_000, caracteres: 0,   // US$ 10,00
    },
    {
      plano: 'iniciante', tipo: 'pergunta', chamadas: 10,
      tokensEntrada: 0, tokensSaida: 40_000, caracteres: 0,    // US$ 1,00
    },
  ],
  pessoasAtivas: { mestre: 2, iniciante: 3 },
  assinantes: { mestre: 10, iniciante: 5, gratuito: 40 },
  precos: PRECOS,
  ...campos,
});

beforeEach(() => jest.clearAllMocks());

describe('AbaCusto', () => {
  it('mostra o total e o custo de cada plano', async () => {
    mockLer.mockResolvedValue(auditoria());
    render(<AbaCusto aoPerderAcesso={jest.fn()} />);

    // 400.000 tokens de saída a US$ 25 por milhão = US$ 10,00.
    expect(await screen.findByText('US$ 10,00')).toBeTruthy();
    expect(screen.getByText('Mestre')).toBeTruthy();
  });

  it('divide pelos assinantes, e diz quantos usaram', async () => {
    mockLer.mockResolvedValue(auditoria());
    render(<AbaCusto aoPerderAcesso={jest.fn()} />);

    expect(await screen.findByText(/US\$ 1,00 por assinante/)).toBeTruthy();
    expect(screen.getByText(/2 de 10 pessoas usaram/)).toBeTruthy();
  });

  it('plano sem uso aparece com zero, em vez de desaparecer', async () => {
    mockLer.mockResolvedValue(auditoria());
    render(<AbaCusto aoPerderAcesso={jest.fn()} />);

    expect(await screen.findByText('Gratuito')).toBeTruthy();
    expect(screen.getByText('Nenhum uso de IA neste plano.')).toBeTruthy();
  });

  it('AVISA quando falta preço, dizendo que o total está subestimado', async () => {
    // Sem este aviso, um preço não cadastrado entraria como zero e o total sairia
    // mais baixo do que a realidade, com cara de número conferido.
    mockLer.mockResolvedValue(auditoria({
      precos: PRECOS.filter((p) => p.chave !== 'voz-caractere'),
    }));
    render(<AbaCusto aoPerderAcesso={jest.fn()} />);

    expect(await screen.findByText(/SUBESTIMADO/)).toBeTruthy();
  });

  it('não avisa de preço quando estão todos lá', async () => {
    mockLer.mockResolvedValue(auditoria());
    render(<AbaCusto aoPerderAcesso={jest.fn()} />);

    await screen.findByText('US$ 10,00');
    expect(screen.queryByText(/SUBESTIMADO/)).toBeNull();
  });

  it('diz desde quando o consumo é medido', async () => {
    mockLer.mockResolvedValue(auditoria());
    render(<AbaCusto aoPerderAcesso={jest.fn()} />);
    expect(await screen.findByText(/medido desde 29\/09\/2026/)).toBeTruthy();
  });

  it('sem nada medido, diz isso em vez de mostrar custo zero calado', async () => {
    mockLer.mockResolvedValue(auditoria({ medidoDesde: null, consumo: [] }));
    render(<AbaCusto aoPerderAcesso={jest.fn()} />);
    expect(await screen.findByText(/Nenhum consumo medido ainda/)).toBeTruthy();
  });

  it('trocar a janela pede o período novo', async () => {
    mockLer.mockResolvedValue(auditoria());
    render(<AbaCusto aoPerderAcesso={jest.fn()} />);
    await screen.findByText('US$ 10,00');

    fireEvent.press(screen.getByLabelText('Últimos 7 dias'));

    await waitFor(() => expect(mockLer).toHaveBeenCalledWith(7));
  });

  it('acesso negado devolve o Painel a quem chamou', async () => {
    mockLer.mockRejectedValue(new AcessoNegadoError());
    const aoPerderAcesso = jest.fn();
    render(<AbaCusto aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(aoPerderAcesso).toHaveBeenCalled());
  });

  it('sessão expirada manda para o login', async () => {
    mockLer.mockRejectedValue(new SessaoExpiradaError());
    render(<AbaCusto aoPerderAcesso={jest.fn()} />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/login'));
  });

  it('falha de rede oferece tentar de novo', async () => {
    mockLer.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(auditoria());
    render(<AbaCusto aoPerderAcesso={jest.fn()} />);

    expect(await screen.findByText('Não foi possível carregar o custo.')).toBeTruthy();
    fireEvent.press(screen.getByText('Tentar de novo'));
    expect(await screen.findByText('US$ 10,00')).toBeTruthy();
  });
});
