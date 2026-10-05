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
 *
 * A nota abaixo do botão diz, antes de a pessoa jogar, que no candomblé quem joga é
 * um sacerdote iniciado — não quem consulta. O app diverge disso de propósito, como
 * porta de entrada, e `docs/referencias/2026-10-05-fontes-de-buzios.md` registra a
 * divergência. Entregar o jogo calado, como se jogar sozinho no telefone fosse a
 * prática, seria a desonestidade que a nota existe para evitar.
 */
const NOTA_DO_BUZIOS = 'O jogo de búzios é prática de séculos: atravessou o Atlântico '
  + 'com os africanos escravizados e foi guardada nos terreiros até hoje. Aqui ele é uma '
  + 'aproximação — um jeito de conhecer essa cultura de perto, com respeito por quem a '
  + 'mantém viva. Quem joga de verdade é um pai ou mãe de santo iniciado, e nada neste '
  + 'aplicativo ocupa o lugar dessa consulta. Se o que vier fizer sentido, procure um '
  + 'terreiro.';
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
      nota={NOTA_DO_BUZIOS}
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
