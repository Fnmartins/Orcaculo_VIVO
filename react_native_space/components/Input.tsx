import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { RaioBorda } from '../constants/spacing';

interface Props {
  // Props em português (novo padrão)
  valor?: string;
  aoMudar?: (texto: string) => void;
  seguro?: boolean;
  tipoTeclado?: KeyboardTypeOptions;
  iconeDireita?: keyof typeof Ionicons.glyphMap;
  aoClicarIconeDireita?: () => void;
  // Props em inglês (compatibilidade com telas existentes)
  value?: string;
  onChangeText?: (texto: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  // Props comuns
  label?: string;
  placeholder?: string;
  error?: string;
  iconeEsquerda?: keyof typeof Ionicons.glyphMap;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Input({
  valor, aoMudar, seguro, tipoTeclado, iconeDireita, aoClicarIconeDireita,
  value, onChangeText, secureTextEntry, keyboardType,
  label, placeholder, error, iconeEsquerda,
  autoCapitalize, autoCorrect, editable = true, style,
}: Props) {
  const valorFinal = valor ?? value ?? '';
  const aoMudarFinal = aoMudar ?? onChangeText ?? (() => {});
  const seguroFinal = seguro ?? secureTextEntry ?? false;
  const tecladoFinal = tipoTeclado ?? keyboardType ?? 'default';

  const [focado, setFocado] = useState(false);
  const labelAnim = useRef(new Animated.Value(valorFinal ? 1 : 0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const aoFocar = useCallback(() => {
    setFocado(true);
    if (label) {
      Animated.timing(labelAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    }
  }, [label, labelAnim]);

  const aoDesfocar = useCallback(() => {
    setFocado(false);
    if (label && !valorFinal) {
      Animated.timing(labelAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
  }, [label, labelAnim, valorFinal]);

  React.useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -5, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 5, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [error, shakeAnim]);

  const corBorda = error ? Cores.erro : focado ? Cores.acento : Cores.inputBorda;

  // Modo com label flutuante (interface antiga)
  if (label) {
    const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 6] });
    const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] });

    return (
      <View style={style}>
        <Animated.View style={[estilos.container, { borderColor: corBorda, transform: [{ translateX: shakeAnim }] }]}>
          {iconeEsquerda && (
            <Ionicons name={iconeEsquerda} size={20} color={focado ? Cores.acento : Cores.textoSecundario} style={estilos.iconeEsquerda} />
          )}
          <View style={estilos.inputWrapper}>
            <Animated.Text style={[estilos.labelFlutuante, { top: labelTop, fontSize: labelSize }]}>
              {label}
            </Animated.Text>
            <TextInput
              value={valorFinal}
              onChangeText={aoMudarFinal}
              onFocus={aoFocar}
              onBlur={aoDesfocar}
              placeholder={focado ? placeholder : ''}
              placeholderTextColor={Cores.textoSecundario}
              secureTextEntry={seguroFinal}
              keyboardType={tecladoFinal}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
              editable={editable}
              style={estilos.input}
              accessibilityLabel={label}
            />
          </View>
        </Animated.View>
        {error ? <Text style={estilos.erro}>{error}</Text> : null}
      </View>
    );
  }

  // Modo sem label flutuante (novas telas de auth)
  return (
    <View style={style}>
      <Animated.View style={[estilos.containerSimples, { borderColor: corBorda, transform: [{ translateX: shakeAnim }] }]}>
        {iconeEsquerda && (
          <Ionicons name={iconeEsquerda} size={18} color={focado ? Cores.acento : Cores.textoSecundario} style={estilos.iconeEsquerda} />
        )}
        <TextInput
          value={valorFinal}
          onChangeText={aoMudarFinal}
          onFocus={aoFocar}
          onBlur={aoDesfocar}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry={seguroFinal}
          keyboardType={tecladoFinal}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          autoCorrect={autoCorrect}
          editable={editable}
          style={estilos.inputSimples}
        />
        {iconeDireita && (
          <Pressable onPress={aoClicarIconeDireita} style={estilos.iconeDireita} hitSlop={8}>
            <Ionicons name={iconeDireita} size={18} color={Cores.textoSecundario} />
          </Pressable>
        )}
      </Animated.View>
      {error ? <Text style={estilos.erro}>{error}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  // ── Modo label flutuante ──
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Cores.inputFundo,
    borderWidth: 1,
    borderRadius: RaioBorda.md,
    height: 56,
    paddingHorizontal: 16,
  },
  iconeEsquerda: { marginRight: 12 },
  inputWrapper: { flex: 1, justifyContent: 'center' },
  labelFlutuante: {
    position: 'absolute',
    left: 0,
    color: Cores.textoSecundario,
    fontFamily: Fontes.corpo,
  },
  input: {
    color: Cores.textoClaro,
    fontFamily: Fontes.corpo,
    fontSize: 16,
    paddingTop: 14,
    height: '100%',
  },
  // ── Modo simples (sem label) ──
  containerSimples: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderRadius: RaioBorda.md,
    height: 52,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputSimples: {
    flex: 1,
    color: Cores.textoClaro,
    fontFamily: Fontes.corpo,
    fontSize: 15,
  },
  iconeDireita: { padding: 4 },
  // ── Erro ──
  erro: {
    color: Cores.erro,
    fontFamily: Fontes.corpo,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
