import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/Button';
import { LequeDeCorte } from '../../components/taro/LequeDeCorte';
import { MonteParaDistribuir, type MedidaDaVaga } from '../../components/taro/MonteParaDistribuir';
import { Recolhimento } from '../../components/taro/Recolhimento';
import { VagaDaTiragem } from '../../components/taro/VagaDaTiragem';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { voltarOuIr } from '../../utils/navegacao';
import { ARCANOS_MAIORES, type CartaTarot } from '../../data/tarot';
import { cortar, embaralhar, recolher } from '../../data/corteDoBaralho';

/**
 * O rito do tarô: a pessoa corta, junta, puxa e vira.
 *
 * Até 01/10 esta tela sorteava três cartas sozinha e pedia um toque para revelar cada
 * uma. O sorteio continuava sendo do app; o gesto era enfeite. Agora a ordem sai dos
 * cortes que a pessoa dá — `cortar` e `recolher`, em `data/corteDoBaralho.ts`, são as
 * únicas donas dessa conta, e esta tela só as chama.
 *
 * O que sobreviveu da tela antiga, de propósito: o verso ornamentado (agora em
 * `components/taro/VersoDaCarta.tsx`), o brilho sob o monte, as partículas e a virada com
 * mola e clarão. O que morreu: a frente desenhada com ícone do Ionicons, que era
 * justamente o que fazia a leitura virar recitação de significado.
 */

const POSICOES = [
  { nome: 'Passado', regra: 'o que já se consumou e ainda pesa' },
  { nome: 'Presente', regra: 'o que está em jogo agora' },
  { nome: 'Futuro', regra: 'o que tende a se formar se nada mudar' },
];

/** Dez cortes foi o teto escolhido no protótipo: além disso é teimosia, não rito. */
const MAX_CORTES = 10;
const ROTULO_INTENCAO = 'Se quiser, diga o que te trouxe aqui';

// Glow animado abaixo do monte: é ele que diz "é daqui que se pega".
function Glow({ cor, anim }: { cor: string; anim: Animated.Value }) {
  return (
    <Animated.View style={[estilos.glow, { opacity: anim }]} pointerEvents="none">
      <LinearGradient
        colors={[cor + '60', cor + '00'] as const}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={estilos.glowGradiente}
      />
    </Animated.View>
  );
}

