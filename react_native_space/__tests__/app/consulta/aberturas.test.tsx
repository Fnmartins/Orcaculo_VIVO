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
import TelaPreparoTarot from '../../../app/consulta/preparo';
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

describe('Abertura do tarô', () => {
  it('quem pergunta embaralha, corta e só então as cartas abrem', async () => {
    reduzirMovimento = true;
    render(<TelaPreparoTarot />);
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());

    expect(screen.getByText('Pense na sua pergunta e embaralhe as cartas.')).toBeTruthy();
    fireEvent.press(screen.getByText('Embaralhar'));

    expect(await screen.findByText('Cortar')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Cortar'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/consulta/cartas'));
  });

  // Conselho de 23/09, ajuste 3: quem usa leitor de tela não descobre "toque no baralho".
  it('cada gesto tem um equivalente com rótulo', async () => {
    reduzirMovimento = true;
    render(<TelaPreparoTarot />);
    await waitFor(() => expect(screen.getAllByLabelText('Embaralhar')).toHaveLength(2));
  });

  it('com animação, o baralho leva ao corte quando ela termina', async () => {
    render(<TelaPreparoTarot />);
    // [0] é o próprio baralho; [1] é o botão com rótulo.
    fireEvent.press(screen.getAllByLabelText('Embaralhar')[0]);
    expect(await screen.findByText('Agora corte o baralho, quando sentir que é hora.')).toBeTruthy();
  });
});

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
