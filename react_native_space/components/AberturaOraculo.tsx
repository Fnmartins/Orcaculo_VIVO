import { ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from './GradientBackground';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';

/**
 * "Reduzir movimento" do sistema. Com ele ligado, a abertura aparece parada:
 * animação de entrada é enfeite, e quem pediu menos movimento não deve pagar
 * por ele (conselho de 21/09, item B6).
 */
export function useReduzirMovimento(): boolean {
  const [reduzir, setReduzir] = useState(false);

  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((valor) => { if (vivo) setReduzir(Boolean(valor)); })
      .catch(() => {});
    const inscricao = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (valor) =>
      setReduzir(Boolean(valor)));
    return () => {
      vivo = false;
      inscricao?.remove?.();
    };
  }, []);

  return reduzir;
}

/**
 * Abertura de um oráculo: o objeto da própria prática no centro, uma frase curta
 * e a ação que começa a leitura. Sem barra de progresso e sem espera obrigatória —
 * quem consulta decide a hora (conselho de 21/09, itens B5 e I1 a I3).
 */
export function AberturaOraculo({
  titulo,
  frase,
  acaoLabel,
  aoAvancar,
  children,
  desabilitado = false,
}: {
  titulo: string;
  frase: string;
  acaoLabel: string;
  aoAvancar: () => void;
  children: ReactNode;
  desabilitado?: boolean;
}) {
  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          <Text style={estilos.titulo}>{titulo}</Text>

          <View style={estilos.palco}>{children}</View>

          <Text style={estilos.frase}>{frase}</Text>

          <Pressable
            onPress={aoAvancar}
            disabled={desabilitado}
            style={[estilos.botao, desabilitado && estilos.botaoDesabilitado]}
            accessibilityRole="button"
            accessibilityLabel={acaoLabel}
          >
            <Text style={estilos.botaoTexto}>{acaoLabel}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Espacamento.xl,
    gap: Espacamento.lg,
  },
  titulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Cores.acento,
  },
  palco: { alignItems: 'center', justifyContent: 'center' },
  frase: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
    lineHeight: 30,
    maxWidth: 420,
  },
  botao: {
    backgroundColor: Cores.acento,
    borderRadius: RaioBorda.full,
    paddingVertical: 12,
    paddingHorizontal: Espacamento.xl,
    minWidth: 200,
    alignItems: 'center',
  },
  botaoDesabilitado: { opacity: 0.5 },
  botaoTexto: { fontFamily: Fontes.corpoNegrito, fontSize: 16, color: '#fff' },
});
