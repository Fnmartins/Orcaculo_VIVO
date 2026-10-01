import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { Hapticos } from '../utils/haptics';
import { montarRoteiro, type ParteDaLeitura } from '../utils/vozLeitura';
import { gerarLeituraFalada } from '../services/voz';
import { SemaforoUso } from './SemaforoUso';

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
  /** Nome da leitura, usado só no texto que acompanha o áudio compartilhado. */
  titulo?: string;
}

const ASSINATURA = '🔮 Arcanus — arcanus.com.br';

type Estado = 'parado' | 'preparando' | 'pronto' | 'tocando' | 'pausado';

export function BotaoOuvir({ partes, titulo }: Props) {
  const [estado, setEstado] = useState<Estado>('parado');
  const [erro, setErro] = useState<string | null>(null);
  const [cortado, setCortado] = useState(false);
  const [compartilhando, setCompartilhando] = useState(false);

  const som = useRef<Audio.Sound | null>(null);
  // A URL fica guardada: ouvir de novo a mesma leitura não chama a function,
  // não gasta cota e não espera.
  const url = useRef<string | null>(null);
  // O link de compartilhar é outro: dura sete dias em vez de uma hora. Fica
  // buscado de antemão porque o Safari exige que o envio nasça do toque — se a
  // busca acontecer depois do toque, o gesto já passou e o primeiro clique não
  // envia nada. Foi o "tive que clicar duas vezes" do teste.
  const urlCompartilhar = useRef<string | null>(null);
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

    // Pausa de verdade, e não parada: uma leitura de mapa passa de dois
    // minutos, e voltar ao início por causa de uma interrupção é o mesmo que
    // não poder pausar. Relatado no teste do iPhone.
    if (estado === 'tocando' && som.current) {
      try {
        await som.current.pauseAsync();
        setEstado('pausado');
      } catch {
        // Não deu para pausar: descarrega, que é o comportamento antigo, em
        // vez de deixar o botão dizendo "Pausar" com a voz falando por cima.
        await descarregar();
        setEstado('parado');
      }
      return;
    }

    if (estado === 'pausado' && som.current) {
      try {
        await som.current.playAsync();
        setEstado('tocando');
      } catch {
        setEstado('pausado');
        setErro('Toque de novo para continuar.');
      }
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
      void prepararCompartilhamento();
    } catch (e) {
      if (!vivo.current) return;
      setEstado('parado');
      setErro(e instanceof Error ? e.message : 'Não foi possível preparar a leitura falada.');
    }
  }, [estado, partes, tocar, descarregar]);

  /**
   * Compartilhar o áudio é compartilhar um **link**, não o arquivo.
   *
   * No navegador — que é como o app é usado no iPhone — não há como entregar um
   * arquivo ao WhatsApp; só texto e endereço. Então o link vem assinado com
   * validade longa, porque um de uma hora morre antes de quem recebe abrir.
   */
  const prepararCompartilhamento = useCallback(async () => {
    if (urlCompartilhar.current) return;
    try {
      const leitura = await gerarLeituraFalada(montarRoteiro(partes), {
        paraCompartilhar: true,
      });
      if (vivo.current) urlCompartilhar.current = leitura.url;
    } catch {
      // Sem link pronto, o botão busca na hora — volta a ser dois toques, que
      // é o comportamento antigo, e não um erro para mostrar.
    }
  }, [partes]);

  const compartilhar = useCallback(async () => {
    Hapticos.impactoLeve();
    setCompartilhando(true);
    setErro(null);
    try {
      const endereco = urlCompartilhar.current
        ?? (await gerarLeituraFalada(montarRoteiro(partes), { paraCompartilhar: true })).url;
      urlCompartilhar.current = endereco;
      const leitura = { url: endereco };
      await Share.share({
        message: [
          titulo ? `🔮 ${titulo} — em áudio` : '🔮 A minha leitura, em áudio',
          leitura.url,
          '',
          'O link vale por sete dias.',
          ASSINATURA,
        ].join('\n'),
      });
    } catch (e) {
      // Cancelar o compartilhamento não é falha, e a Share não distingue bem
      // cancelamento de erro — por isso a mensagem é morna, não alarmante.
      if (e instanceof Error && e.message) setErro(e.message);
    } finally {
      setCompartilhando(false);
    }
  }, [partes, titulo]);

  const rotulo = estado === 'preparando' ? 'Preparando a leitura…'
    : estado === 'tocando' ? 'Pausar'
      : estado === 'pausado' ? 'Continuar'
        : estado === 'pronto' ? 'Tocar'
          : 'Ouvir a leitura';

  const icone = estado === 'tocando' ? 'pause-circle-outline'
    : estado === 'pausado' ? 'play-circle-outline'
      : 'volume-high-outline';

  return (
    <View style={estilos.area}>
      {/* O semáforo mora aqui, e não nas quatro telas que usam o botão, porque a voz é
          o que o servidor recusa a quem venceu (`ia-voz`, 402) e o botão é o único
          lugar comum a todas. Numa tela nova, a pessoa tocaria, esperaria "Preparando
          a leitura…" e só então leria o erro, sem cadeado nem caminho para os planos.
          Fica ACIMA do botão: o aviso tem de chegar antes do toque, não depois. */}
      <SemaforoUso tipo="voz" rotulo="Leituras faladas" />
      <Pressable
        onPress={() => { void alternar(); }}
        disabled={estado === 'preparando'}
        accessibilityRole="button"
        accessibilityLabel={
          estado === 'tocando' ? 'Pausar a leitura em voz'
            : estado === 'pausado' ? 'Continuar a leitura em voz'
              : 'Ouvir a leitura em voz'
        }
        style={[estilos.botao, estado === 'preparando' && estilos.botaoOcupado]}
      >
        {estado === 'preparando' ? (
          <ActivityIndicator size="small" color={Cores.acento} />
        ) : (
          <Ionicons name={icone} size={18} color={Cores.acento} />
        )}
        <Text style={estilos.texto}>{rotulo}</Text>
      </Pressable>

      <Pressable
        onPress={() => { void compartilhar(); }}
        disabled={compartilhando}
        accessibilityRole="button"
        accessibilityLabel="Compartilhar a leitura em áudio"
        style={estilos.compartilhar}
      >
        <Ionicons name="share-social-outline" size={15} color={Cores.textoSecundario} />
        <Text style={estilos.compartilharTexto}>
          {compartilhando ? 'Preparando o áudio…' : 'Compartilhar o áudio'}
        </Text>
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
  compartilhar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, alignSelf: 'center', paddingVertical: 4,
  },
  compartilharTexto: {
    fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario,
    textDecorationLine: 'underline',
  },
  texto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.acento },
  nota: {
    fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario,
    textAlign: 'center',
  },
});
