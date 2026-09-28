import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { voltarOuIr } from '../../utils/navegacao';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { rotuloDaCidade, type Cidade } from '../../data/cidades';
import { buscarCidades } from '../../services/cidades';

export default function TelaMapaAstralForm() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [ano, setAno] = useState('');
  const [hora, setHora] = useState('');
  const [minuto, setMinuto] = useState('');
  const [cidade, setCidade] = useState('');
  const [cidadeEscolhida, setCidadeEscolhida] = useState<Cidade | null>(null);
  const [naoSabeHora, setNaoSabeHora] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  // A busca corre no banco (services/cidades), que cobre Brasil, Estados
  // Unidos, Canadá e Europa. A espera de 250 ms existe para não disparar uma
  // consulta por tecla; se o banco não responder, o serviço cai sozinho na
  // lista local das capitais.
  const [sugestoesCidade, setSugestoesCidade] = useState<Cidade[]>([]);
  useEffect(() => {
    if (cidadeEscolhida) {
      setSugestoesCidade([]);
      return;
    }
    let vivo = true;
    const relogio = setTimeout(() => {
      buscarCidades(cidade).then((achadas) => {
        if (vivo) setSugestoesCidade(achadas);
      });
    }, 250);
    return () => { vivo = false; clearTimeout(relogio); };
  }, [cidade, cidadeEscolhida]);

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
    if (!naoSabeHora) {
      const h = parseInt(hora, 10);
      const min = parseInt(minuto, 10);
      if (!hora || isNaN(h) || h < 0 || h > 23) novosErros.hora = 'Hora inválida';
      if (!minuto || isNaN(min) || min < 0 || min > 59) novosErros.minuto = 'Min inválido';
    }
    // Cidade escolhida na lista, e não digitada: sem coordenada e fuso não
    // existe ascendente, e texto livre não traz nenhum dos dois.
    if (!cidadeEscolhida) novosErros.cidade = 'Escolha a cidade na lista';

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function enviar() {
    Hapticos.impactoLeve();
    if (!validar()) return;
    Hapticos.impactoMedio();

    const params = {
      dia,
      mes,
      ano,
      // Sem hora, o meio-dia é só a conta de reserva; quem diz que a hora não é
      // conhecida é `semHora`. Sem esse aviso explícito, o mapa mostraria o
      // ascendente do meio-dia como se fosse o da pessoa.
      hora: naoSabeHora ? '12' : hora,
      minuto: naoSabeHora ? '0' : minuto,
      semHora: naoSabeHora ? '1' : '',
      cidade: cidade.trim(),
      cidadeId: cidadeEscolhida?.id ?? '',
    };
    router.push({ pathname: '/mapa-astral/gerando', params });
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
              <Pressable onPress={() => voltarOuIr()} style={estilos.voltarBotao}>
                <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
              </Pressable>
              <View style={estilos.headerCenter}>
                <Text style={estilos.headerTitulo}>Mapa Astral</Text>
                <Text style={estilos.headerSubtitulo}>Descubra seu céu de nascimento</Text>
              </View>
              <View style={{ width: 40 }} />
            </Animated.View>

            {/* Ícone central */}
            <Animated.View style={[estilos.iconeCentral, { opacity: fadeAnim }]}>
              <View style={estilos.iconeCirculo}>
                <MaterialCommunityIcons name="zodiac-aquarius" size={40} color={Cores.acento} />
              </View>
              <Text style={estilos.iconeTexto}>
                Informe seus dados de nascimento para revelar as energias celestes
              </Text>
            </Animated.View>

            {/* Formulário */}
            <Animated.View style={[estilos.formContainer, { opacity: fadeAnim }]}>
              {/* Data de Nascimento */}
              <Text style={estilos.secaoLabel}>📅 Data de Nascimento</Text>
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
                    returnKeyType="next"
                  />
                  {erros.ano ? <Text style={estilos.erroTexto}>{erros.ano}</Text> : null}
                </View>
              </View>

              {/* Hora de Nascimento */}
              <View style={estilos.horaSecao}>
                <Text style={estilos.secaoLabel}>🕐 Hora de Nascimento</Text>
                <Pressable
                  onPress={() => { Hapticos.selecao(); setNaoSabeHora(!naoSabeHora); }}
                  style={estilos.checkboxRow}
                >
                  <View style={[estilos.checkbox, naoSabeHora && estilos.checkboxAtivo]}>
                    {naoSabeHora && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={estilos.checkboxTexto}>Não sei minha hora de nascimento</Text>
                </Pressable>
              </View>
              
              {!naoSabeHora && (
                <View style={estilos.linhaHora}>
                  <View style={[estilos.inputWrapper, { flex: 1 }]}> 
                    <Text style={estilos.inputLabel}>Hora</Text>
                    <TextInput
                      style={[estilos.input, erros.hora ? estilos.inputErro : null]}
                      value={hora}
                      onChangeText={(t) => { setHora(t.replace(/\D/g, '').slice(0, 2)); setErros(e => ({...e, hora: ''})); }}
                      keyboardType="number-pad"
                      placeholder="HH"
                      placeholderTextColor={Cores.textoSecundario}
                      maxLength={2}
                      returnKeyType="next"
                    />
                    {erros.hora ? <Text style={estilos.erroTexto}>{erros.hora}</Text> : null}
                  </View>
                  <Text style={estilos.horaSeparador}>:</Text>
                  <View style={[estilos.inputWrapper, { flex: 1 }]}> 
                    <Text style={estilos.inputLabel}>Minuto</Text>
                    <TextInput
                      style={[estilos.input, erros.minuto ? estilos.inputErro : null]}
                      value={minuto}
                      onChangeText={(t) => { setMinuto(t.replace(/\D/g, '').slice(0, 2)); setErros(e => ({...e, minuto: ''})); }}
                      keyboardType="number-pad"
                      placeholder="MM"
                      placeholderTextColor={Cores.textoSecundario}
                      maxLength={2}
                      returnKeyType="next"
                    />
                    {erros.minuto ? <Text style={estilos.erroTexto}>{erros.minuto}</Text> : null}
                  </View>
                </View>
              )}

              {/* Cidade — escolhida da lista, não digitada: o ascendente precisa de
                  latitude, longitude e do fuso com a história do horário de verão. */}
              <Text style={[estilos.secaoLabel, { marginTop: Espacamento.lg }]}>📍 Local de Nascimento</Text>
              <View style={estilos.inputWrapper}>
                <TextInput
                  style={[estilos.input, estilos.inputLargo, erros.cidade ? estilos.inputErro : null]}
                  value={cidade}
                  onChangeText={(t) => {
                    setCidade(t);
                    setCidadeEscolhida(null);
                    setErros((e) => ({ ...e, cidade: '' }));
                  }}
                  placeholder="Comece a escrever: São Paulo"
                  placeholderTextColor={Cores.textoSecundario}
                  returnKeyType="done"
                  accessibilityLabel="Cidade de nascimento"
                />
                {!cidadeEscolhida && sugestoesCidade.length > 0 && (
                  <View style={estilos.sugestoesCidade}>
                    {sugestoesCidade.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          setCidadeEscolhida(c);
                          setCidade(rotuloDaCidade(c));
                          setErros((e) => ({ ...e, cidade: '' }));
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Escolher ${rotuloDaCidade(c)}`}
                        style={estilos.sugestaoCidade}
                      >
                        <Text style={estilos.sugestaoCidadeTexto}>{rotuloDaCidade(c)}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {cidadeEscolhida && (
                  <Text style={estilos.cidadeConfirmada}>
                    {`Fuso ${cidadeEscolhida.fuso}. Nasceu numa cidade vizinha? Escolher a mais perto muda o ascendente em cerca de um grau.`}
                  </Text>
                )}
                {erros.cidade ? <Text style={estilos.erroTexto}>{erros.cidade}</Text> : null}
              </View>

              {/* Info */}
              <View style={estilos.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color={Cores.acento} />
                <Text style={estilos.infoTexto}>
                  A hora e local de nascimento são essenciais para calcular o Ascendente e as Casas.
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
                  <MaterialCommunityIcons name="creation" size={20} color="#fff" />
                  <Text style={estilos.botaoGerarTexto}>Gerar Meu Mapa Astral</Text>
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
  linhaHora: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: 200,
  },
  horaSeparador: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 24,
    color: Cores.textoClaro,
    marginHorizontal: Espacamento.xs,
    paddingTop: 28,
  },
  inputWrapper: {},
  sugestoesCidade: {
    marginTop: 6, borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)',
    borderRadius: RaioBorda.md, overflow: 'hidden',
  },
  sugestaoCidade: {
    paddingVertical: 10, paddingHorizontal: Espacamento.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(212,175,55,0.15)',
  },
  sugestaoCidadeTexto: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoClaro },
  cidadeConfirmada: {
    fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario,
    marginTop: 6, lineHeight: 16,
  },
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
  horaSecao: {
    marginTop: Espacamento.lg,
    marginBottom: Espacamento.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Espacamento.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Cores.inputBorda,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  checkboxAtivo: {
    backgroundColor: Cores.acento,
    borderColor: Cores.acento,
  },
  checkboxTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
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
