import React from 'react';
import { AccessibilityInfo, Text } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('../../../components/GradientBackground', () => {
  const { View } = require('react-native');
  return { GradientBackground: View };
});

jest.mock('../../../utils/haptics', () => ({
  Hapticos: { impactoLeve: jest.fn(), impactoMedio: jest.fn() },
}));

import { AberturaOraculo } from '../../../components/AberturaOraculo';
import TelaBuziosPreparo from '../../../app/consulta/buzios-preparo';

// O "reduzir movimento" do sistema: com ele ligado as aberturas entregam a tela
// parada, e os testes de fluxo não dependem do tempo de nenhuma animação.
let reduzirMovimento = false;

beforeEach(() => {
  jest.clearAllMocks();
  reduzirMovimento = false;
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockImplementation(() => Promise.resolve(reduzirMovimento));
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as unknown as EmitterSubscription);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AberturaOraculo', () => {
  const abrir = (props: Partial<React.ComponentProps<typeof AberturaOraculo>> = {}) =>
    render(
      <AberturaOraculo
        titulo="Búzios"
        frase="Respire e pense no que você quer compreender."
        acaoLabel="Estou pronto"
        aoAvancar={props.aoAvancar ?? jest.fn()}
        desabilitado={props.desabilitado}
      >
        <Text>objeto</Text>
      </AberturaOraculo>,
    );

  it('mostra o oráculo, a frase e o objeto da prática', () => {
    abrir();
    expect(screen.getByText('Búzios')).toBeTruthy();
    expect(screen.getByText('Respire e pense no que você quer compreender.')).toBeTruthy();
    expect(screen.getByText('objeto')).toBeTruthy();
  });

  // Conselho de 23/09, ajuste 1: "Pular" e "Estou pronto" faziam a mesma coisa.
  it('oferece uma ação só, sem Pular e sem barra de progresso', () => {
    abrir();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByText('Pular')).toBeNull();
  });

  it('a ação avança quando tocada', () => {
    const aoAvancar = jest.fn();
    abrir({ aoAvancar });
    fireEvent.press(screen.getByText('Estou pronto'));
    expect(aoAvancar).toHaveBeenCalledTimes(1);
  });

  it('desabilitada, não avança', () => {
    const aoAvancar = jest.fn();
    abrir({ aoAvancar, desabilitado: true });
    fireEvent.press(screen.getByText('Estou pronto'));
    expect(aoAvancar).not.toHaveBeenCalled();
  });
});

// A abertura do tarô saiu em 02/10: embaralhar e cortar viraram o rito de verdade,
// em `consulta/cartas`, e pedir o mesmo gesto duas vezes fazia o primeiro parecer
// falso. O que sobra aqui é o componente de abertura e a dos búzios, que seguem em uso.
describe('Abertura do búzios', () => {
  it('a peneira aparece e o jogo começa quando a pessoa toca', async () => {
    render(<TelaBuziosPreparo />);
    await waitFor(() => expect(screen.getByTestId('mesa-buzios')).toBeTruthy());

    expect(screen.getByText('Respire e pense no que você quer compreender.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Estou pronto'));
    expect(mockReplace).toHaveBeenCalledWith('/consulta/buzios-jogo');
  });

  // Antes a tela navegava sozinha depois de 12,5 s de vídeo e barra de progresso.
  it('não afirma ato religioso nem anuncia preparo em andamento', async () => {
    render(<TelaBuziosPreparo />);
    await waitFor(() => expect(screen.getByTestId('mesa-buzios')).toBeTruthy());

    expect(screen.queryByText('Preparando os búzios...')).toBeNull();
    expect(screen.queryByText('RITUAL DE PREPARAÇÃO')).toBeNull();
    expect(screen.queryByText('Os búzios estão prontos...')).toBeNull();
  });
});
