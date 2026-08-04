import React from 'react';
import { View, StyleSheet, Pressable, Text, Platform } from 'react-native';
import Svg, {
  Polygon,
  Line,
  Circle as SvgCircle,
  Defs,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { ResultadoMatriz } from '../data/matriz-destino';

interface PontoOctograma {
  chave: string;
  rotulo: string;
  valor: number;
  x: number;
  y: number;
  cor: string;
  raio: number;
}

interface OctogramaProps {
  matriz: ResultadoMatriz;
  tamanho?: number;
  onSelecionarPonto?: (chave: string, valor: number, rotulo: string) => void;
  pontoSelecionado?: string | null;
}

/**
 * Octograma da Matriz do Destino — estrela de 8 pontas (2 quadrados sobrepostos)
 * Exibe os pontos principais com seus arcanos, cores dos chakras e linhas de conexão.
 */
export function Octograma({ matriz, tamanho = 320, onSelecionarPonto, pontoSelecionado }: OctogramaProps) {
  const centro = tamanho / 2;
  const raioExterno = tamanho * 0.4;
  const raioMeio = tamanho * 0.22;

  // Posição dos 8 pontos cardeais + diagonais (começando do topo, sentido horário)
  // 0=Norte(topo), 1=NE, 2=Leste, 3=SE, 4=Sul, 5=SO, 6=Oeste, 7=NO
  function posicao(indice: number, raio: number): { x: number; y: number } {
    const ang = (indice * 45 - 90) * (Math.PI / 180);
    return {
      x: centro + Math.cos(ang) * raio,
      y: centro + Math.sin(ang) * raio,
    };
  }

  const pontos: PontoOctograma[] = [
    { chave: 'norte', rotulo: 'Talento', valor: matriz.norte, ...posicao(0, raioExterno), cor: '#9B59B6', raio: 22 },
    { chave: 'nordeste', rotulo: 'Linha Paterna', valor: matriz.nordeste, ...posicao(1, raioExterno), cor: '#5B4B8A', raio: 17 },
    { chave: 'leste', rotulo: 'Herança', valor: matriz.leste, ...posicao(2, raioExterno), cor: '#3498DB', raio: 22 },
    { chave: 'sudeste', rotulo: 'Karma Paterno', valor: matriz.sudeste, ...posicao(3, raioExterno), cor: '#2ECC71', raio: 17 },
    { chave: 'sul', rotulo: 'Missão', valor: matriz.sul, ...posicao(4, raioExterno), cor: '#F1C40F', raio: 22 },
    { chave: 'sudoeste', rotulo: 'Karma Materno', valor: matriz.sudoeste, ...posicao(5, raioExterno), cor: '#E67E22', raio: 17 },
    { chave: 'oeste', rotulo: 'Retrato', valor: matriz.oeste, ...posicao(6, raioExterno), cor: '#E74C3C', raio: 22 },
    { chave: 'noroeste', rotulo: 'Linha Materna', valor: matriz.noroeste, ...posicao(7, raioExterno), cor: '#E91E63', raio: 17 },
  ];

  // Pontos das linhas internas (dinheiro e amor)
  const pontoDinheiro = { chave: 'linhaDinheiro', rotulo: 'Dinheiro', valor: matriz.linhaDinheiro, ...posicao(2, raioMeio), cor: '#27AE60', raio: 14 };
  const pontoAmor = { chave: 'linhaAmor', rotulo: 'Amor', valor: matriz.linhaAmor, ...posicao(4, raioMeio), cor: '#E91E63', raio: 14 };

  // Quadrado 1 (reto): Norte, Leste, Sul, Oeste
  const quad1 = [posicao(0, raioExterno), posicao(2, raioExterno), posicao(4, raioExterno), posicao(6, raioExterno)]
    .map(p => `${p.x},${p.y}`).join(' ');
  // Quadrado 2 (diagonal): NE, SE, SO, NO
  const quad2 = [posicao(1, raioExterno), posicao(3, raioExterno), posicao(5, raioExterno), posicao(7, raioExterno)]
    .map(p => `${p.x},${p.y}`).join(' ');

  return (
    <View style={[styles.container, { width: tamanho, height: tamanho }]}>
      <Svg width={tamanho} height={tamanho}>
        <Defs>
          <RadialGradient id="centroGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="rgba(212,175,55,0.35)" />
            <Stop offset="100%" stopColor="rgba(212,175,55,0)" />
          </RadialGradient>
        </Defs>

        {/* Dois quadrados sobrepostos formando a estrela */}
        <Polygon points={quad1} fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth="1.2" />
        <Polygon points={quad2} fill="none" stroke="rgba(135,206,235,0.35)" strokeWidth="1.2" />

        {/* Linhas radiais do centro para cada ponto */}
        {pontos.map((p) => (
          <Line
            key={`linha-${p.chave}`}
            x1={centro} y1={centro} x2={p.x} y2={p.y}
            stroke="rgba(255,255,255,0.06)" strokeWidth="0.8"
          />
        ))}

        {/* Linha do dinheiro (leste -> centro) destaque */}
        <Line x1={centro} y1={centro} x2={pontos[2].x} y2={pontos[2].y} stroke="rgba(39,174,96,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
        {/* Linha do amor (sul -> centro) destaque */}
        <Line x1={centro} y1={centro} x2={pontos[4].x} y2={pontos[4].y} stroke="rgba(233,30,99,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />

        {/* Glow central */}
        <SvgCircle cx={centro} cy={centro} r={raioMeio * 1.4} fill="url(#centroGlow)" />

        {/* Pontos internos (dinheiro e amor) */}
        {[pontoDinheiro, pontoAmor].map((p) => {
          const sel = pontoSelecionado === p.chave;
          return (
            <React.Fragment key={p.chave}>
              <SvgCircle cx={p.x} cy={p.y} r={p.raio + (sel ? 3 : 0)} fill={p.cor} opacity={sel ? 1 : 0.85} stroke="#FFF" strokeWidth={sel ? 2 : 0.5} strokeOpacity={0.4} />
              <SvgText x={p.x} y={p.y + 4} fontSize="11" fontWeight="bold" fill="#FFF" textAnchor="middle">{p.valor}</SvgText>
            </React.Fragment>
          );
        })}

        {/* Pontos externos */}
        {pontos.map((p) => {
          const sel = pontoSelecionado === p.chave;
          return (
            <React.Fragment key={p.chave}>
              <SvgCircle cx={p.x} cy={p.y} r={p.raio + (sel ? 3 : 0)} fill={p.cor} stroke="#FFF" strokeWidth={sel ? 2.5 : 1} strokeOpacity={sel ? 0.9 : 0.35} />
              <SvgText x={p.x} y={p.y + 5} fontSize={p.raio > 18 ? '15' : '12'} fontWeight="bold" fill="#FFF" textAnchor="middle">{p.valor}</SvgText>
            </React.Fragment>
          );
        })}

        {/* Centro — essência */}
        <SvgCircle cx={centro} cy={centro} r={26} fill="#4B0082" stroke="#D4AF37" strokeWidth={pontoSelecionado === 'centro' ? 3 : 1.5} />
        <SvgText x={centro} y={centro + 6} fontSize="18" fontWeight="bold" fill="#D4AF37" textAnchor="middle">{matriz.centro}</SvgText>
      </Svg>

      {/* Camada de toque para cada ponto */}
      {onSelecionarPonto && (
        <>
          {[...pontos, pontoDinheiro, pontoAmor].map((p) => (
            <Pressable
              key={`toque-${p.chave}`}
              onPress={() => onSelecionarPonto(p.chave, p.valor, p.rotulo)}
              style={[styles.toque, { left: p.x - p.raio - 4, top: p.y - p.raio - 4, width: (p.raio + 4) * 2, height: (p.raio + 4) * 2, borderRadius: p.raio + 4 }]}
            />
          ))}
          <Pressable
            onPress={() => onSelecionarPonto('centro', matriz.centro, 'Essência')}
            style={[styles.toque, { left: centro - 30, top: centro - 30, width: 60, height: 60, borderRadius: 30 }]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {},
      default: {},
    }),
  },
  toque: {
    position: 'absolute',
  },
});
