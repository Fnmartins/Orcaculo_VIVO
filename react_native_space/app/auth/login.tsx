import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, KeyboardAvoidingView,
  Platform, Pressable, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { AuthServico } from '../../services/auth';
import { mostrarAlerta } from '../../utils/alerta';

export default function TelaLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  // Na web, o conteúdo precisa nascer visível mesmo se requestAnimationFrame
  // estiver pausado (aba em background, screenshot ou modo de economia).
  const fadeAnim = useRef(new Animated.Value(Platform.OS === 'web' ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(Platform.OS === 'web' ? 0 : 30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  async function entrar() {
    if (!email.trim() || !senha.trim()) {
      mostrarAlerta('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    setCarregando(true);
    Hapticos.impactoMedio();
    try {
      await AuthServico.entrar({ email: email.trim(), senha });
      router.replace('/(tabs)');
    } catch (e: any) {
      const msg = e?.message?.includes('Invalid login credentials')
        ? 'E-mail ou senha incorretos.'
        : e?.message ?? 'Erro ao entrar. Tente novamente.';
      mostrarAlerta('Erro', msg);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={estilos.flex}
        >
          <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => router.back()} style={estilos.botaoVoltar}>
              <Ionicons name="arrow-back" size={24} color={Cores.textoClaro} />
            </Pressable>

            <Animated.View style={[estilos.conteudo, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              {/* Ícone */}
              <View style={estilos.iconeContainer}>
                <LinearGradient colors={Cores.gradienteAcento} style={estilos.iconeGradiente}>
                  <MaterialCommunityIcons name="eye-outline" size={40} color={Cores.fundoEscuro} />
                </LinearGradient>
              </View>

              <Text style={estilos.titulo}>Bem-vindo de volta</Text>
              <Text style={estilos.subtitulo}>Entre para continuar sua jornada espiritual</Text>

              {/* Formulário */}
              <View style={estilos.formulario}>
                <View style={estilos.campo}>
                  <Text style={estilos.label}>E-mail</Text>
                  <Input
                    valor={email}
                    aoMudar={setEmail}
                    placeholder="seu@email.com"
                    tipoTeclado="email-address"
                    autoCapitalize="none"
                    iconeEsquerda="mail-outline"
                  />
                </View>

                <View style={estilos.campo}>
                  <Text style={estilos.label}>Senha</Text>
                  <Input
                    valor={senha}
                    aoMudar={setSenha}
                    placeholder="Sua senha"
                    seguro={!senhaVisivel}
                    iconeEsquerda="lock-closed-outline"
                    iconeDireita={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
                    aoClicarIconeDireita={() => setSenhaVisivel(!senhaVisivel)}
                  />
                </View>

                <Pressable
                  onPress={() => router.push('/auth/esqueceu-senha')}
                  style={estilos.esqueceuSenha}
                >
                  <Text style={estilos.esqueceuSenhaTexto}>Esqueceu a senha?</Text>
                </Pressable>
              </View>

              <Button
                variante="primary"
                label={carregando ? 'Entrando...' : 'Entrar'}
                larguraTotal
                onPress={entrar}
                disabled={carregando}
              />

              {/* Divider */}
              <View style={estilos.divider}>
                <View style={estilos.dividerLinha} />
                <Text style={estilos.dividerTexto}>ou</Text>
                <View style={estilos.dividerLinha} />
              </View>

              <Pressable
                onPress={() => router.push('/auth/cadastro')}
                style={estilos.linkCadastro}
              >
                <Text style={estilos.linkCadastroTexto}>
                  Não tem conta?{' '}
                  <Text style={estilos.linkCadastroBold}>Cadastre-se grátis</Text>
                </Text>
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
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Espacamento.lg, paddingBottom: Espacamento.xxl },
  botaoVoltar: {
    marginTop: Espacamento.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: { flex: 1, alignItems: 'center', paddingTop: Espacamento.lg },
  iconeContainer: { marginBottom: Espacamento.lg },
  iconeGradiente: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 28,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
    marginBottom: Espacamento.xs,
  },
  subtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginBottom: Espacamento.xl,
  },
  formulario: { width: '100%', gap: Espacamento.md },
  campo: { gap: Espacamento.xs },
  label: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.textoClaro,
    marginLeft: 2,
  },
  esqueceuSenha: { alignSelf: 'flex-end', marginTop: 4 },
  esqueceuSenhaTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.acento,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: Espacamento.lg,
    gap: Espacamento.sm,
  },
  dividerLinha: { flex: 1, height: 1, backgroundColor: Cores.cardBorda },
  dividerTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  linkCadastro: { marginTop: Espacamento.sm },
  linkCadastroTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
  },
  linkCadastroBold: {
    fontFamily: Fontes.corpoNegrito,
    color: Cores.acento,
  },
});
