import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { confirmarAcao, mostrarAlerta } from '../../utils/alerta';
import type { ProfundidadeAnalise } from '../../services/ia';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { voltarOuIr } from '../../utils/navegacao';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useCameraPermissions } from 'expo-camera';
import { GradientBackground } from '../../components/GradientBackground';
import { CameraCaptura } from '../../components/CameraCaptura';
import { SemaforoUso } from '../../components/SemaforoUso';
import { Button } from '../../components/Button';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import type { TipoAnalise } from '../../data/ia-analise';
import { guardarImagem } from '../../services/imagemCache';
import { normalizarImagem } from '../../utils/imagemWeb';

/** Consentimento fica no aparelho: é escolha de quem usa, não dado nosso. */
const CHAVE_CONSENTIMENTO = '@arcanus:consentimento_ia';

const PROFUNDIDADES: { id: ProfundidadeAnalise; titulo: string; apoio: string }[] = [
  { id: 'simples', titulo: 'Leitura simples', apoio: 'O essencial, em três partes' },
  { id: 'completa', titulo: 'Leitura completa', apoio: 'Sete partes, olhando cada detalhe' },
];

const TITULOS: Record<string, string> = {
  cafe: 'Borra de Café',
  quiromancia: 'Leitura de Mão',
};

const INSTRUCOES: Record<string, string[]> = {
  cafe: [
    'Vire a xícara sobre o pires',
    'Aguarde a borra secar (2-3 min)',
    'Fotografe de cima, com boa luz',
    'Evite sombras na imagem',
  ],
  // Qual mão é a primeira instrução, não a última: a mão dominante mostra o que
  // a pessoa fez da vida; a outra, o que veio de berço. Isto estava dito só no
  // card da tela anterior, e sumia justamente na hora de fotografar.
  quiromancia: [
    'Use a mão dominante — a que você escreve',
    'Abra bem a palma',
    'Use iluminação natural',
    'Fotografe de frente, sem ângulo, com a palma inteira',
  ],
};

