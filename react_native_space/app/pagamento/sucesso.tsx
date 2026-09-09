// app/pagamento/sucesso.tsx
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

export default function PagamentoSucesso() {
  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safe}>
        <View style={estilos.conteudo}>
          <Ionicons name="checkmark-circle" size={72} color={Cores.acento} />
          <Text style={estilos.titulo}>Assinatura confirmada!</Text>
          <Text style={estilos.texto}>
            Seu plano está sendo liberado. Pode levar alguns segundos para aparecer.
          </Text>
          <Button variante="primary" label="Voltar ao início" larguraTotal
            onPress={() => router.replace('/')} />
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
