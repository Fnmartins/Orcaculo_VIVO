import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { obterDesejo, atualizarDesejo, obterCategoria, Desejo } from '../../data/lei-atracao';

type Fase = 'preparacao' | 'respiracao' | 'afirmacoes' | 'gratidao' | 'completo';

const CICLOS_RESPIRACAO = 4;

export default function TelaRitual() {
  const params = useLocalSearchParams<{ id: string }>();
  const [desejo, setDesejo] = useState<Desejo | null>(null);
  const [fase, setFase] = useState<Fase>('preparacao');
  const [ciclo, setCiclo] = useState(0);
  const [respFase, setRespFase] = useState<'inspira' | 'segura' | 'expira'>('inspira');
  const [idxAfirmacao, setIdxAfirmacao] = useState(0);

  const escala = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (params.id) obterDesejo(params.id).then(setDesejo);
  }, [params.id]);

  const categoria = useMemo(() => desejo ? obterCategoria(desejo.categoria) : null, [desejo]);

  // Respiração guiada 4-4-6
  useEffect(() => {
    if (fase !== 'respiracao' || !desejo) return;
    let cancelado = false;

    const executarCiclo = async (n: number) => {
      if (cancelado || n >= CICLOS_RESPIRACAO) {
        if (!cancelado) setFase('afirmacoes');
        return;
      }
      setCiclo(n);

      // Inspira 4s
      setRespFase('inspira');
      Hapticos.impactoLeve();
      await animar(escala, 1.3, 4000, Easing.inOut(Easing.quad));
      if (cancelado) return;

      // Segura 4s
      setRespFase('segura');
      await esperar(4000);
      if (cancelado) return;

      // Expira 6s
      setRespFase('expira');
      Hapticos.impactoLeve();
      await animar(escala, 0.6, 6000, Easing.inOut(Easing.quad));
      if (cancelado) return;

      executarCiclo(n + 1);
    };

    executarCiclo(0);
    return () => { cancelado = true; };
  }, [fase, desejo, escala]);

  const proximaAfirmacao = () => {
    if (!categoria) return;
    Hapticos.impactoLeve();
    if (idxAfirmacao < categoria.afirmacoes.length - 1) {
      fadeAnim.setValue(0);
      setIdxAfirmacao(idxAfirmacao + 1);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } else {
      setFase('gratidao');
    }
  };

  const completarRitual = async () => {
    if (!desejo) return;
    Hapticos.impactoMedio();
    await atualizarDesejo(desejo.id, { rituaisFeitos: desejo.rituaisFeitos + 1 });
    setFase('completo');
  };

  if (!desejo || !categoria) {
    return (
      <GradientBackground>
        <SafeAreaView style={estilos.safeArea}>
          <View style={estilos.centro}>
            <Text style={estilos.carregando}>Preparando ritual...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea} edges={['top']}>
        <View style={estilos.header}>
          <Pressable
            onPress={() => { Hapticos.impactoLeve(); router.back(); }}
            style={estilos.voltar}
          >
            <Ionicons name="close" size={22} color={Cores.textoClaro} />
          </Pressable>
          <View style={estilos.progressoBarras}>
            {(['preparacao', 'respiracao', 'afirmacoes', 'gratidao'] as Fase[]).map(f => (
              <View
                key={f}
                style={[
                  estilos.progressoBarra,
                  (fase === f || (fase === 'completo')) && { backgroundColor: categoria.cor },
                ]}
              />
            ))}
          </View>
          <View style={estilos.voltar} />
        </View>

        <View style={estilos.container}>
          {fase === 'preparacao' && (
            <View style={estilos.centro}>
              <MaterialCommunityIcons name="meditation" size={80} color={categoria.cor} />
              <Text style={estilos.tituloFase}>Ritual de Alinhamento</Text>
              <Text style={estilos.textoFase}>
                Encontre um lugar tranquilo. Feche os olhos por alguns segundos e respire.{'\n\n'}
                Você vai:
              </Text>
              <View style={estilos.passos}>
                <PassoItem numero="1" texto="Respirar em ritmo 4-4-6" />
                <PassoItem numero="2" texto="Repetir afirmações de poder" />
                <PassoItem numero="3" texto="Sentir gratidão antecipada" />
              </View>
              <Pressable
                onPress={() => { Hapticos.impactoMedio(); setFase('respiracao'); }}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              >
                <LinearGradient
                  colors={[categoria.cor, categoria.cor + 'CC'] as const}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={estilos.botao}
                >
                  <Text style={estilos.botaoTexto}>Começar</Text>
                  <Ionicons name="arrow-forward" size={18} color={Cores.textoClaro} />
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {fase === 'respiracao' && (
            <View style={estilos.centro}>
              <Text style={estilos.tituloFase}>Respiração Guiada</Text>
              <Text style={estilos.cicloTexto}>Ciclo {ciclo + 1} de {CICLOS_RESPIRACAO}</Text>

              <View style={estilos.circuloContainer}>
                <Animated.View
                  style={[
                    estilos.circuloResp,
                    {
                      transform: [{ scale: escala }],
                      backgroundColor: categoria.cor + '30',
                      borderColor: categoria.cor,
                    },
                  ]}
                >
                  <Text style={[estilos.respFaseTexto, { color: categoria.cor }]}>
                    {respFase === 'inspira' && 'Inspire'}
                    {respFase === 'segura' && 'Segure'}
                    {respFase === 'expira' && 'Expire'}
                  </Text>
                </Animated.View>
              </View>

              <Text style={estilos.dicaResp}>
                {respFase === 'inspira' && 'Puxe o ar pelo nariz — 4 segundos'}
                {respFase === 'segura' && 'Mantenha o ar — 4 segundos'}
                {respFase === 'expira' && 'Solte devagar pela boca — 6 segundos'}
              </Text>
            </View>
          )}

          {fase === 'afirmacoes' && (
            <View style={estilos.centro}>
              <Text style={estilos.tituloFase}>Afirmações de Poder</Text>
              <Text style={estilos.cicloTexto}>{idxAfirmacao + 1} de {categoria.afirmacoes.length}</Text>

              <Animated.View style={[estilos.afirmacaoCard, { opacity: fadeAnim }]}>
                <MaterialCommunityIcons name="format-quote-open" size={32} color={categoria.cor} />
                <Text style={estilos.afirmacaoTexto}>{categoria.afirmacoes[idxAfirmacao]}</Text>
              </Animated.View>

              <Text style={estilos.dicaResp}>Leia em voz alta e sinta cada palavra.</Text>

              <Pressable
                onPress={proximaAfirmacao}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], marginTop: Espacamento.lg }]}
              >
                <LinearGradient
                  colors={[categoria.cor, categoria.cor + 'CC'] as const}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={estilos.botao}
                >
                  <Text style={estilos.botaoTexto}>
                    {idxAfirmacao < categoria.afirmacoes.length - 1 ? 'Próxima' : 'Continuar'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={Cores.textoClaro} />
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {fase === 'gratidao' && (
            <View style={estilos.centro}>
              <MaterialCommunityIcons name="hand-heart" size={80} color={categoria.cor} />
              <Text style={estilos.tituloFase}>Gratidão Antecipada</Text>
              <Text style={estilos.textoFase}>
                Feche os olhos e visualize seu desejo já realizado.
              </Text>
              <View style={[estilos.desejoBox, { borderColor: categoria.cor + '60' }]}>
                <Text style={estilos.desejoBoxLabel}>SEU DESEJO</Text>
                <Text style={estilos.desejoBoxTitulo}>{desejo.titulo}</Text>
                <Text style={estilos.desejoBoxDesc}>{desejo.descricao}</Text>
              </View>
              <Text style={[estilos.textoFase, { marginTop: Espacamento.md }]}>
                Diga em voz alta:{' '}
                <Text style={{ color: categoria.cor, fontFamily: Fontes.corpoSemibold, fontStyle: 'italic' }}>
                  “Obrigado(a), Universo, por já ter me concedido isso.”
                </Text>
              </Text>

              <Pressable
                onPress={completarRitual}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], marginTop: Espacamento.lg }]}
              >
                <LinearGradient
                  colors={Cores.gradienteAcento}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={estilos.botao}
                >
                  <Text style={[estilos.botaoTexto, { color: Cores.fundoEscuro }]}>Finalizar Ritual</Text>
                  <Ionicons name="sparkles" size={18} color={Cores.fundoEscuro} />
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {fase === 'completo' && (
            <View style={estilos.centro}>
              <MaterialCommunityIcons name="star-four-points" size={100} color={Cores.acento} />
              <Text style={[estilos.tituloFase, { fontSize: 28 }]}>Ritual Completo ✨</Text>
              <Text style={estilos.textoFase}>
                Sua vibração foi elevada. Continue conectado(a) à emoção do seu desejo ao longo do dia.
              </Text>
              <View style={estilos.recompensa}>
                <Ionicons name="flame" size={20} color={Cores.acento} />
                <Text style={estilos.recompensaTexto}>+1 ritual manifestado</Text>
              </View>

              <Pressable
                onPress={() => { Hapticos.impactoLeve(); router.replace('/lei-atracao'); }}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], marginTop: Espacamento.lg }]}
              >
                <LinearGradient
                  colors={Cores.gradienteAcento}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={estilos.botao}
                >
                  <Text style={[estilos.botaoTexto, { color: Cores.fundoEscuro }]}>Voltar ao Cofre</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

