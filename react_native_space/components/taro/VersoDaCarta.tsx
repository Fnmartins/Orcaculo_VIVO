import React from 'react';
import Svg, { Rect, Polygon, Circle, G, Line } from 'react-native-svg';

interface Props {
  largura: number;
  altura: number;
}

/**
 * O verso da carta: estrela de oito pontas, borda dupla dourada, ornamentos nos cantos.
 *
 * Vem inteiro do `VersoCartaSVG` que vivia dentro de `app/consulta/cartas.tsx`, com duas
 * mudanças. As margens eram pixels fixos (6 e 11), desenhados para a carta de 108 de
 * largura; na lâmina de 38 do leque a borda interna invadia a estrela. Proporcionais, o
 * traço de 108 sai idêntico ao de antes e o de 38 ainda é um verso.
 *
 * E abaixo de 56 de largura o desenho se enxuga: o leque mostra 22 versos ao mesmo tempo,
 * e ornamento de canto a 3 pixels é nó de SVG que ninguém vê.
 */
export function VersoDaCarta({ largura, altura }: Props) {
  const mx = largura / 2;
  const my = altura / 2;
  const margem = largura * 0.0556;
  const margemInterna = largura * 0.1019;
  const raio = largura * 0.0648;
  const estrelaR = Math.min(largura, altura) * 0.16;
  // O traço não encolhe junto: proporcional puro, a 38 de largura ele desaparece.
  const esc = Math.max(0.75, largura / 108);
  const detalhado = largura >= 56;

  const pontosEstrela = Array.from({ length: 16 }, (_, i) => {
    const ang = (i * Math.PI) / 8 - Math.PI / 2;
    const r = i % 2 === 0 ? estrelaR : estrelaR * 0.45;
    return `${mx + r * Math.cos(ang)},${my + r * Math.sin(ang)}`;
  }).join(' ');

  return (
    <Svg width={largura} height={altura}>
      <Rect x={0} y={0} width={largura} height={altura} rx={raio} ry={raio} fill="#365247" />
      <Rect
        x={margem} y={margem} width={largura - margem * 2} height={altura - margem * 2}
        rx={raio * 0.86} ry={raio * 0.86} fill="none" stroke="#C5A365" strokeWidth={1.2 * esc}
      />
      {detalhado && (
        <Rect
          x={margemInterna} y={margemInterna}
          width={largura - margemInterna * 2} height={altura - margemInterna * 2}
          rx={raio * 0.57} ry={raio * 0.57}
          fill="none" stroke="rgba(212,175,55,0.35)" strokeWidth={0.7 * esc}
        />
      )}
      {detalhado && (
        <G>
          <Line
            x1={margemInterna + 4} y1={my} x2={mx - estrelaR - 4} y2={my}
            stroke="rgba(212,175,55,0.2)" strokeWidth={0.5 * esc}
          />
          <Line
            x1={mx + estrelaR + 4} y1={my} x2={largura - margemInterna - 4} y2={my}
            stroke="rgba(212,175,55,0.2)" strokeWidth={0.5 * esc}
          />
        </G>
      )}
      <Polygon points={pontosEstrela} fill="none" stroke="#C5A365" strokeWidth={0.9 * esc} />
      <Circle cx={mx} cy={my} r={estrelaR * 0.2} fill="rgba(212,175,55,0.5)" />
      {detalhado && [
        [margem + 4, margem + 4], [largura - margem - 4, margem + 4],
        [margem + 4, altura - margem - 4], [largura - margem - 4, altura - margem - 4],
      ].map(([cx, cy], i) => (
        <G key={i}>
          <Circle cx={cx} cy={cy} r={3.5} fill="none" stroke="rgba(212,175,55,0.6)" strokeWidth={0.8} />
          <Circle cx={cx} cy={cy} r={1.2} fill="rgba(212,175,55,0.7)" />
        </G>
      ))}
      {detalhado && (
        <Polygon
          points={`${mx},${margemInterna + 6} ${mx + 5},${margemInterna + 14} ${mx - 5},${margemInterna + 14}`}
          fill="rgba(212,175,55,0.3)"
        />
      )}
    </Svg>
  );
}
