import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { Hapticos } from '../utils/haptics';

interface RatingConsultaProps {
  aoAvaliar?: (nota: number, comentario: string) => void;
}

export function RatingConsulta({ aoAvaliar }: RatingConsultaProps) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviado, setEnviado] = useState(false);

  // So exibe quando existe uma integracao real para receber os dados.
  if (!aoAvaliar) return null;

  function selecionarNota(n: number) {
    Hapticos.selecao();
    setNota(n);
  }

  function enviar() {
    if (nota === 0) return;
    Hapticos.impactoMedio();
    setEnviado(true);
    aoAvaliar?.(nota, comentario);
  }

  if (enviado) {
    return (
      <View style={estilos.container}>
        <View style={estilos.agradecimento}>
          <Ionicons name="heart" size={20} color={Cores.acento} />
          <Text style={estilos.agradecimentoTexto}>Obrigado pela avaliação!</Text>
        </View>
      </View>
    );
  }

  const MENSAGENS = ['', 'Não gostei', 'Regular', 'Boa leitura', 'Muito boa!', 'Incrível! ✨'];

  return (
    <View style={estilos.container}>
      <View style={estilos.divisor} />
      <Text style={estilos.titulo}>Como foi sua leitura?</Text>

      {/* Estrelas */}
      <View style={estilos.estrelas}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => selecionarNota(n)}
            accessibilityRole="button"
            accessibilityLabel={`Avaliar com ${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
            accessibilityState={{ selected: n === nota }}
          >
            <Ionicons
              name={n <= nota ? 'star' : 'star-outline'}
              size={32}
              color={n <= nota ? Cores.acento : Cores.textoSecundario}
            />
          </Pressable>
        ))}
      </View>

      {nota > 0 && (
        <Text style={estilos.mensagemNota}>{MENSAGENS[nota]}</Text>
      )}

      {nota > 0 && nota <= 3 && (
        <TextInput
          style={estilos.comentarioInput}
          placeholder="O que poderia melhorar? (opcional)"
          placeholderTextColor={Cores.textoSecundario}
          value={comentario}
          onChangeText={setComentario}
          multiline
          maxLength={200}
        />
      )}

      {nota > 0 && (
        <Pressable
          onPress={enviar}
          style={({ pressed }) => [estilos.enviarBotao, { opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Enviar avaliação"
        >
          <Text style={estilos.enviarTexto}>Enviar avaliação</Text>
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    paddingBottom: Espacamento.md,
  },
  divisor: {
    height: 1,
    backgroundColor: 'rgba(88,117,101,0.08)',
    marginVertical: Espacamento.lg,
  },
  titulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginBottom: Espacamento.md,
  },
  estrelas: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Espacamento.sm,
    marginBottom: Espacamento.sm,
  },
  mensagemNota: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.acento,
    textAlign: 'center',
    marginBottom: Espacamento.sm,
  },
  comentarioInput: {
    backgroundColor: 'rgba(88,117,101,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(88,117,101,0.14)',
    borderRadius: RaioBorda.md,
    padding: Espacamento.md,
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoClaro,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: Espacamento.sm,
  },
  enviarBotao: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    borderRadius: RaioBorda.lg,
    paddingVertical: 10,
    alignItems: 'center',
  },
  enviarTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.acento,
  },
  agradecimento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Espacamento.md,
  },
  agradecimentoTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.textoClaro,
  },
});
