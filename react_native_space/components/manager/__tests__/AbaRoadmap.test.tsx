import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockListar = jest.fn();
const mockCriar = jest.fn();
const mockAtualizar = jest.fn();
const mockExcluir = jest.fn();
jest.mock('../../../services/roadmap', () => ({
  listarRoadmap: (...a: unknown[]) => mockListar(...a),
  criarItemRoadmap: (...a: unknown[]) => mockCriar(...a),
  atualizarItemRoadmap: (...a: unknown[]) => mockAtualizar(...a),
  excluirItemRoadmap: (...a: unknown[]) => mockExcluir(...a),
}));
const mockAlerta = jest.fn();
jest.mock('../../../utils/alerta', () => ({
  mostrarAlerta: (...a: unknown[]) => mockAlerta(...a),
  confirmarAcao: (_titulo: string, _mensagem: string, aoConfirmar: () => void) => aoConfirmar(),
}));

import { AbaRoadmap } from '../AbaRoadmap';
import { AcessoNegadoError } from '../../../services/acessoNegado';
import { ItemRemovidoError, MENSAGEM_ITEM_REMOVIDO } from '../../../services/itemRemovido';

const datas = { criado_em: '2026-09-15T00:00:00Z', atualizado_em: '2026-09-15T00:00:00Z' };
const itens = [
  { id: 'a', fase: 'Fase 1', titulo: 'Item A', descricao: null, status: 'ok', ordem: 1, ...datas },
  { id: 'b', fase: 'Fase 2', titulo: 'Item B', descricao: 'Detalhe B', status: 'todo', ordem: 2, ...datas },
];

beforeEach(() => jest.clearAllMocks());

describe('AbaRoadmap', () => {
  it('mostra progresso, fases e descrições', async () => {
    mockListar.mockResolvedValue(itens);
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    expect(await screen.findByText('1 de 2 concluídos')).toBeTruthy();
    expect(screen.getByText('Fase 1')).toBeTruthy();
    expect(screen.getByText('Fase 2')).toBeTruthy();
    expect(screen.getByText('Detalhe B')).toBeTruthy();
  });

  it('editar mantém a ordem quando a fase não muda', async () => {
    mockListar.mockResolvedValue(itens);
    mockAtualizar.mockResolvedValue({ ...itens[0], titulo: 'Item A2' });
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Editar Item A'));
    fireEvent.changeText(screen.getByLabelText('Título'), 'Item A2');
    fireEvent.press(screen.getByText('Salvar'));
    await waitFor(() => expect(mockAtualizar).toHaveBeenCalledWith('a', {
      titulo: 'Item A2', fase: 'Fase 1', descricao: null, status: 'ok', ordem: 1,
    }));
  });

  it('novo item numa fase existente vai para o fim dela', async () => {
    mockListar.mockResolvedValue(itens);
    mockCriar.mockResolvedValue({ ...itens[0], id: 'c' });
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByText('+ Novo item'));
    fireEvent.changeText(screen.getByLabelText('Título'), 'Item C');
    fireEvent.changeText(screen.getByLabelText('Fase'), 'Fase 1');
    fireEvent.press(screen.getByText('Salvar'));
    await waitFor(() => expect(mockCriar).toHaveBeenCalledWith({
      titulo: 'Item C', fase: 'Fase 1', descricao: null, status: 'todo', ordem: 2,
    }));
  });

  it('não cria item sem fase', async () => {
    mockListar.mockResolvedValue(itens);
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByText('+ Novo item'));
    fireEvent.changeText(screen.getByLabelText('Título'), 'Sem fase');
    fireEvent.press(screen.getByText('Salvar'));
    expect(mockAlerta).toHaveBeenCalledWith('Faltam dados', 'Preencha o título e a fase.');
    expect(mockCriar).not.toHaveBeenCalled();
  });

  it('acesso negado ao carregar chama aoPerderAcesso', async () => {
    mockListar.mockRejectedValue(new AcessoNegadoError());
    const aoPerderAcesso = jest.fn();
    render(<AbaRoadmap aoPerderAcesso={aoPerderAcesso} />);
    await waitFor(() => expect(aoPerderAcesso).toHaveBeenCalled());
  });

  it('falha comum mostra "Tentar de novo" e recarrega', async () => {
    mockListar.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(itens);
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    expect(await screen.findByText('Não foi possível carregar o roadmap.')).toBeTruthy();
    fireEvent.press(screen.getByText('Tentar de novo'));
    expect(await screen.findByText('1 de 2 concluídos')).toBeTruthy();
  });

  it('excluir remove o item (com confirmação) e recarrega a lista', async () => {
    mockListar.mockResolvedValue(itens);
    mockExcluir.mockResolvedValue(undefined);
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Editar Item A'));
    fireEvent.press(screen.getByText('Excluir item'));
    await waitFor(() => expect(mockExcluir).toHaveBeenCalledWith('a'));
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
  });

  it('falha ao salvar mantém o formulário aberto com os dados digitados', async () => {
    mockListar.mockResolvedValue(itens);
    mockAtualizar.mockRejectedValue(new Error('rede'));
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByLabelText('Editar Item A'));
    fireEvent.changeText(screen.getByLabelText('Título'), 'Item A3');
    fireEvent.press(screen.getByText('Salvar'));
    await waitFor(() => expect(mockAlerta).toHaveBeenCalledWith('Falha ao salvar', 'rede'));
    expect(screen.getByLabelText('Título').props.value).toBe('Item A3');
    expect(mockListar).toHaveBeenCalledTimes(1);
  });

  it('item apagado por outro admin mostra aviso, fecha o editor e recarrega', async () => {
    mockListar.mockResolvedValue(itens);
    mockAtualizar.mockRejectedValue(new ItemRemovidoError());
    const aoPerderAcesso = jest.fn();
    render(<AbaRoadmap aoPerderAcesso={aoPerderAcesso} />);
    fireEvent.press(await screen.findByLabelText('Editar Item A'));
    fireEvent.press(screen.getByText('Salvar'));
    await waitFor(() => expect(mockAlerta).toHaveBeenCalledWith('Item não encontrado', MENSAGEM_ITEM_REMOVIDO));
    expect(screen.queryByLabelText('Título')).toBeNull();
    expect(mockListar).toHaveBeenCalledTimes(2);
    expect(aoPerderAcesso).not.toHaveBeenCalled();
  });

  it('escolher fase pelo chip usa a fase existente e calcula a ordem', async () => {
    mockListar.mockResolvedValue(itens);
    mockCriar.mockResolvedValue({ ...itens[0], id: 'c' });
    render(<AbaRoadmap aoPerderAcesso={jest.fn()} />);
    fireEvent.press(await screen.findByText('+ Novo item'));
    fireEvent.changeText(screen.getByLabelText('Título'), 'Item D');
    // "Fase 2" aparece duas vezes: como cabeçalho do grupo na lista (renderizado
    // antes, fora do modal) e como chip dentro do editor (renderizado depois).
    // O chip é sempre o último da lista de matches, na ordem do documento.
    const ocorrenciasFase2 = screen.getAllByText('Fase 2');
    fireEvent.press(ocorrenciasFase2[ocorrenciasFase2.length - 1]);
    fireEvent.press(screen.getByText('Salvar'));
    await waitFor(() => expect(mockCriar).toHaveBeenCalledWith({
      titulo: 'Item D', fase: 'Fase 2', descricao: null, status: 'todo', ordem: 3,
    }));
  });
});
