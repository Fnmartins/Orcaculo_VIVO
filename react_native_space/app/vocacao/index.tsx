import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { EstadoTela } from '../../components/EstadoTela';
import { SemaforoUso } from '../../components/SemaforoUso';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { useAuth } from '../../contexts/AuthContext';
import { montarMapaAstral } from '../../data/mapaAstral';
import { montarVocacao } from '../../data/vocacao';
import { TEXTO_CORPO } from '../../data/textos-mapa';
import type { Cidade } from '../../data/cidades';
import { usePlano } from '../../hooks/usePlano';
import { gerarLeituraDeVocacao, type InterpretacaoVocacao } from '../../services/ia';
import { Hapticos } from '../../utils/haptics';
import { voltarOuIr } from '../../utils/navegacao';

/**
 * O nome de um ponto do mapa, corpo ou ângulo.
 *
 * É a mesma função que `app/mapa-astral/resultado.tsx` passa para `areasDaVida`,
 * repetida aqui porque lá ela não é exportada. As duas telas precisam escrever
 * "Meio do Céu" do mesmo jeito nas peças que a leitura recebe; se um dia uma mudar
 * sem a outra, o nome do ponto vira duas grafias para o mesmo ângulo.
 */
function nomeDoPonto(ponto: string): string {
  if (ponto === 'ascendente') return 'Ascendente';
  if (ponto === 'meioCeu') return 'Meio do Céu';
  return TEXTO_CORPO[ponto as keyof typeof TEXTO_CORPO]?.titulo ?? ponto;
}

/** As quatro seções da leitura, na ordem da spec. O título é o que a pessoa lê. */
const SECOES: { chave: 'ondeRende' | 'ambiente' | 'drena' | 'passo'; rotulo: string }[] = [
  { chave: 'ondeRende', rotulo: 'Onde você rende' },
  { chave: 'ambiente', rotulo: 'O ambiente que te sustenta' },
  { chave: 'drena', rotulo: 'O que te drena' },
  { chave: 'passo', rotulo: 'O próximo passo' },
];

