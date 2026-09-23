import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

const ANEIS = 9;
const RAIOS = 24;

/**
 * Peneira de palha desenhada, no mesmo traço das conchas do jogo.
 *
 * Substituiu a fotografia da mesa em 21/09/2026: ela era um retrato recortado em
 * quadrado, já trazia búzios fotografados que duplicavam os do jogo, tinha guias
 * de muitas cores disputando a atenção e a marca de uma ferramenta de IA num
 * canto. Ver docs/2026-09-21-conselho-buzios-e-introducoes.md, item B3.
 */
export function MesaBuzios({ tamanho }: { tamanho: number }) {
  const centro = tamanho / 2;
  const rAro = tamanho * 0.5;
  const rPalha = tamanho * 0.44;

  return (
    <Svg width={tamanho} height={tamanho} testID="mesa-buzios">
      <Defs>
        <RadialGradient id="palha" cx="50%" cy="45%" r="62%">
          <Stop offset="0%" stopColor="#E7D3A6" />
          <Stop offset="65%" stopColor="#D3B87F" />
          <Stop offset="100%" stopColor="#B08F58" />
        </RadialGradient>
        <RadialGradient id="sombraPalha" cx="50%" cy="50%" r="50%">
          <Stop offset="68%" stopColor="rgba(43,28,16,0)" />
          <Stop offset="100%" stopColor="rgba(43,28,16,0.42)" />
        </RadialGradient>
      </Defs>

      {/* Aro de madeira */}
      <Circle cx={centro} cy={centro} r={rAro} fill="#3C2A19" />
      <Circle
        cx={centro}
        cy={centro}
        r={rAro - tamanho * 0.014}
        fill="none"
        stroke="rgba(212,175,55,0.35)"
        strokeWidth={Math.max(1, tamanho * 0.006)}
      />

      {/* Palha */}
      <Circle cx={centro} cy={centro} r={rPalha} fill="url(#palha)" />

      {/* Trama: anéis concêntricos */}
      {Array.from({ length: ANEIS }, (_, i) => (
        <Circle
          key={`anel-${i}`}
          cx={centro}
          cy={centro}
          r={rPalha * (1 - (i + 1) / (ANEIS + 1))}
          fill="none"
          stroke="rgba(120,90,50,0.26)"
          strokeWidth={Math.max(0.6, tamanho * 0.0025)}
        />
      ))}

      {/* Trama: raios */}
      {Array.from({ length: RAIOS }, (_, i) => {
        const ang = ((i * 360) / RAIOS) * (Math.PI / 180);
        const x1 = centro + Math.cos(ang) * rPalha * 0.08;
        const y1 = centro + Math.sin(ang) * rPalha * 0.08;
        const x2 = centro + Math.cos(ang) * rPalha;
        const y2 = centro + Math.sin(ang) * rPalha;
        return (
          <Path
            key={`raio-${i}`}
            d={`M ${x1} ${y1} L ${x2} ${y2}`}
            stroke="rgba(120,90,50,0.16)"
            strokeWidth={Math.max(0.5, tamanho * 0.002)}
          />
        );
      })}

      {/* Sombra da borda, para as conchas ganharem contraste */}
      <Circle cx={centro} cy={centro} r={rPalha} fill="url(#sombraPalha)" />
    </Svg>
  );
}
