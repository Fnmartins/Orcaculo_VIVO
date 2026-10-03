import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { VersoDaCarta } from './VersoDaCarta';
import { Cores } from '../../constants/colors';

interface Props {
  quantidade: number;
  aoCortar: (indice: number) => void;
  desligado?: boolean;
  /**
   * O dedo encostou na carta `indice` (ou saiu, com `null`).
   *
   * Serve para a tela dizer quantas cartas sairiam ANTES de soltar. Sem isso, tocar
   * perto da ponta direita leva quase o baralho inteiro de uma vez, e a pessoa só
   * descobre depois — foi assim que o leque de 22 acabou em um corte.
   */
  aoApontar?: (indice: number | null) => void;
}

const LARGURA_LAMINA = 38;
const ALTURA_LAMINA = 60;
/** Graus para cada lado: leque de mão, não semicírculo. */
export const MEIA_ABERTURA = 38;
const MARGEM_LATERAL = 16;
const RAIO_MAXIMO = 430;
const FOLGA_EMBAIXO = 22;

export interface LugarDaLamina {
  /** Deslocamento horizontal do centro da lâmina em relação ao meio da mesa. */
  x: number;
  /** O quanto esta lâmina desce em relação à do meio. */
  y: number;
  /** Graus de rotação. */
  giro: number;
}

export interface GeometriaDoLeque {
  /** Distância do pivô ao centro da lâmina. É ela que decide o quanto o arco abre. */
  raio: number;
  /** O quanto as pontas descem em relação à lâmina do meio. */
  queda: number;
  /** Metade da largura ocupada pelo arco, já contando a lâmina. */
  meiaLargura: number;
  /** Altura que a mesa precisa ter para o arco não ser cortado pela borda. */
  altura: number;
  /** Onde cada lâmina fica, já resolvido — uma entrada por carta. */
  lugares: LugarDaLamina[];
}

/**
 * A conta do arco, separada do componente para poder ser verificada sozinha.
 *
 * **Cada lâmina sai daqui com posição de layout, não com um transform que a desloca.**
 * Não é preciosismo: até 02/10 as 22 lâminas tinham a mesma caixa de layout
 * (`top: 0, left: 50%`) e só o transform as espalhava. Onde o toque é testado pela
 * caixa e não pelo desenho, elas ficam empilhadas num ponto só e apenas a de cima
 * recebe o toque — o leque parecia morto, com um único "lugar certo" que cortava sempre
 * na mesma carta. Posicionadas por layout, a área de toque é onde a carta aparece.
 *
 * O raio sai da largura disponível, e não de um número fixo: preso, o arco estoura a
 * tela no celular e fica pequeno demais no navegador.
 */
export function geometriaDoLeque(larguraDaTela: number, quantidade: number): GeometriaDoLeque {
  const rad = (MEIA_ABERTURA * Math.PI) / 180;
  const disponivel = Math.max(120, larguraDaTela / 2 - LARGURA_LAMINA / 2 - MARGEM_LATERAL);
  const raio = Math.min(RAIO_MAXIMO, disponivel / Math.sin(rad));
  const queda = raio * (1 - Math.cos(rad));
  const passo = quantidade > 1 ? (MEIA_ABERTURA * 2) / (quantidade - 1) : 0;

  // Girar em torno de um pivô `raio` abaixo leva o centro da lâmina para
  // (raio·sen θ, raio·(1 − cos θ)). É a mesma figura de antes, resolvida em números em
  // vez de delegada ao transform.
  const lugares = Array.from({ length: quantidade }, (_, i) => {
    const giro = quantidade > 1 ? -MEIA_ABERTURA + i * passo : 0;
    const t = (giro * Math.PI) / 180;
    return { x: raio * Math.sin(t), y: raio * (1 - Math.cos(t)), giro };
  });

  return {
    raio,
    queda,
    meiaLargura: raio * Math.sin(rad) + LARGURA_LAMINA / 2,
    altura: ALTURA_LAMINA + queda + FOLGA_EMBAIXO,
    lugares,
  };
}

/**
 * O baralho aberto em arco, de costas.
 *
 * Encostar numa lâmina acende todas até ela: a escolha é de um monte, não de uma carta
 * solta, e sem ver o monte a pessoa acha que está escolhendo a carta em que encostou.
 */
export function LequeDeCorte({
  quantidade, aoCortar, desligado = false, aoApontar,
}: Props) {
  const { width } = useWindowDimensions();
  const { altura, lugares } = useMemo(
    () => geometriaDoLeque(width, quantidade),
    [width, quantidade],
  );
  const [apontado, setApontado] = useState<number | null>(null);

  return (
    <View style={[estilos.mesa, { height: altura }, desligado && estilos.inerte]}>
      {lugares.map(({ x, y, giro }, i) => {
        const aceso = apontado !== null && i <= apontado;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Cortar aqui, carta ${i + 1} de ${quantidade}`}
            // Alvo de 38 pixels é menos que o mínimo confortável de toque; o hitSlop
            // devolve a folga sem alargar a lâmina e desmontar o arco.
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            onPressIn={() => {
              if (desligado) return;
              setApontado(i);
              aoApontar?.(i);
            }}
            onPressOut={() => { setApontado(null); aoApontar?.(null); }}
            onPress={() => { if (!desligado) aoCortar(i); }}
            style={[estilos.lamina, {
              left: '50%',
              marginLeft: -LARGURA_LAMINA / 2 + x,
              top: y,
              zIndex: i,
              transform: [{ rotate: `${giro.toFixed(2)}deg` }],
            }]}
          >
            {/* Acender mexe só no desenho, e o desenho não recebe toque. Se a caixa subisse
                ou ganhasse um contorno por cima no meio do aperto, o soltar cairia noutro
                elemento e o navegador não geraria o `click` de que o `onPress` depende. */}
            <View
              testID="desenho-da-lamina"
              pointerEvents="none"
              style={{ transform: [{ translateY: aceso ? -12 : 0 }] }}
            >
              <VersoDaCarta largura={LARGURA_LAMINA} altura={ALTURA_LAMINA} />
              {aceso && <View style={estilos.contorno} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  mesa: { position: 'relative', width: '100%', marginTop: 16 },
  // Sem corte possivel, o leque para de parecer clicavel. Um leque de aparencia normal
  // que nao responde se le como defeito — foi exatamente o que aconteceu.
  inerte: { opacity: 0.4 },
  lamina: { position: 'absolute', width: LARGURA_LAMINA, height: ALTURA_LAMINA },
  contorno: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 5, borderWidth: 1.5, borderColor: Cores.acento,
  },
});
