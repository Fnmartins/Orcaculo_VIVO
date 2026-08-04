import React, { useRef, useEffect, useMemo } from 'react';
import { Animated, StyleSheet, Easing } from 'react-native';
import Svg, {
  Path,
  G,
  Defs,
  LinearGradient as SvgLinGrad,
  RadialGradient,
  Stop,
  Ellipse,
  Circle as SvgCircle,
  Rect,
} from 'react-native-svg';

interface MaoLancandoProps {
  visivel: boolean;
  onAnimacaoCompleta: () => void;
  tamanho?: number;
}

/**
 * Mão feminina vista de cima (palma para cima), dedos abertos no gesto de lançar.
 * Estilo: ilustração premium — formas limpas, gradientes suaves, sem tentar foto-realismo.
 * Animação: sobe → pausa → recua → LANÇA (rotação + impulso) → recuo → desce.
 */
export function MaoLancando({ visivel, onAnimacaoCompleta, tamanho = 170 }: MaoLancandoProps) {
  const translateY = useRef(new Animated.Value(350)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotacao = useRef(new Animated.Value(-10)).current;
  const escala = useRef(new Animated.Value(0.75)).current;
  const opacidade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visivel) return;

    translateY.setValue(350);
    translateX.setValue(0);
    rotacao.setValue(-10);
    escala.setValue(0.75);
    opacidade.setValue(0);

    Animated.sequence([
      // 1. Sobe com energia
      Animated.parallel([
        Animated.timing(opacidade, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 5, damping: 16, stiffness: 90, mass: 1.1, useNativeDriver: true }),
        Animated.timing(escala, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(rotacao, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      // 2. Pausa dramática
      Animated.delay(380),
      // 3. Prepara — recua
      Animated.parallel([
        Animated.timing(translateY, { toValue: -18, duration: 220, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(rotacao, { toValue: -22, duration: 220, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(escala, { toValue: 1.06, duration: 220, useNativeDriver: true }),
      ]),
      // 4. LANÇA — rápido e decisivo
      Animated.parallel([
        Animated.timing(translateY, { toValue: 50, duration: 190, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 14, duration: 190, useNativeDriver: true }),
        Animated.timing(rotacao, { toValue: 30, duration: 190, useNativeDriver: true }),
        Animated.timing(escala, { toValue: 1.18, duration: 190, useNativeDriver: true }),
      ]),
      // 5. Absorve o movimento
      Animated.parallel([
        Animated.spring(rotacao, { toValue: 8, damping: 14, stiffness: 130, useNativeDriver: true }),
        Animated.timing(escala, { toValue: 0.98, duration: 200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]),
      // 6. Desce e some
      Animated.parallel([
        Animated.timing(opacidade, { toValue: 0, duration: 400, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 350, duration: 400, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start(() => onAnimacaoCompleta());
  }, [visivel]);

  const rotacaoStr = useMemo(
    () => rotacao.interpolate({ inputRange: [-22, 0, 30], outputRange: ['-22deg', '0deg', '30deg'] }),
    [rotacao]
  );

  if (!visivel) return null;

  // ViewBox: 140 x 168
  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: opacidade, transform: [{ translateY }, { translateX }, { rotate: rotacaoStr }, { scale: escala }] },
      ]}
      pointerEvents="none"
    >
      <Svg width={tamanho} height={tamanho * 1.2} viewBox="0 0 140 168">
        <Defs>
          {/* Pele — gradiente radial quente */}
          <RadialGradient id="pele" cx="48%" cy="44%" rx="56%" ry="60%">
            <Stop offset="0%" stopColor="#F8D4AE" />
            <Stop offset="42%" stopColor="#EAB98C" />
            <Stop offset="78%" stopColor="#D49A6A" />
            <Stop offset="100%" stopColor="#BE8050" />
          </RadialGradient>
          {/* Pele lateral (sombra lateral nos dedos) */}
          <SvgLinGrad id="dedo" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#D49A6A" />
            <Stop offset="30%" stopColor="#F0C898" />
            <Stop offset="70%" stopColor="#EDB880" />
            <Stop offset="100%" stopColor="#C88A58" />
          </SvgLinGrad>
          {/* Esmalte das unhas */}
          <SvgLinGrad id="unha" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#F9D6D0" />
            <Stop offset="50%" stopColor="#EDB8B2" />
            <Stop offset="100%" stopColor="#D49A94" />
          </SvgLinGrad>
          {/* Pulseira dourada */}
          <SvgLinGrad id="ouro" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#9A7200" />
            <Stop offset="25%" stopColor="#D4AF37" />
            <Stop offset="55%" stopColor="#FFE06A" />
            <Stop offset="80%" stopColor="#D4AF37" />
            <Stop offset="100%" stopColor="#9A7200" />
          </SvgLinGrad>
          {/* Búzio na palma */}
          <RadialGradient id="buzio" cx="38%" cy="32%" rx="60%" ry="55%">
            <Stop offset="0%" stopColor="#FFFBF0" />
            <Stop offset="55%" stopColor="#EFE0C0" />
            <Stop offset="100%" stopColor="#C8A870" />
          </RadialGradient>
        </Defs>

        {/* Sombra projetada */}
        <Ellipse cx={70} cy={160} rx={40} ry={7} fill="rgba(0,0,0,0.20)" />

        {/* ── PULSO / ANTEBRAÇO ── */}
        <Path
          d="M 44,168 L 42,152 Q 42,147 46,145 L 94,145 Q 98,147 98,152 L 96,168 Z"
          fill="url(#pele)"
        />

        {/* ── PULSEIRA DOURADA ── */}
        <Rect x={40} y={146} width={60} height={7} rx={3.5} fill="url(#ouro)" />
        {/* reflexo pulseira */}
        <Rect x={46} y={147} width={22} height={2.5} rx={1.2} fill="rgba(255,255,255,0.55)" />

        {/* ── GUIAS (contas rituais) ── */}
        {[44, 51, 58, 65, 72, 79, 86].map((cx, i) => (
          <SvgCircle
            key={i}
            cx={cx}
            cy={156.5}
            r={2.6}
            fill={i % 2 === 0 ? '#C0392B' : '#FFFFFF'}
          />
        ))}

        {/* ── PALMA ── desenhada depois dos dedos para cobrir as bases */}

        {/* ── POLEGAR — diagonal para baixo-esquerda ── */}
        <Path
          d="M 34,142 Q 22,132 16,120 Q 11,109 13,100 Q 15,91 22,90 Q 29,90 31,98 Q 33,107 33,120 Q 33,132 34,142 Z"
          fill="url(#dedo)"
          stroke="rgba(175,105,62,0.25)"
          strokeWidth={0.6}
        />
        {/* Unha polegar */}
        <Path
          d="M 14,101 Q 15,91 22,90 Q 28,91 30,97 Q 29,103 22,104 Q 15,103 14,101 Z"
          fill="url(#unha)"
          opacity={0.9}
        />
        <Path d="M 16,100 Q 22,97 29,100" stroke="rgba(255,255,255,0.55)" strokeWidth={0.8} fill="none" strokeLinecap="round" />
        {/* Articulação polegar */}
        <Path d="M 23,115 Q 28,113 32,115" stroke="rgba(160,95,55,0.2)" strokeWidth={0.9} fill="none" strokeLinecap="round" />

        {/* ── INDICADOR — levemente para a esquerda ── */}
        <G transform="rotate(-6, 46, 116)">
          <Rect x={39} y={26} width={14} height={90} rx={7} fill="url(#dedo)" />
          {/* Unha */}
          <Rect x={40} y={25} width={12} height={15} rx={6} fill="url(#unha)" opacity={0.88} />
          <Rect x={42.5} y={26} width={6} height={5} rx={2.5} fill="rgba(255,255,255,0.50)" />
          {/* Articulações */}
          <Path d="M 40,72 Q 46,69 52,72" stroke="rgba(160,95,55,0.18)" strokeWidth={0.9} fill="none" strokeLinecap="round" />
          <Path d="M 40,96 Q 46,93 52,96" stroke="rgba(160,95,55,0.15)" strokeWidth={0.8} fill="none" strokeLinecap="round" />
          {/* Reflexo lateral */}
          <Path d="M 41,26 L 41,110" stroke="rgba(255,255,255,0.14)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        </G>

        {/* ── MÉDIO — o mais alto, reto ── */}
        <G>
          <Rect x={57} y={10} width={16} height={105} rx={8} fill="url(#dedo)" />
          <Rect x={58} y={9} width={14} height={17} rx={7} fill="url(#unha)" opacity={0.88} />
          <Rect x={61} y={10} width={7} height={6} rx={3} fill="rgba(255,255,255,0.50)" />
          <Path d="M 58,64 Q 65,61 72,64" stroke="rgba(160,95,55,0.18)" strokeWidth={0.9} fill="none" strokeLinecap="round" />
          <Path d="M 58,90 Q 65,87 72,90" stroke="rgba(160,95,55,0.15)" strokeWidth={0.8} fill="none" strokeLinecap="round" />
          <Path d="M 59,10 L 59,112" stroke="rgba(255,255,255,0.14)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        </G>

        {/* ── ANELAR — levemente para a direita ── */}
        <G transform="rotate(5, 82, 116)">
          <Rect x={75} y={20} width={14} height={96} rx={7} fill="url(#dedo)" />
          <Rect x={76} y={19} width={12} height={15} rx={6} fill="url(#unha)" opacity={0.88} />
          <Rect x={78.5} y={20} width={6} height={5} rx={2.5} fill="rgba(255,255,255,0.50)" />
          <Path d="M 76,70 Q 82,67 88,70" stroke="rgba(160,95,55,0.18)" strokeWidth={0.9} fill="none" strokeLinecap="round" />
          <Path d="M 76,94 Q 82,91 88,94" stroke="rgba(160,95,55,0.15)" strokeWidth={0.8} fill="none" strokeLinecap="round" />
          <Path d="M 77,20 L 77,112" stroke="rgba(255,255,255,0.14)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        </G>

        {/* ── MÍNIMO — mais curto, mais à direita ── */}
        <G transform="rotate(12, 100, 116)">
          <Rect x={93} y={44} width={12} height={72} rx={6} fill="url(#dedo)" />
          <Rect x={94} y={43} width={10} height={13} rx={5} fill="url(#unha)" opacity={0.88} />
          <Rect x={96} y={44} width={5} height={4.5} rx={2} fill="rgba(255,255,255,0.50)" />
          <Path d="M 94,84 Q 99,81 104,84" stroke="rgba(160,95,55,0.18)" strokeWidth={0.8} fill="none" strokeLinecap="round" />
          <Path d="M 95,44 L 95,112" stroke="rgba(255,255,255,0.13)" strokeWidth={1.4} fill="none" strokeLinecap="round" />
        </G>

        {/* ── PALMA (sobre as bases dos dedos) ── */}
        <Ellipse cx={70} cy={136} rx={40} ry={26} fill="url(#pele)" />
        {/* Linhas suaves da palma */}
        <Path d="M 46,128 Q 60,122 80,126" stroke="rgba(155,90,50,0.18)" strokeWidth={1.1} fill="none" strokeLinecap="round" />
        <Path d="M 44,138 Q 60,133 85,137" stroke="rgba(155,90,50,0.13)" strokeWidth={1} fill="none" strokeLinecap="round" />
        {/* Brilho suave na palma */}
        <Ellipse cx={60} cy={130} rx={14} ry={9} fill="rgba(255,255,255,0.09)" />

        {/* ── BÚZIOS NA PALMA ── */}
        <Ellipse cx={57} cy={131} rx={4.2} ry={5.8} fill="url(#buzio)" stroke="#C4A470" strokeWidth={0.5} transform="rotate(-22, 57, 131)" />
        <Path d="M 56.5,129 L 56.5,133" stroke="#A88840" strokeWidth={0.6} />
        <Ellipse cx={69} cy={126} rx={3.8} ry={5.2} fill="url(#buzio)" stroke="#C4A470" strokeWidth={0.5} transform="rotate(10, 69, 126)" />
        <Path d="M 68.5,124 L 68.5,128" stroke="#A88840" strokeWidth={0.6} />
        <Ellipse cx={80} cy={133} rx={4} ry={5.5} fill="url(#buzio)" stroke="#C4A470" strokeWidth={0.5} transform="rotate(-6, 80, 133)" />
        <Path d="M 79.5,131 L 79.5,135" stroke="#A88840" strokeWidth={0.6} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    zIndex: 10,
  },
});
