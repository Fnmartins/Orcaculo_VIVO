import React from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Cores } from '../constants/colors';

interface CartaTarotVisualProps {
  icone: string;
  cor: string;
  largura?: number;
}

export function CartaTarotVisual({ icone, cor, largura = 82 }: CartaTarotVisualProps) {
  const altura = largura * 1.58;
  const tamanhoIcone = Math.round(largura * 0.34);

  return (
    <View style={[estilos.sombra, { width: largura, height: altura, borderRadius: largura * 0.1 }]}> 
      <LinearGradient
        colors={[cor + '38', '#160B29', '#0C0714'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[estilos.carta, { borderRadius: largura * 0.1, padding: largura * 0.08 }]}
      >
        <View style={[estilos.moldura, { borderRadius: largura * 0.06 }]}> 
          <MaterialCommunityIcons name="star-four-points" size={Math.max(8, largura * 0.1)} color={Cores.acento} />
          <View style={[estilos.arco, { width: largura * 0.48, height: largura * 0.48, borderRadius: largura * 0.24, borderColor: cor + '65' }]}> 
            <Ionicons name={icone as any} size={tamanhoIcone} color={cor} />
          </View>
          <MaterialCommunityIcons name="star-four-points" size={Math.max(8, largura * 0.1)} color={Cores.acento} />
        </View>
        <View style={[estilos.canto, estilos.cantoSuperiorEsquerdo]} />
        <View style={[estilos.canto, estilos.cantoSuperiorDireito]} />
        <View style={[estilos.canto, estilos.cantoInferiorEsquerdo]} />
        <View style={[estilos.canto, estilos.cantoInferiorDireito]} />
      </LinearGradient>
    </View>
  );
}

const estilos = StyleSheet.create({
  sombra: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 8,
  },
  carta: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.72)',
  },
  moldura: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.28)',
  },
  arco: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(88,117,101,0.07)',
  },
  canto: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderColor: Cores.acento,
  },
  cantoSuperiorEsquerdo: { top: 5, left: 5, borderTopWidth: 1, borderLeftWidth: 1 },
  cantoSuperiorDireito: { top: 5, right: 5, borderTopWidth: 1, borderRightWidth: 1 },
  cantoInferiorEsquerdo: { bottom: 5, left: 5, borderBottomWidth: 1, borderLeftWidth: 1 },
  cantoInferiorDireito: { bottom: 5, right: 5, borderBottomWidth: 1, borderRightWidth: 1 },
});
