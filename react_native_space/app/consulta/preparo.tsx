import { useCallback, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AberturaOraculo, useReduzirMovimento } from '../../components/AberturaOraculo';
import { Cores } from '../../constants/colors';
import { Hapticos } from '../../utils/haptics';

const CARTAS = 5;
const LARGURA = 74;
const ALTURA = 112;

type Etapa = 'embaralhar' | 'cortar' | 'indo';

const FRASE: Record<Etapa, string> = {
  embaralhar: 'Pense na sua pergunta e embaralhe as cartas.',
  cortar: 'Agora corte o baralho, quando sentir que é hora.',
  indo: 'As cartas estão prontas.',
};

const ACAO: Record<Etapa, string> = {
  embaralhar: 'Embaralhar',
  cortar: 'Cortar',
  indo: 'Abrindo…',
};

function criarValores(): Animated.Value[] {
  return Array.from({ length: CARTAS }, () => new Animated.Value(0));
}

/**
 * Abertura do tarô: quem pergunta embaralha e corta, como numa leitura de verdade.
 * Antes eram oito segundos de bola de cristal girando — objeto de outra prática, e
 * espera sem participação (conselho de 21/09, itens I1 e I2).
 *
 * O gesto vem antes do sorteio de propósito: as cartas só são sorteadas quando a
 * tela seguinte abre (app/consulta/cartas.tsx). Se um dia o sorteio subir para cá,
 * o gesto perde sentido e deve sair.
 */
export default function TelaPreparoTarot() {
  const [etapa, setEtapa] = useState<Etapa>('embaralhar');
  const reduzirMovimento = useReduzirMovimento();
  const espalhar = useRef(criarValores()).current;
  const corte = useRef(new Animated.Value(0)).current;
  const parado = useRef(new Animated.Value(0)).current;

  const irParaCartas = useCallback(() => {
    setEtapa('indo');
    router.replace('/consulta/cartas');
  }, []);

  const embaralhar = useCallback(() => {
    Hapticos.impactoLeve();
    if (reduzirMovimento) {
      setEtapa('cortar');
      return;
    }
    const idaEVolta = espalhar.map((valor, i) =>
      Animated.sequence([
        Animated.timing(valor, {
          toValue: (i % 2 === 0 ? 1 : -1) * (0.6 + Math.random() * 0.4),
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(valor, {
          toValue: 0,
          duration: 320,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    Animated.stagger(40, idaEVolta).start(() => setEtapa('cortar'));
  }, [espalhar, reduzirMovimento]);

  const cortar = useCallback(() => {
    Hapticos.impactoMedio();
    if (reduzirMovimento) {
      irParaCartas();
      return;
    }
    Animated.sequence([
      Animated.timing(corte, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(corte, {
        toValue: 0,
        duration: 260,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(irParaCartas);
  }, [corte, irParaCartas, reduzirMovimento]);

  const aoAvancar = etapa === 'embaralhar' ? embaralhar : etapa === 'cortar' ? cortar : () => {};

  return (
    <AberturaOraculo
      titulo="Tarô"
      frase={FRASE[etapa]}
      acaoLabel={ACAO[etapa]}
      aoAvancar={aoAvancar}
      desabilitado={etapa === 'indo'}
    >
      {/* O baralho também responde ao toque; o botão da abertura faz a mesma coisa,
          com rótulo, para quem usa leitor de tela. */}
      <Pressable
        onPress={aoAvancar}
        accessibilityRole="button"
        accessibilityLabel={ACAO[etapa]}
        style={estilos.baralho}
      >
        {espalhar.map((valor, i) => {
          const noCorte = i >= CARTAS - 2 ? corte : parado;
          return (
            <Animated.View
              key={i}
              style={[
                estilos.carta,
                {
                  transform: [
                    {
                      translateX: Animated.add(
                        valor.interpolate({ inputRange: [-1, 1], outputRange: [-46, 46] }),
                        noCorte.interpolate({ inputRange: [0, 1], outputRange: [0, 34] }),
                      ),
                    },
                    {
                      translateY: Animated.add(
                        noCorte.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }),
                        new Animated.Value(i * -4),
                      ),
                    },
                    {
                      rotate: valor.interpolate({
                        inputRange: [-1, 1],
                        outputRange: ['-9deg', '9deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={estilos.cartaMiolo} />
            </Animated.View>
          );
        })}
      </Pressable>
    </AberturaOraculo>
  );
}

const estilos = StyleSheet.create({
  baralho: {
    width: LARGURA + 92,
    height: ALTURA + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carta: {
    position: 'absolute',
    width: LARGURA,
    height: ALTURA,
    borderRadius: 10,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartaMiolo: {
    width: LARGURA - 18,
    height: ALTURA - 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
});
