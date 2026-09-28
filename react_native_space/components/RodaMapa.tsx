import React from 'react';
import { Dimensions } from 'react-native';
import Svg, {
  Circle, Path, G, Text as SvgText, Defs, RadialGradient as SvgRadial, Stop,
} from 'react-native-svg';
import { Cores } from '../constants/colors';
import { PLANETAS } from '../data/astrologia';
import { anguloNaRoda, meiosDasCasas, niveisDosMarcadores } from '../utils/roda';

const { width: W } = Dimensions.get('window');

/**
 * A roda do mapa natal.
 *
 * Saiu de dentro de `app/mapa-astral/resultado.tsx` quando as casas entraram: a
 * tela já passava de mil linhas, e desenho de roda é a parte que mais vai mudar
 * daqui em diante (aspectos, planetas menores, revisão de astrólogo).
 *
 * A geometria não está aqui — está em `utils/roda.ts`, testada sem renderizar.
 * Aqui fica só o desenho.
 */

const SIGNOS_SIMBOLOS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const SIGNOS_CORES = ['#E74C3C','#27AE60','#F1C40F','#3498DB','#E74C3C','#27AE60',
  '#9B59B6','#C0392B','#E67E22','#2C3E50','#3498DB','#1ABC9C'];
const SIGNOS_IDS = ['aries','touro','gemeos','cancer','leao','virgem',
  'libra','escorpiao','sagitario','capricornio','aquario','peixes'];
/** O glifo e a cor de cada corpo, tirados do dicionário que já existia. */
export const GLIFO_CORPO: Record<string, { simbolo: string; cor: string }> = {
  sol: { simbolo: '☀', cor: '#F1C40F' },
  lua: { simbolo: '☾', cor: Cores.secundaria },
  ...Object.fromEntries(PLANETAS.map((p) => [p.id, { simbolo: p.simbolo, cor: p.cor }])),
};

export function idxSigno(id: string): number {
  const i = SIGNOS_IDS.indexOf(id);
  return i >= 0 ? i : 0;
}

export interface MarcadorRoda {
  /** Longitude eclíptica, 0 a 360 — o grau de verdade, não o meio do signo. */
  longitude: number;
  label: string;
  cor: string;
}

export interface RodaProps {
  solIdx: number;
  marcadores: MarcadorRoda[];
  /**
   * O ascendente, quando existe. A roda gira para ele ficar na esquerda, que é
   * como astrólogo desenha mapa: dali as casas correm no sentido anti-horário.
   * Sem hora de nascimento não há ascendente, e Áries fica na esquerda.
   */
  ascendente?: number | null;
  /** As doze cúspides, quando o plano dá direito a casa. */
  cuspides?: number[] | null;
}

const rad = (graus: number) => (graus * Math.PI) / 180;

