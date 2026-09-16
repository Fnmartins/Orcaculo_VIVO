import { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientBackground } from '../components/GradientBackground';
import { AbaPlanos } from '../components/manager/AbaPlanos';
import { AbaRoadmap } from '../components/manager/AbaRoadmap';
import { AbaAcessos } from '../components/manager/AbaAcessos';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { useIsSuperAdmin } from '../hooks/useAdmin';
import { useAuth } from '../contexts/AuthContext';
import { ABAS_MANAGER, ROTULO_ABA, resolverAba } from '../utils/abasManager';
import { mostrarAlerta } from '../utils/alerta';

export default function Manager() {
  const isSuper = useIsSuperAdmin();
  const { recarregarPerfil } = useAuth();
  const { aba: abaParam } = useLocalSearchParams<{ aba?: string | string[] }>();
  const aba = resolverAba(abaParam);

  // Aberto direto pela URL (sem histórico), router.back() é no-op: cai no perfil.
  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/perfil'));

  const aoPerderAcesso = useCallback(() => {
    mostrarAlerta('Acesso removido', 'Seu acesso de admin foi removido.');
    recarregarPerfil().finally(() => router.replace('/perfil'));
  }, [recarregarPerfil]);

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safe}>
        <View style={estilos.header}>
          <Pressable onPress={voltar} style={estilos.voltar} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
          </Pressable>
          <Text style={estilos.titulo}>Painel</Text>
        </View>

        {!isSuper ? (
          <Text style={estilos.restrito}>Acesso restrito.</Text>
        ) : (
          <>
            <View style={estilos.abas} accessibilityRole="tablist">
              {ABAS_MANAGER.map((a) => {
                const ativa = a === aba;
                return (
                  <Pressable
                    key={a}
                    accessibilityRole="tab"
                    accessibilityLabel={ROTULO_ABA[a]}
                    accessibilityState={{ selected: ativa }}
                    onPress={() => router.setParams({ aba: a })}
                    style={[estilos.aba, ativa && estilos.abaAtiva]}
                  >
                    <Text style={[estilos.abaTexto, ativa && estilos.abaTextoAtivo]}>{ROTULO_ABA[a]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={estilos.conteudo}>
              {aba === 'planos' && <AbaPlanos aoPerderAcesso={aoPerderAcesso} />}
              {aba === 'roadmap' && <AbaRoadmap aoPerderAcesso={aoPerderAcesso} />}
              {aba === 'acessos' && <AbaAcessos aoPerderAcesso={aoPerderAcesso} />}
            </View>
          </>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Espacamento.lg,
    paddingTop: Espacamento.sm,
    paddingBottom: Espacamento.md,
    gap: Espacamento.md,
  },
  voltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontFamily: Fontes.titulo, fontSize: 22, fontWeight: '700', color: Cores.textoClaro },
  restrito: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    paddingHorizontal: Espacamento.lg,
    marginTop: 48,
    textAlign: 'center',
  },
  abas: {
    flexDirection: 'row',
    marginHorizontal: Espacamento.lg,
    marginBottom: Espacamento.md,
    padding: Espacamento.xs,
    gap: Espacamento.xs,
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.full,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  aba: { flex: 1, paddingVertical: Espacamento.sm, borderRadius: RaioBorda.full, alignItems: 'center' },
  abaAtiva: { backgroundColor: Cores.acento },
  abaTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.textoSecundario },
  abaTextoAtivo: { color: '#fff' },
  conteudo: { flex: 1 },
});
