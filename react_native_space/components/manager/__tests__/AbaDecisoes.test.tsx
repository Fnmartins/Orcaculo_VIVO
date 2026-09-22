import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockListar = jest.fn();
const mockCriar = jest.fn();
const mockFechar = jest.fn();
const mockListarManifestacoes = jest.fn();
const mockRegistrar = jest.fn();
// Sem requireActual: o módulo real carrega o cliente do Supabase, que não roda no Jest.
jest.mock('../../../services/decisoes', () => ({
  ehDecisaoFechada: (e: unknown) => (e as { name?: string } | null)?.name === 'DecisaoFechadaError',
  listarDecisoes: (...a: unknown[]) => mockListar(...a),
  criarDecisao: (...a: unknown[]) => mockCriar(...a),
  fecharDecisao: (...a: unknown[]) => mockFechar(...a),
  listarManifestacoes: (...a: unknown[]) => mockListarManifestacoes(...a),
  registrarManifestacao: (...a: unknown[]) => mockRegistrar(...a),
}));

const mockCopiar = jest.fn();
jest.mock('../../../utils/copiar', () => ({
  copiarTexto: (...a: unknown[]) => mockCopiar(...a),
}));

const mockAlerta = jest.fn();
jest.mock('../../../utils/alerta', () => ({
  mostrarAlerta: (...a: unknown[]) => mockAlerta(...a),
  confirmarAcao: (_t: string, _m: string, aoConfirmar: () => void) => aoConfirmar(),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    sessao: { user: { id: 'u1', email: 'fabiano@arcanus.com.br' } },
    perfil: { nome: 'Fabiano' },
  }),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
}));

import { AbaDecisoes } from '../AbaDecisoes';
import { AcessoNegadoError } from '../../../services/acessoNegado';
import { SessaoExpiradaError } from '../../../services/sessaoExpirada';

const aberta = {
  id: 'd1', titulo: 'Mesa de búzios', contexto: 'Peneira com anéis, sem pano.',
  link: 'https://exemplo/proposta', status: 'aberta', decidido_em: null,
  criado_em: '2026-09-22T12:00:00Z', atualizado_em: '2026-09-22T12:00:00Z',
};

const fechada = {
  ...aberta, id: 'd2', titulo: 'Cor do fundo', status: 'decidida',
  decidido_em: '2026-09-21T10:00:00Z',
};

const manifestacao = {
  id: 'm1', decisao_id: 'd1', autor_nome: 'Marcio', posicao: 'aprovo',
  texto: 'Gostei do fundo escuro.', criado_em: '2026-09-22T13:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCopiar.mockResolvedValue(true);
  mockListarManifestacoes.mockResolvedValue([]);
});

