import React, { useRef, useEffect, useState, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Button } from '../../components/Button';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';

interface Passo {
  titulo: string;
  descricao: string;
  duracao: number;
}

interface DadosRitual {
  titulo: string;
  descricao: string;
  icone: string;
  cor: string;
  duracao: string;
  introducao: string;
  beneficios: string[];
  passos: Passo[];
  encerramento: string;
}

const RITUAIS: Record<string, DadosRitual> = {
  limpeza: {
    titulo: 'Limpeza Energética',
    descricao: 'Renove suas energias e dissolva bloqueios invisíveis.',
    icone: 'leaf-outline',
    cor: '#7C9A82',
    duracao: '15 min',
    introducao: 'A limpeza energética remove cargas densas acumuladas no campo áurico e no ambiente, criando espaço para energias elevadas e novas possibilidades.',
    beneficios: ['Dissolve energias negativas', 'Clareza mental e emocional', 'Ambiente mais leve e harmonioso', 'Conexão espiritual fortalecida'],
    passos: [
      { titulo: 'Prepare o espaço', descricao: 'Encontre um local tranquilo. Abra levemente uma janela. Desligue o celular e afaste distrações. Sente-se confortavelmente com a coluna ereta.', duracao: 120 },
      { titulo: 'Respiração de limpeza', descricao: 'Inspire profundamente pelo nariz por 4 tempos. Segure por 2 tempos. Expire pela boca por 6 tempos, imaginando que toda energia densa sai junto com o ar. Repita 7 vezes.', duracao: 180 },
      { titulo: 'Visualização da luz', descricao: 'Feche os olhos. Visualize uma luz branca e dourada descendo do alto e envolvendo todo o seu corpo. Sinta-a penetrando cada célula, dissolovendo tensões e escuridão.', duracao: 240 },
      { titulo: 'Intenção de limpeza', descricao: 'Diga mentalmente ou em voz baixa: "Peço que toda energia que não é minha, que não me serve mais, seja agora transmutada em luz. Meu campo energético é puro e harmonioso."', duracao: 120 },
      { titulo: 'Ancoragem e gratidão', descricao: 'Sinta seus pés no chão. Agradeça ao universo por este momento de cuidado consigo mesmo. Inspire paz, expire qualquer resíduo restante.', duracao: 120 },
    ],
    encerramento: 'Parabéns por completar sua limpeza energética. Você está mais leve, claro e conectado. Beba água pura e descanse por alguns minutos.',
  },
  protecao: {
    titulo: 'Proteção Espiritual',
    descricao: 'Crie um escudo de luz ao redor do seu campo áurico.',
    icone: 'shield-outline',
    cor: '#9B59B6',
    duracao: '20 min',
    introducao: 'O ritual de proteção espiritual fortalece sua aura, criando um campo de luz impenetrável que repele influências negativas e mantém sua frequência vibracional elevada.',
    beneficios: ['Escudo contra energias baixas', 'Fortalecimento da aura', 'Sensação de segurança e amparo', 'Clareza nas decisões'],
    passos: [
      { titulo: 'Centralize-se', descricao: 'Sente-se com os pés tocando o chão. Sinta o peso do seu corpo. Faça 5 respirações lentas e profundas, entrando cada vez mais em contato com o momento presente.', duracao: 120 },
      { titulo: 'Aterramento', descricao: 'Visualize raízes saindo da sola dos seus pés e penetrando a terra até o centro do planeta. Sinta-se ancorado, seguro e estável. Essas raízes são sua conexão com a força da Terra.', duracao: 180 },
      { titulo: 'Invocar a luz protetora', descricao: 'Visualize uma esfera de luz violeta e dourada expandindo a partir do seu coração. Ela cresce até envolver todo o seu corpo, depois seu quarto, sua casa. Uma barreira de amor e proteção.', duracao: 240 },
      { titulo: 'Afirmação de proteção', descricao: 'Repita 3 vezes: "Estou protegido(a) pela luz. Somente o amor e a verdade podem me alcançar. Tudo que não ressoa com minha essência se dissolve. Eu sou escudo e luz."', duracao: 180 },
      { titulo: 'Sele sua proteção', descricao: 'Cruze os braços sobre o peito em gesto de auto-abraço. Sinta o calor das suas próprias mãos. Diga: "Está feito. Estou protegido(a)." Expire lentamente e abra os olhos.', duracao: 120 },
    ],
    encerramento: 'Seu campo de proteção está ativo. Carregue esta sensação de segurança durante todo o dia. A luz que você invocou permanece ao seu redor.',
  },
  meditacao: {
    titulo: 'Meditação Guiada',
    descricao: 'Conecte-se com sua voz interior e encontre clareza.',
    icone: 'flower-outline',
    cor: '#3498DB',
    duracao: '10 min',
    introducao: 'Esta meditação guiada foi criada para silenciar a mente, acessar a sabedoria interior e abrir canais de percepção para as mensagens do universo.',
    beneficios: ['Mente mais calma e focada', 'Acesso à intuição', 'Redução de ansiedade', 'Clareza sobre perguntas e decisões'],
    passos: [
      { titulo: 'Posição e intenção', descricao: 'Sente-se ou deite-se confortavelmente. Feche os olhos. Defina uma intenção: o que você quer acessar nesta meditação? Uma resposta, paz, clareza? Mantenha essa intenção levemente em mente.', duracao: 90 },
      { titulo: 'Relaxamento progressivo', descricao: 'Da cabeça aos pés, relaxe conscientemente cada parte do corpo. Testa, maxilar, pescoço, ombros, peito, barriga, braços, mãos, quadris, pernas, pés. Sinta-se mais pesado e tranquilo a cada expiração.', duracao: 180 },
      { titulo: 'O lugar sagrado', descricao: 'Visualize um lugar de paz absoluta — pode ser uma floresta, uma praia, um templo de luz. Sinta-se lá: as cores, os cheiros, a temperatura. Este é o seu santuário interior, sempre acessível.', duracao: 180 },
      { titulo: 'Receba a mensagem', descricao: 'Permita-se simplesmente estar. Não force nada. Se pensamentos ou imagens vierem, observe sem julgamento. Sua intuição pode falar como uma sensação, uma palavra, uma cor ou simplesmente um silêncio amoroso.', duracao: 120 },
      { titulo: 'Retorno suave', descricao: 'Comece a sentir o corpo novamente. Mova os dedos das mãos e dos pés. Faça 3 respirações profundas. Ao seu ritmo, abra os olhos. Caso tenha recebido algo, anote imediatamente.', duracao: 60 },
    ],
    encerramento: 'Você acaba de nutrir sua mente e espírito. Carregue a quietude desta meditação ao longo do dia. Sua intuição está mais aguçada agora.',
  },
};

