import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientBackground } from '../components/GradientBackground';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { useIsSuperAdmin } from '../hooks/useAdmin';
import { carregarConfigPlanos, salvarPlano, type PlanoStripe } from '../services/configPlanos';
import { MOEDAS_SUPORTADAS, SIMBOLO, type MoedaSuportada } from '../services/stripe-planos';
import { mostrarAlerta } from '../utils/alerta';

export default function Manager() {
  const isSuper = useIsSuperAdmin();
  const [planos, setPlanos] = useState<PlanoStripe[] | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  // Aberto direto pela URL (sem histórico), router.back() é no-op: cai no perfil.
  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/perfil'));

  const recarregar = () =>
    carregarConfigPlanos({ incluirNaoConfigurados: true })
      .then(setPlanos)
      .catch(() => setPlanos([]));

  useEffect(() => {
    if (isSuper) recarregar();
  }, [isSuper]);

  if (!isSuper) {
    return (
      <GradientBackground>
        <SafeAreaView style={estilos.safe}>
          <View style={estilos.header}>
            <Pressable onPress={voltar} style={estilos.voltar} accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
            </Pressable>
            <Text style={estilos.titulo}>Painel de planos</Text>
          </View>
          <Text style={[estilos.ajuda, { paddingHorizontal: Espacamento.lg, marginTop: 48, textAlign: 'center' }]}>
            Acesso restrito.
          </Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  async function onSalvar(
    p: PlanoStripe,
    cota: number,
    precos: Record<MoedaSuportada, number>,
  ) {
    if (!Number.isFinite(cota) || cota <= 0 || MOEDAS_SUPORTADAS.some((m) => !(precos[m] > 0))) {
      mostrarAlerta('Valores inválidos', 'Cota e todos os preços devem ser maiores que zero.');
      return;
    }
    setSalvando(p.id);
    try {
      await salvarPlano(p.id, { cotaConsultas: cota, precos });
      await recarregar();
      mostrarAlerta('Plano atualizado', 'O preço novo já vale para novos checkouts.');
    } catch (e) {
      mostrarAlerta('Falha ao salvar', String((e as Error)?.message ?? e));
    } finally {
      setSalvando(null);
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safe}>
        <View style={estilos.header}>
          <Pressable onPress={voltar} style={estilos.voltar} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={22} color={Cores.textoClaro} />
          </Pressable>
          <Text style={estilos.titulo}>Painel de planos</Text>
        </View>

        {!planos ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={Cores.acento} />
        ) : (
          <ScrollView contentContainerStyle={estilos.conteudo}>
            <Text style={estilos.ajuda}>
              Ao salvar, um Price novo é criado na Stripe (o antigo é arquivado) e o app
              passa a exibir e cobrar o valor novo em novos checkouts.
            </Text>
            {planos.map((p) => (
              <CardPlano key={p.id} plano={p} salvando={salvando === p.id} onSalvar={onSalvar} />
            ))}
            <View style={{ height: 48 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

function CardPlano({
  plano,
  salvando,
  onSalvar,
}: {
  plano: PlanoStripe;
  salvando: boolean;
  onSalvar: (p: PlanoStripe, cota: number, precos: Record<MoedaSuportada, number>) => void;
}) {
  const [cota, setCota] = useState(String(plano.cotaConsultas));
  const [precos, setPrecos] = useState<Record<MoedaSuportada, string>>({
    brl: String(plano.precos.brl),
    usd: String(plano.precos.usd),
    eur: String(plano.precos.eur),
    cad: String(plano.precos.cad),
  });

  function salvar() {
    const precosNum = {} as Record<MoedaSuportada, number>;
    for (const m of MOEDAS_SUPORTADAS) precosNum[m] = Number(precos[m].replace(',', '.'));
    onSalvar(plano, Number(cota), precosNum);
  }

  return (
    <View style={estilos.card}>
      <Text style={estilos.cardTitulo}>{plano.nome}</Text>
      <Text style={estilos.priceId}>
        {plano.stripePriceId ? `Price: ${plano.stripePriceId}` : 'Ainda não configurado na Stripe'}
      </Text>

      <View style={estilos.linha}>
        {MOEDAS_SUPORTADAS.map((m) => (
          <View key={m} style={estilos.campo}>
            <Text style={estilos.campoLabel}>{SIMBOLO[m]}</Text>
            <TextInput
              style={estilos.input}
              value={precos[m]}
              onChangeText={(v) => setPrecos((atual) => ({ ...atual, [m]: v }))}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={Cores.textoSecundario}
            />
          </View>
        ))}
      </View>

      <View style={estilos.campoCota}>
        <Text style={estilos.campoLabel}>Consultas/mês</Text>
        <TextInput
          style={estilos.input}
          value={cota}
          onChangeText={setCota}
          keyboardType="number-pad"
          placeholder="4"
          placeholderTextColor={Cores.textoSecundario}
        />
      </View>

      <Pressable
        onPress={salvar}
        disabled={salvando}
        style={[estilos.botao, salvando && estilos.botaoDesabilitado]}
      >
        <Text style={estilos.botaoTexto}>{salvando ? 'Criando Price…' : 'Salvar'}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Espacamento.lg,
    paddingTop: Espacamento.sm,
    paddingBottom: Espacamento.md,
    gap: Espacamento.md,
  },
  voltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Cores.cardFundo,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontFamily: Fontes.titulo, fontSize: 22, fontWeight: '700', color: Cores.textoClaro },
  conteudo: { paddingHorizontal: Espacamento.lg, gap: Espacamento.md },
  ajuda: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginBottom: Espacamento.xs,
  },
  card: {
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    gap: Espacamento.sm,
  },
  cardTitulo: { fontFamily: Fontes.corpoNegrito, fontSize: 18, color: Cores.textoClaro },
  priceId: { fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: Espacamento.sm },
  campo: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 120, flexGrow: 1 },
  campoCota: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Espacamento.xs },
  campoLabel: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario, minWidth: 40 },
  input: {
    flex: 1,
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoClaro,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  botao: {
    backgroundColor: Cores.acento,
    borderRadius: RaioBorda.full,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: Espacamento.sm,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { fontFamily: Fontes.corpoNegrito, fontSize: 15, color: '#fff' },
});
