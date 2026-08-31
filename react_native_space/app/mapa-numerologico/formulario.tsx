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
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { dataConsultaValida, textoConsultaValido } from '../../utils/validacaoConsulta';

export default function TelaFormularioMapa() {
  const [nome, setNome] = useState('');
  const [nomeAtual, setNomeAtual] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [ano, setAno] = useState('');
  const [erro, setErro] = useState('');

  const validarEProsseguir = () => {
    const nomeTrimmed = nome.trim();
    if (!textoConsultaValido(nomeTrimmed) || nomeTrimmed.split(/\s+/).length < 2) {
      setErro('Digite seu nome completo de nascimento (nome e sobrenome).');
      return;
    }
    const nomeAtualTrimmed = nomeAtual.trim().replace(/\s+/g, ' ');
    if (nomeAtualTrimmed && (!textoConsultaValido(nomeAtualTrimmed) || nomeAtualTrimmed.split(/\s+/).length < 2)) {
      setErro('Digite o nome atual completo ou deixe o campo opcional vazio.');
      return;
    }
    const d = parseInt(dia, 10);
    const m = parseInt(mes, 10);
    const a = parseInt(ano, 10);
    if (!dataConsultaValida(String(d), String(m), String(a))) {
      setErro('Digite uma data de nascimento válida.');
      return;
    }

    setErro('');
    Hapticos.impactoMedio();
    router.push({
      pathname: '/mapa-numerologico/calculando',
      params: {
        nome: nomeTrimmed,
        nomeAtual: nomeAtualTrimmed && nomeAtualTrimmed !== nomeTrimmed ? nomeAtualTrimmed : undefined,
        dia: String(d),
        mes: String(m),
        ano: String(a),
      },
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
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" size={24} color={Cores.textoClaro} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={estilos.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            tabIndex={0}
            accessibilityLabel="Formulário do mapa numerológico"
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
                maxLength={120}
                accessibilityLabel="Nome completo de nascimento"
              />
            </View>

            <View style={estilos.grupo}>
              <Text style={estilos.label}>Nome usado atualmente (opcional)</Text>
              <Text style={estilos.ajudaCampo}>
                Preencha somente se quiser comparar as associações simbólicas. Não sugerimos alteração de nome ou assinatura.
              </Text>
              <TextInput
                style={estilos.input}
                value={nomeAtual}
                onChangeText={setNomeAtual}
                placeholder="Ex: nome após casamento ou nome profissional"
                placeholderTextColor={Cores.textoSecundario}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={120}
                accessibilityLabel="Nome usado atualmente, opcional"
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
                  accessibilityLabel="Dia de nascimento"
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
                  accessibilityLabel="Mês de nascimento"
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
                  accessibilityLabel="Ano de nascimento"
                />
              </View>
            </View>

            {erro ? (
              <View style={estilos.erroBox} accessibilityRole="alert" accessibilityLiveRegion="assertive">
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
              accessibilityRole="button"
              accessibilityLabel="Calcular meu mapa numerológico"
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
  ajudaCampo: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    lineHeight: 16,
    color: Cores.textoSecundario,
    marginTop: -4,
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
