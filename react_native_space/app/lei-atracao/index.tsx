import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { listarDesejos, obterCategoria, Desejo } from '../../data/lei-atracao';

export default function TelaLeiAtracao() {
  const [desejos, setDesejos] = useState<Desejo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      listarDesejos().then(d => {
        if (ativo) { setDesejos(d); setCarregando(false); }
      });
      return () => { ativo = false; };
    }, [])
  );

  const ativos = desejos.filter(d => !d.manifestado);
  const manifestados = desejos.filter(d => d.manifestado);
  const totalRituais = desejos.reduce((s, d) => s + d.rituaisFeitos, 0);

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea} edges={['top']}>
        <View style={estilos.header}>
          <Pressable onPress={() => { Hapticos.impactoLeve(); router.back(); }} style={estilos.voltar}>
            <Ionicons name="arrow-back" size={24} color={Cores.textoClaro} />
          </Pressable>
          <Text style={estilos.headerTitulo}>Lei da Atração</Text>
          <View style={estilos.voltar} />
        </View>

        <ScrollView contentContainerStyle={estilos.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['rgba(212, 175, 55, 0.2)', 'rgba(233, 30, 144, 0.15)'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={estilos.hero}
          >
            <MaterialCommunityIcons name="star-four-points" size={40} color={Cores.acento} />
            <Text style={estilos.heroTitulo}>Cofre da Manifestação</Text>
            <Text style={estilos.heroSubtitulo}>
              Materialize seus desejos através da vibração, intenção e ritual diário.
            </Text>
          </LinearGradient>

          <View style={estilos.stats}>
            <View style={estilos.statCard}>
              <Text style={estilos.statValor}>{ativos.length}</Text>
              <Text style={estilos.statLabel}>Ativos</Text>
            </View>
            <View style={estilos.statCard}>
              <Text style={[estilos.statValor, { color: Cores.primaria }]}>{manifestados.length}</Text>
              <Text style={estilos.statLabel}>Manifestados</Text>
            </View>
            <View style={estilos.statCard}>
              <Text style={[estilos.statValor, { color: '#E91E90' }]}>{totalRituais}</Text>
              <Text style={estilos.statLabel}>Rituais</Text>
            </View>
          </View>

          <Pressable
            onPress={() => { Hapticos.impactoMedio(); router.push('/lei-atracao/novo'); }}
            style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          >
            <LinearGradient
              colors={Cores.gradienteAcento}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={estilos.botaoNovo}
            >
              <Ionicons name="add-circle-outline" size={22} color={Cores.fundoEscuro} />
              <Text style={estilos.botaoNovoTexto}>Novo Desejo</Text>
            </LinearGradient>
          </Pressable>

          {ativos.length > 0 && (
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo}>Manifestando agora</Text>
              {ativos.map(d => <CardDesejo key={d.id} desejo={d} />)}
            </View>
          )}

          {manifestados.length > 0 && (
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo}>✨ Já manifestados</Text>
              {manifestados.map(d => <CardDesejo key={d.id} desejo={d} />)}
            </View>
          )}

          {!carregando && desejos.length === 0 && (
            <View style={estilos.vazio}>
              <MaterialCommunityIcons name="treasure-chest" size={80} color={Cores.textoSecundario} />
              <Text style={estilos.vazioTitulo}>Seu cofre está vazio</Text>
              <Text style={estilos.vazioTexto}>
                Adicione seu primeiro desejo e comece sua jornada de manifestação.
              </Text>
            </View>
          )}

          <View style={{ height: Espacamento.xxl }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function CardDesejo({ desejo }: { desejo: Desejo }) {
  const cat = obterCategoria(desejo.categoria);
  return (
    <Pressable
      onPress={() => { Hapticos.impactoLeve(); router.push({ pathname: '/lei-atracao/detalhe', params: { id: desejo.id } }); }}
      style={({ pressed }) => [estilos.desejoCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <View style={[estilos.desejoIcone, { backgroundColor: cat.cor + '20' }]}>
        <Ionicons name={cat.icone as any} size={22} color={cat.cor} />
      </View>
      <View style={estilos.desejoInfo}>
        <Text style={estilos.desejoTitulo} numberOfLines={1}>{desejo.titulo}</Text>
        <Text style={estilos.desejoDesc} numberOfLines={2}>{desejo.descricao}</Text>
        <View style={estilos.desejoBadges}>
          <View style={[estilos.miniBadge, { backgroundColor: cat.cor + '20' }]}>
            <Text style={[estilos.miniBadgeTexto, { color: cat.cor }]}>{cat.titulo}</Text>
          </View>
          {desejo.rituaisFeitos > 0 && (
            <View style={estilos.miniBadge}>
              <Ionicons name="flame" size={11} color={Cores.acento} />
              <Text style={estilos.miniBadgeTexto}>{desejo.rituaisFeitos}</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Cores.textoSecundario} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Espacamento.lg, paddingTop: Espacamento.sm },
  voltar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda, alignItems: 'center', justifyContent: 'center' },
  headerTitulo: { fontFamily: Fontes.titulo, fontSize: 16, fontWeight: '700', color: Cores.textoClaro },
  scrollContent: { paddingHorizontal: Espacamento.lg, paddingTop: Espacamento.lg },
  hero: { alignItems: 'center', padding: Espacamento.xl, borderRadius: RaioBorda.xl, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.25)', marginBottom: Espacamento.md },
  heroTitulo: { fontFamily: Fontes.titulo, fontSize: 22, fontWeight: '700', color: Cores.textoClaro, marginTop: Espacamento.sm },
  heroSubtitulo: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  stats: { flexDirection: 'row', gap: Espacamento.sm, marginBottom: Espacamento.md },
  statCard: { flex: 1, backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda, borderRadius: RaioBorda.md, padding: Espacamento.sm, alignItems: 'center' },
  statValor: { fontFamily: Fontes.titulo, fontSize: 24, fontWeight: '700', color: Cores.acento },
  statLabel: { fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario, marginTop: 2 },
  botaoNovo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: RaioBorda.full, paddingVertical: 14, gap: 8, marginBottom: Espacamento.lg },
  botaoNovoTexto: { fontFamily: Fontes.corpoNegrito, fontSize: 15, color: Cores.fundoEscuro },
  secao: { marginBottom: Espacamento.lg },
  secaoTitulo: { fontFamily: Fontes.titulo, fontSize: 18, fontWeight: '700', color: Cores.textoClaro, marginBottom: Espacamento.sm },
  desejoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda, borderRadius: RaioBorda.lg, padding: Espacamento.md, marginBottom: Espacamento.sm, gap: Espacamento.sm },
  desejoIcone: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  desejoInfo: { flex: 1 },
  desejoTitulo: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.textoClaro },
  desejoDesc: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario, marginTop: 2, lineHeight: 17 },
  desejoBadges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  miniBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(212, 175, 55, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RaioBorda.full },
  miniBadgeTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 10, color: Cores.acento },
  vazio: { alignItems: 'center', paddingVertical: Espacamento.xxl },
  vazioTitulo: { fontFamily: Fontes.titulo, fontSize: 18, fontWeight: '700', color: Cores.textoClaro, marginTop: Espacamento.md },
  vazioTexto: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario, textAlign: 'center', marginTop: 6, paddingHorizontal: Espacamento.xl, lineHeight: 19 },
});
