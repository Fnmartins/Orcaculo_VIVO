import { StyleSheet } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import type { StatusRoadmap } from '../../utils/roadmap';

// Mesma família de cor das etiquetas do antigo site/roadmap.html; o texto foi
// escurecido para ficar legível em tamanho pequeno sobre o fundo creme.
export const CORES_STATUS: Record<StatusRoadmap, { texto: string; fundo: string }> = {
  ok: { texto: '#3F6650', fundo: 'rgba(88,117,101,0.14)' },
  run: { texto: '#8C6A2F', fundo: 'rgba(181,139,70,0.16)' },
  todo: { texto: '#6F6655', fundo: 'rgba(138,127,107,0.12)' },
  block: { texto: '#9A4B37', fundo: 'rgba(180,97,75,0.14)' },
};

export const estilosPainel = StyleSheet.create({
  conteudo: { paddingHorizontal: Espacamento.lg, gap: Espacamento.md },
  card: {
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
    gap: Espacamento.sm,
  },
  ajuda: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario },
  titulo: { fontFamily: Fontes.corpoNegrito, fontSize: 16, color: Cores.textoPrimario },
  botao: {
    backgroundColor: Cores.acento,
    borderRadius: RaioBorda.full,
    paddingVertical: 10,
    paddingHorizontal: Espacamento.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoSecundario: {
    backgroundColor: Cores.fundoClaro,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    borderRadius: RaioBorda.full,
    paddingVertical: 10,
    paddingHorizontal: Espacamento.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoDesabilitado: { opacity: 0.5 },
  botaoTexto: { fontFamily: Fontes.corpoNegrito, fontSize: 15, color: '#fff' },
  botaoSecundarioTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 15, color: Cores.textoPrimario },
  input: {
    fontFamily: Fontes.corpo,
    fontSize: 15,
    color: Cores.textoPrimario,
    backgroundColor: Cores.inputFundo,
    borderWidth: 1,
    borderColor: Cores.inputBorda,
    borderRadius: RaioBorda.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chip: {
    borderRadius: RaioBorda.full,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    backgroundColor: Cores.superficie,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipAtivo: { backgroundColor: Cores.acento, borderColor: Cores.acento },
  chipTexto: { fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.textoSecundario },
  chipTextoAtivo: { color: '#fff' },
  erro: { fontFamily: Fontes.corpo, fontSize: 14, color: Cores.erro, textAlign: 'center' },
});
