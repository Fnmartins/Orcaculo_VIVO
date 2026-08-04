import React, { useRef, useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { RaioBorda } from '../constants/spacing';
import { Hapticos } from '../utils/haptics';

type Variante = 'primary' | 'secondary' | 'outline' | 'ghost';

interface Props {
  variante?: Variante;
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icone?: keyof typeof Ionicons.glyphMap;
  posicaoIcone?: 'left' | 'right';
  larguraTotal?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  variante = 'primary',
  label,
  onPress,
  loading = false,
  disabled = false,
  icone,
  posicaoIcone = 'right',
  larguraTotal = false,
  style,
}: Props) {
  const escalaAnim = useRef(new Animated.Value(1)).current;

  const aoPresionar = useCallback(() => {
    if (disabled || loading) return;
    Animated.spring(escalaAnim, {
      toValue: 0.97,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [disabled, loading, escalaAnim]);

  const aoSoltar = useCallback(() => {
    Animated.spring(escalaAnim, {
      toValue: 1,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [escalaAnim]);

  const aoClicar = useCallback(() => {
    if (disabled || loading) return;
    Hapticos.impactoMedio();
    onPress?.();
  }, [disabled, loading, onPress]);

  const altura = variante === 'outline' || variante === 'ghost' ? 48 : 56;
  const corTexto = obterCorTexto(variante);
  const corIcone = corTexto;

  const conteudo = (
    <>
      {loading ? (
        <ActivityIndicator color={corTexto} size="small" />
      ) : (
        <>
          {icone && posicaoIcone === 'left' && (
            <Ionicons name={icone} size={20} color={corIcone} style={estilos.iconeEsquerda} />
          )}
          <Text
            style={[
              estilos.texto,
              { color: corTexto, fontFamily: Fontes.corpoNegrito },
            ]}
            accessibilityLabel={label}
          >
            {label}
          </Text>
          {icone && posicaoIcone === 'right' && (
            <Ionicons name={icone} size={20} color={corIcone} style={estilos.iconeDireita} />
          )}
        </>
      )}
    </>
  );

  const estiloContainer: StyleProp<ViewStyle>[] = [
    estilos.base,
    { height: altura },
    larguraTotal && estilos.larguraTotal,
    disabled && estilos.desabilitado,
    style,
  ];

  return (
    <Animated.View style={{ transform: [{ scale: escalaAnim }] }}>
      <Pressable
        onPressIn={aoPresionar}
        onPressOut={aoSoltar}
        onPress={aoClicar}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || loading }}
      >
        {variante === 'primary' ? (
          <LinearGradient
            colors={Cores.gradienteAcento}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[...estiloContainer]}
          >
            {conteudo}
          </LinearGradient>
        ) : (
          <Animated.View
            style={[
              ...estiloContainer,
              variante === 'secondary' && estilos.secondary,
              variante === 'outline' && estilos.outline,
              variante === 'ghost' && estilos.ghost,
            ]}
          >
            {conteudo}
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function obterCorTexto(variante: Variante): string {
  switch (variante) {
    case 'primary':
      return Cores.fundoEscuro;
    case 'secondary':
      return Cores.textoClaro;
    case 'outline':
    case 'ghost':
      return Cores.acento;
    default:
      return Cores.textoClaro;
  }
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RaioBorda.lg,
    paddingHorizontal: 24,
    minWidth: 44,
    minHeight: 44,
  },
  larguraTotal: {
    width: '100%',
  },
  desabilitado: {
    opacity: 0.5,
  },
  secondary: {
    backgroundColor: Cores.primaria,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Cores.acento,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  texto: {
    fontSize: 16,
    fontWeight: '700',
  },
  iconeEsquerda: {
    marginRight: 8,
  },
  iconeDireita: {
    marginLeft: 8,
  },
});
