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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/Button';
import { LequeDeCorte } from '../../components/taro/LequeDeCorte';
import { MontesCortados } from '../../components/taro/MontesCortados';
import { MonteParaDistribuir, type MedidaDaVaga } from '../../components/taro/MonteParaDistribuir';
import { Recolhimento } from '../../components/taro/Recolhimento';
import { Tabuleiro, LARGURA_MINIMA_DO_TABULEIRO } from '../../components/taro/Tabuleiro';
import { VagaDaTiragem } from '../../components/taro/VagaDaTiragem';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { voltarOuIr } from '../../utils/navegacao';
import { ARCANOS_MAIORES, type CartaTarot } from '../../data/tarot';
import { cortar, embaralhar, recolher } from '../../data/corteDoBaralho';
import { TIRAGENS, TIRAGEM_PADRAO, type Tiragem } from '../../data/tiragens';

/**
 * O rito do tarô, portado do protótipo `Camadas do Tarô`.
 *
 * Esta tela é a tradução daquele protótipo para React Native — mesma ordem, mesmos
 * painéis, mesmos textos de estado. Mudou só o necessário para rodar aqui: cores e
 * tipografia saem de `constants/`, o giro da carta usa um clarão porque o RN não tem
 * `backface-visibility`, e o realce do monte responde ao toque em vez do ponteiro, já
 * que no celular não existe passar o dedo sem encostar.
 *
 * O que ficou de fora de propósito: as chaves "Baralho de 78", "Cartas invertidas" e
 * "Posição como regra", e o painel de custo. Aquilo é instrumento do protótipo — existe
 * para medir quanto texto cada camada obriga a escrever —, não função do produto.
 */

/** Dez cortes é o teto do protótipo: além disso é brinquedo, não rito. */
const MAX_CORTES = 10;
const ROTULO_INTENCAO = 'O que te trouxe aqui?';
/** O tempo entre a carta pousar e virar. No protótipo são 320 ms. */
const ESPERA_DA_VIRADA = 320;

type Etapa = 'cortar' | 'distribuindo' | 'lido';