function PassoItem({ numero, texto }: { numero: string; texto: string }) {
  return (
    <View style={estilos.passoItem}>
      <View style={estilos.passoBullet}>
        <Text style={estilos.passoNumero}>{numero}</Text>
      </View>
      <Text style={estilos.passoTexto}>{texto}</Text>
    </View>
  );
}

function animar(anim: Animated.Value, para: number, dur: number, easing: any): Promise<void> {
  return new Promise(resolve => {
    Animated.timing(anim, { toValue: para, duration: dur, easing, useNativeDriver: true }).start(() => resolve());
  });
}
function esperar(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Espacamento.lg, paddingTop: Espacamento.sm },
  voltar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda, alignItems: 'center', justifyContent: 'center' },
  progressoBarras: { flexDirection: 'row', gap: 4, flex: 1, marginHorizontal: Espacamento.md },
  progressoBarra: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  container: { flex: 1, paddingHorizontal: Espacamento.lg, paddingVertical: Espacamento.md },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  carregando: { fontFamily: Fontes.corpo, color: Cores.textoSecundario },
  tituloFase: { fontFamily: Fontes.titulo, fontSize: 24, fontWeight: '700', color: Cores.textoClaro, marginTop: Espacamento.md, textAlign: 'center' },
  cicloTexto: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  textoFase: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoClaro, textAlign: 'center', marginTop: Espacamento.md, lineHeight: 22, paddingHorizontal: Espacamento.md },
  passos: { alignSelf: 'stretch', marginTop: Espacamento.lg, gap: Espacamento.sm },
  passoItem: { flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm, backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda, borderRadius: RaioBorda.md, padding: Espacamento.sm },
  passoBullet: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212, 175, 55, 0.2)', alignItems: 'center', justifyContent: 'center' },
  passoNumero: { fontFamily: Fontes.corpoNegrito, fontSize: 14, color: Cores.acento },
  passoTexto: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoClaro, flex: 1 },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: Espacamento.xl, borderRadius: RaioBorda.full, gap: 8, marginTop: Espacamento.xl },
  botaoTexto: { fontFamily: Fontes.corpoNegrito, fontSize: 15, color: Cores.textoClaro },
  circuloContainer: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', marginVertical: Espacamento.lg },
  circuloResp: { width: 200, height: 200, borderRadius: 100, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  respFaseTexto: { fontFamily: Fontes.titulo, fontSize: 22, fontWeight: '700' },
  dicaResp: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario, textAlign: 'center', marginTop: Espacamento.md, fontStyle: 'italic' },
  afirmacaoCard: { backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda, borderRadius: RaioBorda.xl, padding: Espacamento.xl, marginTop: Espacamento.lg, alignSelf: 'stretch', alignItems: 'center' },
  afirmacaoTexto: { fontFamily: Fontes.titulo, fontSize: 22, fontWeight: '700', color: Cores.textoClaro, textAlign: 'center', lineHeight: 30, marginTop: Espacamento.sm },
  desejoBox: { alignSelf: 'stretch', backgroundColor: Cores.cardFundo, borderWidth: 1, borderRadius: RaioBorda.lg, padding: Espacamento.md, marginTop: Espacamento.md },
  desejoBoxLabel: { fontFamily: Fontes.corpoNegrito, fontSize: 10, color: Cores.textoSecundario, letterSpacing: 1 },
  desejoBoxTitulo: { fontFamily: Fontes.titulo, fontSize: 16, fontWeight: '700', color: Cores.textoClaro, marginTop: 4 },
  desejoBoxDesc: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario, marginTop: 4, lineHeight: 19 },
  recompensa: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(212, 175, 55, 0.15)', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: RaioBorda.full, marginTop: Espacamento.md },
  recompensaTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.acento },
});
