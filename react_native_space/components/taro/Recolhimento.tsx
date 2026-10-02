import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { VersoDaCarta } from './VersoDaCarta';

interface Props {
  /** Falso quando o sistema pede "reduzir movimento": entrega o baralho na hora. */
  ligado: boolean;
  aoTerminar: () => void;
}

const QUANTAS = 20;
const LARGURA = 44;
const ALTURA = 70;
const AFASTAMENTO = 130;
const DURACAO = 1400;

/**
 * O riffle: as duas metades voltando a ser um baralho só.
 *
 * Não recebe nem devolve cartas, de propósito. A ordem já foi decidida por `recolher`
 * quando a pessoa cortou; isto aqui é a figura dessa decisão, não a decisão. Se este
 * componente sumisse, o rito continuaria correto — só mais seco.
 *
 * Uma animação só, com cada carta lendo uma fatia dela, em vez de vinte animações com
 * vinte callbacks: assim `aoTerminar` é chamado uma vez, e não vinte.
 */
export function Recolhimento({ ligado, aoTerminar }: Props) {
  const progresso = useRef(new Animated.Value(0)).current;
  // O callback entra por ref para a animação não recomeçar quando a tela recria a
  // função — recomeçar aqui faria o riffle rodar para sempre.
  const terminar = useRef(aoTerminar);
  terminar.current = aoTerminar;

  useEffect(() => {
    if (!ligado) {
      terminar.current();
      return;
    }
    const animacao = Animated.timing(progresso, {
      toValue: 1,
      duration: DURACAO,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animacao.start(({ finished }) => { if (finished) terminar.current(); });
    return () => animacao.stop();
  }, [ligado, progresso]);

  if (!ligado) return null;

  return (
    <View style={estilos.mesa} accessibilityLabel="Recolhendo o baralho">
      {Array.from({ length: QUANTAS }, (_, i) => {
        const daEsquerda = i % 2 === 0;
        // Cada carta ocupa uma fatia do progresso, deslocada pela ordem: é o que faz as
        // duas metades entrarem intercaladas, em vez de todas de uma vez.
        const inicio = (i / QUANTAS) * 0.6;
        const faixa = [inicio, Math.min(1, inicio + 0.4)];
        const desloca = progresso.interpolate({
          inputRange: faixa,
          outputRange: [daEsquerda ? -AFASTAMENTO : AFASTAMENTO, 0],
          extrapolate: 'clamp',
        });
        const inclina = progresso.interpolate({
          inputRange: faixa,
          outputRange: [daEsquerda ? '-9deg' : '9deg', '0deg'],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            testID="carta-do-riffle"
            style={[estilos.carta, {
              zIndex: i,
              transform: [{ translateX: desloca }, { rotate: inclina }],
            }]}
          >
            <VersoDaCarta largura={LARGURA} altura={ALTURA} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  mesa: {
    height: ALTURA + 24, width: '100%', alignItems: 'center', justifyContent: 'center',
  },
  carta: {
    position: 'absolute', width: LARGURA, height: ALTURA,
  },
});
