import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Audio } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { supabase } from '../../services/supabase';

/**
 * A página de quem RECEBEU um áudio compartilhado.
 *
 * É a única tela do app que abre sem conta, e é de propósito: o link vai para
 * alguém que não usa o Arcanus ainda. Por isso ela não lê perfil, não conhece
 * quem gerou a leitura e não mostra nada além do áudio.
 *
 * O endereço curto (`/ouvir/xK9mPq2f`) existe porque a URL assinada do Supabase
 * passa de 700 caracteres e no WhatsApp vira uma parede. O código não é
 * derivado do hash nem do usuário: quem recebe um link não consegue deduzir
 * outro.
 */

type Estado = 'carregando' | 'pronto' | 'tocando' | 'erro';

export default function OuvirCompartilhado() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const [estado, setEstado] = useState<Estado>('carregando');
  const [erro, setErro] = useState<string | null>(null);

  const som = useRef<Audio.Sound | null>(null);
  const url = useRef<string | null>(null);
  const vivo = useRef(true);

  const descarregar = useCallback(async () => {
    const atual = som.current;
    som.current = null;
    if (atual) {
      try {
        await atual.unloadAsync();
      } catch {
        // Já descarregado, ou a página saiu. O objetivo era parar, e parou.
      }
    }
  }, []);

  useEffect(() => {
    vivo.current = true;
    return () => { vivo.current = false; void descarregar(); };
  }, [descarregar]);

  useEffect(() => {
    if (!codigo) {
      setEstado('erro');
      setErro('Este link não é válido.');
      return;
    }
    supabase.functions
      .invoke('ouvir', { body: { codigo } })
      .then(({ data, error }) => {
        if (!vivo.current) return;
        const endereco = (data as { url?: string } | null)?.url;
        const recusa = (data as { erro?: string } | null)?.erro;
        if (error || !endereco) {
          setEstado('erro');
          setErro(recusa ?? 'Este link expirou. Peça um novo a quem enviou.');
          return;
        }
        url.current = endereco;
        setEstado('pronto');
      })
      .catch(() => {
        if (!vivo.current) return;
        setEstado('erro');
        setErro('Não foi possível abrir esta leitura agora.');
      });
  }, [codigo]);

  // A reprodução nasce do toque, e não sozinha: o Safari recusa som automático,
  // e ninguém gosta de abrir um link e levar voz na cara.
  async function alternar() {
    if (estado === 'tocando') {
      await descarregar();
      setEstado('pronto');
      return;
    }
    if (!url.current) return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url.current },
        { shouldPlay: true },
      );
      if (!vivo.current) { await sound.unloadAsync(); return; }
      som.current = sound;
      setEstado('tocando');
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          void descarregar();
          if (vivo.current) setEstado('pronto');
        }
      });
    } catch {
      setErro('Toque de novo para começar.');
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.area}>
        <View style={estilos.centro}>
          <Text style={estilos.marca}>Arcanus</Text>
          <Text style={estilos.titulo}>Uma leitura, em voz</Text>

          {estado === 'carregando' && (
            <ActivityIndicator style={{ marginTop: Espacamento.lg }} color={Cores.acento} />
          )}

          {estado === 'erro' ? (
            <Text style={estilos.erro}>{erro}</Text>
          ) : estado !== 'carregando' ? (
            <>
              <Pressable
                onPress={() => { void alternar(); }}
                accessibilityRole="button"
                accessibilityLabel={estado === 'tocando' ? 'Pausar' : 'Ouvir a leitura'}
                style={estilos.botao}
              >
                <Ionicons
                  name={estado === 'tocando' ? 'pause' : 'play'}
                  size={22}
                  color={Cores.superficie}
                />
                <Text style={estilos.botaoTexto}>
                  {estado === 'tocando' ? 'Pausar' : 'Ouvir a leitura'}
                </Text>
              </Pressable>
              {erro && <Text style={estilos.nota}>{erro}</Text>}
            </>
          ) : null}

          <Text style={estilos.nota}>
            Esta leitura foi compartilhada com você, e o link vale por sete dias.
          </Text>

          <Pressable
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            accessibilityLabel="Conhecer o Arcanus"
          >
            <Text style={estilos.link}>Conhecer o Arcanus</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  area: { flex: 1 },
  centro: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Espacamento.lg, gap: Espacamento.sm,
  },
  marca: {
    fontFamily: Fontes.corpoSemibold, fontSize: 12, letterSpacing: 2,
    textTransform: 'uppercase', color: Cores.acento,
  },
  titulo: {
    fontFamily: Fontes.titulo, fontSize: 24, color: Cores.textoClaro,
    textAlign: 'center', marginBottom: Espacamento.md,
  },
  botao: {
    flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm,
    backgroundColor: Cores.primaria, borderRadius: RaioBorda.full,
    paddingVertical: 14, paddingHorizontal: Espacamento.xl,
  },
  botaoTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 16, color: Cores.superficie },
  erro: {
    fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoSecundario,
    textAlign: 'center', marginTop: Espacamento.md,
  },
  nota: {
    fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario,
    textAlign: 'center', marginTop: Espacamento.md,
  },
  link: {
    fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.acento,
    textDecorationLine: 'underline', marginTop: Espacamento.sm,
  },
});
