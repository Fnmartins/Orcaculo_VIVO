import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { VersoDaCarta } from './VersoDaCarta';

interface Props {
  quantidade: number;
  aoCortar: (indice: number) => void;
  desligado?: boolean;
}

const LARGURA_LAMINA = 38;
const ALTURA_LAMINA = 60;
/** Graus para cada lado: leque de mão, não semicírculo. */
export const MEIA_ABERTURA = 38;
const MARGEM_LATERAL = 16;
const RAIO_MAXIMO = 430;
const FOLGA_EMBAIXO = 22;

export interface GeometriaDoLeque {
  /** Distância do pivô ao centro da lâmina. É ela que decide o quanto o arco abre. */
  raio: number;
  /** O quanto as pontas descem em relação à lâmina do meio. */
  queda: number;
  /** Metade da largura ocupada pelo arco, já contando a lâmina. */
  meiaLargura: number;
  /** Graus entre uma lâmina e a seguinte. */
  passo: number;
  /** Altura que a mesa precisa ter para o arco não ser cortado pela borda. */
  altura: number;
}

/**
 * A conta do arco, separada do componente para poder ser verificada sozinha.
 *
 * O raio sai da largura disponível, e não de um número fixo: preso, o arco estoura a
 * tela no celular e fica pequeno demais no navegador. O teto de {@link RAIO_MAXIMO}
 * existe porque, acima dele, o arco vira quase uma linha reta.
 */
export function geometriaDoLeque(larguraDaTela: number, quantidade: number): GeometriaDoLeque {
  const rad = (MEIA_ABERTURA * Math.PI) / 180;
  const disponivel = Math.max(120, larguraDaTela / 2 - LARGURA_LAMINA / 2 - MARGEM_LATERAL);
  const raio = Math.min(RAIO_MAXIMO, disponivel / Math.sin(rad));
  const queda = raio * (1 - Math.cos(rad));
  return {
    raio,
    queda,
    meiaLargura: raio * Math.sin(rad) + LARGURA_LAMINA / 2,
    passo: quantidade > 1 ? (MEIA_ABERTURA * 2) / (quantidade - 1) : 0,
    altura: ALTURA_LAMINA + queda + FOLGA_EMBAIXO,
  };
}

/**
 * O baralho aberto em arco, de costas.
 *
 * **O pivô é composto, e tem de ser.** No React Native não existe `transform-origin`:
 * `rotate` gira a view em torno do centro dela. O protótipo era CSS, onde o pivô é
 * configurável — traduzido direto, na Fase 1, as 22 lâminas giraram cada uma sobre si
 * mesma, empilhadas no mesmo ponto, e o leque foi para produção como um borrão de 60
 * pixels no meio da tela. Os testes passavam: contavam lâminas e rótulos, não geometria.
 *
 * Descer `raio`, girar e subir `raio` gira em torno de um ponto `raio` abaixo do centro.
 * É isso que abre o arco.
 */
export function LequeDeCorte({ quantidade, aoCortar, desligado = false }: Props) {
  const { width } = useWindowDimensions();
  const { raio, passo, altura } = useMemo(
    () => geometriaDoLeque(width, quantidade),
    [width, quantidade],
  );

  return (
    <View style={[estilos.mesa, { height: altura }]}>
      {Array.from({ length: quantidade }, (_, i) => (
        <View
          key={i}
          style={[estilos.pivo, {
            zIndex: i,
            transform: [
              { translateY: raio },
              { rotate: `${(-MEIA_ABERTURA + i * passo).toFixed(2)}deg` },
              { translateY: -raio },
            ],
          }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cortar aqui, carta ${i + 1} de ${quantidade}`}
            onPress={() => { if (!desligado) aoCortar(i); }}
            style={estilos.lamina}
          >
            <VersoDaCarta largura={LARGURA_LAMINA} altura={ALTURA_LAMINA} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  mesa: { position: 'relative', width: '100%', marginTop: 16 },
  // Duas camadas de propósito: o invólucro gira e a lâmina se desloca. Numa só, a
  // animação do corte apagaria a rotação e as cartas levantadas se empilhariam.
  pivo: {
    position: 'absolute', top: 0, left: '50%',
    width: LARGURA_LAMINA, height: ALTURA_LAMINA,
    marginLeft: -LARGURA_LAMINA / 2,
  },
  // O verso traz a própria borda dourada e os cantos arredondados; a lâmina só o segura.
  lamina: { width: '100%', height: '100%' },
});
