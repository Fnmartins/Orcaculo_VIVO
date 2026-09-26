import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import {
  listarDenuncias, listarPerguntasAnonimas, resolverDenuncia,
  type DenunciaIA, type OrigemDenuncia, type PerguntaAnonima,
} from '../../services/moderacao';
import { ehAcessoNegado } from '../../services/acessoNegado';
import { ehSessaoExpirada } from '../../services/sessaoExpirada';
import { formatarDataHora } from '../../utils/decisoes';
import { mostrarAlerta } from '../../utils/alerta';
import { EstadoCarregamento } from './EstadoCarregamento';
import { irParaLoginPorSessaoExpirada } from './sessao';
import { estilosPainel } from './estilos';
import type { PropsAbaManager } from './tipos';

/**
 * Moderação: as denúncias de conteúdo de IA e as perguntas que as pessoas
 * autorizaram guardar.
 *
 * Duas coisas que só existiam no banco. A denúncia sem esta tela era um botão
 * mandando texto para um lugar que ninguém abria; a pergunta guardada, um
 * registro sem leitor — e nesse caso guardar não se justifica.
 */

const ROTULO_ORIGEM: Record<OrigemDenuncia, string> = {
  pergunta: 'Pergunta',
  interpretacao: 'Aprofundamento',
  imagem: 'Leitura por imagem',
};

export function AbaModeracao({ aoPerderAcesso }: PropsAbaManager) {
  const [denuncias, setDenuncias] = useState<DenunciaIA[] | null>(null);
  const [perguntas, setPerguntas] = useState<PerguntaAnonima[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const tratarFalha = useCallback((e: unknown, mensagem: string) => {
    if (ehSessaoExpirada(e)) {
      irParaLoginPorSessaoExpirada();
      return;
    }
    if (ehAcessoNegado(e)) {
      aoPerderAcesso();
      return;
    }
    setErro(e instanceof Error ? e.message : mensagem);
  }, [aoPerderAcesso]);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const lista = await listarDenuncias();
      setDenuncias(lista);
      // As perguntas são secundárias: falhar aqui não pode esconder as
      // denúncias, que são o que precisa de resposta.
      try {
        setPerguntas(await listarPerguntasAnonimas());
      } catch {
        setPerguntas([]);
      }
    } catch (e) {
      tratarFalha(e, 'Não foi possível carregar a moderação.');
    }
  }, [tratarFalha]);

  useEffect(() => { carregar(); }, [carregar]);

  const alternar = useCallback(async (denuncia: DenunciaIA) => {
    setSalvando(denuncia.id);
    try {
      const atualizada = await resolverDenuncia(denuncia.id, !denuncia.resolvida);
      setDenuncias((atual) => (atual ?? []).map((d) => (d.id === atualizada.id ? atualizada : d)));
    } catch (e) {
      if (ehSessaoExpirada(e)) {
        irParaLoginPorSessaoExpirada();
      } else if (ehAcessoNegado(e)) {
        aoPerderAcesso();
      } else {
        mostrarAlerta('Não foi possível salvar', e instanceof Error ? e.message : 'Tente de novo.');
      }
    } finally {
      setSalvando(null);
    }
  }, [aoPerderAcesso]);

  if (denuncias === null) return <EstadoCarregamento erro={erro} aoTentarDeNovo={carregar} />;

  const abertas = denuncias.filter((d) => !d.resolvida).length;

  return (
    <ScrollView contentContainerStyle={estilosPainel.conteudo}>
      <View style={estilosPainel.card}>
        <Text style={estilosPainel.titulo}>Denúncias de conteúdo de IA</Text>
        <Text style={estilosPainel.ajuda}>
          {denuncias.length === 0
            ? 'Nenhuma denúncia. É o estado que a gente quer ver.'
            : `${abertas} em aberto, de ${denuncias.length} no total.`}
        </Text>
      </View>

      {denuncias.map((denuncia) => (
        <View key={denuncia.id} style={estilosPainel.card}>
          <View style={estilos.linhaTopo}>
            <View style={[estilos.etiqueta, denuncia.resolvida && estilos.etiquetaResolvida]}>
              <Text style={estilos.etiquetaTexto}>
                {ROTULO_ORIGEM[denuncia.origem]}
                {denuncia.oraculo ? ` · ${denuncia.oraculo}` : ''}
              </Text>
            </View>
            <Text style={estilos.data}>{formatarDataHora(denuncia.criado_em)}</Text>
          </View>

          {denuncia.motivo ? (
            <Text style={estilos.motivo}>“{denuncia.motivo}”</Text>
          ) : (
            <Text style={estilos.semMotivo}>Sem motivo escrito.</Text>
          )}

          <Text style={estilos.conteudo}>{denuncia.conteudo}</Text>

          <Pressable
            onPress={() => alternar(denuncia)}
            disabled={salvando === denuncia.id}
            accessibilityRole="button"
            accessibilityLabel={denuncia.resolvida
              ? 'Reabrir esta denúncia'
              : 'Marcar esta denúncia como resolvida'}
            style={[
              denuncia.resolvida ? estilosPainel.botaoSecundario : estilosPainel.botao,
              salvando === denuncia.id && estilosPainel.botaoDesabilitado,
            ]}
          >
            <Text style={denuncia.resolvida
              ? estilosPainel.botaoSecundarioTexto
              : estilosPainel.botaoTexto}
            >
              {denuncia.resolvida ? 'Reabrir' : 'Marcar como resolvida'}
            </Text>
          </Pressable>
        </View>
      ))}

      <View style={estilosPainel.card}>
        <Text style={estilosPainel.titulo}>Perguntas guardadas</Text>
        <Text style={estilosPainel.ajuda}>
          Só de quem autorizou, sem nome, sem conta e sem hora — e nunca as de saúde ou de
          momento difícil. Servem para saber o que as pessoas de fato perguntam.
        </Text>
        {perguntas.length === 0 && (
          <Text style={estilos.semMotivo}>Nenhuma pergunta guardada ainda.</Text>
        )}
        {perguntas.map((p) => (
          <View key={p.id} style={estilos.pergunta}>
            <Text style={estilos.perguntaTexto}>{p.pergunta}</Text>
            <Text style={estilos.perguntaRodape}>
              {p.oraculo === 'buzios' ? 'Búzios' : 'Tarô'}
              {p.contexto ? ` · ${p.contexto}` : ''} · {p.dia}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  linhaTopo: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: Espacamento.sm,
  },
  etiqueta: {
    borderRadius: RaioBorda.full, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(180,97,75,0.14)',
  },
  etiquetaResolvida: { backgroundColor: 'rgba(88,117,101,0.14)' },
  etiquetaTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 12, color: Cores.textoPrimario },
  data: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario },
  motivo: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.textoPrimario },
  semMotivo: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario },
  conteudo: {
    fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario, lineHeight: 20,
    backgroundColor: 'rgba(88,117,101,0.06)', borderRadius: RaioBorda.md, padding: Espacamento.sm,
  },
  pergunta: {
    borderTopWidth: 1, borderTopColor: Cores.cardBorda,
    paddingTop: Espacamento.sm, gap: 2,
  },
  perguntaTexto: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoPrimario },
  perguntaRodape: { fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario },
});
