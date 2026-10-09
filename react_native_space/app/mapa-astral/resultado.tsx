import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { voltarOuIr } from '../../utils/navegacao';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { BotaoOuvir } from '../../components/BotaoOuvir';
import { EstadoTela } from '../../components/EstadoTela';
import { NotaReflexiva } from '../../components/NotaReflexiva';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { dataConsultaValida, horarioConsultaValido, textoConsultaValido } from '../../utils/validacaoConsulta';
import { Hapticos } from '../../utils/haptics';
import { CASAS, PLANETAS, lerSigno, corElemento, type LeituraSignoSolar } from '../../data/astrologia';
import { areasDaVida } from '../../data/areas';
import { ROTULO_ASPECTO, SIMBOLO_ASPECTO, aspectosSemALua } from '../../data/aspectos';
import { assinaturaDoMapa } from '../../data/assinatura';
import { corpoPorNome, signoDoGrau } from '../../data/efemerides';
import {
  escreverGrau, montarMapaAstral, ordemDeLeitura, visivelNoGratuito, type MapaAstral,
} from '../../data/mapaAstral';
import {
  TEXTO_ABERTURA, TEXTO_ASCENDENTE, TEXTO_CORPO, TEXTO_ELEMENTO,
  TEXTO_ELEMENTO_AUSENTE, TEXTO_QUALIDADE, TEXTO_RETROGRADO,
  TEXTO_SISTEMA_DE_CASAS,
  TEXTO_NODOS, TEXTO_NODO_NORTE, TEXTO_NODO_SUL,
} from '../../data/textos-mapa';
import { rotuloDoOffset } from '../../utils/fuso';
import { cidadePorId, type Cidade } from '../../data/cidades';
import { usePlano } from '../../hooks/usePlano';
import { useCreditoAvulso } from '../../hooks/useCreditoAvulso';
import { compartilharMapaAstral } from '../../services/compartilhar';
import { imprimirPagina, podeImprimir } from '../../utils/impressao';
import { mostrarAlerta } from '../../utils/alerta';
import { GLIFO_CORPO, RodaZodiacal, idxSigno } from '../../components/RodaMapa';
import { gerarInterpretacaoMapa, type InterpretacaoMapa } from '../../services/ia';
import { comprarAvulso } from '../../services/avulso';
import { SemaforoUso } from '../../components/SemaforoUso';

const { width: W } = Dimensions.get('window');

/**
 * "Regida por Marte, que está na casa 7."
 *
 * O regente da cúspide é quem responde por aquela área do mapa. Saber ONDE ele
 * está é o que dá conteúdo a uma casa vazia — e casa vazia é a maioria delas
 * num mapa de dez corpos e doze casas.
 *
 * O dicionário de signos guarda o regente pelo nome com acento ("Mercúrio"),
 * e as posições, pelo identificador sem acento ("mercurio"). A normalização
 * abaixo é a ponte entre os dois.
 */
function textoDoRegente(
  cuspide: number,
  casaDoCorpo: Record<string, number> | null,
): string {
  const regente = signoDoGrau(cuspide).regente;
  // A ponte do nome com acento para o identificador sem acento mora em
  // `data/efemerides.ts`, com teste: duas cópias de normalização divergem, e a
  // que erra faz o regente desaparecer sem avisar.
  const id = corpoPorNome(regente);
  const onde = id ? casaDoCorpo?.[id] : undefined;
  return onde ? `Regida por ${regente}, que está na casa ${onde}` : `Regida por ${regente}`;
}

/** Quanto um aspecto se faz ouvir, em palavra em vez de número. */
function forcaEmPalavra(forca: number): string {
  if (forca >= 0.8) return 'muito forte';
  if (forca >= 0.55) return 'forte';
  if (forca >= 0.3) return 'moderado';
  return 'sutil';
}

/**
 * A cor da natureza do aspecto.
 *
 * Tenso não ganha vermelho de propósito: a tela inteira diz que tensão não é
 * defeito, e pintar de cor de alerta contaria o contrário do texto.
 */
function corDoAspecto(natureza: 'harmonico' | 'tenso' | 'neutro'): string {
  if (natureza === 'harmonico') return Cores.primaria;
  if (natureza === 'tenso') return Cores.secundaria;
  return Cores.acento;
}

/**
 * O nome de um ponto do mapa, corpo ou ângulo.
 *
 * Aspecto liga os dez corpos e também o ascendente e o meio do céu, e esses
 * dois não estão no dicionário de corpos — sem este desvio sairia "ascendente
 * em quadratura com saturno", em minúscula e fora do padrão do resto da tela.
 */
function nomeDoPonto(ponto: string): string {
  if (ponto === 'ascendente') return 'Ascendente';
  if (ponto === 'meioCeu') return 'Meio do Céu';
  return TEXTO_CORPO[ponto as keyof typeof TEXTO_CORPO]?.titulo ?? ponto;
}

// O campo de estrelas piscando saiu junto com o fundo escuro: era branco sobre
// preto, e esta era a única tela do app em tema inverso. O conselho de 21/09
// também pediu "sem brilho sobre texto".

