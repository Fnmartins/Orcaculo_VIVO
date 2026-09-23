import { useMemo } from 'react';
import Svg, {
  Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop,
} from 'react-native-svg';

/**
 * A peneira que o conselho de leitores descreveu em 22/09, desenhada.
 *
 * É proposta, não é o que está no app: a mesa em produção é `components/MesaBuzios.tsx`.
 * O protótipo original era um canvas numa página de navegador, fora do alcance do
 * Márcio; aqui ele vive dentro da aba Decisões, para os dois olharem e decidirem.
 * Ver docs/2026-09-22-conselho-mesa-buzios-ideal.md.
 */

const LADO = 1000;
const C = LADO / 2;
const R_ARO = LADO * 0.42;
const R_PALHA = R_ARO * 0.93;
const D_CONCHA = R_PALHA * 2 * 0.1;

// Arranjo fixo: as conchas caem uma vez só, para a prévia ser sempre a mesma imagem.
// Geradas com a regra do protótipo (dentro de 27% do lado, 10,4% de distância mínima).
const CONCHAS = [
  { x: 0.4025, y: 0.5657, giro: 129.3, aberta: false },
  { x: 0.5012, y: 0.6140, giro: 6.1, aberta: false },
  { x: 0.6833, y: 0.4497, giro: 8.9, aberta: false },
  { x: 0.6131, y: 0.5657, giro: 88.3, aberta: true },
  { x: 0.3317, y: 0.4377, giro: 66.7, aberta: false },
  { x: 0.5862, y: 0.6833, giro: 34.0, aberta: false },
  { x: 0.4695, y: 0.4548, giro: 120.6, aberta: true },
  { x: 0.3282, y: 0.3275, giro: 91.6, aberta: true },
  { x: 0.5351, y: 0.2828, giro: 125.8, aberta: false },
  { x: 0.4046, y: 0.2513, giro: 6.8, aberta: true },
  { x: 0.2928, y: 0.6666, giro: 69.9, aberta: true },
  { x: 0.7540, y: 0.5844, giro: 67.7, aberta: false },
  { x: 0.6735, y: 0.3143, giro: 179.8, aberta: false },
  { x: 0.5688, y: 0.3929, giro: 142.1, aberta: false },
  { x: 0.3880, y: 0.7265, giro: 38.5, aberta: false },
  { x: 0.2616, y: 0.5512, giro: 84.0, aberta: false },
];

/**
 * Borda irregular do pano: tecido posto na mesa não é um círculo.
 * Amostrada em 96 pontos — com os 28 do protótipo em canvas a borda virava um
 * polígono visível, porque aqui ela é traçada em linhas retas, sem suavização.
 */
function caminhoPano(cx: number, cy: number, r: number): string {
  const pontos: string[] = [];
  const passos = 96;
  for (let i = 0; i <= passos; i++) {
    const a = (i / passos) * Math.PI * 2;
    const rr = r * (1 + 0.035 * Math.sin(a * 3 + 1.2) + 0.02 * Math.sin(a * 7));
    const px = cx + Math.cos(a) * rr * 1.04;
    const py = cy + Math.sin(a) * rr * 0.98;
    pontos.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
  }
  return `${pontos.join(' ')} Z`;
}

/**
 * Trama em espiral contínua, e não anéis concêntricos: o conselho apontou que
 * anéis perfeitos fazem o olho ler a peneira como alvo de tiro.
 */
