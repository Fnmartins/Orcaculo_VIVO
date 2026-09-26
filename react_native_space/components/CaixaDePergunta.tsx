import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from './Button';
import { SemaforoUso } from './SemaforoUso';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { Hapticos } from '../utils/haptics';
import { useAuth } from '../contexts/AuthContext';
import { maiorDeIdade, IDADE_MINIMA } from '../utils/idade';
import { LIMITE_PERGUNTA, PERGUNTAS_POR_LEITURA, SUGESTOES } from '../utils/perguntas';
import {
  denunciarConteudoIA,
  gravarConsentimentoPerguntas,
  lerConsentimentoPerguntas,
  perguntar,
  type ContextoPergunta,
} from '../services/perguntas';

/**
 * A caixa de pergunta, depois da leitura.
 *
 * O desenho é o que o conselho aprovou, e cada limite tem motivo:
 *
 * - **Três por leitura**, e nunca memória de uma para a outra. Sem isso a caixa
 *   vira chat, e um chat de oráculo promete companhia que o app não entrega.
 * - **Sugestões prontas** antes do campo vazio: quem nunca perguntou a um
 *   oráculo trava no cursor piscando.
 * - **Filtro de crise em código, antes da IA** (utils/perguntas, com cópia no
 *   servidor). Resposta de crise não gasta pergunta e não é guardada.
 * - **Porta de idade** e **botão de denúncia**: os dois são exigência de loja,
 *   e o botão é o único caminho de volta quando o modelo escreve o que não devia.
 */

interface Props {
  contexto: ContextoPergunta;
  /** O texto da leitura, para a denúncia levar o que a pessoa leu na tela. */
  textoDaLeitura: string;
}

interface Item {
  pergunta: string;
  resposta: string;
  crise: boolean;
  denunciada: boolean;
}

