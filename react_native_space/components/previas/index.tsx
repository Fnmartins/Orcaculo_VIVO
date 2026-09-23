import type { ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MesaBuzios } from '../MesaBuzios';
import { PeneiraProposta } from './PeneiraProposta';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';

/**
 * Prévias de decisão: o desenho da proposta dentro da própria aba Decisões.
 *
 * A primeira versão mandava um link para a página onde a proposta tinha sido
 * desenhada. Só que essa página é privada e não abre para o sócio — decidir
 * design por link que o outro não abre é o mesmo que não mostrar nada.
 *
 * Uma decisão guarda o identificador da prévia na coluna `decisoes.previa`.
 * Identificador desconhecido (ou nulo) não mostra nada: decisão sem desenho
 * continua sendo só texto, como antes.
 */

interface DefinicaoPrevia {
  titulo: string;
  render: (largura: number) => ReactNode;
}

function Quadro({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <View style={estilos.quadro}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <View style={estilos.palco}>{children}</View>
    </View>
  );
}

const PREVIAS: Record<string, DefinicaoPrevia> = {
  'mesa-buzios': {
    titulo: 'Mesa de búzios',
    render: (largura) => (
      <>
        <Quadro rotulo="Hoje no app">
          <MesaBuzios tamanho={largura} />
        </Quadro>
        <Quadro rotulo="Proposta do conselho">
          <PeneiraProposta largura={largura} />
        </Quadro>
        <View style={estilos.notas}>
          <Text style={estilos.nota}>· Trama em espiral, no lugar de anéis concêntricos.</Text>
          <Text style={estilos.nota}>· Pano de algodão cru por baixo, com borda irregular.</Text>
          <Text style={estilos.nota}>· Luz de uma fonte só e sombra própria em cada concha.</Text>
          <Text style={estilos.nota}>· Os 16 búzios desenhados na peneira, sem texto sobre ela.</Text>
        </View>
      </>
    ),
  },
};

export const IDS_PREVIA = Object.keys(PREVIAS);

export function Previa({ id }: { id: string | null | undefined }) {
  const { width } = useWindowDimensions();
  const definicao = id ? PREVIAS[id] : undefined;
  if (!definicao) return null;

  const largura = Math.max(200, Math.min(width - 96, 320));

  return (
    <View style={estilos.container} testID={`previa-${id}`}>
      {definicao.render(largura)}
      <Text style={estilos.aviso}>
        Proposta para olhar, não é o que está no ar. Nada muda no app até esta decisão ser fechada.
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { gap: Espacamento.md, marginTop: Espacamento.xs },
  quadro: { gap: Espacamento.xs },
  rotulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Cores.acento,
  },
  palco: {
    alignItems: 'center',
    paddingVertical: Espacamento.sm,
    borderRadius: RaioBorda.md,
    backgroundColor: 'rgba(12,7,18,0.55)',
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    overflow: 'hidden',
  },
  notas: { gap: 2 },
  nota: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario, lineHeight: 19 },
  aviso: { fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario, fontStyle: 'italic' },
});
