import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { carregarConfigPlanos, salvarPlano, type PlanoStripe } from '../../services/configPlanos';
import { MOEDAS_SUPORTADAS, SIMBOLO, type MoedaSuportada } from '../../services/stripe-planos';
import { mostrarAlerta } from '../../utils/alerta';
import type { PropsAbaManager } from './tipos';

export function AbaPlanos(_props: PropsAbaManager) {
  const [planos, setPlanos] = useState<PlanoStripe[] | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const recarregar = () =>
    carregarConfigPlanos({ incluirNaoConfigurados: true })
      .then(setPlanos)
      .catch(() => setPlanos([]));

  useEffect(() => {
    recarregar();
  }, []);

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

  if (!planos) return <ActivityIndicator style={{ marginTop: 48 }} color={Cores.acento} />;

  return (
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
