import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Espacamento } from '../../constants/spacing';
import { estilosPainel } from './estilos';

/** Enquanto carrega: spinner. Se falhou: a mensagem e um botão para tentar de novo. */
export function EstadoCarregamento({
  erro,
  aoTentarDeNovo,
}: {
  erro: string | null;
  aoTentarDeNovo: () => void;
}) {
  if (!erro) return <ActivityIndicator style={estilos.espaco} color={Cores.acento} />;
  return (
    <View style={[estilos.espaco, estilos.erro]}>
      <Text style={estilosPainel.erro}>{erro}</Text>
      <Pressable onPress={aoTentarDeNovo} style={estilosPainel.botao} accessibilityRole="button">
        <Text style={estilosPainel.botaoTexto}>Tentar de novo</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  espaco: { marginTop: 48 },
  erro: { paddingHorizontal: Espacamento.lg, gap: Espacamento.md, alignItems: 'center' },
});
