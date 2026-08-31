import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { EstadoTela } from '../../components/EstadoTela';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { dataConsultaValida, textoConsultaValido } from '../../utils/validacaoConsulta';
import { Hapticos } from '../../utils/haptics';
import {
  gerarMapaCompleto,
  gerarIntegracao,
  INTERPRETACOES_CAMINHO_VIDA,
  INTERPRETACOES_EXPRESSAO,
  INTERPRETACOES_ALMA,
  INTERPRETACOES_PERSONALIDADE,
  INTERPRETACOES_MATURIDADE,
  INTERPRETACOES_ANO_PESSOAL,
  CalculoDetalhado,
  Interpretacao,
  NumeroNumerologico,
} from '../../data/mapa-numerologico';

type Aba = 'resumo' | 'calculos' | 'individual' | 'integracao' | 'comparacao' | 'plano';

const ABAS: { id: Aba; titulo: string; icone: string }[] = [
  { id: 'resumo', titulo: 'Resumo', icone: 'star-outline' },
  { id: 'calculos', titulo: 'Cálculos', icone: 'calculator-outline' },
  { id: 'individual', titulo: 'Individual', icone: 'list-outline' },
  { id: 'integracao', titulo: 'Integração', icone: 'infinite-outline' },
  { id: 'comparacao', titulo: 'Comparar nomes', icone: 'git-compare-outline' },
  { id: 'plano', titulo: 'Meu plano', icone: 'checkmark-circle-outline' },
];

