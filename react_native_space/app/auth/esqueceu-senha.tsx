import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, Alert,
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

export default function TelaEsqueceuSenha() {
  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  async function enviar() {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Digite seu e-mail.');
      return;
    }
    setCarregando(true);
    Hapticos.impactoLeve();
    try {
      await AuthServico.recuperarSenha(email.trim());
      setEnviado(true);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Erro ao enviar. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={estilos.flex}>
          <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => router.back()} style={estilos.botaoVoltar}>
              <Ionicons name="arrow-back" size={24} color={Cores.textoClaro} />
            </Pressable>

            <Animated.View style={[estilos.conteudo, { opacity: fadeAnim }]}>
              {enviado ? (
                <>
                  <View style={estilos.iconeEnviado}>
                    <Ionicons name="mail-open-outline" size={56} color={Cores.acento} />
                  </View>
                  <Text style={estilos.titulo}>E-mail enviado! ✨</Text>
                  <Text style={estilos.subtitulo}>
                    Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                  </Text>
                  <Button
                    variante="primary"
                    label="Voltar para o login"
                    larguraTotal
                    onPress={() => router.replace('/auth/login')}
                  />
                </>
              ) : (
                <>
                  <View style={estilos.iconeEnviado}>
                    <Ionicons name="lock-open-outline" size={56} color={Cores.acento} />
                  </View>
                  <Text style={estilos.titulo}>Recuperar senha</Text>
                  <Text style={estilos.subtitulo}>
                    Digite seu e-mail cadastrado e enviaremos um link para criar uma nova senha.
                  </Text>

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

                  <Button
                    variante="primary"
                    label={carregando ? 'Enviando...' : 'Enviar link'}
                    larguraTotal
                    onPress={enviar}
                    disabled={carregando}
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
  botaoVoltar: {
    marginTop: Espacamento.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: { flex: 1, alignItems: 'center', paddingTop: Espacamento.xl, gap: Espacamento.lg },
  iconeEnviado: {
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
