import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, type CameraType } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { Hapticos } from '../utils/haptics';

/**
 * Câmera dentro do app, com visor e botão de disparo.
 *
 * Antes o botão "Tirar foto" chamava `launchCameraAsync`, que no celular abre o
 * app de câmera — mas no navegador de computador não existe app de câmera, e o
 * expo cai no seletor de arquivos. Quem clicava em "câmera" via a galeria.
 * `expo-camera` usa a câmera do aparelho nos dois casos, inclusive a webcam.
 *
 * Quem chama é responsável por já ter a permissão concedida: este componente só
 * mostra o visor.
 */
export function CameraCaptura({
  aoCapturar,
  aoFechar,
}: {
  aoCapturar: (foto: { uri: string; base64?: string }) => void;
  aoFechar: () => void;
}) {
  const camera = useRef<CameraView>(null);
  const [lado, setLado] = useState<CameraType>('back');
  const [disparando, setDisparando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function disparar() {
    if (disparando) return;
    setDisparando(true);
    Hapticos.impactoMedio();
    try {
      const foto = await camera.current?.takePictureAsync({ quality: 0.8, base64: true });
      if (!foto?.uri) throw new Error('A câmera não devolveu imagem.');
      aoCapturar({ uri: foto.uri, base64: foto.base64 ?? undefined });
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : 'Não foi possível tirar a foto.');
    } finally {
      setDisparando(false);
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={aoFechar} transparent={false}>
      <View style={estilos.fundo}>
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={lado} />

        <View style={estilos.topo}>
          <Pressable onPress={aoFechar} style={estilos.botaoRedondo} accessibilityRole="button" accessibilityLabel="Fechar câmera">
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setLado((atual) => (atual === 'back' ? 'front' : 'back'))}
            style={estilos.botaoRedondo}
            accessibilityRole="button"
            accessibilityLabel="Trocar de câmera"
          >
            <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
          </Pressable>
        </View>

        {erro ? (
          <View style={estilos.erroCaixa}>
            <Text style={estilos.erroTexto}>{erro}</Text>
          </View>
        ) : null}

        <View style={estilos.rodape}>
          <Pressable
            onPress={disparar}
            disabled={disparando}
            style={estilos.disparo}
            accessibilityRole="button"
            accessibilityLabel="Tirar foto"
          >
            {disparando
              ? <ActivityIndicator color={Cores.textoPrimario} />
              : <View style={estilos.disparoMiolo} />}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  // Preto atrás do visor é da câmera, não do tema: é o que some quando a
  // imagem aparece, e o que dá contraste aos controles sobre qualquer cena.
  fundo: { flex: 1, backgroundColor: '#000' },
  topo: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Espacamento.lg,
    paddingTop: Espacamento.xxl,
  },
  botaoRedondo: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  rodape: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    paddingBottom: Espacamento.xxl,
  },
  disparo: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  disparoMiolo: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#fff',
  },
  erroCaixa: {
    position: 'absolute',
    left: Espacamento.lg, right: Espacamento.lg, bottom: 160,
    backgroundColor: Cores.superficie,
    borderRadius: RaioBorda.md,
    padding: Espacamento.md,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  erroTexto: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoPrimario },
});
