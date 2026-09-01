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

export default function TelaCadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  async function cadastrar() {
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      mostrarAlerta('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (senha.length < 6) {
      mostrarAlerta('Atenção', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      mostrarAlerta('Atenção', 'As senhas não coincidem.');
      return;
    }
    setCarregando(true);
    Hapticos.impactoMedio();
    try {
      await AuthServico.cadastrar({ nome: nome.trim(), email: email.trim(), senha });
      mostrarAlerta(
        'Conta criada! ✨',
        'Verifique seu e-mail para confirmar o cadastro e acesse sua conta.',
        () => router.replace('/auth/login'),
      );
    } catch (e: any) {
      const msg = e?.message?.includes('already registered')
        ? 'Este e-mail já está cadastrado.'
        : e?.message ?? 'Erro ao criar conta. Tente novamente.';
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
                <LinearGradient colors={['rgba(212,175,55,0.3)', 'rgba(75,0,130,0.3)']} style={estilos.iconeGradiente}>
                  <MaterialCommunityIcons name="star-four-points" size={40} color={Cores.acento} />
                </LinearGradient>
              </View>

              <Text style={estilos.titulo}>Inicie sua jornada</Text>
              <Text style={estilos.subtitulo}>Crie sua conta gratuitamente</Text>

              {/* Benefícios rápidos */}
              <View style={estilos.beneficios}>
                {['1 leitura grátis por semana', 'Acesso a 8 oráculos', 'Histórico de consultas'].map((b, i) => (
                  <View key={i} style={estilos.beneficioItem}>
                    <Ionicons name="checkmark-circle" size={16} color={Cores.primaria} />
                    <Text style={estilos.beneficioTexto}>{b}</Text>
                  </View>
                ))}
              </View>

              {/* Formulário */}
              <View style={estilos.formulario}>
                <View style={estilos.campo}>
                  <Text style={estilos.label}>Nome</Text>
                  <Input
                    valor={nome}
                    aoMudar={setNome}
                    placeholder="Como você se chama?"
                    iconeEsquerda="person-outline"
                    autoCapitalize="words"
                  />
                </View>

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
                    placeholder="Mínimo 6 caracteres"
                    seguro={!senhaVisivel}
                    iconeEsquerda="lock-closed-outline"
                    iconeDireita={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
                    aoClicarIconeDireita={() => setSenhaVisivel(!senhaVisivel)}
                  />
                </View>

                <View style={estilos.campo}>
                  <Text style={estilos.label}>Confirmar senha</Text>
                  <Input
                    valor={confirmarSenha}
                    aoMudar={setConfirmarSenha}
                    placeholder="Repita a senha"
                    seguro={!senhaVisivel}
                    iconeEsquerda="lock-closed-outline"
                  />
                </View>
              </View>

              <Button
                variante="primary"
                label={carregando ? 'Criando conta...' : 'Criar conta grátis'}
                larguraTotal
                onPress={cadastrar}
                disabled={carregando}
              />

              <Text style={estilos.termos}>
                Ao criar conta, você concorda com nossos{' '}
                <Text style={estilos.termosLink}>Termos de Uso</Text>
                {' '}e{' '}
                <Text style={estilos.termosLink}>Política de Privacidade</Text>
              </Text>

              <Pressable
                onPress={() => router.push('/auth/login')}
                style={estilos.linkLogin}
              >
                <Text style={estilos.linkLoginTexto}>
                  Já tem conta?{' '}
                  <Text style={estilos.linkLoginBold}>Entrar</Text>
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
  iconeContainer: { marginBottom: Espacamento.md },
  iconeGradiente: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
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
    marginBottom: Espacamento.md,
  },
  beneficios: {
    width: '100%',
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    gap: Espacamento.xs,
    marginBottom: Espacamento.lg,
  },
  beneficioItem: { flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm },
  beneficioTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoClaro,
  },
  formulario: { width: '100%', gap: Espacamento.md },
  campo: { gap: Espacamento.xs },
  label: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.textoClaro,
    marginLeft: 2,
  },
  termos: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginTop: Espacamento.md,
    lineHeight: 17,
  },
  termosLink: { color: Cores.acento },
  linkLogin: { marginTop: Espacamento.md },
  linkLoginTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
  },
  linkLoginBold: {
    fontFamily: Fontes.corpoNegrito,
    color: Cores.acento,
  },
});