export default function TelaRitual() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dados = RITUAIS[id ?? ''] ?? RITUAIS.meditacao;

  const [passoAtual, setPassoAtual] = useState(-1);
  const [concluido, setConcluido] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const [rodando, setRodando] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressoAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const iniciarPasso = useCallback((indice: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    Hapticos.impactoMedio();
    setPassoAtual(indice);
    setRodando(true);
    const duracao = dados.passos[indice].duracao;
    setSegundosRestantes(duracao);
    progressoAnim.setValue(0);

    Animated.timing(progressoAnim, {
      toValue: 1,
      duration: duracao * 1000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setSegundosRestantes(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setRodando(false);
          Hapticos.impactoPesado();
          if (indice === dados.passos.length - 1) {
            setConcluido(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [dados.passos, progressoAnim]);

  function formatarTempo(seg: number): string {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const larguraProgresso = progressoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea}>
        <ScrollView
          style={estilos.scroll}
          contentContainerStyle={estilos.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View style={[estilos.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Pressable onPress={() => router.back()} style={estilos.voltarBotao}>
              <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
            </Pressable>
            <Text style={estilos.headerTitulo}>Ritual</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Hero */}
          <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient
              colors={[dados.cor + '20', 'rgba(26,26,46,0.6)'] as const}
              style={estilos.hero}
            >
              <View style={[estilos.heroIcone, { backgroundColor: dados.cor + '18' }]}>
                <Ionicons name={dados.icone as any} size={44} color={dados.cor} />
              </View>
              <Text style={estilos.heroTitulo}>{dados.titulo}</Text>
              <Text style={estilos.heroDescricao}>{dados.descricao}</Text>
              <View style={estilos.heroDuracao}>
                <Ionicons name="time-outline" size={14} color={Cores.acento} />
                <Text style={estilos.heroDuracaoTexto}>{dados.duracao}</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Introdução */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>Sobre este ritual</Text>
            <Text style={estilos.secaoTexto}>{dados.introducao}</Text>
          </Animated.View>

          {/* Benefícios */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>Benefícios</Text>
            {dados.beneficios.map((b, i) => (
              <View key={i} style={estilos.beneficioItem}>
                <Ionicons name="checkmark-circle" size={16} color={dados.cor} />
                <Text style={estilos.beneficioTexto}>{b}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Passos */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>Passos do Ritual</Text>
            {dados.passos.map((passo, i) => {
              const ativo = passoAtual === i;
              const feito = passoAtual > i || concluido;
              return (
                <Pressable
                  key={i}
                  onPress={() => !feito && !rodando && iniciarPasso(i)}
                  style={[
                    estilos.passoCard,
                    ativo && { borderColor: dados.cor },
                    feito && estilos.passoCardFeito,
                  ]}
                >
                  {/* Número */}
                  <View style={[estilos.passoNumero, feito && { backgroundColor: dados.cor + '30' }]}>
                    {feito
                      ? <Ionicons name="checkmark" size={16} color={dados.cor} />
                      : <Text style={[estilos.passoNumeroTexto, ativo && { color: dados.cor }]}>{i + 1}</Text>
                    }
                  </View>

                  <View style={estilos.passoConteudo}>
                    <Text style={[estilos.passoTitulo, ativo && { color: dados.cor }]}>{passo.titulo}</Text>
                    {(ativo || feito) && (
                      <Text style={estilos.passoDescricao}>{passo.descricao}</Text>
                    )}
                    {!ativo && !feito && (
                      <Text style={estilos.passoDuracaoTexto}>{formatarTempo(passo.duracao)}</Text>
                    )}

                    {/* Timer ativo */}
                    {ativo && (
                      <View style={estilos.timerContainer}>
                        <View style={estilos.timerBarra}>
                          <Animated.View
                            style={[estilos.timerProgresso, { width: larguraProgresso, backgroundColor: dados.cor }]}
                          />
                        </View>
                        <Text style={[estilos.timerTexto, { color: dados.cor }]}>
                          {rodando ? formatarTempo(segundosRestantes) : 'Concluído ✓'}
                        </Text>
                        {!rodando && passoAtual < dados.passos.length - 1 && (
                          <Pressable
                            onPress={() => iniciarPasso(passoAtual + 1)}
                            style={[estilos.proximoBtn, { backgroundColor: dados.cor }]}
                          >
                            <Text style={estilos.proximoBtnTexto}>Próximo passo</Text>
                            <Ionicons name="arrow-forward" size={14} color="#fff" />
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}

            {/* Iniciar primeiro passo */}
            {passoAtual === -1 && (
              <Button
                variante="primary"
                label="Iniciar Ritual"
                icone="play-circle-outline"
                posicaoIcone="left"
                larguraTotal
                onPress={() => iniciarPasso(0)}
              />
            )}
          </Animated.View>

          {/* Conclusão */}
          {concluido && (
            <Animated.View style={[estilos.conclusaoCard, { opacity: fadeAnim }]}>
              <LinearGradient
                colors={[dados.cor + '20', 'rgba(212,175,55,0.1)'] as const}
                style={estilos.conclusaoGradiente}
              >
                <Ionicons name="star-outline" size={36} color={Cores.acento} />
                <Text style={estilos.conclusaoTitulo}>Ritual Concluído ✨</Text>
                <Text style={estilos.conclusaoTexto}>{dados.encerramento}</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {concluido && (
            <View style={estilos.acoesContainer}>
              <Button
                variante="primary"
                label="Fazer uma Consulta"
                icone="star-outline"
                posicaoIcone="left"
                larguraTotal
                onPress={() => { Hapticos.impactoLeve(); router.push('/(tabs)'); }}
              />
              <View style={{ height: Espacamento.sm }} />
              <Button
                variante="outline"
                label="Voltar"
                larguraTotal
                onPress={() => router.back()}
              />
            </View>
          )}

          <View style={{ height: Espacamento.xxl }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Espacamento.lg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Espacamento.sm,
    paddingBottom: Espacamento.md,
  },
  voltarBotao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    fontWeight: '700',
    color: Cores.textoClaro,
  },

  hero: {
    alignItems: 'center',
    borderRadius: RaioBorda.xl,
    padding: Espacamento.xl,
    marginBottom: Espacamento.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,240,232,0.06)',
  },
  heroIcone: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espacamento.md,
  },
  heroTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 24,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
    marginBottom: Espacamento.xs,
  },
  heroDescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Espacamento.md,
  },
  heroDuracao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212,175,55,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RaioBorda.full,
  },
  heroDuracaoTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
    color: Cores.acento,
  },

  secao: { marginBottom: Espacamento.lg },
  secaoTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 18,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginBottom: Espacamento.sm,
  },
  secaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    lineHeight: 22,
  },

  beneficioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
    marginBottom: Espacamento.xs,
  },
  beneficioTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoClaro,
    opacity: 0.85,
  },

  passoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
    gap: Espacamento.sm,
  },
  passoCardFeito: {
    opacity: 0.6,
  },
  passoNumero: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245,240,232,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  passoNumeroTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  passoConteudo: { flex: 1 },
  passoTitulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 15,
    color: Cores.textoClaro,
    marginBottom: 4,
  },
  passoDescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    lineHeight: 20,
    marginBottom: Espacamento.sm,
  },
  passoDuracaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },

  timerContainer: { marginTop: Espacamento.xs },
  timerBarra: {
    height: 4,
    backgroundColor: 'rgba(245,240,232,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Espacamento.xs,
  },
  timerProgresso: {
    height: '100%',
    borderRadius: 2,
  },
  timerTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    marginBottom: Espacamento.sm,
  },
  proximoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: Espacamento.md,
    paddingVertical: Espacamento.xs,
    borderRadius: RaioBorda.full,
  },
  proximoBtnTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: '#fff',
  },

  conclusaoCard: { marginBottom: Espacamento.lg },
  conclusaoGradiente: {
    alignItems: 'center',
    borderRadius: RaioBorda.xl,
    padding: Espacamento.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
    gap: Espacamento.md,
  },
  conclusaoTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    fontWeight: '700',
    color: Cores.textoClaro,
  },
  conclusaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    lineHeight: 22,
  },

  acoesContainer: { paddingBottom: Espacamento.md },
});
