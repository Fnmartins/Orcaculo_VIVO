// Paleta de cores do Arcanus
export const Cores = {
  // Cores principais
  primaria: '#587565',
  acento: '#B58B46',
  secundaria: '#6E8390',
  roxoMistico: '#806B88',
  fundoClaro: '#F7F3EA',
  fundoEscuro: '#24312D',
  superficie: '#FFFCF6',

  // Texto
  textoPrimario: '#24312D',
  textoSecundario: '#59665F',
  textoClaro: '#24312D',

  // Status
  erro: '#D94F4F',

  // Gradientes (tuplas)
  gradientePrimario: ['#587565', '#365247'] as const,
  gradienteAcento: ['#C5A365', '#B58B46'] as const,
  gradienteBemEstar: ['#E6EEE5', '#E7EDF0'] as const,
  gradienteFundo: ['#F7F3EA', '#F2EEE5', '#F7F3EA'] as const,

  // Transparências
  cardFundo: 'rgba(255, 252, 246, 0.94)',
  cardBorda: '#DED9CC',
  inputFundo: '#FFFCF6',
  inputBorda: '#D4D0C5',
} as const;
