import React from 'react';
import { render, screen } from '@testing-library/react-native';

/**
 * O aviso da linha da vida tem de CHEGAR À TELA, e não só existir no dado.
 *
 * `data/__tests__/textos-imagem.test.ts` prende o texto e o prompt. Falta a
 * ponte: o bloco é condicional em `analise.tipo === 'quiromancia'`, e uma
 * condição errada apagaria o desarme sem quebrar nenhum outro teste.
 *
 * Este caminho não dá para conferir no navegador: a rota redireciona para
 * /welcome sem sessão, e o backend de desenvolvimento é o Supabase de produção —
 * entrar numa conta só para ver uma tela não é coisa que se faça. Então a
 * verificação vive aqui.
 */

const mockParams: { resultado?: string; imagemId?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('../../../utils/haptics', () => ({
  Hapticos: { impactoLeve: jest.fn(), impactoMedio: jest.fn(), selecao: jest.fn() },
}));

jest.mock('../../../utils/alerta', () => ({ mostrarAlerta: jest.fn() }));

jest.mock('../../../services/database', () => ({
  DatabaseServico: { salvarConsulta: jest.fn(async () => ({})) },
}));

jest.mock('../../../services/compartilhar', () => ({
  compartilharAnaliseIA: jest.fn(async () => {}),
}));

jest.mock('../../../services/imagemCache', () => ({ obterImagem: () => undefined }));

// O ícone carrega a fonte de forma assíncrona e chama setState depois que o teste
// acabou — um aviso de `act` que não aponta defeito nenhum e suja toda execução.
// Aqui nada depende do ícone: o que se verifica é texto.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

import TelaResultado from '../../../app/ia/resultado';
import { TEXTO_LINHA_DA_VIDA, TEXTO_MAO_DOMINANTE } from '../../../data/textos-imagem';

/** O começo de cada aviso basta para achá-lo, e evita repetir o texto inteiro aqui. */
const INICIO_LINHA_DA_VIDA = TEXTO_LINHA_DA_VIDA.slice(0, 40);
const INICIO_MAO_DOMINANTE = TEXTO_MAO_DOMINANTE.slice(0, 40);

function montar(tipo: 'cafe' | 'quiromancia', secao: string) {
  mockParams.resultado = JSON.stringify({
    tipo,
    titulo: 'Leitura de teste',
    resumo: 'Resumo de teste.',
    detalhes: [{ secao, texto: 'Texto de teste.' }],
    energia: 'neutra',
    cor: '#C0392B',
  });
  mockParams.imagemId = '';
  render(<TelaResultado />);
}

describe('o desarme chega à tela da leitura de mão', () => {
  it('a quiromancia mostra os dois avisos', () => {
    montar('quiromancia', 'Linha da vida');
    expect(screen.getByText(new RegExp(INICIO_LINHA_DA_VIDA))).toBeTruthy();
    expect(screen.getByText(new RegExp(INICIO_MAO_DOMINANTE))).toBeTruthy();
  });

  it('a leitura da xícara não mostra nenhum dos dois', () => {
    // A borra não tem crença equivalente para desarmar, e um aviso sobre mão numa
    // leitura de café seria ruído que faz a pessoa desconfiar do resto.
    montar('cafe', 'A asa e o que a cerca');
    expect(screen.queryByText(new RegExp(INICIO_LINHA_DA_VIDA))).toBeNull();
    expect(screen.queryByText(new RegExp(INICIO_MAO_DOMINANTE))).toBeNull();
  });

  it('a leitura em si continua aparecendo ao lado do aviso', () => {
    // Guarda contra o conserto que troca uma coisa pela outra: o aviso não pode
    // entrar no lugar do conteúdo.
    montar('quiromancia', 'Linha da vida');
    expect(screen.getByText('Linha da vida')).toBeTruthy();
    expect(screen.getByText('Texto de teste.')).toBeTruthy();
  });
});
