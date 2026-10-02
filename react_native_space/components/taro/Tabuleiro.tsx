// components/taro/Tabuleiro.tsx
import React, { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Espacamento } from '../../constants/spacing';
import type { PosicaoDaTiragem } from '../../data/tiragens';

interface Props {
  posicoes: PosicaoDaTiragem[];
  /** Desenha a vaga de um índice. O tabuleiro só arruma — não sabe o que é carta. */
  vaga: (indice: number) => ReactNode;
}

/**
 * Abaixo disto a mesa não cabe sem cortar as pontas, e a tiragem vai em coluna.
 *
 * Medido na Cruz Celta, que é a tiragem mais larga: quatro colunas de vaga compacta
 * (158) e a da carta deitada (197, a altura da vaga girada), com o vão entre elas, dão
 * 893; mais 32 de margem da tela e uns 15 da barra de rolagem, que a largura da janela
 * conta e o conteúdo não tem. Com 760 a cruz saía cortada dos dois lados.
 */
export const LARGURA_MINIMA_DO_TABULEIRO = 950;

/**
 * Desenha qualquer tiragem a partir da coordenada de cada posição.
 *
 * Substitui o `CruzCelta.tsx`, que era a cruz desenhada à mão. As fontes trazem
 * tiragens em linha, cruz, pirâmide e círculo — uma função por formato não escala, e
 * acrescentar tiragem passaria a ser escrever componente. Com a grade, é acrescentar
 * uma entrada em `data/tiragens.ts`.
 *
 * A grade é dimensionada pela maior coordenada, não pela contagem de posições: a Cruz
 * Celta tem dez cartas numa grade de cinco por quatro, cheia de buracos.
 */
export function Tabuleiro({ posicoes, vaga }: Props) {
  // Largura que cada célula ocupada de fato tem, por "coluna,linha". Existe porque cada
  // linha é um bloco flexível à parte: sem isto, uma célula vazia não ocupa nada, e a
  // coluna 4 de uma linha cai debaixo da coluna 1 da outra. Coluna é o que as linhas
  // têm em comum, e o layout não sabe disso — a grade tem de medir e dizer.
  const [larguras, setLarguras] = useState<Record<string, number>>({});
  const medirCelula = useCallback((chave: string, largura: number) => {
    setLarguras((antes) => (antes[chave] === largura ? antes : { ...antes, [chave]: largura }));
  }, []);

  const colunas = Math.max(...posicoes.map((p) => p.lugar.coluna)) + 1;
  const linhas = Math.max(...posicoes.map((p) => p.lugar.linha)) + 1;

  const ocupante = new Map<string, number>();
  posicoes.forEach((p, i) => ocupante.set(`${p.lugar.coluna},${p.lugar.linha}`, i));

  // A coluna tem a largura da sua célula mais larga. Numa coluna com carta deitada, é a
  // largura da carta deitada — e as vizinhas de cima e de baixo ficam centradas nela.
  const larguraDaColuna = (coluna: number) => Math.max(
    0, ...Array.from({ length: linhas }, (_, linha) => larguras[`${coluna},${linha}`] ?? 0),
  );

  return (
    <View style={estilos.grade}>
      {Array.from({ length: linhas }, (_, linha) => (
        <View key={linha} style={estilos.linha}>
          {Array.from({ length: colunas }, (_, coluna) => {
            const chave = `${coluna},${linha}`;
            const indice = ocupante.get(chave);
            return (
              <View
                key={coluna}
                testID="celula-do-tabuleiro"
                style={[estilos.celula, { minWidth: larguraDaColuna(coluna) }]}
              >
                {indice === undefined ? null : (
                  <View
                    onLayout={({ nativeEvent }) => medirCelula(chave, nativeEvent.layout.width)}
                  >
                    {posicoes[indice].deitada ? (
                      <Deitada indice={indice}>{vaga(indice)}</Deitada>
                    ) : (
                      <View testID={`vaga-${indice}`}>{vaga(indice)}</View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface PropsDaDeitada {
  indice: number;
  children: ReactNode;
}

/**
 * A vaga girada um quarto de volta, com a mesa avisada do espaço que ela passa a ocupar.
 *
 * O giro (`transform`) não mexe no layout: a vaga continua ocupando na grade a caixa de
 * antes do giro, e gira por cima dela. Como a vaga é mais alta do que larga, deitada ela
 * fica mais larga do que a coluna — e invade a coluna vizinha, escondendo o que estiver lá.
 * A caixa de verdade só se conhece depois de medida; com ela, a margem troca largura por
 * altura em volta da vaga, e a coluna passa a ter a largura que a carta deitada tem.
 */
function Deitada({ indice, children }: PropsDaDeitada) {
  const [margem, setMargem] = useState({ horizontal: 0, vertical: 0 });

  function medir({ nativeEvent: { layout } }: LayoutChangeEvent) {
    // A margem não muda a caixa da própria vaga, só o que a cerca: medir de novo não
    // realimenta. O arredondamento evita remedir por fração de pixel.
    const horizontal = Math.round((layout.height - layout.width) / 2);
    const vertical = -horizontal;
    setMargem((antes) => (
      antes.horizontal === horizontal && antes.vertical === vertical
        ? antes
        : { horizontal, vertical }
    ));
  }

  return (
    <View
      testID={`deitada-${indice}`}
      onLayout={medir}
      style={[
        estilos.deitada,
        { marginHorizontal: margem.horizontal, marginVertical: margem.vertical },
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Entre colunas, mais do que entre linhas. Na Cruz Celta a linha 1 ocupa as cinco
 * colunas, então o bastão (coluna 4) fica de ombro com a cruz — e nada na grade diz que
 * são dois blocos. O vão não é regra de tiragem: é o que deixa cada coluna se ler como
 * coluna. As coordenadas continuam sendo só coordenadas.
 */
const VAO_ENTRE_COLUNAS = Espacamento.md;

const estilos = StyleSheet.create({
  grade: { gap: Espacamento.sm, alignItems: 'center' },
  linha: { flexDirection: 'row', gap: VAO_ENTRE_COLUNAS, alignItems: 'center' },
  celula: { alignItems: 'center', justifyContent: 'center' },
  // A carta que atravessa é posta cruzada sobre a primeira na mesa de verdade. Aqui ela
  // fica ao lado e girada: sobreposta, as duas vagas ficariam impossíveis de escolher.
  deitada: { transform: [{ rotate: '90deg' }] },
});
