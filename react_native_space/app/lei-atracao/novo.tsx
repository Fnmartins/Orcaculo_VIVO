import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { CATEGORIAS, CategoriaDesejo, adicionarDesejo } from '../../data/lei-atracao';

export default function TelaNovoDesejo() {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<CategoriaDesejo>('prosperidade');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (titulo.trim().length < 3) { setErro('Dê um título ao seu desejo.'); return; }
    if (descricao.trim().length < 10) { setErro('Descreva seu desejo com mais detalhes.'); return; }
    setErro('');
    setSalvando(true);
    try {
      const novo = await adicionarDesejo({ titulo: titulo.trim(), descricao: descricao.trim(), categoria });
      Hapticos.impactoMedio();
      router.replace({ pathname: '/lei-atracao/ritual', params: { id: novo.id } });
    } catch {
      setErro('Não foi possível salvar.');
      setSalvando(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={estilos.header}>
            <Pressable onPress={() => { Hapticos.impactoLeve(); router.back(); }} style={estilos.voltar}>
              <Ionicons name="arrow-back" size={24} color={Cores.textoClaro} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={estilos.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={estilos.titulo}>Novo desejo</Text>
            <Text style={estilos.subtitulo}>
              Escreva seu desejo no <Text style={estilos.destaque}>presente</Text>, como se já fosse realidade.
            </Text>

            <Text style={estilos.label}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.categorias}>
              {CATEGORIAS.map(c => (
                <Pressable
                  key={c.id}
                  onPress={() => { Hapticos.impactoLeve(); setCategoria(c.id); }}
                  style={[estilos.categoriaChip, categoria === c.id && { backgroundColor: c.cor + '25', borderColor: c.cor }]}
                >
                  <Ionicons name={c.icone as any} size={16} color={categoria === c.id ? c.cor : Cores.textoSecundario} />
                  <Text style={[estilos.categoriaChipTexto, categoria === c.id && { color: c.cor, fontFamily: Fontes.corpoSemibold }]}>
                    {c.titulo}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={estilos.label}>Título</Text>
            <TextInput
              style={estilos.input}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ex: Meu novo emprego dos sonhos"
              placeholderTextColor={Cores.textoSecundario}
              maxLength={80}
            />

            <Text style={estilos.label}>Descrição</Text>
            <TextInput
              style={[estilos.input, estilos.textarea]}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Descreva no presente. Ex: Eu tenho um trabalho que amo, onde uso meus talentos."
              placeholderTextColor={Cores.textoSecundario}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={estilos.contador}>{descricao.length}/500</Text>

            {erro ? (
              <View style={estilos.erroBox}>
                <Ionicons name="alert-circle" size={16} color="#E74C3C" />
                <Text style={estilos.erroTexto}>{erro}</Text>
              </View>
            ) : null}

            <View style={estilos.dica}>
              <Ionicons name="bulb-outline" size={16} color={Cores.acento} />
              <Text style={estilos.dicaTexto}>
                <Text style={{ fontFamily: Fontes.corpoNegrito, color: Cores.acento }}>Dica: </Text>
                Escreva como se já tivesse acontecido. Sinta a emoção da conquista.
              </Text>
            </View>
          </ScrollView>

          <View style={estilos.footer}>
            <Pressable onPress={salvar} disabled={salvando} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
              <LinearGradient colors={Cores.gradienteAcento} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[estilos.botao, salvando && { opacity: 0.6 }]}>
                <Text style={estilos.botaoTexto}>{salvando ? 'Salvando...' : 'Iniciar Ritual'}</Text>
                <Ionicons name="sparkles" size={18} color={Cores.fundoEscuro} />
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Espacamento.lg, paddingTop: Espacamento.sm },
  voltar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: Espacamento.lg, paddingTop: Espacamento.lg, paddingBottom: Espacamento.xl },
  titulo: { fontFamily: Fontes.titulo, fontSize: 26, fontWeight: '700', color: Cores.textoClaro, marginBottom: Espacamento.xs },
  subtitulo: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.textoSecundario, lineHeight: 21, marginBottom: Espacamento.lg },
  destaque: { color: Cores.acento, fontFamily: Fontes.corpoSemibold },
  label: { fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.textoClaro, marginBottom: Espacamento.sm, marginTop: Espacamento.sm },
  categorias: { gap: 8, paddingRight: Espacamento.md, marginBottom: Espacamento.sm },
  categoriaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RaioBorda.full },
  categoriaChipTexto: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario },
  input: { backgroundColor: Cores.cardFundo, borderWidth: 1, borderColor: Cores.cardBorda, borderRadius: RaioBorda.md, paddingHorizontal: Espacamento.md, paddingVertical: 14, fontFamily: Fontes.corpo, fontSize: 15, color: Cores.textoClaro },
  textarea: { minHeight: 120, paddingTop: 14 },
  contador: { fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario, textAlign: 'right', marginTop: 4 },
  erroBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(231, 76, 60, 0.1)', borderWidth: 1, borderColor: 'rgba(231, 76, 60, 0.3)', borderRadius: RaioBorda.md, padding: Espacamento.sm, marginTop: Espacamento.sm },
  erroTexto: { fontFamily: Fontes.corpo, fontSize: 13, color: '#E74C3C', flex: 1 },
  dica: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(212, 175, 55, 0.08)', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)', borderRadius: RaioBorda.md, padding: Espacamento.sm, marginTop: Espacamento.md },
  dicaTexto: { flex: 1, fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoClaro, lineHeight: 18 },
  footer: { paddingHorizontal: Espacamento.lg, paddingBottom: Espacamento.md, paddingTop: Espacamento.sm },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: RaioBorda.full, paddingVertical: Espacamento.md, gap: 8 },
  botaoTexto: { fontFamily: Fontes.corpoNegrito, fontSize: 16, color: Cores.fundoEscuro },
});
