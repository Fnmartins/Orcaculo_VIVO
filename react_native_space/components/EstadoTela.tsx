import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { Loading } from './Loading';

type Props = {
  tipo: 'carregando' | 'erro' | 'vazio';
  titulo?: string;
  descricao?: string;
  acaoLabel?: string;
  onAcao?: () => void;
};

export function EstadoTela({ tipo, titulo, descricao, acaoLabel, onAcao }: Props) {
  if (tipo === 'carregando') {
    return <Loading mensagem={titulo ?? 'Carregando'} />;
  }

  const erro = tipo === 'erro';
  const icone = erro ? 'cloud-offline-outline' : 'sparkles-outline';

  return (
    <View
      style={estilos.container}
      accessibilityRole={erro ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <View style={[estilos.icone, erro && estilos.iconeErro]}>
        <Ionicons name={icone} size={34} color={erro ? Cores.erro : Cores.acento} />
      </View>
      <Text style={estilos.titulo}>{titulo ?? (erro ? 'Não foi possível carregar' : 'Nada por aqui ainda')}</Text>
      {!!descricao && <Text style={estilos.descricao}>{descricao}</Text>}
      {!!onAcao && !!acaoLabel && (
        <Pressable
          onPress={onAcao}
          style={({ pressed }) => [estilos.botao, pressed && estilos.botaoPressionado]}
          accessibilityRole="button"
          accessibilityLabel={acaoLabel}
        >
          <Ionicons name={erro ? 'refresh-outline' : 'arrow-forward-outline'} size={18} color={Cores.fundoEscuro} />
          <Text style={estilos.botaoTexto}>{acaoLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Espacamento.xl,
  },
  icone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.md,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  iconeErro: {
    backgroundColor: 'rgba(220, 80, 80, 0.10)',
    borderColor: 'rgba(220, 80, 80, 0.22)',
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    color: Cores.textoClaro,
    textAlign: 'center',
  },
  descricao: {
    maxWidth: 320,
    marginTop: Espacamento.sm,
    fontFamily: Fontes.corpo,
    fontSize: 14,
    lineHeight: 21,
    color: Cores.textoSecundario,
    textAlign: 'center',
  },
  botao: {
    minHeight: 48,
    marginTop: Espacamento.lg,
    paddingHorizontal: Espacamento.lg,
    borderRadius: RaioBorda.md,
    backgroundColor: Cores.acento,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Espacamento.sm,
  },
  botaoPressionado: { opacity: 0.82 },
  botaoTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.fundoEscuro,
  },
});
