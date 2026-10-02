import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';

interface Props {
  /** Quantas cartas tem cada monte, na ordem em que foram tirados. */
  tamanhos: number[];
}

const LARGURA = 38;
const ALTURA = 60;
/** Mais do que quatro folhas não se distingue a olho, e o monte vira um borrão. */
const MAX_FOLHAS = 4;

/**
 * Os montes que a pessoa já tirou do leque.
 *
 * Vem do protótipo, onde aparecem embaixo da mesa a cada corte. Sem isso o corte não
 * deixa rastro: a pessoa toca, o leque encurta, e nada no mundo registra que ela fez
 * alguma coisa — que é o contrário do que o rito promete.
 *
 * Recebe só os tamanhos. A ordem já foi decidida por `cortar`, e este componente não
 * participa dela.
 */
export function MontesCortados({ tamanhos }: Props) {
  if (tamanhos.length === 0) return null;
  return (
    <View style={estilos.linha}>
      {tamanhos.map((quantas, i) => (
        <View key={i} style={estilos.monte}>
          <View style={estilos.pilha}>
            {Array.from({ length: Math.min(MAX_FOLHAS, quantas) }, (_, k) => (
              <View
                key={k}
                style={[estilos.folha, {
                  transform: [{ translateX: k * 2 }, { translateY: -k * 2 }],
                }]}
              />
            ))}
          </View>
          <Text style={estilos.rotulo}>
            {`${i + 1}º · ${quantas} ${quantas === 1 ? 'carta' : 'cartas'}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Espacamento.md,
    alignItems: 'flex-end', width: '100%',
  },
  monte: { alignItems: 'center', gap: 6 },
  pilha: { width: LARGURA, height: ALTURA },
  folha: {
    position: 'absolute', top: 0, left: 0, width: LARGURA, height: ALTURA,
    borderRadius: 5, backgroundColor: '#2A1B3D',
    borderWidth: 1, borderColor: 'rgba(181,139,70,0.45)',
  },
  rotulo: {
    fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario,
  },
});