function caminhoTrama(voltas: number, porVolta: number): string {
  const total = voltas * porVolta;
  const pontos: string[] = [];
  for (let t = 0; t <= total; t++) {
    const ang = (t / porVolta) * Math.PI * 2;
    const rr = R_PALHA * (t / total);
    const ondulacao = 1 + 0.004 * Math.sin(ang * 9);
    const px = C + Math.cos(ang) * rr * ondulacao;
    const py = C + Math.sin(ang) * rr * ondulacao;
    pontos.push(`${t === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
  }
  return pontos.join(' ');
}

function Concha({ x, y, giro, aberta }: (typeof CONCHAS)[number]) {
  const d = D_CONCHA;
  const dentes = [-3, -2, -1, 0, 1, 2, 3].map((t) => t * d * 0.085);

  return (
    <G transform={`translate(${(x * LADO).toFixed(1)}, ${(y * LADO).toFixed(1)}) rotate(${giro})`}>
      {/* Sombra própria: a luz vem de cima à esquerda, uma fonte só. */}
      <Ellipse
        cx={d * 0.06}
        cy={d * 0.09}
        rx={d * 0.5}
        ry={d * 0.38}
        fill="rgba(40,26,12,0.34)"
      />
      <Ellipse
        rx={d * 0.5}
        ry={d * 0.38}
        fill={aberta ? 'url(#conchaAberta)' : 'url(#conchaFechada)'}
        stroke={aberta ? 'rgba(138,106,60,0.45)' : 'rgba(30,20,10,0.45)'}
        strokeWidth={d * 0.035}
      />
      {aberta ? (
        <>
          <Path
            d={`M ${-d * 0.3} 0 Q 0 ${d * 0.07} ${d * 0.3} 0`}
            stroke="rgba(122,94,54,0.85)"
            strokeWidth={d * 0.05}
            fill="none"
          />
          {dentes.map((tx) => (
            <Path
              key={tx}
              d={`M ${tx} ${-d * 0.055} L ${tx} ${d * 0.055}`}
              stroke="rgba(122,94,54,0.85)"
              strokeWidth={d * 0.03}
            />
          ))}
        </>
      ) : (
        <Ellipse
          cx={-d * 0.12}
          cy={-d * 0.1}
          rx={d * 0.2}
          ry={d * 0.12}
          fill="rgba(255,246,228,0.16)"
          transform="rotate(-28.6)"
        />
      )}
    </G>
  );
}

export function PeneiraProposta({ largura }: { largura: number }) {
  const pano = useMemo(() => caminhoPano(C, C, R_ARO * 1.1), []);
  const panoSombra = useMemo(() => caminhoPano(C + 12, C + 20, R_ARO * 1.12), []);
  const panoInterno = useMemo(() => caminhoPano(C + 8, C + 12, R_ARO * 1.06), []);
  const trama = useMemo(() => caminhoTrama(26, 60), []);

  const raios = useMemo(
    () => Array.from({ length: 44 }, (_, i) => {
      const a = (i / 44) * Math.PI * 2;
      const x1 = C + Math.cos(a) * R_PALHA * 0.05;
      const y1 = C + Math.sin(a) * R_PALHA * 0.05;
      const x2 = C + Math.cos(a) * R_PALHA;
      const y2 = C + Math.sin(a) * R_PALHA;
      return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }),
    [],
  );

  // Luz na borda superior esquerda do aro: é o que dá volume ao objeto.
  const brilhoAro = useMemo(() => {
    const r = R_ARO - 4;
    const de = Math.PI * 1.05;
    const ate = Math.PI * 1.75;
    const x1 = C + Math.cos(de) * r;
    const y1 = C + Math.sin(de) * r;
    const x2 = C + Math.cos(ate) * r;
    const y2 = C + Math.sin(ate) * r;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }, []);

  return (
    <Svg
      width={largura}
      height={largura}
      viewBox={`0 0 ${LADO} ${LADO}`}
      testID="peneira-proposta"
      accessibilityLabel="Proposta: peneira de palha trançada em espiral sobre pano de algodão cru, com dezesseis búzios"
    >
      <Defs>
        <RadialGradient id="fundoCena" cx="40%" cy="35%" r="75%">
          <Stop offset="0%" stopColor="#221A13" />
          <Stop offset="100%" stopColor="#140F0B" />
        </RadialGradient>
        <LinearGradient id="aro" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#4A3623" />
          <Stop offset="50%" stopColor="#3A2A1C" />
          <Stop offset="100%" stopColor="#241A11" />
        </LinearGradient>
        <RadialGradient id="palhaProposta" cx="37%" cy="35%" r="70%">
          <Stop offset="0%" stopColor="#E8D6AC" />
          <Stop offset="62%" stopColor="#D2B784" />
          <Stop offset="100%" stopColor="#A9834C" />
        </RadialGradient>
        <RadialGradient id="vinheta" cx="50%" cy="50%" r="50%">
          <Stop offset="62%" stopColor="rgba(60,40,18,0)" />
          <Stop offset="100%" stopColor="rgba(60,40,18,0.4)" />
        </RadialGradient>
        <LinearGradient id="conchaAberta" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FFFBF2" />
          <Stop offset="100%" stopColor="#E4D6BE" />
        </LinearGradient>
        <LinearGradient id="conchaFechada" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#7C6340" />
          <Stop offset="100%" stopColor="#55402A" />
        </LinearGradient>
        <ClipPath id="dentroDaPalha">
          <Circle cx={C} cy={C} r={R_PALHA} />
        </ClipPath>
      </Defs>

      <Rect width={LADO} height={LADO} fill="url(#fundoCena)" />

      {/* Pano de algodão cru por baixo, com a própria sombra */}
      <Path d={panoSombra} fill="rgba(20,13,8,0.5)" />
      <Path d={pano} fill="#F0EADC" />
      <Path d={panoInterno} fill="rgba(160,140,108,0.16)" />

      {/* Sombra da peneira no pano */}
      <Ellipse cx={C + 8} cy={C + 20} rx={R_ARO * 1.01} ry={R_ARO * 0.99} fill="rgba(26,16,8,0.4)" />

      <Circle cx={C} cy={C} r={R_ARO} fill="url(#aro)" />
      <Circle cx={C} cy={C} r={R_PALHA} fill="url(#palhaProposta)" />

      <G clipPath="url(#dentroDaPalha)">
        <Path d={trama} stroke="rgba(122,94,54,0.34)" strokeWidth={3.5} fill="none" strokeLinecap="round" />
        {raios.map((d) => (
          <Path key={d} d={d} stroke="rgba(122,94,54,0.14)" strokeWidth={2.2} strokeLinecap="round" />
        ))}
        <Circle cx={C} cy={C} r={R_PALHA} fill="url(#vinheta)" />
      </G>

      <Path d={brilhoAro} stroke="rgba(255,235,195,0.22)" strokeWidth={8} fill="none" strokeLinecap="round" />

      {CONCHAS.map((c) => (
        <Concha key={`${c.x}-${c.y}`} {...c} />
      ))}
    </Svg>
  );
}
