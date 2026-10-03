import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ARCANOS_MAIORES } from '../../../data/tarot';
import { VagaDaTiragem } from '../VagaDaTiragem';

const PASSADO = { nome: 'Passado', regra: 'o que já se consumou e ainda pesa' };
const TORRE = ARCANOS_MAIORES[16];

describe('VagaDaTiragem', () => {
  it('vazia, mostra a pergunta que a posição faz', () => {
    // A tiragem se explica sozinha por causa disto: as perguntas são lidas antes
    // de qualquer resposta. Esconder a regra até a carta cair desperdiça o momento.
    render(<VagaDaTiragem posicao={PASSADO} carta={null} aoReceber={jest.fn()} />);
    expect(screen.getByText('Passado')).toBeTruthy();
    expect(screen.getByText('o que já se consumou e ainda pesa')).toBeTruthy();
  });

  it('vazia, recebe o toque', () => {
    const aoReceber = jest.fn();
    render(<VagaDaTiragem posicao={PASSADO} carta={null} aoReceber={aoReceber} />);
    fireEvent.press(screen.getByLabelText('Posição Passado, vazia'));
    expect(aoReceber).toHaveBeenCalledTimes(1);
  });

  it('a carta pousa de costas, e o toque vira', () => {
    // A spec diz "pousa de costas, vira". Se a cena aparecer na hora em que a carta
    // cai, a virada deixa de existir — e ela é o momento da leitura.
    const aoVirar = jest.fn();
    const aoReceber = jest.fn();
    render(
      <VagaDaTiragem posicao={PASSADO} carta={TORRE} aoReceber={aoReceber} aoVirar={aoVirar} />
    );
    expect(screen.queryByLabelText(TORRE.nomeCompleto)).toBeNull();
    fireEvent.press(screen.getByLabelText('Posição Passado, carta de costas, toque para virar'));
    expect(aoVirar).toHaveBeenCalledTimes(1);
    expect(aoReceber).not.toHaveBeenCalled();
  });

  it('revelada, mostra a cena e não aceita outra', () => {
    const aoReceber = jest.fn();
    const aoVirar = jest.fn();
    render(
      <VagaDaTiragem posicao={PASSADO} carta={TORRE} revelada aoReceber={aoReceber} aoVirar={aoVirar} />
    );
    expect(screen.getByLabelText(TORRE.nomeCompleto)).toBeTruthy();
    fireEvent.press(screen.getByLabelText(`Posição Passado, ${TORRE.nomeCompleto}`));
    expect(aoReceber).not.toHaveBeenCalled();
    expect(aoVirar).not.toHaveBeenCalled();
  });

  it('revelada, a pergunta da posição dá lugar à carta', () => {
    // Enquanto vazia a vaga faz a pergunta; com a carta virada, quem fala é a carta.
    render(<VagaDaTiragem posicao={PASSADO} carta={TORRE} revelada aoReceber={jest.fn()} />);
    expect(screen.queryByText(PASSADO.regra)).toBeNull();
  });
});

it('revelada, mostra o nome completo e o significado da carta', () => {
  // No prototipo a vaga mostra `c.n` e `c.s`. Eu tinha posto so o nome curto, e com
  // isso a tiragem virava quatro palavras soltas por carta.
  render(<VagaDaTiragem posicao={PASSADO} carta={TORRE} revelada aoReceber={jest.fn()} />);
  expect(screen.getByText(TORRE.nomeCompleto)).toBeTruthy();
  expect(screen.getByText(TORRE.significado)).toBeTruthy();
});

describe('tamanho da vaga', () => {
  const larguraDa = (compacta: boolean) => {
    const { getByLabelText } = render(
      <VagaDaTiragem
        posicao={PASSADO}
        carta={null}
        compacta={compacta}
        aoReceber={jest.fn()}
      />,
    );
    const estilo = StyleSheet.flatten(
      getByLabelText('Posição Passado, vazia').props.style,
    ) as Record<string, unknown>;
    return estilo.width;
  };

  it('compacta tem largura fixa, nunca 100%', () => {
    // Dentro das colunas da Cruz Celta, `width: '100%'` faz cada vaga tentar ocupar a
    // linha inteira — e duas acabam no mesmo lugar, uma sobre a outra. Aconteceu com
    // "O que atravessa" e "O que vem", medidas no mesmo x na tela.
    expect(typeof larguraDa(true)).toBe('number');
  });

  it('normal ocupa a coluna inteira', () => {
    expect(larguraDa(false)).toBe('100%');
  });
});

type No = ReturnType<typeof screen.getByText>;

describe('vaga deitada', () => {
  // Gira o próprio elemento ou algum de seus ancestrais: é o que decide se, na tela, o
  // conteúdo dele aparece de lado. Só `rotate` conta; o `rotateY` da virada é outra coisa.
  const giraPor = (no: No): boolean => {
    for (let atual: No | null = no; atual; atual = atual.parent) {
      const estilo = StyleSheet.flatten(atual.props.style) as
        { transform?: { rotate?: string }[] } | undefined;
      if (estilo?.transform?.some((t) => t.rotate === '90deg')) return true;
    }
    return false;
  };

  it('a carta é posta de lado: a lâmina gira um quarto de volta', () => {
    render(<VagaDaTiragem posicao={PASSADO} carta={TORRE} revelada deitada aoReceber={jest.fn()} />);
    expect(giraPor(screen.getByTestId('lamina-deitada'))).toBe(true);
    // A carta mora dentro da lâmina, então vai junto.
    expect(giraPor(screen.getByLabelText(TORRE.nomeCompleto))).toBe(true);
  });

  it('o nome da posição e a pergunta continuam na horizontal', () => {
    // O defeito que isto pega: girar o cartão inteiro. Na mesa de verdade quem é posta
    // cruzada é a carta; "O que atravessa" e a pergunta dela, lidos de lado, tiram a
    // única coisa que explica a posição.
    render(<VagaDaTiragem posicao={PASSADO} carta={null} deitada aoReceber={jest.fn()} />);
    expect(giraPor(screen.getByText(PASSADO.nome))).toBe(false);
    expect(giraPor(screen.getByText(PASSADO.regra))).toBe(false);
    // E não é que nada gire: a lâmina vazia gira, só o texto não.
    expect(giraPor(screen.getByTestId('lamina-deitada'))).toBe(true);
  });

  it('com a carta virada, o nome e o significado dela também não giram', () => {
    render(<VagaDaTiragem posicao={PASSADO} carta={TORRE} revelada deitada aoReceber={jest.fn()} />);
    expect(giraPor(screen.getByText(PASSADO.nome))).toBe(false);
    expect(giraPor(screen.getByText(TORRE.nomeCompleto))).toBe(false);
    expect(giraPor(screen.getByText(TORRE.significado))).toBe(false);
  });

  it('por padrão nada gira', () => {
    render(<VagaDaTiragem posicao={PASSADO} carta={TORRE} revelada aoReceber={jest.fn()} />);
    expect(screen.queryByTestId('lamina-deitada')).toBeNull();
    expect(giraPor(screen.getByLabelText(TORRE.nomeCompleto))).toBe(false);
  });
});
