import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { EstadoTela } from '../../components/EstadoTela';
import { NotaReflexiva } from '../../components/NotaReflexiva';
import { Octograma } from '../../components/Octograma';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { dataConsultaValida, textoConsultaValido } from '../../utils/validacaoConsulta';
import { calcularMatriz, obterArcano, type ResultadoMatriz } from '../../data/matriz-destino';

interface PontoSelecionado {
  chave: string;
  valor: number;
  rotulo: string;
}

export default function TelaMatrizResultado() {
  const params = useLocalSearchParams<{
    nome: string; dia: string; mes: string; ano: string;
  }>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const detalheFade = useRef(new Animated.Value(0)).current;

  const [selecionado, setSelecionado] = useState<PontoSelecionado | null>(null);

  const matriz: ResultadoMatriz = useMemo(() => {
    return calcularMatriz(
      parseInt(params.dia ?? '1', 10),
      parseInt(params.mes ?? '1', 10),
      parseInt(params.ano ?? '2000', 10),
    );
  }, [params.dia, params.mes, params.ano]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    // Seleciona a essência por padrão
    setSelecionado({ chave: 'centro', valor: matriz.centro, rotulo: 'Essência' });
  }, [fadeAnim, slideAnim, matriz.centro]);

  function selecionarPonto(chave: string, valor: number, rotulo: string) {
    Hapticos.impactoLeve();
    detalheFade.setValue(0);
    setSelecionado({ chave, valor, rotulo });
    Animated.timing(detalheFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }

  const parametrosValidos = textoConsultaValido(params.nome)
    && dataConsultaValida(params.dia, params.mes, params.ano);

  if (!parametrosValidos) {
    return (
      <GradientBackground>
        <SafeAreaView style={estilos.safeArea}>
          <EstadoTela
            tipo="erro"
            titulo="Não foi possível calcular sua matriz"
            descricao="Informe seu nome e uma data de nascimento válida para gerar a Matriz do Destino."
            acaoLabel="Revisar dados"
            onAcao={() => router.back()}
          />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const arcanoSel = selecionado ? obterArcano(selecionado.valor) : null;

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <ScrollView
          contentContainerStyle={estilos.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Pressable
              onPress={() => router.back()}
              style={estilos.iconeBotao}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
            </Pressable>
            <View style={estilos.headerCenter}>
              <Text style={estilos.headerTitulo}>Matriz do Destino</Text>
              <Text style={estilos.headerSubtitulo}>
                {params.nome || `${params.dia}/${params.mes}/${params.ano}`}
              </Text>
            </View>
            <View style={estilos.iconeBotaoEspaco} />
          </Animated.View>

          {/* Octograma */}
          <Animated.View style={[estilos.octogramaWrapper, { opacity: fadeAnim }]}>
            <Octograma
              matriz={matriz}
              tamanho={330}
              onSelecionarPonto={selecionarPonto}
              pontoSelecionado={selecionado?.chave ?? null}
            />
            <Text style={estilos.dicaToque}>Toque nos pontos para revelar cada energia</Text>
          </Animated.View>

          {/* Detalhe do ponto selecionado */}
          {selecionado && arcanoSel && (
            <Animated.View style={[estilos.secao, { opacity: detalheFade.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }]}>
              <LinearGradient
                colors={[arcanoSel.cor + '25', 'rgba(75,0,130,0.10)'] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={estilos.detalheCard}
              >
                <View style={estilos.detalheTopo}>
                  <View style={[estilos.arcanoNumero, { backgroundColor: arcanoSel.cor }]}>
                    <Text style={estilos.arcanoNumeroTexto}>{arcanoSel.numero}</Text>
                  </View>
                  <View style={estilos.detalheInfo}>
                    <Text style={estilos.detalheRotulo}>{selecionado.rotulo}</Text>
                    <Text style={estilos.detalheArcanoNome}>{arcanoSel.nome}</Text>
                    <Text style={estilos.detalhePalavra}>{arcanoSel.palavraChave}</Text>
                  </View>
                </View>
                <Text style={estilos.detalheDescricao}>{arcanoSel.descricao}</Text>
                <View style={estilos.detalheDivisor} />
                <View style={estilos.detalheLinha}>
                  <Ionicons name="add-circle" size={16} color="#2ECC71" />
                  <Text style={estilos.detalheLinhaLabel}>Potencial: </Text>
                  <Text style={estilos.detalheLinhaTexto}>{arcanoSel.positivo}</Text>
                </View>
                <View style={estilos.detalheLinha}>
                  <Ionicons name="alert-circle" size={16} color="#E67E22" />
                  <Text style={estilos.detalheLinhaLabel}>Desafio: </Text>
                  <Text style={estilos.detalheLinhaTexto}>{arcanoSel.desafio}</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Linhas Especiais */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>Linhas de Vida</Text>
            <View style={estilos.linhasGrid}>
              <CardLinha icone="cash-multiple" cor="#27AE60" titulo="Dinheiro" valor={matriz.linhaDinheiro} onPress={() => selecionarPonto('linhaDinheiro', matriz.linhaDinheiro, 'Linha do Dinheiro')} />
              <CardLinha icone="heart" cor="#E91E63" titulo="Amor" valor={matriz.linhaAmor} onPress={() => selecionarPonto('linhaAmor', matriz.linhaAmor, 'Linha do Amor')} />
              <CardLinha icone="karma" cor="#9B59B6" titulo="Cauda Cármica" valor={matriz.caudaCarmica} onPress={() => selecionarPonto('caudaCarmica', matriz.caudaCarmica, 'Cauda Cármica')} />
            </View>
          </Animated.View>

          {/* Propósitos */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>Propósitos de Vida</Text>
            {matriz.propositos.map((prop) => {
              const arc = obterArcano(prop.arcano);
              return (
                <Pressable
                  key={prop.nome}
                  onPress={() => selecionarPonto(`prop-${prop.nome}`, prop.arcano, prop.nome)}
                  style={estilos.propCard}
                >
                  <View style={[estilos.propNumero, { backgroundColor: arc.cor }]}>
                    <Text style={estilos.propNumeroTexto}>{prop.arcano}</Text>
                  </View>
                  <View style={estilos.propInfo}>
                    <Text style={estilos.propNome}>{prop.nome}</Text>
                    <Text style={estilos.propArcano}>{arc.nome} • {arc.palavraChave}</Text>
                    <Text style={estilos.propDesc}>{prop.descricao}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>

          {/* Tabela de Chakras */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>Energia dos Chakras</Text>
            <Text style={estilos.secaoDescricao}>
              Cada chakra revela como suas energias fluem em três dimensões: física, energética e emocional.
            </Text>
            {/* Cabeçalho */}
            <View style={estilos.chakraHeaderRow}>
              <View style={estilos.chakraColNome}><Text style={estilos.chakraHeaderTexto}>Chakra</Text></View>
              <View style={estilos.chakraCol}><Text style={estilos.chakraHeaderTexto}>Corpo</Text></View>
              <View style={estilos.chakraCol}><Text style={estilos.chakraHeaderTexto}>Energia</Text></View>
              <View style={estilos.chakraCol}><Text style={estilos.chakraHeaderTexto}>Emoções</Text></View>
            </View>
            {matriz.chakras.map((chakra) => (
              <View key={chakra.nomeSanscrito} style={estilos.chakraRow}>
                <View style={estilos.chakraColNome}>
                  <View style={[estilos.chakraPonto, { backgroundColor: chakra.cor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.chakraNome}>{chakra.nome}</Text>
                    <Text style={estilos.chakraSanscrito}>{chakra.nomeSanscrito}</Text>
                  </View>
                </View>
                <Pressable style={estilos.chakraCol} onPress={() => selecionarPonto(`chakra-corpo-${chakra.nomeSanscrito}`, chakra.corpo, `${chakra.nome} • Corpo`)}>
                  <View style={[estilos.chakraValor, { borderColor: chakra.cor }]}><Text style={estilos.chakraValorTexto}>{chakra.corpo}</Text></View>
                </Pressable>
                <Pressable style={estilos.chakraCol} onPress={() => selecionarPonto(`chakra-energia-${chakra.nomeSanscrito}`, chakra.energia, `${chakra.nome} • Energia`)}>
                  <View style={[estilos.chakraValor, { borderColor: chakra.cor }]}><Text style={estilos.chakraValorTexto}>{chakra.energia}</Text></View>
                </Pressable>
                <Pressable style={estilos.chakraCol} onPress={() => selecionarPonto(`chakra-emocoes-${chakra.nomeSanscrito}`, chakra.emocoes, `${chakra.nome} • Emoções`)}>
                  <View style={[estilos.chakraValor, { borderColor: chakra.cor }]}><Text style={estilos.chakraValorTexto}>{chakra.emocoes}</Text></View>
                </Pressable>
              </View>
            ))}
          </Animated.View>

          {/* Formatos */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <View style={estilos.formatosBarra}>
              <View style={[estilos.formatoItem, estilos.formatoAtivo]}>
                <Ionicons name="document-text" size={18} color={Cores.acento} />
                <Text style={[estilos.formatoTexto, estilos.formatoTextoAtivo]}>Texto</Text>
              </View>
              <View style={estilos.formatoItem}>
                <Ionicons name="volume-medium-outline" size={18} color={Cores.textoSecundario} />
                <Text style={estilos.formatoTexto}>Áudio</Text>
                <View style={estilos.emBreveBadge}><Text style={estilos.emBreveTexto}>Em breve</Text></View>
              </View>
              <View style={estilos.formatoItem}>
                <Ionicons name="document-outline" size={18} color={Cores.textoSecundario} />
                <Text style={estilos.formatoTexto}>PDF</Text>
                <View style={estilos.emBreveBadge}><Text style={estilos.emBreveTexto}>Em breve</Text></View>
              </View>
            </View>
          </Animated.View>

          <NotaReflexiva />

          {/* Ações */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Pressable
              onPress={() => { Hapticos.impactoMedio(); router.push('/consultas'); }}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <LinearGradient
                colors={Cores.gradienteAcento}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={estilos.botaoPrincipal}
              >
                <MaterialCommunityIcons name="account-voice" size={20} color="#fff" />
                <Text style={estilos.botaoPrincipalTexto}>Aprofundar com um Oraculista</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => { Hapticos.impactoLeve(); router.replace('/matriz-destino'); }}
              style={estilos.botaoSecundario}
            >
              <MaterialCommunityIcons name="refresh" size={18} color={Cores.acento} />
              <Text style={estilos.botaoSecundarioTexto}>Calcular Outra Matriz</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function CardLinha({ icone, cor, titulo, valor, onPress }: {
  icone: string; cor: string; titulo: string; valor: number; onPress: () => void;
}) {
  const arc = obterArcano(valor);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [estilos.linhaCard, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <View style={[estilos.linhaIcone, { backgroundColor: cor + '22' }]}>
        <MaterialCommunityIcons name={icone as any} size={22} color={cor} />
      </View>
      <Text style={estilos.linhaTitulo}>{titulo}</Text>
      <View style={[estilos.linhaBadge, { backgroundColor: arc.cor }]}>
        <Text style={estilos.linhaBadgeTexto}>{valor}</Text>
      </View>
      <Text style={estilos.linhaArcano}>{arc.nome}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Espacamento.md,
    paddingTop: Espacamento.md,
    paddingBottom: Espacamento.sm,
  },
  iconeBotao: {
    width: 44,
    height: 44,
    borderRadius: RaioBorda.full,
    backgroundColor: Cores.cardFundo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconeBotaoEspaco: { width: 44, height: 44 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    color: Cores.textoClaro,
  },
  headerSubtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  octogramaWrapper: {
    alignItems: 'center',
    marginTop: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  dicaToque: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    marginTop: Espacamento.sm,
    fontStyle: 'italic',
  },
  secao: {
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.lg,
  },
  secaoTitulo: {
    fontFamily: Fontes.tituloSemibold,
    fontSize: 19,
    color: Cores.textoClaro,
    marginBottom: Espacamento.sm,
  },
  secaoDescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginBottom: Espacamento.md,
    lineHeight: 18,
  },
  // Detalhe
  detalheCard: {
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  detalheTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  arcanoNumero: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arcanoNumeroTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 24,
    color: '#fff',
  },
  detalheInfo: { flex: 1 },
  detalheRotulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.acento,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detalheArcanoNome: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    color: Cores.textoClaro,
  },
  detalhePalavra: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  detalheDescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoClaro,
    lineHeight: 20,
    marginBottom: Espacamento.sm,
  },
  detalheDivisor: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: Espacamento.sm,
  },
  detalheLinha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    paddingRight: Espacamento.sm,
  },
  detalheLinhaLabel: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.textoClaro,
    marginLeft: 4,
  },
  detalheLinhaTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    flex: 1,
    lineHeight: 18,
  },
  // Linhas de vida
  linhasGrid: {
    flexDirection: 'row',
    gap: Espacamento.sm,
  },
  linhaCard: {
    flex: 1,
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    alignItems: 'center',
  },
  linhaIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Espacamento.sm,
  },
  linhaTitulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
    color: Cores.textoClaro,
    textAlign: 'center',
    marginBottom: 6,
  },
  linhaBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  linhaBadgeTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    color: '#fff',
  },
  linhaArcano: {
    fontFamily: Fontes.corpo,
    fontSize: 10,
    color: Cores.textoSecundario,
    textAlign: 'center',
  },
  // Propósitos
  propCard: {
    flexDirection: 'row',
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
    gap: Espacamento.md,
  },
  propNumero: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propNumeroTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 20,
    color: '#fff',
  },
  propInfo: { flex: 1 },
  propNome: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  propArcano: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.acento,
    marginBottom: 3,
  },
  propDesc: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    lineHeight: 17,
  },
  // Chakras
  chakraHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Espacamento.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  chakraColNome: {
    flex: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chakraCol: {
    flex: 1,
    alignItems: 'center',
  },
  chakraHeaderTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
  chakraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Espacamento.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  chakraPonto: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chakraNome: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.textoClaro,
  },
  chakraSanscrito: {
    fontFamily: Fontes.corpo,
    fontSize: 10,
    color: Cores.textoSecundario,
  },
  chakraValor: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chakraValorTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    color: Cores.textoClaro,
  },
  // Formatos
  formatosBarra: {
    flexDirection: 'row',
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.md,
    padding: 4,
    gap: 4,
  },
  formatoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Espacamento.sm,
    borderRadius: RaioBorda.sm,
    gap: 4,
  },
  formatoAtivo: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  formatoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
  formatoTextoAtivo: {
    color: Cores.acento,
    fontFamily: Fontes.corpoSemibold,
  },
  emBreveBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  emBreveTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 8,
    color: Cores.textoSecundario,
  },
  // Botões
  botaoPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RaioBorda.lg,
    gap: Espacamento.sm,
  },
  botaoPrincipalTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 16,
    color: '#fff',
  },
  botaoSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: Espacamento.sm,
    gap: Espacamento.sm,
  },
  botaoSecundarioTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.acento,
  },
});