export default function TelaResultadoMapa() {
  const params = useLocalSearchParams<{ nome: string; nomeAtual?: string; dia: string; mes: string; ano: string }>();
  const [abaAtiva, setAbaAtiva] = useState<Aba>('resumo');
  const fadeAnim = useRef(new Animated.Value(Platform.OS === 'web' ? 1 : 0)).current;
  const parametrosValidos = textoConsultaValido(params.nome)
    && dataConsultaValida(params.dia, params.mes, params.ano)
    && (!params.nomeAtual || textoConsultaValido(params.nomeAtual));

  const mapa = useMemo(() => {
    if (!parametrosValidos) return null;
    const nome = params.nome || '';
    const d = Number(params.dia);
    const m = Number(params.mes);
    const a = Number(params.ano);
    return gerarMapaCompleto(nome, d, m, a);
  }, [parametrosValidos, params.nome, params.dia, params.mes, params.ano]);

  const integracao = useMemo(() => mapa ? gerarIntegracao(mapa) : null, [mapa]);
  const mapaAtual = useMemo(() => {
    if (!mapa || !params.nomeAtual || params.nomeAtual.trim() === mapa.nome) return null;
    return gerarMapaCompleto(
      params.nomeAtual.trim(),
      Number(params.dia),
      Number(params.mes),
      Number(params.ano),
      mapa.anoReferencia
    );
  }, [mapa, params.nomeAtual, params.dia, params.mes, params.ano]);
  const abasDisponiveis = useMemo(
    () => mapaAtual ? ABAS : ABAS.filter(aba => aba.id !== 'comparacao'),
    [mapaAtual]
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const trocarAba = (nova: Aba) => {
    Hapticos.impactoLeve();
    if (Platform.OS === 'web') {
      setAbaAtiva(nova);
      return;
    }
    fadeAnim.setValue(0);
    setAbaAtiva(nova);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  if (!parametrosValidos || !mapa || !integracao) {
    return (
      <GradientBackground>
        <SafeAreaView style={estilos.safeArea} edges={['top']}>
          <EstadoTela
            tipo="erro"
            titulo="Não foi possível montar seu mapa"
            descricao="Informe seu nome e uma data de nascimento válida para continuar."
            acaoLabel="Revisar dados"
            onAcao={() => router.back()}
          />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea} edges={['top']}>
        {/* Header */}
        <View style={estilos.header}>
          <Pressable
            onPress={() => { Hapticos.impactoLeve(); router.replace('/(tabs)'); }}
            style={estilos.botaoHeader}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <Ionicons name="close" size={22} color={Cores.textoClaro} />
          </Pressable>
          <View style={estilos.headerTexto}>
            <Text style={estilos.headerTitulo}>Mapa Numerológico</Text>
            <Text style={estilos.headerSubtitulo}>{mapa.nome}</Text>
          </View>
          <View style={estilos.botaoHeaderEspaco} />
        </View>

        {/* Abas */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.abas}
          accessibilityRole="tablist"
          tabIndex={0}
          accessibilityLabel="Etapas do resultado numerológico"
        >
          {abasDisponiveis.map(aba => (
            <Pressable
              key={aba.id}
              onPress={() => trocarAba(aba.id)}
              style={[estilos.aba, abaAtiva === aba.id && estilos.abaAtiva]}
              accessibilityRole="tab"
              accessibilityState={{ selected: abaAtiva === aba.id }}
            >
              <Ionicons
                name={aba.icone as any}
                size={16}
                color={abaAtiva === aba.id ? Cores.acento : Cores.textoSecundario}
              />
              <Text style={[estilos.abaTexto, abaAtiva === aba.id && estilos.abaTextoAtivo]}>
                {aba.titulo}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={estilos.progressoEtapa} accessibilityLiveRegion="polite">
          Etapa {abasDisponiveis.findIndex(aba => aba.id === abaAtiva) + 1} de {abasDisponiveis.length}
        </Text>

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            contentContainerStyle={estilos.scrollContent}
            showsVerticalScrollIndicator={false}
            tabIndex={0}
            accessibilityLabel="Resultado do mapa numerológico"
          >
            {abaAtiva === 'resumo' && <AbaResumo mapa={mapa} />}
            {abaAtiva === 'calculos' && <AbaCalculos mapa={mapa} />}
            {abaAtiva === 'individual' && <AbaIndividual mapa={mapa} />}
            {abaAtiva === 'integracao' && <AbaIntegracao integracao={integracao} />}
            {abaAtiva === 'comparacao' && mapaAtual && <AbaComparacao nascimento={mapa} atual={mapaAtual} />}
            {abaAtiva === 'plano' && <AbaPlano mapa={mapa} />}

            {/* Disclaimer */}
            <View style={estilos.disclaimer}>
              <Ionicons name="information-circle-outline" size={16} color={Cores.textoSecundario} />
              <Text style={estilos.disclaimerTexto}>
                A numerologia é uma prática esotérica e simbólica, não um método científico validado para descrever características pessoais. Use como ferramenta de autoconhecimento e reflexão.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </GradientBackground>
  );
}

// ─── ABAS ───

function AbaResumo({ mapa }: { mapa: ReturnType<typeof gerarMapaCompleto> }) {
  const cards = [
    { titulo: 'Caminho de Vida', calc: mapa.caminhoVida, interp: INTERPRETACOES_CAMINHO_VIDA, icone: 'compass-outline', cor: '#D4AF37' },
    { titulo: 'Expressão', calc: mapa.expressao, interp: INTERPRETACOES_EXPRESSAO, icone: 'star-outline', cor: '#9B59B6' },
    { titulo: 'Alma', calc: mapa.alma, interp: INTERPRETACOES_ALMA, icone: 'heart-outline', cor: '#E91E90' },
    { titulo: 'Personalidade', calc: mapa.personalidade, interp: INTERPRETACOES_PERSONALIDADE, icone: 'person-outline', cor: '#3498DB' },
    { titulo: 'Maturidade', calc: mapa.maturidade, interp: INTERPRETACOES_MATURIDADE, icone: 'ribbon-outline', cor: '#7C9A82' },
    { titulo: `Ano Pessoal ${mapa.anoReferencia}`, calc: mapa.anoPessoal, interp: INTERPRETACOES_ANO_PESSOAL, icone: 'calendar-outline', cor: '#5DADE2' },
  ];

  return (
    <View>
      <Text style={estilos.tituloAba}>Seu resultado final</Text>
      <Text style={estilos.subtituloAba}>Data: {mapa.dataNascimento}</Text>

      {cards.map(c => {
        const info = c.interp[c.calc.numeroFinal];
        return (
          <LinearGradient
            key={c.titulo}
            colors={[c.cor + '25', c.cor + '10'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[estilos.cardResumo, { borderColor: c.cor + '40' }]}
          >
            <View style={estilos.cardResumoHeader}>
              <View style={[estilos.cardResumoIcone, { backgroundColor: c.cor + '20' }]}>
                <Ionicons name={c.icone as any} size={22} color={c.cor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.cardResumoLabel}>{c.titulo}</Text>
                <Text style={estilos.cardResumoTitulo}>{info?.titulo}</Text>
              </View>
              <View style={[estilos.numeroBadge, { backgroundColor: c.cor }]}>
                <Text style={estilos.numeroBadgeTexto}>{c.calc.numeroFinal}</Text>
              </View>
            </View>
            {c.calc.ehMestre && (
              <View style={estilos.mestreBadge}>
                <MaterialCommunityIcons name="star-four-points" size={12} color={Cores.acento} />
                <Text style={estilos.mestreBadgeTexto}>NÚMERO MESTRE</Text>
              </View>
            )}
            <Text style={estilos.cardResumoEssencia}>{info?.essencia}</Text>
          </LinearGradient>
        );
      })}
    </View>
  );
}

function AbaCalculos({ mapa }: { mapa: ReturnType<typeof gerarMapaCompleto> }) {
  const secoes = [
    { titulo: 'Caminho de Vida', calc: mapa.caminhoVida, base: `Data: ${mapa.dataNascimento}` },
    { titulo: 'Número de Expressão', calc: mapa.expressao, base: `Nome completo: ${mapa.nome}` },
    { titulo: 'Número da Alma', calc: mapa.alma, base: 'Somando apenas as vogais' },
    { titulo: 'Personalidade', calc: mapa.personalidade, base: 'Somando apenas as consoantes' },
    { titulo: 'Maturidade', calc: mapa.maturidade, base: 'Caminho de Vida + Expressão' },
    { titulo: `Ano Pessoal ${mapa.anoReferencia}`, calc: mapa.anoPessoal, base: 'Dia + mês de nascimento + ano de referência' },
  ];

  return (
    <View>
      <Text style={estilos.tituloAba}>Passo a passo</Text>
      <Text style={estilos.subtituloAba}>Como cada número foi calculado</Text>

      <View style={estilos.tabelaCard}>
        <Text style={estilos.tabelaTitulo}>📐 Tabela Pitagórica</Text>
        <View style={estilos.tabelaGrid}>
          {[
            ['1', 'AJS'], ['2', 'BKT'], ['3', 'CLU'],
            ['4', 'DMV'], ['5', 'ENW'], ['6', 'FOX'],
            ['7', 'GPY'], ['8', 'HQZ'], ['9', 'IR'],
          ].map(([n, l]) => (
            <View key={n} style={estilos.tabelaCel}>
              <Text style={estilos.tabelaNumero}>{n}</Text>
              <Text style={estilos.tabelaLetras}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      {secoes.map(s => (
        <View key={s.titulo} style={estilos.calculoBloco}>
          <Text style={estilos.calculoTitulo}>{s.titulo}</Text>
          <Text style={estilos.calculoBase}>{s.base}</Text>

          {s.calc.passos.map((p, i) => (
            <View key={i} style={estilos.calculoPasso}>
              <View style={estilos.calculoPassoBullet}>
                <Text style={estilos.calculoPassoBulletTexto}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.calculoPassoDescricao}>{p.descricao}</Text>
                <Text style={estilos.calculoPassoDetalhe}>{p.detalhe}</Text>
                <Text style={estilos.calculoPassoResultado}>= {p.resultado}</Text>
              </View>
            </View>
          ))}

          <View style={estilos.calculoFinal}>
            <Text style={estilos.calculoFinalLabel}>Resultado</Text>
            <View style={estilos.calculoFinalBadge}>
              <Text style={estilos.calculoFinalNumero}>{s.calc.numeroFinal}</Text>
              {s.calc.ehMestre && <Text style={estilos.calculoFinalMestre}>MESTRE</Text>}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function AbaIndividual({ mapa }: { mapa: ReturnType<typeof gerarMapaCompleto> }) {
  const secoes: { titulo: string; calc: CalculoDetalhado; interp: Interpretacao }[] = [
    { titulo: 'Caminho de Vida', calc: mapa.caminhoVida, interp: INTERPRETACOES_CAMINHO_VIDA[mapa.caminhoVida.numeroFinal] },
    { titulo: 'Expressão', calc: mapa.expressao, interp: INTERPRETACOES_EXPRESSAO[mapa.expressao.numeroFinal] },
    { titulo: 'Alma', calc: mapa.alma, interp: INTERPRETACOES_ALMA[mapa.alma.numeroFinal] },
    { titulo: 'Personalidade', calc: mapa.personalidade, interp: INTERPRETACOES_PERSONALIDADE[mapa.personalidade.numeroFinal] },
    { titulo: 'Maturidade', calc: mapa.maturidade, interp: INTERPRETACOES_MATURIDADE[mapa.maturidade.numeroFinal] },
    { titulo: `Ano Pessoal ${mapa.anoReferencia}`, calc: mapa.anoPessoal, interp: INTERPRETACOES_ANO_PESSOAL[mapa.anoPessoal.numeroFinal] },
  ];

  return (
    <View>
      <Text style={estilos.tituloAba}>Interpretação individual</Text>
      <Text style={estilos.subtituloAba}>Associações tradicionais de cada número</Text>

      {secoes.map(s => (
        <View key={s.titulo} style={estilos.individualBloco}>
          <View style={estilos.individualHeader}>
            <View>
              <Text style={estilos.individualLabel}>{s.titulo}</Text>
              <Text style={estilos.individualTitulo}>{s.interp.titulo}</Text>
            </View>
            <View style={estilos.individualNumero}>
              <Text style={estilos.individualNumeroTexto}>{s.calc.numeroFinal}</Text>
            </View>
          </View>

          <Text style={estilos.individualEssencia}>{s.interp.essencia}</Text>
          <Text style={estilos.individualDescricao}>{s.interp.descricao}</Text>

          <View style={estilos.individualColunas}>
            <View style={estilos.individualColuna}>
              <Text style={[estilos.individualColunaLabel, { color: Cores.primaria }]}>✨ Pontos fortes</Text>
              {s.interp.pontosFortes.map(p => (
                <Text key={p} style={estilos.individualItem}>• {p}</Text>
              ))}
            </View>
            <View style={estilos.individualColuna}>
              <Text style={[estilos.individualColunaLabel, { color: '#E67E22' }]}>⚠️ Desafios</Text>
              {s.interp.desafios.map(d => (
                <Text key={d} style={estilos.individualItem}>• {d}</Text>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function AbaIntegracao({ integracao }: { integracao: ReturnType<typeof gerarIntegracao> }) {
  const blocos = [
    { titulo: 'Personalidade Geral', texto: integracao.personalidadeGeral, icone: 'person-circle-outline', cor: '#3498DB' },
    { titulo: 'Talentos & Direção', texto: integracao.talentosMissao, icone: 'trophy-outline', cor: '#D4AF37' },
    { titulo: 'Desafios & Conflitos', texto: integracao.desafiosConflitos, icone: 'warning-outline', cor: '#E67E22' },
    { titulo: 'Amor & Relacionamentos', texto: integracao.amorRelacionamentos, icone: 'heart-outline', cor: '#E91E90' },
    { titulo: 'Carreira & Propósito', texto: integracao.carreiraProposito, icone: 'briefcase-outline', cor: '#7C9A82' },
    { titulo: 'Espiritualidade', texto: integracao.espiritualidade, icone: 'infinite-outline', cor: '#9B59B6' },
    { titulo: 'Padrões Recorrentes', texto: integracao.padroesRecorrentes, icone: 'sparkles-outline', cor: '#D4AF37' },
  ];

  return (
    <View>
      <Text style={estilos.tituloAba}>Integração dos números</Text>
      <Text style={estilos.subtituloAba}>Como essas associações simbólicas podem ser lidas em conjunto</Text>

      {blocos.map(b => (
        <View key={b.titulo} style={[estilos.integracaoBloco, { borderLeftColor: b.cor }]}>
          <View style={estilos.integracaoHeader}>
            <View style={[estilos.integracaoIcone, { backgroundColor: b.cor + '20' }]}>
              <Ionicons name={b.icone as any} size={20} color={b.cor} />
            </View>
            <Text style={estilos.integracaoTitulo}>{b.titulo}</Text>
          </View>
          <Text style={estilos.integracaoTexto}>{b.texto}</Text>
        </View>
      ))}
    </View>
  );
}

const OPCOES_PLANO = [
  { id: 'clareza', titulo: 'Clareza', pergunta: 'Que decisão merece fatos e tempo antes do próximo passo?' },
  { id: 'relacoes', titulo: 'Relações', pergunta: 'Qual conversa pode ficar mais honesta e respeitosa?' },
  { id: 'trabalho', titulo: 'Trabalho', pergunta: 'Que habilidade concreta você deseja praticar nas próximas semanas?' },
  { id: 'rotina', titulo: 'Rotina', pergunta: 'Qual hábito pequeno cabe de verdade na sua semana?' },
] as const;

function AbaPlano({ mapa }: { mapa: ReturnType<typeof gerarMapaCompleto> }) {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const ciclo = INTERPRETACOES_ANO_PESSOAL[mapa.anoPessoal.numeroFinal];

  const alternar = (id: string) => {
    Hapticos.impactoLeve();
    setSelecionados(atuais => atuais.includes(id)
      ? atuais.filter(item => item !== id)
      : [...atuais, id]);
  };

  return (
    <View>
      <Text style={estilos.tituloAba}>Seu plano de reflexão</Text>
      <Text style={estilos.subtituloAba}>Escolha até onde esta leitura será útil para você. Nada é salvo ou enviado.</Text>

      <View style={estilos.cicloCard}>
        <Text style={estilos.cicloLabel}>Ponto de partida simbólico · Ano {mapa.anoReferencia}</Text>
        <Text style={estilos.cicloTitulo}>{ciclo.titulo}</Text>
        <Text style={estilos.cicloTexto}>{ciclo.descricao}</Text>
      </View>

      <Text style={estilos.planoSecaoTitulo}>Para os próximos 30 dias</Text>
      {OPCOES_PLANO.map(opcao => {
        const selecionado = selecionados.includes(opcao.id);
        return (
          <Pressable
            key={opcao.id}
            onPress={() => alternar(opcao.id)}
            style={[estilos.planoOpcao, selecionado && estilos.planoOpcaoSelecionada]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selecionado }}
            accessibilityLabel={`${opcao.titulo}: ${opcao.pergunta}`}
          >
            <Ionicons
              name={selecionado ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={selecionado ? Cores.acento : Cores.textoSecundario}
            />
            <View style={{ flex: 1 }}>
              <Text style={estilos.planoOpcaoTitulo}>{opcao.titulo}</Text>
              <Text style={estilos.planoOpcaoTexto}>{opcao.pergunta}</Text>
            </View>
          </Pressable>
        );
      })}

      <View style={estilos.plano90Card}>
        <Text style={estilos.planoSecaoTitulo}>Revisão em 90 dias</Text>
        <Text style={estilos.planoOpcaoTexto}>
          Retome apenas os itens escolhidos e registre o que mudou por causa das suas ações, do contexto e das conversas — não por causa de uma previsão.
        </Text>
        <Text style={estilos.planoContagem} accessibilityLiveRegion="polite">
          {selecionados.length} {selecionados.length === 1 ? 'tema escolhido' : 'temas escolhidos'}
        </Text>
      </View>
    </View>
  );
}

function AbaComparacao({
  nascimento,
  atual,
}: {
  nascimento: ReturnType<typeof gerarMapaCompleto>;
  atual: ReturnType<typeof gerarMapaCompleto>;
}) {
  const itens = [
    { titulo: 'Expressão', nascimento: nascimento.expressao.numeroFinal, atual: atual.expressao.numeroFinal },
    { titulo: 'Alma', nascimento: nascimento.alma.numeroFinal, atual: atual.alma.numeroFinal },
    { titulo: 'Personalidade', nascimento: nascimento.personalidade.numeroFinal, atual: atual.personalidade.numeroFinal },
    { titulo: 'Maturidade', nascimento: nascimento.maturidade.numeroFinal, atual: atual.maturidade.numeroFinal },
  ];

  return (
    <View>
      <Text style={estilos.tituloAba}>Comparação simbólica</Text>
      <Text style={estilos.subtituloAba}>
        Observe diferenças entre os cálculos sem interpretar um nome como melhor, corrigido ou mais próspero.
      </Text>

      <View style={estilos.comparacaoCabecalho}>
        <View style={estilos.comparacaoNomeColuna}>
          <Text style={estilos.comparacaoLabel}>Nascimento</Text>
          <Text style={estilos.comparacaoNome} numberOfLines={2}>{nascimento.nome}</Text>
        </View>
        <Ionicons name="git-compare-outline" size={22} color={Cores.acento} />
        <View style={estilos.comparacaoNomeColuna}>
          <Text style={estilos.comparacaoLabel}>Nome atual</Text>
          <Text style={estilos.comparacaoNome} numberOfLines={2}>{atual.nome}</Text>
        </View>
      </View>

      {itens.map(item => {
        const mudou = item.nascimento !== item.atual;
        return (
          <View key={item.titulo} style={estilos.comparacaoLinha}>
            <View style={estilos.comparacaoNumero}><Text style={estilos.comparacaoNumeroTexto}>{item.nascimento}</Text></View>
            <View style={estilos.comparacaoCentro}>
              <Text style={estilos.comparacaoItemTitulo}>{item.titulo}</Text>
              <Text style={estilos.comparacaoMudanca}>{mudou ? 'Associação diferente' : 'Mesma associação'}</Text>
            </View>
            <View style={estilos.comparacaoNumero}><Text style={estilos.comparacaoNumeroTexto}>{item.atual}</Text></View>
          </View>
        );
      })}

      <View style={estilos.comparacaoNota}>
        <Ionicons name="information-circle-outline" size={18} color={Cores.textoSecundario} />
        <Text style={estilos.comparacaoNotaTexto}>
          O Caminho de Vida e o Ano Pessoal não mudam, pois dependem da data. Esta comparação não recomenda alterar documentos, assinatura ou identidade profissional.
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Espacamento.lg,
    paddingVertical: Espacamento.sm,
  },
  botaoHeader: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1, borderColor: Cores.cardBorda,
    alignItems: 'center', justifyContent: 'center',
  },
  botaoHeaderEspaco: { width: 44, height: 44 },
  headerTexto: { flex: 1, alignItems: 'center' },
  headerTitulo: {
    fontFamily: Fontes.titulo, fontSize: 16, fontWeight: '700', color: Cores.textoClaro,
  },
  headerSubtitulo: {
    fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario, marginTop: 2,
  },
  abas: {
    flexDirection: 'row',
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.xs,
    marginBottom: Espacamento.sm,
    gap: 6,
  },
  aba: {
    minWidth: 116,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: RaioBorda.md,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
  },
  progressoEtapa: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 11,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginBottom: Espacamento.xs,
  },
  abaAtiva: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderColor: Cores.acento,
  },
  abaTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
  },
  abaTextoAtivo: {
    color: Cores.acento,
    fontFamily: Fontes.corpoSemibold,
  },
  scrollContent: {
    paddingHorizontal: Espacamento.lg,
    paddingBottom: Espacamento.xxl,
  },
  tituloAba: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginTop: Espacamento.sm,
  },
  subtituloAba: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginBottom: Espacamento.md,
  },
  // Resumo
  cardResumo: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  cardResumoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
  },
  cardResumoIcone: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  cardResumoLabel: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardResumoTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 16,
    color: Cores.textoClaro,
    marginTop: 2,
  },
  numeroBadge: {
    minWidth: 44, height: 44, borderRadius: 22,
    paddingHorizontal: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  numeroBadgeTexto: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    fontWeight: '700',
    color: Cores.fundoEscuro,
  },
  mestreBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
    marginTop: Espacamento.sm,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RaioBorda.full,
  },
  mestreBadgeTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 9,
    color: Cores.acento,
    letterSpacing: 1.5,
  },
  cardResumoEssencia: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoClaro,
    marginTop: Espacamento.sm,
    lineHeight: 19,
  },
  // Cálculos
  tabelaCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginBottom: Espacamento.md,
  },
  tabelaTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    color: Cores.acento,
    marginBottom: Espacamento.sm,
  },
  tabelaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabelaCel: {
    width: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 8,
    borderRadius: RaioBorda.sm,
  },
  tabelaNumero: {
    fontFamily: Fontes.titulo,
    fontSize: 18,
    fontWeight: '700',
    color: Cores.acento,
    width: 20,
  },
  tabelaLetras: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.textoClaro,
    letterSpacing: 1,
  },
  calculoBloco: {
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  calculoTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.acento,
  },
  calculoBase: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: Espacamento.sm,
  },
  calculoPasso: {
    flexDirection: 'row',
    gap: Espacamento.sm,
    marginTop: Espacamento.sm,
  },
  calculoPassoBullet: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  calculoPassoBulletTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 10,
    color: Cores.acento,
  },
  calculoPassoDescricao: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
    color: Cores.textoClaro,
  },
  calculoPassoDetalhe: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Cores.textoSecundario,
    marginTop: 2,
    lineHeight: 16,
  },
  calculoPassoResultado: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 12,
    color: Cores.primaria,
    marginTop: 2,
  },
  calculoFinal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Espacamento.md,
    paddingTop: Espacamento.sm,
    borderTopWidth: 1,
    borderTopColor: Cores.cardBorda,
  },
  calculoFinalLabel: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
    color: Cores.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  calculoFinalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Cores.acento,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RaioBorda.full,
  },
  calculoFinalNumero: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    fontWeight: '700',
    color: Cores.fundoEscuro,
  },
  calculoFinalMestre: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 8,
    color: Cores.fundoEscuro,
    letterSpacing: 1,
  },
  // Individual
  individualBloco: {
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginBottom: Espacamento.md,
  },
  individualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  individualLabel: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  individualTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 18,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginTop: 2,
  },
  individualNumero: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 2,
    borderColor: Cores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  individualNumeroTexto: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    fontWeight: '700',
    color: Cores.acento,
  },
  individualEssencia: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.primaria,
    marginTop: Espacamento.sm,
    fontStyle: 'italic',
  },
  individualDescricao: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoClaro,
    lineHeight: 21,
    marginTop: Espacamento.sm,
  },
  individualColunas: {
    flexDirection: 'row',
    gap: Espacamento.md,
    marginTop: Espacamento.md,
  },
  individualColuna: { flex: 1 },
  individualColunaLabel: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  individualItem: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoClaro,
    lineHeight: 18,
  },
  // Integração
  integracaoBloco: {
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
    borderLeftWidth: 3,
  },
  integracaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
    marginBottom: Espacamento.sm,
  },
  integracaoIcone: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  integracaoTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  integracaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoClaro,
    lineHeight: 22,
  },
  cicloCard: {
    backgroundColor: 'rgba(93, 173, 226, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(93, 173, 226, 0.35)',
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginBottom: Espacamento.lg,
  },
  cicloLabel: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 11,
    color: '#8BC8EF',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  cicloTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginTop: 4,
  },
  cicloTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    lineHeight: 21,
    color: Cores.textoClaro,
    marginTop: Espacamento.sm,
  },
  planoSecaoTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.textoClaro,
    marginBottom: Espacamento.sm,
  },
  planoOpcao: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.md,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  planoOpcaoSelecionada: {
    borderColor: Cores.acento,
    backgroundColor: 'rgba(212, 175, 55, 0.10)',
  },
  planoOpcaoTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    color: Cores.textoClaro,
  },
  planoOpcaoTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    lineHeight: 19,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  plano90Card: {
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginTop: Espacamento.md,
  },
  planoContagem: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 12,
    color: Cores.acento,
    marginTop: Espacamento.md,
  },
  comparacaoCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg,
    padding: Espacamento.md,
    marginBottom: Espacamento.md,
  },
  comparacaoNomeColuna: { flex: 1, alignItems: 'center' },
  comparacaoLabel: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 10,
    color: Cores.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  comparacaoNome: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 13,
    lineHeight: 17,
    color: Cores.textoClaro,
    textAlign: 'center',
    marginTop: 4,
  },
  comparacaoLinha: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.md,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  comparacaoNumero: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 8,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
  },
  comparacaoNumeroTexto: {
    fontFamily: Fontes.titulo,
    fontSize: 19,
    fontWeight: '700',
    color: Cores.acento,
  },
  comparacaoCentro: { flex: 1, alignItems: 'center' },
  comparacaoItemTitulo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 14,
    color: Cores.textoClaro,
  },
  comparacaoMudanca: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  comparacaoNota: {
    flexDirection: 'row',
    gap: Espacamento.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RaioBorda.md,
    padding: Espacamento.md,
    marginTop: Espacamento.md,
  },
  comparacaoNotaTexto: {
    flex: 1,
    fontFamily: Fontes.corpo,
    fontSize: 12,
    lineHeight: 18,
    color: Cores.textoSecundario,
  },
  disclaimer: {
    flexDirection: 'row',
    gap: Espacamento.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.md,
    padding: Espacamento.md,
    marginTop: Espacamento.lg,
  },
  disclaimerTexto: {
    flex: 1,
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