export default function TelaCartas() {
  const [intencao, setIntencao] = useState('');
  const [modelo, setModelo] = useState<Tiragem>(TIRAGEM_PADRAO);
  const [leque, setLeque] = useState<CartaTarot[]>(() => embaralhar(ARCANOS_MAIORES));
  // O leque só abre depois do gesto. Nas fontes a pergunta é segurada na cabeça DURANTE
  // o embaralhamento — é isso que liga a pergunta à tiragem. Embaralhar invisível, num
  // instante, é sorteio com outro nome.
  const [embaralhado, setEmbaralhado] = useState(false);
  const [montes, setMontes] = useState<CartaTarot[][]>([]);
  const [baralho, setBaralho] = useState<CartaTarot[] | null>(null);
  const [tiragem, setTiragem] = useState<(CartaTarot | null)[]>(
    () => TIRAGEM_PADRAO.posicoes.map(() => null),
  );
  const [reveladas, setReveladas] = useState<boolean[]>(
    () => TIRAGEM_PADRAO.posicoes.map(() => false),
  );
  const [recolhendo, setRecolhendo] = useState(false);
  const [medidas, setMedidas] = useState<MedidaDaVaga[]>([]);
  // A pessoa tentou pôr a carta numa vaga que não é a da vez. Fica até a próxima carta
  // pousar no lugar certo, para a explicação não sumir antes de ser lida.
  const [foraDeOrdem, setForaDeOrdem] = useState(false);
  // Sobe a cada rolagem parada: e o sinal para as vagas se medirem de novo. Sem isso,
  // com o monte fixo na tela, soltar a carta depois de rolar usaria medida velha.
  const [versaoDaMedida, setVersaoDaMedida] = useState(0);
  // Qual carta o dedo esta tocando no leque, para dizer o tamanho do monte antes de
  // soltar. Tocar perto da ponta direita leva quase o baralho inteiro, e com 22 cartas
  // isso encerra o corte num toque so — a pessoa precisa ver isso antes, nao depois.
  const [apontada, setApontada] = useState<number | null>(null);
  // `null` enquanto não se sabe: começar em `true` deixaria a animação partir antes da
  // resposta do sistema a quem pediu "reduzir movimento".
  const [movimento, setMovimento] = useState<boolean | null>(null);

  const { width: larguraDaTela } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const relogios = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduz) => { if (vivo) setMovimento(!reduz); })
      .catch(() => { if (vivo) setMovimento(false); });
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const marcados = relogios.current;
    return () => {
      vivo = false;
      for (const r of marcados) clearTimeout(r);
    };
  }, [fade]);

  const POSICOES = modelo.posicoes;
  const cortes = montes.length;
  const distribuindo = baralho !== null;
  const tudoPuxado = tiragem.every((c) => c !== null);
  const prontas = tudoPuxado && reveladas.every(Boolean);
  const faltam = tiragem.filter((c) => c === null).length;
  const semLequeParaCortar = cortes >= MAX_CORTES || leque.length <= 1;
  const podeCortar = !distribuindo && !recolhendo && !semLequeParaCortar;
  const podeTrocarDeTiragem = cortes === 0 && !distribuindo && !recolhendo;

  const etapa: Etapa = prontas ? 'lido' : distribuindo ? 'distribuindo' : 'cortar';

  const escolherTiragem = useCallback((escolhida: Tiragem) => {
    Hapticos.selecao();
    setModelo(escolhida);
    // Vagas e viradas são redimensionadas junto: guardar três `null` numa Cruz Celta
    // faria o rito se dar por completo com sete posições ainda vazias.
    setTiragem(escolhida.posicoes.map(() => null));
    setReveladas(escolhida.posicoes.map(() => false));
    setMedidas([]);
  }, []);

  const embaralharAgora = useCallback(() => {
    Hapticos.impactoMedio();
    setLeque(embaralhar(ARCANOS_MAIORES));
    setEmbaralhado(true);
  }, []);

  const aoCortar = useCallback((indice: number) => {
    Hapticos.impactoLeve();
    const { monte, resto } = cortar(leque, indice);
    setMontes((anteriores) => [...anteriores, monte]);
    setLeque(resto);
  }, [leque]);

  const irParaLeitura = useCallback(() => {
    Hapticos.impactoMedio();
    setRecolhendo(true);
  }, []);

  // A ordem já foi decidida por `recolher` no instante do corte; o riffle só a mostra.
  // Por isso ele não recebe nem devolve cartas, e o baralho é montado aqui no fim dele.
  const terminarRecolhimento = useCallback(() => {
    setBaralho(recolher(montes, leque));
    setRecolhendo(false);
  }, [montes, leque]);

  // As cartas vão para as posições na ordem da tiragem, como nos livros: quem consulta
  // escolhe a carta (pelo corte), não a posição. Burke tira do topo ou deixa a pessoa
  // escolher QUAIS cartas, mas a 1ª vai sempre para a posição 1 (O Livro Completo do
  // Tarô, p. 157 e 162; livreto Rider-Waite, p. 53). O arraste e o toque na vaga ficam,
  // mas só valem na próxima posição.
  const puxarPara = useCallback((vaga: number) => {
    if (vaga < 0 || vaga >= tiragem.length || tiragem[vaga]) return;
    if (!baralho || baralho.length === 0) return;
    if (vaga !== tiragem.findIndex((c) => c === null)) {
      setForaDeOrdem(true);
      return;
    }
    setForaDeOrdem(false);
    Hapticos.impactoLeve();
    const [topo, ...resto] = baralho;
    const nova = [...tiragem];
    nova[vaga] = topo;
    setTiragem(nova);
    setBaralho(resto);
    // Pousa de costas e vira sozinha, como no protótipo. A espera é o ponto: sem ela a
    // carta aparece pronta e não acontece nada.
    const relogio = setTimeout(() => {
      setReveladas((anteriores) => {
        const novas = [...anteriores];
        novas[vaga] = true;
        return novas;
      });
    }, ESPERA_DA_VIRADA);
    relogios.current.push(relogio);
  }, [tiragem, baralho]);

  const puxar = useCallback(() => {
    puxarPara(tiragem.findIndex((c) => c === null));
  }, [puxarPara, tiragem]);

  const virar = useCallback((indice: number) => {
    if (!tiragem[indice] || reveladas[indice]) return;
    setReveladas((anteriores) => {
      const novas = [...anteriores];
      novas[indice] = true;
      return novas;
    });
  }, [tiragem, reveladas]);

  const medirVaga = useCallback((indice: number, medida: Omit<MedidaDaVaga, 'indice'>) => {
    setMedidas((anteriores) => [
      ...anteriores.filter((m) => m.indice !== indice),
      { indice, ...medida },
    ]);
  }, []);

  const recomecar = useCallback(() => {
    Hapticos.impactoMedio();
    for (const r of relogios.current) clearTimeout(r);
    relogios.current = [];
    setLeque(embaralhar(ARCANOS_MAIORES));
    setEmbaralhado(false);
    setMontes([]);
    setBaralho(null);
    setTiragem(POSICOES.map(() => null));
    setReveladas(POSICOES.map(() => false));
    setRecolhendo(false);
    setMedidas([]);
    setForaDeOrdem(false);
  }, [POSICOES]);

  const verResultado = useCallback(() => {
    Hapticos.impactoMedio();
    const cartas = tiragem.filter((c): c is CartaTarot => c !== null);
    router.push({
      pathname: '/consulta/resultado',
      params: {
        cartas: JSON.stringify(cartas),
        intencao: intencao.trim(),
        // As posições viajam junto: a tela do resultado não pode adivinhar qual tiragem
        // foi feita, e a IA precisa da pergunta de cada posição, não só do nome dela.
        posicoes: JSON.stringify(POSICOES),
      },
    });
  }, [tiragem, intencao, POSICOES]);

  // O tabuleiro só em tela larga: espremida num celular a mesa deixa de ser legível, e o
  // que carrega o sentido da posição é o nome com a pergunta, que some primeiro. Até três
  // cartas a lista já é a própria mesa, em linha — não há o que arrumar.
  const emTabuleiro = POSICOES.length > 3 && larguraDaTela >= LARGURA_MINIMA_DO_TABULEIRO;

  const desenharVaga = (i: number) => (
    <VagaDaTiragem
      key={POSICOES[i].nome}
      posicao={POSICOES[i]}
      carta={tiragem[i]}
      revelada={reveladas[i]}
      compacta={emTabuleiro}
      deitada={POSICOES[i].deitada}
      aoReceber={() => puxarPara(i)}
      aoVirar={() => virar(i)}
      aoMedir={(medida) => medirVaga(i, medida)}
      versaoDaMedida={versaoDaMedida}
    />
  );

  // Os textos abaixo são do protótipo, palavra por palavra. São eles que contam o que
  // está acontecendo — sem eles a tela é um monte de cartas sem narração.
  let passo: string;
  let contador: string;
  if (etapa === 'cortar') {
    if (!embaralhado) {
      passo = 'Segure a sua pergunta e embaralhe as cartas.';
      contador = `O baralho tem ${leque.length} cartas. `
        + 'O que você está pensando entra agora, com o gesto.';
    } else if (cortes === 0) {
      passo = 'Toque numa carta do leque para tirar um monte.';
      contador = `O baralho tem ${leque.length} cartas, embaralhadas. `
        + 'Tudo da ponta até onde você tocar sai junto.';
    } else if (semLequeParaCortar) {
      passo = cortes >= MAX_CORTES
        ? 'Dez montes. O baralho já está como tem de estar.'
        : 'Não sobrou leque para cortar.';
      contador = 'Siga para a leitura.';
    } else {
      passo = 'Cortar de novo, ou seguir para a leitura?';
      contador = `${cortes} ${cortes === 1 ? 'monte de lado, ' : 'montes de lado, '}`
        + `${leque.length} cartas ainda no leque.`;
    }
  } else if (etapa === 'distribuindo') {
    passo = 'Montes juntos. Agora as cartas são suas para distribuir.';
    contador = `${cortes} ${cortes === 1 ? 'corte seu decidiu' : 'cortes seus decidiram'} `
      + 'a ordem do monte.';
  } else {
    passo = 'A leitura está posta.';
    // Recomeçar leva de volta ao embaralhamento, não ao corte.
    contador = 'Toque em "Recomeçar o rito" para embaralhar e cortar outra vez.';
  }

  const proxima = POSICOES[tiragem.findIndex((c) => c === null)];
  const passoDaDistribuicao = faltam === 0 || !proxima
    ? 'Todas as posições preenchidas. A leitura é esta.'
    : (foraDeOrdem
      ? `As cartas vão na ordem da tiragem: esta é de ${proxima.nome}. `
      : `Próxima posição: ${proxima.nome}. `)
      + 'Arraste a carta de cima do monte até ela — ou toque no monte. '
      + `Faltam ${faltam} ${faltam === 1 ? 'carta.' : 'cartas.'}`;

  return (
    <LinearGradient colors={['#F7F3EA', '#F1EEE5', '#F7F3EA']} style={estilos.fundo}>
      <SafeAreaView style={estilos.safeArea}>
        <View style={estilos.header}>
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
          <Text style={estilos.titulo}>Suas Cartas</Text>
          {/* Mesma largura do botão, para o título continuar centralizado. */}
          <View style={estilos.espacoVoltar} />
        </View>

        <ScrollView
          style={estilos.rolagem}
          contentContainerStyle={estilos.rolagemConteudo}
          keyboardShouldPersistTaps="handled"
          onScrollEndDrag={() => setVersaoDaMedida((v) => v + 1)}
          onMomentumScrollEnd={() => setVersaoDaMedida((v) => v + 1)}
        >
          <Animated.View
            style={[estilos.coluna, emTabuleiro && estilos.colunaLarga, { opacity: fade }]}
          >
            {/* ───────── Antes de cortar ───────── */}
            {!distribuindo && !recolhendo && (
              <View style={estilos.painel}>
                <Text style={estilos.rotulo}>Antes de cortar</Text>
                <Text style={estilos.passo}>{ROTULO_INTENCAO}</Text>
                <Text style={estilos.nota}>
                  Escrever é opcional. Quem escreve recebe uma leitura sobre aquilo; quem
                  não escreve recebe uma leitura que não finge saber o que você pensou.
                </Text>
                {/* Depois do embaralhamento a pergunta já está valendo: o campo fica à vista,
                    porque é a pergunta da leitura, mas não aceita mais edição. Quem digita
                    depois do gesto faz o gesto antes e a pergunta depois — o que o torna
                    falso. Mudar a pergunta é recomeçar o rito. */}
                <TextInput
                  accessibilityLabel={ROTULO_INTENCAO}
                  value={intencao}
                  onChangeText={setIntencao}
                  editable={!embaralhado}
                  placeholder={embaralhado
                    ? 'Nenhuma pergunta escrita'
                    : 'Ex.: estou decidindo se mudo de trabalho'}
                  placeholderTextColor={Cores.textoSecundario}
                  maxLength={140}
                  style={[estilos.campo, embaralhado && estilos.campoValendo]}
                />
                {/* Campo travado e vazio seria beco sem saída: a pessoa que segurou a pergunta
                    na cabeça e quer escrevê-la precisa saber que o caminho é recomeçar. No
                    caso vazio a linha não afirma pergunta nenhuma. */}
                {embaralhado ? (
                  <Text style={estilos.nota}>
                    {intencao.trim()
                      ? 'A pergunta já entrou com o embaralhamento. Para mudá-la, toque em '
                        + '"Recomeçar o rito".'
                      : 'Você embaralhou sem escrever. Para pôr uma pergunta, toque em '
                        + '"Recomeçar o rito".'}
                  </Text>
                ) : null}
                {podeTrocarDeTiragem && (
                  <View style={estilos.chaves}>
                    {TIRAGENS.map((opcao) => {
                      const escolhida = opcao.id === modelo.id;
                      return (
                        <Pressable
                          key={opcao.id}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: escolhida }}
                          accessibilityLabel={`${opcao.nome}, ${opcao.posicoes.length} cartas`}
                          onPress={() => escolherTiragem(opcao)}
                          style={[estilos.chave, escolhida && estilos.chaveLigada]}
                        >
                          <View style={[estilos.bolinha, escolhida && estilos.bolinhaLigada]} />
                          <Text style={estilos.chaveTexto}>{opcao.nome}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* ───────── O baralho ───────── */}
            <View style={estilos.painel}>
              <Text style={estilos.rotulo}>O baralho</Text>
              <Text style={estilos.passo}>{passo}</Text>
              <Text style={estilos.contador}>
                {apontada !== null && podeCortar
                  ? `Soltando aqui, saem ${apontada + 1} ${apontada === 0 ? 'carta' : 'cartas'} `
                    + `e ficam ${leque.length - apontada - 1} no leque.`
                  : contador}
              </Text>

              {!embaralhado && !distribuindo && !recolhendo ? (
                <Button
                  variante="primary"
                  label="Embaralhar"
                  icone="shuffle-outline"
                  onPress={embaralharAgora}
                />
              ) : null}

              {recolhendo ? (
                <Recolhimento ligado={movimento === true} aoTerminar={terminarRecolhimento} />
              ) : !distribuindo && embaralhado ? (
                <LequeDeCorte
                  quantidade={leque.length}
                  aoCortar={aoCortar}
                  desligado={!podeCortar}
                  aoApontar={setApontada}
                />
              ) : null}

              {!distribuindo && !recolhendo && (
                <MontesCortados tamanhos={montes.map((m) => m.length)} />
              )}

              <View style={estilos.botoes}>
                {etapa === 'cortar' && cortes > 0 && (
                  <Button
                    variante="primary"
                    label="Ir para a leitura"
                    icone="arrow-forward"
                    posicaoIcone="right"
                    onPress={irParaLeitura}
                  />
                )}
                <Button
                  variante="ghost"
                  label="Recomeçar o rito"
                  icone="refresh-outline"
                  onPress={recomecar}
                />
              </View>

              <Text style={estilos.nota}>
                O corte é real: onde você toca, o baralho se parte ali e o monte de baixo
                sobe para cima. A ordem das cartas sai da sua mão, não de um gerador
                escondido.
              </Text>
            </View>

            {/* ───────── A tiragem ───────── */}
            {distribuindo && (
              <>
                <Text style={estilos.sobre}>
                  {intencao.trim()
                    ? `Leitura sobre: ${intencao.trim()}`
                    : 'Você não disse o que trouxe — então a leitura fala das cartas e das '
                      + 'posições, e deixa a aplicação com você. Nenhuma linha vai fingir '
                      + 'saber o que você pensou.'}
                </Text>

                {emTabuleiro
                  ? <Tabuleiro posicoes={POSICOES} vaga={desenharVaga} />
                  : POSICOES.map((_, i) => desenharVaga(i))}
              </>
            )}
          </Animated.View>
        </ScrollView>

        {/* O monte acompanha a rolagem porque fica FORA dela: numa Cruz Celta a pessoa
            precisa ver de onde a carta sai enquanto olha a vaga lá embaixo. E fica num
            rodapé, não flutuando por cima: flutuando, tapava vagas da cruz com a página
            no topo (até 73% de "Esperança e medo" em 1024×768). Aqui a rolagem termina
            acima dele, então não há vaga que ele cubra. */}
        {distribuindo && !tudoPuxado && (
          <View style={estilos.faixaDoMonte}>
            <View style={estilos.monteCaixa}>
              <MonteParaDistribuir
                restantes={baralho.length}
                aoPuxar={puxar}
                aoSoltarEm={puxarPara}
                vagas={medidas}
              />
              <Text style={[estilos.nota, estilos.notaDoMonte]}>{passoDaDistribuicao}</Text>
            </View>
          </View>
        )}

        {prontas && (
          <View style={estilos.footer}>
            <Button
              variante="primary"
              label="Ver Leitura Completa"
              icone="arrow-forward"
              posicaoIcone="right"
              larguraTotal
              onPress={verResultado}
            />
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Espacamento.md, paddingHorizontal: Espacamento.lg,
    paddingBottom: Espacamento.sm,
  },
  voltarBotao: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Cores.cardFundo,
    borderWidth: 1, borderColor: Cores.cardBorda, alignItems: 'center', justifyContent: 'center',
  },
  espacoVoltar: { width: 40 },
  titulo: {
    fontFamily: Fontes.titulo, fontSize: 26, fontWeight: '700',
    color: Cores.textoClaro, letterSpacing: 2,
  },

  rolagem: { flex: 1 },
  rolagemConteudo: {
    paddingHorizontal: Espacamento.md, paddingBottom: Espacamento.lg, alignItems: 'center',
  },
  // O protótipo usa uma coluna de 62rem. Sem ela, no navegador o campo de intenção
  // atravessa a tela inteira.
  coluna: { width: '100%', maxWidth: 620, gap: Espacamento.md },
  // O tabuleiro precisa de mais largura que o resto da tela; a coluna abre só para ele.
  colunaLarga: { maxWidth: 1100 },

  painel: {
    backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda,
    borderRadius: 14, padding: Espacamento.md, gap: Espacamento.sm,
  },
  rotulo: {
    fontFamily: Fontes.corpoNegrito, fontSize: 11, letterSpacing: 1.4,
    textTransform: 'uppercase', color: Cores.textoSecundario,
  },
  passo: { fontFamily: Fontes.titulo, fontSize: 19, color: Cores.textoClaro, lineHeight: 25 },
  contador: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario, lineHeight: 19 },
  nota: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario, lineHeight: 21 },
  notaDoMonte: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 17 },

  campo: {
    borderRadius: RaioBorda.md, borderWidth: 1, borderColor: Cores.cardBorda,
    backgroundColor: '#F7F3EA', paddingHorizontal: Espacamento.sm,
    paddingVertical: Espacamento.sm, fontFamily: Fontes.corpo, fontSize: 14,
    color: Cores.textoClaro,
  },

  // Já valendo: sai o fundo de campo, que convida a escrever, e entra o da superfície.
  campoValendo: { backgroundColor: Cores.cardFundo },

  chaves: { flexDirection: 'row', flexWrap: 'wrap', gap: Espacamento.sm },
  chave: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: Cores.cardBorda, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#F7F3EA',
  },
  chaveLigada: { borderColor: Cores.acento },
  bolinha: {
    width: 13, height: 13, borderRadius: 7,
    borderWidth: 1.5, borderColor: Cores.cardBorda,
  },
  bolinhaLigada: { borderColor: Cores.acento, backgroundColor: Cores.acento },
  chaveTexto: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoClaro },

  botoes: { flexDirection: 'row', flexWrap: 'wrap', gap: Espacamento.sm, alignItems: 'center' },

  sobre: {
    fontFamily: Fontes.corpo, fontSize: 14, lineHeight: 22, color: Cores.textoSecundario,
  },
  faixaDoMonte: {
    borderTopWidth: 1, borderTopColor: Cores.cardBorda,
    paddingHorizontal: Espacamento.md, paddingVertical: Espacamento.sm,
    alignItems: 'center',
  },
  // Mesma largura da coluna de cima, para o texto do passo não atravessar a tela larga.
  monteCaixa: {
    width: '100%', maxWidth: 620,
    flexDirection: 'row', alignItems: 'center', gap: Espacamento.md,
  },

  footer: {
    paddingHorizontal: Espacamento.lg, paddingVertical: Espacamento.md,
    paddingBottom: Espacamento.lg,
  },
});
