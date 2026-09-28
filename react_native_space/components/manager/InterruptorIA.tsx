import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import {
  listarConfiguracaoIA, planosFaltando, ROTULO_PLANO, salvarConfiguracaoIA,
  type ConfiguracaoIA, type MudancaConfigIA, type PlanoIA,
} from '../../services/configIA';
import { ehAcessoNegado } from '../../services/acessoNegado';
import { ehSessaoExpirada } from '../../services/sessaoExpirada';
import { mostrarAlerta } from '../../utils/alerta';
import { irParaLoginPorSessaoExpirada } from './sessao';

/**
 * Liga e desliga cada recurso de IA por plano, e define o teto do dia.
 *
 * O que está em jogo aqui não é a tela: a Edge Function lê esta mesma linha com
 * a service role antes de chamar modelo nenhum. Desligar aqui desliga no
 * servidor — e é por isso que o texto de ajuda diz isso em voz alta, para
 * ninguém mexer achando que é só preferência de interface.
 */

const RECURSOS: { campo: keyof MudancaConfigIA; rotulo: string; explica: string }[] = [
  { campo: 'imagem_ligada', rotulo: 'Leitura de imagem', explica: 'Borra de café e quiromância, a partir de uma foto' },
  { campo: 'interpretacao_ligada', rotulo: 'Interpretação', explica: 'A leitura da combinação do mapa astral' },
  { campo: 'pergunta_ligada', rotulo: 'Pergunta', explica: 'A caixa de pergunta dentro de uma consulta' },
  { campo: 'voz_ligada', rotulo: 'Leitura falada', explica: 'O botão Ouvir, com a voz Sadaltager do Google' },
];

