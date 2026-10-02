import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Espacamento } from '../../constants/spacing';

interface Props {
  /** Desenha a vaga de um índice. Este componente só arruma — não sabe o que é carta. */
  vaga: (indice: number) => ReactNode;
}

/** Largura mínima de tela para a cruz caber sem espremer. Abaixo disso, vai em coluna. */
export const LARGURA_MINIMA_DA_CRUZ = 760;

/**
 * As dez posições na forma que dá nome à tiragem.
 *
 * A ordem das posições é a do protótipo, e o lugar de cada uma é o da tradição:
 *
 * ```
 *                 [5 busca]
 *   [4 passou]  [1 situação][2 atravessa]  [6 vem]     [10 caminha]
 *                 [3 raiz]                             [9 esperança]
 *                                                      [8 outros]
 *                                                      [7 você]
 * ```
 *
 * **A carta que atravessa fica ao lado, não por cima.** Na mesa de verdade ela é posta
 * cruzada sobre a primeira; aqui, sobrepor esconderia as duas e, pior, deixaria as duas
 * vagas uma em cima da outra — tocar numa seria tocar na outra, e a pessoa não
 * conseguiria escolher onde pôr a carta. Lado a lado, a cruz se lê e as duas se tocam.
 */
export function CruzCelta({ vaga }: Props) {
  return (
    <View style={estilos.tudo}>
      <View style={estilos.cruz}>
        <View style={estilos.braco}>{vaga(3)}</View>

        <View style={estilos.meio}>
          {vaga(4)}
          <View style={estilos.centro}>
            {vaga(0)}
            {vaga(1)}
          </View>
          {vaga(2)}
        </View>

        <View style={estilos.braco}>{vaga(5)}</View>
      </View>

      {/* O bastão, de cima para baixo: para onde caminha, esperança e medo, os outros,
          você nisso. É assim que ele se lê na mesa. */}
      <View style={estilos.bastao}>
        {vaga(9)}
        {vaga(8)}
        {vaga(7)}
        {vaga(6)}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tudo: {
    flexDirection: 'row', gap: Espacamento.lg,
    alignItems: 'center', justifyContent: 'center', width: '100%',
  },
  cruz: { flexDirection: 'row', gap: Espacamento.sm, alignItems: 'center' },
  braco: { justifyContent: 'center' },
  meio: { gap: Espacamento.sm, alignItems: 'center' },
  centro: { flexDirection: 'row', gap: Espacamento.sm },
  bastao: { gap: Espacamento.sm },
});