export default function TelaVocacao() {
  const { perfil, carregando } = useAuth();
  const { temAcesso } = usePlano();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [interpretacao, setInterpretacao] = useState<InterpretacaoVocacao | null>(null);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [erroIA, setErroIA] = useState<string | null>(null);

  // O mapa sai dos dados que o perfil já guarda. Nada de formulário aqui: ele existe
  // em `app/mapa-astral/index.tsx` e já grava no perfil. Duas telas pedindo a mesma
  // data de nascimento viram duas verdades sobre a mesma pessoa.
  const mapa = useMemo(() => {
    const cidade = perfil?.nascimento_cidade as Cidade | null | undefined;
    const data = perfil?.data_nascimento;
    if (!cidade || !data) return null;
    const [ano, mes, dia] = data.split('-').map((parte) => parseInt(parte, 10));
    // A hora nula É a ausência da hora, com ou sem o sinal `nascimento_sem_hora`. Confiar
    // só no sinal montaria um mapa do meio-dia como se fosse o da pessoa, e o meio do
    // céu errado apareceria com confiança na vitrine. Hoje só `mapa-astral/index.tsx`
    // grava a hora e sempre grava um dos dois; a garantia não pode depender disso.
    const semHora = perfil?.nascimento_sem_hora === true || !perfil?.nascimento_hora;
    const [hora, minuto] = (perfil?.nascimento_hora ?? '12:00')
      .split(':').map((parte) => parseInt(parte, 10));
    try {
      return montarMapaAstral({
        ano, mes, dia,
        // Sem hora, o meio-dia é só a conta de reserva; quem diz que a hora não é
        // conhecida é `semHora`. Sem esse aviso, o meio do céu do meio-dia apareceria
        // como se fosse o da pessoa.
        hora: semHora ? null : hora,
        minuto: semHora ? null : minuto,
        cidade,
      });
    } catch {
      return null;
    }
  }, [perfil]);

  const vocacao = useMemo(() => (mapa ? montarVocacao({
    posicoes: mapa.posicoes,
    cuspides: mapa.casas?.cuspides ?? null,
    casaDoCorpo: mapa.casaDoCorpo,
    aspectos: mapa.aspectos,
    nomeDoPonto,
    meioCeu: mapa.angulos?.meioCeu ?? null,
  }) : null), [mapa]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const lerVocacao = async () => {
    if (carregandoIA || interpretacao || !vocacao) return;
    setCarregandoIA(true);
    setErroIA(null);
    Hapticos.impactoMedio();
    try {
      // Sobem só as posições já calculadas. Data, hora e cidade de nascimento ficam
      // no aparelho: as efemérides já rodaram aqui.
      setInterpretacao(await gerarLeituraDeVocacao({
        meioDoCeu: vocacao.meioDoCeu,
        comCasas: vocacao.comCasas,
        pecas: vocacao.trabalho.pecas.map((p) => `${p.rotulo}: ${p.valor}`),
      }));
    } catch (e) {
      setErroIA(e instanceof Error ? e.message : 'Não foi possível ler agora. Tente de novo.');
    } finally {
      setCarregandoIA(false);
    }
  };

  const temMapaCompleto = temAcesso('mapa_completo');

  // O app define a sessão e só depois busca o perfil. Nesse intervalo `perfil` é
  // nulo, e dizer "faltam seus dados de nascimento" a quem tem os dados guardados
  // seria uma frase falsa, com um botão que o manda refazer o que já fez.
  const carregandoPerfil = carregando && !perfil;

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
              onPress={() => voltarOuIr()}
              style={estilos.voltarBotao}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
            </Pressable>
            <View style={estilos.headerCenter}>
              <Text style={estilos.headerTitulo}>Mapa de Vocação</Text>
              <Text style={estilos.headerSubtitulo}>O trabalho que o seu mapa natal aponta</Text>
            </View>
            <View style={estilos.voltarBotaoEspaco} />
          </Animated.View>

          {carregandoPerfil ? (
            <EstadoTela tipo="carregando" titulo="Abrindo o seu perfil" />
          ) : !mapa || !vocacao ? (
            // 1. Sem dados de nascimento: explica e manda para onde o formulário já existe.
            <EstadoTela
              tipo="vazio"
              titulo="Falta o seu mapa natal"
              descricao="A vocação sai do mapa natal, e o seu perfil ainda não tem a data e a cidade de nascimento. Informe-as uma vez e esta tela passa a usar os mesmos dados."
              acaoLabel="Gerar meu Mapa Astral"
              onAcao={() => { Hapticos.impactoLeve(); router.push('/mapa-astral'); }}
            />
          ) : (
            <>
              {/* 2. A parte grátis: é a vitrine, e aparece antes de qualquer pedido de plano. */}
              <Animated.View style={[estilos.secao, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <Text style={estilos.secaoTitulo}>Seu Meio do Céu</Text>
                <Text style={estilos.secaoSubtitulo}>O que você constrói à vista</Text>

                {vocacao.meioDoCeu ? (
                  <View style={estilos.cardPrincipal}>
                    <LinearGradient
                      colors={[Cores.acento + '15', Cores.cardFundo] as const}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={estilos.cardPrincipalGradiente}
                    >
                      <View style={estilos.cardPrincipalSignoRow}>
                        <Text style={[estilos.cardPrincipalSignoNome, { color: Cores.acento }]}>
                          {vocacao.meioDoCeu.signo}
                        </Text>
                        <Text style={estilos.grauTexto}>{vocacao.meioDoCeu.grau}°</Text>
                      </View>
                    </LinearGradient>
                  </View>
                ) : (
                  <View style={[estilos.emConstrucaoCard, { marginBottom: Espacamento.md }]}>
                    <Ionicons name="time-outline" size={22} color={Cores.acento} />
                    <Text style={estilos.emConstrucaoTitulo}>O signo dele depende da hora</Text>
                    <Text style={estilos.emConstrucaoTexto}>
                      Ele muda de signo a cada duas horas, mais ou menos. Chutar um seria inventar.
                    </Text>
                  </View>
                )}

                {/* A frase da casa 10, já escrita e revisável em `data/areas.ts`. */}
                <Text style={estilos.porque}>{vocacao.trabalho.porque}</Text>
              </Animated.View>

              <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
                <Text style={estilos.secaoTitulo}>A sua leitura</Text>

                {/* 3. Sem casas: dito ANTES do botão. Depois dele, quem tocou já
                    decidiu sem saber que a leitura sai mais curta. `comCasas` é falso
                    por dois motivos, e a frase tem de dizer o verdadeiro: sem hora, ou
                    num lugar onde o sistema de casas se desfaz. */}
                {!vocacao.comCasas && (
                  <View style={[estilos.equilibrioCaixa, { marginBottom: Espacamento.sm }]}>
                    <Text style={estilos.equilibrioTexto}>
                      {mapa.semHora
                        ? 'Sem a hora de nascimento, a leitura sai sem as casas e fala só dos planetas. Se achar a hora na certidão, refaça o seu Mapa Astral com ela: leva um minuto.'
                        : 'Neste lugar de nascimento o sistema de casas não se aplica, então a leitura sai sem elas e fala só dos planetas.'}
                    </Text>
                  </View>
                )}

                {/* 4. A leitura: no plano, o botão; sem plano, a chamada para os planos. */}
                {interpretacao ? (
                  <View style={estilos.equilibrioCaixa}>
                    <Text style={estilos.iaTituloResultado}>{interpretacao.titulo}</Text>
                    {SECOES.filter((s) => interpretacao[s.chave]).map((s) => (
                      <View key={s.chave}>
                        <Text style={estilos.iaRotulo}>{s.rotulo}</Text>
                        <Text style={estilos.equilibrioTexto}>{interpretacao[s.chave]}</Text>
                      </View>
                    ))}
                  </View>
                ) : temMapaCompleto ? (
                  <>
                    <SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />
                    <Text style={estilos.secaoSubtitulo}>
                      Acima está o que o seu mapa mostra. Aqui está a leitura: o que isso diz sobre
                      onde você tende a render, o que te sustenta, o que desgasta e um passo concreto.
                    </Text>
                    {erroIA && <Text style={estilos.avisoHonesto}>{erroIA}</Text>}
                    <Pressable
                      onPress={lerVocacao}
                      disabled={carregandoIA}
                      accessibilityRole="button"
                      accessibilityLabel="Ler a minha vocação com IA"
                      style={[estilos.botaoPlanos, carregandoIA && { opacity: 0.6 }]}
                    >
                      <Text style={estilos.botaoPlanosTexto}>
                        {carregandoIA ? 'Lendo a sua vocação…' : 'Ler minha vocação ✨'}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={estilos.emConstrucaoCard}>
                    <Ionicons name="briefcase-outline" size={22} color={Cores.acento} />
                    <Text style={estilos.emConstrucaoTitulo}>A leitura da sua vocação</Text>
                    <Text style={estilos.emConstrucaoTexto}>
                      O que está acima fica aberto. A leitura completa traz quatro seções: a direção
                      em que você rende, o ambiente que te sustenta, o que te drena e um próximo passo
                      concreto. Ela entra a partir do plano Iniciante.
                    </Text>
                    <Pressable
                      onPress={() => { Hapticos.impactoLeve(); router.push('/planos'); }}
                      accessibilityRole="button"
                      accessibilityLabel="Ver os planos"
                      style={estilos.botaoPlanos}
                    >
                      <Text style={estilos.botaoPlanosTexto}>Ver os planos</Text>
                    </Pressable>
                  </View>
                )}
              </Animated.View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

// Medidas, cores e fontes repetem as de `app/mapa-astral/resultado.tsx`: esta tela é
// a continuação dele, e um estilo próprio a faria parecer outro produto.
const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Espacamento.md,
    paddingTop: Espacamento.md,
    paddingBottom: Espacamento.sm,
  },
  voltarBotao: {
    width: 44,
    height: 44,
    borderRadius: RaioBorda.full,
    backgroundColor: Cores.cardFundo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voltarBotaoEspaco: { width: 44, height: 44 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    color: Cores.textoClaro,
  },
  headerSubtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  secao: {
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.lg,
  },
  secaoTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    color: Cores.textoClaro,
    marginBottom: 4,
  },
  secaoSubtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    marginBottom: Espacamento.md,
  },
  cardPrincipal: {
    marginBottom: Espacamento.md,
  },
  cardPrincipalGradiente: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
  },
  cardPrincipalSignoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPrincipalSignoNome: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
  },
  grauTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  porque: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    lineHeight: 21,
  },
  emConstrucaoCard: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    backgroundColor: Cores.cardFundo,
    padding: Espacamento.lg,
    alignItems: 'center',
    gap: Espacamento.sm,
  },
  emConstrucaoTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 17,
    fontWeight: '700',
    color: Cores.textoClaro,
    textAlign: 'center',
  },
  emConstrucaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    lineHeight: 21,
    textAlign: 'center',
  },
  avisoHonesto: {
    fontFamily: Fontes.corpo, fontSize: 12, lineHeight: 18,
    color: Cores.textoSecundario, marginTop: Espacamento.sm,
  },
  botaoPlanos: {
    marginTop: Espacamento.sm, borderWidth: 1, borderColor: Cores.acento,
    borderRadius: RaioBorda.full, paddingVertical: 10, paddingHorizontal: Espacamento.lg,
  },
  botaoPlanosTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.acento },
  equilibrioCaixa: {
    backgroundColor: 'rgba(181,139,70,0.10)', borderRadius: RaioBorda.lg,
    padding: Espacamento.md, gap: Espacamento.sm,
  },
  equilibrioTexto: {
    fontFamily: Fontes.corpo, fontSize: 13, lineHeight: 20, color: Cores.textoClaro,
  },
  iaTituloResultado: {
    fontFamily: Fontes.titulo, fontSize: 17, color: Cores.acento,
  },
  iaRotulo: {
    fontFamily: Fontes.corpoSemibold, fontSize: 12, color: Cores.textoSecundario,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
});
