import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';
import { lerAuditoriaDeCusto, type AuditoriaDeCusto } from '../../services/custo';
import { ehAcessoNegado } from '../../services/acessoNegado';
import { ehSessaoExpirada } from '../../services/sessaoExpirada';
import { ROTULO_PLANO } from '../../utils/acessos';
import {
  custoPorPlano, custoTotal, formatarDolar, lerPrecos, ROTULO_TIPO,
} from '../../utils/custoIA';
import { EstadoCarregamento } from './EstadoCarregamento';
import { irParaLoginPorSessaoExpirada } from './sessao';
import { estilosPainel } from './estilos';
import type { PropsAbaManager } from './tipos';

/**
 * Quanto a IA custa, por plano — item 31 do roadmap.
 *
 * O consumo é medido (tokens e caracteres que os fornecedores relataram); os preços
 * são declarados na tabela `precos_ia`, com data de confirmação. A tela mostra as
 * duas coisas separadas de propósito: juntar fato com declaração sem dizer qual é
 * qual é o jeito mais rápido de decidir preço sobre número que ninguém conferiu.
 */

/** Janelas que a tela oferece. O teto é do servidor; aqui só o atalho. */
const JANELAS = [7, 30, 90] as const;

function comMilhar(valor: number): string {
  return Math.round(valor).toLocaleString('pt-BR');
}

/**
 * O nome do plano em português, ou o valor cru quando não é um dos quatro.
 *
 * A function devolve `'sem plano'` para consumo cujo perfil não tem plano, e um
 * índice direto no dicionário daria `undefined` — o cartão apareceria sem título,
 * como se o plano não tivesse nome, em vez de dizer qual é o caso.
 */
function rotuloDoPlano(plano: string): string {
  return (ROTULO_PLANO as Record<string, string>)[plano] ?? plano;
}

function dataCurta(iso: string | null): string {
  if (!iso) return '—';
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : iso;
}