export function InterruptorIA({ aoPerderAcesso }: { aoPerderAcesso: () => void }) {
  const [config, setConfig] = useState<ConfiguracaoIA[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<PlanoIA | null>(null);

  const tratarFalha = useCallback((e: unknown, titulo: string) => {
    if (ehSessaoExpirada(e)) {
      irParaLoginPorSessaoExpirada();
      return;
    }
    if (ehAcessoNegado(e)) {
      aoPerderAcesso();
      return;
    }
    mostrarAlerta(titulo, e instanceof Error ? e.message : String(e));
  }, [aoPerderAcesso]);

  const carregar = useCallback(() => {
    setErro(null);
    listarConfiguracaoIA()
      .then(setConfig)
      .catch((e) => {
        if (ehSessaoExpirada(e)) return irParaLoginPorSessaoExpirada();
        if (ehAcessoNegado(e)) return aoPerderAcesso();
        setErro('Não foi possível carregar a configuração de IA.');
        return setConfig([]);
      });
  }, [aoPerderAcesso]);

  useEffect(() => { carregar(); }, [carregar]);

  async function aplicar(plano: PlanoIA, mudanca: MudancaConfigIA, anterior: ConfiguracaoIA) {
    // Mexe na tela primeiro: um interruptor que só reage depois da rede parece
    // quebrado. Se a gravação falhar, volta ao que era — o estado mostrado
    // nunca pode divergir do que o servidor vai obedecer.
    setConfig((atual) => (atual ?? []).map(
      (c) => (c.plano === plano ? { ...c, ...mudanca } : c),
    ));
    setSalvando(plano);
    try {
      await salvarConfiguracaoIA(plano, mudanca);
    } catch (e) {
      setConfig((atual) => (atual ?? []).map((c) => (c.plano === plano ? anterior : c)));
      tratarFalha(e, 'Não foi possível salvar');
    } finally {
      setSalvando(null);
    }
  }

  if (!config) {
    return <ActivityIndicator style={{ marginVertical: Espacamento.lg }} color={Cores.acento} />;
  }

  const faltando = planosFaltando(config);

  return (
    <View style={estilos.bloco}>
      <Text style={estilos.titulo}>Recursos de IA por plano</Text>
      <Text style={estilos.ajuda}>
        Desligar aqui desliga no servidor, não só na tela: a função confere esta
        configuração antes de chamar o modelo. Limite por dia em zero quer dizer
        sem teto.
      </Text>

      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

      {faltando.length > 0 ? (
        <Text style={estilos.erro}>
          {`Sem linha de configuração para: ${faltando.map((p) => ROTULO_PLANO[p]).join(', ')}. `
            + 'Enquanto faltar, esses planos ficam sem interruptor nenhum.'}
        </Text>
      ) : null}

      {config.map((c) => (
        <View key={c.plano} style={estilos.card}>
          <Text style={estilos.cardTitulo}>{ROTULO_PLANO[c.plano]}</Text>

          {RECURSOS.map((r) => (
            <View key={String(r.campo)} style={estilos.recurso}>
              <View style={estilos.recursoTextos}>
                <Text style={estilos.recursoRotulo}>{r.rotulo}</Text>
                <Text style={estilos.recursoExplica}>{r.explica}</Text>
              </View>
              <Switch
                value={c[r.campo as keyof ConfiguracaoIA] === true}
                disabled={salvando === c.plano}
                onValueChange={(novo) => aplicar(c.plano, { [r.campo]: novo }, c)}
                trackColor={{ false: Cores.cardBorda, true: Cores.primaria }}
                thumbColor={Cores.superficie}
                accessibilityLabel={`${r.rotulo} no plano ${ROTULO_PLANO[c.plano]}`}
              />
            </View>
          ))}

          <LimiteDoDia
            valor={c.limite_dia}
            salvando={salvando === c.plano}
            rotuloPlano={ROTULO_PLANO[c.plano]}
            aoConfirmar={(novo) => aplicar(c.plano, { limite_dia: novo }, c)}
          />
        </View>
      ))}
    </View>
  );
}

/**
 * O limite grava ao sair do campo, não a cada tecla: digitar "20" passaria por
 * "2" no caminho, e cada passagem dessas seria uma gravação — e, por um
 * instante, um teto errado valendo no servidor.
 */
function LimiteDoDia({
  valor, salvando, rotuloPlano, aoConfirmar,
}: {
  valor: number;
  salvando: boolean;
  rotuloPlano: string;
  aoConfirmar: (novo: number) => void;
}) {
  const [texto, setTexto] = useState(String(valor));

  useEffect(() => { setTexto(String(valor)); }, [valor]);

  function confirmar() {
    const numero = Number(texto.trim());
    if (!Number.isInteger(numero) || numero < 0) {
      mostrarAlerta('Limite inválido', 'Use um número inteiro, zero ou mais.');
      setTexto(String(valor));
      return;
    }
    if (numero !== valor) aoConfirmar(numero);
  }

  return (
    <View style={estilos.limite}>
      <View style={estilos.recursoTextos}>
        <Text style={estilos.recursoRotulo}>Limite por dia</Text>
        <Text style={estilos.recursoExplica}>Zero = sem teto</Text>
      </View>
      <TextInput
        style={estilos.input}
        value={texto}
        onChangeText={setTexto}
        onBlur={confirmar}
        onSubmitEditing={confirmar}
        editable={!salvando}
        keyboardType="number-pad"
        accessibilityLabel={`Limite por dia no plano ${rotuloPlano}`}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: Espacamento.sm },
  titulo: { fontFamily: Fontes.corpoNegrito, fontSize: 18, color: Cores.textoClaro },
  ajuda: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario },
  erro: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.erro },
  card: {
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    gap: Espacamento.sm,
  },
  cardTitulo: { fontFamily: Fontes.corpoNegrito, fontSize: 16, color: Cores.textoClaro },
  recurso: { flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm },
  recursoTextos: { flex: 1 },
  recursoRotulo: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.textoClaro },
  recursoExplica: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario },
  limite: {
    flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm,
    borderTopWidth: 1, borderTopColor: Cores.cardBorda, paddingTop: Espacamento.sm,
  },
  input: {
    width: 78,
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoClaro,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: 'center',
  },
});
