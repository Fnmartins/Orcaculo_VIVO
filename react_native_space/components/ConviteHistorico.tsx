import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mostrarAlerta } from '../utils/alerta';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { Hapticos } from '../utils/haptics';
import { guardarConsultaPendente, type ConsultaPendente } from '../services/consultaPendente';

export function ConviteHistorico({ consulta }: { consulta: ConsultaPendente }) {
  const { logado } = useAuth();
  const [salvando, setSalvando] = useState(false);

  if (logado) return null;

  async function abrirCadastro() {
    if (salvando) return;
    Hapticos.impactoLeve();
    setSalvando(true);
    try {
      await guardarConsultaPendente(consulta);
      router.push('/auth/cadastro');
    } catch {
      mostrarAlerta('Não foi possível guardar', 'Tente novamente para levar esta leitura ao seu histórico.');
      setSalvando(false);
    }
  }

  return (
    <LinearGradient
      colors={['rgba(212,175,55,0.12)', 'rgba(75,0,130,0.16)'] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={estilos.card}
    >
      <View style={estilos.icone}>
        <Ionicons name="bookmark-outline" size={22} color={Cores.acento} />
      </View>

      <View style={estilos.conteudo}>
        <Text style={estilos.sobretitulo}>CONTINUE SUA JORNADA</Text>
        <Text style={estilos.titulo}>Guarde esta leitura</Text>
        <Text style={estilos.descricao}>
          Crie uma conta gratuita para salvar este resultado no seu histórico e acompanhar sua jornada.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Criar conta e salvar esta leitura"
          onPress={abrirCadastro}
          disabled={salvando}
          style={({ pressed }) => [estilos.botao, pressed && estilos.botaoPressionado]}
        >
          <Text style={estilos.botaoTexto}>{salvando ? 'Guardando leitura...' : 'Criar conta e salvar'}</Text>
          <Ionicons name="arrow-forward" size={18} color={Cores.fundoEscuro} />
        </Pressable>

        <Text style={estilos.nota}>Você poderá reencontrar esta leitura no seu histórico.</Text>
      </View>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Espacamento.md,
    padding: Espacamento.md,
    marginBottom: Espacamento.md,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.28)',
  },
  icone: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  conteudo: {
    flex: 1,
    minWidth: 0,
  },
  sobretitulo: {
    marginBottom: Espacamento.xs,
    fontFamily: Fontes.corpoSemibold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: Cores.acento,
  },
  titulo: {
    marginBottom: 6,
    fontFamily: Fontes.titulo,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
    color: Cores.textoClaro,
  },
  descricao: {
    marginBottom: Espacamento.md,
    fontFamily: Fontes.corpo,
    fontSize: 13,
    lineHeight: 19,
    color: Cores.textoSecundario,
  },
  botao: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Espacamento.sm,
    paddingHorizontal: Espacamento.md,
    borderRadius: RaioBorda.lg,
    backgroundColor: Cores.acento,
  },
  botaoPressionado: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  botaoTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    color: Cores.fundoEscuro,
  },
  nota: {
    marginTop: Espacamento.sm,
    fontFamily: Fontes.corpo,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    color: Cores.textoSecundario,
  },
});