export default function TelaMapaAstralResultado() {
  const params = useLocalSearchParams<{
    dia: string; mes: string; ano: string;
    hora: string; minuto: string; semHora: string;
    cidade: string; cidadeId: string; cidadeUf: string; cidadePais: string;
    lat: string; lon: string; fuso: string; offsetPadrao: string;
  }>();
  const { temAcesso, podeFazerConsulta } = usePlano();
  const { credito } = useCreditoAvulso('mapa');
  // Quem decide oferecer é `podeFazerConsulta`, que o app já usa, e não uma
  // conta nova nesta tela: seriam duas verdades sobre acesso, e a que liberasse
  // indevido seria a que ninguém notaria. É o mesmo argumento do comentário de
  // `components/SemaforoUso.tsx:41-42`. Ela já cobre super-admin, plano
  // ilimitado, cota em zero e quem cancelou (o webhook zera a cota no mesmo
  // update). Sem crédito na mão e sem consulta para gastar é exatamente quando
  // a compra avulsa é a resposta.
  const ofertarAvulso = credito === 0 && !podeFazerConsulta();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [interpretacao, setInterpretacao] = useState<InterpretacaoMapa | null>(null);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [erroIA, setErroIA] = useState<string | null>(null);

  // O mapa de verdade: posições do céu naquele instante, naquele lugar. Até
  // 26/09 esta tela mostrava só o signo solar, porque o resto era inventado
  // por aritmética e tinha sido tirado da tela em 23/09.
  const mapa: MapaAstral | null = useMemo(() => {
    if (!params.cidadeId) return null;
    const semHora = params.semHora === '1';

    // A cidade chega pronta pela rota, com coordenada e fuso. Link antigo, de
    // antes da base no banco, ainda traz só o identificador — aí a lista local
    // das capitais resolve.
    const lat = Number(params.lat);
    const lon = Number(params.lon);
    const cidade: Cidade | null = params.fuso && Number.isFinite(lat) && Number.isFinite(lon)
      ? {
        id: params.cidadeId,
        nome: (params.cidade ?? '').split(',')[0].trim(),
        uf: params.cidadeUf || undefined,
        pais: params.cidadePais || 'Brasil',
        lat,
        lon,
        fuso: params.fuso,
        offsetPadrao: Number(params.offsetPadrao) || 0,
      }
      : cidadePorId(params.cidadeId);
    if (!cidade) return null;

    try {
      return montarMapaAstral({
        ano: parseInt(params.ano ?? '0', 10),
        mes: parseInt(params.mes ?? '0', 10),
        dia: parseInt(params.dia ?? '0', 10),
        hora: semHora ? null : parseInt(params.hora ?? '0', 10),
        minuto: semHora ? null : parseInt(params.minuto ?? '0', 10),
        cidade,
      });
    } catch {
      return null;
    }
  }, [
    params.ano, params.mes, params.dia, params.hora, params.minuto, params.semHora,
    params.cidadeId, params.cidade, params.cidadeUf, params.cidadePais,
    params.lat, params.lon, params.fuso, params.offsetPadrao,
  ]);

  // O signo solar vem da longitude do Sol, não da faixa de datas: quem nasce na
  // virada recebia o signo do vizinho.
  const leitura: LeituraSignoSolar | null = useMemo(() => {
    const sol = mapa?.posicoes.find((p) => p.corpo === 'sol');
    return sol ? lerSigno(sol.signo) : null;
  }, [mapa]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Sem cidade da lista não existe mapa: foi o que mudou quando a cidade deixou
  // de ser texto livre. Link antigo cai aqui e pede para refazer.
  const parametrosValidos = dataConsultaValida(params.dia, params.mes, params.ano)
    && horarioConsultaValido(params.hora, params.minuto)
    && textoConsultaValido(params.cidade)
    && mapa !== null
    && leitura !== null;

  if (!parametrosValidos) {
    return (
      <GradientBackground>
        <SafeAreaView style={estilos.safeArea}>
          <EstadoTela
            tipo="erro"
            titulo="Faltam dados para o mapa astral"
            descricao="Refaça o pedido escolhendo a cidade de nascimento na lista: sem a coordenada e o fuso dela não dá para calcular o seu ascendente."
            acaoLabel="Revisar dados"
            onAcao={() => voltarOuIr()}
          />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const { signo } = leitura;
  const solIdx = idxSigno(signo.id);
  const posicoes = ordemDeLeitura(mapa.posicoes);

  // Sem hora de nascimento, os aspectos da Lua saem de tudo que esta tela mostra ou
  // manda: ela anda ~13° por dia, e meio dia de incerteza passa do orbe. Aspecto entre
  // planetas sobrevive a um mapa sem hora; a Lua é a exceção, e a doutrina a trata como
  // ponto cego. Ver `aspectosSemALua`.
  const aspectosConfiaveis = aspectosSemALua(mapa.aspectos, mapa.semHora);

  // As quatro áreas com as peças de mapa de cada uma. As mesmas peças vão para
  // quem escreve o texto e para a tela: a leitura fica conferível, em vez de sair
  // de um lugar que a pessoa não pode ver.
  const areas = areasDaVida({
    posicoes: mapa.posicoes,
    cuspides: mapa.casas?.cuspides ?? null,
    casaDoCorpo: mapa.casaDoCorpo,
    aspectos: mapa.aspectos,
    semHora: mapa.semHora,
    nomeDoPonto,
  });

  const aprofundar = async () => {
    if (carregandoIA || interpretacao || !mapa) return;
    setCarregandoIA(true);
    setErroIA(null);
    Hapticos.impactoMedio();
    try {
      // Sobem só as posições calculadas. Data, hora e cidade de nascimento
      // ficam no aparelho: as efemérides já rodaram aqui.
      setInterpretacao(await gerarInterpretacaoMapa({
        sol: { signo: posicoes[0].signo.nome, grau: posicoes[0].grau },
        lua: { signo: posicoes[1].signo.nome, grau: posicoes[1].grau },
        ascendente: mapa.signoAscendente
          ? { signo: mapa.signoAscendente.nome, grau: mapa.grauAscendente ?? 0 }
          : undefined,
        planetas: posicoes.filter((p) => !visivelNoGratuito(p.corpo)).map((p) => ({
          nome: TEXTO_CORPO[p.corpo].titulo,
          signo: p.signo.nome,
          retrogrado: p.retrogrado,
          // Grau e casa vão junto desde 28/09. Sem eles a IA escrevia o que
          // dava para escrever com signo apenas — e isso serve para qualquer
          // pessoa com o mesmo signo.
          grau: Math.floor(p.grau),
          casa: mapa.casaDoCorpo?.[p.corpo],
        })),
        casas: mapa.casas
          ? CASAS.map((casa) => ({
            numero: casa.numero,
            signo: signoDoGrau(mapa.casas!.cuspides[casa.numero - 1]).nome,
            area: casa.descricao,
            corpos: posicoes
              .filter((p) => mapa.casaDoCorpo?.[p.corpo] === casa.numero)
              .map((p) => TEXTO_CORPO[p.corpo].titulo),
          }))
          : undefined,
        // Só os mais exatos: um mapa produz dezenas de aspectos, e mandar todos
        // afoga o que importa no meio do que mal encosta.
        aspectos: aspectosConfiaveis.slice(0, 8).map((a) => ({
          texto: `${nomeDoPonto(a.a)} em ${ROTULO_ASPECTO[a.tipo]} com ${nomeDoPonto(a.b)}`,
          natureza: a.natureza,
        })),
        // Cada área com as casas, o regente e os planetas que respondem por ela.
        // Sem isto o texto de amor saía do mesmo lugar que o de dinheiro.
        areas: areas.map((a) => ({
          id: a.id,
          titulo: a.titulo,
          comCasas: a.comCasas,
          pecas: a.pecas.map((p) => `${p.rotulo}: ${p.valor}`),
        })),
        elementoDominante: mapa.sintese.elementoDominante,
        qualidadeDominante: mapa.sintese.qualidadeDominante,
        elementoAusente: mapa.sintese.elementoAusente ?? undefined,
        regente: mapa.sintese.regenteDoMapa?.planeta,
      }));
    } catch (e) {
      setErroIA(e instanceof Error ? e.message : 'Não foi possível ler agora. Tente de novo.');
    } finally {
      setCarregandoIA(false);
    }
  };
  const sol = posicoes[0];
  const lua = posicoes[1];
  const temMapaCompleto = temAcesso('mapa_completo');

  // Seis aspectos bastam: um mapa produz dezenas, e uma lista longa vira o
  // mesmo catálogo que a gente está tentando deixar de ser.
  const aspectosVisiveis = temMapaCompleto ? aspectosConfiaveis.slice(0, 6) : [];

  // A assinatura lê o mapa inteiro. Sem hora de nascimento ela nasce mais
  // curta — sem casa e sem regente — e isso é honesto: são fatores que
  // dependem de um horizonte que não existe.
  const assinatura = assinaturaDoMapa({
    posicoes: mapa.posicoes,
    aspectos: aspectosConfiaveis,
    casaDoCorpo: mapa.casaDoCorpo,
    elementoDominante: mapa.sintese.elementoDominante,
    elementoAusente: mapa.sintese.elementoAusente,
    qualidadeDominante: mapa.sintese.qualidadeDominante,
    regenteDoMapa: mapa.sintese.regenteDoMapa,
    nomeDoPonto,
  });

  // Os marcadores da roda, no grau real — não mais no meio da fatia do signo.
  // No plano pago entram os dez corpos; no gratuito, os dois luminares. O que a
  // roda mostra é o que a lista mostra, para a tela não se contradizer.
  const marcadores = [
    ...posicoes
      .filter((p) => temMapaCompleto || visivelNoGratuito(p.corpo))
      .map((p) => ({
        longitude: p.longitude,
        label: GLIFO_CORPO[p.corpo].simbolo,
        cor: GLIFO_CORPO[p.corpo].cor,
      })),
    ...(mapa.angulos ? [{ longitude: mapa.angulos.ascendente, label: 'Asc', cor: '#D4AF37' }] : []),
  ];

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
              <Text style={estilos.headerTitulo}>Seu Mapa Astral</Text>
              <Text style={estilos.headerSubtitulo}>
                {params.dia}/{params.mes}/{params.ano}
              </Text>
            </View>
            <View style={estilos.voltarBotaoEspaco} />
          </Animated.View>

          {/* Roda zodiacal */}
          <Animated.View style={[estilos.rodaContainer, { opacity: fadeAnim }]}>
            <View style={estilos.rodaWrapper}>
              <RodaZodiacal
                solIdx={solIdx}
                marcadores={marcadores}
                ascendente={mapa.angulos?.ascendente ?? null}
                cuspides={temMapaCompleto ? mapa.casas?.cuspides ?? null : null}
              />
            </View>
            <View style={estilos.rodaLegenda}>
              {[
                { label: `☀ Sol em ${signo.nome}`, cor: '#F1C40F' },
                { label: `☾ Lua em ${lua.signo.nome}`, cor: Cores.secundaria },
                ...(mapa.signoAscendente
                  ? [{ label: `Asc em ${mapa.signoAscendente.nome}`, cor: '#D4AF37' }]
                  : []),
              ].map((item) => (
                <View key={item.label} style={estilos.rodaLegendaItem}>
                  <View style={[estilos.rodaLegendaPonto, { backgroundColor: item.cor }]} />
                  <Text style={[estilos.rodaLegendaTexto, { color: item.cor }]}>{item.label}</Text>
                </View>
              ))}
            </View>
            <Text style={estilos.rodaNota}>
              {mapa.angulos
                ? 'O ascendente fica na esquerda e as casas correm daí no sentido anti-horário, como astrólogo desenha mapa.'
                : 'Sem a hora de nascimento a roda não pode girar para o seu ascendente, então começa em Áries, na esquerda.'}
              {temMapaCompleto && mapa.casas
                ? ' Os traços grossos são os quatro eixos: ascendente, fundo do céu, descendente e meio do céu.'
                : ''}
            </Text>
          </Animated.View>

          <View style={estilos.acoesLinha}>
            <Pressable
              onPress={() => {
                Hapticos.impactoLeve();
                compartilharMapaAstral({
                  posicoes: [
                    `☀ Sol em ${signo.nome}, ${escreverGrau(sol.longitude)}`,
                    `☾ Lua em ${lua.signo.nome}, ${escreverGrau(lua.longitude)}`,
                    ...(mapa.signoAscendente && mapa.angulos
                      ? [`↑ Ascendente em ${mapa.signoAscendente.nome}, ${escreverGrau(mapa.angulos.ascendente)}`]
                      : ['↑ Sem hora de nascimento, este mapa não tem ascendente']),
                    ...(temMapaCompleto
                      ? posicoes.filter((p) => !visivelNoGratuito(p.corpo)).map(
                        (p) => `• ${TEXTO_CORPO[p.corpo].titulo} em ${p.signo.nome}, ${escreverGrau(p.longitude)}${p.retrogrado ? ' ℞' : ''}`,
                      )
                      : []),
                  ],
                  equilibrio: `Predomina ${mapa.sintese.elementoDominante}, na modalidade ${mapa.sintese.qualidadeDominante}.`,
                  leitura: interpretacao ?? undefined,
                });
              }}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar o meu mapa"
              style={estilos.acaoBotao}
            >
              <Ionicons name="share-social-outline" size={18} color={Cores.acento} />
              <Text style={estilos.acaoTexto}>Compartilhar</Text>
            </Pressable>

            {podeImprimir() && (
              <Pressable
                onPress={() => { Hapticos.impactoLeve(); imprimirPagina(); }}
                accessibilityRole="button"
                accessibilityLabel="Salvar o mapa em PDF"
                style={estilos.acaoBotao}
              >
                <Ionicons name="document-text-outline" size={18} color={Cores.acento} />
                <Text style={estilos.acaoTexto}>Salvar em PDF</Text>
              </Pressable>
            )}
          </View>

          {/* A voz lê o que está escrito na tela, e não só os títulos: dizer
              "Sol em Câncer" e parar não é ler a leitura. */}
          <BotaoOuvir
            partes={[
              { texto: TEXTO_ABERTURA },
              {
                rotulo: 'Seu Sol',
                texto: `Em ${signo.nome}, a ${escreverGrau(sol.longitude)}. ${leitura.texto}`,
              },
              {
                rotulo: 'Sua Lua',
                texto: `Em ${lua.signo.nome}, a ${escreverGrau(lua.longitude)}. ${TEXTO_CORPO.lua.papel} ${lua.signo.descricao}`,
              },
              mapa.signoAscendente && mapa.angulos
                ? {
                  rotulo: 'Seu Ascendente',
                  texto: `Em ${mapa.signoAscendente.nome}, a ${escreverGrau(mapa.angulos.ascendente)}. ${TEXTO_ASCENDENTE.papel} ${mapa.signoAscendente.descricao}`,
                }
                : {
                  rotulo: 'Seu Ascendente',
                  texto: `Sem a hora de nascimento, este mapa não tem ascendente. ${TEXTO_ASCENDENTE.papel}`,
                },
              ...(temMapaCompleto
                ? posicoes.filter((p) => !visivelNoGratuito(p.corpo)).map((p) => ({
                  rotulo: TEXTO_CORPO[p.corpo].titulo,
                  texto: `Em ${p.signo.nome}, a ${escreverGrau(p.longitude)}${p.retrogrado ? ', retrógrado' : ''}. ${TEXTO_CORPO[p.corpo].papel}`,
                }))
                : []),
              {
                rotulo: 'O seu equilíbrio',
                texto: `Predomina ${mapa.sintese.elementoDominante}. ${TEXTO_ELEMENTO[mapa.sintese.elementoDominante] ?? ''} A modalidade dominante é ${mapa.sintese.qualidadeDominante}. ${TEXTO_QUALIDADE[mapa.sintese.qualidadeDominante] ?? ''}`,
              },
              ...(mapa.sintese.elementoAusente
                ? [{ texto: `Sem nenhum planeta em ${mapa.sintese.elementoAusente}. ${TEXTO_ELEMENTO_AUSENTE}` }]
                : []),
              ...(interpretacao
                ? [
                  { rotulo: interpretacao.titulo, texto: interpretacao.narrativa },
                  { rotulo: 'O que essa combinação faz bem', texto: interpretacao.forca },
                  { rotulo: 'Onde ela puxa para dois lados', texto: interpretacao.tensao },
                  { rotulo: 'Uma prática', texto: interpretacao.conselho },
                ]
                : []),
            ]}
          />

          {/* O que o mapa é, antes de qualquer interpretação */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.aberturaTexto}>{TEXTO_ABERTURA}</Text>
          </Animated.View>

          {/* Sol, Lua e ascendente: o que o plano gratuito mostra (decisão M7) */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={estilos.secaoTitulo}>☀ Seu Sol</Text>
            <Text style={estilos.secaoSubtitulo}>{escreverGrau(sol.longitude)}</Text>

            <CardPrincipal
              titulo="Sol"
              icone="sunny"
              iconeLib="ionicons"
              signo={signo.nome}
              simbolo={signo.simbolo}
              grau={Math.floor(sol.grau)}
              casa={temMapaCompleto ? mapa.casaDoCorpo?.sol : undefined}
              elemento={signo.elemento}
              corElemento={corElemento(signo.elemento)}
              corSigno={signo.cor}
              // Sem o `TEXTO_CORPO.sol.papel` na frente: ele e a leitura do
              // signo diziam a MESMA frase — "a essência, aquilo que você veio
              // expressar e desenvolver ao longo da vida". O texto do signo já
              // traz a definição, e traz junto o que ela significa neste signo.
              interpretacao={leitura.texto}
              subtitulo="Sua essência e identidade"
            />
          </Animated.View>

          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>☾ Sua Lua</Text>
            <Text style={estilos.secaoSubtitulo}>{escreverGrau(lua.longitude)}</Text>

            <CardPrincipal
              titulo="Lua"
              icone="moon"
              iconeLib="ionicons"
              signo={lua.signo.nome}
              simbolo={lua.signo.simbolo}
              grau={Math.floor(lua.grau)}
              casa={temMapaCompleto ? mapa.casaDoCorpo?.lua : undefined}
              elemento={lua.signo.elemento}
              corElemento={corElemento(lua.signo.elemento)}
              corSigno={lua.signo.cor}
              interpretacao={`${TEXTO_CORPO.lua.papel} Em ${lua.signo.nome}: ${lua.signo.descricao}`}
              subtitulo="Seu mundo interno"
            />
            {mapa.luaIncerta && (
              <Text style={estilos.avisoHonesto}>
                Sem a hora de nascimento, a Lua pode ter mudado de signo nesse dia — ela anda 13
                graus por dia, e a sua está perto da virada. Com a hora, esta resposta fica firme.
              </Text>
            )}
          </Animated.View>

          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>↑ Seu Ascendente</Text>
            {mapa.signoAscendente && mapa.angulos ? (
              <>
                <Text style={estilos.secaoSubtitulo}>
                  {escreverGrau(mapa.angulos.ascendente)}
                </Text>
                <CardPrincipal
                  titulo="Ascendente"
                  icone="arrow-up-circle"
                  iconeLib="ionicons"
                  signo={mapa.signoAscendente.nome}
                  simbolo={mapa.signoAscendente.simbolo}
                  grau={Math.floor(mapa.grauAscendente ?? 0)}
                  casa={temMapaCompleto && mapa.casas ? 1 : undefined}
                  elemento={mapa.signoAscendente.elemento}
                  corElemento={corElemento(mapa.signoAscendente.elemento)}
                  corSigno={mapa.signoAscendente.cor}
                  interpretacao={`${TEXTO_ASCENDENTE.papel} Em ${mapa.signoAscendente.nome}: ${mapa.signoAscendente.descricao}`}
                  subtitulo="Como você chega"
                />
                <Text style={estilos.rodapeCalculo}>
                  {`Calculado para ${params.cidade} às ${params.hora}:${(params.minuto ?? '0').padStart(2, '0')} (${rotuloDoOffset(mapa.offsetMinutos)}).`}
                  {mapa.fusoAproximado
                    ? ' Este aparelho não soube confirmar o horário de verão da época, então o ascendente pode estar uma hora fora.'
                    : ''}
                </Text>
              </>
            ) : (
              <View style={estilos.emConstrucaoCard}>
                <Ionicons name="time-outline" size={22} color={Cores.acento} />
                <Text style={estilos.emConstrucaoTitulo}>Sem a hora, não há ascendente</Text>
                <Text style={estilos.emConstrucaoTexto}>
                  {TEXTO_ASCENDENTE.papel}
                </Text>
                <Text style={estilos.emConstrucaoTexto}>
                  Ele muda de signo a cada duas horas, mais ou menos. Chutar um seria inventar —
                  e o resto do seu mapa acima continua valendo. Se achar a hora na certidão, refaça
                  o pedido: leva um minuto.
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Síntese */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.12)', 'rgba(75, 0, 130, 0.12)'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={estilos.resumoCard}
            >
              <MaterialCommunityIcons name="auto-fix" size={24} color={Cores.acento} />
              {/* Era "Síntese do seu Sol", e explicava o signo solar — texto
                  igual para todo mundo nascido no mesmo mês. Agora são os
                  fatores que marcam ESTE mapa, do mais específico para o mais
                  geral. */}
              <Text style={estilos.resumoTitulo}>A sua assinatura</Text>
              {assinatura.map((fator) => (
                <View key={fator.rotulo} style={estilos.fatorLinha}>
                  <Text style={estilos.fatorRotulo}>{fator.rotulo}</Text>
                  <Text style={estilos.fatorValor}>{fator.valor}</Text>
                  <Text style={estilos.fatorPorque}>{fator.porque}</Text>
                </View>
              ))}
            </LinearGradient>
          </Animated.View>

          {/* A leitura da combinação, escrita na hora.

              Fica AQUI, logo depois da assinatura, e não no fim da página. Antes
              vinha depois das doze casas e das conexões, e o efeito era duplo: a
              síntese aparecia depois do catálogo — ao contrário de como se lê um
              mapa — e o botão do recurso pago ficava embaixo de sete seções, onde
              ninguém achava.

              A ordem agora é: Sol, Lua e Ascendente (o que todo mundo procura
              primeiro), a assinatura (o que marca este céu), esta leitura (o que
              isso forma junto) e só então o detalhe peça por peça, para quem quiser
              conferir. O que cada peça significa continua em texto revisável —
              abaixo, não acima. */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>O que isso forma junto</Text>
            {interpretacao ? (
              <View style={estilos.equilibrioCaixa}>
                <Text style={estilos.iaTituloResultado}>{interpretacao.titulo}</Text>
                <Text style={estilos.equilibrioTexto}>{interpretacao.narrativa}</Text>
                {[
                  { rotulo: 'O que essa combinação faz bem', texto: interpretacao.forca },
                  { rotulo: 'Onde ela puxa para dois lados', texto: interpretacao.tensao },
                  { rotulo: 'Uma prática', texto: interpretacao.conselho },
                ].filter((b) => b.texto).map((bloco) => (
                  <View key={bloco.rotulo}>
                    <Text style={estilos.iaRotulo}>{bloco.rotulo}</Text>
                    <Text style={estilos.equilibrioTexto}>{bloco.texto}</Text>
                  </View>
                ))}

                {/* As quatro áreas da vida, cada uma com as peças de mapa de onde
                    ela saiu. Entram na mesma resposta da IA, e não numa chamada
                    nova: mesma leitura, mais recortes. Leitura guardada de antes
                    do formato atual não tem estes campos, e o `null` abaixo faz
                    ela continuar abrindo sem eles. */}
                {areas.map((area) => {
                  const texto = interpretacao[area.id];
                  if (!texto) return null;
                  return (
                    <View key={area.id}>
                      <Text style={estilos.iaRotulo}>{area.titulo}</Text>
                      <Text style={estilos.equilibrioTexto}>{texto}</Text>
                      {temMapaCompleto && area.pecas.length > 0 ? (
                        <View style={estilos.areaPecas}>
                          <Text style={estilos.areaPecasTitulo}>
                            {area.comCasas ? 'Lido a partir de' : 'Lido a partir de, sem a hora'}
                          </Text>
                          {area.pecas.map((peca) => (
                            <Text key={peca.rotulo} style={estilos.areaPeca}>
                              <Text style={estilos.areaPecaRotulo}>{peca.rotulo}</Text>
                              {`: ${peca.valor}`}
                            </Text>
                          ))}
                          <Text style={estilos.areaPorque}>{area.porque}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                {interpretacao.caminho ? (
                  <Text style={estilos.notaRodape}>
                    Caminho é a direção que o seu mapa aponta, não uma previsão:
                    o mapa natal não diz quando nem garante desfecho.
                  </Text>
                ) : null}
              </View>
            ) : (
              <>
                <SemaforoUso tipo="interpretacao" rotulo="Aprofundamentos" />
                <Text style={estilos.secaoSubtitulo}>
                  Acima está o que cada peça do mapa significa. Isto aqui é a leitura da sua
                  combinação — o que Sol, Lua e Ascendente fazem juntos em você.
                </Text>
                {erroIA && <Text style={estilos.avisoHonesto}>{erroIA}</Text>}
                {credito > 0 ? (
                  <Text style={estilos.secaoSubtitulo}>
                    {credito === 1
                      ? 'Você tem uma leitura avulsa deste mapa para usar.'
                      : `Você tem ${credito} leituras avulsas deste mapa para usar.`}
                  </Text>
                ) : null}
                <Pressable
                  onPress={aprofundar}
                  disabled={carregandoIA}
                  accessibilityRole="button"
                  accessibilityLabel="Ler a combinação do meu mapa com IA"
                  style={[estilos.botaoPlanos, carregandoIA && { opacity: 0.6 }]}
                >
                  <Text style={estilos.botaoPlanosTexto}>
                    {carregandoIA ? 'Lendo o seu mapa…' : 'Ler a minha combinação ✨'}
                  </Text>
                </Pressable>
                {ofertarAvulso ? (
                  <>
                    {/* A segunda saída. A assinatura segue sendo a oferta principal:
                        este botão vem depois e é secundário na hierarquia. Fica AQUI,
                        e não nos dois cards de "Ver os planos" desta tela: aqueles
                        trancam os outros oito planetas e as doze casas, que o crédito
                        não libera. Ele paga esta leitura, e é ao lado dela que se
                        oferece. */}
                    <Pressable
                      onPress={async () => {
                        Hapticos.impactoLeve();
                        try {
                          await Linking.openURL(await comprarAvulso('mapa'));
                        } catch (e) {
                          mostrarAlerta('Não foi possível abrir o pagamento',
                            e instanceof Error ? e.message : 'Tente de novo em instantes.');
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Comprar só esta leitura"
                      style={estilos.botaoAvulso}
                    >
                      <Text style={estilos.botaoAvulsoTexto}>Comprar só esta leitura</Text>
                    </Pressable>
                    <Text style={estilos.notaRodape}>
                      O direito de gerar vale 90 dias. A leitura, depois de gerada, fica para sempre.
                    </Text>
                  </>
                ) : null}
              </>
            )}
          </Animated.View>

          {/* O resto do céu: planos pagos (decisão M7) */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>Os outros planetas</Text>
            {temMapaCompleto ? (
              <>
                <Text style={estilos.secaoSubtitulo}>
                  Oito posições, calculadas para o seu instante de nascimento
                </Text>
                {posicoes.filter((p) => !visivelNoGratuito(p.corpo)).map((p) => (
                  <View key={p.corpo} style={estilos.planetaLinha}>
                    <View style={estilos.planetaCabeca}>
                      <Text style={[estilos.planetaNome, { color: p.signo.cor }]}>
                        {TEXTO_CORPO[p.corpo].titulo}
                      </Text>
                      <Text style={estilos.planetaGrau}>
                        {escreverGrau(p.longitude)}{p.retrogrado ? ' ℞' : ''}
                      </Text>
                    </View>
                    <Text style={estilos.planetaPapel}>{TEXTO_CORPO[p.corpo].papel}</Text>
                  </View>
                ))}
                {posicoes.some((p) => p.retrogrado && !visivelNoGratuito(p.corpo)) && (
                  <Text style={estilos.notaRodape}>℞ {TEXTO_RETROGRADO}</Text>
                )}
              </>
            ) : (
              <View style={estilos.emConstrucaoCard}>
                <Ionicons name="planet-outline" size={22} color={Cores.acento} />
                <Text style={estilos.emConstrucaoTitulo}>
                  Mercúrio, Vênus, Marte e mais cinco
                </Text>
                <Text style={estilos.emConstrucaoTexto}>
                  Sol, Lua e ascendente são os três que mais fazem alguém reconhecer o próprio mapa,
                  e ficam abertos. As outras oito posições — como você pensa, o que te dá prazer,
                  como você age — entram a partir do plano Iniciante.
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

          {/* As doze casas: onde na vida cada coisa acontece (plano pago, M7) */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>As suas doze casas</Text>
            {!temMapaCompleto ? (
              <View style={estilos.emConstrucaoCard}>
                <Ionicons name="home-outline" size={22} color={Cores.acento} />
                <Text style={estilos.emConstrucaoTitulo}>Onde cada coisa acontece</Text>
                <Text style={estilos.emConstrucaoTexto}>
                  Os planetas dizem o quê; as casas dizem onde na sua vida. Elas dependem da hora e
                  do lugar exatos, e entram a partir do plano Iniciante.
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
            ) : mapa.casas ? (
              <>
                <Text style={estilos.secaoSubtitulo}>
                  Calculadas pelo sistema Placidus
                </Text>
                {/* Nomear o sistema a tela já fazia; o que faltava era a
                    consequência. Quem comparar com outro site vê casas
                    diferentes e conclui que um dos dois quebrou. */}
                <Text style={estilos.notaRodape}>{TEXTO_SISTEMA_DE_CASAS}</Text>
                <View style={estilos.casasGrid}>
                  {CASAS.map((casa) => {
                    const cuspide = mapa.casas!.cuspides[casa.numero - 1];
                    const dentro = posicoes.filter(
                      (p) => mapa.casaDoCorpo?.[p.corpo] === casa.numero,
                    );
                    return (
                      <View key={casa.numero} style={estilos.casaItem}>
                        <View style={estilos.casaNumero}>
                          <Text style={estilos.casaNumeroTexto}>{casa.numero}</Text>
                        </View>
                        <View style={estilos.casaInfo}>
                          <Text style={estilos.casaNome}>{casa.descricao}</Text>
                          <Text style={estilos.casaSigno}>
                            {`Começa em ${escreverGrau(cuspide)}`}
                          </Text>
                          {/* O regente da cúspide é quem "cuida" desta área no
                              seu mapa — e onde ELE está diz mais que a casa
                              vazia. É a peça que faltava para a casa deixar de
                              ser só um grau inicial. */}
                          <Text style={estilos.casaRegente}>
                            {textoDoRegente(cuspide, mapa.casaDoCorpo)}
                          </Text>
                          {dentro.length > 0 ? (
                            <Text style={estilos.casaCorpos}>
                              {dentro.map((p) => TEXTO_CORPO[p.corpo].titulo).join(', ')}
                            </Text>
                          ) : (
                            // Casa vazia não é casa sem assunto: quem responde
                            // por ela é o regente, que já está logo acima.
                            <Text style={estilos.casaVazia}>Sem planeta dentro</Text>
                          )}
                        </View>
                        <Text style={estilos.casaArea}>{casa.area}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={estilos.notaRodape}>
                  As casas saem com tamanhos diferentes, e isso é do sistema, não erro de conta:
                  Placidus divide o tempo que cada grau leva para subir no céu, não o círculo em
                  doze fatias iguais.
                </Text>
              </>
            ) : (
              <Text style={estilos.avisoHonesto}>
                {mapa.semHora
                  ? 'Sem a hora de nascimento não há horizonte, e sem horizonte não há casas. Com a hora, as doze aparecem aqui.'
                  : 'Neste lugar, acima do círculo polar, há graus do zodíaco que não nascem nem se põem no dia — e o cálculo das casas perde sentido. Preferimos não mostrar nada a mostrar número inventado.'}
              </Text>
            )}
          </Animated.View>

          {/* O eixo dos nodos.
              Vem depois das casas porque a leitura deles é "signo e casa", e fica
              no MESMO portão pago do resto do mapa profundo: pôr os nodos no
              gratuito moveria a linha comercial, e isso não é decisão de quem
              implementa. Eles não entram na seção de conexões logo abaixo — ficam
              fora dos aspectos de propósito (ver `nodosLunares`). */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>O eixo dos nodos</Text>
            {temMapaCompleto ? (
              <>
                <View style={estilos.nodoItem}>
                  <Text style={estilos.nodoNome}>Nodo norte, a Cabeça do Dragão</Text>
                  <Text style={estilos.casaSigno}>
                    {escreverGrau(mapa.nodos.norte)}
                    {mapa.casaDoNodo ? `, casa ${mapa.casaDoNodo.norte}` : ''}
                  </Text>
                  <Text style={estilos.nodoTexto}>{TEXTO_NODO_NORTE}</Text>
                </View>
                <View style={estilos.nodoItem}>
                  <Text style={estilos.nodoNome}>Nodo sul, a Cauda do Dragão</Text>
                  <Text style={estilos.casaSigno}>
                    {escreverGrau(mapa.nodos.sul)}
                    {mapa.casaDoNodo ? `, casa ${mapa.casaDoNodo.sul}` : ''}
                  </Text>
                  <Text style={estilos.nodoTexto}>{TEXTO_NODO_SUL}</Text>
                </View>
                <Text style={estilos.notaRodape}>{TEXTO_NODOS}</Text>
                {/* Os nodos existem sem a hora; a casa deles, não. Dizer isso
                    evita a pessoa achar que faltou dado por erro nosso. */}
                {!mapa.casaDoNodo && (
                  <Text style={estilos.notaRodape}>
                    O signo dos nodos não depende da hora de nascimento, e por isso aparece de
                    qualquer jeito. A casa depende, e volta junto com as doze.
                  </Text>
                )}
              </>
            ) : (
              <Text style={estilos.avisoHonesto}>
                Onde você já tem repertório e para onde cresce. O eixo dos nodos entra a partir
                do plano Iniciante.
              </Text>
            )}
          </Animated.View>

          {/* As conexões: o que os corpos fazem UNS COM OS OUTROS.
              Calculávamos os aspectos e só a IA os via. Aqui eles aparecem
              para quem lê, que é de onde vem a sensação de mapa e não de
              catálogo de significados soltos. */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>Conexões do seu mapa</Text>
            {aspectosVisiveis.length > 0 ? (
              <>
                <Text style={estilos.secaoSubtitulo}>
                  Os planetas não agem sozinhos. Estes são os encontros mais
                  exatos do seu céu.
                </Text>
                {aspectosVisiveis.map((a) => (
                  <View key={`${a.a}-${a.b}-${a.tipo}`} style={estilos.aspectoLinha}>
                    <Text style={[estilos.aspectoSimbolo, { color: corDoAspecto(a.natureza) }]}>
                      {SIMBOLO_ASPECTO[a.tipo]}
                    </Text>
                    <View style={estilos.aspectoTextos}>
                      <Text style={estilos.aspectoNomes}>
                        {`${nomeDoPonto(a.a)} ${ROTULO_ASPECTO[a.tipo]} ${nomeDoPonto(a.b)}`}
                      </Text>
                      <Text style={estilos.aspectoOrbe}>
                        {`${a.orbe.toFixed(1)}° do exato · ${forcaEmPalavra(a.forca)}`}
                      </Text>
                    </View>
                  </View>
                ))}
                <Text style={estilos.notaRodape}>
                  Tenso não é defeito e harmônico não é sorte: são jeitos
                  diferentes de duas partes suas se falarem. Quanto mais perto do
                  exato, mais a conversa se faz ouvir.
                </Text>
              </>
            ) : (
              <Text style={estilos.avisoHonesto}>
                {mapa.semHora
                  ? 'Sem a hora de nascimento, os aspectos com o ascendente e o meio do céu não podem ser calculados — e os outros ficaram fora do alcance neste céu.'
                  : 'Neste mapa os corpos estão espalhados, e nenhum par caiu perto o bastante para formar aspecto. Acontece, e é uma informação: nada aqui puxa nada com força.'}
              </Text>
            )}
          </Animated.View>


          {/* Equilíbrio de elementos e qualidades: a leitura do mapa como um todo */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <Text style={estilos.secaoTitulo}>O seu equilíbrio</Text>
            <View style={estilos.equilibrioCaixa}>
              <Text style={estilos.equilibrioLinha}>
                {Object.entries(mapa.sintese.elementos)
                  .map(([nome, quantos]) => `${nome} ${quantos}`)
                  .join('   ·   ')}
              </Text>
              <Text style={estilos.equilibrioTexto}>
                {`Predomina ${mapa.sintese.elementoDominante}. ${TEXTO_ELEMENTO[mapa.sintese.elementoDominante] ?? ''}`}
              </Text>
              {mapa.sintese.elementoAusente && (
                <Text style={estilos.equilibrioTexto}>
                  {`Sem nenhum planeta em ${mapa.sintese.elementoAusente}. ${TEXTO_ELEMENTO_AUSENTE}`}
                </Text>
              )}
              <Text style={estilos.equilibrioTexto}>
                {`Modalidade dominante: ${mapa.sintese.qualidadeDominante}. ${TEXTO_QUALIDADE[mapa.sintese.qualidadeDominante] ?? ''}`}
              </Text>
              {mapa.sintese.regenteDoMapa && (
                <Text style={estilos.equilibrioTexto}>
                  {`Regente do mapa: ${mapa.sintese.regenteDoMapa.planeta}, que rege o seu ascendente em ${mapa.sintese.regenteDoMapa.signo}.`}
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Barra de formato (como nas outras consultas) */}
          <Animated.View style={[estilos.secao, { opacity: fadeAnim }]}>
            <View style={estilos.formatosBarra}>
              <View style={[estilos.formatoItem, estilos.formatoAtivo]}>
                <Ionicons name="document-text" size={18} color={Cores.acento} />
                <Text style={[estilos.formatoTexto, estilos.formatoTextoAtivo]}>Texto</Text>
              </View>
              {['headset', 'videocam', 'download'].map((icon, i) => (
                <View key={icon} style={estilos.formatoItem}>
                  <Ionicons name={icon as any} size={18} color={Cores.textoSecundario} />
                  <Text style={estilos.formatoTexto}>
                    {i === 0 ? 'Áudio' : i === 1 ? 'Vídeo' : 'PDF'}
                  </Text>
                  <View style={estilos.breveBadge}>
                    <Text style={estilos.breveTexto}>Em breve</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          <View style={{ paddingHorizontal: Espacamento.lg }}>
            <NotaReflexiva />
          </View>

          {/* Botões finais */}
          <Animated.View style={[estilos.botoesFinais, { opacity: fadeAnim }]}>
            <Pressable
              onPress={() => { Hapticos.impactoLeve(); router.replace('/(tabs)'); }}
              style={({ pressed }) => [estilos.botaoVoltar, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <Ionicons name="home-outline" size={18} color={Cores.textoClaro} />
              <Text style={estilos.botaoVoltarTexto}>Voltar ao Início</Text>
            </Pressable>

            <Pressable
              onPress={() => { Hapticos.impactoLeve(); router.replace('/mapa-astral'); }}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <LinearGradient
                colors={Cores.gradienteAcento}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={estilos.botaoNovo}
              >
                <MaterialCommunityIcons name="creation" size={18} color="#fff" />
                <Text style={estilos.botaoNovoTexto}>Novo Mapa</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

/* ---- Card Principal (Sol/Lua/Ascendente) ---- */
interface CardPrincipalProps {
  titulo: string;
  icone: string;
  iconeLib: 'ionicons' | 'material';
  signo: string;
  simbolo: string;
  /** Só com cálculo astronômico; sem ele, o card não mostra grau nem casa. */
  grau?: number;
  casa?: number;
  elemento: string;
  corElemento: string;
  corSigno: string;
  interpretacao: string;
  subtitulo: string;
}

function CardPrincipal(props: CardPrincipalProps) {
  const Icone = props.iconeLib === 'material' ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={estilos.cardPrincipal}>
      <LinearGradient
        colors={[props.corSigno + '15', Cores.cardFundo] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={estilos.cardPrincipalGradiente}
      >
        <View style={estilos.cardPrincipalTop}>
          <View style={[estilos.cardPrincipalIcone, { backgroundColor: props.corSigno + '20' }]}>
            <Icone name={props.icone as any} size={22} color={props.corSigno} />
          </View>
          <View style={estilos.cardPrincipalTituloBox}>
            <Text style={estilos.cardPrincipalTitulo}>{props.titulo}</Text>
            <Text style={estilos.cardPrincipalSub}>{props.subtitulo}</Text>
          </View>
          <Text style={estilos.cardPrincipalSimbolo}>{props.simbolo}</Text>
        </View>

        <View style={estilos.cardPrincipalSignoRow}>
          <Text style={[estilos.cardPrincipalSignoNome, { color: props.corSigno }]}>{props.signo}</Text>
          <View style={estilos.badgesRow}>
            <View style={[estilos.elementoBadge, { backgroundColor: props.corElemento + '20' }]}>
              <Text style={[estilos.elementoBadgeTexto, { color: props.corElemento }]}>{props.elemento}</Text>
            </View>
            {props.grau != null && <Text style={estilos.grauTexto}>{props.grau}°</Text>}
            {props.casa != null && <Text style={estilos.grauTexto}>Casa {props.casa}</Text>}
          </View>
        </View>

        <Text style={estilos.cardPrincipalInterp}>{props.interpretacao}</Text>
      </LinearGradient>
    </View>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  acoesLinha: {
    flexDirection: 'row', gap: Espacamento.sm, justifyContent: 'center',
    flexWrap: 'wrap', marginBottom: Espacamento.md,
  },
  acaoBotao: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Cores.acento, borderRadius: RaioBorda.full,
    paddingVertical: 10, paddingHorizontal: Espacamento.md,
  },
  acaoTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.acento },

  aberturaTexto: {
    fontFamily: Fontes.corpo, fontSize: 13, lineHeight: 20,
    color: Cores.textoSecundario, textAlign: 'center',
    paddingHorizontal: Espacamento.sm,
  },
  avisoHonesto: {
    fontFamily: Fontes.corpo, fontSize: 12, lineHeight: 18,
    color: Cores.textoSecundario, marginTop: Espacamento.sm,
  },
  rodapeCalculo: {
    fontFamily: Fontes.corpo, fontSize: 11, lineHeight: 17,
    color: Cores.textoSecundario, marginTop: Espacamento.sm,
  },
  planetaLinha: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(181,139,70,0.35)',
    paddingVertical: Espacamento.sm, gap: 4,
  },
  planetaCabeca: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'space-between', gap: Espacamento.sm,
  },
  planetaPapel: {
    fontFamily: Fontes.corpo, fontSize: 13, lineHeight: 20,
    color: Cores.textoClaro,
  },
  fatorLinha: { width: '100%', marginTop: Espacamento.sm },
  fatorRotulo: {
    fontFamily: Fontes.corpoSemibold, fontSize: 11, letterSpacing: 1,
    textTransform: 'uppercase', color: Cores.acento,
  },
  fatorValor: { fontFamily: Fontes.corpoNegrito, fontSize: 15, color: Cores.textoClaro },
  fatorPorque: {
    fontFamily: Fontes.corpo, fontSize: 13, lineHeight: 19, color: Cores.textoSecundario,
  },
  aspectoLinha: {
    flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm,
    backgroundColor: Cores.cardFundo, borderRadius: RaioBorda.md,
    borderWidth: 1, borderColor: Cores.cardBorda,
    paddingHorizontal: Espacamento.sm, paddingVertical: 9, marginBottom: 6,
  },
  aspectoSimbolo: { fontSize: 20, width: 26, textAlign: 'center' },
  aspectoTextos: { flex: 1 },
  aspectoNomes: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.textoClaro },
  aspectoOrbe: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario },
  notaRodape: {
    fontFamily: Fontes.corpo, fontSize: 11, lineHeight: 17,
    color: Cores.textoSecundario, marginTop: Espacamento.sm,
  },
  botaoPlanos: {
    marginTop: Espacamento.sm, borderWidth: 1, borderColor: Cores.acento,
    borderRadius: RaioBorda.full, paddingVertical: 10, paddingHorizontal: Espacamento.lg,
  },
  botaoPlanosTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.acento },
  botaoAvulso: {
    marginTop: Espacamento.sm, borderWidth: 1, borderColor: Cores.acento,
    borderRadius: RaioBorda.full, paddingVertical: 10, paddingHorizontal: Espacamento.lg,
  },
  botaoAvulsoTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.acento },
  equilibrioCaixa: {
    backgroundColor: 'rgba(181,139,70,0.10)', borderRadius: RaioBorda.lg,
    padding: Espacamento.md, gap: Espacamento.sm,
  },
  equilibrioLinha: {
    fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.acento, textAlign: 'center',
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
  rodaContainer: {
    alignItems: 'center',
    paddingVertical: Espacamento.lg,
    marginHorizontal: Espacamento.md,
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    marginTop: Espacamento.sm,
    marginBottom: Espacamento.md,
  },
  rodaWrapper: { marginBottom: Espacamento.md },
  rodaNota: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    lineHeight: 16,
    color: Cores.textoSecundario,
    textAlign: 'center',
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.xs,
  },
  rodaLegenda: {
    flexDirection: 'row',
    gap: Espacamento.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  rodaLegendaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  rodaLegendaPonto: {
    width: 6, height: 6, borderRadius: 3,
  },
  rodaLegendaTexto: {
    fontFamily: Fontes.corpoSemibold, fontSize: 12,
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

  // Os dois nodos são um eixo, e a tela mostra isso dando a eles cards iguais e
  // vizinhos, em vez de uma lista onde um pareceria mais importante que o outro.
  nodoItem: {
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  nodoNome: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 15,
    color: Cores.textoClaro,
    marginBottom: 2,
  },
  nodoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13.5,
    color: Cores.textoSecundario,
    lineHeight: 21,
    marginTop: Espacamento.xs,
  },
  // Card Principal
  cardPrincipal: {
    marginBottom: Espacamento.md,
  },
  cardPrincipalGradiente: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
  },
  cardPrincipalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Espacamento.sm,
  },
  cardPrincipalIcone: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  cardPrincipalTituloBox: { flex: 1 },
  cardPrincipalTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 16,
    color: Cores.textoClaro,
  },
  cardPrincipalSub: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
  cardPrincipalSimbolo: {
    fontSize: 32,
    color: 'rgba(212, 175, 55, 0.4)',
  },
  cardPrincipalSignoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Espacamento.sm,
  },
  cardPrincipalSignoNome: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
  },
  elementoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RaioBorda.full,
  },
  elementoBadgeTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
  },
  grauTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  cardPrincipalInterp: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    lineHeight: 21,
  },
  // Planetas
  planetaCard: {
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  planetaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Espacamento.sm,
  },
  planetaIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  planetaSimbolo: {
    fontSize: 20,
    fontWeight: '700',
  },
  planetaInfo: { flex: 1 },
  planetaNome: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  planetaSigno: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  planetaGrau: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.acento,
  },
  planetaInterpretacao: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    lineHeight: 19,
  },
  // Casas
  casasGrid: {},
  casaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.sm,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.sm,
    marginBottom: Espacamento.xs,
  },
  casaNumero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  casaNumeroTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    color: Cores.acento,
  },
  casaInfo: { flex: 1 },
  casaNome: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.textoClaro,
  },
  casaRegente: {
    fontFamily: Fontes.corpo, fontSize: 12, color: Cores.acento, marginTop: 1,
  },
  // As peças de onde cada área saiu. Menores que o texto de propósito: são a
  // conta à vista, não a leitura.
  areaPecas: {
    marginTop: Espacamento.xs,
    paddingLeft: Espacamento.sm,
    borderLeftWidth: 2,
    borderLeftColor: Cores.acento + '40',
  },
  areaPecasTitulo: {
    fontFamily: Fontes.corpoSemibold, fontSize: 11, color: Cores.textoSecundario,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2,
  },
  areaPeca: {
    fontFamily: Fontes.corpo, fontSize: 12, lineHeight: 17,
    color: Cores.textoSecundario,
  },
  areaPecaRotulo: {
    fontFamily: Fontes.corpoSemibold, color: Cores.textoClaro,
  },
  areaPorque: {
    fontFamily: Fontes.corpo, fontSize: 11, lineHeight: 16,
    color: Cores.textoSecundario, fontStyle: 'italic', marginTop: 3,
  },
  casaCorpos: {
    fontFamily: Fontes.corpoSemibold, fontSize: 12, color: Cores.textoClaro, marginTop: 1,
  },
  casaVazia: {
    fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario,
    fontStyle: 'italic', marginTop: 1,
  },
  casaSigno: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
  },
  casaArea: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.acento,
  },
  // Resumo
  resumoCard: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.lg,
    alignItems: 'center',
  },
  resumoTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 18,
    color: Cores.textoClaro,
    marginTop: Espacamento.sm,
    marginBottom: Espacamento.sm,
  },
  resumoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoSecundario,
    lineHeight: 22,
    textAlign: 'center',
  },
  // Aviso do que o mapa completo vai trazer
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
  // Formato
  formatosBarra: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.sm,
  },
  formatoItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingVertical: Espacamento.sm,
    borderRadius: RaioBorda.md,
  },
  formatoAtivo: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
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
  breveBadge: {
    // Era um véu branco, feito para o fundo escuro; sobre o creme sumia.
    backgroundColor: 'rgba(88,117,101,0.10)',
    borderRadius: RaioBorda.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  breveTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 9,
    color: Cores.textoSecundario,
  },
  // Botões
  botoesFinais: {
    flexDirection: 'row',
    gap: Espacamento.sm,
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.xl,
    paddingBottom: Espacamento.xl,
  },
  botaoVoltar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Espacamento.sm,
    paddingVertical: 14,
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  botaoVoltarTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  botaoNovo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Espacamento.sm,
    paddingVertical: 14,
    borderRadius: RaioBorda.lg,
  },
  botaoNovoTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: '#fff',
  },
});
