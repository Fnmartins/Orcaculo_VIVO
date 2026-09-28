import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { Hapticos } from '../utils/haptics';
import { montarRoteiro, type ParteDaLeitura } from '../utils/vozLeitura';
import { gerarLeituraFalada } from '../services/voz';

/**
 * "Ouvir a leitura", agora com a voz de verdade.
 *
 * Até 28/09 falava o `speechSynthesis` do navegador — de graça, mas robotizado,
 * e inexistente fora da web, então o botão simplesmente sumia no app nativo.
 * Agora o áudio vem da function `ia-voz` (Google Chirp 3 HD, voz Sadaltager) e
 * toca em qualquer plataforma.
 *
 * **O passo a mais existe por causa do iPhone.** O Safari só deixa tocar som
 * dentro do gesto da pessoa, e gerar a leitura leva alguns segundos — quando o
 * áudio fica pronto, o toque já passou. Então: tenta tocar direto, e se o
 * navegador recusar, o botão vira "Tocar". O segundo toque é gesto, e aí
 * sempre funciona. Uma volta a mais só para quem precisa dela.
 */

interface Props {
  partes: ParteDaLeitura[];
}

type Estado = 'parado' | 'preparando' | 'pronto' | 'tocando';

export function BotaoOuvir({ partes }: Props) {
  const [estado, setEstado] = useState<Estado>('parado');
  const [erro, setErro] = useState<string | null>(null);
  const [cortado, setCortado] = useState(false);

  const som = useRef<Audio.Sound | null>(null);
  // A URL fica guardada: ouvir de novo a mesma leitura não chama a function,
  // não gasta cota e não espera.
  const url = useRef<string | null>(null);
  const vivo = useRef(true);

  const descarregar = useCallback(async () => {
    const atual = som.current;
    som.current = null;
    if (atual) {
      try {
        await atual.unloadAsync();
      } catch {
        // Já descarregado, ou a tela saiu. O objetivo era parar, e parou.
      }
    }
  }, []);

  // Sair da tela com a leitura tocando deixaria a voz falando sozinha.
  useEffect(() => {
    vivo.current = true;
    return () => { vivo.current = false; void descarregar(); };
  }, [descarregar]);

  const tocar = useCallback(async (endereco: string): Promise<boolean> => {
    await descarregar();
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: endereco }, { shouldPlay: true });
      if (!vivo.current) {
        await sound.unloadAsync();
        return true;
      }
      som.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          void descarregar();
          if (vivo.current) setEstado('parado');
        }
      });
      return true;
    } catch {
      // Quase sempre é a política de autoplay do Safari. Quem chama transforma
      // isso no botão "Tocar", em vez de dizer que deu erro — não deu.
      return false;
    }
  }, [descarregar]);

  const alternar = useCallback(async () => {
    Hapticos.impactoLeve();

    if (estado === 'preparando') return;

    if (estado === 'tocando') {
      await descarregar();
      setEstado('parado');
      return;
    }

    setErro(null);

    if (url.current) {
      const ok = await tocar(url.current);
      setEstado(ok ? 'tocando' : 'pronto');
      if (!ok) setErro('Toque de novo para começar a leitura.');
      return;
    }

    setEstado('preparando');
    try {
      const leitura = await gerarLeituraFalada(montarRoteiro(partes));
      if (!vivo.current) return;
      url.current = leitura.url;
      setCortado(leitura.cortado);
      const ok = await tocar(leitura.url);
      if (!vivo.current) return;
      setEstado(ok ? 'tocando' : 'pronto');
      if (!ok) setErro('Toque de novo para começar a leitura.');
    } catch (e) {
      if (!vivo.current) return;
      setEstado('parado');
      setErro(e instanceof Error ? e.message : 'Não foi possível preparar a leitura falada.');
    }
  }, [estado, partes, tocar, descarregar]);

  const rotulo = estado === 'preparando' ? 'Preparando a leitura…'
    : estado === 'tocando' ? 'Parar'
      : estado === 'pronto' ? 'Tocar'
        : 'Ouvir a leitura';

  return (
    <View style={estilos.area}>
      <Pressable
        onPress={() => { void alternar(); }}
        disabled={estado === 'preparando'}
        accessibilityRole="button"
        accessibilityLabel={estado === 'tocando' ? 'Parar a leitura em voz' : 'Ouvir a leitura em voz'}
        style={[estilos.botao, estado === 'preparando' && estilos.botaoOcupado]}
      >
        {estado === 'preparando' ? (
          <ActivityIndicator size="small" color={Cores.acento} />
        ) : (
          <Ionicons
            name={estado === 'tocando' ? 'stop-circle-outline' : 'volume-high-outline'}
            size={18}
            color={Cores.acento}
          />
        )}
        <Text style={estilos.texto}>{rotulo}</Text>
      </Pressable>

      {cortado && (
        <Text style={estilos.nota}>
          A leitura é longa, então a voz lê o começo dela. O texto completo continua aí.
        </Text>
      )}
      {erro && <Text style={estilos.nota}>{erro}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  area: { gap: 6, marginBottom: Espacamento.md },
  botao: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Espacamento.sm, alignSelf: 'center',
    borderWidth: 1, borderColor: Cores.acento, borderRadius: RaioBorda.full,
    paddingVertical: 10, paddingHorizontal: Espacamento.lg,
  },
  botaoOcupado: { opacity: 0.7 },
  texto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.acento },
  nota: {
    fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario,
    textAlign: 'center',
  },
});