export function CaixaDePergunta({ contexto, textoDaLeitura }: Props) {
  const { perfil, sessao } = useAuth();
  const [pergunta, setPergunta] = useState('');
  const [historico, setHistorico] = useState<Item[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [consentimento, setConsentimento] = useState(false);
  const [restanteHoje, setRestanteHoje] = useState<number | null>(null);
  const [denunciando, setDenunciando] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');

  const usuarioId = sessao?.user?.id ?? null;

  useEffect(() => {
    if (!usuarioId) return;
    let vivo = true;
    lerConsentimentoPerguntas(usuarioId).then((valor) => {
      if (vivo) setConsentimento(valor);
    });
    return () => { vivo = false; };
  }, [usuarioId]);

  // Resposta de crise não entra na conta: ela nem chegou ao modelo.
  const usadas = historico.filter((item) => !item.crise).length;
  const restamNaLeitura = Math.max(0, PERGUNTAS_POR_LEITURA - usadas);
  const podeIr = maiorDeIdade(perfil?.data_nascimento);

  const enviar = useCallback(async () => {
    if (enviando || !pergunta.trim() || restamNaLeitura === 0) return;
    setEnviando(true);
    setErro(null);
    Hapticos.impactoLeve();
    try {
      const resultado = await perguntar(contexto, pergunta);
      setHistorico((atual) => [...atual, {
        pergunta: pergunta.trim(),
        resposta: resultado.resposta,
        crise: resultado.crise,
        denunciada: false,
      }]);
      setRestanteHoje(resultado.restanteHoje);
      setPergunta('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível perguntar agora.');
    } finally {
      setEnviando(false);
    }
  }, [contexto, enviando, pergunta, restamNaLeitura]);

  const alternarConsentimento = useCallback(async () => {
    if (!usuarioId) return;
    const novo = !consentimento;
    setConsentimento(novo);
    try {
      await gravarConsentimentoPerguntas(usuarioId, novo);
    } catch {
      setConsentimento(!novo);
      setErro('Não foi possível salvar a sua escolha agora.');
    }
  }, [consentimento, usuarioId]);

  const enviarDenuncia = useCallback(async (indice: number) => {
    const item = historico[indice];
    if (!item) return;
    try {
      await denunciarConteudoIA({
        origem: 'pergunta',
        oraculo: contexto.oraculo,
        conteudo: `Pergunta: ${item.pergunta}\n\nResposta: ${item.resposta}\n\nLeitura: ${textoDaLeitura}`,
        motivo,
      });
      setHistorico((atual) => atual.map((it, i) => (
        i === indice ? { ...it, denunciada: true } : it
      )));
      setDenunciando(null);
      setMotivo('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a denúncia.');
    }
  }, [contexto.oraculo, historico, motivo, textoDaLeitura]);

  if (!usuarioId) return null;

  if (!podeIr) {
    return (
      <View style={estilos.caixa}>
        <Text style={estilos.titulo}>Perguntar sobre esta leitura</Text>
        <Text style={estilos.aviso}>
          {perfil?.data_nascimento
            ? `As perguntas escritas são para maiores de ${IDADE_MINIMA} anos.`
            : `Para perguntar, complete a sua data de nascimento no perfil — as perguntas escritas são para maiores de ${IDADE_MINIMA} anos.`}
        </Text>
        {!perfil?.data_nascimento && (
          <Button
            variante="outline"
            label="Abrir o perfil"
            icone="person-outline"
            onPress={() => router.push('/perfil')}
          />
        )}
      </View>
    );
  }

  return (
    <View style={estilos.caixa}>
      <Text style={estilos.titulo}>Perguntar sobre esta leitura</Text>
      <SemaforoUso tipo="pergunta" rotulo="Perguntas" />
      <Text style={estilos.subtitulo}>
        {restamNaLeitura > 0
          ? `${restamNaLeitura} de ${PERGUNTAS_POR_LEITURA} perguntas nesta leitura. Cada pergunta olha o que saiu aqui — uma não lembra da outra.`
          : 'Você usou as três perguntas desta leitura. Uma nova leitura abre outras três.'}
      </Text>

      {historico.map((item, indice) => (
        <View key={`${indice}-${item.pergunta}`} style={estilos.troca}>
          <Text style={estilos.perguntaFeita}>{item.pergunta}</Text>
          <Text style={[estilos.resposta, item.crise && estilos.respostaCrise]}>
            {item.resposta}
          </Text>

          {!item.crise && !item.denunciada && denunciando !== indice && (
            <Pressable
              onPress={() => { setDenunciando(indice); setMotivo(''); }}
              accessibilityRole="button"
              accessibilityLabel="Denunciar esta resposta"
              style={estilos.linkDenuncia}
            >
              <Ionicons name="flag-outline" size={13} color={Cores.textoSecundario} />
              <Text style={estilos.linkDenunciaTexto}>Denunciar esta resposta</Text>
            </Pressable>
          )}

          {item.denunciada && (
            <Text style={estilos.denunciaEnviada}>
              Denúncia enviada. Vamos olhar esta resposta.
            </Text>
          )}

          {denunciando === indice && (
            <View style={estilos.formDenuncia}>
              <TextInput
                value={motivo}
                onChangeText={setMotivo}
                placeholder="O que está errado aqui? (opcional)"
                placeholderTextColor={Cores.textoSecundario}
                style={estilos.campoMotivo}
                multiline
                maxLength={500}
                accessibilityLabel="Motivo da denúncia"
              />
              <View style={estilos.linhaBotoes}>
                <Button variante="ghost" label="Cancelar" onPress={() => setDenunciando(null)} />
                <Button
                  variante="outline"
                  label="Enviar denúncia"
                  onPress={() => enviarDenuncia(indice)}
                />
              </View>
            </View>
          )}
        </View>
      ))}

      {restamNaLeitura > 0 && (
        <>
          {historico.length === 0 && (
            <View style={estilos.sugestoes}>
              {SUGESTOES[contexto.oraculo].map((texto) => (
                <Pressable
                  key={texto}
                  onPress={() => setPergunta(texto)}
                  accessibilityRole="button"
                  accessibilityLabel={`Usar a pergunta: ${texto}`}
                  style={estilos.sugestao}
                >
                  <Text style={estilos.sugestaoTexto}>{texto}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <TextInput
            value={pergunta}
            onChangeText={setPergunta}
            placeholder="Escreva a sua pergunta"
            placeholderTextColor={Cores.textoSecundario}
            style={estilos.campo}
            multiline
            maxLength={LIMITE_PERGUNTA}
            accessibilityLabel="Sua pergunta sobre esta leitura"
          />
          <Text style={estilos.contador}>{pergunta.length}/{LIMITE_PERGUNTA}</Text>

          <Button
            label={enviando ? 'Perguntando…' : 'Perguntar'}
            icone="sparkles-outline"
            loading={enviando}
            disabled={!pergunta.trim()}
            onPress={enviar}
            larguraTotal
          />
        </>
      )}

      {erro && <Text style={estilos.erro}>{erro}</Text>}

      {restanteHoje !== null && (
        <Text style={estilos.contadorDia}>
          {restanteHoje === 0
            ? 'Foram as suas perguntas de hoje.'
            : `Ainda cabem ${restanteHoje} perguntas hoje no seu plano.`}
        </Text>
      )}

      <Pressable
        onPress={alternarConsentimento}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consentimento }}
        accessibilityLabel="Autorizar guardar minhas perguntas sem ligar ao meu nome"
        style={estilos.consentimento}
      >
        <Ionicons
          name={consentimento ? 'checkbox' : 'square-outline'}
          size={20}
          color={consentimento ? Cores.acento : Cores.textoSecundario}
        />
        <View style={estilos.consentimentoTextos}>
          <Text style={estilos.consentimentoTitulo}>
            Pode guardar as minhas perguntas para melhorar o Arcanus
          </Text>
          <Text style={estilos.consentimentoDetalhe}>
            Guardadas sem nome, sem conta e sem hora — só a pergunta e o símbolo que saiu.
            Você pode desmarcar quando quiser, e perguntas sobre saúde ou momentos difíceis
            nunca são guardadas.
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    backgroundColor: Cores.cardFundo,
    borderWidth: 1, borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.lg, padding: Espacamento.md,
    marginBottom: Espacamento.lg, gap: Espacamento.sm,
  },
  titulo: { fontFamily: Fontes.corpoNegrito, fontSize: 16, color: Cores.textoClaro },
  subtitulo: {
    fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario, lineHeight: 19,
  },
  aviso: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoClaro, lineHeight: 21 },

  sugestoes: { gap: 6, marginTop: Espacamento.xs },
  sugestao: {
    borderWidth: 1, borderColor: Cores.cardBorda, borderRadius: RaioBorda.md,
    paddingVertical: 8, paddingHorizontal: Espacamento.sm,
    backgroundColor: 'rgba(88, 117, 101, 0.05)',
  },
  sugestaoTexto: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoClaro },

  campo: {
    borderWidth: 1, borderColor: Cores.cardBorda, borderRadius: RaioBorda.md,
    padding: Espacamento.sm, minHeight: 84, textAlignVertical: 'top',
    fontFamily: Fontes.corpo, fontSize: 15, color: Cores.textoClaro,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  contador: {
    fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario, textAlign: 'right',
  },

  troca: {
    gap: 6, paddingVertical: Espacamento.sm,
    borderTopWidth: 1, borderTopColor: Cores.cardBorda,
  },
  perguntaFeita: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.textoClaro },
  resposta: { fontFamily: Fontes.corpo, fontSize: 15, color: Cores.textoClaro, lineHeight: 23 },
  respostaCrise: { color: Cores.erro },

  linkDenuncia: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  linkDenunciaTexto: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario },
  denunciaEnviada: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario },
  formDenuncia: { gap: Espacamento.xs, marginTop: Espacamento.xs },
  campoMotivo: {
    borderWidth: 1, borderColor: Cores.cardBorda, borderRadius: RaioBorda.md,
    padding: Espacamento.sm, minHeight: 56, textAlignVertical: 'top',
    fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoClaro,
  },
  linhaBotoes: { flexDirection: 'row', gap: Espacamento.sm },

  erro: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.erro },
  contadorDia: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario },

  consentimento: {
    flexDirection: 'row', gap: Espacamento.sm, alignItems: 'flex-start',
    marginTop: Espacamento.xs, paddingTop: Espacamento.sm,
    borderTopWidth: 1, borderTopColor: Cores.cardBorda,
  },
  consentimentoTextos: { flex: 1 },
  consentimentoTitulo: { fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.textoClaro },
  consentimentoDetalhe: {
    fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario,
    lineHeight: 18, marginTop: 2,
  },
});
