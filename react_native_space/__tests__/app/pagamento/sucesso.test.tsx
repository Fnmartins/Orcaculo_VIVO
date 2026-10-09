import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

/**
 * A última tela do caminho que cobra.
 *
 * A tela era estática e dizia "Assinatura confirmada!" e "Seu plano está sendo
 * liberado" para todo mundo, inclusive para quem comprou uma leitura avulsa e não
 * assinou nada. São duas afirmações falsas, ditas a quem acabou de pagar, e o botão
 * mandava para o início em vez de para a leitura comprada.
 */

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

// O ícone real renderiza, mas dispara o aviso "not wrapped in act(...)" a cada
// montagem, e as asserções abaixo olham só texto e rótulo.
jest.mock('@expo/vector-icons/Ionicons', () => () => null);

import PagamentoSucesso from '../../../app/pagamento/sucesso';

beforeEach(() => {
  mockReplace.mockClear();
  mockParams = {};
});

describe('quem assinou', () => {
  it('continua lendo que a assinatura foi confirmada', () => {
    mockParams = { session_id: 's1' };
    render(<PagamentoSucesso />);
    expect(screen.getByText('Assinatura confirmada!')).toBeTruthy();
  });

  it('continua lendo o texto de sempre e voltando ao início', () => {
    // É a `success_url` da assinatura que mantém isto verdadeiro: ela não leva
    // `compra`, e a tela só muda de texto quando `compra=avulso` chega. O título
    // sozinho passaria se o corpo ou o botão fossem trocados junto com a compra avulsa.
    mockParams = { session_id: 's1' };
    render(<PagamentoSucesso />);
    expect(
      screen.getByText('Seu plano está sendo liberado. Pode levar alguns segundos para aparecer.'),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('um `oraculo` solto, sem `compra=avulso`, não faz da assinatura uma compra avulsa', () => {
    // O que decide é `compra`. Se `oraculo` bastasse, um link com o parâmetro sobrando
    // tiraria de quem assinou o texto que é verdadeiro para ele.
    mockParams = { session_id: 's1', oraculo: 'vocacao' };
    render(<PagamentoSucesso />);
    expect(screen.getByText('Assinatura confirmada!')).toBeTruthy();
    expect(screen.queryByText(/Pagamento confirmado/)).toBeNull();
    // O botão também: título de assinatura com botão "Ler a minha vocação" seria uma
    // tela que se contradiz, e só a asserção sobre o botão enxerga isso.
    fireEvent.press(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

describe('quem comprou uma leitura avulsa', () => {
  it('NÃO lê que assinou', () => {
    // Dizer "Assinatura confirmada" e "seu plano está sendo liberado" a quem comprou
    // uma leitura e não assinou nada são duas afirmações falsas na última tela do
    // caminho que cobra.
    mockParams = { session_id: 's1', compra: 'avulso', oraculo: 'vocacao' };
    render(<PagamentoSucesso />);
    expect(screen.queryByText('Assinatura confirmada!')).toBeNull();
    expect(screen.queryByText(/plano está sendo liberado/)).toBeNull();
  });

  it('lê que o pagamento foi confirmado e o que vale a compra', () => {
    mockParams = { session_id: 's1', compra: 'avulso', oraculo: 'vocacao' };
    render(<PagamentoSucesso />);
    expect(screen.getByText('Pagamento confirmado!')).toBeTruthy();
    expect(
      screen.getByText(
        'Você já pode gerar a leitura da sua vocação. O direito de gerar vale 90 dias, e a leitura, depois de gerada, fica no seu histórico enquanto sua conta existir. Pode levar alguns segundos para o crédito aparecer.',
      ),
    ).toBeTruthy();
  });

  it.each([
    ['com o nome da leitura', 'vocacao'],
    ['sem o nome da leitura', 'xyz'],
  ])('avisa que o crédito pode levar alguns segundos, %s', (_caso, oraculo) => {
    // É dinheiro, não cortesia. O crédito nasce no webhook, e o webhook pode atrasar. Quem
    // volta ao oráculo antes disso encontra crédito zero e a oferta de comprar de novo a
    // mesma leitura que acabou de pagar. A assinatura já avisa da mesma latência ("pode
    // levar alguns segundos para aparecer"); sem o aviso aqui, a compra avulsa diz "você
    // já pode gerar" sem ressalva e a pessoa não tem por que esperar.
    mockParams = { session_id: 's1', compra: 'avulso', oraculo };
    render(<PagamentoSucesso />);
    expect(screen.getByText(/Pode levar alguns segundos para o crédito aparecer\./)).toBeTruthy();
  });

  it.each([
    ['mapa', 'a leitura do seu mapa', 'Ler o meu mapa', '/mapa-astral'],
    ['vocacao', 'a leitura da sua vocação', 'Ler a minha vocação', '/vocacao'],
  ])('%s: diz o que foi comprado e leva para lá', (oraculo, nome, acao, rota) => {
    mockParams = { session_id: 's1', compra: 'avulso', oraculo };
    render(<PagamentoSucesso />);
    expect(screen.getByText(new RegExp(`Você já pode gerar ${nome}\\.`))).toBeTruthy();
    // `getByRole` e não `getByLabelText`: o `Button` põe o mesmo rótulo no botão e no
    // texto de dentro, e a busca por rótulo acusa dois elementos. O botão é um só.
    fireEvent.press(screen.getByRole('button', { name: acao }));
    expect(mockReplace).toHaveBeenCalledWith(rota);
  });

  it('não promete a leitura "para sempre": ela fica enquanto a conta existir', () => {
    // Os Termos e as duas telas de compra dizem "enquanto sua conta existir", porque a
    // Política de Privacidade diz que excluir a conta apaga as leituras. A promessa
    // maior numa tela e a menor nos documentos é contradição que ninguém vê até doer.
    mockParams = { session_id: 's1', compra: 'avulso', oraculo: 'mapa' };
    render(<PagamentoSucesso />);
    expect(screen.queryByText(/para sempre/i)).toBeNull();
    expect(screen.getByText(/enquanto sua conta existir/)).toBeTruthy();
  });
});

describe('o produto vem da URL, logo da pessoa', () => {
  // Nenhum destes valores é um produto vendido. Todos têm de cair na versão sem nome,
  // que é verdadeira de qualquer jeito: o pagamento foi confirmado, e só não se sabe de
  // qual leitura.
  it.each([
    ['desconhecido', 'xyz'],
    ['vazio', ''],
    // Chaves herdadas de todo objeto: um dicionário comum responde a elas com uma função
    // ou com o protótipo, e a tela mostraria "undefined" no texto e no botão.
    ['herdado: constructor', 'constructor'],
    ['herdado: toString', 'toString'],
    ['herdado: __proto__', '__proto__'],
    ['herdado: hasOwnProperty', 'hasOwnProperty'],
  ])('oráculo %s não inventa nome de produto', (_caso, oraculo) => {
    mockParams = { session_id: 's1', compra: 'avulso', oraculo };
    render(<PagamentoSucesso />);
    expect(screen.getByText('Pagamento confirmado!')).toBeTruthy();
    expect(
      screen.getByText(
        'Você já pode gerar a leitura que comprou. O direito de gerar vale 90 dias, e a leitura, depois de gerada, fica no seu histórico enquanto sua conta existir. Pode levar alguns segundos para o crédito aparecer.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/undefined/)).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('compra avulsa sem `oraculo` também cai na versão sem nome', () => {
    mockParams = { session_id: 's1', compra: 'avulso' };
    render(<PagamentoSucesso />);
    expect(screen.getByText('Pagamento confirmado!')).toBeTruthy();
    expect(screen.getByText(/Você já pode gerar a leitura que comprou\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeTruthy();
  });
});
