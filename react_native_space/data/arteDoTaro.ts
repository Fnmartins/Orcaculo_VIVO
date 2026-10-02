/**
 * A cena de cada Arcano Maior, na edição de 1909 de Pamela Colman Smith.
 *
 * `require` estático e não caminho montado em runtime: o empacotador do Expo precisa
 * ver cada arquivo em tempo de build, e um caminho em string não entra no bundle — a
 * carta sairia em branco só no aparelho, nunca no teste.
 *
 * No Rider-Waite a leitura é leitura da cena: as interpretações falam do que está na
 * imagem. Sem estas imagens, o método que o próprio baralho propõe não existe, e foi
 * essa falta que fez especialistas chamarem o tarô do app de simples.
 */
export const ARTE_POR_ID: Record<number, number> = {
  0: require('../assets/tarot/00-o-louco.jpg'),
  1: require('../assets/tarot/01-o-mago.jpg'),
  2: require('../assets/tarot/02-a-sacerdotisa.jpg'),
  3: require('../assets/tarot/03-a-imperatriz.jpg'),
  4: require('../assets/tarot/04-o-imperador.jpg'),
  5: require('../assets/tarot/05-o-hierofante.jpg'),
  6: require('../assets/tarot/06-os-amantes.jpg'),
  7: require('../assets/tarot/07-o-carro.jpg'),
  8: require('../assets/tarot/08-a-forca.jpg'),
  9: require('../assets/tarot/09-o-eremita.jpg'),
  10: require('../assets/tarot/10-a-roda-da-fortuna.jpg'),
  11: require('../assets/tarot/11-a-justica.jpg'),
  12: require('../assets/tarot/12-o-pendurado.jpg'),
  13: require('../assets/tarot/13-a-morte.jpg'),
  14: require('../assets/tarot/14-a-temperanca.jpg'),
  15: require('../assets/tarot/15-o-diabo.jpg'),
  16: require('../assets/tarot/16-a-torre.jpg'),
  17: require('../assets/tarot/17-a-estrela.jpg'),
  18: require('../assets/tarot/18-a-lua.jpg'),
  19: require('../assets/tarot/19-o-sol.jpg'),
  20: require('../assets/tarot/20-o-julgamento.jpg'),
  21: require('../assets/tarot/21-o-mundo.jpg'),
};