export function RodaZodiacal({ solIdx, marcadores, ascendente, cuspides }: RodaProps) {
  const SIZE = Math.min(W - 48, 300);
  const cx = SIZE / 2, cy = SIZE / 2;
  const rExt = SIZE * 0.48;
  const rMed = SIZE * 0.38;
  const rInt = SIZE * 0.28;
  const rCore = SIZE * 0.13;
  const sliceDeg = 360 / 12;

  const referencia = ascendente ?? 0;
  const ponto = (longitude: number, raio: number) => {
    const a = rad(anguloNaRoda(longitude, referencia));
    return { x: cx + raio * Math.cos(a), y: cy + raio * Math.sin(a) };
  };

  // Três níveis de profundidade entre o anel do meio e o anel de dentro: com
  // dez corpos, conjunção é regra, não exceção.
  const niveis = niveisDosMarcadores(marcadores.map((m) => m.longitude), 9, 3);
  const passoNivel = (rMed - rInt) / 3;

  const meios = cuspides ? meiosDasCasas(cuspides) : null;

  return (
    <Svg width={SIZE} height={SIZE}>
      <Defs>
        <SvgRadial id="astralCore" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(181,139,70,0.14)" />
          <Stop offset="60%" stopColor="rgba(88,117,101,0.07)" />
          <Stop offset="100%" stopColor="rgba(88,117,101,0)" />
        </SvgRadial>
      </Defs>
      {/* Glow central */}
      <Circle cx={cx} cy={cy} r={rExt} fill="url(#astralCore)" />
      {/* Anéis */}
      <Circle cx={cx} cy={cy} r={rExt} fill="none" stroke="rgba(181,139,70,0.35)" strokeWidth={1} />
      <Circle cx={cx} cy={cy} r={rMed} fill="none" stroke="rgba(181,139,70,0.22)" strokeWidth={0.8} />
      <Circle cx={cx} cy={cy} r={rInt} fill="none" stroke="rgba(181,139,70,0.18)" strokeWidth={0.6} />
      <Circle cx={cx} cy={cy} r={rCore} fill="rgba(181,139,70,0.10)" stroke="rgba(181,139,70,0.45)" strokeWidth={1} />

      {/* 12 fatias de signo + símbolos */}
      {SIGNOS_SIMBOLOS.map((sim, i) => {
        const borda = i * sliceDeg;
        const meio = borda + sliceDeg / 2;
        const fora = ponto(borda, rExt);
        const dentro = ponto(borda, rMed);
        const simbolo = ponto(meio, rMed + (rExt - rMed) / 2);
        const bordaSeguinte = ponto(borda + sliceDeg, rExt);
        const isAtivo = i === solIdx;
        return (
          <G key={`signo-${i}`}>
            <Path d={`M ${dentro.x} ${dentro.y} L ${fora.x} ${fora.y}`}
              stroke="rgba(181,139,70,0.28)" strokeWidth={0.7} />
            {isAtivo && (
              <Path
                d={`M ${cx} ${cy} L ${fora.x} ${fora.y} A ${rExt} ${rExt} 0 0 0 ${bordaSeguinte.x} ${bordaSeguinte.y} Z`}
                fill={SIGNOS_CORES[i] + '18'}
              />
            )}
            <SvgText x={simbolo.x} y={simbolo.y + 3} textAnchor="middle"
              fontSize={10} fill={isAtivo ? SIGNOS_CORES[i] : 'rgba(36,49,45,0.55)'}
              fontWeight={isAtivo ? '700' : '400'}>{sim}</SvgText>
          </G>
        );
      })}

      {/* As cúspides das casas, do centro até o anel do meio. Os quatro eixos —
          ascendente, fundo do céu, descendente e meio do céu — saem mais
          grossos, porque num mapa são eles que a vista procura primeiro. */}
      {cuspides?.map((cuspide, i) => {
        const eixo = i % 3 === 0;
        const de = ponto(cuspide, rCore);
        const ate = ponto(cuspide, eixo ? rExt : rMed);
        return (
          <Path key={`cuspide-${i}`} d={`M ${de.x} ${de.y} L ${ate.x} ${ate.y}`}
            stroke={eixo ? 'rgba(181,139,70,0.65)' : 'rgba(181,139,70,0.30)'}
            strokeWidth={eixo ? 1.4 : 0.6} />
        );
      })}

      {/* O número de cada casa, no meio dela */}
      {meios?.map((meio, i) => {
        const p = ponto(meio, rCore + (rInt - rCore) / 2);
        return (
          <SvgText key={`casa-${i}`} x={p.x} y={p.y + 3} textAnchor="middle"
            fontSize={8} fill="rgba(36,49,45,0.45)">{i + 1}</SvgText>
        );
      })}

      {/* Marcadores no grau real, empilhados quando caem quase no mesmo lugar */}
      {marcadores.map(({ longitude, label, cor }, i) => {
        const p = ponto(longitude, rMed - passoNivel / 2 - niveis[i] * passoNivel);
        return (
          <G key={label}>
            <Circle cx={p.x} cy={p.y} r={9} fill={cor + '30'} stroke={cor} strokeWidth={1} />
            <SvgText x={p.x} y={p.y + 3} textAnchor="middle"
              fontSize={label.length > 1 ? 7 : 10} fill={cor}>{label}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

