import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento } from '../constants/spacing';
import type { FalhaDaIA } from '../services/falhaDaIA';

/**
 * O aviso de que a leitura por IA não veio, dizendo **por que**.
 *
 * Existe para tirar a duplicação: tarô e búzios tinham o mesmo bloco copiado letra por
 * letra, com a mesma frase fixa — e corrigir a frase em um e esquecer o outro era o
 * jeito mais fácil de a tela voltar a mentir.
 *
 * Quando `tentarDeNovo` é falso não há `Pressable`: recusa de plano não muda por
 * insistência, e o ícone deixa de ser o de recarregar para não prometer o contrário.
 */

interface Props {
  falha: FalhaDaIA;
  aoTentarDeNovo: () => void;
}

export function AvisoDeFalhaIA({ falha, aoTentarDeNovo }: Props) {
  const conteudo = (
    <View style={estilos.caixa}>
      <Ionicons
        name={falha.tentarDeNovo ? 'refresh-outline' : 'lock-closed-outline'}
        size={16}
        color={Cores.textoSecundario}
      />
      <Text style={estilos.texto}>{falha.texto}</Text>
    </View>
  );

  if (!falha.tentarDeNovo) return conteudo;

  return (
    <Pressable
      onPress={aoTentarDeNovo}
      accessibilityRole="button"
      accessibilityLabel="Tentar gerar a interpretação novamente"
    >
      {conteudo}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  // Os mesmos valores que `iaErro` e `iaErroTexto` tinham nas duas telas, para o aviso
  // não mudar de lugar nem de tamanho nesta entrega. O `flex: 1` no texto é novo e
  // necessário: a frase do servidor é mais longa que "Falha ao conectar" e sem ele
  // estourava a largura em vez de quebrar linha.
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.xs,
    padding: Espacamento.sm,
  },
  texto: {
    flex: 1,
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
});
