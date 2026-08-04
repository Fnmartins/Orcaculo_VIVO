import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';

export default function TelaFormularioMapa() {
  const [nome, setNome] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [ano, setAno] = useState('');
  const [erro, setErro] = useState('');

  const validarEProsseguir = () => {
    const nomeTrimmed = nome.trim();
    const nomeParts = nomeTrimmed.split(/\s+/);

    if (nomeParts.length < 2 || nomeTrimmed.length < 5) {
      setErro('Digite seu nome completo de nascimento (nome e sobrenome).');
      return;
    }
    const d = parseInt(dia, 10);
    const m = parseInt(mes, 10);
    const a = parseInt(ano, 10);
    if (isNaN(d) || d < 1 || d > 31) { setErro('Dia inválido (1-31).'); return; }
    if (isNaN(m) || m < 1 || m > 12) { setErro('Mês inválido (1-12).'); return; }
    if (isNaN(a) || a < 1900 || a > new Date().getFullYear()) { setErro('Ano inválido.'); return; }

    setErro('');
    Hapticos.impactoMedio();
    router.push({
      pathname: '/mapa-numerologico/calculando',
      params: { nome: nomeTrimmed, dia: String(d), mes: String(m), ano: String(a) },
    });
  };

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={estilos.header}>
            <Pressable
              onPress={() => { Hapticos.impactoLeve(); router.back(); }}
              style={estilos.voltar}
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" size={24} color={Cores.textoClaro} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={estilos.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={estilos.titulo}>Seus dados de nascimento</Text>
            <Text style={estilos.subtitulo}>
              Use seu nome completo de <Text style={estilos.destaque}>nascimento</Text> (como consta na certidão) para cálculo preciso.
            </Text>

            <View style={estilos.grupo}>
              <Text style={estilos.label}>Nome completo de nascimento</Text>
              <TextInput
                style={estilos.input}
                value={nome}
                onChangeText={setNome}
                placeholder="Ex: Maria da Silva Santos"
                placeholderTextColor={Cores.textoSecundario}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={estilos.grupo}>
              <Text style={estilos.label}>Data de nascimento</Text>
              <View style={estilos.linhaData}>
                <TextInput
                  style={[estilos.input, estilos.inputData]}
                  value={dia}
                  onChangeText={t => setDia(t.replace(/\D/g, '').slice(0, 2))}
                  placeholder="DD"
                  placeholderTextColor={Cores.textoSecundario}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={estilos.separador}>/</Text>
                <TextInput
                  style={[estilos.input, estilos.inputData]}
                  value={mes}
                  onChangeText={t => setMes(t.replace(/\D/g, '').slice(0, 2))}
                  placeholder="MM"
                  placeholderTextColor={Cores.textoSecundario}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={estilos.separador}>/</Text>
                <TextInput
                  style={[estilos.input, estilos.inputAno]}
                  value={ano}
                  onChangeText={t => setAno(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="AAAA"
                  placeholderTextColor={Cores.textoSecundario}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>

            {erro ? (
              <View style={estilos.erroBox}>
                <Ionicons name="alert-circle" size={16} color="#E74C3C" />
                <Text style={estilos.erroTexto}>{erro}</Text>
              </View>
            ) : null}

            <View style={estilos.aviso}>
              <Ionicons name="lock-closed-outline" size={14} color={Cores.textoSecundario} />
              <Text style={estilos.avisoTexto}>
                Seus dados não são compartilhados. Uso exclusivo para cálculo.
              </Text>
            </View>
          </ScrollView>

          <View style={estilos.footer}>
            <Pressable
              onPress={validarEProsseguir}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <LinearGradient
                colors={Cores.gradienteAcento}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={estilos.botao}
              >
                <Text style={estilos.botaoTexto}>Calcular Meu Mapa</Text>
                <Ionicons name="sparkles" size={18} color={Cores.fundoEscuro} />
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Espacamento.lg, paddingTop: Espacamento.sm },
  voltar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1, borderColor: Cores.cardBorda,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Espacamento.lg,
    paddingTop: Espacamento.lg,
    paddingBottom: Espacamento.xl,
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 26,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginBottom: Espacamento.sm,
  },
  subtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    lineHeight: 21,
    marginBottom: Espacamento.xl,
  },
  destaque: {
    color: Cores.acento,
    fontFamily: Fontes.corpoSemibold,
  },
  grupo: { marginBottom: Espacamento.lg },
  label: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.textoClaro,
    marginBottom: Espacamento.sm,
  },
  input: {
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.md,
    paddingHorizontal: Espacamento.md,
    paddingVertical: 14,
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  linhaData: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputData: {
    flex: 1,
    textAlign: 'center',
  },
  inputAno: {
    flex: 1.8,
    textAlign: 'center',
  },
  separador: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 20,
    color: Cores.textoSecundario,
  },
  erroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
    borderRadius: RaioBorda.md,
    padding: Espacamento.sm,
    marginBottom: Espacamento.md,
  },
  erroTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: '#E74C3C',
    flex: 1,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Espacamento.md,
  },
  avisoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    flex: 1,
  },
  footer: {
    paddingHorizontal: Espacamento.lg,
    paddingBottom: Espacamento.md,
    paddingTop: Espacamento.sm,
  },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RaioBorda.full,
    paddingVertical: Espacamento.md,
    gap: 8,
  },
  botaoTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 16,
    color: Cores.fundoEscuro,
  },
});
