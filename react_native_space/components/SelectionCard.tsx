import React, { useRef, useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  View,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { Hapticos } from '../utils/haptics';

type IconeLib = 'ionicons' | 'material';

interface Props {
  titulo: string;
  descricao?: string;
  icone: string;
  iconeLib?: IconeLib;
  selecionado: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SelectionCard({
  titulo,
  descricao,
  icone,
  iconeLib = 'ionicons',
  selecionado,
  onPress,
  style,
}: Props) {
  const escalaAnim = useRef(new Animated.Value(1)).current;

  const aoPresionar = useCallback(() => {
    Animated.spring(escalaAnim, {
      toValue: 0.96,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [escalaAnim]);

  const aoSoltar = useCallback(() => {
    Animated.spring(escalaAnim, {
      toValue: 1,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [escalaAnim]);

  const aoClicar = useCallback(() => {
    Hapticos.impactoLeve();
    onPress();
  }, [onPress]);

  const IconeComponente = iconeLib === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <Animated.View style={[{ transform: [{ scale: escalaAnim }] }, style]}>
      <Pressable
        onPressIn={aoPresionar}
        onPressOut={aoSoltar}
        onPress={aoClicar}
        accessibilityRole="button"
        accessibilityLabel={titulo}
        accessibilityState={{ selected: selecionado }}
        style={[
          estilos.card,
          selecionado && estilos.cardSelecionado,
        ]}
      >
        {/* Indicador de seleção */}
        {selecionado && (
          <View style={estilos.checkContainer}>
            <Ionicons name="checkmark-circle" size={20} color={Cores.acento} />
          </View>
        )}

        <View style={[
          estilos.iconeContainer,
          selecionado && estilos.iconeContainerSelecionado,
        ]}>
          <IconeComponente
            name={icone as any}
            size={28}
            color={selecionado ? Cores.acento : Cores.textoClaro}
          />
        </View>

        <Text style={[
          estilos.titulo,
          selecionado && estilos.tituloSelecionado,
        ]}>
          {titulo}
        </Text>

        {descricao && (
          <Text style={estilos.descricao} numberOfLines={2}>
            {descricao}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },
  cardSelecionado: {
    borderColor: Cores.acento,
    borderWidth: 2,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
  checkContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  iconeContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(88, 117, 101, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.sm,
  },
  iconeContainerSelecionado: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  titulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    color: Cores.textoClaro,
    textAlign: 'center',
    marginTop: 4,
  },
  tituloSelecionado: {
    color: Cores.acento,
  },
  descricao: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
});