describe('AbaDecisoes', () => {
  it('lista as decisões com o status de cada uma', async () => {
    mockListar.mockResolvedValue([aberta, fechada]);
    render(<AbaDecisoes aoPerderAcesso={jest.fn()} />);
    expect(await screen.findByText('Mesa de búzios')).toBeTruthy();
    expect(screen.getByText('Cor do fundo')).toBeTruthy();
    expect(screen.getByText('Aberta')).toBeTruthy();
    expect(screen.getByText('Decidida')).toBeTruthy();
  });

  it('abrir uma decisão mostra o contexto e o histórico', async () => {
    mockListar.mockResolvedValue([aberta]);
    mockListarManifestacoes.mockResolvedValue([manifestacao]);
    render(<AbaDecisoes aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Abrir Mesa de búzios'));
    expect(await screen.findByText('Gostei do fundo escuro.')).toBeTruthy();
    expect(screen.getByText('Peneira com anéis, sem pano.')).toBeTruthy();
  });

  it('registra a manifestação com a posição escolhida', async () => {
    mockListar.mockResolvedValue([aberta]);
    mockRegistrar.mockResolvedValue({
      ...manifestacao, id: 'm2', autor_nome: 'Fabiano', posicao: 'nao_aprovo', texto: 'O pano atrapalha.',
    });
    render(<AbaDecisoes aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Abrir Mesa de búzios'));
    fireEvent.press(await screen.findByText('Não aprovo'));
    fireEvent.changeText(screen.getByLabelText('Texto da manifestação'), 'O pano atrapalha.');
    fireEvent.press(screen.getByText('Registrar'));
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalledWith(expect.objectContaining({
      decisaoId: 'd1', posicao: 'nao_aprovo', texto: 'O pano atrapalha.', autorNome: 'Fabiano',
    })));
    expect(await screen.findByText('O pano atrapalha.')).toBeTruthy();
  });

  // Decisão fechada é registro: sem campo de texto, sem botão de registrar.
  it('decisão fechada não oferece formulário nem fechamento', async () => {
    mockListar.mockResolvedValue([fechada]);
    render(<AbaDecisoes aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Abrir Cor do fundo'));
    await waitFor(() => expect(mockListarManifestacoes).toHaveBeenCalled());
    expect(screen.queryByLabelText('Texto da manifestação')).toBeNull();
    expect(screen.queryByText('Registrar')).toBeNull();
    expect(screen.queryByText('Fechar decisão')).toBeNull();
    expect(screen.getByText('Copiar tudo')).toBeTruthy();
  });

  it('copiar tudo leva título, contexto e manifestações para a área de transferência', async () => {
    mockListar.mockResolvedValue([aberta]);
    mockListarManifestacoes.mockResolvedValue([manifestacao]);
    render(<AbaDecisoes aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Abrir Mesa de búzios'));
    await screen.findByText('Gostei do fundo escuro.');
    fireEvent.press(screen.getByText('Copiar tudo'));
    await waitFor(() => expect(mockCopiar).toHaveBeenCalled());
    const texto = mockCopiar.mock.calls[0][0] as string;
    expect(texto).toContain('Decisão: Mesa de búzios');
    expect(texto).toContain('Peneira com anéis, sem pano.');
    expect(texto).toContain('Gostei do fundo escuro.');
    expect(mockAlerta).toHaveBeenCalledWith('Copiado', expect.any(String));
  });

  it('fechar a decisão atualiza o status na lista', async () => {
    mockListar.mockResolvedValue([aberta]);
    mockFechar.mockResolvedValue({ ...aberta, status: 'decidida', decidido_em: '2026-09-22T15:00:00Z' });
    render(<AbaDecisoes aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Abrir Mesa de búzios'));
    fireEvent.press(await screen.findByText('Fechar decisão'));
    await waitFor(() => expect(mockFechar).toHaveBeenCalledWith('d1', 'u1'));
    expect(await screen.findByText('Decidida')).toBeTruthy();
  });

  it('cria uma decisão nova', async () => {
    mockListar.mockResolvedValue([]);
    mockCriar.mockResolvedValue({ ...aberta, id: 'd3', titulo: 'Preço em euro' });
    render(<AbaDecisoes aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByText('+ Nova decisão'));
    fireEvent.changeText(screen.getByLabelText('Título'), 'Preço em euro');
    fireEvent.press(screen.getByText('Criar'));
    await waitFor(() => expect(mockCriar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Preço em euro' }),
    ));
    expect(await screen.findByText('Preço em euro')).toBeTruthy();
  });

  it('acesso negado ao carregar chama aoPerderAcesso', async () => {
    mockListar.mockRejectedValue(new AcessoNegadoError());
    const aoPerderAcesso = jest.fn();
    render(<AbaDecisoes aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(aoPerderAcesso).toHaveBeenCalled());
  });

  it('sessão expirada ao carregar manda para o login', async () => {
    mockListar.mockRejectedValue(new SessaoExpiradaError());
    const aoPerderAcesso = jest.fn();
    render(<AbaDecisoes aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/login'));
    expect(aoPerderAcesso).not.toHaveBeenCalled();
  });
});
