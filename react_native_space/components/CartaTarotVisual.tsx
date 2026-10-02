import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Cores } from '../constants/colors';
import { ARTE_POR_ID } from '../data/arteDoTaro';

/**
 * A carta como ela é: a cena de 1909.
 *
 * Até 01/10 este componente desenhava um retângulo com degradê e um ícone do Ionicons
 * no meio. No Rider-Waite isso não é uma simplificação, é outro produto — as
 * interpretações descrevem o que está na imagem, e sem a imagem a leitura vira
 * recitação de significado.
 */

interface CartaTarotVisualProps {
  cartaId: number;
  nome: string;
  /** Usada a partir da Fase 2; entra agora para a tela não mudar de forma depois. */
  invertida?: boolean;
  largura?: number;
}

export function CartaTarotVisual({
  cartaId, nome, invertida = false, largura = 82,
}: CartaTarotVisualProps) {
  const altura = largura * 1.58;
  return (
    <View
      accessibilityLabel={invertida ? `${nome}, invertida` : nome}
      style={[estilos.moldura, { width: largura, height: altura, borderRadius: largura * 0.1 }]}
    >
      <Image
        source={ARTE_POR_ID[cartaId]}
        style={[estilos.arte, invertida && estilos.deCabecaParaBaixo]}
        contentFit="cover"
        transition={160}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  moldura: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    // Fundo escuro por baixo: enquanto a imagem carrega, um retângulo claro piscaria
    // branco no meio de uma tela de oráculo.
    backgroundColor: '#0C0714',
  },
  arte: { width: '100%', height: '100%' },
  deCabecaParaBaixo: { transform: [{ rotate: '180deg' }] },
});
