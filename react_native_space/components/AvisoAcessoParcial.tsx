import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { fraseDoVencimento } from '../supabase/functions/_shared/limites';

/**
 * O que aparece ao tocar num oráculo que tem parte grátis, depois do acesso vencer.
 *
 * Existe porque o app tinha **um** cadeado para **dois** significados. No card de
 * leitura por imagem o cadeado quer dizer "você não entra" — não há versão grátis ali.
 * No tarô, nos búzios e no mapa astral ele quer dizer "parte disto continua sua", e
 * mandar essas pessoas direto para os planos esconderia o que elas ainda podem usar.
 *
 * Por isso a escolha é explícita: o que segue aberto, o que já ficou guardado, e o
 * caminho para destravar o resto. Custa um toque a mais a quem só quer a leitura
 * grátis; em troca, é o único lugar onde o app explica o que a pessoa perdeu e oferece
 * a volta.
 */

export type DestinoDoAviso = 'gratis' | 'anteriores' | 'planos';

interface Props {
  visivel: boolean;
  /** O nome do oráculo, como aparece no card. */
  titulo: string;
  /** O que continua aberto neste oráculo, na voz dele. */
  explicacao: string;
  venceuEm: string | null;
  aoFechar: () => void;
  aoEscolher: (destino: DestinoDoAviso) => void;
}

interface Escolha {
  destino: DestinoDoAviso;
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  apoio: string;
}

const ESCOLHAS: Escolha[] = [
  { destino: 'gratis', icone: 'sparkles-outline', titulo: 'Fazer a leitura grátis', apoio: 'O que já era seu' },
  { destino: 'anteriores', icone: 'time-outline', titulo: 'Ver minhas leituras anteriores', apoio: 'O que você já guardou' },
  { destino: 'planos', icone: 'lock-open-outline', titulo: 'Liberar o aprofundamento com IA', apoio: 'Ver os planos' },
];

export function AvisoAcessoParcial({
  visivel, titulo, explicacao, venceuEm, aoFechar, aoEscolher,
}: Props) {
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      {/* O fundo fecha ao toque: num aviso que não bloqueia nada, obrigar a pessoa a
          achar o botão de fechar trataria como obstáculo o que é explicação. */}
      <Pressable style={estilos.fundo} onPress={aoFechar} accessibilityLabel="Fechar" />
      <View style={estilos.ancora} pointerEvents="box-none">
        <View style={estilos.folha} accessibilityViewIsModal>
          <Text style={estilos.titulo}>{titulo}</Text>
          <Text style={estilos.explicacao}>
            {`${fraseDoVencimento(venceuEm)} ${explicacao}`}
          </Text>

          {ESCOLHAS.map(({ destino, icone, titulo: rotulo, apoio }) => {
            const destacado = destino === 'planos';
            return (
              <Pressable
                key={destino}
                onPress={() => aoEscolher(destino)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  estilos.escolha,
                  destacado && estilos.escolhaDestacada,
                  pressed && estilos.pressionado,
                ]}
              >
                <Ionicons
                  name={icone}
                  size={20}
                  color={destacado ? Cores.acento : Cores.textoSecundario}
                />
                <View style={estilos.escolhaTexto}>
                  <Text style={[estilos.escolhaTitulo, destacado && estilos.escolhaTituloDestacado]}>
                    {rotulo}
                  </Text>
                  <Text style={estilos.escolhaApoio}>{apoio}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Cores.textoSecundario} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(36, 49, 45, 0.45)' },
  ancora: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    padding: Espacamento.md,
  },
  folha: {
    backgroundColor: Cores.superficie,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.lg,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    color: Cores.textoPrimario,
  },
  explicacao: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    lineHeight: 21,
    color: Cores.textoSecundario,
    marginTop: Espacamento.sm,
    marginBottom: Espacamento.md,
  },
  escolha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espacamento.sm,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.md,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  // Borda de dois pixels, e não fundo colorido: a folha inteira é clara, e preencher
  // este item faria os outros dois parecerem desligados.
  escolhaDestacada: { borderWidth: 2, borderColor: Cores.acento },
  pressionado: { opacity: 0.85 },
  escolhaTexto: { flex: 1 },
  escolhaTitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoPrimario,
  },
  escolhaTituloDestacado: { color: Cores.acento },
  escolhaApoio: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    marginTop: 1,
  },
});
