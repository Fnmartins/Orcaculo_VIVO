import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import {
  atualizarItemRoadmap, criarItemRoadmap, excluirItemRoadmap, listarRoadmap,
} from '../../services/roadmap';
import { ehAcessoNegado } from '../../services/acessoNegado';
import {
  agruparPorFase, calcularProgresso, proximaOrdem, ROTULO_STATUS, type ItemRoadmap,
} from '../../utils/roadmap';
import { confirmarAcao, mostrarAlerta } from '../../utils/alerta';
import { EstadoCarregamento } from './EstadoCarregamento';
import { EditorItemRoadmap, type ValoresEditorRoadmap } from './EditorItemRoadmap';
import { CORES_STATUS, estilosPainel } from './estilos';
import type { PropsAbaManager } from './tipos';

type Edicao = { modo: 'novo' } | { modo: 'editar'; item: ItemRoadmap };

export function AbaRoadmap({ aoPerderAcesso }: PropsAbaManager) {
  const [itens, setItens] = useState<ItemRoadmap[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    setErro(null);
    listarRoadmap()
      .then(setItens)
      .catch((e) => {
        if (ehAcessoNegado(e)) {
          aoPerderAcesso();
          return;
        }
        setErro('Não foi possível carregar o roadmap.');
      });
  }, [aoPerderAcesso]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const grupos = useMemo(() => agruparPorFase(itens ?? []), [itens]);
  const progresso = useMemo(() => calcularProgresso(itens ?? []), [itens]);
  const fases = useMemo(() => grupos.map((g) => g.fase), [grupos]);

  function tratarFalha(e: unknown, titulo: string) {
    if (ehAcessoNegado(e)) {
      aoPerderAcesso();
      return;
    }
    mostrarAlerta(titulo, e instanceof Error ? e.message : String(e));
  }

  async function salvar(valores: ValoresEditorRoadmap) {
    if (!itens || !edicao) return;
    setSalvando(true);
    try {
      if (edicao.modo === 'novo') {
        await criarItemRoadmap({ ...valores, ordem: proximaOrdem(itens, valores.fase) });
      } else {
        const { item } = edicao;
        const ordem = valores.fase === item.fase
          ? item.ordem
          : proximaOrdem(itens.filter((i) => i.id !== item.id), valores.fase);
        await atualizarItemRoadmap(item.id, { ...valores, ordem });
      }
      setEdicao(null);
      carregar();
    } catch (e) {
      tratarFalha(e, 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item: ItemRoadmap) {
    setSalvando(true);
    try {
      await excluirItemRoadmap(item.id);
      setEdicao(null);
      carregar();
    } catch (e) {
      tratarFalha(e, 'Falha ao excluir');
    } finally {
      setSalvando(false);
    }
  }

  if (!itens) return <EstadoCarregamento erro={erro} aoTentarDeNovo={carregar} />;

  const pct = progresso.total ? Math.round((progresso.concluidos / progresso.total) * 100) : 0;
  const itemEmEdicao = edicao?.modo === 'editar' ? edicao.item : null;

  return (
    <>
      <ScrollView contentContainerStyle={estilosPainel.conteudo}>
        <View style={estilosPainel.card}>
          <Text style={estilosPainel.titulo}>{`${progresso.concluidos} de ${progresso.total} concluídos`}</Text>
          <View style={estilos.barra}>
            <View style={[estilos.barraCheia, { width: `${pct}%` as const }]} />
          </View>
        </View>

        <Pressable
          onPress={() => setEdicao({ modo: 'novo' })}
          style={estilosPainel.botao}
          accessibilityRole="button"
        >
          <Text style={estilosPainel.botaoTexto}>+ Novo item</Text>
        </Pressable>

        {grupos.map((grupo) => (
          <View key={grupo.fase} style={estilosPainel.card}>
            <Text style={estilos.fase}>{grupo.fase}</Text>
            {grupo.itens.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setEdicao({ modo: 'editar', item })}
                style={estilos.item}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${item.titulo}`}
              >
                <View style={estilos.itemTopo}>
                  <Text style={estilos.itemTitulo}>{item.titulo}</Text>
                  <Text
                    style={[
                      estilos.status,
                      { color: CORES_STATUS[item.status].texto, backgroundColor: CORES_STATUS[item.status].fundo },
                    ]}
                  >
                    {ROTULO_STATUS[item.status]}
                  </Text>
                </View>
                {item.descricao ? <Text style={estilosPainel.ajuda}>{item.descricao}</Text> : null}
              </Pressable>
            ))}
          </View>
        ))}
        <View style={estilos.rodape} />
      </ScrollView>

      <EditorItemRoadmap
        visivel={edicao !== null}
        item={itemEmEdicao}
        fases={fases}
        salvando={salvando}
        aoSalvar={salvar}
        aoExcluir={itemEmEdicao
          ? () => confirmarAcao(
            'Excluir item',
            `"${itemEmEdicao.titulo}" sai do roadmap.`,
            () => excluir(itemEmEdicao),
            { confirmarLabel: 'Excluir', destrutivo: true },
          )
          : undefined}
        aoFechar={() => setEdicao(null)}
      />
    </>
  );
}

const estilos = StyleSheet.create({
  barra: { height: 8, borderRadius: RaioBorda.full, backgroundColor: Cores.cardBorda, overflow: 'hidden' },
  barraCheia: { height: 8, backgroundColor: Cores.primaria },
  fase: { fontFamily: Fontes.tituloSemibold, fontSize: 17, color: Cores.textoPrimario },
  item: {
    paddingVertical: Espacamento.sm,
    borderTopWidth: 1,
    borderTopColor: Cores.cardBorda,
    gap: Espacamento.xs,
  },
  itemTopo: { flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm },
  itemTitulo: { flex: 1, fontFamily: Fontes.corpoSemibold, fontSize: 15, color: Cores.textoPrimario },
  status: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RaioBorda.full,
    overflow: 'hidden',
  },
  rodape: { height: 48 },
});
