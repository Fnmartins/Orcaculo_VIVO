import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';

export default function TelaMatrizForm() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [nome, setNome] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [ano, setAno] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  function validar(): boolean {
    const novosErros: Record<string, string> = {};
    const d = parseInt(dia, 10);
    const m = parseInt(mes, 10);
    const a = parseInt(ano, 10);

    if (!dia || isNaN(d) || d < 1 || d > 31) novosErros.dia = 'Dia inválido';
    if (!mes || isNaN(m) || m < 1 || m > 12) novosErros.mes = 'Mês inválido';
    if (!ano || isNaN(a) || a < 1900 || a > 2026) novosErros.ano = 'Ano inválido';

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function enviar() {
    Hapticos.impactoLeve();
    if (!validar()) return;
    Hapticos.impactoMedio();
    router.push({
      pathname: '/matriz-destino/calculando',
      params: { nome: nome.trim(), dia, mes, ano },
    });
  }

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={estilos.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Pressable onPress={() => router.back()} style={estilos.voltarBotao}>
                <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
              </Pressable>
              <View style={estilos.headerCenter}>
                <Text style={estilos.headerTitulo}>Matriz do Destino</Text>
                <Text style={estilos.headerSubtitulo}>Seu mapa energético pessoal</Text>
              </View>
              <View style={{ width: 40 }} />
            </Animated.View>

            {/* Ícone central */}
            <Animated.View style={[estilos.iconeCentral, { opacity: fadeAnim }]}>
              <View style={estilos.iconeCirculo}>
                <MaterialCommunityIcons name="star-four-points-outline" size={42} color={Cores.acento} />
              </View>
              <Text style={estilos.iconeTexto}>
                Com apenas sua data de nascimento, revelamos seu octograma dos 22 Arcanos — talentos, karma, propósito e chakras.
              </Text>
            </Animated.View>

            {/* Formulário */}
            <Animated.View style={[estilos.formContainer, { opacity: fadeAnim }]}>
              {/* Nome (opcional) */}
              <Text style={estilos.secaoLabel}>✨ Seu Nome (opcional)</Text>
              <View style={estilos.inputWrapper}>
                <TextInput
                  style={[estilos.input, estilos.inputLargo]}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Como você se chama?"
                  placeholderTextColor={Cores.textoSecundario}
                  returnKeyType="next"
                />
              </View>

              {/* Data de Nascimento */}
              <Text style={[estilos.secaoLabel, { marginTop: Espacamento.lg }]}>📅 Data de Nascimento</Text>
              <View style={estilos.linhaData}>
                <View style={[estilos.inputWrapper, { flex: 1 }]}>
                  <Text style={estilos.inputLabel}>Dia</Text>
                  <TextInput
                    style={[estilos.input, erros.dia ? estilos.inputErro : null]}
                    value={dia}
                    onChangeText={(t) => { setDia(t.replace(/\D/g, '').slice(0, 2)); setErros(e => ({...e, dia: ''})); }}
                    keyboardType="number-pad"
                    placeholder="DD"
                    placeholderTextColor={Cores.textoSecundario}
                    maxLength={2}
                    returnKeyType="next"
                  />
                  {erros.dia ? <Text style={estilos.erroTexto}>{erros.dia}</Text> : null}
                </View>
                <View style={[estilos.inputWrapper, { flex: 1, marginHorizontal: Espacamento.sm }]}>
                  <Text style={estilos.inputLabel}>Mês</Text>
                  <TextInput
                    style={[estilos.input, erros.mes ? estilos.inputErro : null]}
                    value={mes}
                    onChangeText={(t) => { setMes(t.replace(/\D/g, '').slice(0, 2)); setErros(e => ({...e, mes: ''})); }}
                    keyboardType="number-pad"
                    placeholder="MM"
                    placeholderTextColor={Cores.textoSecundario}
                    maxLength={2}
                    returnKeyType="next"
                  />
                  {erros.mes ? <Text style={estilos.erroTexto}>{erros.mes}</Text> : null}
                </View>
                <View style={[estilos.inputWrapper, { flex: 1.5 }]}>
                  <Text style={estilos.inputLabel}>Ano</Text>
                  <TextInput
                    style={[estilos.input, erros.ano ? estilos.inputErro : null]}
                    value={ano}
                    onChangeText={(t) => { setAno(t.replace(/\D/g, '').slice(0, 4)); setErros(e => ({...e, ano: ''})); }}
                    keyboardType="number-pad"
                    placeholder="AAAA"
                    placeholderTextColor={Cores.textoSecundario}
                    maxLength={4}
                    returnKeyType="done"
                  />
                  {erros.ano ? <Text style={estilos.erroTexto}>{erros.ano}</Text> : null}
                </View>
              </View>

              {/* Info */}
              <View style={estilos.infoBox}>
                <Ionicons name="sparkles-outline" size={16} color={Cores.acento} />
                <Text style={estilos.infoTexto}>
                  A Matriz do Destino combina numerologia, os 22 Arcanos do Tarô e os 7 chakras. Diferente do Mapa Astral, precisa apenas da sua data de nascimento.
                </Text>
              </View>
            </Animated.View>

            {/* Botão */}
            <Animated.View style={[estilos.botaoContainer, { opacity: fadeAnim }]}>
              <Pressable
                onPress={enviar}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              >
                <LinearGradient
                  colors={Cores.gradienteAcento}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={estilos.botaoGerar}
                >
                  <MaterialCommunityIcons name="star-four-points" size={20} color="#fff" />
                  <Text style={estilos.botaoGerarTexto}>Revelar Minha Matriz</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Espacamento.md,
    paddingTop: Espacamento.md,
    paddingBottom: Espacamento.sm,
  },
  voltarBotao: {
    width: 40,
    height: 40,
    borderRadius: RaioBorda.full,
    backgroundColor: Cores.cardFundo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    color: Cores.textoClaro,
  },
  headerSubtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  iconeCentral: {
    alignItems: 'center',
    marginTop: Espacamento.lg,
    marginBottom: Espacamento.md,
  },
  iconeCirculo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Espacamento.sm,
  },
  iconeTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    paddingHorizontal: Espacamento.xl,
    lineHeight: 20,
  },
  formContainer: {
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.sm,
  },
  secaoLabel: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 15,
    color: Cores.textoClaro,
    marginBottom: Espacamento.sm,
    marginTop: Espacamento.sm,
  },
  linhaData: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputWrapper: {},
  inputLabel: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Cores.inputFundo,
    borderWidth: 1,
    borderColor: Cores.inputBorda,
    borderRadius: RaioBorda.md,
    paddingHorizontal: Espacamento.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontFamily: Fontes.corpo,
    fontSize: 16,
    color: Cores.textoClaro,
    textAlign: 'center',
  },
  inputLargo: {
    textAlign: 'left',
  },
  inputErro: {
    borderColor: Cores.erro,
  },
  erroTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.erro,
    marginTop: 3,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: RaioBorda.md,
    padding: Espacamento.md,
    marginTop: Espacamento.lg,
    gap: Espacamento.sm,
  },
  infoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    flex: 1,
    lineHeight: 18,
  },
  botaoContainer: {
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.xl,
  },
  botaoGerar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RaioBorda.lg,
    gap: Espacamento.sm,
  },
  botaoGerarTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 17,
    color: '#fff',
  },
});