export function AbaCusto({ aoPerderAcesso }: PropsAbaManager) {
  const [dados, setDados] = useState<AuditoriaDeCusto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [dias, setDias] = useState<number>(30);

  const carregar = useCallback((janela: number) => {
    setErro(null);
    lerAuditoriaDeCusto(janela)
      .then(setDados)
      .catch((e) => {
        if (ehSessaoExpirada(e)) {
          irParaLoginPorSessaoExpirada();
          return;
        }
        if (ehAcessoNegado(e)) {
          aoPerderAcesso();
          return;
        }
        setErro('Não foi possível carregar o custo.');
      });
  }, [aoPerderAcesso]);

  useEffect(() => {
    carregar(dias);
  }, [carregar, dias]);

  const conta = useMemo(() => {
    if (!dados) return null;
    const { precos, faltando, confirmadoEm } = lerPrecos(dados.precos);
    const planos = custoPorPlano({
      consumo: dados.consumo,
      pessoasAtivas: dados.pessoasAtivas,
      assinantes: dados.assinantes,
      precos,
    });
    return { planos, total: custoTotal(planos), faltando, confirmadoEm };
  }, [dados]);

  if (!dados || !conta) {
    return <EstadoCarregamento erro={erro} aoTentarDeNovo={() => carregar(dias)} />;
  }

  return (
    <ScrollView contentContainerStyle={estilosPainel.conteudo}>
      <View style={estilos.janelas}>
        {JANELAS.map((j) => (
          <Pressable
            key={j}
            onPress={() => setDias(j)}
            accessibilityRole="button"
            accessibilityLabel={`Últimos ${j} dias`}
            accessibilityState={{ selected: dias === j }}
            style={[estilosPainel.chip, dias === j && estilosPainel.chipAtivo]}
          >
            <Text style={[estilosPainel.chipTexto, dias === j && estilosPainel.chipTextoAtivo]}>
              {`${j} dias`}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={estilosPainel.card}>
        <Text style={estilosPainel.ajuda}>{`Desde ${dataCurta(dados.desde)}`}</Text>
        <Text style={estilos.total}>{formatarDolar(conta.total)}</Text>
        <Text style={estilosPainel.ajuda}>
          Custo de IA no período, somando modelo e voz.
        </Text>
      </View>

      {/* A honestidade desta tela vive nos dois avisos abaixo. Sem eles, um número
          baixo se lê como economia quando pode ser falta de medição ou de preço. */}
      {conta.faltando.length > 0 ? (
        <View style={[estilosPainel.card, estilos.alerta]}>
          <Text style={estilos.alertaTexto}>
            {`Preço não cadastrado: ${conta.faltando.join(', ')}. O total acima está SUBESTIMADO — o que não tem preço entrou como zero.`}
          </Text>
        </View>
      ) : null}

      <Text style={estilosPainel.ajuda}>
        {dados.medidoDesde
          ? `Consumo medido desde ${dataCurta(dados.medidoDesde)}. Chamadas anteriores foram contadas, mas não tiveram tokens guardados — elas aparecem no número de chamadas e não no custo.`
          : 'Nenhum consumo medido ainda neste período. As chamadas abaixo, se houver, são anteriores à medição de tokens: contam como uso, mas não têm custo conhecido.'}
      </Text>

      {conta.planos.map((p) => (
        <View key={p.plano} style={estilosPainel.card}>
          <Text style={estilosPainel.titulo}>{rotuloDoPlano(p.plano)}</Text>
          <Text style={estilos.destaque}>{formatarDolar(p.dolares)}</Text>
          <Text style={estilosPainel.ajuda}>
            {`${comMilhar(p.chamadas)} chamada${p.chamadas === 1 ? '' : 's'} · ${p.pessoasAtivas} de ${p.assinantes} pessoa${p.assinantes === 1 ? '' : 's'} usaram`}
          </Text>
          <Text style={estilosPainel.ajuda}>
            {`${formatarDolar(p.porAssinante)} por assinante no período`}
          </Text>

          {p.porTipo.length === 0 ? (
            <Text style={estilosPainel.ajuda}>Nenhum uso de IA neste plano.</Text>
          ) : (
            p.porTipo.map((t) => (
              <Text key={t.tipo} style={estilos.linhaTipo}>
                <Text style={estilos.rotuloTipo}>{ROTULO_TIPO[t.tipo]}</Text>
                {`: ${formatarDolar(t.dolares)} em ${comMilhar(t.chamadas)} uso${t.chamadas === 1 ? '' : 's'} (${formatarDolar(t.porChamada)} cada)`}
              </Text>
            ))
          )}
        </View>
      ))}

      <View style={estilosPainel.card}>
        <Text style={estilosPainel.titulo}>Os preços usados nesta conta</Text>
        <Text style={estilosPainel.ajuda}>
          {conta.confirmadoEm
            ? `Confirmados em ${dataCurta(conta.confirmadoEm)} — essa é a confirmação mais antiga entre eles.`
            : 'Nenhum preço cadastrado.'}
        </Text>
        {dados.precos.map((p) => (
          <Text key={p.chave} style={estilos.linhaTipo}>
            <Text style={estilos.rotuloTipo}>{p.chave}</Text>
            {`: US$ ${p.dolar_por_milhao} por milhão`}
          </Text>
        ))}
        <Text style={estilosPainel.ajuda}>
          Preço de fornecedor muda e ninguém avisa este app. Eles moram na tabela
          precos_ia: corrigir é um update, não um deploy.
        </Text>
      </View>

      <View style={estilos.rodape} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  janelas: { flexDirection: 'row', gap: Espacamento.sm },
  total: {
    fontFamily: Fontes.titulo, fontSize: 30, color: Cores.acento,
    marginVertical: Espacamento.xs,
  },
  destaque: {
    fontFamily: Fontes.titulo, fontSize: 20, color: Cores.acento, marginTop: 2,
  },
  linhaTipo: {
    fontFamily: Fontes.corpo, fontSize: 13, lineHeight: 19,
    color: Cores.textoSecundario, marginTop: 2,
  },
  rotuloTipo: { fontFamily: Fontes.corpoSemibold, color: Cores.textoPrimario },
  alerta: { borderColor: Cores.erro },
  alertaTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.erro },
  rodape: { height: 48 },
});
