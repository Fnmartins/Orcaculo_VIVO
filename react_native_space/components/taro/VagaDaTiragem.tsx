import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { CartaTarotVisual } from '../CartaTarotVisual';
import type { CartaTarot } from '../../data/tarot';

interface Props {
  posicao: { nome: string; regra: string };
  carta: CartaTarot | null;
  aoReceber: () => void;
}

/**
 * Uma das três posições da tiragem.
 *
 * Vazia, ela mostra a pergunta que faz — e é só por isso que a tiragem se explica
 * sozinha. Guardar a regra até a carta cair gasta o único momento em que a pessoa
 * ainda está disposta a ler.
 */
export function VagaDaTiragem({ posicao, carta, aoReceber }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={carta ? `Posição ${posicao.nome}, ${carta.nomeCompleto}` : `Posição ${posicao.nome}, vazia`}
      onPress={() => { if (!carta) aoReceber(); }}
      style={estilos.vaga}
    >
      <Text style={estilos.nome}>{posicao.nome}</Text>
      {carta
        ? <CartaTarotVisual cartaId={carta.id} nome={carta.nomeCompleto} largura={104} />
        : <View style={estilos.vazia} />}
      <Text style={estilos.regra}>{carta ? carta.nome : posicao.regra}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  vaga: { alignItems: 'center', gap: Espacamento.sm, flex: 1, minWidth: 112 },
  nome: { fontFamily: Fontes.titulo, fontSize: 15, color: Cores.acento },
  vazia: {
    width: 104, height: 164, borderRadius: RaioBorda.md,
    borderWidth: 1, borderColor: Cores.cardBorda, borderStyle: 'dashed',
  },
  regra: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario, textAlign: 'center' },
});
