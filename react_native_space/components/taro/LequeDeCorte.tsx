import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

interface Props {
  quantidade: number;
  aoCortar: (indice: number) => void;
  desligado?: boolean;
}

const LARGURA_LAMINA = 38;
const ALTURA_LAMINA = 60;
const MEIA_ABERTURA = 38; // graus para cada lado: leque de mão, não semicírculo

/**
 * O baralho aberto em arco, de costas.
 *
 * Gira em torno de um pivô ABAIXO das cartas — é isso que faz o leque abrir em arco em
 * vez de esticar na horizontal. As pontas descem `raio * (1 - cos)`, e a altura da mesa
 * sai dessa conta: com altura fixa, o arco é cortado pela borda.
 */
export function LequeDeCorte({ quantidade, aoCortar, desligado = false }: Props) {
  const { width } = useWindowDimensions();
  const { queda, passo } = useMemo(() => {
    const rad = (MEIA_ABERTURA * Math.PI) / 180;
    const raio = Math.min(430, Math.max(170, (width / 2 - 26) / Math.sin(rad)));
    return {
      queda: raio * (1 - Math.cos(rad)),
      passo: quantidade > 1 ? (MEIA_ABERTURA * 2) / (quantidade - 1) : 0,
    };
  }, [width, quantidade]);

  return (
    <View style={[estilos.mesa, { height: ALTURA_LAMINA + queda + 22 }]}>
      {Array.from({ length: quantidade }, (_, i) => (
        <View
          key={i}
          style={[estilos.pivo, {
            bottom: queda + 10,
            zIndex: i,
            transform: [{ rotate: `${(-MEIA_ABERTURA + i * passo).toFixed(2)}deg` }],
          }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cortar aqui, carta ${i + 1} de ${quantidade}`}
            onPress={() => { if (!desligado) aoCortar(i); }}
            style={estilos.lamina}
          />
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  mesa: { position: 'relative', marginTop: 16 },
  // Duas camadas de propósito: o invólucro gira e a lâmina se desloca. Numa só, a
  // animação do corte apagaria a rotação e as cartas levantadas se empilhariam.
  pivo: {
    position: 'absolute', left: '50%', width: LARGURA_LAMINA, height: ALTURA_LAMINA,
    marginLeft: -LARGURA_LAMINA / 2,
  },
  lamina: {
    width: '100%', height: '100%', borderRadius: 5,
    backgroundColor: '#2A1B3D', borderWidth: 1, borderColor: 'rgba(181,139,70,0.45)',
  },
});
