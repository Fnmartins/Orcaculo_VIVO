import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientBackground } from '../../components/GradientBackground';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { AuthServico } from '../../services/auth';
import { mostrarAlerta } from '../../utils/alerta';

const SENHA_MINIMA = 6;

type Estado = 'verificando' | 'pronto' | 'invalido';

// Destino do link "esqueci minha senha". O supabase-js já consumiu o token do
// link e abriu uma sessão de recuperação; aqui só trocamos a senha.
export default function TelaNovaSenha() {
  const [estado, setEstado] = useState<Estado>('verificando');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    AuthServico.sessaoAtual()
      .then((s) => setEstado(s ? 'pronto' : 'invalido'))
      .catch(() => setEstado('invalido'));
  }, []);

  async function salvar() {
    if (senha.length < SENHA_MINIMA) {
      mostrarAlerta('Atenção', `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      mostrarAlerta('Atenção', 'As senhas não conferem.');
      return;
    }
    setSalvando(true);
    Hapticos.impactoLeve();
    try {
      await AuthServico.definirNovaSenha(senha);
      mostrarAlerta('Senha atualizada ✨', 'Você já está conectado com a nova senha.');
      router.replace('/(tabs)');
    } catch (e: any) {
      mostrarAlerta('Erro', e?.message ?? 'Não foi possível atualizar a senha. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={estilos.flex}>
          <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled">
            <Animated.View style={[estilos.conteudo, { opacity: fadeAnim }]}>
              {estado === 'verificando' && (
                <ActivityIndicator style={{ marginTop: 48 }} color={Cores.acento} />
              )}

              {estado === 'invalido' && (
                <>
                  <View style={estilos.icone}>
                    <Ionicons name="time-outline" size={56} color={Cores.acento} />
                  </View>
                  <Text style={estilos.titulo}>Link inválido ou expirado</Text>
                  <Text style={estilos.subtitulo}>
                    Esse link de redefinição não vale mais. Peça um novo e use o mais recente
                    que chegar no seu e-mail.
                  </Text>
                  <Button
                    variante="primary"
                    label="Pedir novo link"
                    larguraTotal
                    onPress={() => router.replace('/auth/esqueceu-senha')}
                  />
                </>
              )}

              {estado === 'pronto' && (
                <>
                  <View style={estilos.icone}>
                    <Ionicons name="key-outline" size={56} color={Cores.acento} />
                  </View>
                  <Text style={estilos.titulo}>Criar nova senha</Text>
                  <Text style={estilos.subtitulo}>
                    Escolha uma senha com pelo menos {SENHA_MINIMA} caracteres.
                  </Text>

                  <View style={estilos.campo}>
                    <Text style={estilos.label}>Nova senha</Text>
                    <Input
                      valor={senha}
                      aoMudar={setSenha}
                      placeholder="Nova senha"
                      seguro={!senhaVisivel}
                      autoCapitalize="none"
                      iconeEsquerda="lock-closed-outline"
                      iconeDireita={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
                      aoClicarIconeDireita={() => setSenhaVisivel(!senhaVisivel)}
                    />
                  </View>

                  <View style={estilos.campo}>
                    <Text style={estilos.label}>Confirmar senha</Text>
                    <Input
                      valor={confirmacao}
                      aoMudar={setConfirmacao}
                      placeholder="Repita a nova senha"
                      seguro={!senhaVisivel}
                      autoCapitalize="none"
                      iconeEsquerda="lock-closed-outline"
                    />
                  </View>

                  <Button
                    variante="primary"
                    label={salvando ? 'Salvando...' : 'Salvar nova senha'}
                    larguraTotal
                    onPress={salvar}
                    disabled={salvando}
                  />
                </>
              )}
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
  conteudo: { flex: 1, alignItems: 'center', paddingTop: Espacamento.xxl, gap: Espacamento.lg },
  icone: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.sm,
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 26,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
  },
  subtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    lineHeight: 22,
  },
  campo: { width: '100%', gap: Espacamento.xs },
  label: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.textoClaro,
    marginLeft: 2,
  },
});
