import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, {
  Path,
  Ellipse,
  G,
  Defs,
  RadialGradient,
  LinearGradient as SvgLinGrad,
  Stop,
  Circle as SvgCircle,
  ClipPath,
  Rect,
} from 'react-native-svg';

interface BuzioIconProps {
  aberto: boolean;
  tamanho?: number;
}

/**
 * Búzio ultra-realista baseado em concha Cowrie real (Monetaria moneta)
 * Referências: anatomia real de búzios de Candomblé
 *
 * ABERTO: Vista inferior — fenda central dentada visível, cor creme/marfim,
 *         bordas com estrias, interior côncavo rosado
 * FECHADO: Vista dorsal — cúpula convexa lisa, padrão mosqueado marrom/bege,
 *          linha dorsal sutil, aspecto polido e brilhante
 */
export function BuzioIcon({ aberto, tamanho = 36 }: BuzioIconProps) {
  const s = tamanho;
  const uniqueId = React.useId().replace(/:/g, '_');

  if (aberto) {
    return (
      <View style={[styles.container, { width: s, height: s }]}>
        <Svg width={s} height={s} viewBox="0 0 60 60">
          <Defs>
            {/* Gradiente principal — marfim rosado (interior côncavo) */}
            <RadialGradient id={`ga_${uniqueId}`} cx="50%" cy="42%" rx="48%" ry="50%">
              <Stop offset="0%" stopColor="#FFF5EB" />
              <Stop offset="25%" stopColor="#FAECD8" />
              <Stop offset="55%" stopColor="#F0DCC2" />
              <Stop offset="80%" stopColor="#DCC5A5" />
              <Stop offset="100%" stopColor="#C4A882" />
            </RadialGradient>
            {/* Gradiente da borda — marrom escuro da aresta */}
            <SvgLinGrad id={`gb_${uniqueId}`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#A08060" />
              <Stop offset="50%" stopColor="#C4A882" />
              <Stop offset="100%" stopColor="#A08060" />
            </SvgLinGrad>
            {/* Gradiente dos dentes — marfim para rosado */}
            <SvgLinGrad id={`gd_${uniqueId}`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#D4B896" />
              <Stop offset="100%" stopColor="#EEDCC8" />
            </SvgLinGrad>
            {/* Brilho especular */}
            <RadialGradient id={`gs_${uniqueId}`} cx="38%" cy="28%" rx="25%" ry="20%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
              <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </RadialGradient>
            {/* Sombra inferior */}
            <RadialGradient id={`sh_${uniqueId}`} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="rgba(0,0,0,0.2)" />
              <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </RadialGradient>
          </Defs>

          {/* === SOMBRA PROJETADA === */}
          <Ellipse cx="30" cy="55" rx="18" ry="4" fill={`url(#sh_${uniqueId})`} />

          {/* === FORMA PRINCIPAL DA CONCHA === */}
          {/* Formato oval orgânico (não perfeitamente simétrico, como concha real) */}
          <Path
            d="M30 5 C42 5 52 14 53 26 C54 34 52 42 48 48 C44 52 36 54 30 54 C24 54 16 52 12 48 C8 42 6 34 7 26 C8 14 18 5 30 5Z"
            fill={`url(#ga_${uniqueId})`}
          />
          {/* Borda da concha com variação de espessura */}
          <Path
            d="M30 5 C42 5 52 14 53 26 C54 34 52 42 48 48 C44 52 36 54 30 54 C24 54 16 52 12 48 C8 42 6 34 7 26 C8 14 18 5 30 5Z"
            fill="none"
            stroke={`url(#gb_${uniqueId})`}
            strokeWidth="1.2"
          />

          {/* === FENDA CENTRAL (ABERTURA) === */}
          {/* Fenda principal — curva sinuosa como na concha real */}
          <Path
            d="M30 10 C29 14 28.5 18 28.5 22 C28.5 26 29 30 29.5 34 C30 38 30 42 30 46"
            stroke="#8B6F50"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Interior escuro da fenda */}
          <Path
            d="M30 11 C29.2 15 28.8 19 28.8 23 C28.8 27 29.2 31 29.7 35 C30.2 39 30 43 30 46"
            stroke="#5C3D20"
            strokeWidth="0.8"
            fill="none"
            strokeLinecap="round"
          />

          {/* === DENTES DA FENDA (lados esquerdo e direito) === */}
          {/* Lado esquerdo — dentes curvados para dentro */}
          <Path d="M28.5 12 L23 13.5" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.1" strokeLinecap="round" />
          <Path d="M28.5 15 L22 16" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.2" strokeLinecap="round" />
          <Path d="M28.5 18 L21.5 18.5" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.3" strokeLinecap="round" />
          <Path d="M28.5 21 L21 21" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.4" strokeLinecap="round" />
          <Path d="M28.5 24 L20.5 24" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.4" strokeLinecap="round" />
          <Path d="M29 27 L21 26.5" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.3" strokeLinecap="round" />
          <Path d="M29.5 30 L21.5 29" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.3" strokeLinecap="round" />
          <Path d="M29.5 33 L22 32" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.2" strokeLinecap="round" />
          <Path d="M30 36 L23 35" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.1" strokeLinecap="round" />
          <Path d="M30 39 L24 38.5" stroke={`url(#gd_${uniqueId})`} strokeWidth="1" strokeLinecap="round" />
          <Path d="M30 42 L25 41.5" stroke={`url(#gd_${uniqueId})`} strokeWidth="0.9" strokeLinecap="round" />
          <Path d="M30 45 L26 44.5" stroke={`url(#gd_${uniqueId})`} strokeWidth="0.8" strokeLinecap="round" />

          {/* Lado direito — dentes espelhados */}
          <Path d="M31.5 12 L37 13.5" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.1" strokeLinecap="round" />
          <Path d="M31.5 15 L38 16" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.2" strokeLinecap="round" />
          <Path d="M31.5 18 L38.5 18.5" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.3" strokeLinecap="round" />
          <Path d="M31.5 21 L39 21" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.4" strokeLinecap="round" />
          <Path d="M31.5 24 L39.5 24" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.4" strokeLinecap="round" />
          <Path d="M31 27 L39 26.5" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.3" strokeLinecap="round" />
          <Path d="M30.5 30 L38.5 29" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.3" strokeLinecap="round" />
          <Path d="M30.5 33 L38 32" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.2" strokeLinecap="round" />
          <Path d="M30 36 L37 35" stroke={`url(#gd_${uniqueId})`} strokeWidth="1.1" strokeLinecap="round" />
          <Path d="M30 39 L36 38.5" stroke={`url(#gd_${uniqueId})`} strokeWidth="1" strokeLinecap="round" />
          <Path d="M30 42 L35 41.5" stroke={`url(#gd_${uniqueId})`} strokeWidth="0.9" strokeLinecap="round" />
          <Path d="M30 45 L34 44.5" stroke={`url(#gd_${uniqueId})`} strokeWidth="0.8" strokeLinecap="round" />

          {/* === ESTRIAS LATERAIS (textura da concha) === */}
          <Path d="M12 20 C14 18 16 17 20 16" stroke="rgba(180,155,120,0.2)" strokeWidth="0.5" fill="none" />
          <Path d="M11 28 C13 26 16 25 20 24" stroke="rgba(180,155,120,0.15)" strokeWidth="0.5" fill="none" />
          <Path d="M12 36 C14 35 16 34 20 33" stroke="rgba(180,155,120,0.15)" strokeWidth="0.5" fill="none" />
          <Path d="M48 20 C46 18 44 17 40 16" stroke="rgba(180,155,120,0.2)" strokeWidth="0.5" fill="none" />
          <Path d="M49 28 C47 26 44 25 40 24" stroke="rgba(180,155,120,0.15)" strokeWidth="0.5" fill="none" />
          <Path d="M48 36 C46 35 44 34 40 33" stroke="rgba(180,155,120,0.15)" strokeWidth="0.5" fill="none" />

          {/* === BRILHO ESPECULAR (reflexo de luz) === */}
          <Ellipse cx="22" cy="16" rx="6" ry="5" fill={`url(#gs_${uniqueId})`} />
          {/* Micro brilho secundário */}
          <Ellipse cx="40" cy="38" rx="3" ry="2" fill="rgba(255,255,255,0.15)" />

          {/* === PONTO DE ENERGIA / AXÉ (brilho dourado sutil) === */}
          <SvgCircle cx="30" cy="28" r="2" fill="#D4AF37" opacity="0.25" />
          <SvgCircle cx="30" cy="28" r="1" fill="#FFD700" opacity="0.4" />
        </Svg>
      </View>
    );
  }

  // ================================================================
  // FECHADO — Vista dorsal: cúpula convexa polida com padrão mosqueado
  // ================================================================
  return (
    <View style={[styles.container, { width: s, height: s }]}>
      <Svg width={s} height={s} viewBox="0 0 60 60">
        <Defs>
          {/* Gradiente principal — marrom quente com profundidade */}
          <RadialGradient id={`gf_${uniqueId}`} cx="42%" cy="35%" rx="52%" ry="55%">
            <Stop offset="0%" stopColor="#A08668" />
            <Stop offset="20%" stopColor="#8B7355" />
            <Stop offset="50%" stopColor="#6B5640" />
            <Stop offset="75%" stopColor="#4A3828" />
            <Stop offset="100%" stopColor="#362818" />
          </RadialGradient>
          {/* Brilho especular da cúpula polida */}
          <RadialGradient id={`gfs_${uniqueId}`} cx="35%" cy="25%" rx="28%" ry="22%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <Stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </RadialGradient>
          {/* Brilho de borda — simulando refração de luz na aresta */}
          <SvgLinGrad id={`gfb_${uniqueId}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="rgba(255,240,220,0.3)" />
            <Stop offset="50%" stopColor="rgba(255,240,220,0)" />
            <Stop offset="100%" stopColor="rgba(255,240,220,0.15)" />
          </SvgLinGrad>
          {/* Sombra inferior */}
          <RadialGradient id={`shf_${uniqueId}`} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="rgba(0,0,0,0.25)" />
            <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </RadialGradient>
        </Defs>

        {/* === SOMBRA PROJETADA === */}
        <Ellipse cx="30" cy="55" rx="19" ry="4.5" fill={`url(#shf_${uniqueId})`} />

        {/* === FORMA PRINCIPAL — cúpula convexa orgânica === */}
        <Path
          d="M30 5 C43 5 53 14 54 27 C55 35 53 43 48 48 C44 52 37 54 30 54 C23 54 16 52 12 48 C7 43 5 35 6 27 C7 14 17 5 30 5Z"
          fill={`url(#gf_${uniqueId})`}
        />

        {/* === LINHA DORSAL (sulco central típico da cowrie) === */}
        <Path
          d="M30 8 C29.5 16 29 24 29.5 32 C30 40 30 48 30 52"
          stroke="rgba(60,40,20,0.4)"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
        {/* Sombra da linha dorsal */}
        <Path
          d="M30.5 9 C30 17 29.5 25 30 33 C30.5 41 30.5 48 30 52"
          stroke="rgba(255,230,200,0.12)"
          strokeWidth="0.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* === PADRÃO MOSQUEADO (manchas típicas) === */}
        {/* Manchas maiores — escuras */}
        <Ellipse cx="20" cy="18" rx="3" ry="2.5" fill="rgba(50,35,15,0.25)" transform="rotate(-15 20 18)" />
        <Ellipse cx="40" cy="22" rx="2.5" ry="3" fill="rgba(50,35,15,0.2)" transform="rotate(10 40 22)" />
        <Ellipse cx="18" cy="32" rx="3.5" ry="2" fill="rgba(50,35,15,0.2)" transform="rotate(-8 18 32)" />
        <Ellipse cx="42" cy="35" rx="2" ry="3" fill="rgba(50,35,15,0.22)" transform="rotate(5 42 35)" />
        <Ellipse cx="24" cy="42" rx="2.5" ry="2" fill="rgba(50,35,15,0.18)" transform="rotate(-12 24 42)" />
        <Ellipse cx="36" cy="44" rx="2" ry="2.5" fill="rgba(50,35,15,0.2)" transform="rotate(8 36 44)" />
        {/* Manchas médias */}
        <SvgCircle cx="15" cy="25" r="1.5" fill="rgba(40,25,10,0.2)" />
        <SvgCircle cx="45" cy="28" r="1.8" fill="rgba(40,25,10,0.18)" />
        <SvgCircle cx="22" cy="14" r="1.2" fill="rgba(40,25,10,0.15)" />
        <SvgCircle cx="38" cy="15" r="1.3" fill="rgba(40,25,10,0.16)" />
        <SvgCircle cx="16" cy="40" r="1.4" fill="rgba(40,25,10,0.15)" />
        <SvgCircle cx="44" cy="42" r="1.2" fill="rgba(40,25,10,0.14)" />
        {/* Manchas pequenas — detalhamento */}
        <SvgCircle cx="25" cy="20" r="0.8" fill="rgba(60,40,15,0.18)" />
        <SvgCircle cx="35" cy="18" r="0.7" fill="rgba(60,40,15,0.15)" />
        <SvgCircle cx="22" cy="36" r="0.9" fill="rgba(60,40,15,0.16)" />
        <SvgCircle cx="38" cy="38" r="0.8" fill="rgba(60,40,15,0.15)" />
        <SvgCircle cx="32" cy="12" r="0.6" fill="rgba(60,40,15,0.12)" />
        <SvgCircle cx="26" cy="48" r="0.7" fill="rgba(60,40,15,0.12)" />
        <SvgCircle cx="34" cy="48" r="0.6" fill="rgba(60,40,15,0.1)" />

        {/* === REFLEXOS NA SUPERFÍCIE POLIDA === */}
        {/* Brilho principal — como luz refletida em concha polida real */}
        <Ellipse cx="24" cy="18" rx="8" ry="6" fill={`url(#gfs_${uniqueId})`} />
        {/* Brilho secundário sutil */}
        <Ellipse cx="38" cy="40" rx="4" ry="3" fill="rgba(255,255,255,0.08)" />
        {/* Brilho fino na borda superior — refração */}
        <Path
          d="M18 8 C22 6 26 5.5 30 5.5 C34 5.5 38 6 42 8"
          stroke="rgba(255,245,230,0.3)"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
        />

        {/* === BORDA COM REFRAÇÃO DE LUZ === */}
        <Path
          d="M30 5 C43 5 53 14 54 27 C55 35 53 43 48 48 C44 52 37 54 30 54 C23 54 16 52 12 48 C7 43 5 35 6 27 C7 14 17 5 30 5Z"
          fill="none"
          stroke={`url(#gfb_${uniqueId})`}
          strokeWidth="1"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
      },
      android: { elevation: 6 },
      // No navegador, box-shadow acompanha a caixa do SVG e cria um quadrado.
      // O próprio desenho já contém uma sombra orgânica dentro do SVG.
      default: {},
    }),
  },
});
