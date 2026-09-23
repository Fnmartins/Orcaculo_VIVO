import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing } from 'react-native';
import { router } from 'expo-router';
import { AberturaOraculo, useReduzirMovimento } from '../../components/AberturaOraculo';
import { MesaBuzios } from '../../components/MesaBuzios';
import { Hapticos } from '../../utils/haptics';

const { width: LARGURA_TELA } = Dimensions.get('window');
const TAMANHO_MESA = Math.min(LARGURA_TELA * 0.62, 300);

/**
 * Abertura do búzios: a peneira pousa e o jogo começa quando a pessoa toca.
 *
 * Antes eram 12,5 s obrigatórios com barra de progresso e um vídeo que começava
 * cortado em 1,8 s e repetia o corte a cada volta. Conselho de 21/09, itens B5 e
 * I1 a I3: nada de espera imposta, o objeto da própria prática no centro. Não
 * aparece mão humana preparando as conchas — preparar búzios é ato de quem é
 * iniciado (parecer de 23/09).
 */
export default function TelaBuziosPreparo() {
  const reduzirMovimento = useReduzirMovimento();
  const entrada = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduzirMovimento) {
      entrada.setValue(1);
      return;
    }
    // Termina em repouso, sem loop.
    Animated.timing(entrada, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrada, reduzirMovimento]);

  return (
    <AberturaOraculo
      titulo="Búzios"
      frase="Respire e pense no que você quer compreender."
      acaoLabel="Estou pronto"
      aoAvancar={() => {
        Hapticos.impactoLeve();
        router.replace('/consulta/buzios-jogo');
      }}
    >
      <Animated.View
        style={{
          opacity: entrada,
          transform: [
            { scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
          ],
        }}
      >
        <MesaBuzios tamanho={TAMANHO_MESA} />
      </Animated.View>
    </AberturaOraculo>
  );
}
