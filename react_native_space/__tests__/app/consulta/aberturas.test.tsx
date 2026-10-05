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

/**
 * A nota do búzios.
 *
 * No candomblé quem joga é sacerdote iniciado, não quem consulta — está nas fontes
 * (`docs/referencias/2026-10-05-fontes-de-buzios.md`). O app diverge disso de
 * propósito, como porta de entrada, e a nota é o que impede a divergência de ser
 * silenciosa. Sem ela, o app entregaria o jogo como se jogar sozinho no telefone
 * fosse a prática.
 */
describe('o búzios diz o que ele não é', () => {
  it('antes de jogar, a tela diz que quem joga é um sacerdote', () => {
    render(<TelaBuziosPreparo />);
    expect(screen.getByText(/pai ou mãe de santo iniciado/)).toBeTruthy();
    expect(screen.getByText(/nada neste aplicativo ocupa o lugar dessa consulta/)).toBeTruthy();
  });

  it('diz o que a prática É, e não só o que o app não é', () => {
    // A primeira versão só avisava. Sem dizer de onde a prática vem, o aviso soa como
    // isenção jurídica; com isso, soa como aproximação, que é a intenção.
    render(<TelaBuziosPreparo />);
    expect(screen.getByText(/prática de séculos/)).toBeTruthy();
    expect(screen.getByText(/respeito por quem a mantém viva/)).toBeTruthy();
  });

  it('e manda procurar um terreiro, em vez de se oferecer no lugar dele', () => {
    // O ponto não é só avisar: é apontar para onde a consulta de verdade acontece.
    render(<TelaBuziosPreparo />);
    expect(screen.getByText(/procure um terreiro/)).toBeTruthy();
  });

  it('a nota é opcional: quem não passa não ganha nota nenhuma', () => {
    // Os outros oráculos não têm o que dizer aqui, e uma nota vazia ocuparia espaço
    // na tela deles.
    render(
      <AberturaOraculo titulo="Teste" frase="Frase" acaoLabel="Seguir" aoAvancar={() => {}}>
        <Text>palco</Text>
      </AberturaOraculo>,
    );
    expect(screen.queryByText(/sacerdote/)).toBeNull();
  });
});
