import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Linking,
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
import { useCreditoAvulso } from '../../hooks/useCreditoAvulso';
import { acessoDoPlano } from '../../supabase/functions/_shared/limites';
import { gerarLeituraDeVocacao, type InterpretacaoVocacao } from '../../services/ia';
import { comprarAvulso } from '../../services/avulso';
import { moedaPadrao } from '../../services/stripe';
import { mostrarAlerta } from '../../utils/alerta';
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
  const { temAcesso, podeFazerConsulta } = usePlano();
  const { credito, gastou, falhou, lendo } = useCreditoAvulso('vocacao');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [interpretacao, setInterpretacao] = useState<InterpretacaoVocacao | null>(null);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [erroIA, setErroIA] = useState<string | null>(null);
  const [comprando, setComprando] = useState(false);

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
    semHora: mapa.semHora,
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

  // A MESMA regra que o servidor usa: `acessoDoPlano` mora em `_shared/limites.ts`, é a
  // função que a `ia-interpretacao` chama, e `components/SemaforoUso.tsx` já a chama assim
  // dentro desta tela. Não é uma segunda verdade sobre acesso: é a verdade compartilhada.
  const acesso = acessoDoPlano(perfil?.plano_valido_ate, new Date(), perfil?.is_super_admin === true);

  // Quem o servidor cobraria do crédito avulso. `podeFazerConsulta` sozinho não responde
  // isso por dois motivos: ele não olha `plano_valido_ate`, e perfil novo nasce com
  // `consultas_restantes = 1` que nada gasta para quem é `gratuito` — o desconto exige
  // `fonte === 'plano'`, que exige o veredito permitido, que exige a validade. O contador
  // fica em 1 para sempre, e sozinho ele esconde a oferta de quem mais precisa dela: quem
  // nunca assinou, que é metade do público que esta venda existe para atender.
  const planoNaoCobre = !acesso.liberado || !podeFazerConsulta();

  // O portão da leitura. Abre para quem tem o plano, para quem tem crédito, para quem JÁ
  // GASTOU um crédito e para quem não conseguimos ler:
  // - Quem tem crédito: volta da Stripe sem plano nenhum. Olhando só `temMapaCompleto`, a
  //   tela seguiria trancada e ainda ofereceria uma segunda compra de um crédito que ela não
  //   deixa gastar.
  // - Quem gastou: a leitura que pagou mora no servidor e fica no histórico enquanto a conta
  //   existir (promessa dos Termos). A leitura na tela é estado local, e sair da tela a
  //   apaga: com o portão fechado, quem já pagou seria convidado a pagar de novo para ver o
  //   que já comprou.
  // - Quem falhou: a leitura do crédito caiu, e não sabemos se a pessoa pagou. Esconder o
  //   botão de quem pagou é pior que mostrá-lo a quem não pagou, porque o servidor é o
  //   portão de verdade e recusa (402) quem não tem nada.
  const leituraAberta = temMapaCompleto || credito > 0 || gastou || falhou;

  // A compra se oferece a quem o plano não cobre e que não tem crédito, inclusive a quem já
  // gastou um: quem quer a leitura de outros dados de nascimento precisa poder comprar de
  // novo. Nunca antes de saber (`lendo`) nem na falha: não se convida a comprar sem saber se
  // já se comprou, e dois toques nessa janela comprariam de novo. O portão acima NÃO espera a
  // leitura: ele abre quando a resposta chega, e um piscar de cartão trancado custa menos que
  // uma oferta que a pessoa já aceitou.
  //
  // `planoNaoCobre` no lugar de `!temMapaCompleto`: o nome do plano diz que o recurso existe,
  // não que a leitura sai hoje. Assinante com a validade vencida, ou com a cota do período
  // gasta, leva 402 do servidor — e era justamente quem não via a segunda saída. A mesma
  // condição do mapa, para as duas telas não divergirem de novo.
  const ofertarAvulso = credito === 0 && !falhou && !lendo && planoNaoCobre;

  // O semáforo não chuta: sem saber do crédito (ainda lendo, ou a leitura falhou), não diz
  // nada, em vez de acusar acesso vencido a quem pode ter acabado de pagar.
  //
  // `gastou` com crédito zero entra no mesmo silêncio, e é o estado de quem comprou, gerou e
  // voltou: o cadeado diria "Seu acesso terminou. Atualize seu plano" logo acima do botão que
  // funciona, na cara de quem pagou. Calado, e não uma faixa positiva: `gastou` diz que a
  // pessoa pagou, não que a leitura está alcançável agora, e afirmar isso seria chutar.
  const creditoDoSemaforo = lendo || falhou || (gastou && credito === 0) ? 'desconhecido' : credito;

  // Dois toques seguidos abririam dois checkouts, e isso é dinheiro. O botão fica desabilitado
  // enquanto o pagamento abre, como `carregandoIA` faz com o botão da leitura.
  const comprar = async () => {
    if (comprando) return;
    setComprando(true);
    Hapticos.impactoLeve();
    try {
      await Linking.openURL(await comprarAvulso('vocacao', moedaPadrao()));
    } catch (e) {
      mostrarAlerta('Não foi possível abrir o pagamento',
        e instanceof Error ? e.message : 'Tente de novo em instantes.');
    } finally {
      setComprando(false);
    }
  };

  // A segunda saída, para quem não quer assinar. A assinatura segue sendo a oferta principal:
  // este botão é texto puro, sem borda, e o texto diz o que se leva, não só que se paga.
  const ofertaAvulso = (
    <>
      <Pressable
        onPress={comprar}
        disabled={comprando}
        accessibilityRole="button"
        accessibilityLabel="Comprar só esta leitura"
        style={[estilos.botaoAvulso, comprando && { opacity: 0.6 }]}
      >
        <Text style={estilos.botaoAvulsoTexto}>
          {comprando ? 'Abrindo o pagamento…' : 'Comprar só esta leitura'}
        </Text>
      </Pressable>
      <Text style={estilos.emConstrucaoTexto}>
        O direito de gerar vale 90 dias. A leitura, depois de gerada, fica no seu histórico enquanto sua conta existir.
      </Text>
    </>
  );

  // O app define a sessão e só depois busca o perfil. Nesse intervalo `perfil` é
  // nulo, e dizer "faltam seus dados de nascimento" a quem tem os dados guardados
  // seria uma frase falsa, com um botão que o manda refazer o que já fez.
  const carregandoPerfil = carregando && !perfil;

  // Só com perfil presente a pergunta "tem data e cidade?" faz sentido. Sem perfil a
  // tela não sabe a causa (sem login, ou a busca falhou), e é um estado à parte.
  const dadosCompletos = !!perfil?.nascimento_cidade && !!perfil?.data_nascimento;

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
          ) : !perfil ? (
            // Sem perfil: sem login, ou a busca do perfil falhou. A tela não sabe qual dos
            // dois e não afirma nenhum. O caminho é entrar: mandar quem não entrou gerar o
            // mapa é um beco sem saída, porque `mapa-astral/index.tsx` só grava no perfil
            // `if (perfil)` e a pessoa voltaria a esta mesma frase.
            <EstadoTela
              tipo="vazio"
              titulo="Não consegui abrir o seu perfil"
              descricao="A vocação sai do mapa natal guardado no seu perfil. Entre na sua conta para abri-lo; se você já entrou, volte daqui a pouco."
              acaoLabel="Entrar na minha conta"
              onAcao={() => { Hapticos.impactoLeve(); router.push('/auth/login'); }}
            />
          ) : !dadosCompletos ? (
            // 1. Perfil presente sem data ou cidade: explica e manda para onde o formulário
            // já existe e já grava.
            <EstadoTela
              tipo="vazio"
              titulo="Falta o seu mapa natal"
              descricao="A vocação sai do mapa natal, e no seu perfil falta a data ou a cidade de nascimento. Informe-as uma vez e esta tela passa a usar os mesmos dados."
              acaoLabel="Gerar meu Mapa Astral"
              onAcao={() => { Hapticos.impactoLeve(); router.push('/mapa-astral'); }}
            />
          ) : !mapa || !vocacao ? (
            // Data e cidade guardadas, mas o cálculo lançou (cidade sem fuso, por exemplo).
            // Dizer que os dados faltam seria falso: eles estão lá, e não servem.
            <EstadoTela
              tipo="vazio"
              titulo="Não deu para calcular o seu mapa"
              descricao="Os dados de nascimento guardados no seu perfil não deram um mapa. Confira a data, a hora e a cidade: o formulário do Mapa Astral já vem preenchido com o que você guardou, e a correção fica salva."
              acaoLabel="Revisar no Mapa Astral"
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

                {/* A casa 10 DESTA pessoa, e não só a definição dela: a parte grátis promete
                    "o meio do céu e a casa 10", e o card na home repete a promessa. Antes
                    disto, o que aparecia de graça era a frase genérica abaixo, igual para
                    todo mundo. Sem hora não há cúspide e a peça não existe — por isso filtrar,
                    e não indexar. */}
                {vocacao.trabalho.pecas
                  .filter((peca) => peca.rotulo.startsWith('Casa 10'))
                  .map((peca) => (
                    <Text key={peca.rotulo} style={estilos.porque}>
                      {`${peca.rotulo}: ${peca.valor}`}
                    </Text>
                  ))}

                {/* A frase da VOCAÇÃO, e não a da área Trabalho: a da área nomeia só
                    Saturno e Marte, e desde que Mercúrio, Vênus e a casa 2 entraram ela
                    passou a prometer menos do que a leitura entrega. */}
                <Text style={estilos.porque}>{vocacao.porque}</Text>
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

                {/* Os aspectos da Lua agora SAEM da leitura sem hora (`aspectosSemALua`), em
                    vez de irem com ressalva. Sumir calado é pior que entregar menos: a linha
                    abaixo diz o que ficou de fora e por quê. Vale por `semHora`, e não por
                    `luaIncerta` — aquele só marca risco de troca de signo, e é falso na
                    maioria dos mapas cujos aspectos lunares são igualmente incertos. */}
                {mapa.semHora && (
                  <View style={[estilos.equilibrioCaixa, { marginBottom: Espacamento.sm }]}>
                    <Text style={estilos.equilibrioTexto}>
                      Os aspectos da Lua ficaram de fora desta leitura. Sem a hora de
                      nascimento ela pode estar a até 7 graus do lugar certo, e isso passa do
                      limite em que um aspecto ainda vale. Com a hora, ela volta.
                    </Text>
                  </View>
                )}

                {/* 4. A leitura: com plano ou com crédito avulso, o botão; sem nenhum dos
                    dois, a chamada para os planos e a compra avulsa. */}
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
                ) : leituraAberta ? (
                  <>
                    <SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" creditoAvulso={creditoDoSemaforo} />
                    <Text style={estilos.secaoSubtitulo}>
                      Acima está o que o seu mapa mostra. Aqui está a leitura: o que isso diz sobre
                      onde você tende a render, o que te sustenta, o que desgasta e um passo concreto.
                    </Text>
                    {erroIA && <Text style={estilos.avisoHonesto}>{erroIA}</Text>}
                    {/* O botão abaixo gasta o crédito, e quem o toca tem de saber disso
                        antes. Só quando o servidor vai cobrar do crédito: com cota válida no
                        plano ele gasta a cota primeiro, e a frase seria falsa. Quem decide é
                        `planoNaoCobre`, a mesma condição da oferta — com `podeFazerConsulta`
                        sozinho a frase calava para quem nunca assinou, que é justamente quem
                        vai ter o crédito gasto. */}
                    {credito > 0 && planoNaoCobre ? (
                      <Text style={estilos.avisoHonesto}>
                        Ler agora usa uma das suas leituras avulsas.
                      </Text>
                    ) : null}
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
                    {/* Quem já gastou um crédito reabre a leitura que pagou, e continua
                        podendo comprar outra: os dados de nascimento podem ser outros. */}
                    {ofertarAvulso ? ofertaAvulso : null}
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
                    {ofertarAvulso ? ofertaAvulso : null}
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
  // Texto puro, sem borda e sem fundo, de propósito: "Ver os planos" e "Ler minha vocação"
  // já são botões de borda, e a assinatura é a oferta principal. Um botão igual aos dois
  // pediria a mesma atenção; este é a saída de quem não quer assinar, e se lê depois.
  botaoAvulso: {
    marginTop: Espacamento.sm, alignSelf: 'center',
    paddingVertical: 10, paddingHorizontal: Espacamento.lg,
  },
  botaoAvulsoTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.textoSecundario },
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
