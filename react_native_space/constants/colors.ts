// Paleta de cores do Oráculo Vivo
export const Cores = {
  // Cores principais
  primaria: '#7C9A82',
  acento: '#D4AF37',
  secundaria: '#87CEEB',
  roxoMistico: '#4B0082',
  fundoClaro: '#F5F0E8',
  fundoEscuro: '#1A1A2E',
  superficie: '#F9F6F0',

  // Texto
  textoPrimario: '#2D2D3A',
  textoSecundario: '#6B6B7B',
  textoClaro: '#F5F0E8',

  // Status
  erro: '#D94F4F',

  // Gradientes (tuplas)
  gradientePrimario: ['#4B0082', '#1A1A2E'] as const,
  gradienteAcento: ['#D4AF37', '#C49B30'] as const,
  gradienteBemEstar: ['#7C9A82', '#87CEEB'] as const,
  gradienteFundo: ['#1A1A2E', '#2D1B4E', '#1A1A2E'] as const,

  // Transparências
  cardFundo: 'rgba(245, 240, 232, 0.08)',
  cardBorda: 'rgba(212, 175, 55, 0.15)',
  inputFundo: 'rgba(245, 240, 232, 0.06)',
  inputBorda: 'rgba(245, 240, 232, 0.15)',
} as const;
