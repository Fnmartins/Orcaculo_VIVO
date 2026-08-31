import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { GradientBackground } from '../../components/GradientBackground';
import { Button } from '../../components/Button';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import type { TipoAnalise } from '../../data/ia-analise';
import { salvarBase64ImagemCache } from '../../services/imagemCache';

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
  quiromancia: [
    'Abra bem a palma da mão',
    'Use iluminação natural',
    'Fotografe de frente, sem ângulo',
    'Inclua toda a palma na foto',
  ],
};

export default function TelaCaptura() {
  const { tipo = 'cafe' } = useLocalSearchParams<{ tipo?: string }>();
  const [imagemUri, setImagemUri] = useState<string | null>(null);

  const tirarFoto = useCallback(async () => {
    Hapticos.impactoLeve();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para capturar a imagem.');
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
      if (asset.base64) salvarBase64ImagemCache(asset.uri, asset.base64);
      setImagemUri(asset.uri);
    }
  }, []);

  const escolherGaleria = useCallback(async () => {
    Hapticos.impactoLeve();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
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
      if (asset.base64) salvarBase64ImagemCache(asset.uri, asset.base64);
      setImagemUri(asset.uri);
    }
  }, []);

  const analisar = useCallback(() => {
    if (!imagemUri) return;
    Hapticos.impactoMedio();
    router.push({
      pathname: '/ia/processando',
      params: { tipo, imagemUri },
    });
  }, [imagemUri, tipo]);

  const instrucoes = INSTRUCOES[tipo] ?? INSTRUCOES.cafe;

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.container}>
          {/* Header */}
          <View style={estilos.header}>
            <Pressable onPress={() => router.back()} style={estilos.voltarBotao}>
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
                  onPress={() => setImagemUri(null)}
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
            ) : (
              <Button
                variante="primary"
                label="Analisar Imagem 🧠"
                larguraTotal
                onPress={analisar}
              />
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
