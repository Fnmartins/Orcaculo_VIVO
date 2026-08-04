import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { obterDesejo, atualizarDesejo, deletarDesejo, obterCategoria, Desejo } from '../../data/lei-atracao';

export default function TelaDetalheDesejo() {
  const params = useLocalSearchParams<{ id: string }>();
  const [desejo, setDesejo] = useState<Desejo | null>(null);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      if (params.id) obterDesejo(params.id).then(d => { if (ativo) setDesejo(d); });
      return () => { ativo = false; };
    }, [params.id])
  );

  if (!desejo) {
    return (
      <GradientBackground>
        <SafeAreaView style={estilos.safeArea}>
          <View style={estilos.centro}>
            <Text style={estilos.carregando}>Carregando...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const cat = obterCategoria(desejo.categoria);
  const diasAtivos = Math.max(1, Math.floor((Date.now() - new Date(desejo.criadoEm).getTime()) / (1000 * 60 * 60 * 24)));

  const marcarManifestado = () => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm('Confirmar que este desejo se manifestou?')) return;
      confirmarManifestacao();
      return;
    }
    Alert.alert('Manifestado?', 'Confirmar que este desejo se realizou?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sim, manifestei!', onPress: confirmarManifestacao },
    ]);
  };

  const confirmarManifestacao = async () => {
    Hapticos.impactoPesado();
    await atualizarDesejo(desejo.id, { manifestado: true, manifestadoEm: new Date().toISOString() });
    router.back();
  };

  const deletar = () => {
    const confirmar = async () => {
      Hapticos.impactoMedio();
      await deletarDesejo(desejo.id);
      router.back();
    };
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('Excluir este desejo?')) confirmar();
      return;
    }
    Alert.alert('Excluir?', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: confirmar },
    ]);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea} edges={['top']}>
        <View style={estilos.header}>
          <Pressable onPress={() => { Hapticos.impactoLeve(); router.back(); }} style={estilos.voltar}>
            <Ionicons name="arrow-back" size={24} color={Cores.textoClaro} />
          </Pressable>
          <Pressable onPress={deletar} style={estilos.voltar}>
            <Ionicons name="trash-outline" size={20} color={Cores.textoSecundario} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={estilos.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[cat.cor + '30', cat.cor + '10'] as const}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[estilos.heroCard, { borderColor: cat.cor + '40' }]}
          >
            <View style={[estilos.heroIcone, { backgroundColor: cat.cor + '25' }]}>
              <Ionicons name={cat.icone as any} size={32} color={cat.cor} />
            </View>
            <Text style={[estilos.categoriaLabel, { color: cat.cor }]}>{cat.titulo.toUpperCase()}</Text>
            <Text style={estilos.titulo}>{desejo.titulo}</Text>
            <Text style={estilos.descricao}>{desejo.descricao}</Text>
            {desejo.manifestado && (
              <View style={estilos.manifestadoBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Cores.primaria} />
                <Text style={estilos.manifestadoTexto}>Manifestado ✨</Text>
              </View>
            )}
          </LinearGradient>

          <View style={estilos.stats}>
            <View style={estilos.statCard}>
              <MaterialCommunityIcons name="fire" size={22} color={Cores.acento} />
              <Text style={estilos.statValor}>{desejo.rituaisFeitos}</Text>
              <Text style={estilos.statLabel}>Rituais feitos</Text>
            </View>
            <View style={estilos.statCard}>
              <Ionicons name="calendar-outline" size={22} color={Cores.primaria} />
              <Text style={estilos.statValor}>{diasAtivos}</Text>
              <Text style={estilos.statLabel}>{diasAtivos === 1 ? 'Dia' : 'Dias'} ativo{diasAtivos > 1 ? 's' : ''}</Text>
            </View>
          </View>

          {!desejo.manifestado && (
            <>
              <Pressable
                onPress={() => { Hapticos.impactoMedio(); router.push({ pathname: '/lei-atracao/ritual', params: { id: desejo.id } }); }}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              >
                <LinearGradient
                  colors={[cat.cor, cat.cor + 'CC'] as const}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={estilos.botao}
                >
                  <MaterialCommunityIcons name="meditation" size={20} color={Cores.textoClaro} />
                  <Text style={estilos.botaoTexto}>Fazer Ritual Agora</Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={marcarManifestado}
                style={({ pressed }) => [estilos.botaoSecundario, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={Cores.primaria} />
                <Text style={estilos.botaoSecundarioTexto}>Marcar como Manifestado</Text>
              </Pressable>
            </>
          )}

          <View style={estilos.info}>
            <Ionicons name="information-circle-outline" size={16} color={Cores.textoSecundario} />
            <Text style={estilos.infoTexto}>
              Faça o ritual diariamente para manter sua vibração alinhada.
            </Text>
          </View>

          <View style={{ height: Espacamento.xxl }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Espacamento.lg, paddingTop: Espacamento.sm },
  voltar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: Espacamento.lg, paddingTop: Espacamento.lg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  carregando: { fontFamily: Fontes.corpo, color: Cores.textoSecundario },
  heroCard: { padding: Espacamento.lg, borderRadius: RaioBorda.xl, borderWidth: 1, alignItems: 'center' },
  heroIcone: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  categoriaLabel: { fontFamily: Fontes.corpoNegrito, fontSize: 11, letterSpacing: 1.5, marginTop: Espacamento.sm },
  titulo: { fontFamily: Fontes.titulo, fontSize: 24, fontWeight: '700', color: Cores.textoClaro, textAlign: 'center', marginTop: 6 },
  descricao: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoClaro, textAlign: 'center', marginTop: Espacamento.sm, lineHeight: 21, fontStyle: 'italic' },
  manifestadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(124, 154, 130, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RaioBorda.full, marginTop: Espacamento.md },
  manifestadoTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 12, color: Cores.primaria },
  stats: { flexDirection: 'row', gap: Espacamento.sm, marginTop: Espacamento.md, marginBottom: Espacamento.md },
  statCard: { flex: 1, backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda, borderRadius: RaioBorda.md, padding: Espacamento.md, alignItems: 'center' },
  statValor: { fontFamily: Fontes.titulo, fontSize: 24, fontWeight: '700', color: Cores.textoClaro, marginTop: 4 },
  statLabel: { fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario, marginTop: 2 },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: RaioBorda.full, gap: 8, marginBottom: Espacamento.sm },
  botaoTexto: { fontFamily: Fontes.corpoNegrito, fontSize: 15, color: Cores.textoClaro },
  botaoSecundario: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: RaioBorda.full, gap: 8, backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: 'rgba(124, 154, 130, 0.3)' },
  botaoSecundarioTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.primaria },
  info: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Espacamento.md, paddingHorizontal: Espacamento.sm },
  infoTexto: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario, flex: 1, fontStyle: 'italic' },
});
