import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import {
  ROTULO_STATUS, STATUS_ROADMAP, type ItemRoadmap, type StatusRoadmap,
} from '../../utils/roadmap';
import { mostrarAlerta } from '../../utils/alerta';
import { estilosPainel } from './estilos';

export interface ValoresEditorRoadmap {
  fase: string;
  titulo: string;
  descricao: string | null;
  status: StatusRoadmap;
}

interface Props {
  visivel: boolean;
  /** `null` = item novo. */
  item: ItemRoadmap | null;
  fases: string[];
  salvando: boolean;
  aoSalvar: (valores: ValoresEditorRoadmap) => void;
  aoExcluir?: () => void;
  aoFechar: () => void;
}

export function EditorItemRoadmap({
  visivel, item, fases, salvando, aoSalvar, aoExcluir, aoFechar,
}: Props) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fase, setFase] = useState('');
  const [status, setStatus] = useState<StatusRoadmap>('todo');

  // Preenche só quando abre ou troca de item: recarregar a lista com o editor
  // aberto não pode apagar o que está sendo digitado.
  useEffect(() => {
    if (!visivel) return;
    setTitulo(item?.titulo ?? '');
    setDescricao(item?.descricao ?? '');
    setFase(item?.fase ?? '');
    setStatus(item?.status ?? 'todo');
  }, [visivel, item]);

  function salvar() {
    const t = titulo.trim();
    const f = fase.trim();
    if (!t || !f) {
      mostrarAlerta('Faltam dados', 'Preencha o título e a fase.');
      return;
    }
    aoSalvar({ titulo: t, fase: f, descricao: descricao.trim() || null, status });
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <View style={estilos.overlay}>
        <View style={estilos.card}>
          <ScrollView contentContainerStyle={estilos.corpo} keyboardShouldPersistTaps="handled">
            <Text style={estilos.titulo}>{item ? 'Editar item' : 'Novo item'}</Text>

            <Text style={estilos.rotulo}>Título</Text>
            <TextInput
              style={estilosPainel.input}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="O que precisa ser feito"
              placeholderTextColor={Cores.textoSecundario}
              maxLength={120}
              accessibilityLabel="Título"
            />

            <Text style={estilos.rotulo}>Descrição</Text>
            <TextInput
              style={[estilosPainel.input, estilos.descricao]}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Detalhes (opcional)"
              placeholderTextColor={Cores.textoSecundario}
              multiline
              accessibilityLabel="Descrição"
            />

            <Text style={estilos.rotulo}>Fase</Text>
            <View style={estilos.chips}>
              {fases.map((f) => {
                const ativa = f === fase;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFase(f)}
                    style={[estilosPainel.chip, ativa && estilosPainel.chipAtivo]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativa }}
                  >
                    <Text style={[estilosPainel.chipTexto, ativa && estilosPainel.chipTextoAtivo]}>{f}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={estilosPainel.input}
              value={fase}
              onChangeText={setFase}
              placeholder="ou digite uma fase nova"
              placeholderTextColor={Cores.textoSecundario}
              maxLength={60}
              accessibilityLabel="Fase"
            />

            <Text style={estilos.rotulo}>Status</Text>
            <View style={estilos.chips}>
              {STATUS_ROADMAP.map((s) => {
                const ativo = s === status;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[estilosPainel.chip, ativo && estilosPainel.chipAtivo]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativo }}
                  >
                    <Text style={[estilosPainel.chipTexto, ativo && estilosPainel.chipTextoAtivo]}>
                      {ROTULO_STATUS[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={estilos.botoes}>
              <Pressable
                onPress={aoFechar}
                style={[estilosPainel.botaoSecundario, estilos.botao]}
                accessibilityRole="button"
              >
                <Text style={estilosPainel.botaoSecundarioTexto}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={salvar}
                disabled={salvando}
                style={[estilosPainel.botao, estilos.botao, salvando && estilosPainel.botaoDesabilitado]}
                accessibilityRole="button"
              >
                {salvando
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={estilosPainel.botaoTexto}>Salvar</Text>}
              </Pressable>
            </View>

            {aoExcluir ? (
              <Pressable onPress={aoExcluir} disabled={salvando} style={estilos.excluir} accessibilityRole="button">
                <Text style={estilos.excluirTexto}>Excluir item</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(36,49,45,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Espacamento.lg,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    backgroundColor: Cores.superficie,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.lg,
  },
  corpo: { gap: Espacamento.sm },
  titulo: { fontFamily: Fontes.titulo, fontSize: 20, color: Cores.textoPrimario, marginBottom: Espacamento.xs },
  rotulo: { fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.textoSecundario, marginTop: Espacamento.xs },
  descricao: { minHeight: 72, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espacamento.xs },
  botoes: { flexDirection: 'row', gap: Espacamento.sm, marginTop: Espacamento.md },
  botao: { flex: 1 },
  excluir: { alignItems: 'center', paddingVertical: Espacamento.sm },
  excluirTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.erro },
});