export default function TelaCaptura() {
  const { tipo = 'cafe' } = useLocalSearchParams<{ tipo?: string }>();
  const [imagemUri, setImagemUri] = useState<string | null>(null);
  // A foto fica no cache; pelas rotas viaja só esta chave.
  const [imagemId, setImagemId] = useState<string | null>(null);

  /**
   * Aceita a foto vinda de qualquer um dos três caminhos.
   *
   * Converte para JPEG e reduz antes de guardar: o iPhone fotografa em HEIC,
   * que o modelo recusa, e foto de celular tem megabytes que seriam enviados e
   * pagos à toa. Se a conversão falhar, segue com a original.
   */
  const aceitarFoto = useCallback(async (uri: string, base64?: string) => {
    const normalizada = await normalizarImagem(uri);
    const finalUri = normalizada?.uri ?? uri;
    const finalBase64 = normalizada?.base64 ?? base64;
    setImagemId(finalBase64 ? guardarImagem(finalUri, finalBase64) : null);
    setImagemUri(finalUri);
  }, []);
  const [profundidade, setProfundidade] = useState<ProfundidadeAnalise>('simples');
  const [cameraAberta, setCameraAberta] = useState(false);
  const [, requestPermission] = useCameraPermissions();

  /**
   * Câmera do sistema — o caminho comprovado no celular, onde o aparelho abre o
   * próprio app de câmera.
   *
   * Em 24/09 isto foi trocado por um visor dentro do app, para resolver o caso
   * do navegador de computador, que não tem app de câmera e cai no seletor de
   * arquivos. A troca quebrou o celular: o visor abria preto mesmo com a
   * permissão concedida. O visor voltou a ser opção secundária, só na web.
   */
  const tirarFoto = useCallback(async () => {
    Hapticos.impactoLeve();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      mostrarAlerta('Permissão necessária', 'Precisamos de acesso à câmera para capturar a imagem.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await aceitarFoto(asset.uri, asset.base64 ?? undefined);
    }
  }, [aceitarFoto]);

  /** Visor dentro do app: no computador é a única forma de usar a webcam. */
  const usarWebcam = useCallback(async () => {
    Hapticos.impactoLeve();
    const permissao = await requestPermission();
    if (!permissao?.granted) {
      mostrarAlerta(
        'Permissão necessária',
        permissao?.canAskAgain === false
          ? 'O acesso à câmera está bloqueado. Libere nas configurações do navegador e tente de novo.'
          : 'Precisamos de acesso à câmera para capturar a imagem.',
      );
      return;
    }
    setCameraAberta(true);
  }, [requestPermission]);

  const receberFoto = useCallback(async (foto: { uri: string; base64?: string }) => {
    await aceitarFoto(foto.uri, foto.base64);
    setCameraAberta(false);
  }, [aceitarFoto]);

  const escolherGaleria = useCallback(async () => {
    Hapticos.impactoLeve();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      mostrarAlerta('Permissão necessária', 'Precisamos de acesso à galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await aceitarFoto(asset.uri, asset.base64 ?? undefined);
    }
  }, []);

  // A foto sai do aparelho e vai para um serviço de terceiro. Quem consulta
  // precisa saber disso antes, e não depois de ler a Política de Privacidade.
  const analisar = useCallback(async () => {
    if (!imagemUri) return;
    if (!imagemId) {
      mostrarAlerta('Imagem incompleta', 'Não conseguimos ler esta foto. Tente capturar de novo.');
      return;
    }

    const seguir = () => {
      Hapticos.impactoMedio();
      router.push({
        pathname: '/ia/processando',
        // Só o identificador: a foto vai pelo cache em memória. Mandá-la aqui
      // virava uma URL de megabytes, e a navegação não acontecia — sem erro.
      params: { tipo, imagemId, profundidade },
      });
    };

    let jaAutorizou = false;
    try {
      jaAutorizou = (await AsyncStorage.getItem(CHAVE_CONSENTIMENTO)) === 'sim';
    } catch {
      // Sem armazenamento local, pergunta de novo: perguntar duas vezes é
      // chato, enviar sem perguntar não é aceitável.
    }
    if (jaAutorizou) {
      seguir();
      return;
    }

    confirmarAcao(
      'Enviar a foto para análise',
      'Para ler a imagem, ela é enviada ao serviço de inteligência artificial que escreve a leitura. '
      + 'Ela é usada apenas para gerar este texto e não fica guardada por nós. Você autoriza?',
      async () => {
        try {
          await AsyncStorage.setItem(CHAVE_CONSENTIMENTO, 'sim');
        } catch {
          // Não conseguir lembrar do "sim" só custa perguntar de novo.
        }
        seguir();
      },
      { confirmarLabel: 'Autorizar' },
    );
  }, [imagemUri, imagemId, tipo, profundidade]);

  const instrucoes = INSTRUCOES[tipo] ?? INSTRUCOES.cafe;

  return (
    <GradientBackground>
      {cameraAberta && (
        <CameraCaptura aoCapturar={receberFoto} aoFechar={() => setCameraAberta(false)} />
      )}
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          {/* Header */}
          <View style={estilos.header}>
            <Pressable onPress={() => voltarOuIr()} style={estilos.voltarBotao}>
              <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
            </Pressable>
            <Text style={estilos.headerTitulo}>{TITULOS[tipo] ?? 'Análise'}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Área da imagem */}
          <View style={estilos.imagemArea}>
            {imagemUri ? (
              <View style={estilos.imagemContainer}>
                <Image source={{ uri: imagemUri }} style={estilos.imagemPreview} />
                <Pressable
                  onPress={() => { setImagemUri(null); setImagemId(null); }}
                  style={estilos.removerBotao}
                >
                  <Ionicons name="close-circle" size={28} color={Cores.erro} />
                </Pressable>
              </View>
            ) : (
              <View style={estilos.placeholderContainer}>
                <Ionicons
                  name={tipo === 'cafe' ? 'cafe-outline' : 'hand-left-outline'}
                  size={64}
                  color="rgba(212, 175, 55, 0.3)"
                />
                <Text style={estilos.placeholderTexto}>Capture ou selecione{"\n"}uma imagem</Text>
              </View>
            )}
          </View>

          {/* Instruções */}
          <View style={estilos.instrucoesContainer}>
            <Text style={estilos.instrucoesLabel}>📷 Dicas para uma boa foto:</Text>
            {instrucoes.map((inst, i) => (
              <View key={i} style={estilos.instrucaoLinha}>
                <Text style={estilos.instrucaoNumero}>{i + 1}</Text>
                <Text style={estilos.instrucaoTexto}>{inst}</Text>
              </View>
            ))}
          </View>

          {/* Botões de captura */}
          <View style={estilos.footer}>
            {!imagemUri ? (
              <>
                <View style={estilos.capturaBotoes}>
                <Pressable
                  onPress={tirarFoto}
                  style={({ pressed }) => [estilos.capturaBotao, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
                >
                  <LinearGradient
                    colors={Cores.gradienteAcento}
                    style={estilos.capturaBotaoGradient}
                  >
                    <Ionicons name="camera" size={28} color={Cores.fundoEscuro} />
                    <Text style={estilos.capturaBotaoTexto}>Câmera</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  onPress={escolherGaleria}
                  style={({ pressed }) => [estilos.capturaBotao, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
                >
                  <View style={estilos.galeriaBotaoInner}>
                    <Ionicons name="images-outline" size={28} color={Cores.acento} />
                    <Text style={estilos.galeriaBotaoTexto}>Galeria</Text>
                  </View>
                </Pressable>
                </View>
                {/* No computador o botão acima cai no seletor de arquivos,
                    porque navegador de desktop não tem app de câmera. Só ali a
                    webcam precisa de um caminho próprio. */}
                {Platform.OS === 'web' && (
                  <Pressable onPress={usarWebcam} style={estilos.webcamLink} accessibilityRole="button">
                    <Ionicons name="videocam-outline" size={16} color={Cores.acento} />
                    <Text style={estilos.webcamTexto}>Usar a webcam do computador</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <>
                {/* Quanto ainda cabe hoje, antes de escolher a profundidade —
                    é aqui que a conta é paga, então é aqui que o número tem
                    de aparecer. */}
                <SemaforoUso tipo="imagem" rotulo="Leituras por imagem" />

                <View style={estilos.profundidadeLinha}>
                  {PROFUNDIDADES.map((opcao) => {
                    const ativa = profundidade === opcao.id;
                    return (
                      <Pressable
                        key={opcao.id}
                        onPress={() => { Hapticos.impactoLeve(); setProfundidade(opcao.id); }}
                        style={[estilos.profundidadeCard, ativa && estilos.profundidadeCardAtiva]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: ativa }}
                      >
                        <Text style={[estilos.profundidadeTitulo, ativa && estilos.profundidadeTituloAtivo]}>
                          {opcao.titulo}
                        </Text>
                        <Text style={estilos.profundidadeApoio}>{opcao.apoio}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Button
                  variante="primary"
                  label="Analisar Imagem 🧠"
                  larguraTotal
                  onPress={analisar}
                />
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Espacamento.lg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Espacamento.sm, paddingBottom: Espacamento.md,
  },
  voltarBotao: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitulo: { fontFamily: Fontes.titulo, fontSize: 22, fontWeight: '700', color: Cores.textoClaro },

  imagemArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: 300,
  },
  imagemContainer: {
    position: 'relative',
    borderRadius: RaioBorda.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Cores.acento,
  },
  imagemPreview: {
    width: 260,
    height: 260,
    borderRadius: RaioBorda.xl - 2,
  },
  removerBotao: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 252, 246, 0.90)',
    borderRadius: 14,
  },
  placeholderContainer: {
    width: 260,
    height: 260,
    borderRadius: RaioBorda.xl,
    backgroundColor: Cores.cardFundo,
    borderWidth: 2,
    borderColor: Cores.cardBorda,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginTop: Espacamento.md,
  },

  profundidadeLinha: {
    flexDirection: 'row',
    gap: Espacamento.sm,
    marginBottom: Espacamento.md,
  },
  profundidadeCard: {
    flex: 1,
    paddingVertical: Espacamento.sm,
    paddingHorizontal: Espacamento.md,
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    backgroundColor: Cores.cardFundo,
    gap: 2,
  },
  profundidadeCardAtiva: {
    borderColor: Cores.acento,
    backgroundColor: 'rgba(181,139,70,0.10)',
  },
  profundidadeTitulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.textoPrimario,
  },
  profundidadeTituloAtivo: { color: Cores.acento },
  profundidadeApoio: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    lineHeight: 15,
  },
  webcamLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Espacamento.sm,
    marginTop: Espacamento.xs,
  },
  webcamTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.acento,
  },
  instrucoesContainer: {
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginVertical: Espacamento.md,
  },
  instrucoesLabel: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.textoClaro,
    marginBottom: Espacamento.sm,
  },
  instrucaoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 10,
  },
  instrucaoNumero: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 12,
    color: Cores.acento,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    textAlign: 'center',
    lineHeight: 20,
  },
  instrucaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    flex: 1,
  },

  footer: {
    paddingVertical: Espacamento.md,
    paddingBottom: Espacamento.lg,
  },
  capturaBotoes: {
    flexDirection: 'row',
    gap: Espacamento.md,
  },
  capturaBotao: {
    flex: 1,
  },
  capturaBotaoGradient: {
    height: 64,
    borderRadius: RaioBorda.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturaBotaoTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 12,
    color: Cores.fundoEscuro,
    marginTop: 4,
  },
  galeriaBotaoInner: {
    height: 64,
    borderRadius: RaioBorda.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Cores.acento,
  },
  galeriaBotaoTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 12,
    color: Cores.acento,
    marginTop: 4,
  },
});
