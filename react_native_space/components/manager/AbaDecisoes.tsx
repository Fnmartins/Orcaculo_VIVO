import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { useAuth } from '../../contexts/AuthContext';
import {
  criarDecisao, fecharDecisao, listarDecisoes, listarManifestacoes, registrarManifestacao,
  ehDecisaoFechada,
} from '../../services/decisoes';
import { ehAcessoNegado } from '../../services/acessoNegado';
import { ehSessaoExpirada } from '../../services/sessaoExpirada';
import {
  formatarDataHora, montarTextoDecisao, ordenarManifestacoes, ROTULO_POSICAO, ROTULO_STATUS,
  type Decisao, type Manifestacao, type PosicaoManifestacao,
} from '../../utils/decisoes';
import { copiarTexto } from '../../utils/copiar';
import { Previa } from '../previas';
import { confirmarAcao, mostrarAlerta } from '../../utils/alerta';
import { EstadoCarregamento } from './EstadoCarregamento';
import { irParaLoginPorSessaoExpirada } from './sessao';
import { estilosPainel } from './estilos';
import type { PropsAbaManager } from './tipos';

const POSICOES: PosicaoManifestacao[] = ['aprovo', 'nao_aprovo', 'comentario'];

export function AbaDecisoes({ aoPerderAcesso }: PropsAbaManager) {
  const { sessao, perfil } = useAuth();
  const [decisoes, setDecisoes] = useState<Decisao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [manifestacoes, setManifestacoes] = useState<Manifestacao[]>([]);
  const [carregandoFio, setCarregandoFio] = useState(false);
  const [criando, setCriando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [contexto, setContexto] = useState('');
  const [link, setLink] = useState('');
  const [posicao, setPosicao] = useState<PosicaoManifestacao>('comentario');
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);

  function tratarFalha(e: unknown, tituloAlerta: string) {
    if (ehSessaoExpirada(e)) {
      irParaLoginPorSessaoExpirada();
      return;
    }
    if (ehAcessoNegado(e)) {
      aoPerderAcesso();
      return;
    }
    mostrarAlerta(tituloAlerta, e instanceof Error ? e.message : String(e));
  }

  const carregar = useCallback(() => {
    setErro(null);
    listarDecisoes()
      .then(setDecisoes)
      .catch((e) => {
        if (ehSessaoExpirada(e)) {
          irParaLoginPorSessaoExpirada();
          return;
        }
        if (ehAcessoNegado(e)) {
          aoPerderAcesso();
          return;
        }
        setErro('Não foi possível carregar as decisões.');
      });
  }, [aoPerderAcesso]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrir(decisao: Decisao) {
    if (abertaId === decisao.id) {
      setAbertaId(null);
      return;
    }
    setAbertaId(decisao.id);
    setManifestacoes([]);
    setCarregandoFio(true);
    listarManifestacoes(decisao.id)
      .then((lista) => setManifestacoes(ordenarManifestacoes(lista)))
      .catch((e) => tratarFalha(e, 'Não foi possível carregar o histórico'))
      .finally(() => setCarregandoFio(false));
  }

  async function salvarDecisao() {
    if (!titulo.trim()) {
      mostrarAlerta('Faltam dados', 'Escreva pelo menos o título da decisão.');
      return;
    }
    setSalvando(true);
    try {
      const nova = await criarDecisao({
        titulo: titulo.trim(),
        contexto: contexto.trim() || null,
        link: link.trim() || null,
      });
      setDecisoes((atual) => [nova, ...(atual ?? [])]);
      setTitulo(''); setContexto(''); setLink(''); setCriando(false);
    } catch (e) {
      tratarFalha(e, 'Não foi possível criar a decisão');
    } finally {
      setSalvando(false);
    }
  }

  async function enviarManifestacao(decisao: Decisao) {
    if (!texto.trim()) {
      mostrarAlerta('Faltam dados', 'Escreva o que você quer registrar.');
      return;
    }
    setSalvando(true);
    try {
      const nova = await registrarManifestacao({
        decisaoId: decisao.id,
        autorId: sessao?.user?.id ?? '',
        autorNome: perfil?.nome?.trim() || sessao?.user?.email || 'Admin',
        posicao,
        texto: texto.trim(),
      });
      setManifestacoes((atual) => ordenarManifestacoes([...atual, nova]));
      setTexto('');
    } catch (e) {
      if (ehDecisaoFechada(e)) {
        mostrarAlerta('Decisão fechada', e instanceof Error ? e.message : String(e));
        carregar();
        return;
      }
      tratarFalha(e, 'Não foi possível registrar');
    } finally {
      setSalvando(false);
    }
  }

  async function copiar(decisao: Decisao) {
    const copiou = await copiarTexto(montarTextoDecisao(decisao, manifestacoes));
    mostrarAlerta(
      copiou ? 'Copiado' : 'Não foi possível copiar',
      copiou
        ? 'A decisão e o histórico estão na área de transferência.'
        : 'Selecione o texto na tela e copie manualmente.',
    );
  }

  function fechar(decisao: Decisao) {
    confirmarAcao(
      'Fechar decisão',
      'Depois de fechada, ninguém acrescenta manifestações. Confirma?',
      async () => {
        setSalvando(true);
        try {
          const atualizada = await fecharDecisao(decisao.id, sessao?.user?.id ?? '');
          setDecisoes((atual) => (atual ?? []).map((d) => (d.id === atualizada.id ? atualizada : d)));
        } catch (e) {
          tratarFalha(e, 'Não foi possível fechar');
          carregar();
        } finally {
          setSalvando(false);
        }
      },
    );
  }

  if (!decisoes) return <EstadoCarregamento erro={erro} aoTentarDeNovo={carregar} />;

  return (
    <ScrollView contentContainerStyle={estilosPainel.conteudo}>
      <Text style={estilosPainel.ajuda}>
        O que está em decisão entre vocês. Registre a sua posição, e use "Copiar tudo" para levar a
        conversa inteira adiante.
      </Text>

      {criando ? (
        <View style={estilosPainel.card}>
          <Text style={estilosPainel.titulo}>Nova decisão</Text>
          <TextInput
            style={estilosPainel.input}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Título"
            placeholderTextColor={Cores.textoSecundario}
            accessibilityLabel="Título"
          />
          <TextInput
            style={[estilosPainel.input, estilos.campoLongo]}
            value={contexto}
            onChangeText={setContexto}
            placeholder="Contexto (opcional)"
            placeholderTextColor={Cores.textoSecundario}
            multiline
            accessibilityLabel="Contexto"
          />
          <TextInput
            style={estilosPainel.input}
            value={link}
            onChangeText={setLink}
            placeholder="Link da proposta (opcional)"
            placeholderTextColor={Cores.textoSecundario}
            autoCapitalize="none"
            accessibilityLabel="Link"
          />
          <View style={estilos.linhaBotoes}>
            <Pressable
              onPress={salvarDecisao}
              disabled={salvando}
              style={[estilosPainel.botao, salvando && estilosPainel.botaoDesabilitado]}
              accessibilityRole="button"
            >
              <Text style={estilosPainel.botaoTexto}>{salvando ? 'Salvando…' : 'Criar'}</Text>
            </Pressable>
            <Pressable
              onPress={() => setCriando(false)}
              style={estilosPainel.botaoSecundario}
              accessibilityRole="button"
            >
              <Text style={estilosPainel.botaoSecundarioTexto}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setCriando(true)} style={estilosPainel.botao} accessibilityRole="button">
          <Text style={estilosPainel.botaoTexto}>+ Nova decisão</Text>
        </Pressable>
      )}

      {decisoes.length === 0 && (
        <Text style={estilosPainel.ajuda}>Nenhuma decisão registrada ainda.</Text>
      )}

      {decisoes.map((d) => {
        const aberta = abertaId === d.id;
        const fechada = d.status === 'decidida';
        return (
          <View key={d.id} style={estilosPainel.card}>
            <Pressable
              onPress={() => abrir(d)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${d.titulo}`}
            >
              <View style={estilos.cabecalho}>
                <Text style={estilosPainel.titulo}>{d.titulo}</Text>
                <View style={[estilos.selo, fechada ? estilos.seloFechada : estilos.seloAberta]}>
                  <Text style={estilos.seloTexto}>{ROTULO_STATUS[d.status]}</Text>
                </View>
              </View>
              <Text style={estilosPainel.ajuda}>
                {fechada && d.decidido_em
                  ? `Fechada em ${formatarDataHora(d.decidido_em)}`
                  : `Aberta em ${formatarDataHora(d.criado_em)}`}
              </Text>
            </Pressable>

            {aberta && (
              <View style={estilos.detalhe}>
                {d.contexto ? <Text style={estilos.contexto}>{d.contexto}</Text> : null}
                <Previa id={d.previa} />
                {d.link ? <Text style={estilos.link}>{d.link}</Text> : null}

                {carregandoFio ? (
                  <Text style={estilosPainel.ajuda}>Carregando histórico…</Text>
                ) : manifestacoes.length === 0 ? (
                  <Text style={estilosPainel.ajuda}>Nenhuma manifestação registrada.</Text>
                ) : (
                  manifestacoes.map((m) => (
                    <View key={m.id} style={estilos.manifestacao}>
                      <Text style={estilos.manifestacaoTopo}>
                        {m.autor_nome} · {formatarDataHora(m.criado_em)} · {ROTULO_POSICAO[m.posicao]}
                      </Text>
                      <Text style={estilos.manifestacaoTexto}>{m.texto}</Text>
                    </View>
                  ))
                )}

                {!fechada && (
                  <>
                    <View style={estilos.chips}>
                      {POSICOES.map((p) => (
                        <Pressable
                          key={p}
                          onPress={() => setPosicao(p)}
                          style={[estilosPainel.chip, posicao === p && estilosPainel.chipAtivo]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: posicao === p }}
                        >
                          <Text
                            style={[estilosPainel.chipTexto, posicao === p && estilosPainel.chipTextoAtivo]}
                          >
                            {ROTULO_POSICAO[p]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      style={[estilosPainel.input, estilos.campoLongo]}
                      value={texto}
                      onChangeText={setTexto}
                      placeholder="O que você quer registrar"
                      placeholderTextColor={Cores.textoSecundario}
                      multiline
                      accessibilityLabel="Texto da manifestação"
                    />
                  </>
                )}

                <View style={estilos.linhaBotoes}>
                  {!fechada && (
                    <Pressable
                      onPress={() => enviarManifestacao(d)}
                      disabled={salvando}
                      style={[estilosPainel.botao, salvando && estilosPainel.botaoDesabilitado]}
                      accessibilityRole="button"
                    >
                      <Text style={estilosPainel.botaoTexto}>{salvando ? 'Salvando…' : 'Registrar'}</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => copiar(d)}
                    style={estilosPainel.botaoSecundario}
                    accessibilityRole="button"
                  >
                    <Text style={estilosPainel.botaoSecundarioTexto}>Copiar tudo</Text>
                  </Pressable>
                  {!fechada && (
                    <Pressable
                      onPress={() => fechar(d)}
                      style={estilosPainel.botaoSecundario}
                      accessibilityRole="button"
                    >
                      <Text style={estilosPainel.botaoSecundarioTexto}>Fechar decisão</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm },
  selo: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RaioBorda.full },
  seloAberta: { backgroundColor: 'rgba(181,139,70,0.16)' },
  seloFechada: { backgroundColor: 'rgba(88,117,101,0.14)' },
  seloTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 12, color: Cores.textoSecundario },
  detalhe: { marginTop: Espacamento.md, gap: Espacamento.sm },
  contexto: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoPrimario, lineHeight: 20 },
  link: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.acento },
  manifestacao: {
    borderLeftWidth: 2,
    borderLeftColor: Cores.cardBorda,
    paddingLeft: Espacamento.md,
    gap: 2,
  },
  manifestacaoTopo: { fontFamily: Fontes.corpoSemibold, fontSize: 12, color: Cores.textoSecundario },
  manifestacaoTexto: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoPrimario, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espacamento.xs },
  campoLongo: { minHeight: 80, textAlignVertical: 'top' },
  linhaBotoes: { flexDirection: 'row', flexWrap: 'wrap', gap: Espacamento.sm, marginTop: Espacamento.xs },
});
