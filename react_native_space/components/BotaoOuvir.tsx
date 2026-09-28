import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { Hapticos } from '../utils/haptics';
import {
  falar, montarRoteiro, pararDeFalar, vozDisponivel, type ParteDaLeitura,
} from '../utils/vozLeitura';

/**
 * "Ouvir a leitura" — a etiqueta Áudio das telas de resultado deixando de ser
 * promessa.
 *
 * Usa a voz do próprio aparelho, então não custa por leitura e não depende de
 * servidor. Some quando o navegador não tem voz, em vez de mostrar um botão
 * que não faz nada.
 *
 * A fala começa dentro do toque, de propósito: o Safari do iPhone recusa voz
 * que não venha de um gesto da pessoa.
 */

interface Props {
  partes: ParteDaLeitura[];
}

export function BotaoOuvir({ partes }: Props) {
  const [falando, setFalando] = useState(false);
  const [erro, setErro] = useState(false);
  const disponivel = vozDisponivel();

  // Sair da tela com a voz falando deixaria a leitura tocando sozinha.
  useEffect(() => () => pararDeFalar(), []);

  const alternar = useCallback(() => {
    Hapticos.impactoLeve();
    if (falando) {
      pararDeFalar();
      setFalando(false);
      return;
    }
    setErro(false);
    const ok = falar(montarRoteiro(partes), {
      aoTerminar: () => setFalando(false),
      aoFalhar: () => { setFalando(false); setErro(true); },
    });
    setFalando(ok);
    if (!ok) setErro(true);
  }, [falando, partes]);

  if (!disponivel) return null;

  return (
    <View style={estilos.area}>
      <Pressable
        onPress={alternar}
        accessibilityRole="button"
        accessibilityLabel={falando ? 'Parar a leitura em voz' : 'Ouvir a leitura em voz'}
        style={estilos.botao}
      >
        <Ionicons
          name={falando ? 'stop-circle-outline' : 'volume-high-outline'}
          size={18}
          color={Cores.acento}
        />
        <Text style={estilos.texto}>{falando ? 'Parar' : 'Ouvir a leitura'}</Text>
      </Pressable>
      {erro && (
        <Text style={estilos.erro}>
          Este navegador não conseguiu falar a leitura. O texto continua aí.
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  area: { gap: 6, marginBottom: Espacamento.md },
  botao: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Espacamento.sm, alignSelf: 'center',
    borderWidth: 1, borderColor: Cores.acento, borderRadius: RaioBorda.full,
    paddingVertical: 10, paddingHorizontal: Espacamento.lg,
  },
  texto: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.acento },
  erro: {
    fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario,
    textAlign: 'center',
  },
});