// Partícula flutuante. `ligado` existe porque o laço é infinito: sem ele quem pediu
// "reduzir movimento" ganhava a animação, e o Jest não conseguia encerrar o processo.
function Particula({ x, delay, ligado }: { x: number; delay: number; ligado: boolean }) {
  const yAnim = useRef(new Animated.Value(0)).current;
  const opAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ligado) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(yAnim, { toValue: -40, duration: 3000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
            Animated.timing(opAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(yAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [ligado, delay, yAnim, opAnim]);
  return (
    <Animated.View
      style={[estilos.particula, { left: x, opacity: opAnim, transform: [{ translateY: yAnim }] }]}
    />
  );
}

export default function TelaCartas() {
  const [intencao, setIntencao] = useState('');
  const [leque, setLeque] = useState<CartaTarot[]>(() => embaralhar(ARCANOS_MAIORES));
  const [montes, setMontes] = useState<CartaTarot[][]>([]);
  const [baralho, setBaralho] = useState<CartaTarot[] | null>(null);
  const [tiragem, setTiragem] = useState<(CartaTarot | null)[]>([null, null, null]);
  const [reveladas, setReveladas] = useState([false, false, false]);
  const [recolhendo, setRecolhendo] = useState(false);
  const [medidas, setMedidas] = useState<MedidaDaVaga[]>([]);
  // `null` enquanto não se sabe: começar em `true` deixaria os laços partirem antes da
  // resposta do sistema, e aí não há como desligá-los sem piscar.
  const [movimento, setMovimento] = useState<boolean | null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const desliza = useRef(new Animated.Value(30)).current;
  const pulso = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduz) => { if (vivo) setMovimento(!reduz); })
      .catch(() => { if (vivo) setMovimento(false); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(desliza, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [fade, desliza]);

  useEffect(() => {
    if (movimento !== true) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [movimento, pulso]);

  const cortes = montes.length;
  const podeCortar = leque.length >= 2 && cortes < MAX_CORTES;
  const distribuindo = baralho !== null;
  const tudoPuxado = tiragem.every((c) => c !== null);
  const prontas = tudoPuxado && reveladas.every(Boolean);

  const aoCortar = useCallback((indice: number) => {
    Hapticos.impactoLeve();
    const { monte, resto } = cortar(leque, indice);
    setMontes((anteriores) => [...anteriores, monte]);
    setLeque(resto);
  }, [leque]);

  const juntar = useCallback(() => {
    Hapticos.impactoMedio();
    setRecolhendo(true);
  }, []);

  // A ordem ja foi decidida por `recolher` no instante do corte; o riffle so a mostra.
  // Por isso ele nao recebe nem devolve cartas, e o baralho e montado aqui no fim dele.
  const terminarRecolhimento = useCallback(() => {
    setBaralho(recolher(montes, leque));
    setRecolhendo(false);
  }, [montes, leque]);

  const puxarPara = useCallback((vaga: number) => {
    if (vaga < 0 || vaga >= tiragem.length || tiragem[vaga]) return;
    if (!baralho || baralho.length === 0) return;
    Hapticos.impactoLeve();
    const [topo, ...resto] = baralho;
    const nova = [...tiragem];
    nova[vaga] = topo;
    setTiragem(nova);
    setBaralho(resto);
  }, [tiragem, baralho]);

  // O toque cai na primeira vaga vazia; o arraste cai onde a pessoa soltou.
  const puxar = useCallback(() => {
    puxarPara(tiragem.findIndex((c) => c === null));
  }, [puxarPara, tiragem]);

  const medirVaga = useCallback((indice: number, medida: { topo: number; base: number }) => {
    setMedidas((anteriores) => {
      const sem = anteriores.filter((m) => m.indice !== indice);
      return [...sem, { indice, ...medida }];
    });
  }, []);

  const virar = useCallback((indice: number) => {
    if (!tiragem[indice] || reveladas[indice]) return;
    Hapticos.impactoMedio();
    setReveladas((anteriores) => {
      const novas = [...anteriores];
      novas[indice] = true;
      return novas;
    });
  }, [tiragem, reveladas]);

  const verResultado = useCallback(() => {
    Hapticos.impactoMedio();
    const cartas = tiragem.filter((c): c is CartaTarot => c !== null);
    router.push({
      pathname: '/consulta/resultado',
      params: { cartas: JSON.stringify(cartas), intencao: intencao.trim() },
    });
  }, [tiragem, intencao]);

  let subtitulo: string;
  if (recolhendo) {
    subtitulo = 'Recolhendo o baralho';
  } else if (!distribuindo) {
    subtitulo = cortes === 0
      ? 'Corte o baralho'
      : `${cortes} ${cortes === 1 ? 'corte' : 'cortes'} — corte de novo ou junte`;
  } else if (!tudoPuxado) {
    subtitulo = 'Pegue do monte e ponha nas posições';
  } else if (!prontas) {
    subtitulo = 'Toque nas cartas para virar';
  } else {
    subtitulo = 'Todas reveladas';
  }

  return (
    <LinearGradient colors={['#F7F3EA', '#F1EEE5', '#F7F3EA']} style={estilos.fundo}>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.particulasContainer} pointerEvents="none">
          {[30, 80, 140, 200, 260, 310].map((x, i) => (
            <Particula key={i} x={x} delay={i * 600} ligado={movimento === true} />
          ))}
        </View>

        <Animated.View
          style={[estilos.header, { opacity: fade, transform: [{ translateY: desliza }] }]}
        >
          {/* Saída da leitura: sem ela, quem desistia no meio ficava preso na tela. */}
          <Pressable
            onPress={() => voltarOuIr()}
            style={estilos.voltarBotao}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
          </Pressable>
          <View style={estilos.headerDivisor} />
          <Text style={estilos.titulo}>Suas Cartas</Text>
          <View style={estilos.headerDivisor} />
          {/* Mesma largura do botão, para o título continuar centralizado. */}
          <View style={estilos.espacoVoltar} />
        </Animated.View>

        <Animated.View style={[estilos.subtituloContainer, { opacity: fade }]}>
          <Text style={estilos.subtitulo}>{'✦ ' + subtitulo + ' ✦'}</Text>
        </Animated.View>

        <ScrollView
          style={estilos.rolagem}
          contentContainerStyle={estilos.rolagemConteudo}
          keyboardShouldPersistTaps="handled"
        >
          {recolhendo ? (
            <Recolhimento ligado={movimento === true} aoTerminar={terminarRecolhimento} />
          ) : !distribuindo ? (
            <>
              {/* O campo vive só nesta etapa: é a preparação, antes de tocar no baralho. */}
              <View style={estilos.campoBloco}>
                <Text style={estilos.campoRotulo}>{ROTULO_INTENCAO}</Text>
                <TextInput
                  accessibilityLabel={ROTULO_INTENCAO}
                  value={intencao}
                  onChangeText={setIntencao}
                  placeholder="Uma pergunta, uma situação, ou nada"
                  placeholderTextColor={Cores.textoSecundario}
                  multiline
                  maxLength={160}
                  style={estilos.campo}
                />
              </View>

              <LequeDeCorte
                quantidade={leque.length}
                aoCortar={aoCortar}
                desligado={!podeCortar}
              />
              {cortes >= MAX_CORTES && (
                <Text style={estilos.aviso}>
                  Dez cortes é o bastante. Junte o baralho para seguir.
                </Text>
              )}
            </>
          ) : (
            <View style={estilos.mesa}>
              <View style={estilos.vagas}>
                {POSICOES.map((posicao, i) => (
                  <VagaDaTiragem
                    key={posicao.nome}
                    posicao={posicao}
                    carta={tiragem[i]}
                    revelada={reveladas[i]}
                    aoReceber={() => puxarPara(i)}
                    aoVirar={() => virar(i)}
                    aoMedir={(medida) => medirVaga(i, medida)}
                  />
                ))}
              </View>

              {!tudoPuxado && (
                <View style={estilos.monteBloco}>
                  <Glow cor={Cores.acento} anim={pulso} />
                  <MonteParaDistribuir
                    restantes={baralho.length}
                    aoPuxar={puxar}
                    aoSoltarEm={puxarPara}
                    vagas={medidas}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <Animated.View style={[estilos.footer, { opacity: fade }]}>
          {prontas ? (
            <Button
              variante="primary"
              label="Ver Leitura Completa"
              icone="arrow-forward"
              posicaoIcone="right"
              larguraTotal
              onPress={verResultado}
            />
          ) : !distribuindo && !recolhendo && cortes > 0 ? (
            <Button
              variante="primary"
              label="Juntar e seguir"
              icone="layers-outline"
              larguraTotal
              onPress={juntar}
            />
          ) : (
            <View style={estilos.dicaContainer}>
              <View style={estilos.dicaDivisor} />
              <Text style={estilos.dicaTexto}>
                {recolhendo
                  ? 'As duas metades voltando a ser um baralho'
                  : distribuindo
                    ? (tudoPuxado
                      ? 'Toque em cada carta para virar'
                      : 'Arraste a carta de cima, ou toque')
                    : 'Toque no leque onde quiser cortar'}
              </Text>
              <View style={estilos.dicaDivisor} />
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1 },
  safeArea: { flex: 1 },

  particulasContainer: {
    position: 'absolute', bottom: 100, left: 0, right: 0, height: 100,
  },
  particula: {
    position: 'absolute', bottom: 0, width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: Cores.acento,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: Espacamento.md, paddingHorizontal: Espacamento.lg, gap: Espacamento.md,
  },
  headerDivisor: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.25)' },
  voltarBotao: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Cores.cardFundo,
    borderWidth: 1, borderColor: Cores.cardBorda, alignItems: 'center', justifyContent: 'center',
  },
  espacoVoltar: { width: 40 },
  titulo: {
    fontFamily: Fontes.titulo, fontSize: 26, fontWeight: '700',
    color: Cores.textoClaro, letterSpacing: 2,
  },

  subtituloContainer: { alignItems: 'center', paddingVertical: Espacamento.sm },
  subtitulo: {
    fontFamily: Fontes.corpo, fontSize: 13, color: Cores.acento,
    letterSpacing: 1.5, opacity: 0.8, textAlign: 'center',
  },

  rolagem: { flex: 1 },
  rolagemConteudo: {
    paddingHorizontal: Espacamento.md, paddingBottom: Espacamento.lg,
    gap: Espacamento.lg, alignItems: 'center',
  },

  campoBloco: { width: '100%', gap: Espacamento.xs },
  campoRotulo: {
    fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario, letterSpacing: 0.5,
  },
  campo: {
    minHeight: 58, borderRadius: RaioBorda.md, borderWidth: 1, borderColor: Cores.cardBorda,
    backgroundColor: Cores.cardFundo, paddingHorizontal: Espacamento.sm,
    paddingVertical: Espacamento.sm, fontFamily: Fontes.corpo, fontSize: 14,
    color: Cores.textoClaro, textAlignVertical: 'top',
  },
  aviso: {
    fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario, textAlign: 'center',
  },

  mesa: { width: '100%', alignItems: 'center', gap: Espacamento.lg },
  vagas: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', width: '100%', gap: Espacamento.xs,
  },
  monteBloco: { position: 'relative', alignItems: 'center' },

  glow: { position: 'absolute', bottom: -8, left: -10, right: -10, height: 40, zIndex: 0 },
  glowGradiente: { flex: 1, borderRadius: 20 },

  footer: {
    paddingHorizontal: Espacamento.lg, paddingVertical: Espacamento.md,
    paddingBottom: Espacamento.lg,
  },
  dicaContainer: { flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm },
  dicaDivisor: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.2)' },
  dicaTexto: {
    fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario,
    textAlign: 'center', letterSpacing: 0.5,
  },
});
