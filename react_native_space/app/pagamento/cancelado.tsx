// app/pagamento/cancelado.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { Button } from '../../components/Button';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';

export default function PagamentoCancelado() {
  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safe}>
        <View style={estilos.conteudo}>
          <Ionicons name="close-circle" size={72} color={Cores.textoSecundario} />
          <Text style={estilos.titulo}>Pagamento não concluído</Text>
          <Text style={estilos.texto}>
            Nenhuma cobrança foi feita. Você pode tentar de novo quando quiser.
          </Text>
          <Button variante="primary" label="Ver planos" larguraTotal
            onPress={() => router.replace('/planos')} />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1 },
  conteudo: { flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Espacamento.lg, gap: Espacamento.md },
  titulo: { fontFamily: Fontes.titulo, fontSize: 24, fontWeight: '700',
    color: Cores.textoClaro, textAlign: 'center' },
  texto: { fontFamily: Fontes.corpo, fontSize: 15, color: Cores.textoSecundario,
    textAlign: 'center', marginBottom: Espacamento.md },
});
